import { getSupabaseAdminClient } from './supabase-server';

const NOT_FOUND_CODES = new Set(['PGRST116', 'PGRST117', 'PGRST123']);

/**
 * Fetches the user's profile and transparently creates a bare record when it
 * does not yet exist. Some authentication flows create the user in
 * `auth.users` before any row is inserted into `profiles`, which caused Stripe
 * checkout to fail with foreign-key errors. This helper ensures a profile row
 * is always present before we continue with paid flows.
 */
export async function getOrCreateProfile(userId) {
  if (!userId) {
    return { profile: null, created: false, error: new Error('Missing userId') };
  }

  const supabaseAdmin = getSupabaseAdminClient();

  const {
    data: existingProfile,
    error: fetchError,
  } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!fetchError && existingProfile) {
    return { profile: existingProfile, created: false, error: null };
  }

  if (fetchError && !NOT_FOUND_CODES.has(fetchError.code)) {
    return { profile: null, created: false, error: fetchError };
  }

  const {
    data: newProfile,
    error: insertError,
  } = await supabaseAdmin
    .from('profiles')
    .insert({ id: userId })
    .select('*')
    .single();

  if (insertError) {
    return { profile: null, created: false, error: insertError };
  }

  return { profile: newProfile, created: true, error: null };
}
