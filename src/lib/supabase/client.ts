/**
 * Supabase client (browser).
 *
 * Utilisé par l'Option B : sync cloud manuel.
 * - Pas d'auth (anonymous), on protège via `recovery_code` unique.
 * - Une seule table : `workshop_snapshots`.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const PUBLIC_SUPABASE_URL_FALLBACK = "https://ctjlgeonvbwpfeqgsajf.supabase.co";
const PUBLIC_SUPABASE_ANON_KEY_FALLBACK =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0amxnZW9udmJ3cGZlcWdzYWpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4Mzc2OTEsImV4cCI6MjA5NDQxMzY5MX0.SIKA4t0jv1HMcdqFWgUgR6T2Fn78ga09vbHDW3w1hLY";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || PUBLIC_SUPABASE_URL_FALLBACK;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PUBLIC_SUPABASE_ANON_KEY_FALLBACK;

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
