import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error("Supabase server configuration is missing.");

const db = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function exactCount(label, query) {
  const { count, error } = await query;
  return error ? { label, error: error.message } : { label, count: count ?? 0 };
}

const results = await Promise.all([
  exactCount("legacy_payments", db.from("payments").select("id", { count: "exact", head: true })),
  exactCount(
    "sales_with_non_default_payment_status",
    db.from("sales").select("id", { count: "exact", head: true }).neq("payment_status", "draft"),
  ),
  exactCount(
    "legacy_payment_documents",
    db
      .from("documents")
      .select("id", { count: "exact", head: true })
      .or("payment_id.not.is.null,document_type.in.(payment,payment_confirmation,payment_receipt,sale_receipt)"),
  ),
  exactCount(
    "snapshots_with_payment_collection",
    db.from("workshop_snapshots").select("workshop_id", { count: "exact", head: true }).not("state->payments", "is", null),
  ),
  exactCount(
    "invoices_with_payment_result_status",
    db
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .in("status", ["paid", "partially_paid", "unpaid", "refunded"]),
  ),
  exactCount(
    "external_requests_with_amount",
    db.from("external_payment_requests").select("id", { count: "exact", head: true }).not("requested_amount", "is", null),
  ),
  exactCount(
    "external_requests_with_technical_state",
    db.from("external_payment_requests").select("id", { count: "exact", head: true }).not("technical_state", "is", null),
  ),
]);

const paymentBounds = await db
  .from("payments")
  .select("created_at")
  .order("created_at", { ascending: true })
  .limit(1)
  .maybeSingle();
const paymentLast = await db
  .from("payments")
  .select("created_at")
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

const snapshotRows = await db
  .from("workshop_snapshots")
  .select("workshop_id,payments:state->payments")
  .not("state->payments", "is", null);
const snapshotPaymentSummary = snapshotRows.error
  ? { error: snapshotRows.error.message }
  : Object.values(
      (snapshotRows.data ?? []).reduce((groups, row) => {
        const workshopId = String(row.workshop_id);
        const current = groups[workshopId] ?? {
          workshop_id: workshopId,
          snapshots_with_key: 0,
          snapshots_with_non_empty_collection: 0,
          legacy_payment_objects: 0,
        };
        const payments = Array.isArray(row.payments) ? row.payments : [];
        current.snapshots_with_key += 1;
        current.snapshots_with_non_empty_collection += Number(payments.length > 0);
        current.legacy_payment_objects += payments.length;
        groups[workshopId] = current;
        return groups;
      }, {}),
    );

const paymentObjectShape = snapshotRows.error
  ? { error: snapshotRows.error.message }
  : (() => {
      const keyCounts = {};
      const typeCounts = {};
      const statusCounts = {};
      const methodCounts = {};
      let objects = 0;
      for (const row of snapshotRows.data ?? []) {
        const payments = Array.isArray(row.payments) ? row.payments : [];
        for (const payment of payments) {
          if (!payment || typeof payment !== "object" || Array.isArray(payment)) continue;
          objects += 1;
          for (const [key, value] of Object.entries(payment)) {
            keyCounts[key] = (keyCounts[key] ?? 0) + 1;
            const valueType = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
            typeCounts[`${key}:${valueType}`] = (typeCounts[`${key}:${valueType}`] ?? 0) + 1;
          }
          const status = typeof payment.status === "string" ? payment.status : "<absent>";
          const method = typeof payment.method === "string" ? payment.method : "<absent>";
          statusCounts[status] = (statusCounts[status] ?? 0) + 1;
          methodCounts[method] = (methodCounts[method] ?? 0) + 1;
        }
      }
      return {
        objects,
        fields: Object.fromEntries(Object.entries(keyCounts).sort(([a], [b]) => a.localeCompare(b))),
        field_types: Object.fromEntries(Object.entries(typeCounts).sort(([a], [b]) => a.localeCompare(b))),
        statuses: statusCounts,
        methods: methodCounts,
      };
    })();

const fullSnapshotRows = await db.from("workshop_snapshots").select("state");
const forbiddenPropertyNames = new Set([
  "payment",
  "paymentId",
  "paymentIds",
  "paymentStatus",
  "paymentMethod",
  "paymentMethodNote",
  "paymentCustomMethod",
  "paymentAmount",
  "paymentPaidAt",
  "paymentReference",
  "paymentRecordedBy",
  "paymentRecordedOutsideBeharTechPro",
  "paymentNote",
  "amountPaid",
  "paidAmount",
  "paidAt",
  "remainingAmount",
  "cashReceived",
  "cashRegister",
  "transactions",
  "refunds",
  "settlements",
]);
const financialResult = /^(paid|pay[ée]e?|partially[_ -]?paid|refunded|settled|r[ée]gl[ée]e?)$/i;
let forbiddenNestedProperties = 0;
let nonEmptyPaymentCollections = 0;
let financialResultStatuses = 0;
let paymentDocuments = 0;

function scanNested(value) {
  if (Array.isArray(value)) {
    for (const entry of value) scanNested(entry);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (forbiddenPropertyNames.has(key)) forbiddenNestedProperties += 1;
    scanNested(nested);
  }
}

if (!fullSnapshotRows.error) {
  for (const row of fullSnapshotRows.data ?? []) {
    const state = row.state ?? {};
    if (Array.isArray(state.payments) && state.payments.length > 0) nonEmptyPaymentCollections += 1;
    scanNested(state);
    for (const invoice of Array.isArray(state.invoices) ? state.invoices : []) {
      if (typeof invoice?.status === "string" && financialResult.test(invoice.status)) financialResultStatuses += 1;
    }
    for (const sale of Array.isArray(state.sales) ? state.sales : []) {
      if (typeof sale?.status === "string" && financialResult.test(sale.status)) financialResultStatuses += 1;
    }
    for (const document of Array.isArray(state.documents) ? state.documents : []) {
      if (["payment", "payment_receipt", "payment_confirmation", "sale-receipt"].includes(String(document?.type ?? ""))) {
        paymentDocuments += 1;
      }
    }
  }
}

console.log(
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      counts: results,
      legacy_payment_created_at: {
        first: paymentBounds.error ? null : paymentBounds.data?.created_at ?? null,
        last: paymentLast.error ? null : paymentLast.data?.created_at ?? null,
      },
      snapshot_payment_summary: snapshotPaymentSummary,
      payment_object_shape: paymentObjectShape,
      residual_payment_result_scan: fullSnapshotRows.error
        ? { error: fullSnapshotRows.error.message }
        : {
            forbidden_nested_properties: forbiddenNestedProperties,
            non_empty_payment_collections: nonEmptyPaymentCollections,
            financial_result_statuses: financialResultStatuses,
            payment_documents: paymentDocuments,
          },
    },
    null,
    2,
  ),
);
