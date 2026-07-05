import type { BeharDocument, Repair, StoreState, WorkshopInfo } from "@/lib/behar-store";
import { getBillingWorkshopInfo, getRepairReadyDisplayLabel, repairHasConfirmedPayment } from "@/lib/behar-store";
import { getTrackingCode } from "@/lib/customer-tracking";
import { getPublicDocumentUrl } from "@/lib/documents/document-actions";
import type { PublicRepairDto } from "@/lib/public-dtos";
import { PUBLIC_REPAIR_TIMELINE_STEPS, publicRepairProgress, publicRepairStatusLabel } from "@/lib/repair-status";
import { getWorkshopCountryConfig } from "@/lib/workshop-country";

const PUBLIC_DOCUMENT_TYPES = new Set(["intake", "quote", "invoice", "payment", "summary", "diagnostic_report"]);

const PUBLIC_DOCUMENT_TITLE_BY_TYPE: Record<string, string> = {
  intake: "Bon de prise en charge",
  quote: "Devis",
  invoice: "Facture",
  payment: "Confirmation de règlement",
  summary: "Rapport final",
  diagnostic_report: "Rapport diagnostic",
};

function resolveShopName(candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    const value = (candidate ?? "").trim();
    if (
      value &&
      value.toLowerCase() !== "behar tech" &&
      value.toLowerCase() !== "behar tech pro" &&
      value.toLowerCase() !== "behartechpro"
    ) {
      return value;
    }
  }
  return "Votre atelier";
}

function publicWorkshop(workshop: WorkshopInfo, fallbackName?: string): PublicRepairDto["workshop"] {
  const config = getWorkshopCountryConfig(workshop.country);
  return {
    name: resolveShopName([workshop.commercialName, workshop.name, workshop.brand, fallbackName]),
    logoUrl: workshop.showLogo ? workshop.logoUrl : undefined,
    phone: workshop.phone || undefined,
    email: workshop.email || undefined,
    address: workshop.address || undefined,
    postalCode: workshop.postalCode ?? undefined,
    city: workshop.postalCity || (workshop.city ?? undefined),
    country: config.country,
    currency: config.currency,
    locale: config.locale,
  };
}

function publicTimeline(repair: Repair): PublicRepairDto["timeline"] {
  const createdAt = repair.droppedAt || (repair.createdAt ?? new Date().toISOString());
  const updatedAt = repair.updatedAt ?? createdAt;
  const progress = publicRepairProgress(repair.status);
  if (progress.isCancelled) {
    return [
      {
        title: "Dossier annulé",
        description: "Le dossier a été annulé par l'atelier.",
        date: updatedAt,
        visibility: "client",
      },
    ];
  }
  return PUBLIC_REPAIR_TIMELINE_STEPS.slice(0, progress.activeStepIndex + 1).map((title, index) => ({
    title,
    description:
      index === 0
        ? "Votre appareil a été pris en charge."
        : title === "Terminé"
          ? "Votre appareil a été remis au client."
          : undefined,
    date: index === 0 ? createdAt : updatedAt,
    visibility: "client" as const,
  }));
}

function isPublicDocument(document: BeharDocument): boolean {
  return PUBLIC_DOCUMENT_TYPES.has(document.type) && document.type !== "internal";
}

function isPaymentConfirmed(status?: Repair["paymentStatus"]) {
  return status === "Réglée" || status === "Partiellement réglée";
}

function publicDocumentTitle(document: BeharDocument, number?: string) {
  const base = PUBLIC_DOCUMENT_TITLE_BY_TYPE[document.type] ?? document.title;
  if (document.type === "payment") return base;
  return number ? `${base} ${number}` : base;
}

function hasPublicPreviewTarget(document: BeharDocument): boolean {
  if (document.type === "intake" || document.type === "summary" || document.type === "diagnostic_report") {
    return Boolean(document.repairId);
  }
  if (document.type === "quote") return Boolean(document.quoteId);
  if (document.type === "invoice") return Boolean(document.invoiceId);
  if (document.type === "payment") return Boolean(document.paymentId);
  if (document.type === "sale-receipt" || document.type === "sale-invoice") return Boolean(document.saleId);
  return false;
}

function documentNumber(
  document: BeharDocument,
  state: Pick<StoreState, "quotes" | "invoices" | "payments">,
  repair: Repair,
) {
  if (document.type === "payment") {
    return (
      state.payments.find((payment) => payment.id === document.paymentId)?.paymentNumber ||
      state.payments.find((payment) => payment.invoiceId === document.invoiceId && payment.repairId === repair.id)
        ?.paymentNumber
    );
  }
  if (document.type === "invoice") {
    return state.invoices.find((invoice) => invoice.id === document.invoiceId)?.number;
  }
  if (document.type === "quote") {
    return state.quotes.find((quote) => quote.id === document.quoteId)?.number;
  }
  return document.type === "intake" ? repair.number : undefined;
}

export function buildPublicRepairDtoFromLocalState(
  state: Pick<
    StoreState,
    "customers" | "documents" | "invoices" | "payments" | "quotes" | "repairs" | "workshopInfo" | "workshopSettings"
  >,
  token: string,
): PublicRepairDto | null {
  const repair = state.repairs.find(
    (entry) =>
      (entry.publicAccess?.token === token || getTrackingCode(entry) === token) && entry.publicAccess?.active !== false,
  );
  if (!repair) return null;

  const customer = state.customers.find((entry) => entry.id === repair.customerId);
  const workshop = getBillingWorkshopInfo(
    (state.workshopSettings ?? state.workshopInfo) as WorkshopInfo,
    repair.billingCountry,
  );
  const paymentConfirmed = isPaymentConfirmed(repair.paymentStatus);
  const hasPaidPayment = repairHasConfirmedPayment(repair, state.payments);
  const documents = state.documents.filter(
    (document) =>
      document.repairId === repair.id &&
      isPublicDocument(document) &&
      (document.type !== "payment" || paymentConfirmed),
  );

  return {
    workshop: publicWorkshop(workshop),
    repair: {
      number: repair.number,
      status: repair.status,
      statusLabel:
        repair.status === "Prêt"
          ? getRepairReadyDisplayLabel(repair, state.payments)
          : publicRepairStatusLabel(repair.status),
      readyLabel: repair.status === "Prêt" ? getRepairReadyDisplayLabel(repair, state.payments) : undefined,
      paymentStatus: repair.paymentStatus,
      hasPaidPayment,
      finalTestStatus: repair.finalTest?.status,
      deviceBrand: repair.brandName || undefined,
      deviceModel: repair.deviceModel || repair.device || undefined,
      deviceType: repair.deviceType || undefined,
      issueDescription: repair.issue || undefined,
      createdAt: repair.droppedAt || repair.createdAt || new Date().toISOString(),
      updatedAt: repair.updatedAt || repair.droppedAt || repair.createdAt || new Date().toISOString(),
    },
    client: { displayName: customer?.name || "Client" },
    timeline: publicTimeline(repair),
    documents: documents.map((document) => {
      const number = documentNumber(document, state, repair);
      return {
        type: document.type,
        title: publicDocumentTitle(document, number),
        number,
        status: "ready",
        previewUrl: hasPublicPreviewTarget(document) ? getPublicDocumentUrl(document) : undefined,
        downloadUrl: document.fileUrl || undefined,
      };
    }),
    messages: (repair.messages ?? [])
      .filter((message) => message.visibility === "client")
      .map((message) => ({
        authorType: message.authorType,
        authorName: message.authorName || "Atelier",
        body: message.body,
        createdAt: message.createdAt,
      })),
    quoteLinks: state.quotes
      .filter((quote) => quote.repairId === repair.id)
      .map((quote) => {
        const document = documents.find((entry) => entry.quoteId === quote.id && entry.type === "quote");
        return {
          number: quote.number,
          status: quote.status,
          totalTtc: quote.totalTtc ?? quote.totalAmount ?? 0,
          previewUrl: document ? getPublicDocumentUrl(document) : "",
          downloadUrl: document?.fileUrl || undefined,
        };
      }),
    invoiceLinks: state.invoices
      .filter((invoice) => invoice.repairId === repair.id)
      .map((invoice) => {
        const document = documents.find((entry) => entry.invoiceId === invoice.id && entry.type === "invoice");
        return {
          number: invoice.number,
          status: invoice.status,
          totalTtc: invoice.lines.reduce((sum, line) => sum + (line.total ?? line.quantity * line.unitPrice), 0),
          previewUrl: document ? getPublicDocumentUrl(document) : "",
          downloadUrl: document?.fileUrl || undefined,
        };
      }),
    receiptLinks: state.payments
      .filter((payment) => paymentConfirmed && payment.repairId === repair.id && payment.status === "Payé")
      .map((payment) => {
        const document = documents.find((entry) => entry.paymentId === payment.id && entry.type === "payment");
        return {
          number: payment.paymentNumber,
          status: payment.status,
          amount: payment.amount,
          previewUrl: document ? getPublicDocumentUrl(document) : "",
          downloadUrl: document?.fileUrl || undefined,
        };
      }),
  };
}
