import { Buffer } from "node:buffer";

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });

if (process.env.CONFIRM_TEST_PAYMENT_PURGE !== "BEHAR_TEST_DATA_53") {
  throw new Error("Set CONFIRM_TEST_PAYMENT_PURGE=BEHAR_TEST_DATA_53 to authorize this narrowly scoped purge.");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error("Supabase server configuration is missing.");

const db = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const forbiddenKeys = new Set([
  "payments",
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
const paymentText =
  /(?:paiement|r[èe]glement|encaiss|pay[ée]|impay[ée]|rembours|reste\s+[àa]\s+payer|esp[èe]ces|carte bancaire re[çc]ue)/i;

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function sanitizeValue(value) {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !forbiddenKeys.has(key))
      .map(([key, nested]) => [key, sanitizeValue(nested)]),
  );
}

function sanitizeSnapshot(state) {
  const sanitized = sanitizeValue(state);
  sanitized.payments = [];
  sanitized.selectedPaymentId = "";
  if (Array.isArray(sanitized.invoices)) {
    sanitized.invoices = sanitized.invoices.map((invoice) =>
      isRecord(invoice) && typeof invoice.status === "string" && financialResult.test(invoice.status)
        ? { ...invoice, status: "Envoyée" }
        : invoice,
    );
  }
  if (Array.isArray(sanitized.sales)) {
    sanitized.sales = sanitized.sales.map((sale) =>
      isRecord(sale) && typeof sale.status === "string" && financialResult.test(sale.status)
        ? { ...sale, status: "Brouillon" }
        : sale,
    );
  }
  if (Array.isArray(sanitized.repairs)) {
    sanitized.repairs = sanitized.repairs.map((repair) =>
      isRecord(repair) && Array.isArray(repair.history)
        ? { ...repair, history: repair.history.filter((entry) => typeof entry !== "string" || !paymentText.test(entry)) }
        : repair,
    );
  }
  if (Array.isArray(sanitized.documents)) {
    sanitized.documents = sanitized.documents.filter(
      (document) =>
        !isRecord(document) ||
        !["payment", "payment_receipt", "payment_confirmation", "sale-receipt"].includes(String(document.type ?? "")),
    );
  }
  if (Array.isArray(sanitized.auditLogs)) {
    sanitized.auditLogs = sanitized.auditLogs.filter(
      (entry) =>
        !isRecord(entry) ||
        (String(entry.targetType ?? "") !== "payment" &&
          !String(entry.action ?? "").startsWith("payment.") &&
          !paymentText.test(String(entry.message ?? ""))),
    );
  }
  if (Array.isArray(sanitized.notifications)) {
    sanitized.notifications = sanitized.notifications.filter(
      (entry) =>
        !isRecord(entry) ||
        (String(entry.targetType ?? "") !== "payment" &&
          !paymentText.test(`${String(entry.title ?? "")} ${String(entry.message ?? "")}`)),
    );
  }
  return sanitized;
}

const { data: rows, error } = await db
  .from("workshop_snapshots")
  .select("id,workshop_id,state")
  .not("state->payments", "is", null);
if (error) throw error;

const targets = rows ?? [];
const objectCount = targets.reduce(
  (total, row) => total + (Array.isArray(row.state?.payments) ? row.state.payments.length : 0),
  0,
);
if (targets.length !== 27 || ![0, 53].includes(objectCount)) {
  throw new Error(`Precondition failed: expected 27 snapshots and 0 or 53 objects, found ${targets.length}/${objectCount}.`);
}

for (const row of targets) {
  const state = sanitizeSnapshot(row.state);
  const stateSizeBytes = Buffer.byteLength(JSON.stringify(state), "utf8");
  const { data: updated, error: updateError } = await db
    .from("workshop_snapshots")
    .update({ state, state_size_bytes: stateSizeBytes })
    .eq("id", row.id)
    .eq("workshop_id", row.workshop_id)
    .select("id")
    .single();
  if (updateError || !updated) throw updateError ?? new Error(`Snapshot update failed for ${row.workshop_id}.`);
}

console.log(JSON.stringify({ sanitized_snapshots: targets.length, removed_test_payment_objects: objectCount }));
