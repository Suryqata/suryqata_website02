import { hasSupabaseEnv, supabase } from '$lib/supabaseClient';

export async function load() {
  if (!hasSupabaseEnv || !supabase) {
    return {
      countries: []
    };
  }

  const { data } = await supabase.from('countries').select();

  return {
    countries: data ?? []
  };
}
