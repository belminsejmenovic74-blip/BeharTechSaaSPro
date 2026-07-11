import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_WIDGET_CMS_CONFIG,
  editableWidgetConfigSchema,
  mergeEditableWidgetConfig,
  normalizeEditableWidgetConfig,
  type EditableWidgetConfig,
} from "@/lib/widget/cms-config";
import { authorizeWorkshopLicense } from "@/lib/server/workshop-license-auth";
import { publicServices } from "@/lib/server/widget-public-api";

// Catalogue envoyé par l'éditeur (projeté depuis le vrai PriceBook côté client).
// Volontairement permissif : le serveur le re-passe par la liste blanche
// `publicServices` avant tout stockage — aucun champ interne ne peut être publié.
const catalogSchema = z.array(z.record(z.string(), z.unknown())).max(5000).optional();

// Réduit le catalogue à ses champs publics (aucun fournisseur / coût / lot / SKU).
function sanitizeCatalog(raw: unknown) {
  return publicServices({ catalog: Array.isArray(raw) ? raw : [] });
}

export const dynamic = "force-dynamic";

const base = z.object({
  workshopId: z.string().uuid(),
  licenseKey: z.string().trim().min(6).max(100),
});

const defaultsSchema = z
  .object({
    commercialName: z.string().trim().max(160),
    phone: z.string().trim().max(40),
    address: z.string().trim().max(300),
    locale: z.enum(["fr-FR", "fr-CH"]),
    currency: z.enum(["EUR", "CHF"]),
  })
  .strict();

const requestSchema = z.discriminatedUnion("operation", [
  base.extend({ operation: z.literal("get"), defaults: defaultsSchema }).strict(),
  base
    .extend({
      operation: z.literal("save_draft"),
      widgetId: z.string().uuid(),
      config: editableWidgetConfigSchema,
      catalog: catalogSchema,
    })
    .strict(),
  base
    .extend({
      operation: z.literal("publish"),
      widgetId: z.string().uuid(),
      config: editableWidgetConfigSchema,
      catalog: catalogSchema,
    })
    .strict(),
  // Annuler les modifications / restaurer la version publiée : le brouillon
  // repart de la configuration publique. Le site public reste inchangé.
  base.extend({ operation: z.literal("discard_draft"), widgetId: z.string().uuid() }).strict(),
  // Restaurer une ancienne version : republie sa configuration comme NOUVELLE
  // version (le compteur n'est jamais remis en arrière — historique auditable).
  base
    .extend({
      operation: z.literal("restore_version"),
      widgetId: z.string().uuid(),
      version: z.number().int().positive(),
    })
    .strict(),
]);

type WidgetRow = {
  id: string;
  shop_id: string | null;
  public_widget_id: string;
  internal_name: string;
  active: boolean;
  display_mode: "inline" | "modal" | "floating";
  draft_config: Record<string, unknown>;
  published_config: Record<string, unknown> | null;
  published_version: number;
  published_at: string | null;
};

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function editableFromRow(row: WidgetRow): EditableWidgetConfig {
  const source = Object.keys(row.draft_config || {}).length ? row.draft_config : (row.published_config ?? {});
  return normalizeEditableWidgetConfig(source, {
    internalName: row.internal_name,
    active: row.active,
    displayMode: row.display_mode,
  });
}

async function loadWidget(admin: SupabaseClient, workshopId: string, widgetId?: string) {
  let query = admin
    .from("widget_settings")
    .select(
      "id, shop_id, public_widget_id, internal_name, active, display_mode, draft_config, published_config, published_version, published_at",
    )
    .eq("tenant_id", workshopId);
  if (widgetId) query = query.eq("id", widgetId);
  return query.order("created_at", { ascending: true }).limit(1).maybeSingle();
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return responseError("Configuration invalide.", 400);
  const auth = await authorizeWorkshopLicense(parsed.data.workshopId, parsed.data.licenseKey);
  if (auth instanceof Response) return auth;
  const { admin, workshopId } = auth;

  if (parsed.data.operation === "get") {
    let { data: widget, error } = await loadWidget(admin, workshopId);
    if (error) return responseError("Chargement du widget impossible.", 503);
    if (!widget) {
      let { data: shop, error: shopError } = await admin
        .from("shops")
        .select("id")
        .eq("tenant_id", workshopId)
        .eq("active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (shopError) return responseError("Chargement de la boutique impossible.", 503);
      if (!shop) {
        const createdShop = await admin
          .from("shops")
          .insert({
            tenant_id: workshopId,
            internal_name: parsed.data.defaults.commercialName || "Boutique principale",
            commercial_name: parsed.data.defaults.commercialName || null,
            address_config: { address: parsed.data.defaults.address },
            timezone: "Europe/Paris",
          })
          .select("id")
          .single();
        if (createdShop.error || !createdShop.data) return responseError("Création de la boutique impossible.", 503);
        shop = createdShop.data;
      }
      const initial = normalizeEditableWidgetConfig(DEFAULT_WIDGET_CMS_CONFIG, {
        active: true,
        general: {
          ...DEFAULT_WIDGET_CMS_CONFIG.general,
          ...parsed.data.defaults,
        },
      });
      const created = await admin
        .from("widget_settings")
        .insert({
          tenant_id: workshopId,
          shop_id: shop.id,
          internal_name: initial.internalName,
          active: true,
          display_mode: initial.displayMode,
          general_config: initial.general,
          visual_config: initial.visual,
          text_config: initial.texts,
          field_config: initial.features,
          step_config: initial.layout,
          icon_config: initial.icons,
          draft_config: mergeEditableWidgetConfig({}, initial),
        })
        .select(
          "id, shop_id, public_widget_id, internal_name, active, display_mode, draft_config, published_config, published_version, published_at",
        )
        .single();
      if (created.error || !created.data) return responseError("Création du widget impossible.", 503);
      widget = created.data;
    }
    const versionResult = await admin
      .from("widget_versions")
      .select("version, status, created_at, published_at")
      .eq("tenant_id", workshopId)
      .eq("widget_id", widget.id)
      .order("version", { ascending: false })
      .limit(10);
    if (versionResult.error) return responseError("Chargement des versions impossible.", 503);
    return NextResponse.json({
      widget: {
        id: widget.id,
        publicWidgetId: widget.public_widget_id,
        publishedVersion: widget.published_version,
        publishedAt: widget.published_at,
        config: editableFromRow(widget as WidgetRow),
      },
      versions: versionResult.data || [],
    });
  }

  const loaded = await loadWidget(admin, workshopId, parsed.data.widgetId);
  if (loaded.error) return responseError("Chargement du widget impossible.", 503);
  if (!loaded.data) return responseError("Widget introuvable.", 404);
  const row = loaded.data as WidgetRow;

  // Annuler les modifications / restaurer la version publiée : le brouillon
  // repart du publié. Aucune écriture sur published_config → site inchangé.
  if (parsed.data.operation === "discard_draft") {
    const { error } = await admin
      .from("widget_settings")
      .update({ draft_config: row.published_config ?? {} })
      .eq("tenant_id", workshopId)
      .eq("id", parsed.data.widgetId);
    return error ? responseError("Annulation impossible.", 503) : NextResponse.json({ ok: true });
  }

  // Restaurer une ancienne version : republiée comme nouvelle version.
  if (parsed.data.operation === "restore_version") {
    const version = await admin
      .from("widget_versions")
      .select("configuration")
      .eq("tenant_id", workshopId)
      .eq("widget_id", parsed.data.widgetId)
      .eq("version", parsed.data.version)
      .maybeSingle();
    if (version.error) return responseError("Chargement de la version impossible.", 503);
    if (!version.data) return responseError("Version introuvable.", 404);
    const configuration = (version.data.configuration ?? {}) as Record<string, unknown>;
    const { data, error } = await admin.rpc("publish_widget_config", {
      p_tenant_id: workshopId,
      p_widget_id: parsed.data.widgetId,
      p_configuration: configuration,
      p_display_mode: typeof configuration.displayMode === "string" ? configuration.displayMode : row.display_mode,
      p_internal_name: typeof configuration.internalName === "string" ? configuration.internalName : row.internal_name,
      p_active: true,
      p_created_by: null,
    });
    return error ? responseError("Restauration impossible.", 503) : NextResponse.json({ ok: true, publication: data });
  }

  const sourceConfig = Object.keys(row.draft_config || {}).length ? row.draft_config : row.published_config;
  const merged = mergeEditableWidgetConfig(sourceConfig, parsed.data.config);
  // Catalogue projeté depuis le vrai PriceBook (client), re-filtré côté serveur.
  const fullConfig = { ...merged, catalog: sanitizeCatalog(parsed.data.catalog) };

  if (parsed.data.operation === "save_draft") {
    const { error } = await admin
      .from("widget_settings")
      .update({
        internal_name: parsed.data.config.internalName,
        active: parsed.data.config.active,
        display_mode: parsed.data.config.displayMode,
        general_config: parsed.data.config.general,
        visual_config: parsed.data.config.visual,
        text_config: parsed.data.config.texts,
        field_config: parsed.data.config.features,
        step_config: parsed.data.config.layout,
        icon_config: parsed.data.config.icons,
        draft_config: fullConfig,
      })
      .eq("tenant_id", workshopId)
      .eq("id", parsed.data.widgetId);
    return error ? responseError("Enregistrement du brouillon impossible.", 503) : NextResponse.json({ ok: true });
  }

  const { data, error } = await admin.rpc("publish_widget_config", {
    p_tenant_id: workshopId,
    p_widget_id: parsed.data.widgetId,
    p_configuration: fullConfig,
    p_display_mode: parsed.data.config.displayMode,
    p_internal_name: parsed.data.config.internalName,
    p_active: parsed.data.config.active,
    p_created_by: null,
  });
  if (error) return responseError("Publication du widget impossible.", 503);
  return NextResponse.json({ ok: true, publication: data });
}
