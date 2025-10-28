import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

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
      'NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY'
    );

    supabaseAnonClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseAnonClient;
}

export function getSupabaseAdminClient() {
  if (!supabaseAdminClient) {
    assertEnv(supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
    assertEnv(supabaseServiceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY');

    supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  }

  return supabaseAdminClient;
}
