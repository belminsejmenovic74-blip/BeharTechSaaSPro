import "server-only";

import { NextResponse } from "next/server";

export function externalPaymentReturnPage(
  provider: "Stripe" | "SumUp" | "PayPal" | "Square" | "Revolut Business" | "Mollie",
) {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Behar Tech Pro</title><style>body{margin:0;background:#FAFAF8;color:#1A1916;font:16px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.card{max-width:560px;margin:12vh auto;padding:32px;border:1px solid #E8E8E5;border-radius:20px;background:#fff;box-shadow:0 12px 40px rgba(26,25,22,.05)}h1{font-size:24px;margin:0 0 14px}p{color:#6B6B6B;line-height:1.6;margin:0}</style></head><body><main class="card"><h1>Vous pouvez fermer cette page.</h1><p>Le règlement est traité directement par ${provider}. Le réparateur peut le vérifier dans son espace ${provider}.</p></main></body></html>`;
  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
