import { NextResponse } from "next/server";
import { z } from "zod";

import {
  authorizeExternalPayments,
  consumeCreationRateLimit,
  resolveActiveShop,
} from "@/lib/server/external-payments/security";
import { listSquareLocations } from "@/lib/server/external-payments/square";
import { getValidSquareAccessToken } from "@/lib/server/external-payments/square-tokens";
import type { ExternalPaymentConnectionRow } from "@/lib/server/external-payments/types";

export const dynamic = "force-dynamic";

const credentials = {
  workshopId: z.string().uuid(),
  licenseKey: z.string().trim().min(6).max(100),
  shopId: z.string().uuid().optional(),
};

export const squareTerminalSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("list"), ...credentials }).strict(),
  z
    .object({
      operation: z.literal("associate"),
      ...credentials,
      deviceId: z
        .string()
        .trim()
        .regex(/^(?:device:)?[A-Za-z0-9_-]{6,128}$/),
      locationId: z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9_-]{3,64}$/),
      terminalName: z.string().trim().min(1).max(80),
    })
    .strict(),
  z
    .object({
      operation: z.literal("remove"),
      ...credentials,
      deviceId: z
        .string()
        .trim()
        .regex(/^(?:device:)?[A-Za-z0-9_-]{6,128}$/),
    })
    .strict(),
]);

export async function POST(request: Request) {
  const parsed = squareTerminalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Demande Square Terminal invalide." }, { status: 400 });
  const auth = await authorizeExternalPayments(
    parsed.data.workshopId,
    parsed.data.licenseKey,
    parsed.data.operation === "list" ? "use" : "manage",
  );
  if (auth instanceof Response) return auth;

  try {
    const shopId = await resolveActiveShop(auth.admin, auth.workshopId, parsed.data.shopId);
    const connectionResult = await auth.admin
      .from("external_payment_connections")
      .select(
        "id,workshop_id,shop_id,provider,external_account_id,external_location_id,merchant_display_name,encrypted_access_token,encrypted_refresh_token,token_expires_at,connection_mode,encrypted_configuration,granted_scopes,connected_at,disconnected_at",
      )
      .eq("workshop_id", auth.workshopId)
      .eq("shop_id", shopId)
      .eq("provider", "square")
      .is("disconnected_at", null)
      .maybeSingle();
    if (connectionResult.error || !connectionResult.data) {
      return NextResponse.json({ error: "Connectez d’abord Square." }, { status: 409 });
    }
    const connection = connectionResult.data as ExternalPaymentConnectionRow;
    const accessToken = await getValidSquareAccessToken(auth.admin, connection);
    const locations = await listSquareLocations(accessToken);

    if (parsed.data.operation === "list") {
      const terminals = await auth.admin
        .from("external_payment_readers")
        .select("id,reader_id,reader_name,location_id,connected_at")
        .eq("workshop_id", auth.workshopId)
        .eq("shop_id", shopId)
        .eq("provider", "square")
        .eq("active", true)
        .order("connected_at", { ascending: true });
      if (terminals.error) throw new Error("Chargement des Square Terminal impossible.");
      return NextResponse.json({
        locations,
        terminals: (terminals.data || []).map((terminal) => ({
          id: terminal.id,
          device_id: terminal.reader_id,
          terminal_name: terminal.reader_name,
          location_id: terminal.location_id,
          connected_at: terminal.connected_at,
        })),
      });
    }

    if (!consumeCreationRateLimit(`${auth.workshopId}:square-terminal`)) {
      return NextResponse.json({ error: "Trop de demandes. Réessayez dans une minute." }, { status: 429 });
    }

    if (parsed.data.operation === "associate") {
      const { deviceId, locationId, terminalName } = parsed.data;
      if (!locations.some((location) => location.id === locationId)) {
        return NextResponse.json({ error: "Établissement Square invalide pour ce compte." }, { status: 400 });
      }
      const saved = await auth.admin
        .from("external_payment_readers")
        .upsert(
          {
            workshop_id: auth.workshopId,
            shop_id: shopId,
            provider: "square",
            reader_id: deviceId,
            reader_name: terminalName,
            location_id: locationId,
            active: true,
          },
          { onConflict: "workshop_id,shop_id,provider,reader_id" },
        )
        .select("id,reader_id,reader_name,location_id,connected_at")
        .single();
      if (saved.error || !saved.data) throw new Error("Association du Square Terminal impossible.");
      return NextResponse.json(
        {
          terminal: {
            id: saved.data.id,
            device_id: saved.data.reader_id,
            terminal_name: saved.data.reader_name,
            location_id: saved.data.location_id,
            connected_at: saved.data.connected_at,
          },
        },
        { status: 201 },
      );
    }

    const terminal = await auth.admin
      .from("external_payment_readers")
      .select("id")
      .eq("workshop_id", auth.workshopId)
      .eq("shop_id", shopId)
      .eq("provider", "square")
      .eq("reader_id", parsed.data.deviceId)
      .eq("active", true)
      .maybeSingle();
    if (terminal.error || !terminal.data)
      return NextResponse.json({ error: "Square Terminal introuvable." }, { status: 404 });
    const removed = await auth.admin
      .from("external_payment_readers")
      .update({ active: false })
      .eq("id", terminal.data.id)
      .eq("workshop_id", auth.workshopId)
      .eq("shop_id", shopId)
      .eq("provider", "square");
    if (removed.error) throw new Error("Dissociation du Square Terminal impossible.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Opération Square Terminal impossible.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
