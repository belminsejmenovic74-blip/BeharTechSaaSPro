import { describe, expect, it } from "vitest";

import type { PublicService } from "@/lib/widget/public-types";
import { computeLeadTags, displayPriceLabel, mergeIssues, shopServicesForModel } from "@/lib/widget/catalog-merge";

function service(over: Partial<PublicService>): PublicService {
  return {
    publicId: "svc",
    category: "Smartphone",
    brand: "Apple",
    model: "iPhone 13",
    issue: "Écran cassé",
    service: "Écran cassé",
    price: { mode: "exact", amount: 129, currency: "€" },
    ...over,
  };
}

describe("fusion catalogue global ↔ boutique", () => {
  it("associe les pannes configurées et ajoute les prestations boutique hors liste", () => {
    const shop = [
      service({ issue: "Écran cassé" }),
      service({ issue: "Prestation spéciale atelier", publicId: "svc2" }),
    ];
    const rows = mergeIssues(["Écran cassé", "Batterie"], shop);
    expect(rows.find((r) => r.issue === "Écran cassé")?.configured).toBe(true);
    expect(rows.find((r) => r.issue === "Batterie")?.configured).toBe(false);
    expect(rows.some((r) => r.issue === "Prestation spéciale atelier" && r.configured)).toBe(true);
  });

  it("retrouve les prestations d'un modèle de façon tolérante", () => {
    const shop = [service({ model: "iPhone 13" }), service({ model: "iPhone 14", publicId: "x" })];
    expect(shopServicesForModel(shop, "iPhone 13")).toHaveLength(1);
    expect(shopServicesForModel(shop, "iphone 13")).toHaveLength(1); // casse
    expect(shopServicesForModel(shop, "Galaxy S24")).toHaveLength(0);
  });
});

describe("cas non configurés — jamais bloquant, tags admin", () => {
  it("taggue modèle / panne / hors-catalogue selon le contexte", () => {
    expect(
      computeLeadTags({ modelInGlobalCatalog: true, modelConfigured: true, selectedIssuesConfigured: [true] }),
    ).toEqual([]);
    expect(
      computeLeadTags({ modelInGlobalCatalog: true, modelConfigured: false, selectedIssuesConfigured: [false] }),
    ).toEqual(["modèle_non_configuré", "panne_non_configurée", "devis_manuel_à_traiter"]);
    expect(
      computeLeadTags({ modelInGlobalCatalog: false, modelConfigured: false, selectedIssuesConfigured: [] }),
    ).toContain("demande_hors_catalogue");
  });

  it("affiche le prix boutique sinon un état commercial rassurant", () => {
    expect(displayPriceLabel(service({ price: { mode: "exact", amount: 129, currency: "€" } }), true)).toBe("129 €");
    expect(displayPriceLabel(service({ price: { mode: "from", amount: 99, currency: "€" } }), true)).toBe(
      "À partir de 99 €",
    );
    expect(displayPriceLabel(undefined, false)).toBe("Sur devis");
    expect(displayPriceLabel(undefined, true)).toBe("Estimation personnalisée");
  });
});
