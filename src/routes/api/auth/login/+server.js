import { json } from '@sveltejs/kit';
import { clearSessionCookie } from '$lib/server/auth-db';
import {
  clearSupabaseSessionCookies,
  createSupabaseServerClient,
  hasSupabaseAuthConfig,
  isValidEmail,
  normalizeEmail,
  setSupabaseSessionCookies
} from '$lib/server/supabase-auth';

export async function POST({ request, cookies }) {
  if (!hasSupabaseAuthConfig) {
    return json({ error: 'Supabase auth is not configured on this server.' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body?.email);
  const password = String(body?.password || '');

  if (!isValidEmail(email)) {
    return json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  if (!password) {
    return json({ error: 'Please enter your password.' }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error || !data?.session || !data?.user) {
    return json({ error: 'Incorrect email or password.' }, { status: 401 });
  }

  clearSessionCookie(cookies);
  clearSupabaseSessionCookies(cookies);
  setSupabaseSessionCookies(cookies, data.session);

  const user = data.user;
  const profileName = String(user.user_metadata?.full_name || user.user_metadata?.name || '').trim();
  const displayName = profileName || String(user.email || '').split('@')[0] || 'Account';

  return json({
    data: {
      authenticated: true,
      mode: 'user',
      displayName,
      email: user.email || ''
    }
  });
}
