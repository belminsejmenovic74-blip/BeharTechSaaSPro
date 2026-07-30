import "server-only";

import { createHash, randomBytes } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getCurrentAppSession } from "@/lib/auth/app-session";
import { requireBillingCapability } from "@/lib/server/capabilities";
import { authorizeWorkshopLicense } from "@/lib/server/workshop-license-auth";

import type { ExternalPaymentProviderName } from "./types";

const CREATE_WINDOW_MS = 60_000;
const CREATE_LIMIT = 5;
const createAttempts = new Map<string, number[]>();

export function stableExternalUuid(input: unknown): string {
  const hash = createHash("sha256")
    .update(String(input ?? "missing"))
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export function hashOAuthState(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}

export function newOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

export function consumeCreationRateLimit(workshopId: string): boolean {
  const now = Date.now();
  const active = (createAttempts.get(workshopId) ?? []).filter((timestamp) => now - timestamp < CREATE_WINDOW_MS);
  if (active.length >= CREATE_LIMIT) return false;
  active.push(now);
  createAttempts.set(workshopId, active);
  return true;
}

export async function authorizeExternalPayments(
  workshopId: string,
  licenseKey: string,
  permission: "use" | "manage" = "use",
) {
  const auth = await authorizeWorkshopLicense(workshopId, licenseKey);
  if (auth instanceof Response) return auth;
  const session = auth.session ?? (await getCurrentAppSession());
  if (!session || session.workshopId !== workshopId) {
    return Response.json({ error: "Session entreprise authentifiée requise." }, { status: 401 });
  }
  if (permission === "manage" && !["owner", "admin"].includes(session.role)) {
    return Response.json({ error: "Action reservee au gerant ou a un administrateur." }, { status: 403 });
  }
  if (!["owner", "admin", "technician", "member"].includes(session.role)) {
    return Response.json({ error: "Role entreprise non autorise." }, { status: 403 });
  }
  const capability = await requireBillingCapability(auth.admin, workshopId, session.licenseId);
  if (capability instanceof Response) return capability;
  return { ...auth, userId: session.userId };
}

export async function resolveActiveShop(admin: SupabaseClient, workshopId: string, requestedShopId?: string) {
  let query = admin.from("shops").select("id").eq("tenant_id", workshopId).eq("active", true);
  if (requestedShopId) query = query.eq("id", requestedShopId);
  const { data, error } = await query.order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (error || !data?.id) throw new Error("Boutique active introuvable.");
  return data.id as string;
}

export async function createOAuthState(input: {
  admin: SupabaseClient;
  workshopId: string;
  shopId: string;
  provider: ExternalPaymentProviderName;
  userId: string | null;
}) {
  const state = newOAuthState();
  const { error } = await input.admin.from("external_payment_oauth_states").insert({
    state_hash: hashOAuthState(state),
    workshop_id: input.workshopId,
    shop_id: input.shopId,
    provider: input.provider,
    created_by: input.userId,
    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  if (error) throw new Error("Initialisation OAuth impossible.");
  return state;
}

export async function consumeOAuthState(admin: SupabaseClient, provider: ExternalPaymentProviderName, state: string) {
  const now = new Date().toISOString();
  const stateHash = hashOAuthState(state);
  const { data, error } = await admin
    .from("external_payment_oauth_states")
    .select("id,workshop_id,shop_id,created_by,redirect_path,expires_at,consumed_at")
    .eq("state_hash", stateHash)
    .eq("provider", provider)
    .maybeSingle();
  if (error || !data || data.consumed_at || data.expires_at <= now) throw new Error("Etat OAuth invalide ou expire.");

  const consumed = await admin
    .from("external_payment_oauth_states")
    .update({ consumed_at: now })
    .eq("id", data.id)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();
  if (consumed.error || !consumed.data) throw new Error("Etat OAuth deja utilise.");
  return data as {
    id: string;
    workshop_id: string;
    shop_id: string;
    created_by: string | null;
    redirect_path: string;
  };
}
