import { json } from '@sveltejs/kit';
import { SESSION_COOKIE, clearSessionCookie, deleteSessionById } from '$lib/server/auth-db';
import { clearSupabaseSessionCookies } from '$lib/server/supabase-auth';

export function POST({ cookies }) {
  const sessionId = cookies.get(SESSION_COOKIE) || '';

  if (sessionId) {
    deleteSessionById(sessionId);
  }

  clearSupabaseSessionCookies(cookies);
  clearSessionCookie(cookies);
  return json({ data: { authenticated: false } });
}
