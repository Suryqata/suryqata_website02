import { json } from '@sveltejs/kit';
import {
  createSession,
  findUserByEmail,
  normalizeEmail,
  setSessionCookie,
  verifyPassword
} from '$lib/server/auth-db';

export async function POST({ request, cookies }) {
  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body?.email);
  const password = String(body?.password || '');
  const user = findUserByEmail(email);

  if (!user || !verifyPassword(password, user.password_hash)) {
    return json({ error: 'Incorrect email or password.' }, { status: 401 });
  }

  const session = createSession({
    userId: user.id,
    mode: 'user',
    displayName: user.name,
    email: user.email
  });

  setSessionCookie(cookies, session.id, session.expires_at);

  return json({
    data: {
      authenticated: true,
      mode: session.mode,
      displayName: session.display_name,
      email: session.email
    }
  });
}
