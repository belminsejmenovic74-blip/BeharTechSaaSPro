import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { authorizeWorkshopLicense } from "@/lib/server/workshop-license-auth";
import { validateWidgetAssetUpload } from "@/lib/server/widget-assets";
import { WIDGET_ICON_TARGETS } from "@/lib/widget/cms-config";
import type { WidgetIconTarget } from "@/lib/widget/public-types";
import { WIDGET_ASSET_OUTPUT_MAX_BYTES } from "@/lib/widget/asset-contract";

export const dynamic = "force-dynamic";
const BUCKET = "widget-brand-assets";

const jsonSchema = z.discriminatedUnion("operation", [
  z
    .object({
      operation: z.literal("list"),
      workshopId: z.string().uuid(),
      licenseKey: z.string().min(6),
      widgetId: z.string().uuid(),
    })
    .strict(),
  z
    .object({
      operation: z.literal("delete"),
      workshopId: z.string().uuid(),
      licenseKey: z.string().min(6),
      widgetId: z.string().uuid(),
      assetId: z.string().uuid(),
    })
    .strict(),
]);

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function widgetBelongsToTenant(admin: SupabaseClient, tenantId: string, widgetId: string) {
  const result = await admin
    .from("widget_settings")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", widgetId)
    .maybeSingle();
  return !result.error && Boolean(result.data);
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    const parsed = jsonSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return error("Requête invalide.", 400);
    const auth = await authorizeWorkshopLicense(parsed.data.workshopId, parsed.data.licenseKey);
    if (auth instanceof Response) return auth;
    if (!(await widgetBelongsToTenant(auth.admin, auth.workshopId, parsed.data.widgetId)))
      return error("Widget introuvable.", 404);
    if (parsed.data.operation === "list") {
      const result = await auth.admin
        .from("widget_assets")
        .select(
          "id, asset_kind, target_key, public_url, original_name, mime_type, byte_size, width, height, created_at",
        )
        .eq("tenant_id", auth.workshopId)
        .eq("widget_id", parsed.data.widgetId)
        .order("created_at", { ascending: false });
      return result.error
        ? error("Chargement des médias impossible.", 503)
        : NextResponse.json({ assets: result.data || [] });
    }
    const existing = await auth.admin
      .from("widget_assets")
      .select("id, storage_path")
      .eq("tenant_id", auth.workshopId)
      .eq("widget_id", parsed.data.widgetId)
      .eq("id", parsed.data.assetId)
      .maybeSingle();
    if (existing.error) return error("Suppression impossible.", 503);
    if (!existing.data) return error("Média introuvable.", 404);
    const storage = await auth.admin.storage.from(BUCKET).remove([existing.data.storage_path]);
    if (storage.error) return error("Suppression du fichier impossible.", 503);
    const deleted = await auth.admin
      .from("widget_assets")
      .delete()
      .eq("tenant_id", auth.workshopId)
      .eq("id", parsed.data.assetId);
    return deleted.error ? error("Suppression impossible.", 503) : NextResponse.json({ ok: true });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > WIDGET_ASSET_OUTPUT_MAX_BYTES + 64 * 1024) return error("Fichier trop lourd.", 413);

  const form = await request.formData();
  const workshopId = String(form.get("workshopId") || "");
  const licenseKey = String(form.get("licenseKey") || "");
  const widgetId = String(form.get("widgetId") || "");
  const target = String(form.get("target") || "");
  const width = Number(form.get("width"));
  const height = Number(form.get("height"));
  const file = form.get("file");
  if (
    !z.string().uuid().safeParse(widgetId).success ||
    !WIDGET_ICON_TARGETS.includes(target as WidgetIconTarget) ||
    !(file instanceof File)
  ) {
    return error("Import invalide.", 400);
  }
  if (file.size > WIDGET_ASSET_OUTPUT_MAX_BYTES) return error("Fichier trop lourd.", 413);
  const auth = await authorizeWorkshopLicense(workshopId, licenseKey);
  if (auth instanceof Response) return auth;
  if (!(await widgetBelongsToTenant(auth.admin, auth.workshopId, widgetId))) return error("Widget introuvable.", 404);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = validateWidgetAssetUpload({ declaredType: file.type, size: file.size, bytes, width, height });
  if (!validation.ok) {
    return error(validation.code === "too_large" ? "Fichier trop lourd." : "Format ou dimensions invalides.", 400);
  }
  const path = `${auth.workshopId}/${widgetId}/${randomUUID()}.${validation.mimeType.split("/")[1]}`;
  const upload = await auth.admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: validation.mimeType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (upload.error) return error("Import du média impossible.", 503);
  const publicUrl = auth.admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const inserted = await auth.admin
    .from("widget_assets")
    .insert({
      tenant_id: auth.workshopId,
      widget_id: widgetId,
      asset_kind: "icon",
      target_key: target,
      storage_path: path,
      public_url: publicUrl,
      original_name: file.name.slice(0, 180),
      mime_type: validation.mimeType,
      byte_size: file.size,
      width,
      height,
    })
    .select("id, asset_kind, target_key, public_url, original_name, mime_type, byte_size, width, height, created_at")
    .single();
  if (inserted.error || !inserted.data) {
    await auth.admin.storage.from(BUCKET).remove([path]);
    return error("Enregistrement du média impossible.", 503);
  }
  return NextResponse.json({ asset: inserted.data }, { status: 201 });
}
