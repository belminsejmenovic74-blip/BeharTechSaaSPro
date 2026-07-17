import { NextResponse } from "next/server";
import { z } from "zod";

import {
  authorizeExternalPayments,
  consumeCreationRateLimit,
  resolveActiveShop,
} from "@/lib/server/external-payments/security";
import { isSumUpTerminalDispatchEnabled } from "@/lib/server/external-payments/sumup";
import { pairSumUpReader, unpairSumUpReader } from "@/lib/server/external-payments/sumup-readers";
import { getValidSumUpAccessToken } from "@/lib/server/external-payments/sumup-tokens";
import type { ExternalPaymentConnectionRow } from "@/lib/server/external-payments/types";

export const dynamic = "force-dynamic";

const credentials = {
  workshopId: z.string().uuid(),
  licenseKey: z.string().trim().min(6).max(100),
  shopId: z.string().uuid().optional(),
};

export const externalPaymentReaderSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("list"), ...credentials }).strict(),
  z
    .object({
      operation: z.literal("pair"),
      ...credentials,
      pairingCode: z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9]{8,9}$/),
      readerName: z.string().trim().min(1).max(80),
    })
    .strict(),
  z
    .object({
      operation: z.literal("remove"),
      ...credentials,
      readerId: z.string().regex(/^rdr_[A-Za-z0-9]{26}$/),
    })
    .strict(),
]);

export async function POST(request: Request) {
  const parsed = externalPaymentReaderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Demande terminal invalide." }, { status: 400 });
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
      .eq("provider", "sumup")
      .is("disconnected_at", null)
      .maybeSingle();
    if (connectionResult.error || !connectionResult.data) {
      return NextResponse.json({ error: "Connectez d’abord SumUp." }, { status: 409 });
    }

    if (parsed.data.operation === "list") {
      const readers = await auth.admin
        .from("external_payment_readers")
        .select("id,reader_id,reader_name,connected_at")
        .eq("workshop_id", auth.workshopId)
        .eq("shop_id", shopId)
        .eq("provider", "sumup")
        .eq("active", true)
        .order("connected_at", { ascending: true });
      if (readers.error) throw new Error("Chargement des terminaux impossible.");
      return NextResponse.json({
        readers: readers.data || [],
        terminalDispatchEnabled: isSumUpTerminalDispatchEnabled(),
      });
    }

    if (!isSumUpTerminalDispatchEnabled()) {
      return NextResponse.json({ error: "Envoi terminal SumUp désactivé dans cet environnement." }, { status: 409 });
    }
    if (!consumeCreationRateLimit(`${auth.workshopId}:sumup-reader`)) {
      return NextResponse.json({ error: "Trop de demandes. Réessayez dans une minute." }, { status: 429 });
    }

    const connection = connectionResult.data as ExternalPaymentConnectionRow;
    const accessToken = await getValidSumUpAccessToken(auth.admin, connection);

    if (parsed.data.operation === "pair") {
      const paired = await pairSumUpReader({
        accessToken,
        merchantCode: connection.external_account_id,
        pairingCode: parsed.data.pairingCode,
        readerName: parsed.data.readerName,
      });
      const saved = await auth.admin
        .from("external_payment_readers")
        .upsert(
          {
            workshop_id: auth.workshopId,
            shop_id: shopId,
            provider: "sumup",
            reader_id: paired.readerId,
            reader_name: paired.readerName,
            location_id: null,
            active: true,
          },
          { onConflict: "workshop_id,shop_id,provider,reader_id" },
        )
        .select("id,reader_id,reader_name,connected_at")
        .single();
      if (saved.error || !saved.data) throw new Error("Enregistrement du terminal impossible.");
      return NextResponse.json({ reader: saved.data }, { status: 201 });
    }

    const reader = await auth.admin
      .from("external_payment_readers")
      .select("id,reader_id")
      .eq("workshop_id", auth.workshopId)
      .eq("shop_id", shopId)
      .eq("provider", "sumup")
      .eq("reader_id", parsed.data.readerId)
      .eq("active", true)
      .maybeSingle();
    if (reader.error || !reader.data) return NextResponse.json({ error: "Terminal introuvable." }, { status: 404 });
    await unpairSumUpReader({
      accessToken,
      merchantCode: connection.external_account_id,
      readerId: reader.data.reader_id,
    });
    const removed = await auth.admin
      .from("external_payment_readers")
      .update({ active: false })
      .eq("id", reader.data.id)
      .eq("workshop_id", auth.workshopId)
      .eq("shop_id", shopId)
      .eq("provider", "sumup");
    if (removed.error) throw new Error("Suppression locale du terminal impossible.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Opération terminal impossible.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
