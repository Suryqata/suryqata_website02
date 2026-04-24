import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

const supabaseUrl = env.PUBLIC_SUPABASE_URL || '';
const supabaseKey = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.PUBLIC_SUPABASE_ANON_KEY || '';

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseKey);

export const supabase = hasSupabaseEnv ? createClient(supabaseUrl, supabaseKey) : null;