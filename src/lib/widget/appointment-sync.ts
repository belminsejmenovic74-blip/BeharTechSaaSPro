// Synchronisation widget → comptoir / atelier.
//
// Transforme un rendez-vous du widget (table Supabase `appointments`, source
// « Widget site internet », enrichi de sa demande liée `widget_leads`) en
// rendez-vous du store local, en RÉCUPÉRANT toutes les informations consultées
// par le client : identité, contact, appareil, problème, prestation, qualité,
// prix consulté, stock consulté, commentaire, photos, boutique et créneau.
//
// Rien n'est recalculé : on reprend les instantanés produits côté serveur. Le
// statut initial est « à confirmer » (le réparateur confirme ensuite).

import type { Appointment, AppointmentStatus, DeviceType } from "@/lib/behar-store";

export type RemoteWidgetAppointment = {
  id: string;
  shop_id: string;
  client_id: string | null;
  appointment_number: string | null;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  device_type: string | null;
  device_brand: string | null;
  device_model: string | null;
  issue_description: string | null;
  intervention_label: string | null;
  customer_price: number | null;
  price_status: "confirmed" | "to_confirm" | "diagnostic" | null;
  price_snapshot: Record<string, unknown> | null;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  source: string;
  status: string;
  notes: string | null;
  widget_lead_id: string | null;
  assigned_technician_id: string | null;
  is_pre_intake: boolean;
  confirmation_status?: string | null;
  stock_confirmation_required?: boolean | null;
  price_confirmation_required?: boolean | null;
  created_at: string;
  updated_at: string;
  // Champs repris de la demande liée (widget_leads) par l'API dashboard.
  quality_label?: string | null;
  displayed_stock?: string | null;
  displayed_stock_snapshot?: Record<string, unknown> | null;
  displayed_warranty?: string | null;
  photos?: string[] | null;
};

export type WidgetCustomerRef = { id: string; shopId: string; name: string; phone?: string; email?: string };

// Les six statuts du panneau « À venir » de l'atelier, reliés aux statuts du store.
export type UpcomingStatusKey = "to_confirm" | "confirmed" | "arrived" | "no_show" | "cancelled" | "converted";

export const WIDGET_UPCOMING_STATUSES: ReadonlyArray<{
  key: UpcomingStatusKey;
  label: string;
  store: AppointmentStatus;
}> = [
  { key: "to_confirm", label: "À confirmer", store: "En attente" },
  { key: "confirmed", label: "Confirmé", store: "Confirmé" },
  { key: "arrived", label: "Client arrivé", store: "Arrivé" },
  { key: "no_show", label: "Absent", store: "Non venu" },
  { key: "cancelled", label: "Annulé", store: "Annulé" },
  { key: "converted", label: "Réparation créée", store: "Réparation créée" },
];

const STORE_TO_UPCOMING: Record<AppointmentStatus, UpcomingStatusKey> = {
  Planifié: "to_confirm",
  "En attente": "to_confirm",
  Confirmé: "confirmed",
  Arrivé: "arrived",
  "Réparation créée": "converted",
  Annulé: "cancelled",
  "Non venu": "no_show",
};

export function upcomingStatusKey(status: AppointmentStatus): UpcomingStatusKey {
  return STORE_TO_UPCOMING[status] ?? "to_confirm";
}

const clean = (value: unknown): string =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

function toDeviceType(value: string | null | undefined): DeviceType {
  return (["Smartphone", "Tablette", "Ordinateur", "Console", "Autre"] as const).includes(value as DeviceType)
    ? (value as DeviceType)
    : "Autre";
}

const STOCK_STATUS_LABELS: Record<string, string> = {
  available: "Disponible",
  in_stock: "Disponible",
  disponible: "Disponible",
  low: "Stock limité",
  limited: "Stock limité",
  out: "Sur commande",
  out_of_stock: "Sur commande",
  order: "Sur commande",
  backorder: "Sur commande",
};

// Libellé de disponibilité consulté (jamais « disponible » par défaut).
export function availabilityLabel(remote: RemoteWidgetAppointment): string {
  const direct = clean(remote.displayed_stock);
  if (direct) return direct;
  const snapshot = remote.displayed_stock_snapshot ?? undefined;
  if (!snapshot || snapshot.mode === "hidden") return "Disponibilité à confirmer";
  if (typeof snapshot.label === "string" && snapshot.label.trim()) return snapshot.label.trim();
  if (snapshot.mode === "quantity" && typeof snapshot.quantity === "number") {
    return snapshot.quantity > 0 ? `${snapshot.quantity} en stock` : "Sur commande";
  }
  if (typeof snapshot.status === "string" && snapshot.status) {
    return STOCK_STATUS_LABELS[snapshot.status.toLowerCase()] ?? snapshot.status;
  }
  return "Disponibilité à confirmer";
}

// Alertes à afficher au comptoir : prix ou stock à confirmer par l'atelier.
export function deriveWidgetAlerts(remote: RemoteWidgetAppointment): string[] {
  const alerts: string[] = [];
  const priceType = (remote.price_snapshot?.type ?? remote.price_status) as string | undefined;
  const priceToConfirm =
    remote.price_confirmation_required === true ||
    remote.price_status === "to_confirm" ||
    priceType === "request" ||
    priceType === "hidden" ||
    remote.customer_price == null;
  if (priceToConfirm) alerts.push("Prix à confirmer");
  const availability = availabilityLabel(remote).toLowerCase();
  if (remote.stock_confirmation_required === true || availability.includes("à confirmer")) {
    alerts.push("Disponibilité à confirmer");
  }
  return alerts;
}

function initialStatus(remote: RemoteWidgetAppointment): { status: AppointmentStatus; confirmed: boolean } {
  const raw = clean(remote.confirmation_status || remote.status).toLowerCase();
  if (raw === "confirmed" || raw === "confirmé") return { status: "Confirmé", confirmed: true };
  // Une réservation issue du widget arrive « à confirmer » par défaut.
  return { status: "En attente", confirmed: false };
}

/**
 * Mappe un rendez-vous distant du widget vers un rendez-vous complet du store.
 * Idempotent via `id`/`externalSourceId` ; ne crée aucune réparation.
 */
export function mapRemoteWidgetAppointment(remote: RemoteWidgetAppointment, customer: WidgetCustomerRef): Appointment {
  const device = clean([remote.device_brand, remote.device_model].filter(Boolean).join(" ")) || "Appareil à préciser";
  const issue = clean(remote.issue_description) || clean(remote.intervention_label) || "Diagnostic";
  const { status, confirmed } = initialStatus(remote);
  const alerts = deriveWidgetAlerts(remote);
  const photos = Array.isArray(remote.photos) ? remote.photos.filter((path) => typeof path === "string") : [];

  return {
    id: remote.id,
    externalSourceId: remote.id,
    widgetLeadId: remote.widget_lead_id || undefined,
    isPreIntake: remote.is_pre_intake,
    shopId: customer.shopId,
    customerId: customer.id,
    repairId: undefined,
    appointmentNumber: remote.appointment_number || undefined,
    clientMode: "existing",
    clientName: clean(remote.client_name) || customer.name,
    clientPhone: clean(remote.client_phone) || customer.phone || undefined,
    clientEmail: clean(remote.client_email) || customer.email || undefined,
    deviceType: toDeviceType(remote.device_type),
    deviceBrand: clean(remote.device_brand) || undefined,
    deviceModel: clean(remote.device_model) || undefined,
    issueDescription: issue,
    interventionLabel: clean(remote.intervention_label) || undefined,
    customerPrice: remote.customer_price ?? undefined,
    estimatedTotal: remote.customer_price ?? undefined,
    priceStatus: remote.price_status ?? "to_confirm",
    qualityLabel: clean(remote.quality_label) || undefined,
    warrantyLabel: clean(remote.displayed_warranty) || undefined,
    availabilityLabel: availabilityLabel(remote),
    widgetSnapshot: remote.price_snapshot ?? undefined,
    alerts: alerts.length ? alerts : undefined,
    photos: photos.length ? photos : undefined,
    appointmentDate: remote.appointment_date,
    appointmentTime: remote.appointment_time,
    createdAt: remote.created_at,
    updatedAt: remote.updated_at,
    device,
    issue,
    date: remote.appointment_date,
    time: remote.appointment_time,
    duration: `${remote.duration_minutes || 30} min`,
    channel: "Site internet",
    source: "Widget site internet",
    technician: "À assigner",
    notes: clean(remote.notes) || "Pré-fiche créée depuis le widget",
    status,
    confirmed,
    dayIndex: 0,
    row: 0,
    color: "mint",
  };
}
