import "server-only";

import { providerJson, requireServerEnv } from "./http";
import type {
  CreateExternalRequestInput,
  CreatedExternalRequest,
  ExternalPaymentRequestProvider,
  OAuthCallbackResult,
} from "./types";

export const SQUARE_API_VERSION = "2026-05-20";
export const SQUARE_OAUTH_SCOPES = ["MERCHANT_PROFILE_READ", "ORDERS_READ", "ORDERS_WRITE", "PAYMENTS_WRITE"] as const;

type SquareTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  merchant_id?: string;
};
type SquareLocation = {
  id?: string;
  name?: string;
  business_name?: string;
  status?: string;
  currency?: string;
};
type SquareLocationsResponse = { locations?: SquareLocation[] };
type SquarePaymentLinkResponse = { payment_link?: { id?: string; url?: string } };
type SquareTerminalResponse = { checkout?: { id?: string } };

export function squareEnvironment() {
  const value = process.env.SQUARE_ENVIRONMENT || "production";
  if (value !== "sandbox" && value !== "production") throw new Error("SQUARE_ENVIRONMENT invalide.");
  return value;
}

export function squareApiBase() {
  return squareEnvironment() === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";
}

function squareHeaders(accessToken: string) {
  return {
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json",
    "square-version": SQUARE_API_VERSION,
  };
}

export async function listSquareLocations(accessToken: string) {
  const response = await fetch(`${squareApiBase()}/v2/locations`, {
    headers: squareHeaders(accessToken),
    cache: "no-store",
  });
  const result = await providerJson<SquareLocationsResponse>(
    response,
    "Chargement des établissements Square impossible.",
  );
  return (result.locations || [])
    .filter((location) => location.id && location.status === "ACTIVE")
    .map((location) => ({
      id: location.id as string,
      name: location.name || location.business_name || "Établissement Square",
      currency: location.currency || null,
    }));
}

export class SquareProvider implements ExternalPaymentRequestProvider {
  getAuthorizationUrl(state: string): URL {
    const url = new URL(`${squareApiBase()}/oauth2/authorize`);
    url.searchParams.set("client_id", requireServerEnv("SQUARE_APPLICATION_ID"));
    url.searchParams.set("scope", SQUARE_OAUTH_SCOPES.join(" "));
    url.searchParams.set("session", "false");
    url.searchParams.set("state", state);
    url.searchParams.set("redirect_uri", requireServerEnv("SQUARE_REDIRECT_URI"));
    return url;
  }

  async handleOAuthCallback(code: string): Promise<OAuthCallbackResult> {
    const response = await fetch(`${squareApiBase()}/oauth2/token`, {
      method: "POST",
      headers: { "content-type": "application/json", "square-version": SQUARE_API_VERSION },
      body: JSON.stringify({
        client_id: requireServerEnv("SQUARE_APPLICATION_ID"),
        client_secret: requireServerEnv("SQUARE_APPLICATION_SECRET"),
        code,
        grant_type: "authorization_code",
        redirect_uri: requireServerEnv("SQUARE_REDIRECT_URI"),
      }),
      cache: "no-store",
    });
    const token = await providerJson<SquareTokenResponse>(response, "Connexion Square impossible.");
    if (!token.access_token || !token.refresh_token || !token.merchant_id || !token.expires_at) {
      throw new Error("Jetons ou seller account ID Square absents.");
    }
    const locations = await listSquareLocations(token.access_token);
    const location = locations[0];
    if (!location) throw new Error("Aucun établissement Square actif n’est disponible.");
    return {
      externalAccountId: token.merchant_id,
      externalLocationId: location.id,
      merchantDisplayName: location.name,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: token.expires_at,
      grantedScopes: [...SQUARE_OAUTH_SCOPES],
    };
  }

  async createExternalRequest(input: CreateExternalRequestInput): Promise<CreatedExternalRequest> {
    if (!input.accessToken) throw new Error("Jeton Square indisponible.");
    if (!input.externalLocationId) throw new Error("Établissement Square indisponible.");
    if (input.readerId) return this.dispatchToTerminal(input);

    const response = await fetch(`${squareApiBase()}/v2/online-checkout/payment-links`, {
      method: "POST",
      headers: squareHeaders(input.accessToken),
      body: JSON.stringify({
        idempotency_key: input.requestId,
        description: `Facture ${input.invoiceNumber}`,
        payment_note: input.invoiceNumber,
        quick_pay: {
          name: `Facture ${input.invoiceNumber}`,
          price_money: { amount: Math.round(input.amount * 100), currency: input.currency },
          location_id: input.externalLocationId,
        },
        checkout_options: {
          allow_tipping: false,
          ask_for_shipping_address: false,
          accepted_payment_methods: {
            apple_pay: true,
            google_pay: true,
            cash_app_pay: false,
            afterpay_clearpay: false,
          },
        },
      }),
      cache: "no-store",
    });
    const result = await providerJson<SquarePaymentLinkResponse>(response, "Création du lien Square impossible.");
    if (!result.payment_link?.id || !result.payment_link.url) throw new Error("Lien hébergé Square absent.");
    return {
      providerRequestId: result.payment_link.id,
      hostedUrl: result.payment_link.url,
      technicalState: "created",
    };
  }

  private async dispatchToTerminal(input: CreateExternalRequestInput): Promise<CreatedExternalRequest> {
    const response = await fetch(`${squareApiBase()}/v2/terminals/checkouts`, {
      method: "POST",
      headers: squareHeaders(input.accessToken as string),
      body: JSON.stringify({
        idempotency_key: input.requestId,
        checkout: {
          amount_money: { amount: Math.round(input.amount * 100), currency: input.currency },
          reference_id: input.invoiceNumber,
          note: `Facture ${input.invoiceNumber}`,
          device_options: {
            device_id: input.readerId,
            tip_settings: { allow_tipping: false },
          },
        },
      }),
      cache: "no-store",
    });
    const result = await providerJson<SquareTerminalResponse>(
      response,
      "La demande n’a pas pu être transmise au Square Terminal.",
    );
    if (!result.checkout?.id) throw new Error("Identifiant technique Square Terminal absent.");
    // Les statuts et payment_ids potentiellement retournés sont ignorés.
    return { providerRequestId: result.checkout.id, technicalState: "sent" };
  }

  async disconnect(externalAccountId: string): Promise<void> {
    const response = await fetch(`${squareApiBase()}/oauth2/revoke`, {
      method: "POST",
      headers: {
        authorization: `Client ${requireServerEnv("SQUARE_APPLICATION_SECRET")}`,
        "content-type": "application/json",
        "square-version": SQUARE_API_VERSION,
      },
      body: JSON.stringify({
        client_id: requireServerEnv("SQUARE_APPLICATION_ID"),
        merchant_id: externalAccountId,
      }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Déconnexion Square impossible.");
  }

  getExternalDashboardUrl(): string {
    return squareEnvironment() === "sandbox"
      ? "https://squareupsandbox.com/dashboard"
      : "https://app.squareup.com/dashboard";
  }
}
