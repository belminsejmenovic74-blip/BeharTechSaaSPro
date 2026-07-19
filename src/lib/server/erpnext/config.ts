import "server-only";

const DEFAULT_TIMEOUT_MS = 15_000;

type Environment = Record<string, string | undefined>;

export type ErpNextConfig = {
  enabled: boolean;
  configured: boolean;
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  /** Ateliers autorisés à synchroniser. Vide + allowAllWorkshops=false → aucun. */
  workshopIds: string[];
  /** ERPNEXT_WORKSHOP_ID="*" → tous les ateliers sont synchronisés. */
  allowAllWorkshops: boolean;
  company: string;
  branch: string;
  warehouse: string;
  customerGroup: string;
  supplierGroup: string;
  itemGroup: string;
  territory: string;
  currency: string;
  sellingPriceList: string;
  buyingPriceList: string;
  requestTimeoutMs: number;
};

function isEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function parseTimeout(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1_000 || parsed > 60_000) return DEFAULT_TIMEOUT_MS;
  return Math.round(parsed);
}

function normalizeBaseUrl(value: string | undefined): string {
  const source = value?.trim();
  if (!source) return "";

  const url = new URL(source);
  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !isLocalhost) {
    throw new Error("ERPNEXT_BASE_URL doit utiliser HTTPS hors environnement local.");
  }

  return url.origin;
}

export function readErpNextConfig(env: Environment = process.env): ErpNextConfig {
  const enabled = isEnabled(env.ERPNEXT_SYNC_ENABLED);
  const baseUrl = normalizeBaseUrl(env.ERPNEXT_BASE_URL);
  const apiKey = env.ERPNEXT_API_KEY?.trim() ?? "";
  const apiSecret = env.ERPNEXT_API_SECRET?.trim() ?? "";
  const workshopScope = env.ERPNEXT_WORKSHOP_ID?.trim() ?? "";
  const allowAllWorkshops = workshopScope === "*";
  const workshopIds = allowAllWorkshops
    ? []
    : workshopScope
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
  const configured = Boolean(baseUrl && apiKey && apiSecret && (allowAllWorkshops || workshopIds.length));

  if (enabled && !configured) {
    throw new Error(
      "La synchronisation ERPNext est activée mais son URL, ses identifiants ou ERPNEXT_WORKSHOP_ID manque.",
    );
  }

  return {
    enabled,
    configured,
    baseUrl,
    apiKey,
    apiSecret,
    workshopIds,
    allowAllWorkshops,
    company: env.ERPNEXT_COMPANY?.trim() || "Behar Tech Pro",
    branch: env.ERPNEXT_DEFAULT_BRANCH?.trim() || "Boutique principale",
    warehouse: env.ERPNEXT_DEFAULT_WAREHOUSE?.trim() || "Entrepôt principal - BTP",
    customerGroup: env.ERPNEXT_DEFAULT_CUSTOMER_GROUP?.trim() || "Particuliers",
    supplierGroup: env.ERPNEXT_DEFAULT_SUPPLIER_GROUP?.trim() || "Fournisseurs BEHAR TECH PRO",
    itemGroup: env.ERPNEXT_DEFAULT_ITEM_GROUP?.trim() || "Articles synchronisés BEHAR TECH PRO",
    territory: env.ERPNEXT_DEFAULT_TERRITORY?.trim() || "All Territories",
    currency: env.ERPNEXT_CURRENCY?.trim() || "EUR",
    sellingPriceList: env.ERPNEXT_SELLING_PRICE_LIST?.trim() || "Standard Selling",
    buyingPriceList: env.ERPNEXT_BUYING_PRICE_LIST?.trim() || "Standard Buying",
    requestTimeoutMs: parseTimeout(env.ERPNEXT_REQUEST_TIMEOUT_MS),
  };
}

export function getErpNextSafeStatus(env: Environment = process.env) {
  const config = readErpNextConfig(env);
  return {
    enabled: config.enabled,
    configured: config.configured,
    workshopScope: config.allowAllWorkshops ? "all" : config.workshopIds.length,
    baseUrl: config.baseUrl || null,
    company: config.company,
    branch: config.branch,
    warehouse: config.warehouse,
    customerGroup: config.customerGroup,
    supplierGroup: config.supplierGroup,
    itemGroup: config.itemGroup,
    territory: config.territory,
    currency: config.currency,
    sellingPriceList: config.sellingPriceList,
    buyingPriceList: config.buyingPriceList,
  };
}
