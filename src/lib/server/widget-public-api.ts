import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAdmin } from "@/lib/supabase/server";

type UUID = `${string}-${string}-${string}-${string}-${string}`;

export type WidgetRow = {
  id: UUID;
  tenant_id: UUID;
  shop_id: UUID | null;
  public_widget_id: string;
  internal_name: string;
  active: boolean;
  display_mode: "inline" | "modal" | "floating";
  published_config: Record<string, unknown> | null;
  published_version: number;
  published_at: string | null;
  allowed_domains: string[];
};

export type PublicWidgetContext = {
  admin: SupabaseClient;
  widget: WidgetRow;
  requestId: string;
  hostOrigin: string;
};

export type PublicService = {
  publicId: string;
  category: string;
  brand: string;
  model: string;
  issue: string;
  service: string;
  quality?: string;
  price?: {
    mode: "exact" | "from" | "range" | "request" | "hidden";
    amount?: number;
    min?: number;
    max?: number;
    currency?: string;
  };
  stock?: PublicStock;
  durationMinutes?: number;
  warranty?: string;
  shops?: string[];
};

export type PublicStock = {
  mode: "hidden" | "simple" | "delay" | "quantity";
  status?: string;
  label?: string;
  quantity?: number;
};

const PUBLIC_ERROR_MESSAGES: Record<string, string> = {
  bad_request: "Vérifiez les informations envoyées.",
  domain_forbidden: "Ce widget n’est pas disponible sur ce domaine.",
  invalid_token: "La session du widget a expiré. Rechargez la page.",
  not_found: "Widget indisponible.",
  disabled: "Ce widget est momentanément désactivé.",
  rate_limited: "Trop de tentatives. Réessayez dans quelques instants.",
  spam_rejected: "La demande n’a pas pu être envoyée.",
  slot_unavailable: "Ce créneau vient d’être réservé. Veuillez en choisir un autre.",
  service_unavailable: "Service temporairement indisponible. Réessayez ou contactez l’atelier.",
};

function valueObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function cleanString(value: unknown, max = 300): string {
  return typeof value === "string"
    ? [...value]
        .filter((character) => {
          const code = character.charCodeAt(0);
          return code > 31 && code !== 127;
        })
        .join("")
        .trim()
        .slice(0, max)
    : "";
}

function cleanNumber(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function normalizeHost(value: string): string {
  if (!value) return "";
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function isDomainAllowed(origin: string, allowedDomains: string[]): boolean {
  const host = normalizeHost(origin);
  if (!host) return false;
  return allowedDomains.some((entry) => {
    const trimmed = entry.trim().toLowerCase();
    const wildcard = trimmed.startsWith("*.");
    const allowed = normalizeHost(wildcard ? trimmed.slice(2) : trimmed);
    if (!allowed) return false;
    return wildcard ? host.endsWith(`.${allowed}`) && host !== allowed : host === allowed;
  });
}

function requestHostOrigin(request: Request): string {
  return (
    request.headers.get("x-behar-host-origin") || request.headers.get("origin") || request.headers.get("referer") || ""
  );
}

function tokenSecret() {
  return process.env.WIDGET_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "widget-development-secret";
}

type WidgetToken = { widget: string; host: string; version: number; exp: number; nonce: string };

export function createWidgetToken(widget: WidgetRow, hostOrigin: string): string {
  const payload: WidgetToken = {
    widget: widget.public_widget_id,
    host: normalizeHost(hostOrigin),
    version: widget.published_version,
    exp: Math.floor(Date.now() / 1000) + 15 * 60,
    nonce: randomUUID(),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", tokenSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyWidgetToken(token: string, widget: WidgetRow): WidgetToken | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", tokenSecret()).update(encoded).digest("base64url");
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as WidgetToken;
    if (
      payload.widget !== widget.public_widget_id ||
      payload.version !== widget.published_version ||
      payload.exp < Math.floor(Date.now() / 1000) ||
      !isDomainAllowed(payload.host, widget.allowed_domains)
    )
      return null;
    return payload;
  } catch {
    return null;
  }
}

function auditLog(level: "info" | "warn" | "error", event: string, details: Record<string, unknown>) {
  const payload = JSON.stringify({ at: new Date().toISOString(), component: "widget-public-api", event, ...details });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
}

export function publicError(code: string, status: number, requestId: string = randomUUID()) {
  return NextResponse.json(
    {
      error: { code, message: PUBLIC_ERROR_MESSAGES[code] || PUBLIC_ERROR_MESSAGES.service_unavailable },
      meta: { requestId },
    },
    { status, headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } },
  );
}

export function publicSuccess(context: PublicWidgetContext, data: unknown, init?: { status?: number; cache?: string }) {
  const headers: Record<string, string> = {
    "Cache-Control": init?.cache ?? "no-store",
    "X-Request-Id": context.requestId,
  };
  const origin = requestOriginForCors(context.hostOrigin);
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }
  return NextResponse.json(
    { data, meta: { requestId: context.requestId, widgetVersion: context.widget.published_version } },
    { status: init?.status ?? 200, headers },
  );
}

function requestOriginForCors(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

export async function resolvePublicWidget(
  request: Request,
  publicId: string,
  options: { requireToken?: boolean } = {},
): Promise<PublicWidgetContext | NextResponse> {
  const requestId = randomUUID();
  if (!/^wdg_[a-zA-Z0-9_-]{12,80}$/.test(publicId)) return publicError("not_found", 404, requestId);
  const admin = getSupabaseAdmin();
  if (!admin) return publicError("service_unavailable", 503, requestId);
  const { data, error } = await admin
    .from("widget_settings")
    .select(
      "id, tenant_id, shop_id, public_widget_id, internal_name, active, display_mode, published_config, published_version, published_at, allowed_domains",
    )
    .eq("public_widget_id", publicId)
    .maybeSingle<WidgetRow>();
  if (error) {
    auditLog("error", "widget_lookup_failed", { requestId, code: error.code });
    return publicError("service_unavailable", 503, requestId);
  }
  if (!data) return publicError("not_found", 404, requestId);
  if (!data.active || !data.published_config || data.published_version < 1)
    return publicError("disabled", 404, requestId);

  let hostOrigin = requestHostOrigin(request);
  if (options.requireToken) {
    const token = request.headers.get("x-widget-token") || "";
    const payload = verifyWidgetToken(token, data);
    if (!payload) return publicError("invalid_token", 401, requestId);
    hostOrigin = `https://${payload.host}`;
  }
  if (!isDomainAllowed(hostOrigin, data.allowed_domains)) {
    auditLog("warn", "domain_rejected", { requestId, widget: publicId, host: normalizeHost(hostOrigin) });
    return publicError("domain_forbidden", 403, requestId);
  }
  return { admin, widget: data, requestId, hostOrigin };
}

function requestFingerprint(request: Request, context: PublicWidgetContext) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const agent = request.headers.get("user-agent") || "unknown";
  return createHmac("sha256", process.env.WIDGET_RATE_LIMIT_SECRET || tokenSecret())
    .update(`${forwarded}|${agent}|${normalizeHost(context.hostOrigin)}`)
    .digest("hex");
}

export async function enforceRateLimit(
  request: Request,
  context: PublicWidgetContext,
  scope: string,
  limit: number,
  windowSeconds: number,
): Promise<NextResponse | null> {
  const { data, error } = await context.admin.rpc("consume_widget_rate_limit", {
    p_request_fingerprint: requestFingerprint(request, context),
    p_scope: `${context.widget.public_widget_id}:${scope}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    auditLog("error", "rate_limit_failed", { requestId: context.requestId, code: error.code, scope });
    return publicError("service_unavailable", 503, context.requestId);
  }
  if (data !== true) {
    auditLog("warn", "rate_limited", { requestId: context.requestId, scope });
    return publicError("rate_limited", 429, context.requestId);
  }
  return null;
}

export function publicServices(config: unknown): PublicService[] {
  const catalog = valueObject(config).catalog;
  if (!Array.isArray(catalog)) return [];
  return catalog.flatMap((entry): PublicService[] => {
    const item = valueObject(entry);
    const publicId = cleanString(item.publicId, 120);
    const category = cleanString(item.category, 60);
    const model = cleanString(item.model, 160);
    const issue = cleanString(item.issue, 180);
    const service = cleanString(item.service, 180);
    if (!publicId || !category || !model || !issue || !service) return [];
    const rawPrice = valueObject(item.price);
    const priceMode = cleanString(rawPrice.mode, 20);
    const price = ["exact", "from", "range", "request", "hidden"].includes(priceMode)
      ? {
          mode: priceMode as NonNullable<PublicService["price"]>["mode"],
          amount: cleanNumber(rawPrice.amount),
          min: cleanNumber(rawPrice.min),
          max: cleanNumber(rawPrice.max),
          currency: cleanString(rawPrice.currency, 8) || undefined,
        }
      : undefined;
    const rawStock = valueObject(item.stock);
    const stockMode = cleanString(rawStock.mode, 20);
    const stock = ["hidden", "simple", "delay", "quantity"].includes(stockMode)
      ? {
          mode: stockMode as "hidden" | "simple" | "delay" | "quantity",
          status: cleanString(rawStock.status, 50) || undefined,
          label: cleanString(rawStock.label, 120) || undefined,
          quantity: stockMode === "quantity" ? cleanNumber(rawStock.quantity) : undefined,
        }
      : undefined;
    const shops = Array.isArray(item.shops)
      ? [...new Set(item.shops.map((entry) => cleanString(entry, 100)).filter(Boolean))]
      : undefined;
    return [
      {
        publicId,
        category,
        brand: cleanString(item.brand, 100),
        model,
        issue,
        service,
        quality: cleanString(item.quality, 100) || undefined,
        price,
        stock,
        durationMinutes: cleanNumber(item.durationMinutes),
        warranty: cleanString(item.warranty, 120) || undefined,
        shops: shops?.length ? shops : undefined,
      },
    ];
  });
}

// Un service public est disponible pour la boutique demandée si aucune
// restriction n'est publiée, ou si la boutique figure dans sa liste blanche.
export function serviceAvailableInShop(service: PublicService, shopPublicId?: string): boolean {
  if (!service.shops || service.shops.length === 0) return true;
  if (!shopPublicId) return true;
  return service.shops.includes(shopPublicId);
}

export type DisplayedSnapshot = {
  amount: number | null;
  type: NonNullable<PublicService["price"]>["mode"];
  currency: string | null;
  min: number | null;
  max: number | null;
  quality: string | null;
  durationMinutes: number | null;
  warranty: string | null;
  stock: PublicService["stock"] | null;
  capturedAt: string;
  widgetVersion: number;
};

export type DisplayedStockSnapshot = PublicStock & {
  capturedAt: string;
  widgetVersion: number;
};

// Instantané immuable du prix (et de l'offre) AFFICHÉ au client, recalculé côté
// serveur depuis la publication active. Copié tel quel dans la demande : il reste
// attaché même si le réparateur modifie ensuite son catalogue. Contient montant,
// type de prix, qualité, durée, garantie, date et version publiée du widget.
export function displayedSnapshot(
  service: PublicService | undefined,
  widget: WidgetRow,
  capturedAt: string = new Date().toISOString(),
): DisplayedSnapshot | null {
  if (!service) return null;
  const price = service.price;
  return {
    amount: price?.amount ?? price?.min ?? null,
    type: price?.mode ?? "request",
    currency: price?.currency ?? null,
    min: price?.min ?? null,
    max: price?.max ?? null,
    quality: service.quality ?? null,
    durationMinutes: service.durationMinutes ?? null,
    warranty: service.warranty ?? null,
    stock: service.stock ?? null,
    capturedAt,
    widgetVersion: widget.published_version,
  };
}

export function displayedStockSnapshot(
  service: PublicService | undefined,
  widget: WidgetRow,
  capturedAt: string = new Date().toISOString(),
): DisplayedStockSnapshot | null {
  if (!service?.stock) return null;
  return { ...service.stock, capturedAt, widgetVersion: widget.published_version };
}

function sanitizeLivePublicStock(value: unknown): PublicStock {
  const source = valueObject(value);
  const mode = cleanString(source.mode, 20);
  if (!(["hidden", "simple", "delay", "quantity"] as const).includes(mode as PublicStock["mode"])) {
    return { mode: "hidden" };
  }
  const stock: PublicStock = {
    mode: mode as PublicStock["mode"],
    status: cleanString(source.status, 30) || undefined,
    label: cleanString(source.label, 160) || undefined,
  };
  if (stock.mode === "quantity") stock.quantity = Math.max(0, cleanNumber(source.quantity) ?? 0);
  return stock;
}

export async function resolveLivePublicStock(
  context: PublicWidgetContext,
  servicePublicId: string,
  shopId: string,
): Promise<PublicStock> {
  const { data, error } = await context.admin.rpc("widget_public_stock_availability", {
    p_tenant_id: context.widget.tenant_id,
    p_widget_id: context.widget.id,
    p_shop_id: shopId,
    p_service_public_id: servicePublicId,
  });
  if (error) {
    auditLog("error", "public_stock_lookup_failed", {
      requestId: context.requestId,
      widget: context.widget.public_widget_id,
      code: error.code,
    });
    return { mode: "hidden" };
  }
  return sanitizeLivePublicStock(data);
}

export async function serviceWithLivePublicStock(
  context: PublicWidgetContext,
  service: PublicService,
  shopId?: string,
): Promise<PublicService> {
  if (!shopId) return { ...service, stock: { mode: "hidden" } };
  return { ...service, stock: await resolveLivePublicStock(context, service.publicId, shopId) };
}

export function sanitizePublicConfig(widget: WidgetRow) {
  const config = valueObject(widget.published_config);
  const rawGeneral = valueObject(config.general);
  const general = Object.fromEntries(
    ["commercialName", "phone", "address", "locale", "currency", "privacyUrl"]
      .map((key) => [key, cleanString(rawGeneral[key], key === "address" ? 300 : 180)])
      .filter(([, value]) => value),
  );
  const rawVisual = valueObject(config.visual);
  const visual = {
    primaryColor: cleanString(rawVisual.primaryColor, 30) || undefined,
    buttonColor: cleanString(rawVisual.buttonColor, 30) || undefined,
    buttonTextColor: cleanString(rawVisual.buttonTextColor, 30) || undefined,
    textColor: cleanString(rawVisual.textColor, 30) || undefined,
    backgroundColor: cleanString(rawVisual.backgroundColor, 30) || undefined,
    radius: cleanNumber(rawVisual.radius),
    logoUrl: cleanString(rawVisual.logoUrl, 1000) || undefined,
    position: cleanString(rawVisual.position, 40) || undefined,
    backgroundStyle: cleanString(rawVisual.backgroundStyle, 20) || undefined,
    buttonStyle: cleanString(rawVisual.buttonStyle, 20) || undefined,
    headingSize: cleanString(rawVisual.headingSize, 20) || undefined,
    textSize: cleanString(rawVisual.textSize, 20) || undefined,
    contentWidth: cleanString(rawVisual.contentWidth, 20) || undefined,
  };
  const rawTexts = valueObject(config.texts);
  const texts = Object.fromEntries(
    [
      "title",
      "introduction",
      "deviceTitle",
      "issueTitle",
      "resultTitle",
      "contactTitle",
      "bookingTitle",
      "firstNameLabel",
      "lastNameLabel",
      "phoneLabel",
      "emailLabel",
      "contactPreferenceLabel",
      "commentLabel",
      "requestTypeLabel",
      "photoLabel",
      "consentLabel",
      "submitLabel",
      "callbackLabel",
      "quoteLabel",
      "bookingLabel",
    ]
      .map((key) => [key, cleanString(rawTexts[key], 500)])
      .filter(([, value]) => value),
  );
  const rawFeatures = valueObject(config.features);
  const features = Object.fromEntries(
    [
      "deviceSearch",
      "priceEstimate",
      "stockAvailability",
      "duration",
      "quoteRequest",
      "callbackRequest",
      "booking",
      "walkIn",
      "homeService",
      "shopChoice",
      "qualityChoice",
      "multiIssue",
      "comment",
      "photos",
      "warranty",
      "payments",
    ]
      .filter((key) => typeof rawFeatures[key] === "boolean")
      .map((key) => [key, rawFeatures[key]]),
  );
  const rawBooking = valueObject(config.booking);
  const rawLayout = valueObject(config.layout);
  const rawIcons = valueObject(config.icons);
  const allowedBlocks = ["header", "progress", "content", "actions"];
  const allowedFields = ["identity", "contact", "preference", "comment", "photos", "request", "booking", "consent"];
  const ordered = (value: unknown, allowed: string[]) => {
    if (!Array.isArray(value)) return undefined;
    const result = value
      .map(String)
      .filter((entry, index, list) => allowed.includes(entry) && list.indexOf(entry) === index);
    return result.length === allowed.length ? result : undefined;
  };
  const layout = {
    blockOrder: ordered(rawLayout.blockOrder, allowedBlocks),
    hiddenBlocks: Array.isArray(rawLayout.hiddenBlocks)
      ? rawLayout.hiddenBlocks
          .map(String)
          .filter((entry) => allowedBlocks.includes(entry) && !["content", "actions"].includes(entry))
      : undefined,
    fieldOrder: ordered(rawLayout.fieldOrder, allowedFields),
    hiddenFields: Array.isArray(rawLayout.hiddenFields)
      ? rawLayout.hiddenFields
          .map(String)
          .filter((entry) => allowedFields.includes(entry) && !["contact", "consent"].includes(entry))
      : undefined,
    columns: rawLayout.columns === 2 ? 2 : 1,
    alignment: ["left", "center", "right"].includes(String(rawLayout.alignment)) ? rawLayout.alignment : "left",
    template: ["classic", "compact", "showcase"].includes(String(rawLayout.template)) ? rawLayout.template : "classic",
  };
  const iconTargets = [
    "phone",
    "tablet",
    "computer",
    "console",
    "battery",
    "screen",
    "charging",
    "appointment",
    "confirmation",
  ];
  const icons = Object.fromEntries(
    iconTargets.map((target) => {
      const raw = valueObject(rawIcons[target]);
      const mode = ["library", "custom"].includes(String(raw.mode)) ? String(raw.mode) : "none";
      return [
        target,
        {
          mode,
          libraryIcon: mode === "library" ? cleanString(raw.libraryIcon, 40) || undefined : undefined,
          assetUrl: mode === "custom" ? cleanString(raw.assetUrl, 1000) || undefined : undefined,
          size: Math.min(64, Math.max(12, cleanNumber(raw.size) ?? 24)),
          alt: cleanString(raw.alt, 100) || undefined,
        },
      ];
    }),
  ) as Record<string, unknown>;
  icons.poweredBy = rawIcons.poweredBy === true;
  const booking = {
    timezone: cleanString(rawBooking.timezone, 80) || undefined,
    days: Array.isArray(rawBooking.days)
      ? rawBooking.days.map(Number).filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
      : undefined,
    start: cleanString(rawBooking.start, 5) || undefined,
    end: cleanString(rawBooking.end, 5) || undefined,
    intervalMinutes: cleanNumber(rawBooking.intervalMinutes),
    durationMinutes: cleanNumber(rawBooking.durationMinutes),
    capacity: cleanNumber(rawBooking.capacity),
    minimumNoticeMinutes: cleanNumber(rawBooking.minimumNoticeMinutes),
  };
  const rawPolicy = valueObject(config.catalogPolicy);
  // Défaut PERMISSIF (le catalogue global capte la demande, la config enrichit).
  const catalogPolicy = {
    allowOutOfCatalog: rawPolicy.allowOutOfCatalog !== false,
    allowUnconfiguredModels: rawPolicy.allowUnconfiguredModels !== false,
    allowUnconfiguredIssues: rawPolicy.allowUnconfiguredIssues !== false,
    allowOutOfCatalogAppointments: rawPolicy.allowOutOfCatalogAppointments !== false,
    fallbackMode: ["quote", "callback", "manual"].includes(String(rawPolicy.fallbackMode))
      ? (rawPolicy.fallbackMode as "quote" | "callback" | "manual")
      : "quote",
  };
  const rawOffers = valueObject(config.offers);
  const allowedOfferModes = ["image", "icon", "image_icon", "text", "badge", "price", "informative"];
  const allowedBehaviors = ["selectable", "automatic", "informative", "validation", "link", "hidden"];
  const offers = {
    enabled: rawOffers.enabled === true,
    title: cleanString(rawOffers.title, 160) || undefined,
    subtitle: cleanString(rawOffers.subtitle, 240) || undefined,
    introduction: cleanString(rawOffers.introduction, 500) || undefined,
    layout: rawOffers.layout === "grid" ? "grid" : "list",
    columns: [1, 2, 3].includes(Number(rawOffers.columns)) ? Number(rawOffers.columns) : 1,
    offers: (Array.isArray(rawOffers.offers) ? rawOffers.offers : [])
      .map(valueObject)
      .filter((offer) => offer.isPublished === true && offer.behavior !== "hidden")
      .slice(0, 40)
      .map((offer, index) => ({
        id: cleanString(offer.id, 80),
        title: cleanString(offer.title, 160),
        subtitle: cleanString(offer.subtitle, 200) || undefined,
        description: cleanString(offer.description, 500) || undefined,
        fullDescription: cleanString(offer.fullDescription, 2000) || undefined,
        displayMode: allowedOfferModes.includes(String(offer.displayMode)) ? String(offer.displayMode) : "text",
        behavior: allowedBehaviors.includes(String(offer.behavior)) ? String(offer.behavior) : "informative",
        imageUrl: cleanString(offer.imageUrl, 1000) || undefined,
        imageAlt: cleanString(offer.imageAlt, 180) || undefined,
        imagePosition: ["cover", "contain", "left", "top"].includes(String(offer.imagePosition))
          ? String(offer.imagePosition)
          : "cover",
        hideImageOnMobile: offer.hideImageOnMobile === true,
        iconName: cleanString(offer.iconName, 60) || undefined,
        iconUrl: cleanString(offer.iconUrl, 1000) || undefined,
        iconColor: cleanString(offer.iconColor, 30) || undefined,
        iconBackground: cleanString(offer.iconBackground, 30) || undefined,
        badgeText: cleanString(offer.badgeText, 100) || undefined,
        originalPrice: cleanNumber(offer.originalPrice),
        promotionalPrice: cleanNumber(offer.promotionalPrice),
        fixedDiscount: cleanNumber(offer.fixedDiscount),
        percentageDiscount: cleanNumber(offer.percentageDiscount),
        conditionText: cleanString(offer.conditionText, 500) || undefined,
        validationRequired: offer.validationRequired === true,
        isPublished: true,
        displayOrder: cleanNumber(offer.displayOrder) ?? index,
        layoutSize: ["compact", "standard", "featured", "banner"].includes(String(offer.layoutSize))
          ? String(offer.layoutSize)
          : "standard",
        startDate: cleanString(offer.startDate, 10) || undefined,
        endDate: cleanString(offer.endDate, 10) || undefined,
        usageLimit: cleanNumber(offer.usageLimit),
        appointmentOnly: offer.appointmentOnly === true,
        desktopVisible: offer.desktopVisible !== false,
        mobileVisible: offer.mobileVisible !== false,
        externalUrl: cleanString(offer.externalUrl, 1000) || undefined,
      }))
      .filter((offer) => offer.id && offer.title)
      .sort((a, b) => a.displayOrder - b.displayOrder),
  };
  return {
    id: widget.public_widget_id,
    active: true,
    displayMode: widget.display_mode,
    general,
    visual,
    texts,
    features,
    catalogPolicy,
    layout,
    icons,
    booking,
    offers,
    publishedAt: widget.published_at,
  };
}

export async function resolveShop(context: PublicWidgetContext, publicShopId?: string) {
  let query = context.admin
    .from("shops")
    .select("id, public_shop_id, internal_name, commercial_name, address_config, schedule_config, timezone")
    .eq("tenant_id", context.widget.tenant_id)
    .eq("active", true);
  if (context.widget.shop_id) query = query.eq("id", context.widget.shop_id);
  else if (publicShopId) query = query.eq("public_shop_id", publicShopId);
  else return null;
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return data;
}

export function publicShopDto(shop: Record<string, unknown>) {
  const rawAddress = valueObject(shop.address_config);
  return {
    id: cleanString(shop.public_shop_id, 100),
    name: cleanString(shop.commercial_name || shop.internal_name, 160),
    address: {
      address: cleanString(rawAddress.address, 250),
      postalCode: cleanString(rawAddress.postalCode, 30),
      city: cleanString(rawAddress.city, 100),
      country: cleanString(rawAddress.country, 100),
    },
    timezone: cleanString(shop.timezone, 80),
  };
}

export function normalizePhone(value: string): string {
  const compact = value.replace(/[^+\d]/g, "");
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("0")) return `+33${compact.slice(1)}`;
  return compact ? `+${compact}` : "";
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function logPublicMutation(context: PublicWidgetContext, event: string, details: Record<string, unknown> = {}) {
  auditLog("info", event, { requestId: context.requestId, widget: context.widget.public_widget_id, ...details });
}

export function safeFileName(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100) || "photo"
  );
}

export function opaqueTenantFolder(tenantId: string) {
  return createHash("sha256").update(`${tenantId}:${tokenSecret()}`).digest("hex").slice(0, 24);
}
