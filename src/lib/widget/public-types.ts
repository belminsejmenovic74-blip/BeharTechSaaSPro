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
  textColor?: string;
  backgroundColor?: string;
  radius?: number;
  logoUrl?: string;
  position?: string;
};

export type WidgetTextKey =
  | "title"
  | "introduction"
  | "deviceTitle"
  | "issueTitle"
  | "resultTitle"
  | "contactTitle"
  | "bookingTitle"
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
