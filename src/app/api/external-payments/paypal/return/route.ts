import { z } from "zod";

import { verifyExternalReturnState } from "@/lib/server/external-payments/crypto";
import { capturePayPalOrder } from "@/lib/server/external-payments/paypal";
import { externalPaymentReturnPage } from "@/lib/server/external-payments/return-page";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const returnSchema = z.object({
  state: z.string().min(40).max(256),
  token: z
    .string()
    .regex(/^[A-Za-z0-9_-]{6,80}$/)
    .optional(),
  cancel: z.literal("1").optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = returnSchema.safeParse({
    state: url.searchParams.get("state") || "",
    token: url.searchParams.get("token") || undefined,
    cancel: url.searchParams.get("cancel") || undefined,
  });
  if (!parsed.success || parsed.data.cancel) return externalPaymentReturnPage("PayPal");

  try {
    const requestId = verifyExternalReturnState(parsed.data.state);
    const admin = getSupabaseAdmin();
    if (!requestId || !admin || !parsed.data.token) return externalPaymentReturnPage("PayPal");

    const paymentRequest = await admin
      .from("external_payment_requests")
      .select("id,workshop_id,shop_id,provider_request_id")
      .eq("id", requestId)
      .eq("provider", "paypal")
      .eq("provider_request_id", parsed.data.token)
      .maybeSingle();
    if (paymentRequest.error || !paymentRequest.data) return externalPaymentReturnPage("PayPal");

    const connection = await admin
      .from("external_payment_connections")
      .select("external_account_id")
      .eq("workshop_id", paymentRequest.data.workshop_id)
      .eq("shop_id", paymentRequest.data.shop_id)
      .eq("provider", "paypal")
      .eq("connection_mode", "commerce")
      .is("disconnected_at", null)
      .maybeSingle();
    if (!connection.error && connection.data?.external_account_id) {
      await capturePayPalOrder({
        orderId: parsed.data.token,
        merchantId: connection.data.external_account_id,
        requestId,
      });
    }
  } catch {
    // Réponse volontairement générique : aucun détail PayPal ou financier ne
    // doit être exposé, journalisé ou persisté sur ce retour public.
  }
  return externalPaymentReturnPage("PayPal");
}
