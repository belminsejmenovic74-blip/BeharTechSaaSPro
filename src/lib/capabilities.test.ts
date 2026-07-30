import { describe, expect, it } from "vitest";

import { deriveCapabilities, stripAccountCapabilityFields } from "@/lib/capabilities";

describe("capabilities — axes indépendants", () => {
  it("refuse toute capacité commerciale sans immatriculation, quel que soit le plan", () => {
    const capabilities = deriveCapabilities({ billingEnabled: false, plan: "Business" });

    expect(capabilities.canInvoice).toBe(false);
    expect(capabilities.canQuote).toBe(false);
    expect(capabilities.canCollectPayment).toBe(false);
    expect(capabilities.canManagePurchases).toBe(false);
    expect(capabilities.canExportAccounting).toBe(false);
  });

  it("conserve la facturation sur le plan gratuit mais réserve l'export comptable aux plans éligibles", () => {
    const free = deriveCapabilities({ billingEnabled: true, plan: "Gratuit" });
    const pro = deriveCapabilities({ billingEnabled: true, plan: "Pro" });

    expect(free.canInvoice).toBe(true);
    expect(free.canExportAccounting).toBe(false);
    expect(free.accountingExportUpgradeRequired).toBe(true);
    expect(pro.canInvoice).toBe(true);
    expect(pro.canExportAccounting).toBe(true);
  });

  it("retire l'immatriculation du snapshot atelier sans toucher au SIRET client", () => {
    const clean = stripAccountCapabilityFields({
      workshopInfo: { name: "Atelier", siret: "111" },
      workshopSettings: { siret: "222", billingProfiles: { FR: { siret: "333" } } },
      customers: [{ name: "Entreprise cliente", siret: "444" }],
      has_billing: true,
    });

    expect(clean.workshopInfo).toEqual({ name: "Atelier" });
    expect(clean.workshopSettings).toEqual({ billingProfiles: { FR: {} } });
    expect(clean.customers).toEqual([{ name: "Entreprise cliente", siret: "444" }]);
    expect("has_billing" in clean).toBe(false);
  });
});
