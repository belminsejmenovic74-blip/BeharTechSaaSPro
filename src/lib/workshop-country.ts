export type WorkshopCountry = "FR" | "CH" | "autre";
export type WorkshopCurrency = "EUR" | "CHF";
export type WorkshopLocale = "fr-FR" | "fr-CH";

export type WorkshopCountryConfig = {
  country: WorkshopCountry;
  label: string;
  currency: WorkshopCurrency;
  locale: WorkshopLocale;
  phonePrefix: "+33" | "+41";
  postalCodeLabel: string;
  postalCodePattern: RegExp;
  defaultVatRate: number;
};

export type BillingProfile = {
  country: WorkshopCountry;
  name?: string;
  commercialName?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  canton?: string;
  phone?: string;
  email?: string;
  siret?: string;
  tvaNumber?: string;
  swissUid?: string;
  swissVatNumber?: string;
  vatApplicable?: boolean;
  vatRate?: number;
  tvaMention?: string;
};

export type BillingProfiles = Partial<Record<WorkshopCountry, BillingProfile>>;

const COUNTRY_CONFIG: Record<WorkshopCountry, WorkshopCountryConfig> = {
  FR: {
    country: "FR",
    label: "France",
    currency: "EUR",
    locale: "fr-FR",
    phonePrefix: "+33",
    postalCodeLabel: "Code postal",
    postalCodePattern: /^\d{5}$/,
    defaultVatRate: 20,
  },
  CH: {
    country: "CH",
    label: "Suisse",
    currency: "CHF",
    locale: "fr-CH",
    phonePrefix: "+41",
    postalCodeLabel: "NPA",
    postalCodePattern: /^\d{4}$/,
    defaultVatRate: 8.1,
  },
  autre: {
    country: "autre",
    label: "Autre",
    currency: "EUR",
    locale: "fr-FR",
    phonePrefix: "+33",
    postalCodeLabel: "Code postal",
    postalCodePattern: /^[a-zA-Z0-9\s-]{3,10}$/,
    defaultVatRate: 20,
  },
};

export function normalizeWorkshopCountry(value: unknown): WorkshopCountry {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "ch" || normalized === "suisse") return "CH";
  if (normalized === "autre") return "autre";
  return "FR";
}

export function getWorkshopCountryConfig(value: unknown): WorkshopCountryConfig {
  return COUNTRY_CONFIG[normalizeWorkshopCountry(value)];
}

export function getLegalFieldsByCountry(value: unknown) {
  const config = getWorkshopCountryConfig(value);
  if (config.country === "CH") {
    return {
      country: config.country,
      businessIdLabel: "Identifiant entreprise / IDE / UID",
      vatNumberLabel: "Numéro TVA suisse",
      postalCodeLabel: config.postalCodeLabel,
      showSiren: false,
      showSiret: false,
      showEuVatNumber: false,
      showSwissUid: true,
      showSwissVatNumber: true,
      showCanton: true,
    } as const;
  }
  if (config.country === "autre") {
    return {
      country: config.country,
      businessIdLabel: "Identifiant entreprise",
      vatNumberLabel: "Numéro TVA",
      postalCodeLabel: "Code postal",
      showSiren: false,
      showSiret: false,
      showEuVatNumber: false,
      showSwissUid: false,
      showSwissVatNumber: false,
      showCanton: false,
    } as const;
  }
  return {
    country: config.country,
    businessIdLabel: "SIRET",
    vatNumberLabel: "TVA intracommunautaire",
    postalCodeLabel: config.postalCodeLabel,
    showSiren: true,
    showSiret: true,
    showEuVatNumber: true,
    showSwissUid: false,
    showSwissVatNumber: false,
    showCanton: false,
  } as const;
}

export function createBillingProfile(
  settings: Partial<BillingProfile> & { country?: WorkshopCountry },
  countryValue: unknown,
): BillingProfile {
  const config = getWorkshopCountryConfig(countryValue);
  const isSwiss = config.country === "CH";
  const vatApplicable = Boolean(settings.vatApplicable);
  return {
    country: config.country,
    name: settings.name ?? "",
    commercialName: settings.commercialName ?? "",
    address: settings.address ?? "",
    postalCode: settings.postalCode ?? "",
    city: settings.city ?? "",
    canton: isSwiss ? settings.canton ?? "" : "",
    phone: settings.phone ?? config.phonePrefix,
    email: settings.email ?? "",
    siret: isSwiss ? "" : settings.siret ?? "",
    tvaNumber: isSwiss ? "" : settings.tvaNumber ?? "",
    swissUid: isSwiss ? settings.swissUid ?? "" : "",
    swissVatNumber: isSwiss && vatApplicable ? settings.swissVatNumber ?? "" : "",
    vatApplicable,
    vatRate: vatApplicable ? Number(settings.vatRate || config.defaultVatRate) : 0,
    tvaMention: vatApplicable
      ? ""
      : isSwiss
        ? settings.tvaMention || "Non assujetti à la TVA"
        : settings.tvaMention || "TVA non applicable, art. 293 B du CGI",
  };
}

export function isBillingProfileComplete(profile: BillingProfile): boolean {
  const config = getWorkshopCountryConfig(profile.country);
  const baseComplete =
    Boolean(profile.name?.trim()) &&
    Boolean(profile.address?.trim()) &&
    config.postalCodePattern.test(profile.postalCode?.trim() ?? "") &&
    Boolean(profile.city?.trim()) &&
    Boolean(profile.phone?.trim()) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(profile.email?.trim() ?? "");
  if (!baseComplete) return false;
  if (profile.country === "FR") return /^\d{14}$/.test((profile.siret ?? "").replace(/\D/g, ""));
  return true;
}

type MoneySettings =
  | WorkshopCountry
  | WorkshopCurrency
  | {
      country?: WorkshopCountry;
      currency?: WorkshopCurrency;
      locale?: WorkshopLocale;
    };

export function formatMoney(value: number, settings: MoneySettings = "FR"): string {
  const finiteValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const byCurrency = settings === "CHF" || settings === "EUR";
  const countryConfig = getWorkshopCountryConfig(
    typeof settings === "object" ? settings.country : settings === "CH" || settings === "CHF" ? "CH" : "FR",
  );
  const currency =
    typeof settings === "object"
      ? settings.currency ?? countryConfig.currency
      : byCurrency
        ? settings
        : countryConfig.currency;
  const locale =
    typeof settings === "object"
      ? settings.locale ?? (currency === "CHF" ? "fr-CH" : "fr-FR")
      : currency === "CHF"
        ? "fr-CH"
        : "fr-FR";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: currency === "CHF" ? "code" : "symbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(finiteValue);
}

export const formatCurrency = formatMoney;

export function formatMoneyShort(value: number, settings: MoneySettings = "FR"): string {
  const finiteValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const full = formatMoney(0, settings);
  const unit =
    full
      .replace(/[\d\s.,'’\u00a0]/g, "")
      .trim() || (settings === "CH" || settings === "CHF" ? "CHF" : "EUR");
  if (Math.abs(finiteValue) >= 1000) {
    const thousands = finiteValue / 1000;
    return `${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}k ${unit}`;
  }
  return `${Math.round(finiteValue)} ${unit}`;
}

export function parseMoney(value: string | number): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = value
    .replace(/\s/g, "")
    .replace(/\u20AC/g, "")
    .replace(/\b(?:EUR|CHF)\b/gi, "")
    .replace(",", ".")
    .trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type DocumentFilenameType =
  | "intake"
  | "quote"
  | "invoice"
  | "payment"
  | "internal"
  | "summary"
  | "sale-receipt"
  | "sale-invoice"
  | "diagnostic_report";

const DOCUMENT_FILE_PREFIX: Record<DocumentFilenameType, string> = {
  intake: "bon-prise-en-charge",
  quote: "devis",
  invoice: "facture",
  payment: "recu-paiement",
  internal: "fiche-intervention",
  summary: "resume-dossier",
  "sale-receipt": "recu-vente",
  "sale-invoice": "facture-vente",
  diagnostic_report: "rapport-diagnostic",
};

export function getDocumentFilename(type: DocumentFilenameType, documentNumber: string): string {
  const safeNumber =
    String(documentNumber || "document")
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "document";
  return `${DOCUMENT_FILE_PREFIX[type]}-${safeNumber}.pdf`;
}
