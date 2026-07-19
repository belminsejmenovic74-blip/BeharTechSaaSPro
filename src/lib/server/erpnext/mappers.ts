import "server-only";

const VAT_EXEMPTION_MENTION = "TVA non applicable, article 293 B du CGI";

type OptionalFields = Record<string, string | number | undefined>;

export type ErpNextCustomerInput = {
  id: string;
  name: string;
  shopName: string;
  customerGroup?: string;
  territory?: string;
  marketingConsent?: boolean;
};

export type ErpNextSupplierInput = {
  id: string;
  name: string;
  supplierGroup?: string;
  vatNumber?: string;
  siret?: string;
  notes?: string;
};

export type ErpNextItemInput = {
  id: string;
  sku: string;
  name: string;
  itemGroup: string;
  deviceType?: string;
  model?: string;
  quality?: string;
  warrantyMonths?: number;
  compatibleModels?: string[];
  active?: boolean;
};

export type ErpNextDraftInvoiceInput = {
  legalInvoicingEnabled: boolean;
  company: string;
  customerErpNextName: string;
  externalId: string;
  trackingId?: string;
  repairId?: string;
  shopName: string;
  technicianUserId?: string;
  repairStatus?: string;
  device?: string;
  serialOrImei?: string;
  warranty?: string;
  partsCost?: number;
  laborAmount?: number;
  paymentProvider?: string;
  postingDate: string;
  dueDate?: string;
  currency?: string;
  lines: Array<{
    itemCode: string;
    description?: string;
    quantity: number;
    unitPrice: number;
  }>;
};

function requireText(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} est requis pour la synchronisation ERPNext.`);
  return normalized;
}

function compact<T extends OptionalFields>(fields: T): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined && value !== ""),
  ) as Record<string, string | number>;
}

function finiteNonNegative(value: number | undefined, label: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} doit être un nombre positif ou nul.`);
  return value;
}

function isoDate(value: string, label: string): string {
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) throw new Error(`${label} doit utiliser le format AAAA-MM-JJ.`);
  return match[1];
}

function externalPaymentProvider(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized.includes("stripe")) return "Stripe";
  if (normalized.includes("sumup")) return "SumUp";
  if (normalized.includes("paypal")) return "PayPal";
  return undefined;
}

export function mapCustomerToErpNext(input: ErpNextCustomerInput): Record<string, unknown> {
  return {
    ...compact({
      customer_name: requireText(input.name, "Le nom du client"),
      customer_group: input.customerGroup?.trim(),
      territory: input.territory?.trim(),
      custom_identifiant_client_behar_tech_pro: requireText(input.id, "L’identifiant client"),
      custom_boutique_rattachee: requireText(input.shopName, "La boutique"),
    }),
    customer_type: "Individual",
    custom_consentement_marketing: input.marketingConsent ? 1 : 0,
  };
}

export function mapSupplierToErpNext(input: ErpNextSupplierInput): Record<string, unknown> {
  return compact({
    supplier_name: requireText(input.name, "Le nom du fournisseur"),
    supplier_group: input.supplierGroup?.trim(),
    custom_identifiant_fournisseur_behar_tech_pro: requireText(input.id, "L’identifiant fournisseur"),
    custom_siret: input.siret?.trim(),
    custom_tva_intracommunautaire: input.vatNumber?.trim(),
    custom_references_fournisseur: input.notes?.trim(),
  });
}

export function mapItemToErpNext(input: ErpNextItemInput): Record<string, unknown> {
  const warrantyMonths = finiteNonNegative(input.warrantyMonths, "La garantie");
  return {
    ...compact({
      item_code: requireText(input.sku, "Le SKU"),
      item_name: requireText(input.name, "Le nom de l’article"),
      item_group: requireText(input.itemGroup, "Le groupe d’articles"),
      custom_identifiant_article_behar_tech_pro: requireText(input.id, "L’identifiant article"),
      custom_type_dappareil: input.deviceType?.trim(),
      custom_modele_appareil: input.model?.trim(),
      custom_qualite: input.quality?.trim(),
      custom_garantie_en_mois: warrantyMonths,
      custom_compatibilite: input.compatibleModels
        ?.map((model) => model.trim())
        .filter(Boolean)
        .join("\n"),
    }),
    stock_uom: "Unit",
    is_stock_item: 1,
    include_item_in_manufacturing: 0,
    disabled: input.active === false ? 1 : 0,
  };
}

export function mapDraftInvoiceToErpNext(input: ErpNextDraftInvoiceInput): Record<string, unknown> {
  if (!input.legalInvoicingEnabled) {
    throw new Error("La synchronisation des factures est bloquée tant que l’entreprise n’est pas immatriculée.");
  }
  if (!input.lines.length) throw new Error("Une facture ERPNext doit contenir au moins une ligne.");

  const provider = externalPaymentProvider(input.paymentProvider);
  return {
    ...compact({
      company: requireText(input.company, "La société"),
      customer: requireText(input.customerErpNextName, "Le client ERPNext"),
      posting_date: isoDate(input.postingDate, "La date de facture"),
      due_date: input.dueDate ? isoDate(input.dueDate, "La date d’échéance") : undefined,
      currency: input.currency?.trim() || "EUR",
      terms: VAT_EXEMPTION_MENTION,
      custom_mention_tva: VAT_EXEMPTION_MENTION,
      custom_identifiant_dossier_behar_tech_pro: input.repairId?.trim(),
      custom_identifiant_de_suivi_behar_tech_pro:
        input.trackingId?.trim() || requireText(input.externalId, "L’identifiant facture"),
      custom_boutique_rattachee: requireText(input.shopName, "La boutique"),
      custom_technicien: input.technicianUserId?.trim(),
      custom_statut_de_reparation: input.repairStatus?.trim(),
      custom_appareil: input.device?.trim(),
      custom_imei_ou_numero_de_serie: input.serialOrImei?.trim(),
      custom_garantie_applicable: input.warranty?.trim(),
      custom_cout_des_pieces: finiteNonNegative(input.partsCost, "Le coût des pièces"),
      custom_montant_main_oeuvre: finiteNonNegative(input.laborAmount, "Le montant de main-d’œuvre"),
      custom_prestataire_de_paiement_externe: provider,
    }),
    docstatus: 0,
    update_stock: 0,
    custom_paiement_effectue_hors_behar_tech_pro: provider ? 1 : 0,
    items: input.lines.map((line) => ({
      item_code: requireText(line.itemCode, "Le code article de la ligne"),
      description: line.description?.trim(),
      qty: finiteNonNegative(line.quantity, "La quantité"),
      rate: finiteNonNegative(line.unitPrice, "Le prix unitaire"),
    })),
  };
}

export { VAT_EXEMPTION_MENTION };
