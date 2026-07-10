import { createHash } from "node:crypto";

import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Confirme qu'une licence existe et reste active avant toute écriture serveur.
 * La clé n'est jamais stockée en clair : on la compare à son empreinte SHA-256,
 * comme à la génération.
 */
export async function isLicenseActive(rawKey: string | null | undefined): Promise<boolean> {
  const key = (rawKey || "").trim().toUpperCase();
  if (!key) return false;

  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const keyHash = createHash("sha256").update(key).digest("hex");
  const { data, error } = await supabase.from("license_keys").select("status").eq("key_hash", keyHash).maybeSingle();

  if (error || !data) return false;
  return data.status === "active" || data.status === "used";
}
