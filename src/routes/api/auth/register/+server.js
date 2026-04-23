import { json } from '@sveltejs/kit';
import {
  createSession,
  createUser,
  findUserByEmail,
  isValidEmail,
  normalizeEmail,
  setSessionCookie
} from '$lib/server/auth-db';

export async function POST({ request, cookies }) {
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

  if (findUserByEmail(email)) {
    return json({ error: 'An account already exists for that email.' }, { status: 409 });
  }

  const user = createUser({ name, email, password });
  const session = createSession({
    userId: user.id,
    mode: 'user',
    displayName: user.name,
    email: user.email
  });

  setSessionCookie(cookies, session.id, session.expires_at);

  return json(
    {
      data: {
        authenticated: true,
        mode: session.mode,
        displayName: session.display_name,
        email: session.email
      }
    },
    { status: 201 }
  );
}
