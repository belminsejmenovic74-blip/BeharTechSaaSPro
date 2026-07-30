import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { deriveCapabilities, type Capabilities } from "@/lib/capabilities";
import type { AppSession } from "@/lib/auth/app-session";

export type ServerCapabilityContext = {
  capabilities: Capabilities;
  registrationNumber: string | null;
};

/** Code PostgreSQL `undefined_column`, remonté tel quel par PostgREST. */
const UNDEFINED_COLUMN = "42703";

/**
 * Vrai tant que la migration `20260729231517` n'est pas passée sur la base
 * ciblée. La capacité n'existant pas encore, tous les ateliers étaient
 * facturables : c'est cet état-là qu'on rejoue, et rien d'autre.
 */
export function isLegacySchemaError(error: { code?: string } | null): boolean {
  return error?.code === UNDEFINED_COLUMN;
}

/**
 * Capacités d'un atelier, tolérantes aux deux états du schéma.
 *
 * Le code et la migration ne sont jamais déployés dans la même seconde. Sans
 * cette tolérance, publier l'application avant la migration ferait échouer
 * chaque lecture de capacité : synchronisation en 503 et facturation retirée à
 * tous les ateliers, alors que rien n'a changé pour eux. On ne retombe sur le
 * mode historique que sur `undefined_column`, jamais sur une erreur réseau ou
 * de permission, qui doivent rester bloquantes.
 */
export async function getWorkshopCapabilityContext(
  admin: SupabaseClient,
  workshopId: string,
  licenseId?: string | null,
): Promise<ServerCapabilityContext> {
  const licenseQuery = licenseId
    ? admin.from("license_keys").select("plan").eq("id", licenseId).maybeSingle()
    : admin.from("license_keys").select("plan").eq("workshop_id", workshopId).maybeSingle();

  const [workshopResult, licenseResult] = await Promise.all([
    admin.from("workshops").select("has_billing,siret").eq("id", workshopId).maybeSingle(),
    licenseQuery,
  ]);
  if (licenseResult.error) throw new Error("Forfait de l’atelier indisponible.");

  if (isLegacySchemaError(workshopResult.error)) {
    const legacy = await admin.from("workshops").select("siret").eq("id", workshopId).maybeSingle();
    if (legacy.error) throw new Error("Capacité de l’atelier indisponible.");
    if (!legacy.data) throw new Error("Atelier introuvable.");
    return {
      capabilities: deriveCapabilities({ billingEnabled: true, plan: licenseResult.data?.plan }),
      registrationNumber: legacy.data.siret || null,
    };
  }

  if (workshopResult.error) throw new Error("Capacité de l’atelier indisponible.");
  if (!workshopResult.data) throw new Error("Atelier introuvable.");

  return {
    capabilities: deriveCapabilities({
      billingEnabled: workshopResult.data.has_billing === true,
      plan: licenseResult.data?.plan,
    }),
    registrationNumber: workshopResult.data.siret || null,
  };
}

export async function getSessionCapabilityContext(
  admin: SupabaseClient,
  session: AppSession,
): Promise<ServerCapabilityContext> {
  return getWorkshopCapabilityContext(admin, session.workshopId, session.licenseId);
}

export async function requireBillingCapability(
  admin: SupabaseClient,
  workshopId: string,
  licenseId?: string | null,
): Promise<ServerCapabilityContext | Response> {
  try {
    const context = await getWorkshopCapabilityContext(admin, workshopId, licenseId);
    if (!context.capabilities.canInvoice) {
      return Response.json(
        { error: "billing_capability_required", message: "Cet atelier n’est pas autorisé à facturer." },
        { status: 403 },
      );
    }
    return context;
  } catch {
    return Response.json(
      { error: "capability_unavailable", message: "Vérification de capacité momentanément indisponible." },
      { status: 503 },
    );
  }
}

export async function requireAccountingExportCapability(
  admin: SupabaseClient,
  workshopId: string,
  licenseId?: string | null,
): Promise<ServerCapabilityContext | Response> {
  const billing = await requireBillingCapability(admin, workshopId, licenseId);
  if (billing instanceof Response) return billing;
  if (!billing.capabilities.canExportAccounting) {
    return Response.json(
      {
        error: "plan_upgrade_required",
        message: "L’export comptable est disponible avec les offres Pro et Business.",
      },
      { status: 403 },
    );
  }
  return billing;
}

const COMMERCIAL_STATE_KEYS = [
  "quotes",
  "invoices",
  "sales",
  "payments",
  "selectedQuoteId",
  "selectedInvoiceId",
  "selectedSaleId",
  "selectedPaymentId",
] as const;

const COMMERCIAL_DOCUMENT_TYPES = new Set([
  "quote",
  "invoice",
  "payment",
  "payment_receipt",
  "payment_confirmation",
  "sale-receipt",
  "sale-invoice",
  "credit_note",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function internalDocuments(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry) => !isRecord(entry) || !COMMERCIAL_DOCUMENT_TYPES.has(String(entry.type ?? entry.document_type ?? "")),
  );
}

export function redactCommercialSnapshot(state: Record<string, unknown>): Record<string, unknown> {
  return {
    ...state,
    quotes: [],
    invoices: [],
    sales: [],
    payments: [],
    selectedQuoteId: "",
    selectedInvoiceId: "",
    selectedSaleId: "",
    selectedPaymentId: "",
    documents: internalDocuments(state.documents),
  };
}

export function preserveCommercialSnapshot(
  incoming: Record<string, unknown>,
  existing?: Record<string, unknown> | null,
): Record<string, unknown> {
  const preserved = { ...incoming };
  for (const key of COMMERCIAL_STATE_KEYS) {
    preserved[key] = existing?.[key] ?? (key.startsWith("selected") ? "" : []);
  }
  const existingCommercialDocuments = Array.isArray(existing?.documents)
    ? existing.documents.filter(
        (entry) => isRecord(entry) && COMMERCIAL_DOCUMENT_TYPES.has(String(entry.type ?? entry.document_type ?? "")),
      )
    : [];
  preserved.documents = [...internalDocuments(incoming.documents), ...existingCommercialDocuments];
  return preserved;
}

export function hasCommercialSnapshotMutation(
  incoming: Record<string, unknown>,
  existing?: Record<string, unknown> | null,
): boolean {
  const incomingCommercial = preserveCommercialSnapshot({}, incoming);
  const existingCommercial = preserveCommercialSnapshot({}, existing);
  return JSON.stringify(incomingCommercial) !== JSON.stringify(existingCommercial);
}

export function commercialSnapshotHasContent(state: Record<string, unknown>): boolean {
  if (COMMERCIAL_STATE_KEYS.some((key) => Array.isArray(state[key]) && (state[key] as unknown[]).length > 0)) {
    return true;
  }
  return Array.isArray(state.documents)
    ? state.documents.some(
        (entry) => isRecord(entry) && COMMERCIAL_DOCUMENT_TYPES.has(String(entry.type ?? entry.document_type ?? "")),
      )
    : false;
}

export function redactPublicRepairPayload(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const clean: Record<string, unknown> = {
    ...value,
    quoteLinks: [],
    invoiceLinks: [],
    receiptLinks: [],
  };
  if (Array.isArray(clean.documents)) {
    clean.documents = clean.documents.filter(
      (entry: unknown) =>
        !isRecord(entry) ||
        !COMMERCIAL_DOCUMENT_TYPES.has(String(entry.type ?? entry.documentType ?? entry.document_type ?? "")),
    );
  }
  return clean;
}

export function redactPublicDocumentAmounts(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactPublicDocumentAmounts);
  if (!isRecord(value)) return value;
  const clean: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (["amount", "customerPrice", "totalTtc", "unitPriceTtc"].includes(key)) continue;
    clean[key] = redactPublicDocumentAmounts(nested);
  }
  return clean;
}
