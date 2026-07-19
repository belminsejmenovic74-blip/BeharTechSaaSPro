import { format, isValid, parse } from "date-fns";
import { fr } from "date-fns/locale";

import type { BeharDocument, Customer, Invoice, Repair, WorkshopSettings } from "@/lib/behar-store";

export const ACCOUNTING_EXPORT_FORMATS = ["csv", "xlsx", "zip"] as const;
export type AccountingExportFormat = (typeof ACCOUNTING_EXPORT_FORMATS)[number];

export type AccountingExportFilters = {
  startDate: string;
  endDate: string;
  shopId: string | "all";
  vatRate: number | "all";
};

export type AccountingShop = { id: string; name: string; timezone?: string };

type AccountingCustomer = Customer & {
  companyName?: string;
  company?: string;
  siret?: string;
  vatNumber?: string;
  tvaNumber?: string;
};

type AccountingInvoice = Invoice & {
  documentType?: "invoice" | "credit_note";
  vatExemptionReason?: string;
};

export type AccountingExportSource = {
  invoices: AccountingInvoice[];
  customers: AccountingCustomer[];
  repairs: Repair[];
  documents: BeharDocument[];
  shops: AccountingShop[];
  workshopSettings: WorkshopSettings;
};

export type AccountingExportLine = {
  invoiceId: string;
  invoiceDate: string;
  invoiceNumber: string;
  documentType: "Facture" | "Avoir";
  customerName: string;
  customerCompany: string;
  customerSiret: string;
  customerVatNumber: string;
  description: string;
  repairReference: string;
  amountExcludingTax: number;
  vatRate: number;
  vatAmount: number;
  amountIncludingTax: number;
  shopId: string;
  shopName: string;
  currency: "EUR" | "CHF";
  vatExemptionReason: string;
  pdfUrl?: string;
  pdfStoragePath?: string;
};

export type AccountingExportSummary = {
  invoiceCount: number;
  creditNoteCount: number;
  billedRevenueExcludingTax: number;
  vatAmount: number;
  billedRevenueIncludingTax: number;
  creditNotesIncludingTax: number;
};

export type AccountingExportWarning = {
  code: "missing_pdf" | "inconsistent_amount";
  message: string;
  invoiceNumber: string;
};

export type PreparedAccountingExport = {
  filters: AccountingExportFilters;
  lines: AccountingExportLine[];
  summary: AccountingExportSummary;
  warnings: AccountingExportWarning[];
  vatRates: number[];
  timezone: string;
};

const frenchMonths: Record<string, number> = {
  janvier: 1,
  fevrier: 2,
  février: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  août: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  decembre: 12,
  décembre: 12,
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function safeNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateInTimezone(value: string | undefined, timezone: string): string | null {
  const source = String(value ?? "").trim();
  if (!source) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) return source;
  const frenchNumeric = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(source);
  if (frenchNumeric) {
    return `${frenchNumeric[3]}-${frenchNumeric[2].padStart(2, "0")}-${frenchNumeric[1].padStart(2, "0")}`;
  }
  const frenchWords = /^(\d{1,2})\s+([a-zàâçéèêëîïôûùüÿñæœ]+)\s+(\d{4})/i.exec(source.toLowerCase());
  if (frenchWords && frenchMonths[frenchWords[2]]) {
    return `${frenchWords[3]}-${String(frenchMonths[frenchWords[2]]).padStart(2, "0")}-${frenchWords[1].padStart(2, "0")}`;
  }
  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsed);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function formatFrenchAccountingDate(value: string): string {
  const parsed = parse(value, "yyyy-MM-dd", new Date(), { locale: fr });
  return isValid(parsed) ? format(parsed, "dd/MM/yyyy", { locale: fr }) : value;
}

function invoiceTotals(invoice: AccountingInvoice, settings: WorkshopSettings) {
  const totalIncludingTax = roundMoney(
    invoice.snapshot?.totals.ttc ?? invoice.lines.reduce((sum, line) => sum + safeNumber(line.total), 0),
  );
  const vatApplicable =
    invoice.snapshot?.vat.applicable ?? settings.vatApplicable ?? settings.taxRegime === "vat_subject";
  const vatRate = vatApplicable ? safeNumber(invoice.snapshot?.vat.rate ?? settings.vatRate) : 0;
  const amountExcludingTax = roundMoney(
    invoice.snapshot?.totals.ht ?? (vatRate > 0 ? totalIncludingTax / (1 + vatRate / 100) : totalIncludingTax),
  );
  const vatAmount = roundMoney(invoice.snapshot?.totals.tva ?? totalIncludingTax - amountExcludingTax);
  const exemptionReason =
    vatRate === 0 ? invoice.vatExemptionReason || invoice.snapshot?.vat.mention || settings.tvaMention || "" : "";
  return { totalIncludingTax, amountExcludingTax, vatAmount, vatRate, exemptionReason };
}

export function prepareAccountingExport(
  source: AccountingExportSource,
  filters: AccountingExportFilters,
): PreparedAccountingExport {
  const defaultTimezone = source.shops[0]?.timezone ?? "Europe/Paris";
  const customers = new Map(source.customers.map((customer) => [customer.id, customer]));
  const repairs = new Map(source.repairs.map((repair) => [repair.id, repair]));
  const shops = new Map(source.shops.map((shop) => [shop.id, shop]));
  const vatRates = new Set<number>();
  const warnings: AccountingExportWarning[] = [];

  const lines = source.invoices
    .filter((invoice) => !["Brouillon", "Annulée"].includes(invoice.status))
    .map((invoice): AccountingExportLine | null => {
      const shop = shops.get(invoice.shopId);
      const timezone = shop?.timezone || defaultTimezone;
      const invoiceDate = dateInTimezone(invoice.date || invoice.createdAt || invoice.snapshot?.generatedAt, timezone);
      if (!invoiceDate || invoiceDate < filters.startDate || invoiceDate > filters.endDate) return null;
      if (filters.shopId !== "all" && invoice.shopId !== filters.shopId) return null;

      const totals = invoiceTotals(invoice, source.workshopSettings);
      if (filters.vatRate !== "all" && Math.abs(totals.vatRate - filters.vatRate) > 0.0001) return null;
      vatRates.add(totals.vatRate);

      const customer = customers.get(invoice.customerId);
      const repair = invoice.repairId ? repairs.get(invoice.repairId) : undefined;
      const invoiceDocuments = source.documents.filter(
        (document) => document.type === "invoice" && document.invoiceId === invoice.id,
      );
      const invoiceDocument =
        invoiceDocuments.find((document) => document.fileUrl || document.storagePath) ?? invoiceDocuments[0];
      const documentType = invoice.documentType === "credit_note" ? "Avoir" : "Facture";
      const sign = documentType === "Avoir" ? -1 : 1;

      if (Math.abs(totals.amountExcludingTax + totals.vatAmount - totals.totalIncludingTax) > 0.02) {
        warnings.push({
          code: "inconsistent_amount",
          invoiceNumber: invoice.number,
          message: `Les montants HT, TVA et TTC de ${invoice.number} ne sont pas cohérents.`,
        });
      }
      if (!(invoiceDocument?.fileUrl || invoiceDocument?.storagePath)) {
        warnings.push({
          code: "missing_pdf",
          invoiceNumber: invoice.number,
          message: `Le PDF de ${invoice.number} n'est pas publié.`,
        });
      }

      return {
        invoiceId: invoice.id,
        invoiceDate,
        invoiceNumber: invoice.number,
        documentType,
        customerName: customer?.name || invoice.snapshot?.client.name || "Client non renseigné",
        customerCompany: customer?.companyName || customer?.company || "",
        customerSiret: customer?.siret || "",
        customerVatNumber: customer?.vatNumber || customer?.tvaNumber || "",
        description: invoice.lines
          .map((entry) => entry.description)
          .filter(Boolean)
          .join(" | "),
        repairReference: repair?.number || invoice.snapshot?.repair?.number || "",
        amountExcludingTax: roundMoney(sign * totals.amountExcludingTax),
        vatRate: totals.vatRate,
        vatAmount: roundMoney(sign * totals.vatAmount),
        amountIncludingTax: roundMoney(sign * totals.totalIncludingTax),
        shopId: invoice.shopId,
        shopName: shop?.name || invoice.shopId,
        currency: invoice.currency === "CHF" || invoice.billingCountry === "CH" ? "CHF" : "EUR",
        vatExemptionReason: totals.exemptionReason,
        pdfUrl: invoiceDocument?.fileUrl,
        pdfStoragePath: invoiceDocument?.storagePath,
      };
    })
    .filter((line): line is AccountingExportLine => Boolean(line))
    .sort((left, right) =>
      left.invoiceDate === right.invoiceDate
        ? left.invoiceNumber.localeCompare(right.invoiceNumber, "fr")
        : left.invoiceDate.localeCompare(right.invoiceDate),
    );

  const summary = lines.reduce<AccountingExportSummary>(
    (total, line) => {
      total.invoiceCount += 1;
      if (line.documentType === "Avoir") {
        total.creditNoteCount += 1;
        total.creditNotesIncludingTax += Math.abs(line.amountIncludingTax);
      }
      total.billedRevenueExcludingTax += line.amountExcludingTax;
      total.vatAmount += line.vatAmount;
      total.billedRevenueIncludingTax += line.amountIncludingTax;
      return total;
    },
    {
      invoiceCount: 0,
      creditNoteCount: 0,
      billedRevenueExcludingTax: 0,
      vatAmount: 0,
      billedRevenueIncludingTax: 0,
      creditNotesIncludingTax: 0,
    },
  );
  summary.billedRevenueExcludingTax = roundMoney(summary.billedRevenueExcludingTax);
  summary.vatAmount = roundMoney(summary.vatAmount);
  summary.billedRevenueIncludingTax = roundMoney(summary.billedRevenueIncludingTax);
  summary.creditNotesIncludingTax = roundMoney(summary.creditNotesIncludingTax);

  return {
    filters,
    lines,
    summary,
    warnings: warnings.filter((warning) => lines.some((line) => line.invoiceNumber === warning.invoiceNumber)),
    vatRates: [...vatRates].sort((left, right) => left - right),
    timezone: defaultTimezone,
  };
}

export const nativeAccountingExportProvider = { id: "behar-invoice-export", prepare: prepareAccountingExport } as const;
