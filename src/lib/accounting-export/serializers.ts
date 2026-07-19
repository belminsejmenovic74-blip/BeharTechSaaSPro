import "server-only";

import * as XLSX from "xlsx";

import { formatFrenchAccountingDate, type AccountingExportLine, type PreparedAccountingExport } from "./core";

export const invoiceExportHeaders: string[] = [
  "Numéro de facture",
  "Date d'émission",
  "Type de document",
  "Client",
  "Entreprise du client",
  "SIRET du client",
  "N° TVA du client",
  "Référence du dossier",
  "Description",
  "Montant HT",
  "TVA",
  "Taux de TVA (%)",
  "Montant TTC",
  "Motif d'exonération",
  "Boutique",
  "Devise",
  "PDF de la facture",
];

function spreadsheetRow(line: AccountingExportLine): Array<string | number> {
  return [
    line.invoiceNumber,
    formatFrenchAccountingDate(line.invoiceDate),
    line.documentType,
    line.customerName,
    line.customerCompany,
    line.customerSiret,
    line.customerVatNumber,
    line.repairReference,
    line.description,
    line.amountExcludingTax,
    line.vatAmount,
    line.vatRate,
    line.amountIncludingTax,
    line.vatExemptionReason,
    line.shopName,
    line.currency,
    line.pdfUrl || line.pdfStoragePath || "",
  ];
}

function safeCsvCell(value: string | number): string {
  if (typeof value === "number") return value.toFixed(2).replace(".", ",");
  const safe = /^[=+@]/.test(value) || /^-\D/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function createAccountingCsv(exportData: PreparedAccountingExport): Buffer {
  const rows = [invoiceExportHeaders, ...exportData.lines.map(spreadsheetRow)];
  const content = rows.map((row) => row.map(safeCsvCell).join(";")).join("\r\n");
  return Buffer.from(`\uFEFF${content}`, "utf8");
}

export function createAccountingWorkbook(exportData: PreparedAccountingExport): Buffer {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([invoiceExportHeaders, ...exportData.lines.map(spreadsheetRow)]);
  sheet["!cols"] = invoiceExportHeaders.map((header, index) => ({
    wch: Math.min(42, Math.max(index === 8 ? 32 : 14, header.length + 2)),
  }));
  for (const column of [9, 10, 11, 12]) {
    for (let row = 2; row <= exportData.lines.length + 1; row += 1) {
      const address = XLSX.utils.encode_cell({ r: row - 1, c: column });
      if (sheet[address]) sheet[address].z = "0.00";
    }
  }
  sheet["!autofilter"] = {
    ref: `A1:${XLSX.utils.encode_col(invoiceExportHeaders.length - 1)}${exportData.lines.length + 1}`,
  };
  XLSX.utils.book_append_sheet(workbook, sheet, "Factures");

  const summary = XLSX.utils.aoa_to_sheet([
    ["Indicateur", "Montant"],
    ["Nombre de documents", exportData.summary.invoiceCount],
    ["Nombre d'avoirs", exportData.summary.creditNoteCount],
    ["CA facturé HT", exportData.summary.billedRevenueExcludingTax],
    ["Montant de TVA facturée", exportData.summary.vatAmount],
    ["CA facturé TTC", exportData.summary.billedRevenueIncludingTax],
    ["Total TTC des avoirs", exportData.summary.creditNotesIncludingTax],
  ]);
  summary["!cols"] = [{ wch: 32 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, summary, "Résumé facturé");
  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx", compression: true }));
}
