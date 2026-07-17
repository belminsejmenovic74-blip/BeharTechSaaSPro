import { NextResponse } from "next/server";

import { getCurrentAppSession } from "@/lib/auth/app-session";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isLicenseActive } from "@/lib/server/verify-license";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function authorizeWorkshopLicense(workshopId: string, licenseKey: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  if (!UUID_RE.test(workshopId) || !(await isLicenseActive(licenseKey))) {
    return NextResponse.json({ error: "Accès atelier refusé." }, { status: 401 });
  }
  const appSession = await getCurrentAppSession();
  if (appSession && appSession.workshopId !== workshopId) {
    return NextResponse.json({ error: "Session entreprise invalide." }, { status: 403 });
  }
  const normalizedLicense = licenseKey.trim().toUpperCase();
  const { data, error } = await admin
    .from("workshop_snapshots")
    .select("workshop_id")
    .eq("license_key_normalized", normalizedLicense)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Service momentanément indisponible." }, { status: 503 });
  if (!data || data.workshop_id !== workshopId) {
    return NextResponse.json({ error: "Accès atelier refusé." }, { status: 403 });
  }
  return { admin, workshopId, session: appSession };
}
