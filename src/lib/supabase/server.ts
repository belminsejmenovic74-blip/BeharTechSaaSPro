import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !serviceRoleKey) return null;
  if (cachedAdmin) return cachedAdmin;

  cachedAdmin = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        "x-client-info": "behar-tech-pro-server",
      },
    },
  });

  return cachedAdmin;
}

export function requireSupabaseAdmin(): SupabaseClient {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error("Supabase server non configuré. Ajoutez NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.");
  }
  return client;
}
