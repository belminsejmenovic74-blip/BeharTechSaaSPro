import { NextResponse } from "next/server";
import { z } from "zod";

import { decryptPaymentToken } from "@/lib/server/external-payments/crypto";
import { getExternalPaymentProvider } from "@/lib/server/external-payments/providers";
import { getValidMollieAccessToken } from "@/lib/server/external-payments/mollie-tokens";
import {
  authorizeExternalPayments,
  consumeCreationRateLimit,
  resolveActiveShop,
  stableExternalUuid,
} from "@/lib/server/external-payments/security";
import { getValidSumUpAccessToken } from "@/lib/server/external-payments/sumup-tokens";
import { getValidSquareAccessToken } from "@/lib/server/external-payments/square-tokens";
import type { CreatedExternalRequest, ExternalPaymentConnectionRow } from "@/lib/server/external-payments/types";

export const dynamic = "force-dynamic";

export const externalPaymentRequestSchema = z
  .object({
    workshopId: z.string().uuid(),
    licenseKey: z.string().trim().min(6).max(100),
    invoiceId: z.string().min(1).max(160),
    provider: z.enum(["stripe", "sumup", "paypal", "square", "revolut", "mollie"]),
    shopId: z.string().uuid().optional(),
    deliveryChannel: z.enum(["link", "terminal"]).default("link"),
    readerId: z.string().trim().min(6).max(128).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.deliveryChannel === "terminal" &&
      (!["sumup", "square", "revolut"].includes(value.provider) || !value.readerId)
    ) {
      ctx.addIssue({ code: "custom", message: "Terminal externe invalide." });
    }
  });

export async function POST(request: Request) {
  const parsed = externalPaymentRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Demande invalide. Aucun montant libre n'est accepte." }, { status: 400 });
  const auth = await authorizeExternalPayments(parsed.data.workshopId, parsed.data.licenseKey);
  if (auth instanceof Response) return auth;
  if (!consumeCreationRateLimit(auth.workshopId)) {
    return NextResponse.json({ error: "Trop de demandes. Reessayez dans une minute." }, { status: 429 });
  }

  try {
    const shopId = await resolveActiveShop(auth.admin, auth.workshopId, parsed.data.shopId);
    const normalizedInvoiceId = stableExternalUuid(`invoice:${auth.workshopId}:${parsed.data.invoiceId}`);
    const { data: invoice, error: invoiceError } = await auth.admin
      .from("invoices")
      .select("id,workshop_id,shop_id,repair_id,invoice_number,status,total_ttc")
      .eq("id", normalizedInvoiceId)
      .eq("workshop_id", auth.workshopId)
      .eq("shop_id", shopId)
      .maybeSingle();
    if (invoiceError || !invoice)
      return NextResponse.json({ error: "Facture introuvable ou pas encore synchronisee." }, { status: 404 });
    if (["draft", "cancelled"].includes(invoice.status) || !(Number(invoice.total_ttc) > 0)) {
      return NextResponse.json({ error: "La facture doit etre finalisee avec un total TTC positif." }, { status: 409 });
    }

    const { data: connection, error: connectionError } = await auth.admin
      .from("external_payment_connections")
      .select(
        "id,workshop_id,shop_id,provider,external_account_id,external_location_id,merchant_display_name,encrypted_access_token,encrypted_refresh_token,token_expires_at,connection_mode,encrypted_configuration,granted_scopes,connected_at,disconnected_at",
      )
      .eq("workshop_id", auth.workshopId)
      .eq("shop_id", shopId)
      .eq("provider", parsed.data.provider)
      .is("disconnected_at", null)
      .maybeSingle();
    if (connectionError || !connection)
      return NextResponse.json({ error: "Connectez d'abord ce fournisseur." }, { status: 409 });

    const requestId = stableExternalUuid(
      `external-payment:${auth.workshopId}:${shopId}:${invoice.id}:${parsed.data.provider}:${parsed.data.deliveryChannel}`,
    );
    const existing = await auth.admin
      .from("external_payment_requests")
      .select("id,provider_request_id,hosted_url,created_at")
      .eq("id", requestId)
      .eq("workshop_id", auth.workshopId)
      .maybeSingle();
    if (existing.data && (existing.data.hosted_url || existing.data.provider_request_id)) {
      return NextResponse.json({
        request: {
          ...existing.data,
          delivery_channel: parsed.data.deliveryChannel,
          technical_state: "sent",
        },
        reused: true,
      });
    }

    const currencyRow = await auth.admin
      .from("shops")
      .select("currency")
      .eq("tenant_id", auth.workshopId)
      .eq("id", shopId)
      .single();
    const currency = currencyRow.data?.currency === "CHF" ? "CHF" : "EUR";
    const typedConnection = connection as ExternalPaymentConnectionRow;
    const accessToken =
      parsed.data.provider === "sumup"
        ? await getValidSumUpAccessToken(auth.admin, typedConnection)
        : parsed.data.provider === "square"
          ? await getValidSquareAccessToken(auth.admin, typedConnection)
          : parsed.data.provider === "mollie"
            ? await getValidMollieAccessToken(auth.admin, typedConnection)
            : parsed.data.provider === "revolut" && typedConnection.encrypted_access_token
              ? decryptPaymentToken(typedConnection.encrypted_access_token)
              : undefined;
    const manualPaymentUrl =
      parsed.data.provider === "paypal" &&
      typedConnection.connection_mode === "manual" &&
      typedConnection.encrypted_configuration
        ? decryptPaymentToken(typedConnection.encrypted_configuration)
        : undefined;

    let externalLocationId = typedConnection.external_location_id || undefined;
    if (parsed.data.deliveryChannel === "terminal") {
      const reader = await auth.admin
        .from("external_payment_readers")
        .select("reader_id,location_id")
        .eq("workshop_id", auth.workshopId)
        .eq("shop_id", shopId)
        .eq("provider", parsed.data.provider)
        .eq("reader_id", parsed.data.readerId as string)
        .eq("active", true)
        .maybeSingle();
      if (reader.error || !reader.data)
        return NextResponse.json({ error: "Terminal introuvable pour cette boutique." }, { status: 404 });
      externalLocationId = reader.data.location_id || externalLocationId;
    }

    const baseRow = {
      id: requestId,
      workshop_id: auth.workshopId,
      shop_id: shopId,
      invoice_id: invoice.id,
      provider: parsed.data.provider,
    };

    // Failed transmissions are deliberately not persisted. The provider
    // remains the sole source of truth for payment execution and results.
    const created: CreatedExternalRequest = await getExternalPaymentProvider(
      parsed.data.provider,
    ).createExternalRequest({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      amount: Number(invoice.total_ttc),
      currency,
      externalAccountId: connection.external_account_id,
      externalLocationId,
      accessToken,
      readerId: parsed.data.readerId,
      connectionMode: typedConnection.connection_mode,
      manualPaymentUrl,
      requestId,
    });

    const row = {
      ...baseRow,
      provider_request_id: created.providerRequestId || null,
      hosted_url: created.hostedUrl || null,
    };
    const inserted = existing.data
      ? await auth.admin
          .from("external_payment_requests")
          .update(row)
          .eq("id", requestId)
          .eq("workshop_id", auth.workshopId)
          .select("id,provider_request_id,hosted_url,created_at")
          .single()
      : await auth.admin
          .from("external_payment_requests")
          .insert(row)
          .select("id,provider_request_id,hosted_url,created_at")
          .single();
    if (inserted.error || !inserted.data) throw new Error("Enregistrement technique de la demande impossible.");
    return NextResponse.json(
      {
        request: {
          ...inserted.data,
          delivery_channel: parsed.data.deliveryChannel,
          technical_state: created.technicalState,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Creation impossible.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
