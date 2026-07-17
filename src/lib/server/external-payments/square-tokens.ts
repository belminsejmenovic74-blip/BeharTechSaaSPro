import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { decryptPaymentToken, encryptPaymentToken } from "./crypto";
import { providerJson, requireServerEnv } from "./http";
import { SQUARE_API_VERSION, squareApiBase } from "./square";
import type { ExternalPaymentConnectionRow } from "./types";

type RefreshResponse = { access_token?: string; refresh_token?: string; expires_at?: string };

const REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export async function getValidSquareAccessToken(admin: SupabaseClient, connection: ExternalPaymentConnectionRow) {
  if (!connection.encrypted_access_token) throw new Error("Connexion Square incomplète.");
  const expiresAt = connection.token_expires_at ? Date.parse(connection.token_expires_at) : 0;
  if (expiresAt > Date.now() + REFRESH_WINDOW_MS) return decryptPaymentToken(connection.encrypted_access_token);
  if (!connection.encrypted_refresh_token) throw new Error("Reconnectez Square.");

  const currentRefreshToken = decryptPaymentToken(connection.encrypted_refresh_token);
  const response = await fetch(`${squareApiBase()}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/json", "square-version": SQUARE_API_VERSION },
    body: JSON.stringify({
      client_id: requireServerEnv("SQUARE_APPLICATION_ID"),
      client_secret: requireServerEnv("SQUARE_APPLICATION_SECRET"),
      grant_type: "refresh_token",
      refresh_token: currentRefreshToken,
      redirect_uri: requireServerEnv("SQUARE_REDIRECT_URI"),
    }),
    cache: "no-store",
  });
  const refreshed = await providerJson<RefreshResponse>(response, "Renouvellement Square impossible.");
  if (!refreshed.access_token || !refreshed.expires_at) throw new Error("Nouveau jeton Square absent.");
  const nextRefreshToken = refreshed.refresh_token || currentRefreshToken;
  const { error } = await admin
    .from("external_payment_connections")
    .update({
      encrypted_access_token: encryptPaymentToken(refreshed.access_token),
      encrypted_refresh_token: encryptPaymentToken(nextRefreshToken),
      token_expires_at: refreshed.expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id)
    .eq("workshop_id", connection.workshop_id)
    .eq("provider", "square")
    .is("disconnected_at", null);
  if (error) throw new Error("Rotation du jeton Square non enregistrée.");
  return refreshed.access_token;
}
