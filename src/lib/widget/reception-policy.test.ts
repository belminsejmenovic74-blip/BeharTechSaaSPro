import { describe, expect, it } from "vitest";

import {
  applyCustomerReceptionPolicy,
  defaultServiceSelection,
  isHomeServiceOnly,
  isServiceModeAllowed,
} from "./reception-policy";

describe("widget reception policy", () => {
  const configurableModes = {
    booking: true,
    walkIn: true,
    homeService: false,
    quoteRequest: true,
    callbackRequest: true,
  };

  it("verrouille le mode déplacement uniquement", () => {
    const features = applyCustomerReceptionPolicy(configurableModes, "mobile");

    expect(features).toMatchObject({
      booking: false,
      walkIn: false,
      homeService: true,
      quoteRequest: false,
      callbackRequest: false,
    });
    expect(isHomeServiceOnly(features)).toBe(true);
    expect(defaultServiceSelection(features)).toEqual({ requestType: "request", serviceMode: "home_service" });
  });

  it("limite le mode hybride aux deux parcours métier", () => {
    const features = applyCustomerReceptionPolicy(configurableModes, "hybrid");

    expect(features).toMatchObject({
      booking: true,
      walkIn: false,
      homeService: true,
      quoteRequest: false,
      callbackRequest: false,
    });
    expect(isServiceModeAllowed(features, "appointment")).toBe(true);
    expect(isServiceModeAllowed(features, "home_service")).toBe(true);
    expect(isServiceModeAllowed(features, "walk_in")).toBe(false);
  });

  it("limite le mode boutique au rendez-vous sur place", () => {
    const features = applyCustomerReceptionPolicy(configurableModes, "shop");

    expect(features).toMatchObject({
      booking: true,
      walkIn: false,
      homeService: false,
      quoteRequest: false,
      callbackRequest: false,
    });
    expect(defaultServiceSelection(features)).toEqual({ requestType: "appointment", serviceMode: "appointment" });
  });
});
