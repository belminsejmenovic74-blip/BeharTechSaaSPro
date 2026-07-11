import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  appointmentInputSchema,
  catalogQuerySchema,
  eventInputSchema,
  leadInputSchema,
  quoteInputSchema,
  slotsQuerySchema,
  uploadInputSchema,
  type AppointmentInput,
  type LeadInput,
} from "@/lib/widget/public-contracts";
import {
  createWidgetToken,
  displayedSnapshot,
  displayedStockSnapshot,
  enforceRateLimit,
  logPublicMutation,
  normalizeEmail,
  normalizePhone,
  opaqueTenantFolder,
  publicError,
  publicServices,
  publicShopDto,
  publicSuccess,
  resolvePublicWidget,
  resolveShop,
  safeFileName,
  sanitizePublicConfig,
  serviceAvailableInShop,
  serviceWithLivePublicStock,
  type PublicService,
  type PublicWidgetContext,
} from "@/lib/server/widget-public-api";

type RouteParams = { params: Promise<{ publicId: string }> };

async function contextFor(request: Request, route: RouteParams, requireToken = true) {
  const { publicId } = await route.params;
  return resolvePublicWidget(request, publicId, { requireToken });
}

function isResponse(value: PublicWidgetContext | NextResponse): value is NextResponse {
  return value instanceof Response;
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function idempotencyKey(request: Request) {
  const key = request.headers.get("idempotency-key")?.trim() || "";
  return /^[a-zA-Z0-9._:-]{12,160}$/.test(key) ? key : "";
}

function same(left: string, right?: string) {
  return !right || left.toLocaleLowerCase("fr") === right.toLocaleLowerCase("fr");
}

function filteredServices(context: PublicWidgetContext, request: Request) {
  const values = catalogQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return publicServices(context.widget.published_config).filter(
    (service) =>
      serviceAvailableInShop(service, values.shop) &&
      same(service.category, values.category) &&
      same(service.brand, values.brand) &&
      same(service.model, values.model) &&
      same(service.issue, values.issue),
  );
}

// Préserve l'ordre de la projection (classement logique / populaires d'abord),
// en dédoublonnant sur la première occurrence plutôt qu'en triant par alphabet.
function unique(values: string[]) {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const value of values) {
    if (value && !seen.has(value)) {
      seen.add(value);
      ordered.push(value);
    }
  }
  return ordered;
}

async function eventBestEffort(
  context: PublicWidgetContext,
  name: string,
  data: Record<string, unknown>,
  shopId?: string | null,
  sessionId = `server_${randomUUID().replace(/-/g, "")}`,
) {
  await context.admin.from("widget_events").insert({
    tenant_id: context.widget.tenant_id,
    shop_id: shopId ?? null,
    widget_id: context.widget.id,
    widget_version: context.widget.published_version,
    anonymous_session_id: sessionId,
    event_name: name,
    event_payload: data,
  });
}

export async function handleConfig(request: Request, route: RouteParams) {
  const context = await contextFor(request, route, false);
  if (isResponse(context)) return context;
  const limited = await enforceRateLimit(request, context, "config", 120, 60);
  if (limited) return limited;
  const { data: shops, error } = await context.admin
    .from("shops")
    .select("id, public_shop_id, internal_name, commercial_name, address_config, timezone")
    .eq("tenant_id", context.widget.tenant_id)
    .eq("active", true)
    .order("internal_name");
  if (error) return publicError("service_unavailable", 503, context.requestId);
  const allowedShops = context.widget.shop_id
    ? (shops || []).filter((shop) => shop.id === context.widget.shop_id)
    : shops || [];
  return publicSuccess(
    context,
    {
      ...sanitizePublicConfig(context.widget),
      shops: allowedShops.map((shop) => publicShopDto(shop)),
      sessionToken: createWidgetToken(context.widget, context.hostOrigin),
    },
    { cache: "private, no-store" },
  );
}

export async function handleCatalog(
  request: Request,
  route: RouteParams,
  kind: "categories" | "brands" | "models" | "issues" | "services",
) {
  const context = await contextFor(request, route);
  if (isResponse(context)) return context;
  const limited = await enforceRateLimit(request, context, `catalog:${kind}`, 180, 60);
  if (limited) return limited;
  try {
    const values = catalogQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const services = filteredServices(context, request);
    const shop = kind === "services" ? await resolveShop(context, values.shop) : null;
    if (kind === "services" && values.shop && !shop) return publicError("bad_request", 400, context.requestId);
    const data =
      kind === "services"
        ? await Promise.all(services.map((service) => serviceWithLivePublicStock(context, service, shop?.id)))
        : unique(
            services.map(
              (service) =>
                service[kind === "categories" ? "category" : (kind.slice(0, -1) as "brand" | "model" | "issue")],
            ),
          );
    return publicSuccess(
      context,
      { [kind]: data },
      { cache: kind === "services" ? "private, no-store" : "public, max-age=60, stale-while-revalidate=300" },
    );
  } catch (error) {
    return publicError(
      error instanceof z.ZodError ? "bad_request" : "service_unavailable",
      error instanceof z.ZodError ? 400 : 503,
      context.requestId,
    );
  }
}

export async function handleQuote(request: Request, route: RouteParams) {
  const context = await contextFor(request, route);
  if (isResponse(context)) return context;
  const limited = await enforceRateLimit(request, context, "quote", 40, 60);
  if (limited) return limited;
  const parsed = quoteInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return publicError("bad_request", 400, context.requestId);
  const shop = await resolveShop(context, parsed.data.shopPublicId);
  if (!shop) return publicError("bad_request", 400, context.requestId);
  const publishedService = publicServices(context.widget.published_config).find(
    (entry) => entry.publicId === parsed.data.servicePublicId,
  );
  if (!publishedService || !serviceAvailableInShop(publishedService, parsed.data.shopPublicId))
    return publicError("not_found", 404, context.requestId);
  const service = await serviceWithLivePublicStock(context, publishedService, shop.id);
  await eventBestEffort(
    context,
    service.price?.mode === "hidden" || service.price?.mode === "request" ? "price_unavailable" : "price_displayed",
    { servicePublicId: service.publicId },
    shop.id,
  );
  return publicSuccess(context, {
    service: { publicId: service.publicId, label: service.service, quality: service.quality },
    price: service.price,
    stock: service.stock,
    durationMinutes: service.durationMinutes,
    warranty: service.warranty,
    shop: publicShopDto(shop),
  });
}

export async function handleSlots(request: Request, route: RouteParams) {
  const context = await contextFor(request, route);
  if (isResponse(context)) return context;
  const limited = await enforceRateLimit(request, context, "slots", 90, 60);
  if (limited) return limited;
  const parsed = slotsQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return publicError("bad_request", 400, context.requestId);
  const shop = await resolveShop(context, parsed.data.shop);
  if (!shop) return publicError("bad_request", 400, context.requestId);
  const service = parsed.data.servicePublicId
    ? publicServices(context.widget.published_config).find((entry) => entry.publicId === parsed.data.servicePublicId)
    : undefined;
  if (parsed.data.servicePublicId && !service) return publicError("not_found", 404, context.requestId);
  const from = parsed.data.from || new Date().toISOString().slice(0, 10);
  const { data, error } = await context.admin.rpc("widget_available_slots", {
    p_widget_id: context.widget.id,
    p_shop_id: shop.id,
    p_from: from,
    p_days: parsed.data.days,
    p_duration_minutes: service?.durationMinutes || null,
  });
  if (error) return publicError("service_unavailable", 503, context.requestId);
  const slots = (data || []).map((slot: { slot_date: string; slot_time: string; duration_minutes: number }) => ({
    date: slot.slot_date,
    time: slot.slot_time,
    durationMinutes: slot.duration_minutes,
  }));
  return publicSuccess(context, { shop: publicShopDto(shop), slots }, { cache: "private, max-age=5" });
}

async function findOrCreateCustomer(context: PublicWidgetContext, input: LeadInput | AppointmentInput) {
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);
  if (phone) {
    const result = await context.admin
      .from("clients")
      .select("id, full_name, phone, email")
      .eq("workshop_id", context.widget.tenant_id)
      .eq("phone_normalized", phone)
      .limit(2);
    if (result.error) throw result.error;
    if (result.data?.length) {
      return { id: result.data[0].id as string, phone, email, ambiguous: result.data.length > 1 };
    }
  }
  if (email) {
    const result = await context.admin
      .from("clients")
      .select("id, full_name, phone, email")
      .eq("workshop_id", context.widget.tenant_id)
      .eq("email_normalized", email)
      .limit(2);
    if (result.error) throw result.error;
    if (result.data?.length) {
      return { id: result.data[0].id as string, phone, email, ambiguous: result.data.length > 1 };
    }
  }
  const fullName = `${input.firstName} ${input.lastName}`.trim() || "Client widget";
  const { data, error } = await context.admin
    .from("clients")
    .insert({
      workshop_id: context.widget.tenant_id,
      full_name: fullName,
      phone: input.phone || null,
      email: email || null,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("customer_create_failed");
  return { id: data.id as string, phone, email, ambiguous: false };
}

async function serviceForInput(
  context: PublicWidgetContext,
  servicePublicId: string | undefined,
  shopId: string,
): Promise<PublicService | undefined> {
  const service = servicePublicId
    ? publicServices(context.widget.published_config).find((entry) => entry.publicId === servicePublicId)
    : undefined;
  return service ? serviceWithLivePublicStock(context, service, shopId) : undefined;
}

function photosAreOwned(context: PublicWidgetContext, photos: string[]) {
  const prefix = `w/${opaqueTenantFolder(context.widget.tenant_id)}/${context.widget.public_widget_id}/`;
  return photos.every((photo) => photo.startsWith(prefix) && !photo.includes(".."));
}

async function sendAppointmentConfirmationSms(input: { phone: string; shopName: string; date: string; time: string }) {
  const username = process.env.CLICKSEND_USERNAME;
  const apiKey = process.env.CLICKSEND_API_KEY;
  if (!input.phone || !username || !apiKey) return false;
  try {
    const auth = Buffer.from(`${username}:${apiKey}`).toString("base64");
    const response = await fetch("https://rest.clicksend.com/v3/sms/send", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            source: "BeharTech",
            to: input.phone,
            body: `Rendez-vous confirmé chez ${input.shopName} le ${input.date} à ${input.time}.`,
          },
        ],
      }),
    });
    const payload = (await response.json().catch(() => null)) as { http_code?: number } | null;
    return response.ok && payload?.http_code === 200;
  } catch {
    return false;
  }
}

async function existingSubmission(context: PublicWidgetContext, key: string) {
  const { data } = await context.admin
    .from("widget_leads")
    .select("id, status, appointment_id")
    .eq("widget_id", context.widget.id)
    .eq("idempotency_key", key)
    .maybeSingle();
  return data;
}

function publicReference(id: string | undefined): string | undefined {
  if (!id) return undefined;
  const day = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  return `BT-${day}-${id.replaceAll("-", "").slice(-6).toUpperCase()}`;
}

function leadRow(
  context: PublicWidgetContext,
  shopId: string,
  input: LeadInput | AppointmentInput,
  customer: { id: string | null; phone: string; email: string },
  key: string,
  service?: PublicService,
) {
  const capturedAt = new Date().toISOString();
  const { website: _honeypot, startedAt: _startedAt, ...submissionPayload } = input;
  return {
    tenant_id: context.widget.tenant_id,
    shop_id: shopId,
    widget_id: context.widget.id,
    widget_version: context.widget.published_version,
    customer_id: customer.id,
    lead_type: input.type,
    first_name: input.firstName || null,
    last_name: input.lastName || null,
    phone: input.phone || null,
    phone_normalized: customer.phone || null,
    email: input.email || null,
    email_normalized: customer.email || null,
    device_category: input.deviceCategory,
    brand: input.brand || null,
    model: input.model,
    issue: input.issue,
    issue_description: input.issueDescription || null,
    service_label: service?.service || null,
    quality_label: input.quality || service?.quality || null,
    displayed_price: service?.price?.amount ?? service?.price?.min ?? null,
    displayed_price_snapshot: displayedSnapshot(service, context.widget, capturedAt),
    displayed_stock: service?.stock?.label || service?.stock?.status || null,
    displayed_stock_snapshot: displayedStockSnapshot(service, context.widget, capturedAt),
    displayed_duration_minutes: service?.durationMinutes || null,
    displayed_warranty: service?.warranty || null,
    comment: input.comment || null,
    photos: input.photos,
    tags: input.tags?.length ? input.tags : [],
    contact_preference: input.contactPreference || null,
    requested_callback_at: input.requestedCallbackAt || null,
    source_url: input.sourceUrl || null,
    status: "new",
    consent: input.consent,
    idempotency_key: key,
    submission_payload: submissionPayload,
  };
}

export async function handleLead(request: Request, route: RouteParams) {
  const context = await contextFor(request, route);
  if (isResponse(context)) return context;
  const limited = await enforceRateLimit(request, context, "leads", 8, 10 * 60);
  if (limited) return limited;
  const key = idempotencyKey(request);
  if (!key) return publicError("bad_request", 400, context.requestId);
  const prior = await existingSubmission(context, key);
  if (prior)
    return publicSuccess(context, {
      accepted: true,
      duplicate: true,
      status: prior.status,
      reference: publicReference(prior.id),
    });
  const parsed = leadInputSchema.safeParse(await readJson(request));
  if (!parsed.success)
    return publicError(
      parsed.error.issues.some((issue) => issue.path.includes("website")) ? "spam_rejected" : "bad_request",
      400,
      context.requestId,
    );
  if (!photosAreOwned(context, parsed.data.photos)) return publicError("bad_request", 400, context.requestId);
  const shop = await resolveShop(context, parsed.data.shopPublicId);
  if (!shop) return publicError("bad_request", 400, context.requestId);
  try {
    const service = await serviceForInput(context, parsed.data.servicePublicId, shop.id);
    const customer = await findOrCreateCustomer(context, parsed.data);
    const inserted = await context.admin
      .from("widget_leads")
      .insert(leadRow(context, shop.id, parsed.data, customer, key, service))
      .select("id")
      .single();
    if (inserted.error) {
      const duplicate = inserted.error.code === "23505" ? await existingSubmission(context, key) : null;
      if (!duplicate) throw inserted.error;
      return publicSuccess(context, {
        accepted: true,
        duplicate: true,
        status: duplicate.status,
        reference: publicReference(duplicate.id),
      });
    }
    await eventBestEffort(context, "lead_submitted", { type: parsed.data.type }, shop.id);
    logPublicMutation(context, "lead_created", { type: parsed.data.type, ambiguousCustomer: customer.ambiguous });
    return publicSuccess(
      context,
      { accepted: true, duplicate: false, status: "new", reference: publicReference(inserted.data?.id) },
      { status: 201 },
    );
  } catch {
    return publicError("service_unavailable", 503, context.requestId);
  }
}

export async function handleAppointment(request: Request, route: RouteParams) {
  const context = await contextFor(request, route);
  if (isResponse(context)) return context;
  const limited = await enforceRateLimit(request, context, "appointments", 5, 10 * 60);
  if (limited) return limited;
  const key = idempotencyKey(request);
  if (!key) return publicError("bad_request", 400, context.requestId);
  const prior = await existingSubmission(context, key);
  if (prior) {
    if (!prior.appointment_id) return publicError("service_unavailable", 503, context.requestId);
    return publicSuccess(context, {
      accepted: true,
      duplicate: true,
      status: prior.status,
      reference: publicReference(prior.id),
    });
  }
  const parsed = appointmentInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return publicError("bad_request", 400, context.requestId);
  if (!photosAreOwned(context, parsed.data.photos)) return publicError("bad_request", 400, context.requestId);
  const shop = await resolveShop(context, parsed.data.shopPublicId);
  if (!shop) return publicError("bad_request", 400, context.requestId);
  try {
    const service = await serviceForInput(context, parsed.data.servicePublicId, shop.id);
    const customer = await findOrCreateCustomer(context, parsed.data);
    const leadInsert = await context.admin
      .from("widget_leads")
      .insert(leadRow(context, shop.id, parsed.data, customer, key, service))
      .select("id")
      .single();
    if (leadInsert.error || !leadInsert.data) {
      const duplicate = leadInsert.error?.code === "23505" ? await existingSubmission(context, key) : null;
      if (duplicate) return publicSuccess(context, { accepted: true, duplicate: true, status: duplicate.status });
      throw leadInsert.error;
    }
    const duration =
      service?.durationMinutes || Number(sanitizePublicConfig(context.widget).booking?.durationMinutes) || 30;
    const appointment = await context.admin.rpc("reserve_widget_appointment", {
      p_widget_id: context.widget.id,
      p_shop_id: shop.id,
      p_lead_id: leadInsert.data.id,
      p_customer_id: customer.id,
      p_date: parsed.data.date,
      p_time: parsed.data.time,
      p_duration_minutes: duration,
      p_idempotency_key: key,
      p_appointment: {
        clientName: `${parsed.data.firstName} ${parsed.data.lastName}`.trim(),
        clientPhone: parsed.data.phone,
        clientEmail: parsed.data.email,
        deviceType: parsed.data.deviceCategory,
        deviceBrand: parsed.data.brand,
        deviceModel: parsed.data.model,
        issueDescription: parsed.data.issueDescription || parsed.data.issue,
        interventionLabel: service?.service || parsed.data.issue,
        customerPrice: service?.price?.amount ?? service?.price?.min ?? null,
        priceStatus: service?.price && !["hidden", "request"].includes(service.price.mode) ? "confirmed" : "to_confirm",
        priceSnapshot: displayedSnapshot(service, context.widget),
        notes: parsed.data.comment,
        stockConfirmationRequired: !service?.stock || service.stock.mode === "hidden",
        priceConfirmationRequired: !service?.price || ["hidden", "request"].includes(service.price.mode),
        destinationMasked: parsed.data.email
          ? parsed.data.email.replace(/^(.{2}).*(@.*)$/, "$1***$2")
          : parsed.data.phone.replace(/.(?=.{4})/g, "•"),
        preIntakeSnapshot: {
          deviceCategory: parsed.data.deviceCategory,
          brand: parsed.data.brand,
          model: parsed.data.model,
          issue: parsed.data.issue,
          issueDescription: parsed.data.issueDescription,
          photos: parsed.data.photos,
          sourceUrl: parsed.data.sourceUrl,
          consent: parsed.data.consent,
        },
      },
    });
    if (appointment.error) throw appointment.error;
    const reservation = appointment.data as {
      accepted?: boolean;
      duplicate?: boolean;
      reason?: string;
      status?: string;
      date?: string;
      time?: string;
      durationMinutes?: number;
      appointmentId?: string;
    };
    if (!reservation.accepted) {
      await context.admin.from("widget_leads").delete().eq("id", leadInsert.data.id);
      return publicError("slot_unavailable", 409, context.requestId);
    }
    if (!reservation.duplicate && reservation.appointmentId && parsed.data.phone) {
      const confirmationSent = await sendAppointmentConfirmationSms({
        phone: parsed.data.phone,
        shopName: String(shop.commercial_name || shop.internal_name || "l’atelier"),
        date: reservation.date || parsed.data.date,
        time: reservation.time || parsed.data.time,
      });
      await context.admin
        .from("widget_appointment_confirmations")
        .update({
          status: confirmationSent ? "sent" : "queued",
          sent_at: confirmationSent ? new Date().toISOString() : null,
        })
        .eq("tenant_id", context.widget.tenant_id)
        .eq("appointment_id", reservation.appointmentId);
    }
    await eventBestEffort(context, "appointment_created", {}, shop.id);
    logPublicMutation(context, "appointment_created", { date: parsed.data.date, time: parsed.data.time });
    return publicSuccess(
      context,
      {
        accepted: true,
        duplicate: reservation.duplicate || false,
        status: reservation.status || "confirmed",
        date: reservation.date || parsed.data.date,
        time: reservation.time || parsed.data.time,
        durationMinutes: reservation.durationMinutes || duration,
        confirmation: "Votre rendez-vous est confirmé.",
        reference: publicReference(leadInsert.data.id),
      },
      { status: 201 },
    );
  } catch {
    const existing = await existingSubmission(context, key);
    if (existing && !existing.appointment_id) {
      await context.admin
        .from("widget_leads")
        .update({ status: "to_contact" })
        .eq("widget_id", context.widget.id)
        .eq("idempotency_key", key);
    }
    return publicError("service_unavailable", 503, context.requestId);
  }
}

export async function handleUpload(request: Request, route: RouteParams) {
  const context = await contextFor(request, route);
  if (isResponse(context)) return context;
  const limited = await enforceRateLimit(request, context, "uploads", 12, 10 * 60);
  if (limited) return limited;
  const parsed = uploadInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return publicError("bad_request", 400, context.requestId);
  const path = `w/${opaqueTenantFolder(context.widget.tenant_id)}/${context.widget.public_widget_id}/${parsed.data.sessionId}/${randomUUID()}-${safeFileName(parsed.data.fileName)}`;
  const { data, error } = await context.admin.storage.from("widget-uploads").createSignedUploadUrl(path);
  if (error || !data) return publicError("service_unavailable", 503, context.requestId);
  logPublicMutation(context, "upload_signed", { contentType: parsed.data.contentType, size: parsed.data.size });
  return publicSuccess(context, { path, token: data.token, signedUrl: data.signedUrl });
}

export async function handleEvent(request: Request, route: RouteParams) {
  const context = await contextFor(request, route);
  if (isResponse(context)) return context;
  const limited = await enforceRateLimit(request, context, "events", 120, 60);
  if (limited) return limited;
  const parsed = eventInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return publicError("bad_request", 400, context.requestId);
  const shop = parsed.data.shopPublicId ? await resolveShop(context, parsed.data.shopPublicId) : null;
  if (parsed.data.shopPublicId && !shop) return publicError("bad_request", 400, context.requestId);
  const { error } = await context.admin.from("widget_events").insert({
    tenant_id: context.widget.tenant_id,
    shop_id: shop?.id || context.widget.shop_id,
    widget_id: context.widget.id,
    widget_version: context.widget.published_version,
    anonymous_session_id: parsed.data.sessionId,
    event_name: parsed.data.name,
    event_payload: parsed.data.data,
    idempotency_key: parsed.data.idempotencyKey || null,
  });
  if (error && error.code !== "23505") return publicError("service_unavailable", 503, context.requestId);
  return publicSuccess(context, { accepted: true, duplicate: error?.code === "23505" }, { status: error ? 200 : 202 });
}

export async function handleOptions(request: Request, route: RouteParams) {
  const context = await contextFor(request, route, false);
  if (isResponse(context)) return new NextResponse(null, { status: context.status });
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": context.hostOrigin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key, X-Widget-Token, X-Behar-Host-Origin",
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    },
  });
}
