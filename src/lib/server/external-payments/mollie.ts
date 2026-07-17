import "server-only";

import { providerJson, requireServerEnv } from "./http";
import type {
  CreateExternalRequestInput,
  CreatedExternalRequest,
  ExternalPaymentRequestProvider,
  OAuthCallbackResult,
} from "./types";

export const MOLLIE_OAUTH_SCOPES = [
  "organizations.read",
  "profiles.read",
  "onboarding.read",
  "payments.write",
] as const;

type MollieTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};
type MollieOrganization = { id?: string; name?: string };
type MollieProfile = { id?: string; name?: string; website?: string };
type MollieProfilesResponse = { _embedded?: { profiles?: MollieProfile[] } };
type MolliePaymentResponse = { id?: string; _links?: { checkout?: { href?: string } } };
type MollieOnboardingResponse = { _links?: { dashboard?: { href?: string } } };

export function mollieEnvironment() {
  const value = process.env.MOLLIE_ENVIRONMENT || "test";
  if (value !== "test" && value !== "live") throw new Error("MOLLIE_ENVIRONMENT invalide.");
  return value;
}

function mollieBasicAuthorization() {
  const credentials = `${requireServerEnv("MOLLIE_CLIENT_ID")}:${requireServerEnv("MOLLIE_CLIENT_SECRET")}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

function mollieBearer(accessToken: string) {
  return { authorization: `Bearer ${accessToken}`, "content-type": "application/json" };
}

export async function listMollieProfiles(accessToken: string) {
  const response = await fetch("https://api.mollie.com/v2/profiles?limit=250", {
    headers: mollieBearer(accessToken),
    cache: "no-store",
  });
  const result = await providerJson<MollieProfilesResponse>(response, "Profils Mollie indisponibles.");
  return (result._embedded?.profiles || [])
    .filter((profile) => profile.id)
    .map((profile) => ({ id: profile.id as string, name: profile.name || profile.website || "Profil Mollie" }));
}

export async function getMollieOnboardingUrl(accessToken: string) {
  const response = await fetch("https://api.mollie.com/v2/onboarding/me", {
    headers: mollieBearer(accessToken),
    cache: "no-store",
  });
  const result = await providerJson<MollieOnboardingResponse>(response, "Onboarding Mollie indisponible.");
  return result._links?.dashboard?.href || "https://my.mollie.com/dashboard";
}

export class MollieConnectProvider implements ExternalPaymentRequestProvider {
  getAuthorizationUrl(state: string): URL {
    const url = new URL("https://my.mollie.com/oauth2/authorize");
    url.searchParams.set("client_id", requireServerEnv("MOLLIE_CLIENT_ID"));
    url.searchParams.set("redirect_uri", requireServerEnv("MOLLIE_REDIRECT_URI"));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", MOLLIE_OAUTH_SCOPES.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("locale", "fr_FR");
    return url;
  }

  async handleOAuthCallback(code: string): Promise<OAuthCallbackResult> {
    const response = await fetch("https://api.mollie.com/oauth2/tokens", {
      method: "POST",
      headers: {
        authorization: mollieBasicAuthorization(),
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: requireServerEnv("MOLLIE_REDIRECT_URI"),
      }),
      cache: "no-store",
    });
    const token = await providerJson<MollieTokenResponse>(response, "Connexion Mollie impossible.");
    if (!token.access_token || !token.refresh_token) throw new Error("Jetons OAuth Mollie absents.");

    const organizationResponse = await fetch("https://api.mollie.com/v2/organizations/me", {
      headers: mollieBearer(token.access_token),
      cache: "no-store",
    });
    const organization = await providerJson<MollieOrganization>(
      organizationResponse,
      "Organisation Mollie indisponible.",
    );
    if (!organization.id) throw new Error("Organization ID Mollie absent.");
    const profiles = await listMollieProfiles(token.access_token);
    return {
      externalAccountId: organization.id,
      externalLocationId: profiles[0]?.id,
      merchantDisplayName: organization.name || "Organisation Mollie",
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: new Date(Date.now() + Math.max(0, token.expires_in ?? 3600) * 1000).toISOString(),
      grantedScopes: token.scope ? token.scope.split(/\s+/).filter(Boolean) : [...MOLLIE_OAUTH_SCOPES],
    };
  }

  async createExternalRequest(input: CreateExternalRequestInput): Promise<CreatedExternalRequest> {
    if (!input.accessToken) throw new Error("Jeton Mollie indisponible.");
    if (!input.externalLocationId) throw new Error("Terminez la vérification et configurez un profil Mollie.");
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL manquante.");

    // Google Pay est présenté automatiquement par Mollie sur la page Carte
    // lorsqu'il est actif sur le profil ; ce n'est pas une valeur `method` API.
    const methods = input.currency === "EUR" ? ["creditcard", "applepay", "paybybank"] : ["creditcard", "applepay"];
    const response = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        ...mollieBearer(input.accessToken),
        "idempotency-key": input.requestId,
      },
      body: JSON.stringify({
        amount: { currency: input.currency, value: input.amount.toFixed(2) },
        description: `Facture ${input.invoiceNumber}`,
        redirectUrl: `${appUrl}/api/external-payments/return?provider=mollie`,
        profileId: input.externalLocationId,
        method: methods,
        sequenceType: "oneoff",
        captureMode: "automatic",
        testmode: mollieEnvironment() === "test",
        metadata: { invoice_reference: input.invoiceNumber },
      }),
      cache: "no-store",
    });
    const payment = await providerJson<MolliePaymentResponse>(response, "Création de la demande Mollie impossible.");
    const checkoutUrl = payment._links?.checkout?.href;
    if (!payment.id || !checkoutUrl) throw new Error("Page de paiement Mollie absente.");
    return { providerRequestId: payment.id, hostedUrl: checkoutUrl, technicalState: "created" };
  }

  async disconnect(_externalAccountId: string, refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    const response = await fetch("https://api.mollie.com/oauth2/tokens", {
      method: "DELETE",
      headers: {
        authorization: mollieBasicAuthorization(),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ token_type_hint: "refresh_token", token: refreshToken }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Déconnexion Mollie impossible.");
  }

  getExternalDashboardUrl(): string {
    return "https://my.mollie.com/dashboard";
  }
}
