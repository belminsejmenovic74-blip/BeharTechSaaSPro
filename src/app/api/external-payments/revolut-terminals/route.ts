import { NextResponse } from "next/server";
import { z } from "zod";

import { decryptPaymentToken } from "@/lib/server/external-payments/crypto";
import { listRevolutLocations, listRevolutTerminals } from "@/lib/server/external-payments/revolut";
import {
  authorizeExternalPayments,
  consumeCreationRateLimit,
  resolveActiveShop,
} from "@/lib/server/external-payments/security";

export const dynamic = "force-dynamic";

const credentials = {
  workshopId: z.string().uuid(),
  licenseKey: z.string().trim().min(6).max(100),
  shopId: z.string().uuid().optional(),
};

// Revolut's documented sandbox terminal (11111111-0000-0000-0000-000000000000)
// is UUID-shaped but intentionally does not satisfy RFC version/variant bits.
const revolutResourceId = z.string().regex(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);

export const revolutTerminalSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("list"), ...credentials }).strict(),
  z.object({ operation: z.literal("discover"), ...credentials, locationId: revolutResourceId }).strict(),
  z
    .object({
      operation: z.literal("associate"),
      ...credentials,
      locationId: revolutResourceId,
      terminalId: revolutResourceId,
      terminalName: z.string().trim().min(1).max(80),
    })
    .strict(),
  z.object({ operation: z.literal("remove"), ...credentials, terminalId: revolutResourceId }).strict(),
]);

export async function POST(request: Request) {
  const parsed = revolutTerminalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Demande Revolut Terminal invalide." }, { status: 400 });
  const auth = await authorizeExternalPayments(
    parsed.data.workshopId,
    parsed.data.licenseKey,
    parsed.data.operation === "list" ? "use" : "manage",
  );
  if (auth instanceof Response) return auth;

  try {
    const shopId = await resolveActiveShop(auth.admin, auth.workshopId, parsed.data.shopId);
    const connection = await auth.admin
      .from("external_payment_connections")
      .select("encrypted_access_token")
      .eq("workshop_id", auth.workshopId)
      .eq("shop_id", shopId)
      .eq("provider", "revolut")
      .is("disconnected_at", null)
      .maybeSingle();
    if (connection.error || !connection.data?.encrypted_access_token) {
      return NextResponse.json({ error: "Connectez d’abord Revolut Business." }, { status: 409 });
    }
    const apiKey = decryptPaymentToken(connection.data.encrypted_access_token);
    const locations = await listRevolutLocations(apiKey);

    if (parsed.data.operation === "list") {
      const terminals = await auth.admin
        .from("external_payment_readers")
        .select("id,reader_id,reader_name,location_id,connected_at")
        .eq("workshop_id", auth.workshopId)
        .eq("shop_id", shopId)
        .eq("provider", "revolut")
        .eq("active", true)
        .order("connected_at", { ascending: true });
      if (terminals.error) throw new Error("Chargement des terminaux Revolut impossible.");
      return NextResponse.json({
        locations,
        terminals: (terminals.data || []).map((terminal) => ({
          id: terminal.id,
          terminal_id: terminal.reader_id,
          terminal_name: terminal.reader_name,
          location_id: terminal.location_id,
          connected_at: terminal.connected_at,
        })),
      });
    }

    if (!consumeCreationRateLimit(`${auth.workshopId}:revolut-terminal`)) {
      return NextResponse.json({ error: "Trop de demandes. Réessayez dans une minute." }, { status: 429 });
    }

    if (parsed.data.operation === "discover" || parsed.data.operation === "associate") {
      const locationId = parsed.data.locationId;
      if (!locations.some((location) => location.id === locationId)) {
        return NextResponse.json({ error: "Location Revolut invalide pour ce Merchant Account." }, { status: 400 });
      }
      const available = await listRevolutTerminals(apiKey, locationId);
      if (parsed.data.operation === "discover") return NextResponse.json({ terminals: available });

      const { terminalId, terminalName } = parsed.data;
      const selected = available.find((terminal) => terminal.id === terminalId);
      if (!selected) {
        return NextResponse.json({ error: "Terminal Revolut indisponible dans cette location." }, { status: 400 });
      }
      const saved = await auth.admin
        .from("external_payment_readers")
        .upsert(
          {
            workshop_id: auth.workshopId,
            shop_id: shopId,
            provider: "revolut",
            reader_id: selected.id,
            reader_name: terminalName,
            location_id: locationId,
            active: true,
          },
          { onConflict: "workshop_id,shop_id,provider,reader_id" },
        )
        .select("id,reader_id,reader_name,location_id,connected_at")
        .single();
      if (saved.error || !saved.data) throw new Error("Association du terminal Revolut impossible.");
      return NextResponse.json(
        {
          terminal: {
            id: saved.data.id,
            terminal_id: saved.data.reader_id,
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
      .eq("provider", "revolut")
      .eq("reader_id", parsed.data.terminalId)
      .eq("active", true)
      .maybeSingle();
    if (terminal.error || !terminal.data) {
      return NextResponse.json({ error: "Revolut Terminal introuvable." }, { status: 404 });
    }
    const removed = await auth.admin
      .from("external_payment_readers")
      .update({ active: false })
      .eq("id", terminal.data.id)
      .eq("workshop_id", auth.workshopId)
      .eq("shop_id", shopId)
      .eq("provider", "revolut");
    if (removed.error) throw new Error("Dissociation du terminal Revolut impossible.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Opération Revolut Terminal impossible.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
