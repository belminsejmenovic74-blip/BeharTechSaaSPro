import { describe, expect, it } from "vitest";

import {
  categorizeIssues,
  deviceImageFor,
  ISSUE_CATEGORY_ORDER,
  issueCategory,
  issuesForType,
  popularIssuesForType,
} from "@/lib/widget/global-catalog";

describe("popularIssuesForType", () => {
  it("renvoie un sous-ensemble court, réellement présent dans le catalogue", () => {
    const popular = popularIssuesForType("Smartphone");
    expect(popular.length).toBeGreaterThan(0);
    expect(popular.length).toBeLessThanOrEqual(9);
    const all = new Set(issuesForType("Smartphone"));
    for (const issue of popular) expect(all.has(issue)).toBe(true);
    expect(popular).toContain("Écran cassé");
  });

  it("retombe sur un défaut pour un type inconnu", () => {
    expect(popularIssuesForType("Trottinette").length).toBeGreaterThan(0);
  });
});

describe("issueCategory / categorizeIssues", () => {
  it("classe les pannes par mots-clés", () => {
    expect(issueCategory("Écran cassé")).toBe("Écran & châssis");
    expect(issueCategory("Batterie")).toBe("Batterie & charge");
    expect(issueCategory("Connecteur de charge")).toBe("Batterie & charge");
    expect(issueCategory("Caméra arrière")).toBe("Caméra");
    expect(issueCategory("Wi-Fi")).toBe("Réseau & connectivité");
    expect(issueCategory("Déblocage")).toBe("Logiciel & données");
    expect(issueCategory("Panne inconnue")).toBe("Diagnostic & autre");
  });

  it("regroupe en catégories ordonnées, sans catégorie vide", () => {
    const groups = categorizeIssues(["Écran cassé", "Batterie", "Caméra avant", "Autre panne"]);
    const names = groups.map((group) => group.category);
    // ordre stable calqué sur ISSUE_CATEGORY_ORDER
    const sorted = [...names].sort((a, b) => ISSUE_CATEGORY_ORDER.indexOf(a) - ISSUE_CATEGORY_ORDER.indexOf(b));
    expect(names).toEqual(sorted);
    const flat = groups.flatMap((group) => group.issues);
    expect(flat).toHaveLength(4);
  });
});

describe("deviceImageFor", () => {
  it("préfère l'image de marque, sinon le type, sinon null", () => {
    expect(deviceImageFor("Smartphone", "Apple")).toContain("apple-iphone");
    expect(deviceImageFor("Smartphone", "Samsung")).toContain("samsung-galaxy");
    expect(deviceImageFor("Smartphone", "MarqueInconnue")).toContain("smartphone-generic");
    expect(deviceImageFor("Montre connectée")).toBeNull();
  });
});
