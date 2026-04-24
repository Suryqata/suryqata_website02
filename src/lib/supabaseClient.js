import { env } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY || '';

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseEnv ? createClient(supabaseUrl, supabaseAnonKey) : null;