import type { BeharDocument, Repair, StoreState, WorkshopInfo } from "@/lib/behar-store";
import { getBillingWorkshopInfo } from "@/lib/behar-store";
import { getTrackingCode } from "@/lib/customer-tracking";
import type { PublicRepairDto } from "@/lib/public-dtos";
import { PUBLIC_REPAIR_TIMELINE_STEPS, publicRepairProgress, publicRepairStatusLabel } from "@/lib/repair-status";
import { getWorkshopCountryConfig } from "@/lib/workshop-country";

const PUBLIC_DOCUMENT_TYPES = new Set(["intake", "quote", "invoice", "summary", "diagnostic_report"]);

/** Montant client d'un dossier, dans l'ordre de priorité utilisé par l'app. */
function repairClientTotal(repair: Repair): number {
  const total = typeof repair.total === "number" ? repair.total : (repair.amount ?? 0);
  return Number.isFinite(total) && total > 0 ? total : 0;
}

const PUBLIC_DOCUMENT_TITLE_BY_TYPE: Record<string, string> = {
  intake: "Bon de prise en charge",
  quote: "Devis",
  invoice: "Facture",
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

function publicDocumentTitle(document: BeharDocument, number?: string) {
  const base = PUBLIC_DOCUMENT_TITLE_BY_TYPE[document.type] ?? document.title;
  return number ? `${base} ${number}` : base;
}

function documentNumber(document: BeharDocument, state: Pick<StoreState, "quotes" | "invoices">, repair: Repair) {
  if (document.type === "invoice") {
    return state.invoices.find((invoice) => invoice.id === document.invoiceId)?.number;
  }
  if (document.type === "quote") {
    return state.quotes.find((quote) => quote.id === document.quoteId)?.number;
  }
  return document.type === "intake" ? repair.number : undefined;
}

/**
 * Chemin public d'un document commercial (devis/facture), servi par la couche
 * publique serveur depuis `public_tracking_documents`. Le token est l'id de
 * l'entité liée. Remplace l'ancienne route
 * `/print/document/...` qui n'est lisible qu'en local (cassée à distance).
 */
function commercialDocumentPath(document: BeharDocument): string | undefined {
  if (document.type === "intake" && document.repairId) return `/bon/${document.repairId}`;
  if (document.type === "quote" && document.quoteId) return `/devis/${document.quoteId}`;
  if (document.type === "invoice" && document.invoiceId) return `/facture/${document.invoiceId}`;
  return undefined;
}

export function buildPublicRepairDtoFromLocalState(
  state: Pick<
    StoreState,
    "customers" | "documents" | "invoices" | "quotes" | "repairs" | "workshopInfo" | "workshopSettings"
  >,
  token: string,
  options: { canInvoice?: boolean } = {},
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
  const canInvoice = options.canInvoice !== false;
  const documents = state.documents.filter(
    (document) =>
      document.repairId === repair.id &&
      isPublicDocument(document) &&
      (canInvoice || !["quote", "invoice", "payment", "sale-receipt", "sale-invoice"].includes(document.type)),
  );

  return {
    workshop: publicWorkshop(workshop),
    repair: {
      number: repair.number,
      status: repair.status,
      statusLabel: publicRepairStatusLabel(repair.status),
      readyLabel: repair.status === "Prêt" ? publicRepairStatusLabel(repair.status) : undefined,
      finalTestStatus: repair.finalTest?.status,
      deviceBrand: repair.brandName || undefined,
      deviceModel: repair.deviceModel || repair.device || undefined,
      deviceType: repair.deviceType || undefined,
      issueDescription: repair.issue || undefined,
      customerPrice: canInvoice ? undefined : repairClientTotal(repair) || undefined,
      createdAt: repair.droppedAt || repair.createdAt || new Date().toISOString(),
      updatedAt: repair.updatedAt || repair.droppedAt || repair.createdAt || new Date().toISOString(),
    },
    client: { displayName: customer?.name || "Client" },
    timeline: publicTimeline(repair),
    documents: documents
      // On n'expose au client QUE les documents réellement consultables à distance :
      // ceux qui ont une page publique cloud (devis/facture/reçu, via
      // commercialDocumentPath) ou un PDF hébergé (fileUrl). L'« intake » (Bon de
      // prise en charge) n'a qu'un rendu LOCAL (/print/document…) illisible depuis
      // le téléphone du client → on l'exclut : toutes ses infos sont déjà sur la
      // page de suivi, et la section affiche alors « documents à venir ».
      .filter((document) => Boolean(commercialDocumentPath(document) || document.fileUrl))
      .map((document) => {
        const number = documentNumber(document, state, repair);
        return {
          type: document.type,
          title: publicDocumentTitle(document, number),
          number,
          status: "ready",
          previewUrl: commercialDocumentPath(document) ?? document.fileUrl ?? undefined,
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
    quoteLinks: canInvoice
      ? state.quotes
          .filter((quote) => quote.repairId === repair.id)
          .map((quote) => {
            const document = documents.find((entry) => entry.quoteId === quote.id && entry.type === "quote");
            return {
              number: quote.number,
              status: quote.status,
              totalTtc: quote.totalTtc ?? quote.totalAmount ?? 0,
              previewUrl: `/devis/${quote.id}`,
              downloadUrl: document?.fileUrl || undefined,
            };
          })
      : [],
    invoiceLinks: canInvoice
      ? state.invoices
          .filter((invoice) => invoice.repairId === repair.id)
          .map((invoice) => {
            const document = documents.find((entry) => entry.invoiceId === invoice.id && entry.type === "invoice");
            return {
              number: invoice.number,
              status: invoice.status,
              totalTtc: invoice.lines.reduce((sum, line) => sum + (line.total ?? line.quantity * line.unitPrice), 0),
              previewUrl: `/facture/${invoice.id}`,
              downloadUrl: document?.fileUrl || undefined,
            };
          })
      : [],
    receiptLinks: [],
  };
}
