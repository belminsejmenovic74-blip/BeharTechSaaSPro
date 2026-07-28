import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { weeklyHoursToScheduleConfig } from "@/lib/workshop-hours";

type CatalogStockLink = {
  publicId?: unknown;
  stock?: { mode?: unknown };
  stockItemIds?: unknown;
};

const DAY_ALIASES: Record<string, number> = {
  lun: 1,
  lundi: 1,
  mar: 2,
  mardi: 2,
  mer: 3,
  mercredi: 3,
  jeu: 4,
  jeudi: 4,
  ven: 5,
  vendredi: 5,
  sam: 6,
  samedi: 6,
  dim: 7,
  dimanche: 7,
};

function folded(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase();
}

function dayRange(source: string): number[] {
  const [fromRaw, toRaw] = source.split(/\s*[-–]\s*/, 2);
  const from = DAY_ALIASES[folded(fromRaw || "")];
  const to = DAY_ALIASES[folded(toRaw || fromRaw || "")];
  if (!from || !to) return [];
  const result: number[] = [];
  for (let day = from; ; day = day === 7 ? 1 : day + 1) {
    result.push(day);
    if (day === to || result.length === 7) break;
  }
  return result;
}

/** Convertit les horaires libres de l'atelier en plages comprises par le moteur de réservation. */
export function parseWorkshopBusinessHours(value: unknown): Record<string, Array<{ start: string; end: string }>> {
  if (typeof value !== "string") return {};
  const weekly: Record<string, Array<{ start: string; end: string }>> = {};
  for (const part of value.split(/[·;\n]+/)) {
    const match = part
      .trim()
      .match(/^([A-Za-zÀ-ÿ]+(?:\s*[-–]\s*[A-Za-zÀ-ÿ]+)?)\s+(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})$/i);
    if (!match) continue;
    const start = match[2].padStart(5, "0");
    const end = match[3].padStart(5, "0");
    if (start >= end || start > "23:59" || end > "23:59") continue;
    for (const day of dayRange(match[1])) weekly[String(day)] = [{ start, end }];
  }
  return weekly;
}

export async function syncWidgetShopFromLicense(
  admin: SupabaseClient,
  tenantId: string,
  shopId: string,
  settings: Record<string, unknown>,
) {
  const structuredSchedule = settings.weeklyHours ? weeklyHoursToScheduleConfig(settings.weeklyHours) : null;
  const weeklyHours = structuredSchedule?.weeklyHours || parseWorkshopBusinessHours(settings.businessHours);
  const current = await admin
    .from("shops")
    .select("address_config, schedule_config")
    .eq("tenant_id", tenantId)
    .eq("id", shopId)
    .maybeSingle();
  if (current.error) throw current.error;
  const currentAddress = (current.data?.address_config || {}) as Record<string, unknown>;
  const currentSchedule = (current.data?.schedule_config || {}) as Record<string, unknown>;
  const nextAddress = { ...currentAddress };
  const address = String(settings.address || "").trim();
  const postalCode = String(settings.postalCode || "").trim();
  const city = String(settings.city || settings.postalCity || "").trim();
  const country = settings.country === "CH" ? "CH" : "FR";
  if (address) nextAddress.address = address;
  if (postalCode) nextAddress.postalCode = postalCode;
  if (city) nextAddress.city = city;
  nextAddress.country = country;
  const patch: Record<string, unknown> = {
    commercial_name: String(settings.commercialName || settings.name || "").trim() || null,
    address_config: nextAddress,
  };
  if (Object.keys(weeklyHours).length) {
    patch.schedule_config = {
      ...currentSchedule,
      weeklyHours,
      ...(structuredSchedule ? { breaks: structuredSchedule.breaks } : {}),
    };
  }
  const { error } = await admin.from("shops").update(patch).eq("tenant_id", tenantId).eq("id", shopId);
  if (error) throw error;
}

function stableUuid(input: unknown): string {
  const hash = createHash("sha256")
    .update(String(input || "missing"))
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

/**
 * La publication du widget (thème, parcours, prix) ne doit pas échouer si la
 * migration optionnelle de stock public n'est pas encore présente sur un
 * déploiement. Le stock temps réel reste alors masqué jusqu'à la migration.
 */
export function isMissingWidgetStockSchema(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code || "") : "";
  return code === "PGRST202" || code === "PGRST205" || code === "42P01" || code === "42883";
}

/** Relie les prestations publiées au stock normalisé du même atelier/licence. */
export async function syncWidgetStockLinks(
  admin: SupabaseClient,
  tenantId: string,
  widgetId: string,
  shopId: string,
  rawCatalog: unknown,
) {
  const entries = (Array.isArray(rawCatalog) ? rawCatalog : []) as CatalogStockLink[];
  const localIds = [
    ...new Set(
      entries
        .flatMap((entry) => (Array.isArray(entry.stockItemIds) ? entry.stockItemIds : []))
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  const databaseIds = localIds.map((id) => stableUuid(`stock:${tenantId}:${id}`));
  const { data: stocks, error: stockError } = databaseIds.length
    ? await admin
        .from("stock_items")
        .select("id, canonical_reference, quality, source_shop_key")
        .eq("workshop_id", tenantId)
        .in("id", databaseIds)
    : { data: [], error: null };
  if (stockError) throw stockError;
  const byId = new Map((stocks || []).map((row) => [row.id, row]));
  const rows = entries.flatMap((entry) => {
    const publicId = typeof entry.publicId === "string" ? entry.publicId : "";
    const stockMode = entry.stock && typeof entry.stock.mode === "string" ? entry.stock.mode : "hidden";
    const localId = Array.isArray(entry.stockItemIds)
      ? entry.stockItemIds.find((id) => typeof id === "string" && byId.has(stableUuid(`stock:${tenantId}:${id}`)))
      : undefined;
    const stock = typeof localId === "string" ? byId.get(stableUuid(`stock:${tenantId}:${localId}`)) : undefined;
    if (!publicId || !stock?.canonical_reference) return [];
    const publicationMode = stockMode === "quantity" ? "quantity" : stockMode === "hidden" ? "hidden" : "status";
    return [
      {
        tenant_id: tenantId,
        widget_id: widgetId,
        shop_id: shopId,
        service_public_id: publicId,
        canonical_reference: stock.canonical_reference,
        quality: stock.quality,
        source_shop_key: stock.source_shop_key || "shop-default",
        publication_mode: publicationMode,
        exact_quantity_enabled: publicationMode === "quantity",
        published: publicationMode !== "hidden",
      },
    ];
  });
  const removed = await admin
    .from("widget_stock_publications")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("widget_id", widgetId)
    .eq("shop_id", shopId);
  if (removed.error) {
    if (isMissingWidgetStockSchema(removed.error)) return;
    throw removed.error;
  }
  if (rows.length) {
    const inserted = await admin.from("widget_stock_publications").insert(rows);
    if (inserted.error) {
      if (isMissingWidgetStockSchema(inserted.error)) return;
      throw inserted.error;
    }
  }
}
