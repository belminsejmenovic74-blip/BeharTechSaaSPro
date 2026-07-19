import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/app-session", () => ({ getCurrentAppSession: vi.fn(async () => null) }));
vi.mock("@/lib/server/workshop-license-auth", () => ({ authorizeWorkshopLicense: vi.fn() }));

import { externalPaymentRequestSchema } from "@/app/api/external-payments/requests/route";
import { externalPaymentReaderSchema } from "@/app/api/external-payments/readers/route";
import { externalPaymentConnectionSchema } from "@/app/api/external-payments/connections/route";
import { revolutTerminalSchema } from "@/app/api/external-payments/revolut-terminals/route";
import { squareTerminalSchema } from "@/app/api/external-payments/square-terminals/route";

import { decryptPaymentToken, encryptPaymentToken, signExternalReturnState, verifyExternalReturnState } from "./crypto";
import { MOLLIE_OAUTH_SCOPES, MollieConnectProvider } from "./mollie";
import { getValidMollieAccessToken } from "./mollie-tokens";
import { buildPayPalManualRequestUrl, isPayPalPartnerEnabled, PayPalProvider } from "./paypal";
import { consumeOAuthState, hashOAuthState } from "./security";
import { StripeConnectProvider } from "./stripe";
import {
  listRevolutLocations,
  listRevolutTerminals,
  revolutMerchantFingerprint,
  RevolutBusinessProvider,
} from "./revolut";
import { SQUARE_OAUTH_SCOPES, SquareProvider } from "./square";
import { getValidSquareAccessToken } from "./square-tokens";
import { SumUpProvider } from "./sumup";
import { pairSumUpReader } from "./sumup-readers";
import { getValidSumUpAccessToken } from "./sumup-tokens";
import type { ExternalPaymentConnectionRow } from "./types";

const WORKSHOP_ID = "10000000-0000-4000-8000-000000000001";
const SHOP_ID = "60000000-0000-4000-8000-000000000001";
const INVOICE_ID = "inv_local_1";

function externalPaymentMigrations() {
  return [
    "20260714110000_external_payment_requests.sql",
    "20260714143000_sumup_solo_readers.sql",
    "20260714160000_paypal_external_requests.sql",
    "20260714173000_square_external_requests.sql",
    "20260714200000_revolut_external_requests.sql",
    "20260714213000_mollie_connect_external_requests.sql",
    "20260714230000_external_payment_shop_defaults.sql",
    "20260717163000_minimize_external_payment_request_storage.sql",
  ]
    .map((file) => readFileSync(join(process.cwd(), "supabase/migrations", file), "utf8"))
    .join("\n");
}

beforeEach(() => {
  vi.restoreAllMocks();
  process.env.PAYMENT_TOKEN_ENCRYPTION_KEY = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";
  process.env.STRIPE_CONNECT_CLIENT_ID = "ca_test";
  process.env.STRIPE_CONNECT_SECRET_KEY = "sk_test_connect";
  process.env.STRIPE_CONNECT_REDIRECT_URI = "https://app.example.com/api/external-payments/oauth/callback/stripe";
  process.env.SUMUP_CLIENT_ID = "sumup-client";
  process.env.SUMUP_CLIENT_SECRET = "sumup-secret";
  process.env.SUMUP_REDIRECT_URI = "https://app.example.com/api/external-payments/oauth/callback/sumup";
  process.env.SUMUP_AFFILIATE_KEY = "affiliate-key";
  process.env.SUMUP_ENVIRONMENT = "sandbox";
  process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
  process.env.SUMUP_TERMINAL_DISPATCH_ENABLED = "false";
  process.env.PAYPAL_CLIENT_ID = "paypal-client";
  process.env.PAYPAL_CLIENT_SECRET = "paypal-secret";
  process.env.PAYPAL_PARTNER_ID = "PARTNER12345";
  process.env.PAYPAL_BN_CODE = "BEHARTECHPRO_SP";
  process.env.PAYPAL_ENVIRONMENT = "sandbox";
  process.env.PAYPAL_RETURN_URL = "https://app.example.com/api/external-payments/paypal/return";
  process.env.SQUARE_APPLICATION_ID = "square-app";
  process.env.SQUARE_APPLICATION_SECRET = "square-secret";
  process.env.SQUARE_REDIRECT_URI = "https://app.example.com/api/external-payments/oauth/callback/square";
  process.env.SQUARE_ENVIRONMENT = "sandbox";
  process.env.REVOLUT_ENVIRONMENT = "sandbox";
  process.env.REVOLUT_API_VERSION = "2026-04-20";
  process.env.MOLLIE_CLIENT_ID = "app_mollie_test";
  process.env.MOLLIE_CLIENT_SECRET = "mollie-client-secret";
  process.env.MOLLIE_REDIRECT_URI = "https://app.example.com/api/external-payments/oauth/callback/mollie";
  process.env.MOLLIE_ENVIRONMENT = "test";
});

describe("external payment token encryption", () => {
  it("encrypts with a random IV and authenticates decryption", () => {
    const first = encryptPaymentToken("secret-token");
    const second = encryptPaymentToken("secret-token");
    expect(first).not.toBe(second);
    expect(decryptPaymentToken(first)).toBe("secret-token");
    expect(() => decryptPaymentToken(`${first.slice(0, -1)}x`)).toThrow();
  });
});

describe("OAuth state protection", () => {
  it.each([
    new StripeConnectProvider(),
    new SumUpProvider(),
    new SquareProvider(),
    new MollieConnectProvider(),
  ])("round-trips state in %s authorization URL", (provider) => {
    expect(provider.getAuthorizationUrl("state-exact-123").searchParams.get("state")).toBe("state-exact-123");
  });

  it("requests only the required SumUp scopes", () => {
    const scope = new SumUpProvider().getAuthorizationUrl("state-exact-123").searchParams.get("scope");
    expect(scope).toBe("payments user.profile_readonly readers.write");
    expect(scope).not.toMatch(/payment_instruments|transactions\.history|payout|refund|receipt/);
  });

  it("requests only the minimum Square seller scopes and keeps the CSRF state", () => {
    const url = new SquareProvider().getAuthorizationUrl("state-exact-123");
    expect(url.searchParams.get("state")).toBe("state-exact-123");
    expect(url.searchParams.get("scope")).toBe(SQUARE_OAUTH_SCOPES.join(" "));
    expect(url.searchParams.get("scope")).not.toMatch(/PAYMENTS_READ|ADDITIONAL_RECIPIENTS|REFUND|DISPUTE/i);
  });

  it("requests only Mollie organization, profile, onboarding and payment creation scopes", () => {
    const url = new MollieConnectProvider().getAuthorizationUrl("state-exact-123");
    expect(url.origin).toBe("https://my.mollie.com");
    expect(url.searchParams.get("state")).toBe("state-exact-123");
    expect(url.searchParams.get("scope")).toBe(MOLLIE_OAUTH_SCOPES.join(" "));
    expect(url.searchParams.get("scope")).not.toMatch(
      /payments\.read|refund|chargeback|settlement|balance|invoice|customer|mandate|subscription/i,
    );
  });

  it("exchanges a Mollie OAuth code and keeps only organization and first profile identifiers", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "mollie-access",
            refresh_token: "mollie-refresh",
            expires_in: 3600,
            scope: MOLLIE_OAUTH_SCOPES.join(" "),
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "org_repairer", name: "Atelier Mollie", financialStatus: "ignored" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            _embedded: {
              profiles: [
                { id: "pfl_shop_one", name: "Boutique 1", status: "verified" },
                { id: "pfl_shop_two", name: "Boutique 2" },
              ],
            },
          }),
          { status: 200 },
        ),
      );
    const result = await new MollieConnectProvider().handleOAuthCallback("mollie-code");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://api.mollie.com/oauth2/tokens");
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get("authorization")).toBe("Bearer mollie-access");
    expect(result).toMatchObject({
      externalAccountId: "org_repairer",
      externalLocationId: "pfl_shop_one",
      merchantDisplayName: "Atelier Mollie",
      accessToken: "mollie-access",
      refreshToken: "mollie-refresh",
      grantedScopes: [...MOLLIE_OAUTH_SCOPES],
    });
    expect(result).not.toHaveProperty("financialStatus");
    expect(result).not.toHaveProperty("status");
  });

  it("never presents a fabricated Revolut OAuth flow", async () => {
    const provider = new RevolutBusinessProvider();
    expect(() => provider.getAuthorizationUrl()).toThrow(/pas d.OAuth partenaire public/i);
    await expect(provider.handleOAuthCallback()).rejects.toThrow(/clé Merchant API/i);
    const oauthStart = readFileSync(join(process.cwd(), "src/app/api/external-payments/oauth/start/route.ts"), "utf8");
    expect(oauthStart).not.toMatch(/stripe.*sumup.*square.*revolut|revolut.*oauth/i);
  });

  it("exchanges a Square OAuth code with the seller token and selects an active location", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "square-access",
            refresh_token: "square-refresh",
            merchant_id: "SQUARESELLER",
            expires_at: "2026-08-14T12:00:00Z",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            locations: [
              { id: "INACTIVE", status: "INACTIVE", name: "Fermé", currency: "EUR" },
              { id: "L889TEST", status: "ACTIVE", name: "Atelier Square", currency: "EUR" },
            ],
          }),
          { status: 200 },
        ),
      );
    const result = await new SquareProvider().handleOAuthCallback("square-code");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get("authorization")).toBe("Bearer square-access");
    expect(result).toEqual({
      externalAccountId: "SQUARESELLER",
      externalLocationId: "L889TEST",
      merchantDisplayName: "Atelier Square",
      accessToken: "square-access",
      refreshToken: "square-refresh",
      expiresAt: "2026-08-14T12:00:00Z",
      grantedScopes: [...SQUARE_OAUTH_SCOPES],
    });
  });

  it("rejects a mismatched state and consumes a valid state only once", async () => {
    const state = "state-value-with-sufficient-entropy-123";
    const row = {
      id: "state-id",
      workshop_id: WORKSHOP_ID,
      shop_id: "60000000-0000-4000-8000-000000000001",
      created_by: null,
      redirect_path: "/dashboard/parametres",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      consumed_at: null,
    };
    const selectChain: Record<string, any> = {};
    selectChain.select = vi.fn(() => selectChain);
    selectChain.eq = vi.fn(() => selectChain);
    selectChain.maybeSingle = vi.fn(async () => ({ data: row, error: null }));
    const updateChain: Record<string, any> = {};
    updateChain.update = vi.fn(() => updateChain);
    updateChain.eq = vi.fn(() => updateChain);
    updateChain.is = vi.fn(() => updateChain);
    updateChain.select = vi.fn(() => updateChain);
    updateChain.maybeSingle = vi.fn(async () => ({ data: { id: row.id }, error: null }));
    let calls = 0;
    const admin = { from: vi.fn(() => (calls++ === 0 ? selectChain : updateChain)) };
    await expect(consumeOAuthState(admin as never, "stripe", state)).resolves.toMatchObject({ id: row.id });
    expect(selectChain.eq).toHaveBeenCalledWith("state_hash", hashOAuthState(state));

    selectChain.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    calls = 0;
    await expect(consumeOAuthState(admin as never, "sumup", `${state}-tampered`)).rejects.toThrow(/OAuth/);
  });

  it("signs PayPal capture returns and rejects tampering", () => {
    const signed = signExternalReturnState("10000000-0000-4000-8000-000000000099");
    expect(verifyExternalReturnState(signed)).toBe("10000000-0000-4000-8000-000000000099");
    expect(verifyExternalReturnState(`${signed}x`)).toBeNull();
  });
});

describe("request input boundary", () => {
  const valid = { workshopId: WORKSHOP_ID, licenseKey: "BHT-VALID-LICENSE", invoiceId: INVOICE_ID, provider: "stripe" };

  it("accepts only an invoice identifier and has no free or partial amount", () => {
    expect(externalPaymentRequestSchema.safeParse(valid).success).toBe(true);
    expect(externalPaymentRequestSchema.safeParse({ ...valid, amount: 1 }).success).toBe(false);
    expect(externalPaymentRequestSchema.safeParse({ ...valid, requestedAmount: 1 }).success).toBe(false);
  });

  it("accepts PayPal for an explicitly selected shop without accepting a client-selected amount", () => {
    expect(externalPaymentRequestSchema.safeParse({ ...valid, provider: "paypal", shopId: SHOP_ID }).success).toBe(
      true,
    );
    expect(externalPaymentRequestSchema.safeParse({ ...valid, provider: "paypal", amount: 12 }).success).toBe(false);
    expect(externalPaymentRequestSchema.safeParse({ ...valid, provider: "paypal", shopId: "other-shop" }).success).toBe(
      false,
    );
  });

  it("accepts Mollie hosted requests for a shop without accepting a terminal or free amount", () => {
    expect(externalPaymentRequestSchema.safeParse({ ...valid, provider: "mollie", shopId: SHOP_ID }).success).toBe(
      true,
    );
    expect(externalPaymentRequestSchema.safeParse({ ...valid, provider: "mollie", amount: 12 }).success).toBe(false);
    expect(externalPaymentRequestSchema.safeParse({ ...valid, provider: "mollie", shopId: "other-shop" }).success).toBe(
      false,
    );
    expect(
      externalPaymentRequestSchema.safeParse({
        ...valid,
        provider: "mollie",
        deliveryChannel: "terminal",
        readerId: "terminal-mollie",
      }).success,
    ).toBe(false);
  });

  it("rejects terminal dispatch for Stripe and without a reader", () => {
    expect(
      externalPaymentRequestSchema.safeParse({
        ...valid,
        deliveryChannel: "terminal",
        readerId: "rdr_12345678901234567890",
      }).success,
    ).toBe(false);
    expect(
      externalPaymentRequestSchema.safeParse({ ...valid, provider: "sumup", deliveryChannel: "terminal" }).success,
    ).toBe(false);
  });

  it("validates reader pairing for an explicitly selected shop", () => {
    const validReader = {
      operation: "pair",
      workshopId: WORKSHOP_ID,
      licenseKey: "BHT-VALID-LICENSE",
      pairingCode: "4WLFDSBF",
      readerName: "Comptoir",
    };
    expect(externalPaymentReaderSchema.safeParse(validReader).success).toBe(true);
    expect(externalPaymentReaderSchema.safeParse({ ...validReader, pairingCode: "123" }).success).toBe(false);
    expect(externalPaymentReaderSchema.safeParse({ ...validReader, shopId: SHOP_ID }).success).toBe(true);
    expect(externalPaymentReaderSchema.safeParse({ ...validReader, shopId: "other-shop" }).success).toBe(false);
  });

  it("validates manual PayPal configuration for a selected shop", () => {
    const validManual = {
      operation: "configure_paypal_manual",
      workshopId: WORKSHOP_ID,
      licenseKey: "BHT-VALID-LICENSE",
      paypalUrl: "https://paypal.me/atelierbehar",
    };
    expect(externalPaymentConnectionSchema.safeParse(validManual).success).toBe(true);
    expect(externalPaymentConnectionSchema.safeParse({ ...validManual, shopId: SHOP_ID }).success).toBe(true);
    expect(externalPaymentConnectionSchema.safeParse({ ...validManual, shopId: "other-shop" }).success).toBe(false);
  });

  it("accepts Square link and terminal requests for a shop but no free amount", () => {
    expect(externalPaymentRequestSchema.safeParse({ ...valid, provider: "square" }).success).toBe(true);
    expect(
      externalPaymentRequestSchema.safeParse({
        ...valid,
        provider: "square",
        deliveryChannel: "terminal",
        readerId: "9fa747a2-25ff-48ee-b078-04381f7c828f",
      }).success,
    ).toBe(true);
    expect(
      externalPaymentRequestSchema.safeParse({
        ...valid,
        provider: "square",
        deliveryChannel: "terminal",
        readerId: "R5WNWB5BKNG9R",
      }).success,
    ).toBe(true);
    expect(externalPaymentRequestSchema.safeParse({ ...valid, provider: "square", amount: 12 }).success).toBe(false);
    expect(externalPaymentRequestSchema.safeParse({ ...valid, provider: "square", shopId: SHOP_ID }).success).toBe(
      true,
    );
    expect(externalPaymentRequestSchema.safeParse({ ...valid, provider: "square", shopId: "other-shop" }).success).toBe(
      false,
    );
  });

  it("validates Square Terminal association for a selected shop", () => {
    const validTerminal = {
      operation: "associate",
      workshopId: WORKSHOP_ID,
      licenseKey: "BHT-VALID-LICENSE",
      deviceId: "9fa747a2-25ff-48ee-b078-04381f7c828f",
      locationId: "L889TEST",
      terminalName: "Comptoir",
    };
    expect(squareTerminalSchema.safeParse(validTerminal).success).toBe(true);
    expect(squareTerminalSchema.safeParse({ ...validTerminal, deviceId: "device:995CS397A6475287" }).success).toBe(
      true,
    );
    expect(squareTerminalSchema.safeParse({ ...validTerminal, shopId: SHOP_ID }).success).toBe(true);
    expect(squareTerminalSchema.safeParse({ ...validTerminal, shopId: "other-shop" }).success).toBe(false);
    expect(squareTerminalSchema.safeParse({ ...validTerminal, deviceId: "x" }).success).toBe(false);
  });

  it("validates the server-only Revolut key operations for a shop without environment overrides", () => {
    const configure = {
      operation: "configure_revolut",
      workshopId: WORKSHOP_ID,
      licenseKey: "BHT-VALID-LICENSE",
      apiKey: `sk_${"A".repeat(40)}`,
      merchantLabel: "Atelier Revolut",
    };
    expect(externalPaymentConnectionSchema.safeParse(configure).success).toBe(true);
    expect(externalPaymentConnectionSchema.safeParse({ ...configure, shopId: SHOP_ID }).success).toBe(true);
    expect(externalPaymentConnectionSchema.safeParse({ ...configure, shopId: "other-shop" }).success).toBe(false);
    expect(externalPaymentConnectionSchema.safeParse({ ...configure, environment: "production" }).success).toBe(false);
    expect(externalPaymentConnectionSchema.safeParse({ ...configure, apiKey: "sk_short" }).success).toBe(false);
    expect(
      externalPaymentConnectionSchema.safeParse({
        operation: "test_revolut",
        workshopId: WORKSHOP_ID,
        licenseKey: "BHT-VALID-LICENSE",
      }).success,
    ).toBe(true);
  });

  it("validates Revolut Terminal association for a selected shop", () => {
    const validTerminal = {
      operation: "associate",
      workshopId: WORKSHOP_ID,
      licenseKey: "BHT-VALID-LICENSE",
      locationId: "20000000-0000-4000-8000-000000000001",
      terminalId: "11111111-0000-0000-0000-000000000000",
      terminalName: "Virtual Solo",
    };
    expect(revolutTerminalSchema.safeParse(validTerminal).success).toBe(true);
    expect(revolutTerminalSchema.safeParse({ ...validTerminal, shopId: SHOP_ID }).success).toBe(true);
    expect(revolutTerminalSchema.safeParse({ ...validTerminal, shopId: "other-shop" }).success).toBe(false);
    expect(revolutTerminalSchema.safeParse({ ...validTerminal, terminalId: "terminal-1" }).success).toBe(false);
  });
});

describe("provider creation payloads", () => {
  const input = {
    invoiceId: "invoice-db-id",
    invoiceNumber: "FAC-0042",
    amount: 129.9,
    currency: "EUR" as const,
    externalAccountId: "acct_repairer",
    requestId: "request-idempotency-key",
  };

  it("creates a Stripe direct charge on the connected account without transfer or fee", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "cs_test", url: "https://checkout.stripe.com/test" }), { status: 200 }),
      );
    await new StripeConnectProvider().createExternalRequest(input);
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    const body = new URLSearchParams(String(init?.body));
    expect(headers.get("stripe-account")).toBe("acct_repairer");
    expect(headers.get("idempotency-key")).toBe(input.requestId);
    expect(headers.get("authorization")).toBe("Bearer sk_test_connect");
    expect(body.get("payment_method_types[0]")).toBe("card");
    expect(body.get("payment_method_types[1]")).toBe("link");
    expect(body.get("line_items[0][price_data][currency]")).toBe("eur");
    expect(body.get("line_items[0][price_data][unit_amount]")).toBe("12990");
    expect(body.get("metadata[invoice_number]")).toBe("FAC-0042");
    expect(String(init?.body)).not.toMatch(/transfer_data|application_fee|destination/);
    expect(String(init?.body)).not.toMatch(
      /setup_future_usage|customer_creation|subscription|klarna|affirm|afterpay|clearpay|alma/i,
    );
  });

  it("uses card and TWINT only for a CHF Checkout Session", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "cs_chf", url: "https://checkout.stripe.com/chf" }), { status: 200 }),
      );
    await new StripeConnectProvider().createExternalRequest({ ...input, currency: "CHF" });
    const body = new URLSearchParams(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.get("payment_method_types[0]")).toBe("card");
    expect(body.get("payment_method_types[1]")).toBe("twint");
    expect(body.get("line_items[0][price_data][currency]")).toBe("chf");
  });

  it("creates a SumUp hosted checkout for the repairer's merchant_code and ignores financial status", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "checkout-id",
          hosted_checkout_url: "https://pay.sumup.com/test",
          status: "PAID",
          transaction_id: "forbidden",
        }),
        { status: 200 },
      ),
    );
    const result = await new SumUpProvider().createExternalRequest({
      ...input,
      accessToken: "sumup-token",
      externalAccountId: "MERCHANT42",
    });
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(requestBody).toMatchObject({
      merchant_code: "MERCHANT42",
      amount: 129.9,
      hosted_checkout: { enabled: true },
    });
    expect(requestBody).not.toHaveProperty("return_url");
    expect(requestBody).not.toHaveProperty("installments");
    expect(requestBody).not.toHaveProperty("customer_id");
    expect(result).toEqual({
      providerRequestId: "checkout-id",
      hostedUrl: "https://pay.sumup.com/test",
      technicalState: "created",
    });
    expect(JSON.stringify(result)).not.toMatch(/PAID|transaction/i);
  });

  it("pairs a SumUp reader with only its code and human name", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "rdr_3MSAFM23CK82VSTT4BN6RWSQ65", name: "Comptoir" }), { status: 200 }),
      );
    const reader = await pairSumUpReader({
      accessToken: "sumup-token",
      merchantCode: "MERCHANT42",
      pairingCode: "4WLFDSBF",
      readerName: "Comptoir",
    });
    expect(reader).toEqual({ readerId: "rdr_3MSAFM23CK82VSTT4BN6RWSQ65", readerName: "Comptoir" });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      pairing_code: "4WLFDSBF",
      name: "Comptoir",
    });
  });

  it("dispatches the exact invoice amount and reference to a Solo without retaining the response transaction id", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ data: { client_transaction_id: "must-be-ignored" } }), { status: 201 }),
      );
    const result = await new SumUpProvider().createExternalRequest({
      ...input,
      accessToken: "sumup-token",
      externalAccountId: "MERCHANT42",
      readerId: "rdr_3MSAFM23CK82VSTT4BN6RWSQ65",
    });
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.total_amount).toEqual({ currency: "EUR", minor_unit: 2, value: 12990 });
    expect(body.description).toBe("Facture FAC-0042");
    expect(body.affiliate.tags).toEqual({ invoice_number: "FAC-0042" });
    expect(body).not.toHaveProperty("return_url");
    expect(body).not.toHaveProperty("installments");
    expect(result).toEqual({ technicalState: "sent" });
    expect(JSON.stringify(result)).not.toMatch(/transaction/i);
  });

  it("builds a PayPal.Me request with the exact invoice amount and currency", async () => {
    expect(buildPayPalManualRequestUrl("https://paypal.me/atelierbehar", 129.9, "EUR")).toBe(
      "https://paypal.me/atelierbehar/129.90EUR",
    );
    expect(buildPayPalManualRequestUrl("https://paypal.me/atelierbehar", 85, "CHF")).toBe(
      "https://paypal.me/atelierbehar/85.00CHF",
    );
    const result = await new PayPalProvider().createExternalRequest({
      ...input,
      connectionMode: "manual",
      manualPaymentUrl: "https://paypal.me/atelierbehar",
    });
    expect(result).toEqual({ hostedUrl: "https://paypal.me/atelierbehar/129.90EUR", technicalState: "sent" });
  });

  it("creates Partner Referrals onboarding with only PAYMENT and the CSRF tracking state", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "partner-token" }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ links: [{ rel: "action_url", href: "https://www.sandbox.paypal.com/bizsignup/test" }] }),
          { status: 201 },
        ),
      );
    const state = "paypal-state-with-at-least-thirty-two-characters";
    await expect(new PayPalProvider().getAuthorizationUrl(state)).resolves.toHaveProperty(
      "hostname",
      "www.sandbox.paypal.com",
    );
    const body = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(body.tracking_id).toBe(state);
    expect(body.products).toEqual(["EXPRESS_CHECKOUT"]);
    expect(body.operations[0].api_integration_preference.rest_api_integration.third_party_details.features).toEqual([
      "PAYMENT",
    ]);
    expect(JSON.stringify(body)).not.toMatch(/REFUND|DISPUTE|PARTNER_FEE|VAULT|BILLING|SUBSCRIPTION/i);
  });

  it("does not simulate Commerce Platform when partner activation is missing", async () => {
    delete process.env.PAYPAL_PARTNER_ID;
    const fetchMock = vi.spyOn(globalThis, "fetch");
    expect(isPayPalPartnerEnabled()).toBe(false);
    await expect(
      new PayPalProvider().getAuthorizationUrl("paypal-state-with-at-least-thirty-two-characters"),
    ).rejects.toThrow(/activation partenaire/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses PayPal commerce capture and requires a provider-hosted external link", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(
      new PayPalProvider().createExternalRequest({
        ...input,
        externalAccountId: "SELLER123456",
        connectionMode: "commerce",
      }),
    ).rejects.toThrow(/ne capture aucune commande PayPal/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    "EUR",
    "CHF",
  ] as const)("creates a %s Square quick-pay link on the seller location with no fee, tip or deferred method", async (currency) => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          payment_link: { id: `link-${currency}`, url: `https://square.link/u/${currency}` },
          related_resources: { orders: [{ state: "COMPLETED" }], payment_ids: ["ignored"] },
        }),
        { status: 200 },
      ),
    );
    const result = await new SquareProvider().createExternalRequest({
      ...input,
      currency,
      accessToken: "seller-square-token",
      externalLocationId: "L889TEST",
    });
    const [url, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    const body = JSON.parse(String(init?.body));
    expect(url).toBe("https://connect.squareupsandbox.com/v2/online-checkout/payment-links");
    expect(headers.get("authorization")).toBe("Bearer seller-square-token");
    expect(body.idempotency_key).toBe(input.requestId);
    expect(body.payment_note).toBe("FAC-0042");
    expect(body.quick_pay).toEqual({
      name: "Facture FAC-0042",
      price_money: { amount: 12990, currency },
      location_id: "L889TEST",
    });
    expect(body.checkout_options).toEqual({
      allow_tipping: false,
      ask_for_shipping_address: false,
      accepted_payment_methods: {
        apple_pay: true,
        google_pay: true,
        cash_app_pay: false,
        afterpay_clearpay: false,
      },
    });
    expect(JSON.stringify(body)).not.toMatch(/app_?fee|subscription|installment|customer|card_?id|source_?id|vault/i);
    expect(result).toEqual({
      providerRequestId: `link-${currency}`,
      hostedUrl: `https://square.link/u/${currency}`,
      technicalState: "created",
    });
    expect(JSON.stringify(result)).not.toMatch(/COMPLETED|payment_ids/i);
  });

  it("transmits the exact invoice total and reference to Square Terminal without retaining result fields", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({ checkout: { id: "terminal-request-id", status: "COMPLETED", payment_ids: ["ignored"] } }),
          { status: 200 },
        ),
      );
    const result = await new SquareProvider().createExternalRequest({
      ...input,
      accessToken: "seller-square-token",
      externalLocationId: "L889TEST",
      readerId: "9fa747a2-25ff-48ee-b078-04381f7c828f",
    });
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toEqual({
      idempotency_key: input.requestId,
      checkout: {
        amount_money: { amount: 12990, currency: "EUR" },
        reference_id: "FAC-0042",
        note: "Facture FAC-0042",
        device_options: {
          device_id: "9fa747a2-25ff-48ee-b078-04381f7c828f",
          tip_settings: { allow_tipping: false },
        },
      },
    });
    expect(result).toEqual({ providerRequestId: "terminal-request-id", technicalState: "sent" });
    expect(JSON.stringify(result)).not.toMatch(/COMPLETED|payment_ids/i);
  });

  it.each([
    "EUR",
    "CHF",
  ] as const)("creates a %s Revolut Hosted Checkout with the exact invoice total and no financial state", async (currency) => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: `revolut-order-${currency}`,
          checkout_url: `https://sandbox-payments.revolut.com/${currency}`,
          state: "COMPLETED",
          payments: [{ id: "forbidden" }],
          payment_attempts: [{ id: "forbidden" }],
        }),
        { status: 201 },
      ),
    );
    const result = await new RevolutBusinessProvider().createExternalRequest({
      ...input,
      currency,
      accessToken: "sk_repairer_merchant_api_key",
    });
    const [url, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    const body = JSON.parse(String(init?.body));
    expect(url).toBe("https://sandbox-merchant.revolut.com/api/orders");
    expect(headers.get("authorization")).toBe("Bearer sk_repairer_merchant_api_key");
    expect(headers.get("revolut-api-version")).toBe("2026-04-20");
    expect(headers.get("idempotency-key")).toBe(input.requestId);
    expect(body).toEqual({
      amount: 12990,
      currency,
      description: "Facture FAC-0042",
      capture_mode: "automatic",
      merchant_order_data: { reference: "FAC-0042" },
    });
    expect(JSON.stringify(body)).not.toMatch(/customer|subscription|recurring|installment|pay_?later|saved|token/i);
    expect(result).toEqual({
      providerRequestId: `revolut-order-${currency}`,
      hostedUrl: `https://sandbox-payments.revolut.com/${currency}`,
      technicalState: "created",
    });
    expect(result).not.toHaveProperty("state");
    expect(result).not.toHaveProperty("payments");
    expect(result).not.toHaveProperty("payment_attempts");
  });

  it("transmits a Revolut POS order and intent without reading or retaining the intent result", async () => {
    const intentResponse = new Response(
      JSON.stringify({ state: "COMPLETED", payment_id: "forbidden", payment_method: "card" }),
      { status: 201 },
    );
    const intentJsonSpy = vi.spyOn(intentResponse, "json");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "revolut-pos-order", state: "PENDING", payment_attempts: [] }), {
          status: 201,
        }),
      )
      .mockResolvedValueOnce(intentResponse);
    const result = await new RevolutBusinessProvider().createExternalRequest({
      ...input,
      accessToken: "sk_repairer_merchant_api_key",
      externalLocationId: "20000000-0000-4000-8000-000000000001",
      readerId: "11111111-0000-0000-0000-000000000000",
    });
    const [orderUrl, orderInit] = fetchMock.mock.calls[0];
    const [intentUrl, intentInit] = fetchMock.mock.calls[1];
    expect(orderUrl).toBe("https://sandbox-merchant.revolut.com/api/orders");
    expect(JSON.parse(String(orderInit?.body))).toMatchObject({
      amount: 12990,
      currency: "EUR",
      channel: "pos",
      location_id: "20000000-0000-4000-8000-000000000001",
      capture_mode: "manual",
      merchant_order_data: { reference: "FAC-0042" },
    });
    expect(intentUrl).toBe("https://sandbox-merchant.revolut.com/api/orders/revolut-pos-order/payment-intents");
    expect(JSON.parse(String(intentInit?.body))).toEqual({
      amount: 12990,
      terminal_id: "11111111-0000-0000-0000-000000000000",
    });
    expect(intentJsonSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ providerRequestId: "revolut-pos-order", technicalState: "sent" });
    expect(JSON.stringify(result)).not.toMatch(/COMPLETED|payment_id|method|attempt/i);
  });

  it("tests and discovers Revolut equipment through technical location and terminal endpoints only", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { id: "20000000-0000-4000-8000-000000000001", name: "Boutique", type: "physical" },
            { id: "ignored-online", name: "Web", type: "online" },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            terminals: [
              {
                id: "11111111-0000-0000-0000-000000000000",
                name: "Virtual Solo",
                battery_level: 100,
              },
            ],
          }),
          { status: 200 },
        ),
      );
    await expect(listRevolutLocations("sk_repairer_key")).resolves.toEqual([
      { id: "20000000-0000-4000-8000-000000000001", name: "Boutique" },
    ]);
    await expect(listRevolutTerminals("sk_repairer_key", "20000000-0000-4000-8000-000000000001")).resolves.toEqual([
      { id: "11111111-0000-0000-0000-000000000000", name: "Virtual Solo" },
    ]);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/locations?type=physical");
    expect(String(fetchMock.mock.calls[1][0])).toContain("operation_mode=pos");
    expect(String(fetchMock.mock.calls[1][0])).toContain("location_id=20000000-0000-4000-8000-000000000001");
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("authorization")).toBe("Bearer sk_repairer_key");
    expect(revolutMerchantFingerprint("sk_repairer_key")).toMatch(/^merchant_api:[a-f0-9]{24}$/);
    expect(revolutMerchantFingerprint("sk_repairer_key")).not.toContain("sk_repairer_key");
  });

  it.each([
    ["EUR", ["creditcard", "applepay", "paybybank"]],
    ["CHF", ["creditcard", "applepay"]],
  ] as const)("creates a %s Mollie hosted payment on the repairer's profile with immediate methods only", async (currency, methods) => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: `tr_mollie_${currency}`,
          status: "paid",
          paidAt: "forbidden",
          method: "creditcard",
          amountRefunded: { value: "1.00" },
          _links: { checkout: { href: `https://www.mollie.com/checkout/${currency}` } },
        }),
        { status: 201 },
      ),
    );
    const result = await new MollieConnectProvider().createExternalRequest({
      ...input,
      currency,
      accessToken: "mollie-repairer-access-token",
      externalAccountId: "org_repairer",
      externalLocationId: "pfl_shop_one",
    });
    const [url, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    const body = JSON.parse(String(init?.body));
    expect(url).toBe("https://api.mollie.com/v2/payments");
    expect(headers.get("authorization")).toBe("Bearer mollie-repairer-access-token");
    expect(headers.get("idempotency-key")).toBe(input.requestId);
    expect(body).toEqual({
      amount: { currency, value: "129.90" },
      description: "Facture FAC-0042",
      redirectUrl: "https://app.example.com/api/external-payments/return?provider=mollie",
      profileId: "pfl_shop_one",
      method: [...methods],
      sequenceType: "oneoff",
      captureMode: "automatic",
      testmode: true,
      metadata: { invoice_reference: "FAC-0042" },
    });
    expect(JSON.stringify(body)).not.toMatch(
      /klarna|alma|riverty|billie|in3|banktransfer|directdebit|applicationFee|routing|customerId|mandateId|storeCredentials|webhookUrl/i,
    );
    expect(result).toEqual({
      providerRequestId: `tr_mollie_${currency}`,
      hostedUrl: `https://www.mollie.com/checkout/${currency}`,
      technicalState: "created",
    });
    expect(JSON.stringify(result)).not.toMatch(/paidAt|amountRefunded|creditcard|status/i);
  });
});

describe("SumUp token rotation", () => {
  it("encrypts and persists the latest refresh token", async () => {
    const updateChain: Record<string, any> = {};
    updateChain.update = vi.fn(() => updateChain);
    updateChain.eq = vi.fn(() => updateChain);
    updateChain.is = vi.fn(async () => ({ error: null }));
    const admin = { from: vi.fn(() => updateChain) };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ access_token: "access-new", refresh_token: "refresh-new", expires_in: 3600 }), {
        status: 200,
      }),
    );
    const connection = {
      id: "connection-id",
      workshop_id: WORKSHOP_ID,
      shop_id: "60000000-0000-4000-8000-000000000001",
      provider: "sumup",
      external_account_id: "MERCHANT42",
      external_location_id: null,
      merchant_display_name: null,
      encrypted_access_token: encryptPaymentToken("access-old"),
      encrypted_refresh_token: encryptPaymentToken("refresh-old"),
      token_expires_at: new Date(Date.now() - 60_000).toISOString(),
      connection_mode: "oauth",
      encrypted_configuration: null,
      granted_scopes: ["payments", "user.profile_readonly", "readers.write"],
      connected_at: new Date().toISOString(),
      disconnected_at: null,
    } satisfies ExternalPaymentConnectionRow;
    await expect(getValidSumUpAccessToken(admin as never, connection)).resolves.toBe("access-new");
    const saved = updateChain.update.mock.calls[0][0];
    expect(decryptPaymentToken(saved.encrypted_access_token)).toBe("access-new");
    expect(decryptPaymentToken(saved.encrypted_refresh_token)).toBe("refresh-new");
  });
});

describe("Square token rotation", () => {
  it("encrypts and persists the rotated refresh token before expiry", async () => {
    const updateChain: Record<string, any> = {};
    updateChain.update = vi.fn(() => updateChain);
    updateChain.eq = vi.fn(() => updateChain);
    updateChain.is = vi.fn(async () => ({ error: null }));
    const admin = { from: vi.fn(() => updateChain) };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "square-access-new",
          refresh_token: "square-refresh-new",
          expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        }),
        { status: 200 },
      ),
    );
    const connection = {
      id: "square-connection-id",
      workshop_id: WORKSHOP_ID,
      shop_id: "60000000-0000-4000-8000-000000000001",
      provider: "square",
      external_account_id: "SQUARESELLER",
      external_location_id: "L889TEST",
      merchant_display_name: null,
      encrypted_access_token: encryptPaymentToken("square-access-old"),
      encrypted_refresh_token: encryptPaymentToken("square-refresh-old"),
      token_expires_at: new Date(Date.now() + 60_000).toISOString(),
      connection_mode: "oauth",
      encrypted_configuration: null,
      granted_scopes: [...SQUARE_OAUTH_SCOPES],
      connected_at: new Date().toISOString(),
      disconnected_at: null,
    } satisfies ExternalPaymentConnectionRow;
    await expect(getValidSquareAccessToken(admin as never, connection)).resolves.toBe("square-access-new");
    const saved = updateChain.update.mock.calls[0][0];
    expect(decryptPaymentToken(saved.encrypted_access_token)).toBe("square-access-new");
    expect(decryptPaymentToken(saved.encrypted_refresh_token)).toBe("square-refresh-new");
  });
});

describe("Mollie token rotation", () => {
  it("encrypts the rotated access and refresh tokens within the same workshop and shop", async () => {
    type UpdateChain = {
      update: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      is: ReturnType<typeof vi.fn>;
    };
    const updateChain = {} as UpdateChain;
    updateChain.update = vi.fn(() => updateChain);
    updateChain.eq = vi.fn(() => updateChain);
    updateChain.is = vi.fn(async () => ({ error: null }));
    const admin = { from: vi.fn(() => updateChain) };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ access_token: "mollie-access-new", refresh_token: "mollie-refresh-new", expires_in: 3600 }),
        { status: 200 },
      ),
    );
    const connection = {
      id: "mollie-connection-id",
      workshop_id: WORKSHOP_ID,
      shop_id: "60000000-0000-4000-8000-000000000001",
      provider: "mollie",
      external_account_id: "org_repairer",
      external_location_id: "pfl_shop_one",
      merchant_display_name: "Atelier Mollie",
      encrypted_access_token: encryptPaymentToken("mollie-access-old"),
      encrypted_refresh_token: encryptPaymentToken("mollie-refresh-old"),
      token_expires_at: new Date(Date.now() - 60_000).toISOString(),
      connection_mode: "oauth",
      encrypted_configuration: null,
      granted_scopes: [...MOLLIE_OAUTH_SCOPES],
      connected_at: new Date().toISOString(),
      disconnected_at: null,
    } satisfies ExternalPaymentConnectionRow;
    await expect(getValidMollieAccessToken(admin as never, connection)).resolves.toBe("mollie-access-new");
    const saved = updateChain.update.mock.calls[0][0];
    expect(decryptPaymentToken(saved.encrypted_access_token)).toBe("mollie-access-new");
    expect(decryptPaymentToken(saved.encrypted_refresh_token)).toBe("mollie-refresh-new");
    expect(updateChain.eq).toHaveBeenCalledWith("workshop_id", WORKSHOP_ID);
    expect(updateChain.eq).toHaveBeenCalledWith("shop_id", connection.shop_id);
    expect(updateChain.eq).toHaveBeenCalledWith("provider", "mollie");
  });
});

describe("repository financial-result boundary", () => {
  it("adds no result columns, merchant webhook, transaction, refund or payout endpoint", () => {
    const migration = externalPaymentMigrations();
    const providerSource = [
      "stripe.ts",
      "sumup.ts",
      "sumup-readers.ts",
      "sumup-tokens.ts",
      "paypal.ts",
      "mollie.ts",
      "mollie-tokens.ts",
      "revolut.ts",
      "square.ts",
      "square-tokens.ts",
      "types.ts",
    ]
      .map((file) => readFileSync(join(process.cwd(), "src/lib/server/external-payments", file), "utf8"))
      .join("\n");
    expect(migration).not.toMatch(
      /\b(payment_status|paid_at|amount_paid|payment_method|refunded_amount|balance_due|settled_at)\b/i,
    );
    expect(providerSource).not.toMatch(/\/transactions|\/refunds|\/payouts|webhook/i);
    expect(providerSource).not.toMatch(
      /getPaymentStatus|listTransactions|retrieveTransaction|markAsPaid|capturePayment|refundPayment|calculateBalance|synchronizePayments/,
    );
  });

  it("enforces tenant, shop, finalized invoice and minimal request storage in SQL", () => {
    const migration = externalPaymentMigrations();
    expect(migration).toContain("foreign key (workshop_id, shop_id)");
    expect(migration).toContain("foreign key (workshop_id, invoice_id)");
    expect(migration).toContain("external_payment_request_forbidden_persistence");
    expect(migration).toContain("private.member_of(workshop_id)");
    expect(migration).toContain("private.can_manage(workshop_id)");
    expect(migration).toContain("external_payment_requests_invoice_channel_unique");
    expect(migration).toMatch(/technical_state in \('created', 'sent', 'dispatch_error'\)/);
    expect(migration).toContain("foreign key (workshop_id, shop_id, provider, reader_id)");
    expect(migration).toContain("external_payment_readers_manage");
    expect(migration).toMatch(/provider in \('stripe', 'sumup', 'paypal', 'square', 'revolut', 'mollie'\)/);
    expect(migration).toContain("encrypted_configuration");
    expect(migration).toContain("connection_mode in ('manual', 'commerce')");
    expect(migration).toContain("connection_mode = 'api_key'");
    expect(migration).toContain("force row level security");
    expect(migration).toContain("invoice_not_in_shop");
    expect(migration).toContain("external_payment_connections_one_default_per_shop");
    expect(migration).toContain("add column if not exists currency text");
    expect(migration).toContain("alter column requested_amount drop not null");
    expect(migration).toContain("alter column technical_state drop not null");
  });

  it("keeps connection defaults and shop selection technical and server-validated", () => {
    const connections = readFileSync(join(process.cwd(), "src/app/api/external-payments/connections/route.ts"), "utf8");
    expect(connections).toContain('operation: z.literal("set_default")');
    expect(connections).toContain("shopId: z.string().uuid()");
    expect(connections).toContain("resolveActiveShop(auth.admin, auth.workshopId, parsed.data.shopId)");
    expect(connections).toContain('parsed.data.operation === "list" ? "use" : "manage"');
    const publicConnectionPayload = connections.slice(
      connections.indexOf("connections: (data || []).map"),
      connections.indexOf("shops: shopsResult.data"),
    );
    expect(publicConnectionPayload).not.toContain("encrypted_access_token");
    expect(publicConnectionPayload).not.toContain("encrypted_refresh_token");
  });

  it("does not update legacy payments, invoice status or repair status", () => {
    const route = readFileSync(join(process.cwd(), "src/app/api/external-payments/requests/route.ts"), "utf8");
    expect(route).not.toMatch(/from\(["']payments["']\)/);
    expect(route).not.toMatch(/from\(["']invoices["']\)\s*\.update/);
    expect(route).not.toMatch(/from\(["']repairs["']\)\s*\.update/);
    expect(route).toContain("shopId: z.string().uuid().optional()");
    expect(route).toContain("resolveActiveShop(auth.admin, auth.workshopId, parsed.data.shopId)");
    expect(route).toContain('.eq("reader_id", parsed.data.readerId as string)');
    expect(route).not.toContain("requested_amount:");
    expect(route).not.toContain("sent_at:");
    expect(route).not.toContain('technical_state: "dispatch_error"');
  });

  it("keeps the PayPal return generic and never stores capture data", () => {
    const route = readFileSync(join(process.cwd(), "src/app/api/external-payments/paypal/return/route.ts"), "utf8");
    expect(route).not.toMatch(/PayerID|payer_id|COMPLETED|APPROVED|CAPTURED|capture_id|paid_at|amount_paid/);
    expect(route).not.toMatch(/\.update\(|\.insert\(/);
    expect(route).not.toMatch(/console\.|response\.json/);
    expect(route).toContain('externalPaymentReturnPage("PayPal")');
  });

  it("keeps the primary settings and request interfaces responsive", () => {
    const integrations = readFileSync(
      join(process.cwd(), "src/components/behar/external-payment-integrations.tsx"),
      "utf8",
    );
    const modal = readFileSync(join(process.cwd(), "src/components/behar/external-payment-request-modal.tsx"), "utf8");
    expect(integrations).toMatch(/xl:grid-cols-3/);
    expect(integrations).toMatch(/sm:flex-row/);
    expect(integrations).toMatch(/Connecter Revolut/);
    expect(integrations).toMatch(/Terminer la vérification/);
    expect(integrations).toMatch(/connect\("mollie"\)/);
    expect(modal).toMatch(/sm:grid-cols-2/);
    expect(modal).toMatch(/sm:flex-row/);
    expect(modal).toMatch(/seuls carte, Apple Pay, Google Pay et Revolut Pay sont actifs/);
    expect(modal).toMatch(/!revolutMethodsConfirmed/);
  });

  it("keeps SumUp terminal dispatch disabled by default", async () => {
    process.env.SUMUP_ENVIRONMENT = "production";
    process.env.SUMUP_TERMINAL_DISPATCH_ENABLED = "false";
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(
      new SumUpProvider().createExternalRequest({
        invoiceId: "invoice-db-id",
        invoiceNumber: "FAC-0042",
        amount: 129.9,
        currency: "EUR",
        externalAccountId: "MERCHANT42",
        accessToken: "sumup-token",
        readerId: "rdr_12345678901234567890123456",
        requestId: "terminal-request",
      }),
    ).rejects.toThrow(/désactivé/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never calls Square result, search, refund or webhook endpoints", () => {
    const squareSource = readFileSync(join(process.cwd(), "src/lib/server/external-payments/square.ts"), "utf8");
    const squareRoutes = [
      "src/app/api/external-payments/requests/route.ts",
      "src/app/api/external-payments/square-terminals/route.ts",
    ]
      .map((file) => readFileSync(join(process.cwd(), file), "utf8"))
      .join("\n");
    expect(`${squareSource}\n${squareRoutes}`).not.toMatch(
      /\/v2\/payments|\/v2\/refunds|terminals\/checkouts\/search|SearchTerminalCheckouts|GetPayment|ListPayments|webhook/i,
    );
  });

  it("scopes every Square Terminal operation to the authenticated workshop and resolved shop", () => {
    const route = readFileSync(join(process.cwd(), "src/app/api/external-payments/square-terminals/route.ts"), "utf8");
    expect(route).toContain("resolveActiveShop(auth.admin, auth.workshopId, parsed.data.shopId)");
    expect(route).toContain("shopId: z.string().uuid().optional()");
    expect(route).toContain('.eq("workshop_id", auth.workshopId)');
    expect(route).toContain('.eq("shop_id", shopId)');
    expect(route).toContain('.eq("provider", "square")');
    expect(route).toContain('onConflict: "workshop_id,shop_id,provider,reader_id"');
  });

  it("never calls Revolut order, payment, attempt, refund, report or webhook result endpoints", () => {
    const revolutSource = readFileSync(join(process.cwd(), "src/lib/server/external-payments/revolut.ts"), "utf8");
    const revolutRoutes = [
      "src/app/api/external-payments/connections/route.ts",
      "src/app/api/external-payments/requests/route.ts",
      "src/app/api/external-payments/revolut-terminals/route.ts",
    ]
      .map((file) => readFileSync(join(process.cwd(), file), "utf8"))
      .join("\n");
    expect(`${revolutSource}\n${revolutRoutes}`).not.toMatch(
      /\/api\/payments|\/api\/payment-attempts|\/api\/refunds|\/api\/reports|\/api\/customers|webhook/i,
    );
    expect(revolutSource).not.toMatch(/intentResponse\.json|method:\s*["']GET["'][\s\S]{0,80}\/api\/orders/);
  });

  it("scopes every Revolut Terminal operation to the authenticated workshop and resolved shop", () => {
    const route = readFileSync(join(process.cwd(), "src/app/api/external-payments/revolut-terminals/route.ts"), "utf8");
    expect(route).toContain("resolveActiveShop(auth.admin, auth.workshopId, parsed.data.shopId)");
    expect(route).toContain("shopId: z.string().uuid().optional()");
    expect(route).toContain('.eq("workshop_id", auth.workshopId)');
    expect(route).toContain('.eq("shop_id", shopId)');
    expect(route).toContain('.eq("provider", "revolut")');
    expect(route).toContain('onConflict: "workshop_id,shop_id,provider,reader_id"');
  });

  it("encrypts the merchant key and never returns it from the connection endpoint", () => {
    const route = readFileSync(join(process.cwd(), "src/app/api/external-payments/connections/route.ts"), "utf8");
    expect(route).toContain("encryptPaymentToken(apiKey)");
    expect(route).toContain('operation: z.literal("configure_revolut")');
    expect(route).toContain('operation: z.literal("test_revolut")');
    expect(route).not.toMatch(/console\.(log|info|debug|warn|error)/);
    expect(route.match(/return NextResponse\.json\(\{ ok: true \}\)/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("never calls Mollie payment result, refund, chargeback, settlement, balance, invoice or webhook endpoints", () => {
    const mollieSource = ["mollie.ts", "mollie-tokens.ts"]
      .map((file) => readFileSync(join(process.cwd(), "src/lib/server/external-payments", file), "utf8"))
      .join("\n");
    expect(mollieSource).not.toMatch(
      /\/v2\/payments\/\$?\{|\/v2\/refunds|\/v2\/chargebacks|\/v2\/settlements|\/v2\/balances|\/v2\/invoices|webhookUrl/i,
    );
    expect(mollieSource.match(/https:\/\/api\.mollie\.com\/v2\/payments/g)).toHaveLength(1);
    expect(mollieSource).not.toMatch(/applicationFee|\brouting\b|resell|sequenceType:\s*["'](?:first|recurring)/i);
  });

  it("scopes Mollie connection, profile refresh and request creation to the resolved shop", () => {
    const connections = readFileSync(join(process.cwd(), "src/app/api/external-payments/connections/route.ts"), "utf8");
    const requests = readFileSync(join(process.cwd(), "src/app/api/external-payments/requests/route.ts"), "utf8");
    expect(connections).toContain("resolveActiveShop(auth.admin, auth.workshopId, parsed.data.shopId)");
    expect(connections).toContain("shopId: z.string().uuid().optional()");
    expect(connections).toContain('.eq("workshop_id", auth.workshopId)');
    expect(connections).toContain('.eq("shop_id", shopId)');
    expect(connections).toContain('.eq("provider", "mollie")');
    expect(requests).toContain('.eq("shop_id", shopId)');
    expect(requests).toContain('parsed.data.provider === "mollie"');
  });
});
