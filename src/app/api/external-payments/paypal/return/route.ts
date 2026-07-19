import { z } from "zod";

import { externalPaymentReturnPage } from "@/lib/server/external-payments/return-page";

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

  // Le retour ne capture, ne relit et ne persiste aucun résultat financier.
  // L'utilisateur consulte le résultat directement dans PayPal.
  return externalPaymentReturnPage("PayPal");
}
