import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { decryptPaymentToken, encryptPaymentToken } from "./crypto";
import { providerJson, requireServerEnv } from "./http";
import type { ExternalPaymentConnectionRow } from "./types";

type RefreshResponse = { access_token?: string; refresh_token?: string; expires_in?: number };

export async function getValidSumUpAccessToken(admin: SupabaseClient, connection: ExternalPaymentConnectionRow) {
  if (!connection.encrypted_access_token) throw new Error("Connexion SumUp incomplete.");
  const expiresAt = connection.token_expires_at ? Date.parse(connection.token_expires_at) : 0;
  if (expiresAt > Date.now() + 60_000) return decryptPaymentToken(connection.encrypted_access_token);
  if (!connection.encrypted_refresh_token) throw new Error("Reconnectez SumUp.");

  const currentRefreshToken = decryptPaymentToken(connection.encrypted_refresh_token);
  const response = await fetch("https://api.sumup.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: currentRefreshToken,
      client_id: requireServerEnv("SUMUP_CLIENT_ID"),
      client_secret: requireServerEnv("SUMUP_CLIENT_SECRET"),
    }),
    cache: "no-store",
  });
  const refreshed = await providerJson<RefreshResponse>(response, "Renouvellement SumUp impossible.");
  if (!refreshed.access_token) throw new Error("Nouveau jeton SumUp absent.");
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
    .is("disconnected_at", null);
  if (error) throw new Error("Rotation du jeton SumUp non enregistree.");
  return refreshed.access_token;
}
