// Client HTTP de l'application iframe.
//
// Toutes les requêtes ciblent l'API publique de même origine
// (`/api/public/widgets/{publicId}`). Le client :
//   * déclare l'origine du site hôte via `x-behar-host-origin`
//     (résolue depuis le référent parent ou un override `?host=`) ;
//   * rejoue le jeton de session (`x-widget-token`) une fois la config chargée ;
//   * ajoute une clé d'idempotence sur les mutations lead/rendez-vous ;
//   * normalise l'enveloppe `{ data }` / `{ error }` en valeur ou exception typée.

import type {
  ContactPreference,
  LeadType,
  PublicService,
  PublicShop,
  QuoteResult,
  Slot,
  SubmissionResult,
  WidgetConfig,
} from "@/lib/widget/public-types";

export class WidgetApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "WidgetApiError";
  }
}

export type ConsentPayload = {
  service: true;
  marketing: boolean;
  text: string;
  privacyVersion: string;
  acceptedAt: string;
};

export type LeadPayload = {
  type: LeadType;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  deviceCategory: string;
  brand: string;
  model: string;
  issue: string;
  issueDescription: string;
  servicePublicId?: string;
  quality: string;
  comment: string;
  contactPreference?: ContactPreference;
  requestedCallbackAt?: string;
  shopPublicId?: string;
  photos: string[];
  sourceUrl?: string;
  consent: ConsentPayload;
  startedAt: string;
  website: "";
};

export type AppointmentPayload = Omit<LeadPayload, "type"> & { type: "appointment"; date: string; time: string };

export type SignedUpload = { path: string; token: string; signedUrl: string };

// Résout l'origine du site qui héberge le widget. En intégration réelle, le
// document iframe est chargé par le site du réparateur : son référent porte
// l'origine parente. En consultation directe (aperçu), on retombe sur l'origine
// courante. Un paramètre `?host=` explicite prime pour les tests autorisés.
export function detectHostOrigin(): string {
  if (typeof window === "undefined") return "";
  try {
    const override = new URLSearchParams(window.location.search).get("host");
    if (override) return new URL(override).origin;
  } catch {
    // override invalide : on ignore.
  }
  const embedded = window.parent && window.parent !== window;
  if (embedded && document.referrer) {
    try {
      return new URL(document.referrer).origin;
    } catch {
      // référent illisible : on retombe sur l'origine courante.
    }
  }
  return window.location.origin;
}

type RequestOptions = {
  method?: "GET" | "POST";
  query?: Record<string, string | undefined>;
  body?: unknown;
  token?: string;
  idempotencyKey?: string;
  signal?: AbortSignal;
};

export class WidgetPublicClient {
  private readonly base: string;
  private readonly hostOrigin: string;

  constructor(
    readonly publicId: string,
    hostOrigin: string = detectHostOrigin(),
  ) {
    this.base = `/api/public/widgets/${encodeURIComponent(publicId)}`;
    this.hostOrigin = hostOrigin;
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`, window.location.origin);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined && value !== "") url.searchParams.set(key, value);
    }
    const headers: Record<string, string> = { "x-behar-host-origin": this.hostOrigin };
    if (options.token) headers["x-widget-token"] = options.token;
    if (options.body !== undefined) headers["content-type"] = "application/json";
    if (options.idempotencyKey) headers["idempotency-key"] = options.idempotencyKey;

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: options.signal,
        cache: "no-store",
        credentials: "omit",
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      throw new WidgetApiError("network", "Connexion impossible. Vérifiez votre réseau.", 0);
    }

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok) {
      const error = (payload as { error?: { code?: string; message?: string } } | null)?.error;
      throw new WidgetApiError(
        error?.code ?? "service_unavailable",
        error?.message ?? "Service momentanément indisponible.",
        response.status,
      );
    }
    return (payload as { data: T }).data;
  }

  getConfig(signal?: AbortSignal) {
    return this.request<WidgetConfig>("/config", { signal });
  }

  getCategories(token: string, query: CatalogQuery = {}, signal?: AbortSignal) {
    return this.request<{ categories: string[] }>("/categories", { token, query, signal }).then((r) => r.categories);
  }

  getBrands(token: string, query: CatalogQuery, signal?: AbortSignal) {
    return this.request<{ brands: string[] }>("/brands", { token, query, signal }).then((r) => r.brands);
  }

  getModels(token: string, query: CatalogQuery, signal?: AbortSignal) {
    return this.request<{ models: string[] }>("/models", { token, query, signal }).then((r) => r.models);
  }

  getIssues(token: string, query: CatalogQuery, signal?: AbortSignal) {
    return this.request<{ issues: string[] }>("/issues", { token, query, signal }).then((r) => r.issues);
  }

  getServices(token: string, query: CatalogQuery, signal?: AbortSignal) {
    return this.request<{ services: PublicService[] }>("/services", { token, query, signal }).then((r) => r.services);
  }

  quote(token: string, body: { servicePublicId: string; shopPublicId?: string }) {
    return this.request<QuoteResult>("/quote", { token, body });
  }

  getSlots(
    token: string,
    query: { shop?: string; from?: string; days?: string; servicePublicId?: string },
    signal?: AbortSignal,
  ) {
    return this.request<{ shop: PublicShop; slots: Slot[] }>("/slots", { token, query, signal });
  }

  submitLead(token: string, body: LeadPayload, idempotencyKey: string) {
    return this.request<SubmissionResult>("/leads", { token, body, idempotencyKey });
  }

  submitAppointment(token: string, body: AppointmentPayload, idempotencyKey: string) {
    return this.request<SubmissionResult>("/appointments", { token, body, idempotencyKey });
  }

  signUpload(token: string, body: { fileName: string; contentType: string; size: number; sessionId: string }) {
    return this.request<SignedUpload>("/uploads", { token, body });
  }

  // Analytique best-effort : ne jette jamais, aucune donnée personnelle.
  async sendEvent(token: string, name: WidgetEventName, sessionId: string, data: WidgetEventData = {}) {
    try {
      await this.request("/events", { token, body: { sessionId, name, data } });
    } catch {
      // silencieux : l'analytique ne doit pas dégrader le parcours.
    }
  }
}

export type CatalogQuery = { category?: string; brand?: string; model?: string; issue?: string; shop?: string };

export type WidgetEventName =
  | "widget_loaded"
  | "widget_started"
  | "device_selected"
  | "issue_selected"
  | "price_displayed"
  | "price_unavailable"
  | "stock_displayed"
  | "stock_unavailable"
  | "form_opened"
  | "lead_submitted"
  | "booking_opened"
  | "slot_selected"
  | "appointment_created"
  | "widget_abandoned";

export type WidgetEventData = {
  category?: string;
  brand?: string;
  model?: string;
  issue?: string;
  servicePublicId?: string;
  reason?: string;
};
