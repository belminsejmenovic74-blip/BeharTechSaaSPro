// plan-limits — limites d'abonnement appliquées selon la licence (licensePlan).
// Un plan inconnu (ex. « Pilote », licences historiques) n'est JAMAIS limité :
// on ne bloque pas un atelier existant tant que la facturation n'est pas en place.

import { paymentDateToIso } from "@/lib/payment-date";

export type PlanKey = "gratuit" | "starter" | "pro" | "business" | "unlimited";

/** null = illimité. */
export type PlanLimits = {
  devices: number | null;
  repairsPerMonth: number | null;
  smsPerMonth: number | null;
};

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  gratuit: { devices: 1, repairsPerMonth: 10, smsPerMonth: 10 },
  starter: { devices: 2, repairsPerMonth: null, smsPerMonth: 30 },
  pro: { devices: 4, repairsPerMonth: null, smsPerMonth: 150 },
  business: { devices: null, repairsPerMonth: null, smsPerMonth: 250 },
  unlimited: { devices: null, repairsPerMonth: null, smsPerMonth: null },
};

export function normalizePlanKey(plan?: string | null): PlanKey {
  const value = String(plan ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  if (/business/.test(value)) return "business";
  if (/\bpro\b|^pro/.test(value) && !/pilote/.test(value)) return "pro";
  if (/starter/.test(value)) return "starter";
  if (/gratuit|free/.test(value)) return "gratuit";
  return "unlimited";
}

export function getPlanLimits(plan?: string | null): PlanLimits {
  return PLAN_LIMITS[normalizePlanKey(plan)];
}

const currentMonthPrefix = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const isoMonthOf = (raw?: string | null): string | null => {
  if (!raw) return null;
  // Dates ISO directes, sinon libellés français (« 6 juillet 2026, 14:32 »).
  if (/^\d{4}-\d{2}/.test(raw)) return raw.slice(0, 7);
  const iso = paymentDateToIso(raw);
  return iso ? iso.slice(0, 7) : null;
};

export function countThisMonth(items: Array<{ createdAt?: string; droppedAt?: string }>): number {
  const month = currentMonthPrefix();
  return items.filter((item) => isoMonthOf(item.droppedAt || item.createdAt) === month).length;
}

export function countSmsThisMonth(logs: Array<{ channel: string; createdAt?: string }>): number {
  const month = currentMonthPrefix();
  return logs.filter((log) => log.channel === "SMS" && isoMonthOf(log.createdAt) === month).length;
}

export type PlanCheck = { allowed: boolean; reason?: string };

export function checkRepairQuota(plan: string | null | undefined, repairsThisMonth: number): PlanCheck {
  const limit = getPlanLimits(plan).repairsPerMonth;
  if (limit == null || repairsThisMonth < limit) return { allowed: true };
  return {
    allowed: false,
    reason: `Limite atteinte : ${limit} réparations/mois avec l'offre actuelle. Passez à une offre supérieure pour continuer.`,
  };
}

export function checkSmsQuota(plan: string | null | undefined, smsThisMonth: number): PlanCheck {
  const limit = getPlanLimits(plan).smsPerMonth;
  if (limit == null || smsThisMonth < limit) return { allowed: true };
  return {
    allowed: false,
    reason: `Limite atteinte : ${limit} SMS/mois inclus dans l'offre actuelle.`,
  };
}

export function checkDeviceQuota(
  plan: string | null | undefined,
  registeredDeviceIds: string[],
  deviceId: string,
): PlanCheck {
  const limit = getPlanLimits(plan).devices;
  if (limit == null || registeredDeviceIds.includes(deviceId) || registeredDeviceIds.length < limit) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: `Limite atteinte : ${limit} appareil(s) connecté(s) avec l'offre actuelle. Déconnectez un appareil ou changez d'offre.`,
  };
}
