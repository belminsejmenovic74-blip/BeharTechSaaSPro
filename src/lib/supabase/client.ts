import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let cachedClient: SupabaseClient | null = null;

/**
 * Renvoie une instance singleton du client Supabase.
 * Renvoie `null` si les variables d'env ne sont pas configurées (offline-only mode).
 */
export function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (cachedClient) return cachedClient;

  cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false, // pas de session — on est full anonymous
      autoRefreshToken: false,
    },
    global: {
      headers: {
        "x-client-info": "behar-tech-pro-web",
      },
    },
  });

  return cachedClient;
}

/** Booléen utilitaire : Supabase est-il configuré ? */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
