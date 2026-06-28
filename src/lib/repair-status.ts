export type PublicRepairStatusKey =
  | "received"
  | "diagnostic"
  | "waiting"
  | "repair"
  | "final_test"
  | "ready"
  | "returned"
  | "closed"
  | "cancelled";

export const PUBLIC_REPAIR_STATUS_LABELS: Record<PublicRepairStatusKey, string> = {
  received: "Reçu",
  diagnostic: "Diagnostic",
  waiting: "En attente",
  repair: "En réparation",
  final_test: "Test final",
  ready: "Prêt",
  returned: "Appareil rendu",
  closed: "Dossier clôturé",
  cancelled: "Annulé",
};

export const PUBLIC_REPAIR_TIMELINE_STEPS = [
  "Reçu",
  "Diagnostic",
  "En attente",
  "En réparation",
  "Test final",
  "Prêt",
] as const;

const NORMALIZED_REPAIR_STATUS: Record<string, PublicRepairStatusKey> = {
  received: "received",
  recu: "received",
  "reçu": "received",
  "dossier reçu": "received",
  dossier_recu: "received",
  created: "received",
  intake: "received",

  diagnostic: "diagnostic",
  diagnosis: "diagnostic",

  waiting: "waiting",
  waiting_part: "waiting",
  waiting_customer: "waiting",
  quote_sent: "waiting",
  quote_accepted: "waiting",
  pending: "waiting",
  "en attente": "waiting",
  "devis envoyé": "waiting",
  "devis envoye": "waiting",
  "devis accepté": "waiting",
  "devis accepte": "waiting",

  repair: "repair",
  "réparation": "repair",
  "reparation": "repair",
  "en réparation": "repair",
  "en reparation": "repair",
  repairing: "repair",
  in_repair: "repair",
  repair_in_progress: "repair",

  final_test: "final_test",
  "test final": "final_test",
  testing: "final_test",

  ready: "ready",
  ready_for_pickup: "ready",
  "prêt": "ready",
  "pret": "ready",
  completed: "ready",
  done: "ready",
  "téléphone prêt": "ready",
  "telephone pret": "ready",

  returned: "returned",
  delivered: "returned",
  rendu: "returned",
  "appareil rendu": "returned",

  closed: "closed",
  "clôturé": "closed",
  "cloture": "closed",
  "clôturée": "closed",
  "cloturee": "closed",

  cancelled: "cancelled",
  canceled: "cancelled",
  "annulé": "cancelled",
  "annule": "cancelled",
  "annulée": "cancelled",
  "annulee": "cancelled",
  "irréparable": "cancelled",
  "irreparable": "cancelled",
};

export function normalizePublicRepairStatus(status?: string | null): PublicRepairStatusKey {
  const key = (status ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKC");
  return NORMALIZED_REPAIR_STATUS[key] ?? "received";
}

export function publicRepairStatusLabel(status?: string | null): string {
  return PUBLIC_REPAIR_STATUS_LABELS[normalizePublicRepairStatus(status)];
}

function normalizePaymentStatus(status?: string | null) {
  return (status ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

export function isRepairPaymentSettled(status?: string | null, hasPaidPayment = false): boolean {
  const normalized = normalizePaymentStatus(status);
  if (normalized.includes("partiellement")) return false;
  if (normalized === "reglee" || normalized === "regle" || normalized === "payee" || normalized === "paye") {
    return true;
  }
  if (normalized === "paid" || normalized === "settled") return true;
  if (normalized === "a regler" || normalized === "non regle" || normalized === "non reglee") return false;
  return hasPaidPayment;
}

export function repairReadyStatusLabel(
  status?: string | null,
  paymentStatus?: string | null,
  hasPaidPayment = false,
): string {
  if (normalizePublicRepairStatus(status) !== "ready") return publicRepairStatusLabel(status);
  return "Prêt";
}

export function publicRepairHeadline(
  status?: string | null,
  paymentStatus?: string | null,
  hasPaidPayment = false,
): [title: string, body: string] {
  switch (normalizePublicRepairStatus(status)) {
    case "waiting":
    case "diagnostic":
      return ["Diagnostic", "Diagnostic en cours ou réalisé."];
    case "final_test":
    case "repair":
      return ["En réparation", "Votre appareil est en cours de réparation."];
    case "ready":
      return ["Prêt", "Votre appareil est prêt."];
    case "returned":
      return ["Prêt", "Votre appareil est prêt."];
    case "closed":
      return ["Prêt", "Votre appareil est prêt."];
    case "cancelled":
      return ["Dossier annulé", "Ce dossier a été annulé. Contactez l'atelier pour plus d'informations."];
    case "received":
    default:
      return ["Reçu", "Nous avons bien reçu votre appareil."];
  }
}

export function publicRepairPageTitle(status?: string | null): string {
  const key = normalizePublicRepairStatus(status);
  if (key === "returned" || key === "closed") return "Votre réparation est prête";
  if (key === "cancelled") return "Votre dossier est annulé";
  return "Suivi de votre réparation";
}

export function publicRepairProgress(status?: string | null) {
  const key = normalizePublicRepairStatus(status);
  const defaultStepIndex: Record<PublicRepairStatusKey, number> = {
    received: 0,
    diagnostic: 1,
    waiting: 2,
    repair: 3,
    final_test: 4,
    ready: 5,
    returned: 5,
    closed: 5,
    cancelled: -1,
  };
  const activeStepIndex = defaultStepIndex[key];
  return {
    key,
    activeStepIndex,
    isFinished: key === "returned" || key === "closed",
    isCancelled: key === "cancelled",
    label: PUBLIC_REPAIR_STATUS_LABELS[key],
  };
}
