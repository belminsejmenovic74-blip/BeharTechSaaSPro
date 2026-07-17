import { NextResponse } from "next/server";
import { z } from "zod";

import { getExternalPaymentProvider } from "@/lib/server/external-payments/providers";
import {
  authorizeExternalPayments,
  createOAuthState,
  resolveActiveShop,
} from "@/lib/server/external-payments/security";

export const dynamic = "force-dynamic";

const schema = z
  .object({
    workshopId: z.string().uuid(),
    licenseKey: z.string().trim().min(6).max(100),
    provider: z.enum(["stripe", "sumup", "paypal", "square", "mollie"]),
    shopId: z.string().uuid().optional(),
  })
  .strict();

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Demande invalide." }, { status: 400 });
  const auth = await authorizeExternalPayments(parsed.data.workshopId, parsed.data.licenseKey, "manage");
  if (auth instanceof Response) return auth;

  try {
    const shopId = await resolveActiveShop(auth.admin, auth.workshopId, parsed.data.shopId);
    const state = await createOAuthState({
      admin: auth.admin,
      workshopId: auth.workshopId,
      shopId,
      provider: parsed.data.provider,
      userId: auth.userId,
    });
    const authorizationUrl = await getExternalPaymentProvider(parsed.data.provider).getAuthorizationUrl(state);
    return NextResponse.json(
      { authorizationUrl: authorizationUrl.toString() },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connexion impossible.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
