import { describe, expect, it } from "vitest";

import { getAppEntryState, isWorkshopConfigurationComplete } from "@/components/behar/installation-gate";
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

describe("getAppEntryState", () => {
  const base = {
    hasHydrated: true,
    hydrationTimedOut: false,
    licenseActivated: true,
    isAutomatedBrowser: false,
    cloudLoading: false,
    normalizedActiveKey: "BTP-TEST-1234-5678",
    cloudCheckedKey: "BTP-TEST-1234-5678",
    onboardingCompleted: false,
    workshopConfigurationComplete: false,
  };

  it("attend le snapshot cloud avant de décider sur un nouvel appareil", () => {
    expect(
      getAppEntryState({
        ...base,
        cloudCheckedKey: "",
        onboardingCompleted: true,
      }),
    ).toBe("loading_cloud");
  });

  it("ouvre le tableau de bord pour un compte provisionné et déjà marqué terminé", () => {
    expect(getAppEntryState({ ...base, onboardingCompleted: true })).toBe("dashboard");
  });

  it("ouvre aussi un ancien atelier complet dont le drapeau est absent", () => {
    expect(getAppEntryState({ ...base, workshopConfigurationComplete: true })).toBe("dashboard");
  });

  it("conserve l'onboarding pour un vrai nouvel atelier vide", () => {
    expect(getAppEntryState(base)).toBe("onboarding");
  });
});
