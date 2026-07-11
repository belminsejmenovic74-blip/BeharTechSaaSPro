import { z } from "zod";

import type { WidgetFeatureKey, WidgetIconTarget, WidgetTextKey } from "@/lib/widget/public-types";

export const WIDGET_BLOCKS = ["header", "progress", "content", "actions"] as const;
export const WIDGET_FIELDS = [
  "identity",
  "contact",
  "preference",
  "comment",
  "photos",
  "request",
  "booking",
  "consent",
] as const;
export const WIDGET_ICON_TARGETS = [
  "phone",
  "tablet",
  "computer",
  "console",
  "battery",
  "screen",
  "charging",
  "appointment",
  "confirmation",
] as const;

export type WidgetBlockKey = (typeof WIDGET_BLOCKS)[number];
export type WidgetFieldKey = (typeof WIDGET_FIELDS)[number];

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const cleanText = (max: number) => z.string().trim().max(max);

const generalSchema = z
  .object({
    commercialName: cleanText(160),
    phone: cleanText(40),
    address: cleanText(300),
    locale: z.enum(["fr-FR", "fr-CH"]),
    currency: z.enum(["EUR", "CHF"]),
    privacyUrl: z.union([z.literal(""), z.string().url().max(500)]),
  })
  .strict();

const visualSchema = z
  .object({
    primaryColor: color,
    buttonColor: color,
    buttonTextColor: color,
    textColor: color,
    backgroundColor: color,
    radius: z.number().int().min(0).max(28),
    logoUrl: z.union([z.literal(""), z.string().url().max(1000)]),
    backgroundStyle: z.enum(["plain", "tinted", "gradient"]),
    buttonStyle: z.enum(["solid", "soft", "outline"]),
    headingSize: z.enum(["small", "medium", "large"]),
    textSize: z.enum(["small", "medium", "large"]),
    contentWidth: z.enum(["compact", "standard", "wide"]),
  })
  .strict();

const textsSchema = z
  .object({
    title: cleanText(120),
    introduction: cleanText(300),
    deviceTitle: cleanText(120),
    issueTitle: cleanText(120),
    resultTitle: cleanText(120),
    contactTitle: cleanText(120),
    bookingTitle: cleanText(120),
    firstNameLabel: cleanText(80),
    lastNameLabel: cleanText(80),
    phoneLabel: cleanText(80),
    emailLabel: cleanText(80),
    contactPreferenceLabel: cleanText(100),
    commentLabel: cleanText(100),
    requestTypeLabel: cleanText(100),
    photoLabel: cleanText(100),
    consentLabel: cleanText(300),
    submitLabel: cleanText(80),
    callbackLabel: cleanText(80),
    quoteLabel: cleanText(80),
    bookingLabel: cleanText(80),
  })
  .strict();

const featuresSchema = z
  .object({
    deviceSearch: z.boolean(),
    priceEstimate: z.boolean(),
    stockAvailability: z.boolean(),
    duration: z.boolean(),
    quoteRequest: z.boolean(),
    callbackRequest: z.boolean(),
    booking: z.boolean(),
    shopChoice: z.boolean(),
    qualityChoice: z.boolean(),
    multiIssue: z.boolean(),
    comment: z.boolean(),
    photos: z.boolean(),
    warranty: z.boolean(),
    payments: z.boolean(),
  })
  .strict();

const uniqueOrder = <T extends string>(allowed: readonly T[]) =>
  z
    .array(z.enum(allowed as [T, ...T[]]))
    .length(allowed.length)
    .refine((items) => new Set(items).size === allowed.length, "Ordre invalide.");

const layoutSchema = z
  .object({
    blockOrder: uniqueOrder(WIDGET_BLOCKS),
    hiddenBlocks: z.array(z.enum(WIDGET_BLOCKS)).max(WIDGET_BLOCKS.length),
    fieldOrder: uniqueOrder(WIDGET_FIELDS),
    hiddenFields: z.array(z.enum(WIDGET_FIELDS)).max(WIDGET_FIELDS.length),
    columns: z.union([z.literal(1), z.literal(2)]),
    alignment: z.enum(["left", "center", "right"]),
    template: z.enum(["classic", "compact", "showcase"]),
  })
  .strict()
  .refine((layout) => !layout.hiddenFields.includes("contact") && !layout.hiddenFields.includes("consent"), {
    message: "Les coordonnées et le consentement sont obligatoires.",
    path: ["hiddenFields"],
  })
  .refine((layout) => !layout.hiddenBlocks.includes("content") && !layout.hiddenBlocks.includes("actions"), {
    message: "Le contenu et les actions sont obligatoires.",
    path: ["hiddenBlocks"],
  });

const iconChoiceSchema = z
  .object({
    mode: z.enum(["none", "library", "custom"]),
    libraryIcon: cleanText(40).optional(),
    assetUrl: z.union([z.literal(""), z.string().url().max(1000)]).optional(),
    size: z.number().int().min(12).max(64),
    alt: cleanText(100).optional(),
  })
  .strict()
  .refine((value) => value.mode !== "library" || Boolean(value.libraryIcon), "Choisissez une icône.")
  .refine((value) => value.mode !== "custom" || Boolean(value.assetUrl), "Choisissez une image.");

const iconsSchema = z
  .object({
    phone: iconChoiceSchema,
    tablet: iconChoiceSchema,
    computer: iconChoiceSchema,
    console: iconChoiceSchema,
    battery: iconChoiceSchema,
    screen: iconChoiceSchema,
    charging: iconChoiceSchema,
    appointment: iconChoiceSchema,
    confirmation: iconChoiceSchema,
    poweredBy: z.boolean(),
  })
  .strict();

export const editableWidgetConfigSchema = z
  .object({
    internalName: cleanText(160).min(1),
    active: z.boolean(),
    displayMode: z.enum(["inline", "modal", "floating"]),
    general: generalSchema,
    visual: visualSchema,
    texts: textsSchema,
    features: featuresSchema,
    layout: layoutSchema,
    icons: iconsSchema,
  })
  .strict();

export type EditableWidgetConfig = z.infer<typeof editableWidgetConfigSchema>;

const noIcon = () => ({ mode: "none" as const, libraryIcon: "", assetUrl: "", size: 24, alt: "" });

export const DEFAULT_WIDGET_CMS_CONFIG: EditableWidgetConfig = {
  internalName: "Widget client principal",
  active: true,
  displayMode: "inline",
  general: {
    commercialName: "Mon atelier",
    phone: "",
    address: "",
    locale: "fr-FR",
    currency: "EUR",
    privacyUrl: "",
  },
  visual: {
    primaryColor: "#2A9D8F",
    buttonColor: "#2A9D8F",
    buttonTextColor: "#FFFFFF",
    textColor: "#1A1916",
    backgroundColor: "#FFFFFF",
    radius: 14,
    logoUrl: "",
    backgroundStyle: "plain",
    buttonStyle: "solid",
    headingSize: "medium",
    textSize: "medium",
    contentWidth: "standard",
  },
  texts: {
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
  },
  features: {
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
  },
  layout: {
    blockOrder: [...WIDGET_BLOCKS],
    hiddenBlocks: [],
    fieldOrder: [...WIDGET_FIELDS],
    hiddenFields: [],
    columns: 1,
    alignment: "left",
    template: "classic",
  },
  icons: {
    phone: noIcon(),
    tablet: noIcon(),
    computer: noIcon(),
    console: noIcon(),
    battery: noIcon(),
    screen: noIcon(),
    charging: noIcon(),
    appointment: noIcon(),
    confirmation: noIcon(),
    poweredBy: false,
  },
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function normalizeEditableWidgetConfig(
  value: unknown,
  defaults: Partial<EditableWidgetConfig> = {},
): EditableWidgetConfig {
  const raw = object(value);
  const general = object(raw.general);
  const visual = object(raw.visual);
  const texts = object(raw.texts);
  const features = object(raw.features);
  const layout = object(raw.layout);
  const icons = object(raw.icons);
  const merged = {
    ...DEFAULT_WIDGET_CMS_CONFIG,
    ...defaults,
    ...raw,
    general: { ...DEFAULT_WIDGET_CMS_CONFIG.general, ...defaults.general, ...general },
    visual: { ...DEFAULT_WIDGET_CMS_CONFIG.visual, ...defaults.visual, ...visual },
    texts: { ...DEFAULT_WIDGET_CMS_CONFIG.texts, ...defaults.texts, ...texts },
    features: { ...DEFAULT_WIDGET_CMS_CONFIG.features, ...defaults.features, ...features },
    layout: { ...DEFAULT_WIDGET_CMS_CONFIG.layout, ...defaults.layout, ...layout },
    icons: {
      ...DEFAULT_WIDGET_CMS_CONFIG.icons,
      ...defaults.icons,
      ...Object.fromEntries(
        WIDGET_ICON_TARGETS.map((target) => [
          target,
          {
            ...DEFAULT_WIDGET_CMS_CONFIG.icons[target],
            ...defaults.icons?.[target],
            ...object(icons[target]),
          },
        ]),
      ),
      poweredBy: typeof icons.poweredBy === "boolean" ? icons.poweredBy : (defaults.icons?.poweredBy ?? false),
    },
  };
  if (typeof merged.visual.radius !== "number" || merged.visual.radius < 0 || merged.visual.radius > 28) {
    merged.visual.radius = DEFAULT_WIDGET_CMS_CONFIG.visual.radius;
  }
  const parsed = editableWidgetConfigSchema.safeParse(merged);
  return parsed.success ? parsed.data : ({ ...DEFAULT_WIDGET_CMS_CONFIG, ...defaults } as EditableWidgetConfig);
}

export function mergeEditableWidgetConfig(
  source: Record<string, unknown> | null | undefined,
  config: EditableWidgetConfig,
): Record<string, unknown> &
  Pick<EditableWidgetConfig, "general" | "visual" | "texts" | "features" | "layout" | "icons"> {
  return {
    ...(source ?? {}),
    general: config.general,
    visual: config.visual,
    texts: config.texts,
    features: config.features,
    layout: config.layout,
    icons: config.icons,
  };
}

export const WIDGET_TEXT_LABELS: Record<WidgetTextKey, string> = {
  title: "Titre principal",
  introduction: "Sous-titre",
  deviceTitle: "Titre appareil",
  issueTitle: "Titre problème",
  resultTitle: "Titre estimation",
  contactTitle: "Titre coordonnées",
  bookingTitle: "Titre réservation",
  firstNameLabel: "Label prénom",
  lastNameLabel: "Label nom",
  phoneLabel: "Label téléphone",
  emailLabel: "Label e-mail",
  contactPreferenceLabel: "Label préférence de contact",
  commentLabel: "Label commentaire",
  requestTypeLabel: "Label type de demande",
  photoLabel: "Label photos",
  consentLabel: "Texte de consentement",
  submitLabel: "Bouton d’envoi",
  callbackLabel: "Bouton rappel",
  quoteLabel: "Bouton devis",
  bookingLabel: "Bouton rendez-vous",
};

export const WIDGET_FEATURE_LABELS: Record<WidgetFeatureKey, string> = {
  deviceSearch: "Recherche d’appareil",
  priceEstimate: "Prix public",
  stockAvailability: "Disponibilité",
  duration: "Durée estimée",
  quoteRequest: "Demande de devis",
  callbackRequest: "Demande de rappel",
  booking: "Prise de rendez-vous",
  shopChoice: "Choix de la boutique",
  qualityChoice: "Choix de qualité",
  multiIssue: "Plusieurs pannes",
  comment: "Champ commentaire",
  photos: "Ajout de photos",
  warranty: "Garantie",
  payments: "Paiement",
};

export const WIDGET_ICON_LABELS: Record<WidgetIconTarget, string> = {
  phone: "Téléphone",
  tablet: "Tablette",
  computer: "Ordinateur",
  console: "Console",
  battery: "Batterie",
  screen: "Écran",
  charging: "Charge",
  appointment: "Rendez-vous",
  confirmation: "Confirmation",
};
