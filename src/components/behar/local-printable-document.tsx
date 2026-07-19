"use client";

import type { ReactNode } from "react";

import {
  type BeharDocument,
  type DocumentType,
  getBillingWorkshopInfo,
  type LegalDocumentSnapshot,
  type useBeharStore,
  type WorkshopInfo,
} from "@/lib/behar-store";
import { getDocumentFilename } from "@/lib/workshop-country";

import {
  InternalRepairDocument,
  InvoiceDocument,
  PaymentReceiptDocument,
  QuoteDocument,
  RepairIntakeDocument,
  RepairSummaryDocument,
  SaleReceiptDocument,
  DiagnosticReportDocument,
} from "./printable-documents";

type BeharStoreSnapshot = ReturnType<typeof useBeharStore.getState>;

/**
 * Immutabilité documentaire (exigence légale FR/CH) : un document émis doit refléter
 * l'identité et le régime fiscal de l'atelier **au moment de l'émission**, jamais l'état
 * courant. Quand un snapshot légal existe (devis verrouillé, facture émise…), on gèle les
 * champs juridiquement significatifs (raison sociale, adresse, SIRET/TVA, régime, mentions)
 * par-dessus l'atelier vivant. Sans snapshot (brouillon), on garde le calcul courant.
 */
function freezeWorkshopFromSnapshot(live: WorkshopInfo, snapshot?: LegalDocumentSnapshot): WorkshopInfo {
  if (!snapshot) return live;
  const w = snapshot.workshop;
  const postalCity = [w.postalCode, w.city].filter(Boolean).join(" ").trim() || live.postalCity;
  return {
    ...live,
    brand: w.brand ?? live.brand,
    name: w.name ?? live.name,
    commercialName: w.commercialName ?? live.commercialName,
    address: w.address ?? live.address,
    postalCode: w.postalCode ?? live.postalCode,
    city: w.city ?? live.city,
    postalCity,
    country: snapshot.country ?? w.country ?? live.country,
    email: w.email ?? live.email,
    phone: w.phone ?? live.phone,
    website: w.website ?? live.website,
    siret: w.siret ?? live.siret,
    tvaNumber: w.tvaNumber ?? live.tvaNumber,
    swissUid: w.swissUid ?? live.swissUid,
    swissVatNumber: w.swissVatNumber ?? live.swissVatNumber,
    taxRegime: snapshot.vat.regime ?? live.taxRegime,
    vatApplicable: snapshot.vat.applicable ?? live.vatApplicable,
    vatRate: snapshot.vat.rate ?? live.vatRate,
    tvaMention: snapshot.vat.mention ?? live.tvaMention,
  };
}

export type PrintableDocumentTarget = {
  type: "intake" | "quote" | "invoice" | "payment" | "internal" | "summary" | "sale-receipt" | "diagnostic_report";
  id: string;
};

const TYPE_LABEL: Record<DocumentType, string> = {
  intake: "Bon de prise en charge",
  quote: "Devis",
  invoice: "Facture",
  payment: "Confirmation de règlement",
  "sale-receipt": "Justificatif de vente",
  "sale-invoice": "Facture de vente comptoir",
  internal: "Fiche intervention interne",
  summary: "Résumé dossier",
  diagnostic_report: "Rapport diagnostic & tests",
};

export function getPrintableTarget(document: BeharDocument): PrintableDocumentTarget | null {
  if (document.type === "intake" && document.repairId) return { type: "intake", id: document.repairId };
  if (document.type === "quote" && document.quoteId) return { type: "quote", id: document.quoteId };
  if (document.type === "invoice" && document.invoiceId) return { type: "invoice", id: document.invoiceId };
  if (document.type === "payment" && document.paymentId) return { type: "payment", id: document.paymentId };
  if (document.type === "internal" && document.repairId) return { type: "internal", id: document.repairId };
  if (document.type === "summary" && document.repairId) return { type: "summary", id: document.repairId };
  if (document.type === "diagnostic_report" && document.repairId)
    return { type: "diagnostic_report", id: document.repairId };
  if ((document.type === "sale-receipt" || document.type === "sale-invoice") && document.saleId) {
    return { type: "sale-receipt", id: document.saleId };
  }
  return null;
}

export function isInternalDocument(document?: BeharDocument | null) {
  // Seule la fiche d'intervention "internal" reste privée (prix d'achat, marge, fournisseur).
  // Le "summary" est un rapport de réparation propre, destiné au client.
  return document?.type === "internal";
}

export function getDocumentTypeLabel(type?: DocumentType) {
  return type ? TYPE_LABEL[type] : "Document";
}

export function getDocumentPreviewTitle(document?: BeharDocument | null) {
  if (!document) return "Aperçu du document";
  return `Aperçu ${TYPE_LABEL[document.type].toLowerCase()}`;
}

export function getDocumentFileName(document: BeharDocument, store: BeharStoreSnapshot) {
  const target = getPrintableTarget(document);
  const repair = document.repairId ? store.repairs.find((entry) => entry.id === document.repairId) : undefined;
  const quote = document.quoteId ? store.quotes.find((entry) => entry.id === document.quoteId) : undefined;
  const invoice = document.invoiceId ? store.invoices.find((entry) => entry.id === document.invoiceId) : undefined;
  const payment = document.paymentId ? store.payments.find((entry) => entry.id === document.paymentId) : undefined;
  const sale = document.saleId ? store.sales.find((entry) => entry.id === document.saleId) : undefined;
  const rawNumber =
    target?.type === "payment"
      ? (payment?.paymentNumber ?? document.id.slice(-8))
      : (sale?.number ?? invoice?.number ?? quote?.number ?? repair?.number ?? document.id.slice(-8));
  return target
    ? getDocumentFilename(target.type, rawNumber)
    : `document-${String(rawNumber).replace(/[^a-zA-Z0-9_-]+/g, "-")}.pdf`;
}

function MissingDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="mx-auto grid min-h-[520px] w-full max-w-[794px] place-items-center rounded-[18px] border border-[#E4E7EC] bg-white p-10 text-center text-[#667085]">
      <p>{children}</p>
    </div>
  );
}

export function LocalPrintableDocument({
  document,
  store,
}: Readonly<{ document?: BeharDocument | null; store: BeharStoreSnapshot }>) {
  if (!document) return <MissingDocument>Document introuvable.</MissingDocument>;

  const customer = store.customers.find((entry) => entry.id === document.customerId);
  const repair = document.repairId ? store.repairs.find((entry) => entry.id === document.repairId) : undefined;
  const quote = document.quoteId ? store.quotes.find((entry) => entry.id === document.quoteId) : undefined;
  const invoice = document.invoiceId ? store.invoices.find((entry) => entry.id === document.invoiceId) : undefined;
  const payment = document.paymentId ? store.payments.find((entry) => entry.id === document.paymentId) : undefined;
  const sale = document.saleId ? store.sales.find((entry) => entry.id === document.saleId) : undefined;
  const paymentRepair = repair ?? store.repairs.find((entry) => entry.id === (payment?.repairId ?? invoice?.repairId));
  const counterCustomer = store.customers.find((entry) => entry.type === "counter") ?? store.customers[0];
  const billingCountry =
    repair?.billingCountry ??
    quote?.billingCountry ??
    invoice?.billingCountry ??
    payment?.billingCountry ??
    sale?.billingCountry ??
    store.workshopInfo.country;
  // Snapshot légal figé à l'émission (devis verrouillé / facture émise), sinon document lui-même.
  const legalSnapshot = quote?.snapshot ?? invoice?.snapshot ?? document.snapshot;
  const billingWorkshop = freezeWorkshopFromSnapshot(
    getBillingWorkshopInfo(store.workshopInfo, billingCountry),
    legalSnapshot,
  );

  if (!customer && document.type !== "sale-receipt" && document.type !== "sale-invoice") {
    return <MissingDocument>Client lié introuvable.</MissingDocument>;
  }

  switch (document.type) {
    case "intake":
      if (!repair || !customer) return <MissingDocument>Bon de prise en charge incomplet.</MissingDocument>;
      return <RepairIntakeDocument customer={customer} repair={repair} workshop={billingWorkshop} />;
    case "quote":
      if (!quote || !customer) return <MissingDocument>Devis incomplet.</MissingDocument>;
      return <QuoteDocument customer={customer} quote={quote} repair={repair} workshop={billingWorkshop} />;
    case "invoice":
      if (!invoice || !customer) return <MissingDocument>Facture incomplète.</MissingDocument>;
      return (
        <InvoiceDocument
          customer={customer}
          invoice={invoice}
          quote={quote}
          repair={repair}
          workshop={billingWorkshop}
        />
      );
    case "payment":
      if (!payment || !customer) return <MissingDocument>Confirmation de règlement incomplète.</MissingDocument>;
      return (
        <PaymentReceiptDocument
          customer={customer}
          invoice={invoice}
          payment={payment}
          repair={paymentRepair}
          workshop={billingWorkshop}
        />
      );
    case "internal":
      if (!repair || !customer) return <MissingDocument>Fiche interne incomplète.</MissingDocument>;
      return <InternalRepairDocument customer={customer} repair={repair} workshop={billingWorkshop} />;
    case "summary":
      // Rapport de réparation côté client : version propre, sans données sensibles.
      if (!repair || !customer) return <MissingDocument>Rapport de réparation incomplet.</MissingDocument>;
      return <RepairSummaryDocument customer={customer} repair={repair} workshop={billingWorkshop} />;
    case "diagnostic_report":
      if (!repair || !customer) return <MissingDocument>Rapport diagnostic incomplet.</MissingDocument>;
      return <DiagnosticReportDocument customer={customer} repair={repair} workshop={billingWorkshop} />;
    case "sale-receipt":
    case "sale-invoice":
      if (!sale) return <MissingDocument>Justificatif de vente incomplet.</MissingDocument>;
      return <SaleReceiptDocument customer={customer ?? counterCustomer} sale={sale} workshop={billingWorkshop} />;
    default:
      return <MissingDocument>Type de document non pris en charge.</MissingDocument>;
  }
}
