import "server-only";

import { signExternalReturnState } from "./crypto";
import { providerJson, requireServerEnv } from "./http";
import type {
  CreateExternalRequestInput,
  CreatedExternalRequest,
  ExternalPaymentRequestProvider,
  OAuthCallbackResult,
} from "./types";

type PayPalAccessToken = { access_token?: string };
type PayPalLink = { href?: string; rel?: string };
type PartnerReferralResponse = { links?: PayPalLink[] };
type PayPalOrderResponse = { id?: string; links?: PayPalLink[] };

function environment() {
  const value = process.env.PAYPAL_ENVIRONMENT || "production";
  if (value !== "sandbox" && value !== "production") throw new Error("PAYPAL_ENVIRONMENT invalide.");
  return value;
}

function apiBase() {
  return environment() === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
}

function paypalDashboardUrl() {
  return environment() === "sandbox"
    ? "https://www.sandbox.paypal.com/businessmanage/account/aboutBusiness"
    : "https://www.paypal.com/businessmanage/account/aboutBusiness";
}

function partnerConfiguration() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  const partnerId = process.env.PAYPAL_PARTNER_ID?.trim();
  const bnCode = process.env.PAYPAL_BN_CODE?.trim();
  const returnUrl = process.env.PAYPAL_RETURN_URL?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return { clientId, clientSecret, partnerId, bnCode, returnUrl, appUrl };
}

export function isPayPalPartnerEnabled() {
  const config = partnerConfiguration();
  if (!["sandbox", "production"].includes(process.env.PAYPAL_ENVIRONMENT || "production")) return false;
  return Boolean(
    config.clientId && config.clientSecret && config.partnerId && config.bnCode && config.returnUrl && config.appUrl,
  );
}

function requirePartnerConfiguration() {
  if (!isPayPalPartnerEnabled()) {
    throw new Error(
      "La connexion automatique PayPal nécessite l’activation partenaire. Utilisez le lien PayPal manuel.",
    );
  }
  return {
    clientId: requireServerEnv("PAYPAL_CLIENT_ID"),
    clientSecret: requireServerEnv("PAYPAL_CLIENT_SECRET"),
    partnerId: requireServerEnv("PAYPAL_PARTNER_ID"),
    bnCode: requireServerEnv("PAYPAL_BN_CODE"),
    returnUrl: requireServerEnv("PAYPAL_RETURN_URL"),
    appUrl: requireServerEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, ""),
  };
}

async function getPartnerAccessToken() {
  const { clientId, clientSecret } = requirePartnerConfiguration();
  const response = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    cache: "no-store",
  });
  const token = await providerJson<PayPalAccessToken>(response, "Authentification partenaire PayPal impossible.");
  if (!token.access_token) throw new Error("Jeton partenaire PayPal absent.");
  return token.access_token;
}

function authAssertion(clientId: string, merchantId: string) {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ iss: clientId, payer_id: merchantId })).toString("base64url");
  return `${header}.${payload}.`;
}

function paypalHeaders(accessToken: string, merchantId?: string, requestId?: string) {
  const { clientId, bnCode } = requirePartnerConfiguration();
  return {
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json",
    "paypal-partner-attribution-id": bnCode,
    ...(merchantId ? { "paypal-auth-assertion": authAssertion(clientId, merchantId) } : {}),
    ...(requestId ? { "paypal-request-id": requestId } : {}),
  };
}

export function normalizePayPalManualUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("Lien PayPal invalide.");
  }
  const host = url.hostname.toLowerCase();
  const path = url.pathname.replace(/\/+$/, "");
  const paypalMe = ["paypal.me", "www.paypal.me"].includes(host) && /^\/[A-Za-z0-9._-]{2,80}$/.test(path);
  const paypalBusiness =
    ["paypal.com", "www.paypal.com"].includes(host) &&
    (/^\/paypalme\/[A-Za-z0-9._-]{2,80}$/i.test(path) || /^\/ncp\/payment\/[A-Za-z0-9_-]{6,120}$/i.test(path));
  if (url.protocol !== "https:" || url.username || url.password || (!paypalMe && !paypalBusiness)) {
    throw new Error("Utilisez un lien PayPal.Me ou PayPal Business officiel en HTTPS.");
  }
  url.hash = "";
  return url.toString();
}

export function buildPayPalManualRequestUrl(raw: string, amount: number, currency: "EUR" | "CHF") {
  const url = new URL(normalizePayPalManualUrl(raw));
  const isPayPalMe =
    ["paypal.me", "www.paypal.me"].includes(url.hostname.toLowerCase()) || /^\/paypalme\//i.test(url.pathname);
  if (isPayPalMe) url.pathname = `${url.pathname.replace(/\/+$/, "")}/${amount.toFixed(2)}${currency}`;
  return url.toString();
}

function checkoutReturnUrl(requestId: string, cancelled: boolean) {
  const { returnUrl } = requirePartnerConfiguration();
  const url = new URL(returnUrl);
  url.searchParams.set("state", signExternalReturnState(requestId));
  if (cancelled) url.searchParams.set("cancel", "1");
  else url.searchParams.delete("cancel");
  return url.toString();
}

export class PayPalProvider implements ExternalPaymentRequestProvider {
  async getAuthorizationUrl(state: string): Promise<URL> {
    const { appUrl } = requirePartnerConfiguration();
    const accessToken = await getPartnerAccessToken();
    const response = await fetch(`${apiBase()}/v2/customer/partner-referrals`, {
      method: "POST",
      headers: paypalHeaders(accessToken),
      body: JSON.stringify({
        tracking_id: state,
        operations: [
          {
            operation: "API_INTEGRATION",
            api_integration_preference: {
              rest_api_integration: {
                integration_method: "PAYPAL",
                integration_type: "THIRD_PARTY",
                third_party_details: { features: ["PAYMENT"] },
              },
            },
          },
        ],
        products: ["EXPRESS_CHECKOUT"],
        partner_config_override: { return_url: `${appUrl}/api/external-payments/oauth/callback/paypal` },
        legal_consents: [{ type: "SHARE_DATA_CONSENT", granted: true }],
      }),
      cache: "no-store",
    });
    const referral = await providerJson<PartnerReferralResponse>(
      response,
      "Création du parcours partenaire PayPal impossible.",
    );
    const actionUrl = referral.links?.find((link) => link.rel === "action_url")?.href;
    if (!actionUrl) throw new Error("Lien d’activation PayPal absent.");
    return new URL(actionUrl);
  }

  async handleOAuthCallback(merchantId: string): Promise<OAuthCallbackResult> {
    if (!/^[A-Za-z0-9]{6,64}$/.test(merchantId)) throw new Error("Merchant ID PayPal invalide.");
    return {
      externalAccountId: merchantId,
      merchantDisplayName: "PayPal Business",
      grantedScopes: ["PAYMENT"],
    };
  }

  async createExternalRequest(input: CreateExternalRequestInput): Promise<CreatedExternalRequest> {
    if (input.connectionMode === "manual") {
      if (!input.manualPaymentUrl) throw new Error("Lien PayPal manuel indisponible.");
      return {
        hostedUrl: buildPayPalManualRequestUrl(input.manualPaymentUrl, input.amount, input.currency),
        technicalState: "sent",
      };
    }
    if (input.connectionMode !== "commerce") throw new Error("Configuration PayPal invalide.");

    const accessToken = await getPartnerAccessToken();
    const response = await fetch(`${apiBase()}/v2/checkout/orders`, {
      method: "POST",
      headers: paypalHeaders(accessToken, input.externalAccountId, input.requestId),
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: input.requestId,
            invoice_id: input.invoiceNumber,
            description: `Facture ${input.invoiceNumber}`.slice(0, 127),
            amount: { currency_code: input.currency, value: input.amount.toFixed(2) },
            payee: { merchant_id: input.externalAccountId },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              landing_page: "LOGIN",
              user_action: "PAY_NOW",
              shipping_preference: "NO_SHIPPING",
              return_url: checkoutReturnUrl(input.requestId, false),
              cancel_url: checkoutReturnUrl(input.requestId, true),
            },
          },
        },
      }),
      cache: "no-store",
    });
    const order = await providerJson<PayPalOrderResponse>(response, "Création de la demande PayPal impossible.");
    const approvalUrl = order.links?.find((link) => link.rel === "payer-action" || link.rel === "approve")?.href;
    if (!order.id || !approvalUrl) throw new Error("Lien hébergé PayPal absent.");
    return { providerRequestId: order.id, hostedUrl: approvalUrl, technicalState: "created" };
  }

  async disconnect(): Promise<void> {
    // Aucune révocation distante n'est simulée. La connexion locale est
    // supprimée et le marchand peut gérer ses autorisations dans PayPal.
  }

  getExternalDashboardUrl(): string {
    return paypalDashboardUrl();
  }
}

export async function capturePayPalOrder(input: { orderId: string; merchantId: string; requestId: string }) {
  const accessToken = await getPartnerAccessToken();
  const response = await fetch(`${apiBase()}/v2/checkout/orders/${encodeURIComponent(input.orderId)}/capture`, {
    method: "POST",
    headers: paypalHeaders(accessToken, input.merchantId, `${input.requestId}-capture`),
    body: "{}",
    cache: "no-store",
  });
  // Le corps contient le résultat financier : il n'est ni lu, ni journalisé,
  // ni renvoyé, ni persisté. Seule la page générique est ensuite affichée.
  return response.ok;
}
