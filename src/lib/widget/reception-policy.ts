import type { WidgetFeatures } from "@/lib/widget/public-types";

export type CustomerReceptionMode = "shop" | "mobile" | "hybrid";

type ServiceSelection = {
  requestType: "appointment" | "callback" | "quote" | "request";
  serviceMode: "appointment" | "walk_in" | "home_service" | "request";
};

/**
 * Applique les choix structurants de l'atelier aux actions proposées dans le
 * widget. En mode mobile, le déplacement est la seule prise en charge valide :
 * les autres actions ne doivent pas pouvoir être réactivées depuis le CMS.
 */
export function applyCustomerReceptionPolicy<T extends WidgetFeatures>(features: T, mode: CustomerReceptionMode): T {
  if (mode === "mobile") {
    return {
      ...features,
      booking: false,
      walkIn: false,
      homeService: true,
      quoteRequest: false,
      callbackRequest: false,
    };
  }
  if (mode === "hybrid") {
    return {
      ...features,
      booking: true,
      walkIn: false,
      homeService: true,
      quoteRequest: false,
      callbackRequest: false,
    };
  }
  return {
    ...features,
    booking: true,
    walkIn: false,
    homeService: false,
    quoteRequest: false,
    callbackRequest: false,
  };
}

export function isServiceModeAllowed(features: WidgetFeatures, serviceMode: ServiceSelection["serviceMode"]): boolean {
  if (serviceMode === "appointment") return Boolean(features.booking);
  if (serviceMode === "walk_in") return Boolean(features.walkIn);
  if (serviceMode === "home_service") return Boolean(features.homeService);
  return Boolean(features.quoteRequest || features.callbackRequest);
}

export function isHomeServiceOnly(features: WidgetFeatures): boolean {
  return Boolean(
    features.homeService &&
      !features.booking &&
      !features.walkIn &&
      !features.quoteRequest &&
      !features.callbackRequest,
  );
}

export function defaultServiceSelection(features: WidgetFeatures): ServiceSelection {
  if (features.booking) return { requestType: "appointment", serviceMode: "appointment" };
  if (features.walkIn) return { requestType: "request", serviceMode: "walk_in" };
  if (features.homeService) return { requestType: "request", serviceMode: "home_service" };
  if (features.quoteRequest) return { requestType: "quote", serviceMode: "request" };
  return { requestType: "callback", serviceMode: "request" };
}
