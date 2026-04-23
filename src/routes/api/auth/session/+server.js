import { json } from '@sveltejs/kit';
import { SESSION_COOKIE, findValidSessionById } from '$lib/server/auth-db';

export function GET({ cookies }) {
  const sessionId = cookies.get(SESSION_COOKIE) || '';
  const session = findValidSessionById(sessionId);

  if (!session) {
    return json({ data: { authenticated: false } });
  }

  return json({
    data: {
      authenticated: true,
      mode: session.mode,
      displayName: session.display_name,
      email: session.email || ''
    }
  });
}
