import "server-only";

import { providerJson, requireServerEnv } from "./http";
import type {
  CreateExternalRequestInput,
  CreatedExternalRequest,
  ExternalPaymentRequestProvider,
  OAuthCallbackResult,
} from "./types";

type StripeTokenResponse = { access_token?: string; scope?: string; stripe_user_id?: string };
type StripeAccount = {
  id?: string;
  business_profile?: { name?: string };
  settings?: { dashboard?: { display_name?: string } };
};
type StripeCheckoutResponse = { id?: string; url?: string };

export class StripeConnectProvider implements ExternalPaymentRequestProvider {
  getAuthorizationUrl(state: string): URL {
    const url = new URL("https://connect.stripe.com/oauth/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", requireServerEnv("STRIPE_CONNECT_CLIENT_ID"));
    url.searchParams.set("scope", "read_write");
    url.searchParams.set("redirect_uri", requireServerEnv("STRIPE_CONNECT_REDIRECT_URI"));
    url.searchParams.set("state", state);
    return url;
  }

  async handleOAuthCallback(code: string): Promise<OAuthCallbackResult> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_secret: requireServerEnv("STRIPE_CONNECT_SECRET_KEY"),
    });
    const tokenResponse = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    const token = await providerJson<StripeTokenResponse>(tokenResponse, "Connexion Stripe impossible.");
    if (!token.stripe_user_id) throw new Error("Compte Stripe absent de la reponse OAuth.");

    let displayName: string | undefined;
    if (token.access_token) {
      const accountResponse = await fetch("https://api.stripe.com/v1/account", {
        headers: { authorization: `Bearer ${token.access_token}` },
        cache: "no-store",
      });
      if (accountResponse.ok) {
        const account = (await accountResponse.json()) as StripeAccount;
        displayName = account.business_profile?.name || account.settings?.dashboard?.display_name;
      }
    }

    // Le jeton OAuth Stripe n'est volontairement pas conserve : les direct
    // charges utilisent la cle plateforme et l'en-tete Stripe-Account.
    return {
      externalAccountId: token.stripe_user_id,
      merchantDisplayName: displayName,
      grantedScopes: token.scope ? token.scope.split(/\s+/).filter(Boolean) : ["read_write"],
    };
  }

  async createExternalRequest(input: CreateExternalRequestInput): Promise<CreatedExternalRequest> {
    const appUrl = requireServerEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");
    const body = new URLSearchParams();
    body.set("mode", "payment");
    body.set("payment_method_types[0]", "card");
    body.set("payment_method_types[1]", input.currency === "CHF" ? "twint" : "link");
    body.set("success_url", `${appUrl}/api/external-payments/return?provider=stripe`);
    body.set("cancel_url", `${appUrl}/api/external-payments/return?provider=stripe`);
    body.set("line_items[0][quantity]", "1");
    body.set("line_items[0][price_data][currency]", input.currency.toLowerCase());
    body.set("line_items[0][price_data][unit_amount]", String(Math.round(input.amount * 100)));
    body.set("line_items[0][price_data][product_data][name]", `Facture ${input.invoiceNumber}`);
    body.set(
      "line_items[0][price_data][product_data][description]",
      `Demande liee a la facture ${input.invoiceNumber}`,
    );
    body.set("client_reference_id", input.invoiceId);
    body.set("metadata[invoice_number]", input.invoiceNumber);

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${requireServerEnv("STRIPE_CONNECT_SECRET_KEY")}`,
        "content-type": "application/x-www-form-urlencoded",
        "idempotency-key": input.requestId,
        "stripe-account": input.externalAccountId,
      },
      body,
      cache: "no-store",
    });
    const checkout = await providerJson<StripeCheckoutResponse>(response, "Creation du lien Stripe impossible.");
    if (!checkout.id || !checkout.url) throw new Error("Lien Stripe absent de la reponse de creation.");
    return { providerRequestId: checkout.id, hostedUrl: checkout.url, technicalState: "created" };
  }

  async disconnect(externalAccountId: string): Promise<void> {
    const response = await fetch("https://connect.stripe.com/oauth/deauthorize", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: requireServerEnv("STRIPE_CONNECT_CLIENT_ID"),
        stripe_user_id: externalAccountId,
        client_secret: requireServerEnv("STRIPE_CONNECT_SECRET_KEY"),
      }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Deconnexion Stripe impossible.");
  }

  getExternalDashboardUrl(): string {
    return "https://dashboard.stripe.com/";
  }
}
