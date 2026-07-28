import { NextResponse } from "next/server";
import { z } from "zod";

import { isLicenseActive } from "@/lib/server/verify-license";
import { buildWorkshopSnapshotWrite } from "@/lib/server/workshop-snapshot-write";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const licenseKey = z.string().trim().min(12).max(100);
const loadSchema = z.object({ action: z.literal("load"), licenseKey }).strict();
const upsertSchema = z
  .object({
    action: z.literal("upsert"),
    licenseKey,
    workshopId: z.string().uuid(),
    workshopName: z.string().trim().max(180).nullable().optional(),
    deviceLabel: z.string().trim().max(100).optional(),
    state: z.record(z.string(), z.unknown()),
    stateSizeBytes: z
      .number()
      .int()
      .positive()
      .max(10 * 1024 * 1024),
    schemaVersion: z.number().int().positive().max(100),
  })
  .strict();

function recoveryCode(workshopId: string): string {
  const hex = workshopId.replace(/-/g, "").toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

function snapshotDto(row: Record<string, unknown>) {
  return {
    id: String(row.id ?? ""),
    workshopId: String(row.workshop_id ?? ""),
    licenseKey: String(row.license_key ?? ""),
    workshopName: typeof row.workshop_name === "string" ? row.workshop_name : undefined,
    state: row.state && typeof row.state === "object" ? row.state : {},
    stateSizeBytes: Number(row.state_size_bytes ?? 0),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = z.union([loadSchema, upsertSchema]).safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Requête snapshot invalide." }, { status: 400 });
  if (process.env.NODE_ENV !== "production" && process.env.BEHAR_QA_FAST_LICENSE === "1") {
    if (parsed.data.action === "load")
      return NextResponse.json({ snapshot: null }, { headers: { "cache-control": "no-store" } });
    return NextResponse.json(
      {
        snapshot: {
          id: `qa-${parsed.data.workshopId}`,
          workshopId: parsed.data.workshopId,
          licenseKey: parsed.data.licenseKey.trim().toUpperCase(),
          workshopName: parsed.data.workshopName ?? undefined,
          state: parsed.data.state,
          stateSizeBytes: parsed.data.stateSizeBytes,
          updatedAt: new Date().toISOString(),
        },
      },
      { headers: { "cache-control": "no-store" } },
    );
  }
  if (!(await isLicenseActive(parsed.data.licenseKey)))
    return NextResponse.json({ error: "Licence invalide ou inactive." }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Service cloud indisponible." }, { status: 503 });
  const normalizedKey = parsed.data.licenseKey.trim().toUpperCase();

  const { data: bound, error: bindingError } = await admin
    .from("workshop_snapshots")
    .select("id,workshop_id,license_key,workshop_name,state,state_size_bytes,updated_at")
    .eq("license_key_normalized", normalizedKey)
    .maybeSingle();
  if (bindingError) return NextResponse.json({ error: "Lecture cloud impossible." }, { status: 503 });
  if (parsed.data.action === "load") {
    return NextResponse.json(
      { snapshot: bound ? snapshotDto(bound) : null },
      { headers: { "cache-control": "no-store" } },
    );
  }
  if (bound && bound.workshop_id !== parsed.data.workshopId)
    return NextResponse.json({ error: "Cette licence appartient à un autre atelier." }, { status: 403 });

  const { data: workshopOwner, error: ownerError } = await admin
    .from("workshop_snapshots")
    .select("license_key_normalized")
    .eq("workshop_id", parsed.data.workshopId)
    .maybeSingle();
  if (ownerError) return NextResponse.json({ error: "Vérification d’atelier impossible." }, { status: 503 });
  if (workshopOwner?.license_key_normalized && workshopOwner.license_key_normalized !== normalizedKey)
    return NextResponse.json({ error: "Atelier déjà rattaché à une autre licence." }, { status: 403 });

  const { data: saved, error: saveError } = await admin
    .from("workshop_snapshots")
    .upsert(
      buildWorkshopSnapshotWrite({
        workshopId: parsed.data.workshopId,
        recoveryCode: recoveryCode(parsed.data.workshopId),
        licenseKey: normalizedKey,
        workshopName: parsed.data.workshopName,
        deviceLabel: parsed.data.deviceLabel,
        state: parsed.data.state,
        stateSizeBytes: parsed.data.stateSizeBytes,
        schemaVersion: parsed.data.schemaVersion,
      }),
      { onConflict: "workshop_id" },
    )
    .select("id,workshop_id,license_key,workshop_name,state,state_size_bytes,updated_at")
    .single();
  if (saveError || !saved) {
    console.error("[snapshot] workshop upsert failed", {
      code: saveError?.code,
      workshopId: parsed.data.workshopId,
    });
    return NextResponse.json({ error: "Sauvegarde cloud impossible." }, { status: 503 });
  }
  return NextResponse.json({ snapshot: snapshotDto(saved) }, { headers: { "cache-control": "no-store" } });
}
