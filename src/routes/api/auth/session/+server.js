import { json } from '@sveltejs/kit';
import { SESSION_COOKIE, findValidSessionById } from '$lib/server/auth-db';
import { getDisplayNameFromUser, getSupabaseUserFromCookies } from '$lib/server/supabase-auth';

export async function GET({ cookies }) {
  const user = await getSupabaseUserFromCookies(cookies);

  if (user) {
    return json({
      data: {
        authenticated: true,
        mode: 'user',
        displayName: getDisplayNameFromUser(user),
        email: user.email || ''
      }
    });
  }

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
