import { json } from '@sveltejs/kit';
import { SESSION_COOKIE, clearSessionCookie, deleteSessionById } from '$lib/server/auth-db';

export function POST({ cookies }) {
  const sessionId = cookies.get(SESSION_COOKIE) || '';

  if (sessionId) {
    deleteSessionById(sessionId);
  }

  clearSessionCookie(cookies);
  return json({ data: { authenticated: false } });
}
