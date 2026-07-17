import "server-only";

import { MollieConnectProvider } from "./mollie";
import { PayPalProvider } from "./paypal";
import { RevolutBusinessProvider } from "./revolut";
import { SquareProvider } from "./square";
import { StripeConnectProvider } from "./stripe";
import { SumUpProvider } from "./sumup";
import type { ExternalPaymentProviderName, ExternalPaymentRequestProvider } from "./types";

export function getExternalPaymentProvider(provider: ExternalPaymentProviderName): ExternalPaymentRequestProvider {
  if (provider === "stripe") return new StripeConnectProvider();
  if (provider === "sumup") return new SumUpProvider();
  if (provider === "paypal") return new PayPalProvider();
  if (provider === "square") return new SquareProvider();
  if (provider === "revolut") return new RevolutBusinessProvider();
  return new MollieConnectProvider();
}
