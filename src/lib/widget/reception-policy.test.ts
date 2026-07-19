import { describe, expect, it } from "vitest";

import { applyCustomerReceptionPolicy, defaultServiceSelection, isHomeServiceOnly } from "./reception-policy";

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

  it("ajoute le déplacement sans supprimer les autres modes en hybride", () => {
    const features = applyCustomerReceptionPolicy(configurableModes, "hybrid");

    expect(features.homeService).toBe(true);
    expect(features.booking).toBe(true);
    expect(features.walkIn).toBe(true);
  });
});
