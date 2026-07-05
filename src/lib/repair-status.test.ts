import { describe, expect, it } from "vitest";

import {
  PUBLIC_REPAIR_TIMELINE_STEPS,
  publicRepairHeadline,
  publicRepairPageTitle,
  publicRepairProgress,
  publicRepairStatusLabel,
} from "@/lib/repair-status";

describe("public repair status", () => {
  it("exposes a returned repair as completed, not ready", () => {
    expect(PUBLIC_REPAIR_TIMELINE_STEPS).toEqual(["Reçu", "Diagnostic", "En réparation", "Test final", "Terminé"]);
    expect(publicRepairStatusLabel("Rendu")).toBe("Terminé");
    expect(publicRepairPageTitle("Rendu")).toBe("Votre réparation est terminée");
    expect(publicRepairHeadline("Rendu")).toEqual(["Terminé", "Votre appareil a été rendu. Merci de votre confiance."]);
    expect(publicRepairProgress("Rendu")).toMatchObject({
      activeStepIndex: 4,
      isFinished: true,
      key: "returned",
      label: "Terminé",
    });
    expect(publicRepairProgress("En réparation")).toMatchObject({
      activeStepIndex: 2,
      key: "repair",
      label: "En réparation",
    });
  });
});
