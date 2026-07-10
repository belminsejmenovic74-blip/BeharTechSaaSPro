import type { QuoteLine, SaleLine, StoreState, WorkshopInfo } from "@/lib/behar-store";
import { getBillingWorkshopInfo } from "@/lib/behar-store";
import { getCustomerTrackingPath } from "@/lib/customer-tracking";
import type { PublicCommercialDocumentDto, PublicWorkshopDto } from "@/lib/public-dtos";
import { getWorkshopCountryConfig } from "@/lib/workshop-country";

type CommercialKind = PublicCommercialDocumentDto["kind"]; // "quote" | "invoice" | "receipt" | "sale"

type CommercialState = Pick<
  StoreState,
  "customers" | "invoices" | "payments" | "quotes" | "repairs" | "sales" | "workshopInfo" | "workshopSettings"
>;

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

function publicWorkshop(workshop: WorkshopInfo): PublicWorkshopDto {
  const config = getWorkshopCountryConfig(workshop.country);
  const isSwiss = config.country === "CH";
  return {
    name: resolveShopName([workshop.commercialName, workshop.name, workshop.brand]),
    logoUrl: workshop.showLogo ? workshop.logoUrl : undefined,
    phone: workshop.phone || undefined,
    email: workshop.email || undefined,
    address: workshop.address || undefined,
    postalCode: workshop.postalCode ?? undefined,
    city: workshop.postalCity || (workshop.city ?? undefined),
    country: config.country,
    currency: config.currency,
    locale: config.locale,
    canton: isSwiss ? workshop.swissCanton || undefined : undefined,
    businessId: isSwiss ? workshop.swissUid || undefined : workshop.siret || undefined,
    vatNumber: isSwiss ? workshop.swissVatNumber || undefined : workshop.tvaNumber || undefined,
    vatApplicable: workshop.vatApplicable,
    vatMention: workshop.tvaMention || undefined,
  };
}

function clientDisplayName(state: CommercialState, customerId?: string, fallback?: string): string {
  const clean = (fallback ?? "").trim();
  if (customerId) {
    const customer = state.customers.find((entry) => entry.id === customerId);
    if (customer?.name?.trim()) return customer.name.trim();
  }
  return clean || "Client";
}

function lineFromQuoteLine(line: QuoteLine): PublicCommercialDocumentDto["lines"][number] {
  return {
    label: line.description,
    quantity: Number(line.quantity ?? 1),
    unitPriceTtc: Number(line.unitPrice ?? 0),
    totalTtc: Number(line.total ?? Number(line.quantity ?? 1) * Number(line.unitPrice ?? 0)),
  };
}

function lineFromSaleLine(line: SaleLine): PublicCommercialDocumentDto["lines"][number] {
  return {
    label: line.name,
    quantity: Number(line.quantity ?? 1),
    unitPriceTtc: Number(line.unitPrice ?? 0),
    totalTtc: Number(line.total ?? Number(line.quantity ?? 1) * Number(line.unitPrice ?? 0)),
  };
}

function relatedRepair(
  state: CommercialState,
  repairId: string | undefined,
  workshop: WorkshopInfo,
): PublicCommercialDocumentDto["relatedRepair"] {
  if (!repairId) return undefined;
  const repair = state.repairs.find((entry) => entry.id === repairId);
  if (!repair) return undefined;
  const path = getCustomerTrackingPath(repair, workshop);
  return { number: repair.number, url: path || undefined };
}

/**
 * Construit le DTO public d'un document commercial (devis, facture, reçu, vente)
 * à partir de l'état local du store. Le `token` est l'identifiant de l'entité
 * (quote.id / invoice.id / payment.id / sale.id). Renvoie null si introuvable.
 */
export function buildPublicCommercialDtoFromLocalState(
  state: CommercialState,
  kind: CommercialKind,
  token: string,
): PublicCommercialDocumentDto | null {
  const cleanToken = String(token ?? "").trim();
  if (!cleanToken) return null;

  const workshopInfo = (state.workshopSettings ?? state.workshopInfo) as WorkshopInfo;

  if (kind === "quote") {
    const quote = state.quotes.find((entry) => entry.id === cleanToken);
    if (!quote) return null;
    const workshop = getBillingWorkshopInfo(workshopInfo, quote.billingCountry);
    return {
      kind,
      workshop: publicWorkshop(workshop),
      client: { displayName: clientDisplayName(state, quote.customerId, quote.clientSnapshot?.name) },
      document: {
        number: quote.number,
        status: quote.status,
        totalTtc: Number(quote.totalTtc ?? quote.totalAmount ?? 0),
        createdAt: quote.createdAt || quote.date || new Date().toISOString(),
      },
      lines: (quote.lines ?? []).map(lineFromQuoteLine),
      relatedRepair: relatedRepair(state, quote.repairId, workshop),
      documents: [],
    };
  }

  if (kind === "invoice") {
    const invoice = state.invoices.find((entry) => entry.id === cleanToken);
    if (!invoice) return null;
    const workshop = getBillingWorkshopInfo(workshopInfo, invoice.billingCountry);
    const total = (invoice.lines ?? []).reduce(
      (sum, line) => sum + Number(line.total ?? Number(line.quantity ?? 1) * Number(line.unitPrice ?? 0)),
      0,
    );
    return {
      kind,
      workshop: publicWorkshop(workshop),
      client: { displayName: clientDisplayName(state, invoice.customerId) },
      document: {
        number: invoice.number,
        status: invoice.status,
        totalTtc: total,
        createdAt: invoice.createdAt || invoice.date || new Date().toISOString(),
      },
      lines: (invoice.lines ?? []).map(lineFromQuoteLine),
      relatedRepair: relatedRepair(state, invoice.repairId, workshop),
      documents: [],
    };
  }

  if (kind === "receipt") {
    const payment = state.payments.find((entry) => entry.id === cleanToken);
    if (!payment) return null;
    const workshop = getBillingWorkshopInfo(workshopInfo, payment.billingCountry);
    const amount = Number(payment.amount ?? 0);
    return {
      kind,
      workshop: publicWorkshop(workshop),
      client: { displayName: clientDisplayName(state, payment.customerId) },
      document: {
        number: payment.paymentNumber,
        status: payment.status,
        totalTtc: amount,
        createdAt: payment.createdAt || payment.date || new Date().toISOString(),
      },
      lines: [{ label: "Règlement", quantity: 1, unitPriceTtc: amount, totalTtc: amount }],
      relatedRepair: relatedRepair(state, payment.repairId, workshop),
      documents: [],
    };
  }

  if (kind === "intake") {
    // Bon de prise en charge : construit depuis la réparation (token = repair.id).
    const repair = state.repairs.find((entry) => entry.id === cleanToken);
    if (!repair) return null;
    const workshop = getBillingWorkshopInfo(workshopInfo, repair.billingCountry);
    const device = [repair.brandName, repair.deviceModel || repair.device].filter(Boolean).join(" ").trim();
    const amount = Number(repair.amount ?? 0);
    return {
      kind,
      workshop: publicWorkshop(workshop),
      client: { displayName: clientDisplayName(state, repair.customerId) },
      document: {
        number: repair.number,
        status: "Pris en charge",
        totalTtc: amount,
        createdAt: repair.droppedAt || repair.createdAt || new Date().toISOString(),
      },
      lines: [
        {
          label: [device, repair.issue].filter(Boolean).join(" — ") || "Prise en charge de l'appareil",
          quantity: 1,
          unitPriceTtc: amount,
          totalTtc: amount,
        },
      ],
      relatedRepair: relatedRepair(state, repair.id, workshop),
      documents: [],
    };
  }

  // kind === "sale"
  const sale = state.sales.find((entry) => entry.id === cleanToken);
  if (!sale) return null;
  const workshop = getBillingWorkshopInfo(workshopInfo, sale.billingCountry);
  return {
    kind,
    workshop: publicWorkshop(workshop),
    client: { displayName: clientDisplayName(state, sale.customerId, sale.customerName) },
    document: {
      number: sale.number,
      status: sale.status,
      totalTtc: Number(sale.total ?? 0),
      createdAt: sale.createdAt || new Date().toISOString(),
    },
    lines: (sale.lines ?? []).map(lineFromSaleLine),
    relatedRepair: relatedRepair(state, sale.repairId, workshop),
    documents: [],
  };
}
