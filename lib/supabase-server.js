import { createClient } from '@supabase/supabase-js';

// SECURITY: Validate that service role key is not accidentally exposed
if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'SECURITY ERROR: NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY should NEVER be set. ' +
    'Service role keys must use SUPABASE_SERVICE_ROLE_KEY (without NEXT_PUBLIC_ prefix) ' +
    'to prevent client-side exposure. This would grant unrestricted database access to attackers.'
  );
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

// SECURITY FIX: Never fall back to service role key for anon client
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

// SECURITY FIX: Never use NEXT_PUBLIC_ prefix for service role key
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAnonClient = null;
let supabaseAdminClient = null;

function assertEnv(value, name) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

export function getSupabaseAnonClient() {
  if (!supabaseAnonClient) {
    assertEnv(
      supabaseUrl,
      'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL'
    );
    assertEnv(
      supabaseAnonKey,
      'NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY'
    );

    supabaseAnonClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseAnonClient;
}

export function getSupabaseAdminClient() {
  if (!supabaseAdminClient) {
    assertEnv(supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
    assertEnv(
      supabaseServiceRoleKey,
      'SUPABASE_SERVICE_ROLE_KEY (must NOT use NEXT_PUBLIC_ prefix)'
    );

    supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return supabaseAdminClient;
}
