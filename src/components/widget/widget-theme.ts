// Thème, valeurs par défaut et formatage d'affichage du widget public.
//
// Rien ici ne dépend de React : uniquement de la config publiée et des règles
// métier d'affichage (prix, disponibilité, durée). Les libellés retombent sur
// des valeurs françaises neutres quand le réparateur n'a rien personnalisé.

import type { CSSProperties } from "react";

import type {
  PublicPrice,
  PublicStock,
  WidgetFeatures,
  WidgetLayout,
  WidgetTexts,
  WidgetVisual,
} from "@/lib/widget/public-types";

const DEFAULT_PRIMARY = "#2A9D8F";
const DEFAULT_TEXT = "#1A1916";
const DEFAULT_BACKGROUND = "#FFFFFF";
const DEFAULT_RADIUS = 14;

export const FEATURE_DEFAULTS: Required<WidgetFeatures> = {
  deviceSearch: true,
  priceEstimate: true,
  stockAvailability: true,
  duration: true,
  quoteRequest: true,
  callbackRequest: true,
  booking: true,
  shopChoice: true,
  qualityChoice: true,
  multiIssue: false,
  comment: true,
  photos: false,
  warranty: true,
  payments: false,
};

export function resolveFeatures(features: WidgetFeatures | undefined): Required<WidgetFeatures> {
  return { ...FEATURE_DEFAULTS, ...(features ?? {}) };
}

export const TEXT_DEFAULTS: Required<WidgetTexts> = {
  title: "Réparez votre appareil",
  introduction: "Obtenez une estimation et contactez l’atelier en quelques instants.",
  deviceTitle: "Votre appareil",
  issueTitle: "Le problème rencontré",
  resultTitle: "Votre estimation",
  contactTitle: "Vos coordonnées",
  bookingTitle: "Choisissez un créneau",
  firstNameLabel: "Prénom",
  lastNameLabel: "Nom",
  phoneLabel: "Téléphone",
  emailLabel: "E-mail",
  contactPreferenceLabel: "Préférence de contact",
  commentLabel: "Commentaire",
  requestTypeLabel: "Votre demande",
  photoLabel: "Photos",
  consentLabel: "J’autorise l’atelier à utiliser mes coordonnées pour traiter ma demande et me recontacter.",
  submitLabel: "Envoyer ma demande",
  callbackLabel: "Être rappelé",
  quoteLabel: "Demander un devis",
  bookingLabel: "Prendre rendez-vous",
};

export function resolveTexts(texts: WidgetTexts | undefined): Required<WidgetTexts> {
  return { ...TEXT_DEFAULTS, ...(texts ?? {}) };
}

export const LAYOUT_DEFAULTS: Required<WidgetLayout> = {
  blockOrder: ["header", "progress", "content", "actions"],
  hiddenBlocks: [],
  fieldOrder: ["identity", "contact", "preference", "comment", "photos", "request", "booking", "consent"],
  hiddenFields: [],
  columns: 1,
  alignment: "left",
  template: "classic",
};

export function resolveLayout(layout: WidgetLayout | undefined): Required<WidgetLayout> {
  return { ...LAYOUT_DEFAULTS, ...(layout ?? {}) };
}

// ---------------------------------------------------------------------------
// Thème visuel : variables CSS dérivées de la config, avec contraste calculé.
// ---------------------------------------------------------------------------

export type WidgetTheme = {
  primary: string;
  onPrimary: string;
  text: string;
  muted: string;
  background: string;
  surface: string;
  border: string;
  tint: string;
  radius: number;
  style: CSSProperties;
};

function parseHex(value: string | undefined): [number, number, number] | null {
  if (!value) return null;
  const hex = value.trim().replace(/^#/, "");
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

function readableOn(color: string): string {
  const rgb = parseHex(color);
  if (!rgb) return "#FFFFFF";
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5 ? "#1A1916" : "#FFFFFF";
}

function tintOf(color: string): string {
  const rgb = parseHex(color);
  return rgb ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.08)` : "rgba(42, 157, 143, 0.08)";
}

export function buildTheme(visual: WidgetVisual | undefined): WidgetTheme {
  const primary = parseHex(visual?.primaryColor) ? (visual?.primaryColor as string) : DEFAULT_PRIMARY;
  const text = parseHex(visual?.textColor) ? (visual?.textColor as string) : DEFAULT_TEXT;
  const background = parseHex(visual?.backgroundColor) ? (visual?.backgroundColor as string) : DEFAULT_BACKGROUND;
  const radius =
    typeof visual?.radius === "number" && visual.radius >= 0 ? Math.min(28, visual.radius) : DEFAULT_RADIUS;
  const onPrimary = readableOn(primary);
  const button = parseHex(visual?.buttonColor) ? (visual?.buttonColor as string) : primary;
  const onButton = parseHex(visual?.buttonTextColor) ? (visual?.buttonTextColor as string) : readableOn(button);
  const buttonStyle = visual?.buttonStyle ?? "solid";
  const pageBackground =
    visual?.backgroundStyle === "gradient"
      ? `linear-gradient(145deg, ${background}, ${tintOf(primary)})`
      : visual?.backgroundStyle === "tinted"
        ? `linear-gradient(${tintOf(primary)}, ${tintOf(primary)}), ${background}`
        : background;
  const theme: Omit<WidgetTheme, "style"> = {
    primary,
    onPrimary,
    text,
    muted: "#6B6B6B",
    background,
    surface: "#FFFFFF",
    border: "#E8E8E5",
    tint: tintOf(primary),
    radius,
  };
  return {
    ...theme,
    style: {
      "--w-primary": theme.primary,
      "--w-on-primary": theme.onPrimary,
      "--w-text": theme.text,
      "--w-muted": theme.muted,
      "--w-bg": theme.background,
      "--w-surface": theme.surface,
      "--w-border": theme.border,
      "--w-tint": theme.tint,
      "--w-radius": `${theme.radius}px`,
      "--w-button": button,
      "--w-on-button": onButton,
      "--w-button-bg": buttonStyle === "solid" ? button : buttonStyle === "soft" ? tintOf(button) : "transparent",
      "--w-button-fg": buttonStyle === "solid" ? onButton : button,
      "--w-button-border": button,
      "--w-page-bg": pageBackground,
      "--w-heading-scale": visual?.headingSize === "small" ? "0.9" : visual?.headingSize === "large" ? "1.15" : "1",
      "--w-text-scale": visual?.textSize === "small" ? "0.92" : visual?.textSize === "large" ? "1.08" : "1",
    } as CSSProperties,
  };
}

// ---------------------------------------------------------------------------
// Formatage métier.
// ---------------------------------------------------------------------------

export function formatMoney(amount: number, currency = "EUR", locale = "fr-FR"): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} €`;
  }
}

export type PriceDisplay = { label: string | null; onRequest: boolean };

// Renvoie soit un libellé de prix affichable, soit `onRequest` (aucun prix
// publié) : dans ce dernier cas le widget bascule vers une demande de contact.
export function formatPrice(price: PublicPrice | undefined, currency: string, locale: string): PriceDisplay {
  if (!price) return { label: null, onRequest: true };
  const money = (value: number) => formatMoney(value, price.currency || currency, locale);
  switch (price.mode) {
    case "exact":
      return typeof price.amount === "number" ? { label: money(price.amount), onRequest: false } : reqOnly();
    case "from":
      return typeof price.amount === "number"
        ? { label: `À partir de ${money(price.amount)}`, onRequest: false }
        : reqOnly();
    case "range":
      return typeof price.min === "number" && typeof price.max === "number"
        ? { label: `De ${money(price.min)} à ${money(price.max)}`, onRequest: false }
        : reqOnly();
    default:
      return reqOnly();
  }
}

function reqOnly(): PriceDisplay {
  return { label: null, onRequest: true };
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

// Jamais « disponible » par défaut : un stock non configuré reste « à confirmer ».
export function formatAvailability(stock: PublicStock | undefined): string {
  if (!stock || stock.mode === "hidden") return "Disponibilité à confirmer";
  if (stock.label) return stock.label;
  if (stock.mode === "quantity" && typeof stock.quantity === "number") {
    return stock.quantity > 0 ? `${stock.quantity} en stock` : "Sur commande";
  }
  if (stock.status) return STOCK_STATUS_LABELS[stock.status.toLowerCase()] ?? stock.status;
  return "Disponibilité à confirmer";
}

export function formatDuration(minutes: number | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${String(rest).padStart(2, "0")}` : `${hours} h`;
}

export function formatDateFr(iso: string): string {
  const date = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

export function formatDateTimeFr(dateIso: string, time: string): string {
  return `${formatDateFr(dateIso)} à ${time}`;
}

// Identifiant opaque pour session analytique et clé d'idempotence.
export function randomId(prefix = "w"): string {
  const raw =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  return `${prefix}_${raw}`.slice(0, 80);
}

export function defaultConsentText(shopName: string): string {
  const who = shopName?.trim() || "l’atelier";
  return `J’autorise ${who} à utiliser mes coordonnées pour traiter ma demande et me recontacter à ce sujet.`;
}

export const CONSENT_PRIVACY_VERSION = "1";
