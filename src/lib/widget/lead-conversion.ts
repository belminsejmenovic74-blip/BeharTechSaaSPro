// Reprise d'une demande du site (widget lead) sans ressaisie.
//
// Mapping PUR demande → entrées du store (client, réparation, rendez-vous,
// devis) + recherche intelligente. Partagé par « Demandes du site » et la
// recherche de demande du Mode Comptoir : une seule source de vérité, aucun
// doublon de logique.

import { leadCustomerName, leadDeviceLabel, type DashboardWidgetLead } from "@/lib/widget/dashboard-leads";

type CustomerLike = { id: string; phone: string; email?: string | null };

// Clé téléphone tolérante aux formats FR : « 0612345678 » et « +33612345678 »
// donnent la même valeur (indicatif 33 et zéro initial retirés).
const phoneKey = (value: string | null | undefined) => {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("33")) digits = digits.slice(2);
  return digits.replace(/^0+/, "");
};
const lowerEmail = (value: string | null | undefined) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

// Recherche d'un client existant : téléphone d'abord, puis email.
export function findExistingCustomerId(
  customers: CustomerLike[],
  lead: Pick<DashboardWidgetLead, "phone" | "phone_normalized" | "email" | "email_normalized">,
): string | undefined {
  const phone = phoneKey(lead.phone_normalized || lead.phone);
  const email = lowerEmail(lead.email_normalized || lead.email);
  const match = customers.find(
    (customer) =>
      (phone.length >= 6 && phoneKey(customer.phone) === phone) ||
      (email !== "" && lowerEmail(customer.email) === email),
  );
  return match?.id;
}

export function leadToCustomerInput(lead: DashboardWidgetLead) {
  const serviceAddress = lead.submission_payload?.serviceAddress;
  const address =
    serviceAddress && typeof serviceAddress === "object"
      ? [
          (serviceAddress as Record<string, unknown>).address,
          (serviceAddress as Record<string, unknown>).postalCode,
          (serviceAddress as Record<string, unknown>).city,
        ]
          .filter((value) => typeof value === "string" && value.trim())
          .join(", ")
      : "";
  return {
    name: leadCustomerName(lead),
    phone: lead.phone || "",
    email: lead.email || "",
    device: leadDeviceLabel(lead),
    address: address || undefined,
    source: "Widget site internet",
    notes: [lead.issue_description, lead.comment].filter(Boolean).join(" — "),
  };
}

export function leadToRepairInput(lead: DashboardWidgetLead, customerId: string) {
  const amount = Number(lead.displayed_price || 0);
  return {
    customerId,
    deviceType: lead.device_category as never,
    brandName: lead.brand || undefined,
    deviceModel: lead.model,
    device: leadDeviceLabel(lead),
    issue: lead.issue,
    status: "Reçu" as const,
    amount,
    total: amount,
    notes: ["Demande du site", lead.issue_description, lead.comment].filter(Boolean).join(" · "),
    droppedAt: new Date().toISOString(),
    technician: "À assigner",
    selectedPriceSnapshot: (lead.displayed_price_snapshot ?? undefined) as never,
  };
}

export function leadToAppointmentInput(
  lead: DashboardWidgetLead,
  customerId: string,
  when: { date: string; time: string; technician?: string },
) {
  return {
    customerId,
    device: leadDeviceLabel(lead),
    issue: lead.issue,
    date: when.date,
    time: when.time,
    deviceType: lead.device_category as never,
    deviceBrand: lead.brand || undefined,
    deviceModel: lead.model,
    clientName: leadCustomerName(lead),
    clientPhone: lead.phone || undefined,
    clientEmail: lead.email || undefined,
    source: "Widget site internet",
    channel: "Site internet",
    status: "Planifié" as const,
    notes: lead.comment || lead.issue_description || "Demande du site",
    customerPrice: lead.displayed_price || undefined,
    priceSnapshot: (lead.displayed_price_snapshot ?? undefined) as never,
    ...(when.technician ? { technician: when.technician } : {}),
  };
}

export function leadToQuoteInput(lead: DashboardWidgetLead, customerId: string) {
  const amount = Number(lead.displayed_price || 0);
  return {
    customerId,
    status: "Brouillon" as const,
    deviceType: lead.device_category as never,
    brandName: lead.brand || undefined,
    deviceModel: lead.model,
    device: leadDeviceLabel(lead),
    issue: lead.issue,
    notes: `Demande du site · ${lead.issue_description || lead.comment || "Sans précision"}`,
    selectedPriceSnapshot: (lead.displayed_price_snapshot ?? undefined) as never,
    lines:
      amount > 0
        ? [{ description: lead.service_label || lead.issue, quantity: 1, unitPrice: amount, total: amount }]
        : [],
  };
}

// Recherche intelligente : téléphone (chiffres), nom, email, n° de demande.
export function matchesLeadSearch(lead: DashboardWidgetLead, query: string): boolean {
  const raw = query.trim().toLowerCase();
  if (!raw) return false;
  const haystack = [
    leadCustomerName(lead),
    lead.phone,
    lead.phone_normalized,
    lead.email,
    lead.model,
    lead.brand,
    lead.issue,
    lead.id,
    lead.conversion_reference,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (haystack.includes(raw)) return true;
  const digits = phoneKey(raw);
  return digits.length >= 4 && phoneKey(lead.phone_normalized || lead.phone).includes(digits);
}
