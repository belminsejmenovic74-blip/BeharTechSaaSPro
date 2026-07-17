import { describe, expect, it } from "vitest";

import { isWorkshopConfigurationComplete } from "@/components/behar/installation-gate";
import type { WorkshopSettings } from "@/lib/behar-store";

function settings(patch: Partial<WorkshopSettings> = {}): WorkshopSettings {
  return {
    brand: "BEHAR • TECH",
    name: "Atelier Annemasse",
    address: "12 rue du Commerce",
    postalCode: "74100",
    city: "Annemasse",
    postalCity: "74100 Annemasse",
    country: "FR",
    currency: "EUR",
    taxRegime: "not_subject_to_vat",
    defaultPhonePrefix: "+33",
    siret: "12345678900012",
    email: "atelier@example.com",
    phone: "+33 6 12 34 56 78",
    ...patch,
  };
}

describe("isWorkshopConfigurationComplete", () => {
  it("refuse un atelier marqué terminé mais sans coordonnées métier", () => {
    expect(
      isWorkshopConfigurationComplete(settings({ address: "", postalCode: "", city: "", phone: "", siret: "" })),
    ).toBe(false);
  });

  it("accepte un atelier français réellement complété", () => {
    expect(isWorkshopConfigurationComplete(settings())).toBe(true);
  });

  it("valide le format suisse sans exiger de SIRET français", () => {
    expect(
      isWorkshopConfigurationComplete(
        settings({ country: "CH", currency: "CHF", defaultPhonePrefix: "+41", postalCode: "1201", siret: "" }),
      ),
    ).toBe(true);
  });
});
