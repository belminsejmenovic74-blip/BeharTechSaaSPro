import { describe, expect, it } from "vitest";

import {
  brandsForType,
  deviceTypeLabels,
  GLOBAL_DEVICE_TYPES,
  issuesForType,
  modelsForBrand,
  popularBrandsForType,
  searchList,
} from "@/lib/widget/global-catalog";

describe("catalogue global — types, marques, modèles, pannes", () => {
  it("expose les huit types d'appareil requis", () => {
    const labels = deviceTypeLabels();
    expect(labels).toHaveLength(8);
    for (const expected of [
      "Smartphone",
      "Tablette",
      "Ordinateur portable",
      "Ordinateur fixe",
      "Console",
      "Montre connectée",
      "Écouteurs / audio",
      "Autre appareil",
    ]) {
      expect(labels).toContain(expected);
    }
    expect(GLOBAL_DEVICE_TYPES.find((type) => type.id === "other")?.hasBrands).toBe(false);
  });

  it("liste un large panel de marques par type + suggestions populaires", () => {
    const phone = brandsForType("Smartphone");
    for (const brand of ["Apple", "Samsung", "Xiaomi", "Honor", "Google", "Nothing", "Crosscall"]) {
      expect(phone).toContain(brand);
    }
    expect(brandsForType("Console")).toContain("Nintendo");
    expect(popularBrandsForType("Smartphone")[0]).toBe("Apple");
    expect(brandsForType("Autre appareil")).toEqual([]);
  });

  it("propose un vrai catalogue de modèles pour les marques majeures", () => {
    const apple = modelsForBrand("Smartphone", "Apple");
    for (const model of ["iPhone 13", "iPhone 15 Pro Max", "iPhone 16", "iPhone SE (2022)"]) {
      expect(apple).toContain(model);
    }
    expect(modelsForBrand("Tablette", "Apple")).toContain("iPad Pro 12.9");
    expect(modelsForBrand("Console", "Sony PlayStation")).toContain("PlayStation 5");
    // Marque connue mais modèles non listés → liste vide (saisie manuelle possible).
    expect(modelsForBrand("Smartphone", "Crosscall")).toEqual([]);
  });

  it("propose un large catalogue de pannes adapté au type", () => {
    const phone = issuesForType("Smartphone");
    for (const issue of ["Écran cassé", "Batterie", "Face ID", "Désoxydation", "Autre panne"]) {
      expect(phone).toContain(issue);
    }
    expect(issuesForType("Console")).toContain("Port HDMI");
    expect(issuesForType("Ordinateur portable")).toContain("Clavier");
  });

  it("recherche insensible à la casse et aux accents", () => {
    expect(searchList(modelsForBrand("Smartphone", "Apple"), "pro max")).toContain("iPhone 15 Pro Max");
    expect(searchList(["Désoxydation", "Batterie"], "desox")).toEqual(["Désoxydation"]);
    expect(searchList(["Apple", "Samsung"], "")).toHaveLength(2);
  });
});
