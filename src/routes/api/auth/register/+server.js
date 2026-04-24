import { json } from '@sveltejs/kit';
import {
  clearSessionCookie,
  isValidEmail,
  normalizeEmail
} from '$lib/server/auth-db';
import {
  clearSupabaseSessionCookies,
  createSupabaseServerClient,
  hasSupabaseAuthConfig,
  setSupabaseSessionCookies
} from '$lib/server/supabase-auth';

export async function POST({ request, cookies }) {
  if (!hasSupabaseAuthConfig) {
    return json({ error: 'Supabase auth is not configured on this server.' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body?.name || '').trim();
  const email = normalizeEmail(body?.email);
  const password = String(body?.password || '');

  if (!name) {
    return json({ error: 'Please enter your name.' }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  if (password.length < 8) {
    return json({ error: 'Use a password with at least 8 characters.' }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name
      }
    }
  });

  if (error) {
    const message = String(error.message || '').toLowerCase();

    if (message.includes('already') || message.includes('exists') || message.includes('registered')) {
      return json({ error: 'An account already exists for that email.' }, { status: 409 });
    }

    return json({ error: error.message || 'Unable to create account right now.' }, { status: 400 });
  }

  clearSessionCookie(cookies);
  clearSupabaseSessionCookies(cookies);

  if (data?.session) {
    setSupabaseSessionCookies(cookies, data.session);
  }

  const user = data?.user;
  const profileName = String(user?.user_metadata?.full_name || user?.user_metadata?.name || '').trim();
  const displayName = profileName || String(user?.email || '').split('@')[0] || 'Account';

  const requiresEmailConfirmation = !data?.session;

  return json(
    {
      data: {
        authenticated: !requiresEmailConfirmation,
        mode: 'user',
        displayName,
        email: user?.email || email,
        requiresEmailConfirmation
      }
    },
    { status: 201 }
  );
}
