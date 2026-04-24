import { json } from '@sveltejs/kit';
import { createSession, setSessionCookie } from '$lib/server/auth-db';
import { clearSupabaseSessionCookies } from '$lib/server/supabase-auth';

export async function POST({ request, cookies }) {
  const body = await request.json().catch(() => ({}));
  const requestedName = String(body?.displayName || '').trim();
  const displayName = requestedName || 'Guest';

  clearSupabaseSessionCookies(cookies);

  const session = createSession({
    userId: null,
    mode: 'guest',
    displayName,
    email: null
  });

  setSessionCookie(cookies, session.id, session.expires_at);

  return json(
    {
      data: {
        authenticated: true,
        mode: session.mode,
        displayName: session.display_name,
        email: ''
      }
    },
    { status: 201 }
  );
}
