export type PublicRepairStatusKey =
  | "received"
  | "diagnostic"
  | "repair"
  | "final_test"
  | "ready"
  | "returned"
  | "closed"
  | "cancelled";

export const PUBLIC_REPAIR_STATUS_LABELS: Record<PublicRepairStatusKey, string> = {
  received: "Reçu",
  diagnostic: "Diagnostic",
  repair: "Réparation",
  final_test: "Test final",
  ready: "Prêt",
  returned: "Appareil rendu",
  closed: "Dossier clôturé",
  cancelled: "Annulé",
};

export const PUBLIC_REPAIR_TIMELINE_STEPS = ["Reçu", "Diagnostic", "Réparation", "Test final", "Prêt"] as const;

const NORMALIZED_REPAIR_STATUS: Record<string, PublicRepairStatusKey> = {
  received: "received",
  recu: "received",
  "reçu": "received",
  "dossier reçu": "received",
  diagnostic: "diagnostic",
  diagnosis: "diagnostic",
  "en attente": "diagnostic",
  "devis envoyé": "diagnostic",
  repair: "repair",
  "réparation": "repair",
  "reparation": "repair",
  "en réparation": "repair",
  "en reparation": "repair",
  "devis accepté": "repair",
  "devis accepte": "repair",
  final_test: "final_test",
  "test final": "final_test",
  ready: "ready",
  "prêt": "ready",
  "pret": "ready",
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

export function publicRepairHeadline(status?: string | null): [title: string, body: string] {
  switch (normalizePublicRepairStatus(status)) {
    case "diagnostic":
      return ["Diagnostic en cours", "Nos techniciens analysent votre appareil avant intervention."];
    case "repair":
      return ["Réparation en cours", "Nos techniciens travaillent sur votre appareil."];
    case "final_test":
      return ["Tests finaux", "La réparation est terminée, nous vérifions le bon fonctionnement."];
    case "ready":
      return ["Appareil prêt", "Votre appareil est prêt à être récupéré à l'atelier."];
    case "returned":
      return ["Appareil rendu", "Votre appareil a été remis au client. Merci pour votre confiance."];
    case "closed":
      return ["Dossier clôturé", "Votre appareil a été remis au client. Merci pour votre confiance."];
    case "cancelled":
      return ["Dossier annulé", "Ce dossier a été annulé. Contactez l'atelier pour plus d'informations."];
    case "received":
    default:
      return ["Appareil reçu", "Votre appareil est bien arrivé à l'atelier. Le diagnostic va démarrer."];
  }
}

export function publicRepairPageTitle(status?: string | null): string {
  const key = normalizePublicRepairStatus(status);
  if (key === "returned" || key === "closed") return "Votre réparation est terminée";
  if (key === "cancelled") return "Votre dossier est annulé";
  return "Suivi de votre réparation";
}

export function publicRepairProgress(status?: string | null) {
  const key = normalizePublicRepairStatus(status);
  const stepIndex: Record<PublicRepairStatusKey, number> = {
    received: 0,
    diagnostic: 1,
    repair: 2,
    final_test: 3,
    ready: 4,
    returned: 4,
    closed: 4,
    cancelled: -1,
  };
  return {
    key,
    activeStepIndex: stepIndex[key],
    isFinished: key === "returned" || key === "closed",
    isCancelled: key === "cancelled",
    label: PUBLIC_REPAIR_STATUS_LABELS[key],
  };
}
