import { NextResponse } from "next/server";
import { z } from "zod";

import { isLicenseActive } from "@/lib/server/verify-license";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const publicData = z.record(z.string(), z.unknown());
const repairPublication = z
  .object({
    tracking_id: z
      .string()
      .trim()
      .min(18)
      .max(180)
      .regex(/^[a-zA-Z0-9_-]+$/),
    shop_slug: z.string().trim().min(1).max(180),
    repair_number: z.string().trim().min(1).max(100),
    status: z.string().trim().min(1).max(100),
    device: z.string().trim().max(300),
    public_data: publicData,
  })
  .strict();
const documentPublication = z
  .object({
    token: z
      .string()
      .trim()
      .min(8)
      .max(180)
      .regex(/^[a-zA-Z0-9_-]+$/),
    kind: z.enum(["quote", "invoice", "sale", "intake"]),
    shop_slug: z.string().trim().min(1).max(180),
    document_number: z.string().trim().min(1).max(100),
    status: z.string().trim().min(1).max(100),
    public_data: publicData,
  })
  .strict();
const payloadSchema = z
  .object({
    licenseKey: z.string().trim().min(12).max(100),
    workshopId: z.string().uuid(),
    repairs: z.array(repairPublication).max(500).default([]),
    documents: z.array(documentPublication).max(1000).default([]),
  })
  .strict();

async function tokensBelongToWorkshop(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  table: "public_tracking_repairs" | "public_tracking_documents",
  tokenColumn: "tracking_id" | "token",
  tokens: string[],
  workshopId: string,
): Promise<boolean> {
  if (!tokens.length) return true;
  const { data, error } = await admin.from(table).select(`${tokenColumn},workshop_id`).in(tokenColumn, tokens);
  if (error) throw error;
  return (data ?? []).every((row) => row.workshop_id === workshopId);
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 5 * 1024 * 1024)
    return NextResponse.json({ error: "Publication trop volumineuse." }, { status: 413 });
  const raw = await request.json().catch(() => null);
  if (process.env.NODE_ENV !== "production" && process.env.BEHAR_QA_FAST_LICENSE === "1")
    return NextResponse.json({ ok: true });
  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Publication invalide." }, { status: 400 });
  if (!(await isLicenseActive(parsed.data.licenseKey)))
    return NextResponse.json({ error: "Licence invalide ou inactive." }, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Service cloud indisponible." }, { status: 503 });
  const normalizedLicense = parsed.data.licenseKey.trim().toUpperCase();
  const { data: binding, error: bindingError } = await admin
    .from("workshop_snapshots")
    .select("workshop_id")
    .eq("license_key_normalized", normalizedLicense)
    .maybeSingle();
  if (bindingError) return NextResponse.json({ error: "Vérification cloud impossible." }, { status: 503 });
  if (!binding || binding.workshop_id !== parsed.data.workshopId)
    return NextResponse.json({ error: "Accès atelier refusé." }, { status: 403 });

  try {
    const repairTokens = parsed.data.repairs.map((item) => item.tracking_id);
    const documentTokens = parsed.data.documents.map((item) => item.token);
    const [repairsOwned, documentsOwned] = await Promise.all([
      tokensBelongToWorkshop(admin, "public_tracking_repairs", "tracking_id", repairTokens, parsed.data.workshopId),
      tokensBelongToWorkshop(admin, "public_tracking_documents", "token", documentTokens, parsed.data.workshopId),
    ]);
    if (!repairsOwned || !documentsOwned)
      return NextResponse.json({ error: "Un jeton public appartient à un autre atelier." }, { status: 409 });

    const now = new Date().toISOString();
    if (parsed.data.repairs.length) {
      const { error } = await admin.from("public_tracking_repairs").upsert(
        parsed.data.repairs.map((item) => ({ ...item, workshop_id: parsed.data.workshopId, updated_at: now })),
        { onConflict: "tracking_id" },
      );
      if (error) throw error;
    }
    if (parsed.data.documents.length) {
      const { error } = await admin.from("public_tracking_documents").upsert(
        parsed.data.documents.map((item) => ({ ...item, workshop_id: parsed.data.workshopId, updated_at: now })),
        { onConflict: "token" },
      );
      if (error) throw error;
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Publication cloud impossible." }, { status: 503 });
  }
}
