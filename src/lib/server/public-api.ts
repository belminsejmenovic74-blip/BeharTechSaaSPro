import "server-only";

import { NextResponse } from "next/server";

import type {
  PublicCommercialDocumentDto,
  PublicPrintableDocumentDto,
  PublicRepairDto,
  PublicWorkshopDto,
} from "@/lib/public-dtos";
import {
  PUBLIC_REPAIR_TIMELINE_STEPS,
  publicRepairProgress,
  publicRepairStatusLabel,
} from "@/lib/repair-status";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getWorkshopCountryConfig } from "@/lib/workshop-country";

type Supabase = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

const PUBLIC_DOCUMENT_TITLES: Record<string, string> = {
  intake: "Bon de prise en charge",
  repair_intake: "Bon de prise en charge",
  quote: "Devis",
  invoice: "Facture",
  payment: "Confirmation de règlement — encaissé hors Behar Tech Pro",
  payment_confirmation: "Confirmation de règlement — encaissé hors Behar Tech Pro",
  payment_receipt: "Confirmation de règlement — encaissé hors Behar Tech Pro",
  summary: "Rapport final",
  diagnostic_report: "Rapport diagnostic",
};

function workshopDto(workshop: any): PublicWorkshopDto {
  const name = workshop?.commercial_name || workshop?.name || workshop?.brand || "Votre atelier";
  const config = getWorkshopCountryConfig(workshop?.country);
  const isSwiss = config.country === "CH";
  return {
    name,
    logoUrl: workshop?.logo_url || undefined,
    phone: workshop?.phone || undefined,
    email: workshop?.email || undefined,
    address: workshop?.address || undefined,
    postalCode: workshop?.postal_code || undefined,
    city: workshop?.city || undefined,
    country: config.country,
    currency: config.currency,
    locale: config.locale,
    canton: isSwiss ? workshop?.swiss_canton || undefined : undefined,
    businessId: isSwiss ? workshop?.swiss_uid || undefined : workshop?.siret || undefined,
    vatNumber: isSwiss ? workshop?.swiss_vat_number || undefined : workshop?.vat_number || undefined,
    vatApplicable: workshop?.vat_regime === "vat" || workshop?.vat_regime === "vat_subject",
    vatMention: workshop?.vat_mention || undefined,
  };
}

function trackingWorkshopDto(workshop: any): PublicWorkshopDto {
  const base = workshopDto(workshop);
  return {
    name: base.name,
    logoUrl: base.logoUrl,
    phone: base.phone,
    email: base.email,
    address: base.address,
    postalCode: base.postalCode,
    city: base.city,
    country: base.country,
    currency: base.currency,
    locale: base.locale,
  };
}

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function publicTimelineFromRepair(repair: any): PublicRepairDto["timeline"] {
  const createdAt = repair.created_at ?? new Date().toISOString();
  const updatedAt = repair.updated_at ?? createdAt;
  const progress = publicRepairProgress(repair.status);
  if (progress.isCancelled) {
    return [
      {
        title: "Dossier annulé",
        description: "Le dossier a été annulé par l'atelier.",
        date: updatedAt,
        visibility: "client",
      },
    ];
  }
  return PUBLIC_REPAIR_TIMELINE_STEPS.slice(0, progress.activeStepIndex + 1).map((title, index) => ({
    title,
    description:
      index === 0
        ? "Votre appareil a été pris en charge."
        : index === 4 && progress.isFinished
          ? "Votre appareil a été remis au client."
          : undefined,
    date: index === 0 ? createdAt : updatedAt,
    visibility: "client" as const,
  }));
}

function isPublicRepairDocument(doc: any, paidPaymentIds: Set<string>) {
  const type = String(doc?.document_type ?? "");
  if (!Object.hasOwn(PUBLIC_DOCUMENT_TITLES, type)) return false;
  if (type === "payment" || type === "payment_confirmation" || type === "payment_receipt") {
    return paidPaymentIds.has(String(doc.payment_id ?? ""));
  }
  return true;
}

function publicDocumentTitle(doc: any) {
  const type = String(doc?.document_type ?? "");
  const base = PUBLIC_DOCUMENT_TITLES[type] ?? doc?.title ?? "Document";
  if (type === "payment" || type === "payment_confirmation" || type === "payment_receipt") return base;
  return doc?.document_number ? `${base} ${doc.document_number}` : base;
}

export function publicError(message = "Ressource introuvable", status = 404) {
  return error(message, status);
}

export async function getPublicRepair(token: string): Promise<PublicRepairDto | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase server non configuré.");

  const { data: repair, error: repairError } = await supabase
    .from("repairs")
    .select("*")
    .eq("public_token", token)
    .eq("public_active", true)
    .maybeSingle();
  if (repairError) throw repairError;
  if (!repair) return null;

  const [workshopRes, clientRes, eventsRes, docsRes, messagesRes, quotesRes, invoicesRes, paymentsRes] =
    await Promise.all([
      supabase.from("workshops").select("*").eq("id", repair.workshop_id).single(),
      repair.client_id ? supabase.from("clients").select("full_name").eq("id", repair.client_id).maybeSingle() : null,
      supabase
        .from("repair_events")
        .select("title, description, visibility, created_at")
        .eq("repair_id", repair.id)
        .in("visibility", ["client", "system"])
        .order("created_at", { ascending: true }),
      supabase
        .from("documents")
        .select("document_type, title, document_number, status, public_url, file_url, quote_id, invoice_id, payment_id")
        .eq("repair_id", repair.id)
        .eq("public_visible", true)
        .neq("document_type", "internal_intervention_sheet")
        .order("created_at", { ascending: true }),
      supabase
        .from("repair_messages")
        .select("author_type, author_name, body, created_at")
        .eq("repair_id", repair.id)
        .eq("visibility", "client")
        .order("created_at", { ascending: true }),
      supabase
        .from("quotes")
        .select("id, quote_number, status, total_ttc, public_url")
        .eq("repair_id", repair.id)
        .eq("public_active", true)
        .order("created_at", { ascending: true }),
      supabase
        .from("invoices")
        .select("id, invoice_number, status, total_ttc, public_url")
        .eq("repair_id", repair.id)
        .eq("public_active", true)
        .order("created_at", { ascending: true }),
      supabase
        .from("payments")
        .select("id, payment_number, status, amount, public_url")
        .eq("repair_id", repair.id)
        .eq("public_active", true)
        .order("created_at", { ascending: true }),
    ]);

  if (workshopRes.error) throw workshopRes.error;
  if (clientRes && "error" in clientRes && clientRes.error) throw clientRes.error;
  if (eventsRes.error) throw eventsRes.error;
  if (docsRes.error) throw docsRes.error;
  if (messagesRes.error) throw messagesRes.error;
  if (quotesRes.error) throw quotesRes.error;
  if (invoicesRes.error) throw invoicesRes.error;
  if (paymentsRes.error) throw paymentsRes.error;

  const paidPaymentIds = new Set(
    (paymentsRes.data ?? [])
      .filter((payment: any) => ["Payé", "paid", "partially_paid", "Partiellement réglé"].includes(payment.status))
      .map((payment: any) => String(payment.id)),
  );
  const publicDocs = (docsRes.data ?? []).filter((doc: any) => isPublicRepairDocument(doc, paidPaymentIds));

  return {
    workshop: trackingWorkshopDto(workshopRes.data),
    repair: {
      number: repair.repair_number,
      status: repair.status,
      statusLabel: publicRepairStatusLabel(repair.status),
      deviceBrand: repair.device_brand || undefined,
      deviceModel: repair.device_model || undefined,
      deviceType: repair.device_type || undefined,
      issueDescription: repair.issue_description || undefined,
      createdAt: repair.created_at,
      updatedAt: repair.updated_at,
    },
    client: { displayName: clientRes?.data?.full_name || "Client" },
    timeline: publicTimelineFromRepair(repair),
    documents: publicDocs.map((doc: any) => ({
      type: doc.document_type,
      title: publicDocumentTitle(doc),
      number: doc.document_number || undefined,
      status: doc.status,
      previewUrl: doc.public_url || undefined,
      downloadUrl: doc.file_url || undefined,
    })),
    messages: (messagesRes.data ?? []).map((message: any) => ({
      authorType: message.author_type,
      authorName: message.author_name,
      body: message.body,
      createdAt: message.created_at,
    })),
    quoteLinks: (quotesRes.data ?? []).map((quote: any) => ({
      number: quote.quote_number,
      status: quote.status,
      totalTtc: Number(quote.total_ttc ?? 0),
      previewUrl: quote.public_url,
      downloadUrl:
        publicDocs.find((doc: any) => doc.document_type === "quote" && doc.quote_id === quote.id)?.file_url ||
        undefined,
    })),
    invoiceLinks: (invoicesRes.data ?? []).map((invoice: any) => ({
      number: invoice.invoice_number,
      status: invoice.status,
      totalTtc: Number(invoice.total_ttc ?? 0),
      previewUrl: invoice.public_url,
      downloadUrl:
        publicDocs.find((doc: any) => doc.document_type === "invoice" && doc.invoice_id === invoice.id)?.file_url ||
        undefined,
    })),
    receiptLinks: (paymentsRes.data ?? [])
      .filter((payment: any) => paidPaymentIds.has(String(payment.id)))
      .map((payment: any) => ({
        number: payment.payment_number,
        status: payment.status,
        amount: Number(payment.amount ?? 0),
        previewUrl: payment.public_url,
        downloadUrl:
          publicDocs.find(
            (doc: any) =>
              (doc.document_type === "payment" ||
                doc.document_type === "payment_confirmation" ||
                doc.document_type === "payment_receipt") &&
              doc.payment_id === payment.id,
          )?.file_url || undefined,
      })),
  };
}

export async function addPublicRepairMessage(token: string, body: string, authorName = "Client") {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase server non configuré.");
  const clean = body.trim();
  if (!clean) throw new Error("Message vide.");

  const { data: repair, error: repairError } = await supabase
    .from("repairs")
    .select("id, workshop_id")
    .eq("public_token", token)
    .eq("public_active", true)
    .maybeSingle();
  if (repairError) throw repairError;
  if (!repair) return null;

  const { error: insertError } = await supabase.from("repair_messages").insert({
    workshop_id: repair.workshop_id,
    repair_id: repair.id,
    author_type: "client",
    author_name: authorName || "Client",
    visibility: "client",
    body: clean,
    read_by_client: true,
    read_by_staff: false,
  });
  if (insertError) throw insertError;
  return { ok: true };
}

async function getCommercialDocument(
  supabase: Supabase,
  table: "quotes" | "invoices" | "payments" | "sales",
  token: string,
): Promise<any | null> {
  const { data, error: queryError } = await supabase
    .from(table)
    .select("*")
    .eq("public_token", token)
    .eq("public_active", true)
    .maybeSingle();
  if (queryError) throw queryError;
  return data;
}

export async function getPublicCommercialDocument(
  kind: PublicCommercialDocumentDto["kind"],
  token: string,
): Promise<PublicCommercialDocumentDto | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase server non configuré.");

  const table =
    kind === "quote" ? "quotes" : kind === "invoice" ? "invoices" : kind === "receipt" ? "payments" : "sales";
  const record = await getCommercialDocument(supabase, table, token);
  if (!record) return null;

  const workshopId = record.workshop_id;
  const clientId = record.client_id;
  const repairId = record.repair_id;
  const [workshopRes, clientRes, repairRes, docsRes] = await Promise.all([
    supabase.from("workshops").select("*").eq("id", workshopId).single(),
    clientId ? supabase.from("clients").select("full_name").eq("id", clientId).maybeSingle() : null,
    repairId ? supabase.from("repairs").select("repair_number, public_url").eq("id", repairId).maybeSingle() : null,
    supabase
      .from("documents")
      .select("document_type, title, status, public_url, file_url")
      .or(
        [
          record.id && kind === "quote" ? `quote_id.eq.${record.id}` : "",
          record.id && kind === "invoice" ? `invoice_id.eq.${record.id}` : "",
          record.id && kind === "receipt" ? `payment_id.eq.${record.id}` : "",
          record.id && kind === "sale" ? `sale_id.eq.${record.id}` : "",
        ]
          .filter(Boolean)
          .join(","),
      )
      .eq("public_visible", true),
  ]);

  if (workshopRes.error) throw workshopRes.error;
  if (clientRes && "error" in clientRes && clientRes.error) throw clientRes.error;
  if (repairRes && "error" in repairRes && repairRes.error) throw repairRes.error;

  let lines: any[] = [];
  if (kind === "quote") {
    const { data, error: lineError } = await supabase
      .from("quote_lines")
      .select("label, quantity, unit_price_ttc, total_ttc")
      .eq("quote_id", record.id)
      .order("created_at", { ascending: true });
    if (lineError) throw lineError;
    lines = data ?? [];
  } else if (kind === "invoice") {
    const { data, error: lineError } = await supabase
      .from("invoice_lines")
      .select("label, quantity, unit_price_ttc, total_ttc")
      .eq("invoice_id", record.id)
      .order("created_at", { ascending: true });
    if (lineError) throw lineError;
    lines = data ?? [];
  } else if (kind === "sale") {
    const { data, error: lineError } = await supabase
      .from("sale_lines")
      .select("label, quantity, unit_price_ttc, total_ttc")
      .eq("sale_id", record.id)
      .order("created_at", { ascending: true });
    if (lineError) throw lineError;
    lines = data ?? [];
  } else {
    lines = [{ label: "Paiement", quantity: 1, unit_price_ttc: record.amount, total_ttc: record.amount }];
  }

  const number =
    record.quote_number || record.invoice_number || record.payment_number || record.sale_number || "Document";
  const total = Number(record.total_ttc ?? record.amount ?? 0);

  return {
    kind,
    workshop: workshopDto(workshopRes.data),
    client: { displayName: clientRes?.data?.full_name || "Client comptoir" },
    document: {
      number,
      status: record.status || record.payment_status || "ready",
      totalTtc: total,
      createdAt: record.created_at,
      publicUrl: record.public_url || undefined,
    },
    lines: lines.map((line) => ({
      label: line.label,
      quantity: Number(line.quantity ?? 1),
      unitPriceTtc: Number(line.unit_price_ttc ?? 0),
      totalTtc: Number(line.total_ttc ?? 0),
    })),
    relatedRepair: repairRes?.data
      ? { number: repairRes.data.repair_number, url: repairRes.data.public_url || undefined }
      : undefined,
    documents: (docsRes.data ?? []).map((doc: any) => ({
      type: doc.document_type,
      title: doc.title,
      status: doc.status,
      previewUrl: doc.public_url || undefined,
      downloadUrl: doc.file_url || undefined,
    })),
  };
}

export async function respondToPublicQuote(token: string, decision: "accepted" | "refused") {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase server non configuré.");
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("id, workshop_id, repair_id, quote_number")
    .eq("public_token", token)
    .eq("public_active", true)
    .maybeSingle();
  if (quoteError) throw quoteError;
  if (!quote) return null;

  const now = new Date().toISOString();
  const patch =
    decision === "accepted"
      ? { status: "accepted", accepted_at: now, refused_at: null }
      : { status: "refused", refused_at: now, accepted_at: null };
  const { error: updateError } = await supabase.from("quotes").update(patch).eq("id", quote.id);
  if (updateError) throw updateError;

  if (quote.repair_id) {
    await supabase.from("repair_events").insert({
      workshop_id: quote.workshop_id,
      repair_id: quote.repair_id,
      event_type: `quote_${decision}`,
      title: decision === "accepted" ? "Devis accepté" : "Devis refusé",
      description: `Le client a ${decision === "accepted" ? "accepté" : "refusé"} le devis ${quote.quote_number}.`,
      visibility: "client",
    });
    await supabase.from("repair_messages").insert({
      workshop_id: quote.workshop_id,
      repair_id: quote.repair_id,
      author_type: "system",
      author_name: "Atelier",
      visibility: "client",
      body: decision === "accepted" ? "Le devis a été accepté." : "Le devis a été refusé.",
      read_by_client: false,
      read_by_staff: false,
    });
  }

  return { ok: true };
}

export async function getPublicPrintableDocument(token: string): Promise<PublicPrintableDocumentDto | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase server non configuré.");

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("*")
    .eq("public_token", token)
    .eq("public_visible", true)
    .neq("document_type", "internal_intervention_sheet")
    .maybeSingle();
  if (documentError) throw documentError;
  if (!document) return null;

  const [workshopRes, clientRes, repairRes] = await Promise.all([
    supabase.from("workshops").select("*").eq("id", document.workshop_id).single(),
    document.client_id ? supabase.from("clients").select("*").eq("id", document.client_id).maybeSingle() : null,
    document.repair_id ? supabase.from("repairs").select("*").eq("id", document.repair_id).maybeSingle() : null,
  ]);
  if (workshopRes.error) throw workshopRes.error;
  if (clientRes && "error" in clientRes && clientRes.error) throw clientRes.error;
  if (repairRes && "error" in repairRes && repairRes.error) throw repairRes.error;

  let lines: PublicPrintableDocumentDto["lines"] = [];
  let totalTtc = 0;

  if (document.document_type === "quote" && document.quote_id) {
    const [quoteRes, lineRes] = await Promise.all([
      supabase.from("quotes").select("total_ttc").eq("id", document.quote_id).maybeSingle(),
      supabase
        .from("quote_lines")
        .select("label, quantity, unit_price_ttc, total_ttc")
        .eq("quote_id", document.quote_id)
        .order("created_at", { ascending: true }),
    ]);
    if (quoteRes.error) throw quoteRes.error;
    if (lineRes.error) throw lineRes.error;
    totalTtc = Number(quoteRes.data?.total_ttc ?? 0);
    lines = (lineRes.data ?? []).map((line: any) => ({
      label: line.label,
      quantity: Number(line.quantity ?? 1),
      unitPriceTtc: Number(line.unit_price_ttc ?? 0),
      totalTtc: Number(line.total_ttc ?? 0),
    }));
  } else if (document.document_type === "invoice" && document.invoice_id) {
    const [invoiceRes, lineRes] = await Promise.all([
      supabase.from("invoices").select("total_ttc").eq("id", document.invoice_id).maybeSingle(),
      supabase
        .from("invoice_lines")
        .select("label, quantity, unit_price_ttc, total_ttc")
        .eq("invoice_id", document.invoice_id)
        .order("created_at", { ascending: true }),
    ]);
    if (invoiceRes.error) throw invoiceRes.error;
    if (lineRes.error) throw lineRes.error;
    totalTtc = Number(invoiceRes.data?.total_ttc ?? 0);
    lines = (lineRes.data ?? []).map((line: any) => ({
      label: line.label,
      quantity: Number(line.quantity ?? 1),
      unitPriceTtc: Number(line.unit_price_ttc ?? 0),
      totalTtc: Number(line.total_ttc ?? 0),
    }));
  } else if (
    (document.document_type === "payment_confirmation" || document.document_type === "payment_receipt") &&
    document.payment_id
  ) {
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("amount, method")
      .eq("id", document.payment_id)
      .maybeSingle();
    if (paymentError) throw paymentError;
    totalTtc = Number(payment?.amount ?? 0);
    lines = [{ label: `Paiement ${payment?.method ?? ""}`.trim(), quantity: 1, unitPriceTtc: totalTtc, totalTtc }];
  } else if (document.document_type === "sale_receipt" && document.sale_id) {
    const [saleRes, lineRes] = await Promise.all([
      supabase.from("sales").select("total_ttc").eq("id", document.sale_id).maybeSingle(),
      supabase
        .from("sale_lines")
        .select("label, quantity, unit_price_ttc, total_ttc")
        .eq("sale_id", document.sale_id)
        .order("created_at", { ascending: true }),
    ]);
    if (saleRes.error) throw saleRes.error;
    if (lineRes.error) throw lineRes.error;
    totalTtc = Number(saleRes.data?.total_ttc ?? 0);
    lines = (lineRes.data ?? []).map((line: any) => ({
      label: line.label,
      quantity: Number(line.quantity ?? 1),
      unitPriceTtc: Number(line.unit_price_ttc ?? 0),
      totalTtc: Number(line.total_ttc ?? 0),
    }));
  }

  if (!lines.length && repairRes?.data) {
    const price = Number(repairRes.data.customer_price ?? 0);
    totalTtc = price;
    lines = [
      {
        label: repairRes.data.intervention_label || repairRes.data.issue_description || "Prise en charge atelier",
        quantity: 1,
        unitPriceTtc: price,
        totalTtc: price,
      },
    ];
  }

  return {
    documentType:
      document.document_type === "payment_receipt" ? "payment_confirmation" : document.document_type,
    workshop: workshopDto(workshopRes.data),
    client: {
      displayName: clientRes?.data?.full_name || "Client comptoir",
      phone: clientRes?.data?.phone || undefined,
      email: clientRes?.data?.email || undefined,
      address: clientRes?.data?.address || undefined,
    },
    document: {
      title: document.title,
      number: document.document_number || repairRes?.data?.repair_number || undefined,
      status: document.status,
      createdAt: document.created_at,
      publicUrl: document.public_url || undefined,
    },
    repair: repairRes?.data
      ? {
          number: repairRes.data.repair_number,
          status: repairRes.data.status,
          statusLabel: publicRepairStatusLabel(repairRes.data.status),
          deviceBrand: repairRes.data.device_brand || undefined,
          deviceModel: repairRes.data.device_model || undefined,
          deviceType: repairRes.data.device_type || undefined,
          imei: repairRes.data.imei || undefined,
          issueDescription: repairRes.data.issue_description || undefined,
          interventionLabel: repairRes.data.intervention_label || undefined,
          customerPrice: Number(repairRes.data.customer_price ?? 0),
          publicUrl: repairRes.data.public_url || undefined,
          createdAt: repairRes.data.created_at || undefined,
        }
      : undefined,
    lines,
    totalTtc,
  };
}
