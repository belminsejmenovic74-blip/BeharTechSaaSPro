import { externalPaymentReturnPage } from "@/lib/server/external-payments/return-page";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const rawProvider = new URL(request.url).searchParams.get("provider");
  const provider =
    rawProvider === "sumup"
      ? "SumUp"
      : rawProvider === "paypal"
        ? "PayPal"
        : rawProvider === "square"
          ? "Square"
          : rawProvider === "revolut"
            ? "Revolut Business"
            : rawProvider === "mollie"
              ? "Mollie"
              : "Stripe";
  return externalPaymentReturnPage(provider);
}
