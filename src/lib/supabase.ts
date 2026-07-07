import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { requireEnv } from "./server/env";
import type { Database } from "./types/database";

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
} as const;

let publicClient: SupabaseClient<Database> | undefined;
let serverClient: SupabaseClient<Database> | undefined;

/**
 * Anon/publishable-key client — read-only access gated by RLS.
 * Safe for reading report data by slug. Never use this for writes.
 */
export function getSupabasePublic(): SupabaseClient<Database> {
  if (!publicClient) {
    publicClient = createClient<Database>(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_PUBLISHABLE_KEY"),
      clientOptions,
    );
  }
  return publicClient;
}

/**
 * Secret/service-role-key client — bypasses RLS. Server-side backend writes only.
 * NEVER import this from client components or code that ships to the browser.
 */
export function getSupabaseServer(): SupabaseClient<Database> {
  if (!serverClient) {
    serverClient = createClient<Database>(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SECRET_KEY"),
      clientOptions,
    );
  }
  return serverClient;
}
