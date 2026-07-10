"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import crypto from "crypto";
import type { GenerateLicensesResult, LicenseKeyStatus } from "@/lib/supabase/license-types";

// Hash functions
function sha256(content: string) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

const ADMIN_COOKIE = "btp_admin";

/** Empreinte attendue dans le cookie de session admin, dérivée du secret serveur. */
function adminSessionHash(): string | null {
  const secret = process.env.ADMIN_ACCESS_TOKEN;
  if (!secret) return null;
  return sha256(`btp-admin:${secret}`);
}

async function isAdmin(): Promise<boolean> {
  const expected = adminSessionHash();
  if (!expected) return false;
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === expected;
}

/** Ouvre une session admin si le mot de passe correspond au secret serveur. */
export async function loginAdmin(password: string): Promise<{ success: boolean; message?: string }> {
  const secret = process.env.ADMIN_ACCESS_TOKEN;
  if (!secret) {
    return { success: false, message: "Accès administrateur non configuré sur le serveur." };
  }
  const provided = (password || "").trim();
  const a = Buffer.from(sha256(provided));
  const b = Buffer.from(sha256(secret));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { success: false, message: "Mot de passe incorrect." };
  }
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, sha256(`btp-admin:${secret}`), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return { success: true };
}

export async function isAdminAuthed(): Promise<boolean> {
  return isAdmin();
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

export async function generateLicenses(count = 50): Promise<GenerateLicensesResult> {
  if (!(await isAdmin())) {
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
  if (!(await isAdmin())) return { success: false, message: "Non autorisé" };

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
  if (!(await isAdmin())) return [];

  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase.from("license_keys").select("*").order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching licenses", error);
    return [];
  }

  return data;
}
