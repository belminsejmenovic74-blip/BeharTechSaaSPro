// État partagé du parcours en cinq étapes et contexte injecté à chaque étape.

import type {
  ContactPreference,
  PublicService,
  WidgetConfig,
  WidgetFeatures,
  WidgetTexts,
} from "@/lib/widget/public-types";
import type { WidgetEventData, WidgetEventName, WidgetPublicClient } from "@/lib/widget/public-client";
import type { WidgetTheme } from "@/components/widget/widget-theme";

export type RequestType = "callback" | "quote" | "price_request" | "request" | "appointment";

// Cinq étapes : Appareil, Problème, Résultat, Informations & rendez-vous, Confirmation.
export const STEP_LABELS = ["Appareil", "Problème", "Résultat", "Contact", "Confirmation"] as const;

export type WidgetDraft = {
  shopId: string; // public_shop_id ("" tant qu'aucune boutique n'est choisie)
  category: string;
  brand: string;
  model: string;
  issues: string[]; // libellés des problèmes retenus
  issueDescription: string;
  services: Record<string, PublicService | null>; // problème -> prestation publiée résolue
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  comment: string;
  contactPreference: ContactPreference | "";
  photos: string[]; // chemins de stockage renvoyés par /uploads
  requestType: RequestType;
  appointmentDate: string;
  appointmentTime: string;
  consent: boolean;
};

export const EMPTY_DRAFT: WidgetDraft = {
  shopId: "",
  category: "",
  brand: "",
  model: "",
  issues: [],
  issueDescription: "",
  services: {},
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  comment: "",
  contactPreference: "",
  photos: [],
  requestType: "appointment",
  appointmentDate: "",
  appointmentTime: "",
  consent: false,
};

// Prestation principale : celle du premier problème retenu, base des snapshots.
export function primaryService(draft: WidgetDraft): PublicService | undefined {
  for (const issue of draft.issues) {
    const service = draft.services[issue];
    if (service) return service;
  }
  return undefined;
}

export function deviceLabel(draft: WidgetDraft): string {
  return [draft.brand, draft.model].filter(Boolean).join(" ").trim() || draft.model || "—";
}

export function issuesLabel(draft: WidgetDraft): string {
  return draft.issues.length ? draft.issues.join(", ") : "—";
}

export type StepContext = {
  client: WidgetPublicClient;
  token: string;
  config: WidgetConfig;
  features: Required<WidgetFeatures>;
  texts: Required<WidgetTexts>;
  theme: WidgetTheme;
  currency: string;
  locale: string;
  sessionId: string;
  draft: WidgetDraft;
  patch: (updates: Partial<WidgetDraft>) => void;
  emit: (name: WidgetEventName, data?: WidgetEventData) => void;
};
