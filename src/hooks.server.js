import { cleanupExpiredSessions } from '$lib/server/auth-db';

export async function handle({ event, resolve }) {
  cleanupExpiredSessions();
  return resolve(event);
}
