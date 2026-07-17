import { NextResponse } from "next/server";
import { z } from "zod";

import { encryptPaymentToken } from "@/lib/server/external-payments/crypto";
import { getExternalPaymentProvider } from "@/lib/server/external-payments/providers";
import { consumeOAuthState } from "@/lib/server/external-payments/security";
import type { ExternalPaymentProviderName } from "@/lib/server/external-payments/types";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const callbackSchema = z.object({ code: z.string().min(4).max(4096), state: z.string().min(32).max(256) });
const paypalCallbackSchema = z.object({
  merchantId: z.string().min(32).max(256),
  merchantIdInPayPal: z.string().regex(/^[A-Za-z0-9]{6,64}$/),
  permissionsGranted: z.literal("true"),
  accountStatus: z.literal("BUSINESS_ACCOUNT"),
});

function settingsRedirect(request: Request, status: "connected" | "error", provider: string) {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    new URL(request.url).origin
  ).replace(/\/$/, "");
  const url = new URL("/client", base);
  url.searchParams.set("section", "paiements");
  url.searchParams.set("connected", status === "connected" ? "1" : "0");
  url.searchParams.set("provider", provider);
  return NextResponse.redirect(url);
}

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider: rawProvider } = await context.params;
  if (
    rawProvider !== "stripe" &&
    rawProvider !== "sumup" &&
    rawProvider !== "paypal" &&
    rawProvider !== "square" &&
    rawProvider !== "mollie"
  )
    return settingsRedirect(request, "error", rawProvider);
  const provider = rawProvider as ExternalPaymentProviderName;
  const query = Object.fromEntries(new URL(request.url).searchParams);
  const admin = getSupabaseAdmin();
  if (!admin) return settingsRedirect(request, "error", provider);

  let callbackState: string;
  let callbackCode: string;
  if (provider === "paypal") {
    const parsed = paypalCallbackSchema.safeParse(query);
    if (!parsed.success) return settingsRedirect(request, "error", provider);
    callbackState = parsed.data.merchantId;
    callbackCode = parsed.data.merchantIdInPayPal;
  } else {
    const parsed = callbackSchema.safeParse(query);
    if (!parsed.success) return settingsRedirect(request, "error", provider);
    callbackState = parsed.data.state;
    callbackCode = parsed.data.code;
  }

  try {
    // Le nonce est consomme atomiquement avant l'echange du code : il est a
    // usage unique meme si le fournisseur ou la base repond ensuite en erreur.
    const state = await consumeOAuthState(admin, provider, callbackState);
    const result = await getExternalPaymentProvider(provider).handleOAuthCallback(callbackCode);
    const now = new Date().toISOString();

    const active = await admin
      .from("external_payment_connections")
      .select("id,is_default")
      .eq("workshop_id", state.workshop_id)
      .eq("shop_id", state.shop_id)
      .eq("provider", provider)
      .is("disconnected_at", null)
      .maybeSingle();

    const values = {
      workshop_id: state.workshop_id,
      shop_id: state.shop_id,
      provider,
      external_account_id: result.externalAccountId,
      external_location_id: result.externalLocationId || null,
      merchant_display_name: result.merchantDisplayName || null,
      encrypted_access_token: result.accessToken ? encryptPaymentToken(result.accessToken) : null,
      encrypted_refresh_token: result.refreshToken ? encryptPaymentToken(result.refreshToken) : null,
      token_expires_at: result.expiresAt || null,
      connection_mode: provider === "paypal" ? "commerce" : "oauth",
      encrypted_configuration: null,
      granted_scopes: result.grantedScopes,
      connected_at: now,
      created_by: state.created_by,
      disconnected_at: null,
      updated_at: now,
      is_default: active.data?.is_default ?? false,
    };
    const query = active.data?.id
      ? admin.from("external_payment_connections").update(values).eq("id", active.data.id)
      : admin.from("external_payment_connections").insert(values);
    const { error } = await query;
    if (error) throw new Error("Enregistrement de la connexion impossible.");
    const currentDefault = await admin
      .from("external_payment_connections")
      .select("id")
      .eq("workshop_id", state.workshop_id)
      .eq("shop_id", state.shop_id)
      .eq("is_default", true)
      .is("disconnected_at", null)
      .limit(1)
      .maybeSingle();
    if (!currentDefault.error && !currentDefault.data) {
      await admin
        .from("external_payment_connections")
        .update({ is_default: true, updated_at: now })
        .eq("workshop_id", state.workshop_id)
        .eq("shop_id", state.shop_id)
        .eq("provider", provider)
        .is("disconnected_at", null);
    }
    return settingsRedirect(request, "connected", provider);
  } catch {
    return settingsRedirect(request, "error", provider);
  }
}
