import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import type { NormalizedBusinessState } from "@/lib/data/normalized-sync";
import { getCustomerTrackingPath, getTrackingCode } from "@/lib/customer-tracking";
import { makePublicUrl } from "@/lib/public-access";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function stableUuid(input: unknown): string {
  const hash = createHash("sha256")
    .update(String(input || "missing"))
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function stableToken(prefix: string, seed: unknown): string {
  const bytes = createHash("sha256")
    .update(`${prefix}:${String(seed)}`)
    .digest();
  let out = "";
  for (let i = 0; i < 16; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `${prefix}_${out}`;
}

function money(value: unknown): number | null {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : null;
}

function text(value: unknown, fallback = ""): string {
  const out = String(value ?? "").trim();
  return out || fallback;
}

function repairStatus(status: unknown): string {
  switch (status) {
    case "Diagnostic":
      return "diagnosis";
    case "En attente":
      return "waiting";
    case "Devis envoyé":
      return "quote_sent";
    case "Devis accepté":
      return "quote_accepted";
    case "En réparation":
      return "repair";
    case "Test final":
      return "final_test";
    case "Prêt":
      return "ready";
    case "Rendu":
    case "Clôturé":
      return "delivered";
    case "Irréparable":
      return "irreparable";
    case "SAV":
      return "sav";
    case "Annulé":
      return "cancelled";
    default:
      return "received";
  }
}

function stockItemType(value: unknown, category: unknown): "part" | "accessory" | "product" {
  if (value === "part" || value === "accessory" || value === "product") return value;
  const normalized = text(category).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  if (normalized.includes("accessoire")) return "accessory";
  if (normalized.includes("produit")) return "product";
  return "part";
}

function quoteStatus(status: unknown): string {
  switch (status) {
    case "Envoyé":
      return "sent";
    case "Accepté":
      return "accepted";
    case "Refusé":
      return "refused";
    case "Facturé":
      return "invoiced";
    default:
      return "draft";
  }
}

function invoiceStatus(status: unknown): string {
  switch (status) {
    case "Envoyée":
      return "sent";
    case "Payée":
      return "paid";
    case "Annulée":
      return "cancelled";
    default:
      return "draft";
  }
}

function paymentStatus(status: unknown): string {
  switch (status) {
    case "Annulé":
      return "cancelled";
    case "Remboursé":
      return "refunded";
    default:
      return "paid";
  }
}

function saleStatus(status: unknown): string {
  switch (status) {
    case "Payée":
      return "paid";
    case "Annulée":
      return "cancelled";
    case "Rattachée":
      return "attached";
    default:
      return "draft";
  }
}

function documentType(type: unknown): string {
  switch (type) {
    case "intake":
      return "repair_intake";
    case "quote":
      return "quote";
    case "invoice":
      return "invoice";
    case "payment":
      return "payment_confirmation";
    case "sale-receipt":
    case "sale-invoice":
      return "sale_receipt";
    case "summary":
      return "repair_summary";
    default:
      return "internal_intervention_sheet";
  }
}

function cleanIso(value: unknown): string | undefined {
  const source = text(value);
  if (!source) return undefined;
  const parsed = new Date(source);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

async function replaceLines(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  table: "quote_lines" | "invoice_lines" | "sale_lines",
  parentColumn: "quote_id" | "invoice_id" | "sale_id",
  parentId: string,
  lines: Array<{
    id?: string;
    description?: string;
    name?: string;
    quantity?: number;
    unitPrice?: number;
    total?: number;
  }>,
) {
  await supabase.from(table).delete().eq(parentColumn, parentId);
  const rows = lines.map((line) => ({
    id: stableUuid(`${table}:${parentId}:${line.id ?? line.description ?? line.name}`),
    [parentColumn]: parentId,
    label: text(line.description ?? line.name, "Ligne"),
    quantity: money(line.quantity) ?? 1,
    unit_price_ttc: money(line.unitPrice) ?? 0,
    total_ttc: money(line.total) ?? (money(line.quantity) ?? 1) * (money(line.unitPrice) ?? 0),
  }));
  if (rows.length) await supabase.from(table).upsert(rows, { onConflict: "id" });
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase server non configuré." }, { status: 503 });
  }

  const payload = (await request.json()) as NormalizedBusinessState;
  const workshopId = payload.workshopId && /^[0-9a-f-]{36}$/i.test(payload.workshopId) ? payload.workshopId : "";
  if (!workshopId) {
    return NextResponse.json({ error: "workshopId UUID requis." }, { status: 400 });
  }

  const ws = payload.workshopSettings;
  const workshop = {
    id: workshopId,
    name: text(ws?.name, "Atelier"),
    commercial_name: text(ws?.commercialName) || null,
    brand: text(ws?.brand) || null,
    logo_url: text(ws?.logoUrl) || null,
    phone: text(ws?.phone) || null,
    email: text(ws?.email) || null,
    address: text(ws?.address) || null,
    postal_code: text(ws?.postalCode) || null,
    city: text(ws?.city || ws?.postalCity) || null,
    siret: text(ws?.siret) || null,
    siren: text(ws?.siret).replace(/\D/g, "").slice(0, 9) || null,
    vat_regime: ws?.isMicroEnterprise ? "micro" : ws?.vatApplicable ? "vat" : null,
  };

  const { error: workshopError } = await supabase.from("workshops").upsert(workshop, { onConflict: "id" });
  if (workshopError) return NextResponse.json({ error: workshopError.message }, { status: 500 });

  await supabase.from("app_settings").upsert(
    {
      id: stableUuid(`settings:${workshopId}`),
      workshop_id: workshopId,
      settings: ws ?? {},
    },
    { onConflict: "workshop_id" },
  );

  const users = (payload.users ?? []).map((user) => ({
    id: stableUuid(`user:${workshopId}:${user.id}`),
    workshop_id: workshopId,
    name: text(user.name, "Membre atelier"),
    role: text(user.role, "technician"),
    pin_hash: user.pin ? createHash("sha256").update(`${workshopId}:${user.pin}`).digest("hex") : null,
    is_active: user.active !== false,
  }));
  if (users.length) await supabase.from("team_members").upsert(users, { onConflict: "id" });

  const clients = (payload.customers ?? []).map((client) => ({
    id: stableUuid(`client:${workshopId}:${client.id}`),
    workshop_id: workshopId,
    full_name: text(client.name, "Client"),
    phone: text(client.phone) || null,
    email: text(client.email) || null,
    address: text(client.address) || null,
  }));
  if (clients.length) await supabase.from("clients").upsert(clients, { onConflict: "id" });

  const repairs = (payload.repairs ?? []).map((repair) => {
    const token = getTrackingCode(repair);
    return {
      id: stableUuid(`repair:${workshopId}:${repair.id}`),
      workshop_id: workshopId,
      client_id: stableUuid(`client:${workshopId}:${repair.customerId}`),
      repair_number: text(repair.number, repair.id),
      device_brand: text(repair.brandName) || null,
      device_model: text(repair.deviceModel || repair.model || repair.device) || null,
      device_type: text(repair.deviceType) || null,
      imei: text(repair.imei) || null,
      issue_description: text(repair.issue, "Diagnostic"),
      intervention_label: text(repair.issueType || repair.selectedPriceSnapshot?.reparation) || null,
      customer_price: money(repair.total ?? repair.amount),
      status: repairStatus(repair.status),
      public_token: token,
      public_url: getCustomerTrackingPath(
        {
          ...repair,
          publicAccess: {
            token,
            url: repair.publicAccess?.url || "",
            createdAt:
              repair.publicAccess?.createdAt ||
              cleanIso(repair.createdAt || repair.droppedAt) ||
              new Date().toISOString(),
            active: repair.publicAccess?.active !== false,
          },
        },
        ws,
      ),
      public_active: repair.publicAccess?.active !== false,
      created_at: cleanIso(repair.createdAt || repair.droppedAt),
    };
  });
  if (repairs.length) await supabase.from("repairs").upsert(repairs, { onConflict: "id" });

  const events = (payload.repairs ?? []).flatMap((repair) =>
    (repair.history ?? []).map((entry, index) => ({
      id: stableUuid(`event:${workshopId}:${repair.id}:${index}:${entry}`),
      workshop_id: workshopId,
      repair_id: stableUuid(`repair:${workshopId}:${repair.id}`),
      event_type: "history",
      title: text(entry, "Événement"),
      description: null,
      visibility: String(entry).toLowerCase().includes("interne") ? "internal" : "client",
    })),
  );
  if (events.length) await supabase.from("repair_events").upsert(events, { onConflict: "id" });

  const messages = (payload.repairs ?? []).flatMap((repair) =>
    (repair.messages ?? []).map((message) => ({
      id: stableUuid(`message:${workshopId}:${message.id}`),
      workshop_id: workshopId,
      repair_id: stableUuid(`repair:${workshopId}:${repair.id}`),
      author_type: message.authorType,
      author_name: text(message.authorName, "Atelier"),
      visibility: message.visibility,
      body: text(message.body),
      read_by_client: Boolean(message.readByClient),
      read_by_staff: Boolean(message.readByStaff),
      created_at: cleanIso(message.createdAt),
    })),
  );
  if (messages.length) await supabase.from("repair_messages").upsert(messages, { onConflict: "id" });

  const quotes = (payload.quotes ?? []).map((quote) => {
    const token = stableToken("dv", quote.id);
    const total = money(quote.totalTtc ?? quote.totalAmount) ?? 0;
    return {
      id: stableUuid(`quote:${workshopId}:${quote.id}`),
      workshop_id: workshopId,
      client_id: stableUuid(`client:${workshopId}:${quote.customerId}`),
      repair_id: quote.repairId ? stableUuid(`repair:${workshopId}:${quote.repairId}`) : null,
      quote_number: text(quote.number, quote.id),
      status: quoteStatus(quote.status),
      total_ht: total,
      total_ttc: total,
      public_token: token,
      public_url: makePublicUrl("/devis", token),
      public_active: true,
      accepted_at: quote.status === "Accepté" ? cleanIso(quote.updatedAt) || new Date().toISOString() : null,
      refused_at: quote.status === "Refusé" ? cleanIso(quote.updatedAt) || new Date().toISOString() : null,
      created_at: cleanIso(quote.createdAt || quote.date),
    };
  });
  if (quotes.length) {
    await supabase.from("quotes").upsert(quotes, { onConflict: "id" });
    for (const quote of payload.quotes ?? []) {
      await replaceLines(
        supabase,
        "quote_lines",
        "quote_id",
        stableUuid(`quote:${workshopId}:${quote.id}`),
        quote.lines ?? [],
      );
    }
  }

  const invoices = (payload.invoices ?? []).map((invoice) => {
    const token = stableToken("fc", invoice.id);
    const total = (invoice.lines ?? []).reduce((sum, line) => sum + (money(line.total) ?? 0), 0);
    return {
      id: stableUuid(`invoice:${workshopId}:${invoice.id}`),
      workshop_id: workshopId,
      client_id: stableUuid(`client:${workshopId}:${invoice.customerId}`),
      repair_id: invoice.repairId ? stableUuid(`repair:${workshopId}:${invoice.repairId}`) : null,
      quote_id: invoice.quoteId ? stableUuid(`quote:${workshopId}:${invoice.quoteId}`) : null,
      invoice_number: text(invoice.number, invoice.id),
      status: invoiceStatus(invoice.status),
      total_ht: total,
      total_ttc: total,
      public_token: token,
      public_url: makePublicUrl("/facture", token),
      public_active: true,
      created_at: cleanIso(invoice.createdAt || invoice.date),
    };
  });
  if (invoices.length) {
    await supabase.from("invoices").upsert(invoices, { onConflict: "id" });
    for (const invoice of payload.invoices ?? []) {
      await replaceLines(
        supabase,
        "invoice_lines",
        "invoice_id",
        stableUuid(`invoice:${workshopId}:${invoice.id}`),
        invoice.lines ?? [],
      );
    }
  }

  const payments = (payload.payments ?? []).map((payment) => {
    const token = stableToken("py", payment.id);
    return {
      id: stableUuid(`payment:${workshopId}:${payment.id}`),
      workshop_id: workshopId,
      client_id: stableUuid(`client:${workshopId}:${payment.customerId}`),
      repair_id: payment.repairId ? stableUuid(`repair:${workshopId}:${payment.repairId}`) : null,
      invoice_id: payment.invoiceId ? stableUuid(`invoice:${workshopId}:${payment.invoiceId}`) : null,
      payment_number: text(payment.paymentNumber || payment.reference, payment.id),
      amount: money(payment.amount) ?? 0,
      method: text(payment.method, "Carte"),
      status: paymentStatus(payment.status),
      paid_at: cleanIso(payment.date || payment.createdAt),
      public_token: token,
      public_url: makePublicUrl("/recu", token),
      public_active: true,
      created_at: cleanIso(payment.createdAt || payment.date),
    };
  });
  if (payments.length) await supabase.from("payments").upsert(payments, { onConflict: "id" });

  const sales = (payload.sales ?? []).map((sale) => {
    const token = stableToken("vt", sale.id);
    return {
      id: stableUuid(`sale:${workshopId}:${sale.id}`),
      workshop_id: workshopId,
      client_id: sale.customerId ? stableUuid(`client:${workshopId}:${sale.customerId}`) : null,
      sale_number: text(sale.number, sale.id),
      total_ttc: money(sale.total) ?? 0,
      payment_status: saleStatus(sale.status),
      public_token: token,
      public_url: makePublicUrl("/vente", token),
      public_active: true,
      created_at: cleanIso(sale.createdAt),
    };
  });
  if (sales.length) {
    await supabase.from("sales").upsert(sales, { onConflict: "id" });
    for (const sale of payload.sales ?? []) {
      await replaceLines(
        supabase,
        "sale_lines",
        "sale_id",
        stableUuid(`sale:${workshopId}:${sale.id}`),
        sale.lines ?? [],
      );
    }
  }

  const docs = (payload.documents ?? []).map((document) => {
    const type = documentType(document.type);
    const publicVisible = type !== "internal_intervention_sheet";
    const token = publicVisible ? stableToken("dc", document.id) : null;
    const documentNumber =
      type === "quote" && document.quoteId
        ? text((payload.quotes ?? []).find((quote) => quote.id === document.quoteId)?.number)
        : type === "invoice" && document.invoiceId
          ? text((payload.invoices ?? []).find((invoice) => invoice.id === document.invoiceId)?.number)
          : type === "payment_confirmation" && document.paymentId
            ? text((payload.payments ?? []).find((payment) => payment.id === document.paymentId)?.paymentNumber)
            : type === "sale_receipt" && document.saleId
              ? text((payload.sales ?? []).find((sale) => sale.id === document.saleId)?.number)
              : (text(document.title).match(/(?:#|-\s*)([A-Z]+-\d+)/)?.[1] ?? null);
    const linkedUrl =
      type === "repair_intake" && token
        ? makePublicUrl("/document", token)
        : type === "quote" && document.quoteId
          ? makePublicUrl("/devis", stableToken("dv", document.quoteId))
          : type === "invoice" && document.invoiceId
            ? makePublicUrl("/facture", stableToken("fc", document.invoiceId))
            : type === "payment_confirmation" && document.paymentId
              ? makePublicUrl("/recu", stableToken("py", document.paymentId))
              : type === "sale_receipt" && document.saleId
                ? makePublicUrl("/vente", stableToken("vt", document.saleId))
                : document.repairId
                  ? makePublicUrl(
                      "/suivi",
                      (payload.repairs ?? []).find((repair) => repair.id === document.repairId)?.publicAccess?.token ||
                        stableToken("rp", document.repairId),
                    )
                  : null;
    return {
      id: stableUuid(`document:${workshopId}:${document.id}`),
      workshop_id: workshopId,
      client_id: document.customerId ? stableUuid(`client:${workshopId}:${document.customerId}`) : null,
      repair_id: document.repairId ? stableUuid(`repair:${workshopId}:${document.repairId}`) : null,
      quote_id: document.quoteId ? stableUuid(`quote:${workshopId}:${document.quoteId}`) : null,
      invoice_id: document.invoiceId ? stableUuid(`invoice:${workshopId}:${document.invoiceId}`) : null,
      payment_id: document.paymentId ? stableUuid(`payment:${workshopId}:${document.paymentId}`) : null,
      sale_id: document.saleId ? stableUuid(`sale:${workshopId}:${document.saleId}`) : null,
      document_type: type,
      document_number: documentNumber || null,
      title: text(document.title, "Document"),
      public_visible: publicVisible,
      public_token: token,
      public_url: publicVisible ? linkedUrl : null,
      file_url: text(document.fileUrl) || null,
      status: "ready",
      created_at: cleanIso(document.createdAt),
    };
  });
  if (docs.length) await supabase.from("documents").upsert(docs, { onConflict: "id" });

  const stockItems = (payload.stockItems ?? []).map((item) => ({
    id: stableUuid(`stock:${workshopId}:${item.id}`),
    workshop_id: workshopId,
    sku: text(item.sku) || null,
    name: text(item.name || item.part, "Article"),
    category: text(item.categoryName || item.category) || null,
    item_type: stockItemType(item.itemType, item.productCategory || item.categoryName || item.category),
    repair_enabled: item.repairEnabled !== false,
    counter_sale_enabled: item.counterSaleEnabled === true,
    active: item.active !== false,
    purchase_price: money(item.purchasePrice),
    sale_price: money(item.salePrice),
    quantity: money(item.stock ?? item.quantity) ?? 0,
    threshold: money(item.threshold),
    supplier: text(item.supplier) || null,
    reconditioning_file_id: text(item.reconditioningFileId) || null,
    created_at: cleanIso(item.createdAt),
    updated_at: cleanIso(item.updatedAt),
  }));
  if (stockItems.length) await supabase.from("stock_items").upsert(stockItems, { onConflict: "id" });

  const stockMovements = ((payload as any).stockMovements ?? []).map((movement: any) => ({
    id: stableUuid(`stock_movement:${workshopId}:${movement.id}`),
    organization_id: workshopId,
    shop_id: text(movement.shopId) || null,
    stock_item_id: movement.stockItemId
      ? stableUuid(`stock:${workshopId}:${movement.stockItemId}`)
      : text(movement.stockItemId),
    movement_type: text(movement.movementType, "manual_adjustment"),
    quantity_delta: money(movement.quantityDelta) ?? 0,
    quantity_before: money(movement.quantityBefore) ?? 0,
    quantity_after: money(movement.quantityAfter) ?? 0,
    unit_cost: money(movement.unitCost),
    total_cost: money(movement.totalCost),
    reason: text(movement.reason) || null,
    source_module: text(movement.sourceModule, "stock"),
    source_id: text(movement.sourceId) || null,
    linked_repair_id: movement.linkedRepairId ? stableUuid(`repair:${workshopId}:${movement.linkedRepairId}`) : null,
    linked_reconditioning_device_id: text(movement.linkedReconditioningDeviceId) || null,
    linked_sale_id: movement.linkedSaleId ? stableUuid(`sale:${workshopId}:${movement.linkedSaleId}`) : null,
    linked_purchase_id: movement.linkedPurchaseId
      ? stableUuid(`purchase:${workshopId}:${movement.linkedPurchaseId}`)
      : null,
    linked_supplier_invoice_id: text(movement.linkedSupplierInvoiceId) || null,
    actor_id: text(movement.actorId) || null,
    created_at: cleanIso(movement.createdAt),
    metadata: movement.metadata && typeof movement.metadata === "object" ? movement.metadata : {},
  }));
  if (stockMovements.length) await supabase.from("stock_movements").upsert(stockMovements, { onConflict: "id" });

  return NextResponse.json({ ok: true });
}
