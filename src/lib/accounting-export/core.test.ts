import { describe, expect, it } from "vitest";

import type { BeharDocument, Customer, Invoice, WorkshopSettings } from "@/lib/behar-store";

import { prepareAccountingExport, type AccountingExportFilters, type AccountingExportSource } from "./core";

const filters: AccountingExportFilters = {
  startDate: "2026-07-01",
  endDate: "2026-07-31",
  shopId: "all",
  vatRate: "all",
};

function invoice(id: string, status: Invoice["status"], documentType: Invoice["documentType"] = "invoice"): Invoice {
  return {
    id,
    billingCountry: "FR",
    currency: "EUR",
    locale: "fr-FR",
    shopId: "shop_main",
    number: documentType === "credit_note" ? `AV-${id}` : `FAC-${id}`,
    customerId: "customer-1",
    status,
    documentType,
    date: "10/07/2026",
    lines: [{ id: `line-${id}`, description: "Réparation écran", quantity: 1, unitPrice: 120, total: 120 }],
    sourceType: "manual",
    snapshot: {
      version: 1,
      generatedAt: "2026-07-10T08:00:00.000Z",
      documentType: "invoice",
      documentNumber: `FAC-${id}`,
      status,
      currency: "EUR",
      country: "FR",
      locale: "fr-FR",
      vat: { applicable: true, rate: 20 },
      workshop: { name: "Atelier", country: "FR" },
      client: { id: "customer-1", name: "Client Test" },
      lines: [],
      totals: { ht: 100, tva: 20, ttc: 120 },
    },
  } as unknown as Invoice;
}

function source(invoices: Invoice[]): AccountingExportSource {
  const customer = {
    id: "customer-1",
    shopId: "shop_main",
    name: "Client Test",
    initials: "CT",
    phone: "",
    email: "",
    device: "",
    lastVisit: "",
    totalSpent: 0,
    status: "Actif",
    lastRepair: "",
    interventions: 0,
    source: "Test",
  } satisfies Customer;
  const documents = invoices.map(
    (entry): BeharDocument => ({
      id: `doc-${entry.id}`,
      shopId: "shop_main",
      type: "invoice",
      title: entry.number,
      customerId: "customer-1",
      invoiceId: entry.id,
      createdAt: "2026-07-10T08:00:00.000Z",
      storagePath: `${entry.id}.pdf`,
    }),
  );
  return {
    invoices,
    customers: [customer],
    repairs: [],
    documents,
    shops: [{ id: "shop_main", name: "Boutique principale", timezone: "Europe/Paris" }],
    workshopSettings: {
      vatApplicable: true,
      vatRate: 20,
      taxRegime: "vat_subject",
      currency: "EUR",
    } as WorkshopSettings,
  };
}

describe("prepareAccountingExport", () => {
  it("exporte les factures émises et avoirs, jamais les brouillons ou annulations", () => {
    const result = prepareAccountingExport(
      source([
        invoice("issued", "Envoyée"),
        invoice("credit", "Envoyée", "credit_note"),
        invoice("draft", "Brouillon"),
        invoice("cancelled", "Annulée"),
      ]),
      filters,
    );

    expect(result.lines.map((line) => line.documentType)).toEqual(["Avoir", "Facture"]);
    expect(result.summary).toEqual({
      invoiceCount: 2,
      creditNoteCount: 1,
      billedRevenueExcludingTax: 0,
      vatAmount: 0,
      billedRevenueIncludingTax: 0,
      creditNotesIncludingTax: 120,
    });
  });

  it("filtre uniquement par période, boutique et TVA", () => {
    const data = source([invoice("issued", "Envoyée")]);
    expect(prepareAccountingExport(data, { ...filters, shopId: "other" }).lines).toHaveLength(0);
    expect(prepareAccountingExport(data, { ...filters, vatRate: 10 }).lines).toHaveLength(0);
    expect(prepareAccountingExport(data, { ...filters, vatRate: 20 }).lines).toHaveLength(1);
  });

  it("conserve le motif d'exonération pour une facture sans TVA", () => {
    const noVat = invoice("no-vat", "Envoyée");
    if (!noVat.snapshot) throw new Error("Snapshot de test manquant");
    noVat.snapshot = {
      ...noVat.snapshot,
      vat: { applicable: false, rate: 0, mention: "TVA non applicable, art. 293 B du CGI" },
      totals: { ht: 120, tva: 0, ttc: 120 },
    };
    const result = prepareAccountingExport(source([noVat]), filters);
    expect(result.lines[0].vatExemptionReason).toContain("293 B");
  });
});
