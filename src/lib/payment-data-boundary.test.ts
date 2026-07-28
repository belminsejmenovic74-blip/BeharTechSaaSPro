import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { useBeharStore } from "@/lib/behar-store";

import { containsForbiddenPaymentProperty, sanitizePaymentDataForPersistence } from "./payment-data-boundary";

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function routeSources() {
  const routes: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name === "route.ts") routes.push(readFileSync(path, "utf8"));
    }
  };
  walk(join(root, "src/app/api"));
  return routes.join("\n");
}

describe("payment data boundary", () => {
  it("strips legacy payment results before local or cloud persistence", () => {
    const clean = sanitizePaymentDataForPersistence({
      payments: [{ amount: 120, method: "card", status: "paid" }],
      selectedPaymentId: "legacy",
      invoices: [{ id: "invoice", status: "Payée", paidAt: "2026-07-17", amountPaid: 120 }],
      repairs: [{ id: "repair", paymentStatus: "Réglée", history: ["Diagnostic", "Paiement indiqué"] }],
      documents: [
        { id: "receipt", type: "payment_receipt" },
        { id: "invoice", type: "invoice" },
      ],
    });

    expect(clean.payments).toEqual([]);
    expect(clean.selectedPaymentId).toBe("");
    expect(clean.invoices).toEqual([{ id: "invoice", status: "Envoyée" }]);
    expect(clean.repairs).toEqual([{ id: "repair", history: ["Diagnostic"] }]);
    expect(clean.documents).toEqual([{ id: "invoice", type: "invoice" }]);
    const { payments: tombstone, ...persistedBusinessData } = clean;
    expect(tombstone).toEqual([]);
    expect(containsForbiddenPaymentProperty(persistedBusinessData)).toBe(false);
  });

  it("persists the explicit outside-Behar turnover declaration", () => {
    const declaration = {
      status: "Réglé",
      amount: 149,
      date: "2026-07-28",
      method: "Carte bancaire",
      recordedOutsideBeharTechPro: true,
      recordedAt: "2026-07-28T12:00:00.000Z",
      recordedBy: "Réparateur",
    };
    const clean = sanitizePaymentDataForPersistence({
      repairs: [{ id: "repair", externalSettlement: declaration }],
    });

    expect(clean.repairs).toEqual([{ id: "repair", externalSettlement: declaration }]);
    expect((clean as Record<string, unknown>).payments).toEqual([]);
    expect(containsForbiddenPaymentProperty({ repairs: clean.repairs })).toBe(false);
  });

  it("keeps every historical payment mutator permanently read-only", () => {
    const before = useBeharStore.getState();
    const paymentCount = before.payments.length;
    expect(
      before.addPayment({
        customerId: before.customers[0]?.id || "customer",
        amount: 10,
        method: "Carte",
        status: "Payé",
        date: "2026-07-17",
        reference: "blocked",
      }),
    ).toBe("");
    expect(before.markInvoicePaid(before.invoices[0]?.id || "invoice", "Carte")).toBe("");
    expect(before.markRepairAsPaid(before.repairs[0]?.id || "repair", "Carte")).toBe("");
    before.updatePaymentStatus(before.payments[0]?.id || "payment", "Annulé");
    expect(useBeharStore.getState().payments).toHaveLength(paymentCount);
  });

  it("has no API endpoint capable of inserting or updating a received payment", () => {
    const routes = routeSources();
    expect(routes).not.toMatch(/\.from\(["']payments["']\)[\s\S]{0,180}\.(?:insert|upsert|update)\(/);
    expect(source("src/app/api/behar/sync/route.ts")).not.toMatch(/payload\.payments|payment_status\s*:/);
    expect(source("src/app/api/external-payments/paypal/return/route.ts")).not.toMatch(/capturePayPalOrder|\.from\(/);
  });

  it("requires an authenticated organization role for external payment links", () => {
    const security = source("src/lib/server/external-payments/security.ts");
    expect(security).toContain("Session entreprise authentifiée requise");
    expect(security).toContain('["owner", "admin"]');
    expect(security).toMatch(/owner['"], ['"]admin['"], ['"]technician['"], ['"]member/);
  });

  it("keeps invoice exports free of collection data and accounting entries", () => {
    const exportSource = [
      source("src/lib/accounting-export/core.ts"),
      source("src/lib/accounting-export/serializers.ts"),
      source("src/app/api/behar/accounting-exports/route.ts"),
    ].join("\n");
    expect(exportSource).not.toMatch(
      /amountPaid|paidAt|paymentMethod|cashReceived|paymentStatus|collectedAmount|outstandingAmount|sales_journal|411000|706000/,
    );
  });

  it("freezes legacy columns and finalized invoices in the additive migration", () => {
    const migration = source("supabase/migrations/20260717160315_lock_legacy_payment_writes.sql");
    expect(migration).toMatch(/before insert or update or delete on public\.payments/i);
    expect(migration).toMatch(/finalized_invoice_cannot_be_deleted/);
    expect(migration).toMatch(/finalized_invoice_is_immutable_use_credit_note/);
    expect(migration).toMatch(/finalized_invoice_lines_are_immutable_use_credit_note/);
    expect(migration).toMatch(/invoice_document_audit/);
    expect(migration).not.toMatch(/drop table\s+public\.payments|drop column\s+payment_id/i);
  });

  it("persists only an external provider pointer for new payment requests", () => {
    const route = source("src/app/api/external-payments/requests/route.ts");
    const migration = source("supabase/migrations/20260717163000_minimize_external_payment_request_storage.sql");
    expect(route).not.toMatch(/requested_amount:|currency,\s*delivery_channel:|sent_at:/);
    expect(route).not.toMatch(/technical_state:\s*"dispatch_error"/);
    expect(migration).toMatch(/external_payment_request_forbidden_persistence/);
    expect(migration).toMatch(/new\.requested_amount is not null/);
    expect(migration).toMatch(/new\.technical_state is not null/);
    expect(migration).not.toMatch(/drop column|drop table/i);
  });

  it("rejects future forbidden payment-result columns in later migrations", () => {
    const forbidden =
      /add\s+column[^;]*(amountPaid|paidAt|paymentMethod|cashReceived|paymentStatus|amount_paid|paid_at|payment_method|cash_received|payment_status)/i;
    const futureMigrations = readdirSync(join(root, "supabase/migrations"))
      .filter((name) => name > "20260717160315_lock_legacy_payment_writes.sql" && name.endsWith(".sql"))
      .map((name) => readFileSync(join(root, "supabase/migrations", name), "utf8"));
    expect(futureMigrations.join("\n")).not.toMatch(forbidden);
  });
});
