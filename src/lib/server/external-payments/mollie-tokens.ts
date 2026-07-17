import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { decryptPaymentToken, encryptPaymentToken } from "./crypto";
import { providerJson, requireServerEnv } from "./http";
import type { ExternalPaymentConnectionRow } from "./types";

type MollieRefreshResponse = { access_token?: string; refresh_token?: string; expires_in?: number };

export async function getValidMollieAccessToken(admin: SupabaseClient, connection: ExternalPaymentConnectionRow) {
  if (!connection.encrypted_access_token) throw new Error("Connexion Mollie incomplète.");
  const expiresAt = connection.token_expires_at ? Date.parse(connection.token_expires_at) : 0;
  if (expiresAt > Date.now() + 5 * 60_000) return decryptPaymentToken(connection.encrypted_access_token);
  if (!connection.encrypted_refresh_token) throw new Error("Reconnectez Mollie.");

  const currentRefreshToken = decryptPaymentToken(connection.encrypted_refresh_token);
  const authorization = Buffer.from(
    `${requireServerEnv("MOLLIE_CLIENT_ID")}:${requireServerEnv("MOLLIE_CLIENT_SECRET")}`,
  ).toString("base64");
  const response = await fetch("https://api.mollie.com/oauth2/tokens", {
    method: "POST",
    headers: {
      authorization: `Basic ${authorization}`,
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: currentRefreshToken,
      redirect_uri: requireServerEnv("MOLLIE_REDIRECT_URI"),
    }),
    cache: "no-store",
  });
  const refreshed = await providerJson<MollieRefreshResponse>(response, "Renouvellement Mollie impossible.");
  if (!refreshed.access_token) throw new Error("Nouveau jeton Mollie absent.");
  const nextRefreshToken = refreshed.refresh_token || currentRefreshToken;
  const tokenExpiresAt = new Date(Date.now() + Math.max(0, refreshed.expires_in ?? 3600) * 1000).toISOString();
  const { error } = await admin
    .from("external_payment_connections")
    .update({
      encrypted_access_token: encryptPaymentToken(refreshed.access_token),
      encrypted_refresh_token: encryptPaymentToken(nextRefreshToken),
      token_expires_at: tokenExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id)
    .eq("workshop_id", connection.workshop_id)
    .eq("shop_id", connection.shop_id)
    .eq("provider", "mollie")
    .is("disconnected_at", null);
  if (error) throw new Error("Rotation du jeton Mollie non enregistrée.");
  return refreshed.access_token;
}
