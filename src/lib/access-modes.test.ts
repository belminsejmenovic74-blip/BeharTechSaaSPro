import { describe, expect, it } from "vitest";

import { permissionsByRole } from "@/lib/behar-store";

describe("accès aux espaces de travail", () => {
  it("place l'accueil au Comptoir sans lui ouvrir le Dashboard par défaut", () => {
    expect(permissionsByRole.frontdesk.canAccessCounter).toBe(true);
    expect(permissionsByRole.frontdesk.canViewDashboard).toBe(false);
    expect(permissionsByRole.frontdesk.canAccessWorkshopMode).toBe(false);
  });

  it("place le technicien dans le mode Atelier et laisse le gérant tout administrer", () => {
    expect(permissionsByRole.technician.canAccessWorkshopMode).toBe(true);
    expect(permissionsByRole.admin.canAccessCounter).toBe(true);
    expect(permissionsByRole.admin.canAccessWorkshopMode).toBe(true);
    expect(permissionsByRole.admin.canViewDashboard).toBe(true);
  });
});
