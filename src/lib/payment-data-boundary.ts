/**
 * Boundary applied before any local or cloud persistence.
 *
 * Legacy payment objects remain typed temporarily so old snapshots can still be
 * read during the separately approved purge. They must never be written back.
 */

const FORBIDDEN_KEYS = new Set([
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

const FINANCIAL_RESULT = /^(paid|pay[ée]e?|partially[_ -]?paid|refunded|settled|r[ée]gl[ée]e?)$/i;
const PAYMENT_TEXT =
  /(?:paiement|r[èe]glement|encaiss|pay[ée]|impay[ée]|rembours|reste\s+[àa]\s+payer|esp[èe]ces|carte bancaire re[çc]ue)/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!isRecord(value)) return value;

  const clean: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    clean[key] = sanitizeValue(nested);
  }
  return clean;
}

function withoutPaymentTimeline(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.filter((entry) => typeof entry !== "string" || !PAYMENT_TEXT.test(entry));
}

/** Removes all legacy financial-result data from a store-shaped object. */
export function sanitizePaymentDataForPersistence<T extends Record<string, unknown>>(state: T): T {
  const sanitized = sanitizeValue(state) as Record<string, unknown>;

  // Explicit empty collection overwrites older persisted values during the next save.
  sanitized.payments = [];
  sanitized.selectedPaymentId = "";

  if (Array.isArray(sanitized.invoices)) {
    sanitized.invoices = sanitized.invoices.map((value) => {
      if (!isRecord(value)) return value;
      return {
        ...value,
        status: typeof value.status === "string" && FINANCIAL_RESULT.test(value.status) ? "Envoyée" : value.status,
      };
    });
  }

  if (Array.isArray(sanitized.repairs)) {
    sanitized.repairs = sanitized.repairs.map((value) =>
      isRecord(value) ? { ...value, history: withoutPaymentTimeline(value.history) } : value,
    );
  }

  if (Array.isArray(sanitized.sales)) {
    sanitized.sales = sanitized.sales.map((value) => {
      if (!isRecord(value)) return value;
      return {
        ...value,
        status: typeof value.status === "string" && FINANCIAL_RESULT.test(value.status) ? "Brouillon" : value.status,
      };
    });
  }

  if (Array.isArray(sanitized.documents)) {
    sanitized.documents = sanitized.documents.filter(
      (value) =>
        !isRecord(value) ||
        !["payment", "payment_receipt", "payment_confirmation", "sale-receipt"].includes(String(value.type ?? "")),
    );
  }

  if (Array.isArray(sanitized.auditLogs)) {
    sanitized.auditLogs = sanitized.auditLogs.filter(
      (value) =>
        !isRecord(value) ||
        (String(value.targetType ?? "") !== "payment" &&
          !String(value.action ?? "").startsWith("payment.") &&
          !PAYMENT_TEXT.test(String(value.message ?? ""))),
    );
  }

  if (Array.isArray(sanitized.notifications)) {
    sanitized.notifications = sanitized.notifications.filter(
      (value) =>
        !isRecord(value) ||
        (String(value.targetType ?? "") !== "payment" &&
          !PAYMENT_TEXT.test(`${String(value.title ?? "")} ${String(value.message ?? "")}`)),
    );
  }

  return sanitized as T;
}

export function containsForbiddenPaymentProperty(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenPaymentProperty);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(
    ([key, nested]) => FORBIDDEN_KEYS.has(key) || containsForbiddenPaymentProperty(nested),
  );
}
