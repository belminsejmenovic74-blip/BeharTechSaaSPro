import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeWorkshopLicense } from "@/lib/server/workshop-license-auth";

export const dynamic = "force-dynamic";

const statusSchema = z.enum([
  "new",
  "to_contact",
  "contacted",
  "in_progress",
  "waiting_customer",
  "converted_appointment",
  "converted_quote",
  "converted_repair",
  "closed",
  "spam",
]);

const baseSchema = z.object({
  workshopId: z.string().uuid(),
  licenseKey: z.string().trim().min(6).max(100),
});

const requestSchema = z.discriminatedUnion("operation", [
  baseSchema.extend({ operation: z.literal("list") }).strict(),
  baseSchema.extend({ operation: z.literal("notifications") }).strict(),
  baseSchema.extend({ operation: z.literal("appointments") }).strict(),
  baseSchema
    .extend({
      operation: z.literal("mark_appointments_imported"),
      appointmentIds: z.array(z.string().uuid()).min(1).max(100),
    })
    .strict(),
  baseSchema
    .extend({
      operation: z.literal("update"),
      leadId: z.string().uuid(),
      status: statusSchema.optional(),
      assignedTo: z.string().uuid().nullable().optional(),
      conversionReference: z.string().trim().max(160).nullable().optional(),
      actorId: z.string().trim().max(120),
      actorName: z.string().trim().min(1).max(160),
      note: z.string().trim().max(1000).optional(),
    })
    .strict(),
  baseSchema
    .extend({
      operation: z.literal("activity"),
      leadId: z.string().uuid(),
      action: z.enum([
        "called",
        "sms_sent",
        "email_opened",
        "quote_created",
        "appointment_proposed",
        "repair_created",
        "note_added",
      ]),
      actorId: z.string().trim().max(120),
      actorName: z.string().trim().min(1).max(160),
      note: z.string().trim().max(1000).optional(),
      metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
    })
    .strict(),
  baseSchema.extend({ operation: z.literal("mark_notifications_read"), leadId: z.string().uuid().optional() }).strict(),
]);

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return responseError("Requête invalide.", 400);
  const auth = await authorizeWorkshopLicense(parsed.data.workshopId, parsed.data.licenseKey);
  if (auth instanceof Response) return auth;
  const { admin, workshopId } = auth;

  if (parsed.data.operation === "appointments") {
    const { data, error } = await admin
      .from("appointments")
      .select(
        "id, shop_id, client_id, appointment_number, client_name, client_phone, client_email, device_type, device_brand, device_model, issue_description, intervention_label, customer_price, price_status, price_snapshot, appointment_date, appointment_time, duration_minutes, source, status, notes, widget_lead_id, assigned_technician_id, is_pre_intake, confirmation_status, stock_confirmation_required, price_confirmation_required, created_at, updated_at",
      )
      .eq("workshop_id", workshopId)
      .eq("source", "Widget site internet")
      .is("dashboard_imported_at", null)
      .is("repair_id", null)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) return responseError("Chargement des rendez-vous impossible.", 503);
    const appointments = data || [];
    // Enrichit chaque rendez-vous des données consultées portées par la demande
    // (qualité, stock, garantie, photos) — jamais de champ interne fournisseur.
    const leadIds = [...new Set(appointments.map((a) => a.widget_lead_id).filter((id): id is string => Boolean(id)))];
    if (leadIds.length) {
      const { data: leads } = await admin
        .from("widget_leads")
        .select("id, quality_label, displayed_stock, displayed_stock_snapshot, displayed_warranty, photos")
        .eq("tenant_id", workshopId)
        .in("id", leadIds);
      const byId = new Map((leads || []).map((lead) => [lead.id, lead]));
      for (const appointment of appointments) {
        const lead = appointment.widget_lead_id ? byId.get(appointment.widget_lead_id) : undefined;
        Object.assign(appointment, {
          quality_label: lead?.quality_label ?? null,
          displayed_stock: lead?.displayed_stock ?? null,
          displayed_stock_snapshot: lead?.displayed_stock_snapshot ?? null,
          displayed_warranty: lead?.displayed_warranty ?? null,
          photos: Array.isArray(lead?.photos) ? lead?.photos : [],
        });
      }
    }
    return NextResponse.json({ appointments });
  }

  if (parsed.data.operation === "mark_appointments_imported") {
    const { error } = await admin
      .from("appointments")
      .update({ dashboard_imported_at: new Date().toISOString() })
      .eq("workshop_id", workshopId)
      .eq("source", "Widget site internet")
      .in("id", parsed.data.appointmentIds);
    return error ? responseError("Mise à jour impossible.", 503) : NextResponse.json({ ok: true });
  }

  if (parsed.data.operation === "notifications") {
    const { data, error } = await admin
      .from("widget_notifications")
      .select("id, lead_id, notification_type, title, message, created_at")
      .eq("tenant_id", workshopId)
      .is("read_at", null)
      .order("created_at", { ascending: true })
      .limit(50);
    if (error) return responseError("Chargement des notifications impossible.", 503);
    const notifications = data || [];
    // Enrichit chaque notification du type de demande lié (catégorisation) et de
    // la présence de photos — sans exposer de champ interne.
    const leadIds = [...new Set(notifications.map((n) => n.lead_id).filter((id): id is string => Boolean(id)))];
    if (leadIds.length) {
      const { data: leads } = await admin
        .from("widget_leads")
        .select("id, lead_type, photos")
        .eq("tenant_id", workshopId)
        .in("id", leadIds);
      const byId = new Map((leads || []).map((lead) => [lead.id, lead]));
      for (const notification of notifications) {
        const lead = notification.lead_id ? byId.get(notification.lead_id) : undefined;
        Object.assign(notification, {
          lead_type: lead?.lead_type ?? null,
          has_photos: Array.isArray(lead?.photos) && lead.photos.length > 0,
        });
      }
    }
    return NextResponse.json({ notifications });
  }

  if (parsed.data.operation === "list") {
    const [leadResult, memberResult, notificationResult] = await Promise.all([
      admin
        .from("widget_leads")
        .select(
          "id, shop_id, widget_id, customer_id, appointment_id, quote_id, repair_case_id, lead_type, first_name, last_name, phone, phone_normalized, email, email_normalized, device_category, brand, model, issue, issue_description, service_label, quality_label, displayed_price, displayed_price_snapshot, displayed_stock, displayed_stock_snapshot, displayed_duration_minutes, displayed_warranty, comment, photos, contact_preference, requested_callback_at, source_url, status, assigned_to, conversion_reference, submission_payload, created_at, updated_at, last_activity_at, closed_at, spam_at",
        )
        .eq("tenant_id", workshopId)
        .order("created_at", { ascending: false })
        .limit(250),
      admin
        .from("team_members")
        .select("id, name, role, is_active")
        .eq("workshop_id", workshopId)
        .eq("is_active", true)
        .order("name"),
      admin
        .from("widget_notifications")
        .select("id, lead_id, title, message, created_at")
        .eq("tenant_id", workshopId)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (leadResult.error || memberResult.error || notificationResult.error) {
      return responseError("Chargement des demandes impossible.", 503);
    }
    const leadIds = (leadResult.data || []).map((lead) => lead.id);
    const historyResult = leadIds.length
      ? await admin
          .from("widget_lead_history")
          .select("id, lead_id, action, from_status, to_status, actor_id, actor_name, note, metadata, created_at")
          .eq("tenant_id", workshopId)
          .in("lead_id", leadIds)
          .order("created_at", { ascending: false })
          .limit(1500)
      : { data: [], error: null };
    if (historyResult.error) return responseError("Chargement de l’historique impossible.", 503);
    return NextResponse.json({
      leads: leadResult.data || [],
      history: historyResult.data || [],
      assignees: memberResult.data || [],
      notifications: notificationResult.data || [],
    });
  }

  if (parsed.data.operation === "mark_notifications_read") {
    let query = admin
      .from("widget_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("tenant_id", workshopId)
      .is("read_at", null);
    if (parsed.data.leadId) query = query.eq("lead_id", parsed.data.leadId);
    const { error } = await query;
    return error ? responseError("Mise à jour impossible.", 503) : NextResponse.json({ ok: true });
  }

  const leadId = parsed.data.leadId;
  const { data: lead, error: leadError } = await admin
    .from("widget_leads")
    .select("id, status")
    .eq("tenant_id", workshopId)
    .eq("id", leadId)
    .maybeSingle();
  if (leadError) return responseError("Service momentanément indisponible.", 503);
  if (!lead) return responseError("Demande introuvable.", 404);

  if (parsed.data.operation === "activity") {
    const { error } = await admin.from("widget_lead_history").insert({
      tenant_id: workshopId,
      lead_id: leadId,
      action: parsed.data.action,
      actor_id: parsed.data.actorId || null,
      actor_name: parsed.data.actorName,
      note: parsed.data.note || null,
      metadata: parsed.data.metadata || {},
    });
    if (error) return responseError("Historique non enregistré.", 503);
    if (["called", "sms_sent", "email_opened"].includes(parsed.data.action)) {
      await admin
        .from("widget_leads")
        .update({
          status: lead.status === "new" || lead.status === "to_contact" ? "contacted" : lead.status,
          last_activity_at: new Date().toISOString(),
        })
        .eq("tenant_id", workshopId)
        .eq("id", leadId);
    }
    return NextResponse.json({ ok: true });
  }

  const patch: Record<string, unknown> = { last_activity_at: new Date().toISOString() };
  if (parsed.data.status !== undefined) {
    patch.status = parsed.data.status;
    patch.closed_at = parsed.data.status === "closed" ? new Date().toISOString() : null;
    patch.spam_at = parsed.data.status === "spam" ? new Date().toISOString() : null;
  }
  if (parsed.data.assignedTo !== undefined) patch.assigned_to = parsed.data.assignedTo;
  if (parsed.data.conversionReference !== undefined) patch.conversion_reference = parsed.data.conversionReference;
  const { error } = await admin.from("widget_leads").update(patch).eq("tenant_id", workshopId).eq("id", leadId);
  if (error) return responseError("Mise à jour impossible.", 503);
  if (parsed.data.note) {
    await admin.from("widget_lead_history").insert({
      tenant_id: workshopId,
      lead_id: leadId,
      action: "note_added",
      actor_id: parsed.data.actorId || null,
      actor_name: parsed.data.actorName,
      note: parsed.data.note,
    });
  }
  return NextResponse.json({ ok: true });
}
