import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_ACCESS_COOKIE = 'suryqata_supabase_access';
const SUPABASE_REFRESH_COOKIE = 'suryqata_supabase_refresh';

const supabaseUrl = privateEnv.SUPABASE_URL || publicEnv.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
  privateEnv.SUPABASE_ANON_KEY ||
  privateEnv.SUPABASE_PUBLISHABLE_KEY ||
  publicEnv.PUBLIC_SUPABASE_ANON_KEY ||
  publicEnv.PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

export const hasSupabaseAuthConfig = Boolean(supabaseUrl && supabaseAnonKey);

const cookieDefaults = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax',
  secure: privateEnv.NODE_ENV === 'production'
};

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function createSupabaseServerClient() {
  if (!hasSupabaseAuthConfig) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

export function setSupabaseSessionCookies(cookies, session) {
  const expiresInSeconds = Number(session?.expires_in || 3600);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  cookies.set(SUPABASE_ACCESS_COOKIE, session.access_token, {
    ...cookieDefaults,
    expires: expiresAt
  });

  cookies.set(SUPABASE_REFRESH_COOKIE, session.refresh_token, {
    ...cookieDefaults,
    expires: expiresAt
  });
}

export function clearSupabaseSessionCookies(cookies) {
  cookies.delete(SUPABASE_ACCESS_COOKIE, {
    path: '/'
  });

  cookies.delete(SUPABASE_REFRESH_COOKIE, {
    path: '/'
  });
}

export function getSupabaseAccessTokenFromCookies(cookies) {
  return cookies.get(SUPABASE_ACCESS_COOKIE) || '';
}

export async function getSupabaseUserFromCookies(cookies) {
  const supabase = createSupabaseServerClient();
  const accessToken = getSupabaseAccessTokenFromCookies(cookies);

  if (!supabase || !accessToken) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data?.user) {
    return null;
  }

  return data.user;
}

export function getDisplayNameFromUser(user) {
  if (!user) {
    return 'Account';
  }

  const metadata = user.user_metadata || {};
  const profileName = String(metadata.full_name || metadata.name || '').trim();

  if (profileName) {
    return profileName;
  }

  if (user.email) {
    return user.email.split('@')[0];
  }

  return 'Account';
}
