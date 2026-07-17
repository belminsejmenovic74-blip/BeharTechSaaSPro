import "server-only";

import { createHash } from "node:crypto";

import { ExternalPaymentProviderError, providerJson } from "./http";
import type {
  CreateExternalRequestInput,
  CreatedExternalRequest,
  ExternalPaymentRequestProvider,
  OAuthCallbackResult,
} from "./types";

export const REVOLUT_DEFAULT_API_VERSION = "2026-04-20";

type RevolutLocation = { id?: string; name?: string; type?: string };
type RevolutLocationResponse = RevolutLocation[] | { locations?: RevolutLocation[] };
type RevolutTerminal = { id?: string; name?: string };
type RevolutTerminalResponse = { terminals?: RevolutTerminal[] };
type RevolutOrderResponse = { id?: string; checkout_url?: string };

export function revolutEnvironment() {
  const value = process.env.REVOLUT_ENVIRONMENT || "production";
  if (value !== "sandbox" && value !== "production") throw new Error("REVOLUT_ENVIRONMENT invalide.");
  return value;
}

export function revolutApiVersion() {
  const value = process.env.REVOLUT_API_VERSION || REVOLUT_DEFAULT_API_VERSION;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("REVOLUT_API_VERSION invalide.");
  return value;
}

export function revolutApiBase() {
  return revolutEnvironment() === "sandbox" ? "https://sandbox-merchant.revolut.com" : "https://merchant.revolut.com";
}

function revolutHeaders(apiKey: string, idempotencyKey?: string) {
  return {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
    "revolut-api-version": revolutApiVersion(),
    ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
  };
}

export function revolutMerchantFingerprint(apiKey: string) {
  return `merchant_api:${createHash("sha256").update(apiKey).digest("hex").slice(0, 24)}`;
}

export async function listRevolutLocations(apiKey: string) {
  const response = await fetch(`${revolutApiBase()}/api/locations?type=physical`, {
    headers: revolutHeaders(apiKey),
    cache: "no-store",
  });
  const result = await providerJson<RevolutLocationResponse>(response, "Connexion Merchant API Revolut invalide.");
  const locations = Array.isArray(result) ? result : result.locations || [];
  return locations
    .filter((location) => location.id && location.type === "physical")
    .map((location) => ({ id: location.id as string, name: location.name || "Location Revolut" }));
}

export async function listRevolutTerminals(apiKey: string, locationId: string) {
  const url = new URL(`${revolutApiBase()}/api/terminals`);
  url.searchParams.set("operation_mode", "pos");
  url.searchParams.set("location_id", locationId);
  const response = await fetch(url, { headers: revolutHeaders(apiKey), cache: "no-store" });
  const result = await providerJson<RevolutTerminalResponse>(response, "Chargement des terminaux Revolut impossible.");
  return (result.terminals || [])
    .filter((terminal) => terminal.id)
    .map((terminal) => ({ id: terminal.id as string, name: terminal.name || "Revolut Terminal" }));
}

export async function testRevolutConnection(apiKey: string) {
  await listRevolutLocations(apiKey);
}

export class RevolutBusinessProvider implements ExternalPaymentRequestProvider {
  getAuthorizationUrl(): URL {
    throw new Error("Revolut Business ne propose pas d’OAuth partenaire public pour cette intégration.");
  }

  async handleOAuthCallback(): Promise<OAuthCallbackResult> {
    throw new Error("Revolut Business utilise la clé Merchant API du réparateur, pas OAuth.");
  }

  async createExternalRequest(input: CreateExternalRequestInput): Promise<CreatedExternalRequest> {
    if (!input.accessToken) throw new Error("Clé Merchant API Revolut indisponible.");
    if (input.readerId) return this.dispatchToTerminal(input);

    const response = await fetch(`${revolutApiBase()}/api/orders`, {
      method: "POST",
      headers: revolutHeaders(input.accessToken, input.requestId),
      body: JSON.stringify({
        amount: Math.round(input.amount * 100),
        currency: input.currency,
        description: `Facture ${input.invoiceNumber}`,
        capture_mode: "automatic",
        merchant_order_data: { reference: input.invoiceNumber },
      }),
      cache: "no-store",
    });
    const order = await providerJson<RevolutOrderResponse>(response, "Création du lien Revolut impossible.");
    if (!order.id || !order.checkout_url) throw new Error("Hosted Checkout Page Revolut absente.");
    return { providerRequestId: order.id, hostedUrl: order.checkout_url, technicalState: "created" };
  }

  private async dispatchToTerminal(input: CreateExternalRequestInput): Promise<CreatedExternalRequest> {
    if (!input.accessToken || !input.externalLocationId || !input.readerId) {
      throw new Error("Revolut Terminal ou location indisponible.");
    }
    const amount = Math.round(input.amount * 100);
    const orderResponse = await fetch(`${revolutApiBase()}/api/orders`, {
      method: "POST",
      headers: revolutHeaders(input.accessToken, `${input.requestId}:order`),
      body: JSON.stringify({
        amount,
        currency: input.currency,
        description: `Facture ${input.invoiceNumber}`,
        channel: "pos",
        location_id: input.externalLocationId,
        fulfilment_type: "take_away",
        capture_mode: "manual",
        merchant_order_data: { reference: input.invoiceNumber },
        metadata: { pos_partner_name: "Behar Tech Pro" },
      }),
      cache: "no-store",
    });
    const order = await providerJson<RevolutOrderResponse>(
      orderResponse,
      "La demande n’a pas pu être transmise au terminal Revolut.",
    );
    if (!order.id) throw new Error("Identifiant technique de l’order Revolut absent.");

    const intentResponse = await fetch(
      `${revolutApiBase()}/api/orders/${encodeURIComponent(order.id)}/payment-intents`,
      {
        method: "POST",
        headers: revolutHeaders(input.accessToken, `${input.requestId}:terminal`),
        body: JSON.stringify({ amount, terminal_id: input.readerId }),
        cache: "no-store",
      },
    );
    if (!intentResponse.ok) {
      throw new ExternalPaymentProviderError(
        "La demande n’a pas pu être transmise au terminal Revolut.",
        intentResponse.status || 502,
      );
    }
    // Le corps contient potentiellement un résultat financier : il n'est jamais lu.
    return { providerRequestId: order.id, technicalState: "sent" };
  }

  disconnect(): Promise<void> {
    // La suppression locale du secret suffit : Revolut ne fournit pas de jeton OAuth à révoquer.
    return Promise.resolve();
  }

  getExternalDashboardUrl(): string {
    return revolutEnvironment() === "sandbox"
      ? "https://sandbox-business.revolut.com"
      : "https://business.revolut.com/merchant";
  }
}
