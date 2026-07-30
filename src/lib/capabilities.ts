import { getPlanLimits, normalizePlanKey, type PlanLimits } from "@/lib/plan-limits";

export type Capabilities = {
  ready: boolean;
  canInvoice: boolean;
  canQuote: boolean;
  canCollectPayment: boolean;
  canManagePurchases: boolean;
  canExportAccounting: boolean;
  planLimits: PlanLimits;
  plan: string;
  accountingExportUpgradeRequired: boolean;
};

export type CapabilitySource = {
  billingEnabled: boolean;
  plan?: string | null;
  ready?: boolean;
};

export function deriveCapabilities(source: CapabilitySource): Capabilities {
  const plan = String(source.plan || "Gratuit");
  const planKey = normalizePlanKey(plan);
  const accountingExportIncluded = planKey === "pro" || planKey === "business" || planKey === "unlimited";
  const billingEnabled = source.billingEnabled === true;

  return {
    ready: source.ready !== false,
    canInvoice: billingEnabled,
    canQuote: billingEnabled,
    canCollectPayment: billingEnabled,
    canManagePurchases: billingEnabled,
    canExportAccounting: billingEnabled && accountingExportIncluded,
    planLimits: getPlanLimits(plan),
    plan,
    accountingExportUpgradeRequired: billingEnabled && !accountingExportIncluded,
  };
}

export const PENDING_CAPABILITIES: Capabilities = deriveCapabilities({
  billingEnabled: false,
  plan: "Gratuit",
  ready: false,
});

export function withBillingRegistration<T extends Record<string, unknown>>(
  workshop: T,
  registrationNumber?: string | null,
): T {
  return {
    ...workshop,
    siret: registrationNumber || workshop.siret || "",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function withoutRegistrationFields(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const clean = { ...value };
  delete clean.siret;
  delete clean.has_billing;
  delete clean.hasBilling;
  if (isRecord(clean.billingProfiles)) {
    clean.billingProfiles = Object.fromEntries(
      Object.entries(clean.billingProfiles).map(([key, profile]) => [key, withoutRegistrationFields(profile)]),
    );
  }
  return clean;
}

/**
 * Legal registration never travels in localStorage or workshop snapshots.
 * Customer SIRETs are intentionally untouched: only account-shaped objects are
 * stripped.
 */
export function stripAccountCapabilityFields<T extends Record<string, unknown>>(state: T): T {
  const clean: Record<string, unknown> = { ...state };
  if ("workshopInfo" in clean) clean.workshopInfo = withoutRegistrationFields(clean.workshopInfo);
  if ("workshopSettings" in clean) clean.workshopSettings = withoutRegistrationFields(clean.workshopSettings);
  delete clean.has_billing;
  delete clean.hasBilling;
  return clean as T;
}
