import type { StoreState } from "@/lib/behar-store";
import { createShopSlug } from "@/lib/customer-tracking";
import { buildPublicCommercialDtoFromLocalState } from "@/lib/public-commercial-dto";
import type { PublicCommercialDocumentDto } from "@/lib/public-dtos";
import { getSupabase } from "@/lib/supabase/client";

type CommercialKind = PublicCommercialDocumentDto["kind"];

type DocumentSyncState = Pick<
  StoreState,
  | "cloudSync"
  | "customers"
  | "invoices"
  | "payments"
  | "quotes"
  | "repairs"
  | "sales"
  | "workshopInfo"
  | "workshopSettings"
>;

// Statuts à ne PAS publier : brouillons / annulations (rien d'utile pour le client).
const SKIPPED_STATUSES = new Set(["Brouillon", "Annulée", "Annulé", "draft", "cancelled", "canceled"]);
const CONFIRMED_PAYMENT_STATUSES = new Set(["Payé", "paid", "Partiellement réglé", "partially_paid"]);

/**
 * Pousse les documents commerciaux (devis, factures, reçus, ventes) vers la table
 * dénormalisée `public_tracking_documents`, lue par les pages publiques
 * /devis /facture /recu /vente via la clé anon. Même mécanisme que les
 * réparations (cf. syncPublicTrackingRepairsToCloud). Fire-and-forget.
 */
export async function syncPublicTrackingDocumentsToCloud(state: DocumentSyncState): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const workshopId = state.cloudSync?.workshopId || "unknown";
  const shopName = (
    state.workshopSettings?.commercialName ||
    state.workshopSettings?.name ||
    state.workshopInfo?.name ||
    "behar-tech"
  ).trim();
  const shopSlug = createShopSlug(shopName);

  const entries: Array<{ kind: CommercialKind; id: string; number?: string }> = [];
  for (const quote of state.quotes ?? []) {
    if (SKIPPED_STATUSES.has(quote.status)) continue;
    entries.push({ kind: "quote", id: quote.id, number: quote.number });
  }
  for (const invoice of state.invoices ?? []) {
    if (SKIPPED_STATUSES.has(invoice.status)) continue;
    entries.push({ kind: "invoice", id: invoice.id, number: invoice.number });
  }
  for (const payment of state.payments ?? []) {
    if (!CONFIRMED_PAYMENT_STATUSES.has(payment.status)) continue;
    entries.push({ kind: "receipt", id: payment.id, number: payment.paymentNumber });
  }
  for (const sale of state.sales ?? []) {
    if (SKIPPED_STATUSES.has(sale.status)) continue;
    entries.push({ kind: "sale", id: sale.id, number: sale.number });
  }
  // Bon de prise en charge : un « intake » par réparation active (token = repair.id),
  // pour que le client puisse le consulter/télécharger depuis la page de suivi.
  for (const repair of state.repairs ?? []) {
    if (repair?.publicAccess?.active === false) continue;
    entries.push({ kind: "intake", id: repair.id, number: repair.number });
  }

  const payload = entries
    .map((entry) => {
      const publicData = buildPublicCommercialDtoFromLocalState(state, entry.kind, entry.id);
      if (!publicData) return null;
      return {
        token: entry.id,
        kind: entry.kind,
        workshop_id: workshopId,
        shop_slug: shopSlug,
        document_number: entry.number || publicData.document.number,
        status: publicData.document.status,
        public_data: publicData,
        updated_at: new Date().toISOString(),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (!payload.length) return true;

  const { error } = await supabase.from("public_tracking_documents").upsert(payload, { onConflict: "token" });
  if (error) {
    console.error("[public-tracking-documents-sync] Failed to sync documents:", error.message);
    return false;
  }
  return true;
}
