"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import crypto from "crypto";
import type { GenerateLicensesResult, LicenseKeyStatus } from "@/lib/supabase/license-types";

// Hash functions
function sha256(content: string) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function generateRandomKey() {
  // Format: BTP-XXXX-XXXX-XXXX-XXXX
  const bytes = crypto.randomBytes(8);
  const hex = bytes.toString("hex").toUpperCase();
  return `BTP-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Validation : check if the caller is authorized
// (In a real app, verify a JWT or session cookie here.
// For this MVP, we assume the server action is protected by the UI / admin pin layer,
// but we should still be careful).
async function checkAdminAuth() {
  // TODO: Add real auth verification. For now, we allow it.
  return true;
}

export async function generateLicenses(count = 50): Promise<GenerateLicensesResult> {
  const isAuth = await checkAdminAuth();
  if (!isAuth) {
    return { success: false, message: "Non autorisé" };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { success: false, message: "Supabase non configuré" };
  }

  const generatedLicenses = [];
  const dbPayloads = [];

  for (let i = 0; i < count; i++) {
    const rawKey = generateRandomKey();
    const rawToken = generateToken();

    const keyHash = sha256(rawKey);
    const tokenHash = sha256(rawToken);

    const keyPreview = rawKey.substring(0, 8) + "-****-****";

    const payload = {
      key_hash: keyHash,
      key_preview: keyPreview,
      download_token_hash: tokenHash,
      status: "active" as LicenseKeyStatus,
      plan: "pro",
    };

    dbPayloads.push(payload);

    // We only keep the raw keys in memory for the immediate response
    generatedLicenses.push({
      key: rawKey,
      token: rawToken,
      keyPreview: keyPreview,
      status: "active" as LicenseKeyStatus,
      plan: "pro" as any,
    });
  }

  const { data, error } = await supabase.from("license_keys").insert(dbPayloads).select("id, key_preview");

  if (error) {
    console.error("Error generating licenses", error);
    return { success: false, message: "Erreur lors de l'insertion en base: " + error.message };
  }

  // Merge the IDs back into our plain text results
  const finalLicenses = generatedLicenses.map((lic, idx) => ({
    ...lic,
    id: data[idx].id,
  }));

  revalidatePath("/admin/licenses");

  return {
    success: true,
    count: finalLicenses.length,
    licenses: finalLicenses,
  };
}

export async function deactivateLicense(id: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { success: false, message: "Supabase error" };

  const { error } = await supabase.from("license_keys").update({ status: "inactive" }).eq("id", id);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/admin/licenses");
  return { success: true };
}

export async function fetchLicenses() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase.from("license_keys").select("*").order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching licenses", error);
    return [];
  }

  return data;
}
