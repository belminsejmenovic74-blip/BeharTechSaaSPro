import "server-only";

export const EXTERNAL_PAYMENT_PROVIDERS = ["stripe", "sumup", "paypal", "square", "revolut", "mollie"] as const;
export type ExternalPaymentProviderName = (typeof EXTERNAL_PAYMENT_PROVIDERS)[number];
export type ExternalPaymentConnectionMode = "oauth" | "manual" | "commerce" | "api_key";
export type ExternalPaymentDeliveryChannel = "link" | "sms" | "email" | "qr" | "terminal";

export type OAuthCallbackResult = {
  externalAccountId: string;
  externalLocationId?: string;
  merchantDisplayName?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  grantedScopes: string[];
};

export type CreateExternalRequestInput = {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: "EUR" | "CHF";
  externalAccountId: string;
  externalLocationId?: string;
  accessToken?: string;
  readerId?: string;
  connectionMode?: ExternalPaymentConnectionMode;
  manualPaymentUrl?: string;
  requestId: string;
};

export type CreatedExternalRequest = {
  providerRequestId?: string;
  hostedUrl?: string;
  technicalState: "created" | "sent";
};

/**
 * Frontiere volontairement reduite. Le resultat financier ne fait pas partie
 * du contrat et ne doit jamais y etre ajoute.
 */
export interface ExternalPaymentRequestProvider {
  getAuthorizationUrl(state: string): URL | Promise<URL>;
  handleOAuthCallback(code: string): Promise<OAuthCallbackResult>;
  createExternalRequest(input: CreateExternalRequestInput): Promise<CreatedExternalRequest>;
  disconnect(externalAccountId: string, refreshToken?: string): Promise<void>;
  getExternalDashboardUrl(): string;
}

export type ExternalPaymentConnectionRow = {
  id: string;
  workshop_id: string;
  shop_id: string;
  provider: ExternalPaymentProviderName;
  external_account_id: string;
  external_location_id: string | null;
  merchant_display_name: string | null;
  encrypted_access_token: string | null;
  encrypted_refresh_token: string | null;
  token_expires_at: string | null;
  connection_mode: ExternalPaymentConnectionMode;
  encrypted_configuration: string | null;
  granted_scopes: string[] | null;
  connected_at: string;
  disconnected_at: string | null;
  is_default?: boolean;
};
