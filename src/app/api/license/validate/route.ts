import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSupabaseAdmin } from "@/lib/supabase/server";

const bodySchema = z.object({ licenseKey: z.string().trim().min(12).max(100) });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Clé de licence invalide." }, { status: 400 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Validation indisponible." }, { status: 503 });
  const normalized = parsed.data.licenseKey.toUpperCase();
  const keyHash = createHash("sha256").update(normalized).digest("hex");
  const { data: license, error } = await admin
    .from("license_keys")
    .select("id,workshop_id,status,plan")
    .eq("key_hash", keyHash)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Validation momentanément indisponible." }, { status: 503 });
  if (!license?.workshop_id || !["active", "used", "past_due"].includes(license.status)) {
    return NextResponse.json({ error: "Clé invalide ou inactive." }, { status: 401 });
  }
  const { data: snapshot } = await admin
    .from("workshop_snapshots")
    .select("workshop_id")
    .eq("license_key_normalized", normalized)
    .maybeSingle();
  if (!snapshot || snapshot.workshop_id !== license.workshop_id) {
    return NextResponse.json({ error: "Cette licence n’est pas encore rattachée à son atelier." }, { status: 409 });
  }
  return NextResponse.json(
    { ok: true, workshopId: license.workshop_id, plan: license.plan, status: license.status },
    { headers: { "cache-control": "no-store" } },
  );
}
