// Types publics du widget, sûrs pour le navigateur.
//
// Ils reflètent exactement les DTO renvoyés par l'API publique
// (`src/lib/server/widget-public-api.ts`) sans importer le moindre code serveur
// (`node:crypto`, service role, etc.). L'application iframe ne consomme jamais
// autre chose que ces formes en lecture blanche.

export type PriceMode = "exact" | "from" | "range" | "request" | "hidden";

export type PublicPrice = {
  mode: PriceMode;
  amount?: number;
  min?: number;
  max?: number;
  currency?: string;
};

export type StockMode = "hidden" | "simple" | "delay" | "quantity";

export type PublicStock = {
  mode: StockMode;
  status?: string;
  label?: string;
  quantity?: number;
};

export type PublicService = {
  publicId: string;
  category: string;
  brand: string;
  model: string;
  issue: string;
  service: string;
  quality?: string;
  price?: PublicPrice;
  stock?: PublicStock;
  durationMinutes?: number;
  warranty?: string;
  shops?: string[];
};

export type PublicShop = {
  id: string;
  name: string;
  address: { address: string; postalCode: string; city: string; country: string };
  timezone: string;
};

export type WidgetGeneral = {
  commercialName?: string;
  phone?: string;
  address?: string;
  locale?: string;
  currency?: string;
  privacyUrl?: string;
};

export type WidgetVisual = {
  primaryColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  textColor?: string;
  backgroundColor?: string;
  radius?: number;
  logoUrl?: string;
  position?: string;
  backgroundStyle?: "plain" | "tinted" | "gradient";
  buttonStyle?: "solid" | "soft" | "outline";
  headingSize?: "small" | "medium" | "large";
  textSize?: "small" | "medium" | "large";
  contentWidth?: "compact" | "standard" | "wide";
};

export type WidgetLayout = {
  blockOrder?: Array<"header" | "progress" | "content" | "actions">;
  hiddenBlocks?: Array<"header" | "progress" | "content" | "actions">;
  fieldOrder?: Array<"identity" | "contact" | "preference" | "comment" | "photos" | "request" | "booking" | "consent">;
  hiddenFields?: Array<
    "identity" | "contact" | "preference" | "comment" | "photos" | "request" | "booking" | "consent"
  >;
  columns?: 1 | 2;
  alignment?: "left" | "center" | "right";
  template?: "classic" | "compact" | "showcase";
};

export type WidgetIconTarget =
  | "phone"
  | "tablet"
  | "computer"
  | "console"
  | "battery"
  | "screen"
  | "charging"
  | "appointment"
  | "confirmation";

export type WidgetIconChoice = {
  mode: "none" | "library" | "custom";
  libraryIcon?: string;
  assetUrl?: string;
  size: number;
  alt?: string;
};

export type WidgetIcons = Record<WidgetIconTarget, WidgetIconChoice> & { poweredBy: boolean };

export type WidgetTextKey =
  | "title"
  | "introduction"
  | "deviceTitle"
  | "issueTitle"
  | "resultTitle"
  | "contactTitle"
  | "bookingTitle"
  | "firstNameLabel"
  | "lastNameLabel"
  | "phoneLabel"
  | "emailLabel"
  | "contactPreferenceLabel"
  | "commentLabel"
  | "requestTypeLabel"
  | "photoLabel"
  | "consentLabel"
  | "submitLabel"
  | "callbackLabel"
  | "quoteLabel"
  | "bookingLabel";

export type WidgetTexts = Partial<Record<WidgetTextKey, string>>;

export type WidgetFeatureKey =
  | "deviceSearch"
  | "priceEstimate"
  | "stockAvailability"
  | "duration"
  | "quoteRequest"
  | "callbackRequest"
  | "booking"
  | "shopChoice"
  | "qualityChoice"
  | "multiIssue"
  | "comment"
  | "photos"
  | "warranty"
  | "payments";

export type WidgetFeatures = Partial<Record<WidgetFeatureKey, boolean>>;

export type WidgetBooking = {
  timezone?: string;
  days?: number[];
  start?: string;
  end?: string;
  intervalMinutes?: number;
  durationMinutes?: number;
  capacity?: number;
  minimumNoticeMinutes?: number;
};

export type WidgetConfig = {
  id: string;
  active: boolean;
  displayMode: "inline" | "modal" | "floating";
  general: WidgetGeneral;
  visual: WidgetVisual;
  texts: WidgetTexts;
  features: WidgetFeatures;
  layout: WidgetLayout;
  icons: WidgetIcons;
  booking: WidgetBooking;
  publishedAt: string | null;
  shops: PublicShop[];
  sessionToken: string;
};

export type QuoteResult = {
  service: { publicId: string; label: string; quality?: string };
  price?: PublicPrice;
  stock?: PublicStock;
  durationMinutes?: number;
  warranty?: string;
  shop: PublicShop;
};

export type Slot = { date: string; time: string; durationMinutes?: number };

export type LeadType = "callback" | "quote" | "price_request" | "request";

export type ContactPreference = "phone" | "sms" | "email" | "whatsapp";

// Réponse neutre commune aux mutations lead / rendez-vous.
export type SubmissionResult = {
  accepted: boolean;
  duplicate: boolean;
  status: string;
  date?: string;
  time?: string;
};
