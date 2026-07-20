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
  // La clé doit exister et être active. Une clé fraîchement générée n'a pas
  // encore de workshop_id ni de snapshot : elle est « libre » et doit pouvoir
  // servir à une PREMIÈRE activation (le rattachement est créé juste après par
  // ensureCloudStateForLicense). L'ancien code exigeait un rattachement
  // préalable → aucune clé générée ne pouvait jamais s'activer (blocage total).
  if (!license || !["active", "used", "past_due"].includes(license.status)) {
    return NextResponse.json({ error: "Clé invalide ou inactive." }, { status: 401 });
  }
  // Le rattachement réel (isolation multi-ateliers) vit sur le snapshot, comme
  // dans la route de synchronisation. On ne refuse QUE si la clé est déjà
  // rattachée à un autre atelier — jamais une clé encore libre.
  const { data: snapshot } = await admin
    .from("workshop_snapshots")
    .select("workshop_id")
    .eq("license_key_normalized", normalized)
    .maybeSingle();
  const boundWorkshopId = snapshot?.workshop_id ?? license.workshop_id ?? null;
  if (snapshot?.workshop_id && license.workshop_id && snapshot.workshop_id !== license.workshop_id) {
    return NextResponse.json({ error: "Cette licence est rattachée à un autre atelier." }, { status: 409 });
  }
  return NextResponse.json(
    { ok: true, workshopId: boundWorkshopId, plan: license.plan, status: license.status },
    { headers: { "cache-control": "no-store" } },
  );
}
