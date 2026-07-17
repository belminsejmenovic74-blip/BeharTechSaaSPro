import "server-only";

import { providerJson, requireServerEnv } from "./http";
import type {
  CreateExternalRequestInput,
  CreatedExternalRequest,
  ExternalPaymentRequestProvider,
  OAuthCallbackResult,
} from "./types";

type SumUpTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};
type SumUpProfile = {
  merchant_profile?: { merchant_code?: string; doing_business_as?: { business_name?: string }; business_name?: string };
};
type SumUpCheckout = { id?: string; hosted_checkout_url?: string };

export function isSumUpTerminalDispatchEnabled() {
  const environment = process.env.SUMUP_ENVIRONMENT || "production";
  if (environment !== "sandbox" && environment !== "production") throw new Error("SUMUP_ENVIRONMENT invalide.");
  return environment === "sandbox" || process.env.SUMUP_TERMINAL_DISPATCH_ENABLED === "true";
}

export class SumUpProvider implements ExternalPaymentRequestProvider {
  getAuthorizationUrl(state: string): URL {
    const url = new URL("https://api.sumup.com/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", requireServerEnv("SUMUP_CLIENT_ID"));
    url.searchParams.set("redirect_uri", requireServerEnv("SUMUP_REDIRECT_URI"));
    // Aucun scope transactions.history, payment_instruments, payouts, refunds ou receipts.
    url.searchParams.set("scope", "payments user.profile_readonly readers.write");
    url.searchParams.set("state", state);
    return url;
  }

  async handleOAuthCallback(code: string): Promise<OAuthCallbackResult> {
    const tokenResponse = await fetch("https://api.sumup.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: requireServerEnv("SUMUP_REDIRECT_URI"),
        client_id: requireServerEnv("SUMUP_CLIENT_ID"),
        client_secret: requireServerEnv("SUMUP_CLIENT_SECRET"),
      }),
      cache: "no-store",
    });
    const token = await providerJson<SumUpTokenResponse>(tokenResponse, "Connexion SumUp impossible.");
    if (!token.access_token || !token.refresh_token) throw new Error("Jetons SumUp absents de la reponse OAuth.");

    const profileResponse = await fetch("https://api.sumup.com/v0.1/me", {
      headers: { authorization: `Bearer ${token.access_token}` },
      cache: "no-store",
    });
    const profile = await providerJson<SumUpProfile>(profileResponse, "Profil marchand SumUp indisponible.");
    const merchant = profile.merchant_profile;
    if (!merchant?.merchant_code) throw new Error("merchant_code SumUp absent.");
    return {
      externalAccountId: merchant.merchant_code,
      merchantDisplayName: merchant.doing_business_as?.business_name || merchant.business_name,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: new Date(Date.now() + Math.max(0, token.expires_in ?? 3600) * 1000).toISOString(),
      grantedScopes: token.scope
        ? token.scope.split(/\s+/).filter(Boolean)
        : ["payments", "user.profile_readonly", "readers.write"],
    };
  }

  async createExternalRequest(input: CreateExternalRequestInput): Promise<CreatedExternalRequest> {
    if (!input.accessToken) throw new Error("Jeton SumUp indisponible.");
    if (input.readerId) return this.dispatchToReader(input);

    const response = await fetch("https://api.sumup.com/v0.1/checkouts", {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        "content-type": "application/json",
        "idempotency-key": input.requestId,
      },
      body: JSON.stringify({
        checkout_reference: input.requestId,
        amount: input.amount,
        currency: input.currency,
        merchant_code: input.externalAccountId,
        description: `Facture ${input.invoiceNumber}`,
        hosted_checkout: { enabled: true },
      }),
      cache: "no-store",
    });
    const checkout = await providerJson<SumUpCheckout>(response, "Creation de la demande SumUp impossible.");
    if (!checkout.id || !checkout.hosted_checkout_url) throw new Error("Lien heberge SumUp absent.");
    // Tout statut financier potentiellement retourne par l'API est ignore.
    return { providerRequestId: checkout.id, hostedUrl: checkout.hosted_checkout_url, technicalState: "created" };
  }

  private async dispatchToReader(input: CreateExternalRequestInput): Promise<CreatedExternalRequest> {
    if (!isSumUpTerminalDispatchEnabled()) throw new Error("Envoi terminal SumUp désactivé.");
    const affiliateKey = requireServerEnv("SUMUP_AFFILIATE_KEY");
    const response = await fetch(
      `https://api.sumup.com/v0.1/merchants/${encodeURIComponent(input.externalAccountId)}/readers/${encodeURIComponent(input.readerId || "")}/checkout`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${input.accessToken}`, "content-type": "application/json" },
        body: JSON.stringify({
          total_amount: { currency: input.currency, minor_unit: 2, value: Math.round(input.amount * 100) },
          description: `Facture ${input.invoiceNumber}`,
          affiliate: {
            app_id: "fr.behartech.pro",
            foreign_transaction_id: input.requestId,
            key: affiliateKey,
            tags: { invoice_number: input.invoiceNumber },
          },
        }),
        cache: "no-store",
      },
    );
    if (!response.ok) throw new Error("La demande n’a pas pu être transmise au terminal.");
    // La reponse contient un identifiant exploitable par l'API Transactions :
    // il est volontairement ignore et ne sera jamais persiste.
    return { technicalState: "sent" };
  }

  async disconnect(): Promise<void> {
    // SumUp ne documente pas d'endpoint de revocation pour ce flux. La route
    // efface immediatement les jetons locaux ; le marchand peut aussi retirer
    // l'autorisation depuis son espace SumUp.
  }

  getExternalDashboardUrl(): string {
    return "https://me.sumup.com/";
  }
}
