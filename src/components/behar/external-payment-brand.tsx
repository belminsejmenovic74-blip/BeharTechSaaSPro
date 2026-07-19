export type ExternalPaymentBrandName = "stripe" | "sumup" | "paypal" | "square" | "revolut" | "mollie";

const LABELS: Record<ExternalPaymentBrandName, string> = {
  stripe: "Stripe",
  sumup: "SumUp",
  paypal: "PayPal",
  square: "Square",
  revolut: "Revolut",
  mollie: "Mollie",
};

export function ExternalPaymentBrand({
  provider,
  compact = false,
}: Readonly<{ provider: ExternalPaymentBrandName; compact?: boolean }>) {
  const source =
    provider === "stripe"
      ? "/assets/payments/stripe.svg"
      : provider === "sumup"
        ? "/assets/payments/sumup.svg"
        : provider === "mollie"
          ? null
          : `/assets/payments/${provider}.svg`;
  return (
    <span className="flex min-h-8 items-center gap-2.5">
      {source ? (
        // biome-ignore lint/performance/noImgElement: logos de marque locaux, dimensions fixes.
        <img
          alt=""
          className={`${compact ? "max-h-7 max-w-[82px]" : "max-h-9 max-w-[118px]"} w-auto object-contain`}
          src={source}
        />
      ) : (
        <span className={`${compact ? "text-[19px]" : "text-[25px]"} font-black text-[#111] tracking-[-0.07em]`}>
          mollie
        </span>
      )}
      {provider !== "stripe" && provider !== "sumup" && provider !== "mollie" ? (
        <span className={`${compact ? "text-sm" : "text-lg"} font-semibold text-[#101828]`}>{LABELS[provider]}</span>
      ) : null}
    </span>
  );
}

export function externalPaymentBrandLabel(provider: ExternalPaymentBrandName) {
  return LABELS[provider];
}
