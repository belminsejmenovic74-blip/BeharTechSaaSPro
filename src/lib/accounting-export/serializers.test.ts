import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import type { PreparedAccountingExport } from "./core";
import { createAccountingCsv, createAccountingWorkbook, invoiceExportHeaders } from "./serializers";
import { createZip } from "./zip";

const prepared: PreparedAccountingExport = {
  filters: { startDate: "2026-07-01", endDate: "2026-07-31", shopId: "all", vatRate: "all" },
  lines: [
    {
      invoiceId: "invoice-1",
      invoiceDate: "2026-07-10",
      invoiceNumber: "FAC-2026-0001",
      documentType: "Facture",
      customerName: "Client Test",
      customerCompany: "Test SARL",
      customerSiret: "12345678900012",
      customerVatNumber: "FR00123456789",
      description: "Réparation écran",
      repairReference: "REP-2026-0042",
      amountExcludingTax: 100,
      vatRate: 20,
      vatAmount: 20,
      amountIncludingTax: 120,
      shopId: "shop_main",
      shopName: "Boutique principale",
      currency: "EUR",
      vatExemptionReason: "",
    },
  ],
  summary: {
    invoiceCount: 1,
    creditNoteCount: 0,
    billedRevenueExcludingTax: 100,
    vatAmount: 20,
    billedRevenueIncludingTax: 120,
    creditNotesIncludingTax: 0,
  },
  warnings: [],
  vatRates: [20],
  timezone: "Europe/Paris",
};

describe("invoice export serializers", () => {
  it("n'inclut aucune colonne de règlement", () => {
    expect(invoiceExportHeaders.join(" ")).not.toMatch(/encaiss|reste à payer|statut de paiement|mode de paiement/i);
    const csv = createAccountingCsv(prepared).toString("utf8");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"FAC-2026-0001"');
  });

  it("produit un classeur XLSX limité aux factures et au CA facturé", () => {
    const workbook = XLSX.read(createAccountingWorkbook(prepared), { type: "buffer" });
    expect(workbook.SheetNames).toEqual(["Factures", "Résumé facturé"]);
    expect(workbook.Sheets.Factures.A2.v).toBe("FAC-2026-0001");
    expect(workbook.Sheets.Factures.J2.v).toBe(100);
  });

  it("produit une archive ZIP réelle contenant le CSV", () => {
    const zip = createZip([{ name: "factures.csv", data: createAccountingCsv(prepared) }]);
    expect(zip.subarray(0, 4).toString("hex")).toBe("504b0304");
    expect(zip.includes(Buffer.from("factures.csv"))).toBe(true);
  });
});
