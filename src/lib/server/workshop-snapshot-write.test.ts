import { describe, expect, it } from "vitest";

import { buildWorkshopSnapshotWrite } from "@/lib/server/workshop-snapshot-write";

describe("workshop snapshot write payload", () => {
  it("laisse Postgres calculer la clé normalisée", () => {
    const payload = buildWorkshopSnapshotWrite({
      workshopId: "2fcecc53-1f3c-4676-ad40-a3bf7288d0e8",
      recoveryCode: "2FCE-CC53-1F3C-4676",
      licenseKey: "BTP-ABCD-EF12-3456-7890",
      state: { onboardingCompleted: true },
      stateSizeBytes: 32,
      schemaVersion: 1,
    });

    expect(payload.license_key).toBe("BTP-ABCD-EF12-3456-7890");
    expect(payload).not.toHaveProperty("license_key_normalized");
  });
});
