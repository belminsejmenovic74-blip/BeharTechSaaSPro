import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { decryptPaymentToken, encryptPaymentToken } from "@/lib/server/external-payments/crypto";
import { isPayPalPartnerEnabled, normalizePayPalManualUrl } from "@/lib/server/external-payments/paypal";
import { getMollieOnboardingUrl, listMollieProfiles, mollieEnvironment } from "@/lib/server/external-payments/mollie";
import { getValidMollieAccessToken } from "@/lib/server/external-payments/mollie-tokens";
import { getExternalPaymentProvider } from "@/lib/server/external-payments/providers";
import {
  revolutEnvironment,
  revolutMerchantFingerprint,
  testRevolutConnection,
} from "@/lib/server/external-payments/revolut";
import {
  authorizeExternalPayments,
  consumeCreationRateLimit,
  resolveActiveShop,
  stableExternalUuid,
} from "@/lib/server/external-payments/security";
import { isSumUpTerminalDispatchEnabled } from "@/lib/server/external-payments/sumup";

export const dynamic = "force-dynamic";

export const externalPaymentConnectionSchema = z.discriminatedUnion("operation", [
  z
    .object({
      operation: z.literal("list"),
      workshopId: z.string().uuid(),
      licenseKey: z.string().trim().min(6).max(100),
      shopId: z.string().uuid().optional(),
    })
    .strict(),
  z
    .object({
      operation: z.literal("disconnect"),
      workshopId: z.string().uuid(),
      licenseKey: z.string().trim().min(6).max(100),
      provider: z.enum(["stripe", "sumup", "paypal", "square", "revolut", "mollie"]),
      shopId: z.string().uuid().optional(),
    })
    .strict(),
  z
    .object({
      operation: z.literal("set_default"),
      workshopId: z.string().uuid(),
      licenseKey: z.string().trim().min(6).max(100),
      provider: z.enum(["stripe", "sumup", "paypal", "square", "revolut", "mollie"]),
      shopId: z.string().uuid(),
    })
    .strict(),
  z
    .object({
      operation: z.literal("configure_paypal_manual"),
      workshopId: z.string().uuid(),
      licenseKey: z.string().trim().min(6).max(100),
      paypalUrl: z.string().trim().min(12).max(500),
      shopId: z.string().uuid().optional(),
    })
    .strict(),
  z
    .object({
      operation: z.literal("configure_revolut"),
      workshopId: z.string().uuid(),
      licenseKey: z.string().trim().min(6).max(100),
      apiKey: z
        .string()
        .trim()
        .regex(/^sk_[A-Za-z0-9_-]{24,480}$/),
      merchantLabel: z.string().trim().min(1).max(100).optional(),
      shopId: z.string().uuid().optional(),
    })
    .strict(),
  z
    .object({
      operation: z.literal("test_revolut"),
      workshopId: z.string().uuid(),
      licenseKey: z.string().trim().min(6).max(100),
      shopId: z.string().uuid().optional(),
    })
    .strict(),
  z
    .object({
      operation: z.literal("open_mollie_onboarding"),
      workshopId: z.string().uuid(),
      licenseKey: z.string().trim().min(6).max(100),
      shopId: z.string().uuid().optional(),
    })
    .strict(),
]);

export async function POST(request: Request) {
  const parsed = externalPaymentConnectionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Demande invalide." }, { status: 400 });
  const auth = await authorizeExternalPayments(
    parsed.data.workshopId,
    parsed.data.licenseKey,
    parsed.data.operation === "list" ? "use" : "manage",
  );
  if (auth instanceof Response) return auth;

  try {
    const shopId = await resolveActiveShop(auth.admin, auth.workshopId, parsed.data.shopId);
    if (parsed.data.operation === "list") {
      const shopsResult = await auth.admin
        .from("shops")
        .select("id,name:internal_name,country,currency")
        .eq("tenant_id", auth.workshopId)
        .eq("active", true)
        .order("created_at", { ascending: true });
      if (shopsResult.error) throw new Error("Chargement des boutiques impossible.");
      const { data, error } = await auth.admin
        .from("external_payment_connections")
        .select(
          "provider,external_account_id,external_location_id,merchant_display_name,connected_at,connection_mode,encrypted_configuration,token_expires_at,is_default",
        )
        .eq("workshop_id", auth.workshopId)
        .eq("shop_id", shopId)
        .is("disconnected_at", null);
      if (error) throw new Error("Chargement des integrations impossible.");
      return NextResponse.json({
        connections: (data || []).map((connection) => {
          const manualUrl =
            connection.provider === "paypal" &&
            connection.connection_mode === "manual" &&
            connection.encrypted_configuration
              ? decryptPaymentToken(connection.encrypted_configuration)
              : null;
          return {
            provider: connection.provider,
            external_account_id: connection.external_account_id,
            external_location_id: connection.external_location_id,
            merchant_display_name: connection.merchant_display_name,
            connected_at: connection.connected_at,
            connectionMode: connection.connection_mode,
            connectionState:
              connection.token_expires_at && Date.parse(connection.token_expires_at) <= Date.now()
                ? "reconnect_required"
                : connection.provider === "mollie" && !connection.external_location_id
                  ? "incomplete"
                  : "connected",
            isDefault: Boolean(connection.is_default),
            manualUrl,
            dashboardUrl: getExternalPaymentProvider(connection.provider).getExternalDashboardUrl(),
          };
        }),
        shops: shopsResult.data || [],
        selectedShopId: shopId,
        terminalDispatchEnabled: isSumUpTerminalDispatchEnabled(),
        sumUpEnvironment: process.env.SUMUP_ENVIRONMENT === "sandbox" ? "sandbox" : "production",
        paypalPartnerEnabled: isPayPalPartnerEnabled(),
        revolutEnvironment: revolutEnvironment(),
        mollieEnvironment: mollieEnvironment(),
      });
    }

    if (parsed.data.operation === "set_default") {
      if (!consumeCreationRateLimit(`external-default:${auth.workshopId}:${shopId}`)) {
        return NextResponse.json({ error: "Trop de tentatives. Réessayez dans une minute." }, { status: 429 });
      }
      const cleared = await auth.admin
        .from("external_payment_connections")
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq("workshop_id", auth.workshopId)
        .eq("shop_id", shopId)
        .is("disconnected_at", null);
      if (cleared.error) throw new Error("Fournisseur par défaut impossible.");
      const selected = await auth.admin
        .from("external_payment_connections")
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq("workshop_id", auth.workshopId)
        .eq("shop_id", shopId)
        .eq("provider", parsed.data.provider)
        .is("disconnected_at", null)
        .select("id")
        .maybeSingle();
      if (selected.error || !selected.data) throw new Error("Connexion active introuvable pour cette boutique.");
      return NextResponse.json({ ok: true });
    }

    if (parsed.data.operation === "configure_paypal_manual") {
      if (!consumeCreationRateLimit(`paypal-config:${auth.workshopId}`)) {
        return NextResponse.json({ error: "Trop de tentatives. Réessayez dans une minute." }, { status: 429 });
      }
      const paypalUrl = normalizePayPalManualUrl(parsed.data.paypalUrl);
      const existing = await auth.admin
        .from("external_payment_connections")
        .select("id,is_default")
        .eq("workshop_id", auth.workshopId)
        .eq("shop_id", shopId)
        .eq("provider", "paypal")
        .is("disconnected_at", null)
        .maybeSingle();
      if (existing.error) throw new Error("Configuration PayPal impossible.");
      const now = new Date().toISOString();
      const values = {
        workshop_id: auth.workshopId,
        shop_id: shopId,
        provider: "paypal",
        external_account_id: `manual:${stableExternalUuid(paypalUrl)}`,
        merchant_display_name: "Lien PayPal Business",
        connection_mode: "manual",
        encrypted_configuration: encryptPaymentToken(paypalUrl),
        encrypted_access_token: null,
        encrypted_refresh_token: null,
        token_expires_at: null,
        granted_scopes: [],
        connected_at: now,
        disconnected_at: null,
        created_by: auth.userId,
        updated_at: now,
        is_default: existing.data?.is_default ?? false,
      };
      const saved = existing.data?.id
        ? await auth.admin
            .from("external_payment_connections")
            .update(values)
            .eq("id", existing.data.id)
            .eq("workshop_id", auth.workshopId)
        : await auth.admin.from("external_payment_connections").insert(values);
      if (saved.error) throw new Error("Configuration PayPal impossible.");
      await ensureShopHasDefault(auth.admin, auth.workshopId, shopId, "paypal");
      return NextResponse.json({ ok: true });
    }

    if (parsed.data.operation === "configure_revolut") {
      if (!consumeCreationRateLimit(`revolut-config:${auth.workshopId}`)) {
        return NextResponse.json({ error: "Trop de tentatives. Réessayez dans une minute." }, { status: 429 });
      }
      const apiKey = parsed.data.apiKey;
      await testRevolutConnection(apiKey);
      const merchantFingerprint = revolutMerchantFingerprint(apiKey);
      const existing = await auth.admin
        .from("external_payment_connections")
        .select("id,external_account_id,is_default")
        .eq("workshop_id", auth.workshopId)
        .eq("shop_id", shopId)
        .eq("provider", "revolut")
        .is("disconnected_at", null)
        .maybeSingle();
      if (existing.error) throw new Error("Configuration Revolut impossible.");
      const now = new Date().toISOString();
      const values = {
        workshop_id: auth.workshopId,
        shop_id: shopId,
        provider: "revolut",
        external_account_id: merchantFingerprint,
        external_location_id: null,
        merchant_display_name: parsed.data.merchantLabel || "Merchant Account Revolut",
        connection_mode: "api_key",
        encrypted_configuration: null,
        encrypted_access_token: encryptPaymentToken(apiKey),
        encrypted_refresh_token: null,
        token_expires_at: null,
        granted_scopes: [],
        connected_at: now,
        disconnected_at: null,
        created_by: auth.userId,
        updated_at: now,
        is_default: existing.data?.is_default ?? false,
      };
      const saved = existing.data?.id
        ? await auth.admin
            .from("external_payment_connections")
            .update(values)
            .eq("id", existing.data.id)
            .eq("workshop_id", auth.workshopId)
            .eq("shop_id", shopId)
        : await auth.admin.from("external_payment_connections").insert(values);
      if (saved.error) throw new Error("Configuration Revolut impossible.");
      await ensureShopHasDefault(auth.admin, auth.workshopId, shopId, "revolut");
      if (existing.data?.external_account_id && existing.data.external_account_id !== merchantFingerprint) {
        const disabled = await auth.admin
          .from("external_payment_readers")
          .update({ active: false })
          .eq("workshop_id", auth.workshopId)
          .eq("shop_id", shopId)
          .eq("provider", "revolut");
        if (disabled.error) throw new Error("Réinitialisation des terminaux Revolut impossible.");
      }
      return NextResponse.json({ ok: true });
    }

    if (parsed.data.operation === "test_revolut") {
      if (!consumeCreationRateLimit(`revolut-test:${auth.workshopId}`)) {
        return NextResponse.json({ error: "Trop de tentatives. Réessayez dans une minute." }, { status: 429 });
      }
      const stored = await auth.admin
        .from("external_payment_connections")
        .select("encrypted_access_token")
        .eq("workshop_id", auth.workshopId)
        .eq("shop_id", shopId)
        .eq("provider", "revolut")
        .is("disconnected_at", null)
        .maybeSingle();
      if (stored.error || !stored.data?.encrypted_access_token) {
        return NextResponse.json({ error: "Connexion Revolut introuvable." }, { status: 404 });
      }
      await testRevolutConnection(decryptPaymentToken(stored.data.encrypted_access_token));
      return NextResponse.json({ ok: true });
    }

    if (parsed.data.operation === "open_mollie_onboarding") {
      if (!consumeCreationRateLimit(`mollie-onboarding:${auth.workshopId}`)) {
        return NextResponse.json({ error: "Trop de tentatives. Réessayez dans une minute." }, { status: 429 });
      }
      const stored = await auth.admin
        .from("external_payment_connections")
        .select(
          "id,workshop_id,shop_id,provider,external_account_id,external_location_id,merchant_display_name,encrypted_access_token,encrypted_refresh_token,token_expires_at,connection_mode,encrypted_configuration,granted_scopes,connected_at,disconnected_at",
        )
        .eq("workshop_id", auth.workshopId)
        .eq("shop_id", shopId)
        .eq("provider", "mollie")
        .is("disconnected_at", null)
        .maybeSingle();
      if (stored.error || !stored.data) {
        return NextResponse.json({ error: "Connexion Mollie introuvable." }, { status: 404 });
      }
      const accessToken = await getValidMollieAccessToken(auth.admin, stored.data);
      const profiles = await listMollieProfiles(accessToken);
      if (profiles[0]?.id && profiles[0].id !== stored.data.external_location_id) {
        const updated = await auth.admin
          .from("external_payment_connections")
          .update({ external_location_id: profiles[0].id, updated_at: new Date().toISOString() })
          .eq("id", stored.data.id)
          .eq("workshop_id", auth.workshopId)
          .eq("shop_id", shopId)
          .eq("provider", "mollie");
        if (updated.error) throw new Error("Enregistrement du profil Mollie impossible.");
      }
      const onboardingUrl = await getMollieOnboardingUrl(accessToken);
      return NextResponse.json({ onboardingUrl, profileConfigured: Boolean(profiles[0]?.id) });
    }

    const { data: connection, error } = await auth.admin
      .from("external_payment_connections")
      .select("id,external_account_id,encrypted_refresh_token")
      .eq("workshop_id", auth.workshopId)
      .eq("shop_id", shopId)
      .eq("provider", parsed.data.provider)
      .is("disconnected_at", null)
      .maybeSingle();
    if (error || !connection) return NextResponse.json({ error: "Connexion introuvable." }, { status: 404 });
    const refreshToken =
      parsed.data.provider === "mollie" && connection.encrypted_refresh_token
        ? decryptPaymentToken(connection.encrypted_refresh_token)
        : undefined;
    await getExternalPaymentProvider(parsed.data.provider).disconnect(connection.external_account_id, refreshToken);
    const now = new Date().toISOString();
    const disconnected = await auth.admin
      .from("external_payment_connections")
      .update({
        disconnected_at: now,
        updated_at: now,
        encrypted_access_token: null,
        encrypted_refresh_token: null,
        token_expires_at: null,
        encrypted_configuration: null,
        is_default: false,
      })
      .eq("id", connection.id)
      .eq("workshop_id", auth.workshopId);
    if (disconnected.error) throw new Error("Deconnexion impossible.");
    if (parsed.data.provider === "revolut") {
      const disabled = await auth.admin
        .from("external_payment_readers")
        .update({ active: false })
        .eq("workshop_id", auth.workshopId)
        .eq("shop_id", shopId)
        .eq("provider", "revolut");
      if (disabled.error) throw new Error("Dissociation des terminaux Revolut impossible.");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation impossible.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

async function ensureShopHasDefault(
  admin: SupabaseClient,
  workshopId: string,
  shopId: string,
  provider: "paypal" | "revolut",
) {
  const current = await admin
    .from("external_payment_connections")
    .select("id")
    .eq("workshop_id", workshopId)
    .eq("shop_id", shopId)
    .eq("is_default", true)
    .is("disconnected_at", null)
    .limit(1)
    .maybeSingle();
  if (current.error || current.data) return;
  await admin
    .from("external_payment_connections")
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq("workshop_id", workshopId)
    .eq("shop_id", shopId)
    .eq("provider", provider)
    .is("disconnected_at", null);
}
