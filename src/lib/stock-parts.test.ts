// Tests de la liaison stock ↔ reconditionnement et de l'isolation des règles
// par modèle : un iPhone 11 n'affiche JAMAIS les pièces/règles d'un iPhone 13,
// les prix d'achat viennent du stock quand ils existent, un prix inconnu ne
// devient jamais 0 €, et la configuration ne décrémente jamais le stock.

import { beforeEach, describe, expect, it } from "vitest";

import { useBeharStore } from "@/lib/behar-store";
import { formatMoney } from "@/lib/reconditioning-calc";
import {
  computeOfferCalculation,
  findModelRule,
  isPriceKnown,
  migrateRulesV1toV2,
  PART_COST_SOURCE_LABELS,
  resolvePartCost,
  useReconditioningRules,
} from "@/lib/reconditioning-pricing";
import {
  getCompatibleStockPartsForModel,
  isStockItemCompatibleWithModel,
  resolvePartCostForReconditioning,
} from "@/lib/stock-parts";

beforeEach(() => {
  useReconditioningRules.getState().reset();
  useBeharStore.getState().resetDemo();
});

const rules = () => useReconditioningRules.getState();
const behar = () => useBeharStore.getState();

const addPart = (input: {
  name: string;
  compatibleModels: string[];
  categoryName: string;
  purchasePrice: number;
  stock?: number;
  supplier?: string;
}) =>
  behar().addStockItem({
    name: input.name,
    brandName: "Apple",
    compatibleModels: input.compatibleModels,
    categoryName: input.categoryName,
    purchasePrice: input.purchasePrice,
    salePrice: input.purchasePrice * 2,
    stock: input.stock ?? 3,
    quantity: input.stock ?? 3,
    threshold: 1,
    supplier: input.supplier ?? "Fournisseur pièces",
    itemType: "part",
    skipModelInference: true,
  });

/* ───────── Pièces compatibles : modèle EXACT ───────── */

describe("pièces du stock compatibles avec le modèle exact", () => {
  it("iPhone 11 ne remonte que les pièces iPhone 11 — jamais iPhone 13 ni iPhone 11 Pro", () => {
    const idIp11 = addPart({
      name: "Écran iPhone 11 OLED",
      compatibleModels: ["iPhone 11"],
      categoryName: "Écran",
      purchasePrice: 49.9,
    });
    addPart({ name: "Écran iPhone 13", compatibleModels: ["iPhone 13"], categoryName: "Écran", purchasePrice: 89 });
    addPart({
      name: "Écran iPhone 11 Pro",
      compatibleModels: ["iPhone 11 Pro"],
      categoryName: "Écran",
      purchasePrice: 65,
    });

    const found = getCompatibleStockPartsForModel({
      stockItems: behar().stockItems,
      brandName: "Apple",
      modelName: "iPhone 11",
      partKey: "ecran",
    });
    expect(found.map((f) => f.stockItem.id)).toEqual([idIp11]);
    expect(found[0].stockItem.name).toBe("Écran iPhone 11 OLED");
  });

  it("le nom de pièce suffit si le modèle exact y figure (bordures de mots respectées)", () => {
    const id = addPart({
      name: "Batterie iPhone 11",
      compatibleModels: [],
      categoryName: "Batterie",
      purchasePrice: 18.9,
    });
    const item = behar().stockItems.find((s) => s.id === id);
    expect(item && isStockItemCompatibleWithModel(item, "Apple", "iPhone 11")).toBe(true);
    expect(item && isStockItemCompatibleWithModel(item, "Apple", "iPhone 1")).toBe(false);
    expect(item && isStockItemCompatibleWithModel(item, "Samsung", "iPhone 11")).toBe(false);
  });

  it("une marque différente ne matche jamais (pas de pièce Apple sur un Galaxy)", () => {
    addPart({
      name: "Écran iPhone 11 OLED",
      compatibleModels: ["iPhone 11"],
      categoryName: "Écran",
      purchasePrice: 49.9,
    });
    const found = getCompatibleStockPartsForModel({
      stockItems: behar().stockItems,
      brandName: "Samsung",
      modelName: "Galaxy S21",
      partKey: "ecran",
    });
    expect(found.some((f) => f.stockItem.name.includes("iPhone"))).toBe(false);
  });
});

/* ───────── Résolution du coût : stock → manuel → défaut → à renseigner ───────── */

describe("résolution du coût d'une pièce", () => {
  it("pièce compatible avec prix d'achat → prix repris automatiquement depuis le stock", () => {
    addPart({
      name: "Écran iPhone 11 OLED",
      compatibleModels: ["iPhone 11"],
      categoryName: "Écran",
      purchasePrice: 49.9,
    });
    const resolved = resolvePartCostForReconditioning({
      rules: rules(),
      ruleItem: null,
      partKey: "ecran",
      stockItems: behar().stockItems,
      brandName: "Apple",
      modelName: "iPhone 11",
    });
    expect(resolved.source).toBe("stock");
    expect(resolved.piece).toBe(49.9);
    expect(resolved.stockItem?.name).toBe("Écran iPhone 11 OLED");
  });

  it("pièce du stock épinglée SANS prix d'achat → « À renseigner », jamais 0 €", () => {
    const id = addPart({
      name: "Vitre arrière iPhone 11",
      compatibleModels: ["iPhone 11"],
      categoryName: "Vitre arrière",
      purchasePrice: 0,
    });
    const ruleId = rules().addModelRule({
      brand: "Apple",
      model: "iPhone 11",
      storage: "64 Go",
      targetResalePrice: 300,
      parts: {
        ...Object.fromEntries(
          (
            ["ecran", "batterie", "vitreArriere", "connecteur", "camera", "hautParleur", "micro", "chassis"] as const
          ).map((key) => [
            key,
            { piece: null, labor: null, source: "missing" as const, active: key === "vitreArriere" },
          ]),
        ),
        vitreArriere: { piece: null, labor: 20, stockItemId: id, source: "stock" as const, active: true },
      } as never,
    });
    const ruleItem = rules().modelRules.find((r) => r.id === ruleId) ?? null;
    const resolved = resolvePartCostForReconditioning({
      rules: rules(),
      ruleItem,
      partKey: "vitreArriere",
      stockItems: behar().stockItems,
      brandName: "Apple",
      modelName: "iPhone 11",
    });
    expect(resolved.source).toBe("missing");
    expect(resolved.piece).toBeNull();
    expect(isPriceKnown(resolved.piece)).toBe(false);
    expect(PART_COST_SOURCE_LABELS.missing).toBe("À renseigner");
    expect(formatMoney(resolved.piece)).toBe("À compléter");
  });

  it("aucune pièce en stock → coût manuel de la règle utilisé", () => {
    const ruleId = rules().saveModelReconditioningRule(
      { brand: "Apple", model: "iPhone 11", storage: "64 Go" },
      {
        targetResalePrice: 300,
        parts: {
          ecran: { piece: 40, labor: 30, source: "manual", active: true },
          batterie: { piece: null, labor: null, source: "missing", active: true },
          vitreArriere: { piece: null, labor: null, source: "missing", active: false },
          connecteur: { piece: null, labor: null, source: "missing", active: false },
          camera: { piece: null, labor: null, source: "missing", active: false },
          hautParleur: { piece: null, labor: null, source: "missing", active: false },
          micro: { piece: null, labor: null, source: "missing", active: false },
          chassis: { piece: null, labor: null, source: "missing", active: false },
        },
      },
    );
    const ruleItem = rules().modelRules.find((r) => r.id === ruleId) ?? null;
    const resolved = resolvePartCostForReconditioning({
      rules: rules(),
      ruleItem,
      partKey: "ecran",
      stockItems: [],
      brandName: "Apple",
      modelName: "iPhone 11",
    });
    expect(resolved.source).toBe("manual");
    expect(resolved.piece).toBe(40);
    expect(resolved.compatibleParts).toHaveLength(0);
  });

  it("la configuration (recherche + résolution + sauvegarde) ne décrémente JAMAIS le stock", () => {
    const id = addPart({
      name: "Écran iPhone 11 OLED",
      compatibleModels: ["iPhone 11"],
      categoryName: "Écran",
      purchasePrice: 49.9,
      stock: 5,
    });
    getCompatibleStockPartsForModel({
      stockItems: behar().stockItems,
      brandName: "Apple",
      modelName: "iPhone 11",
      partKey: "ecran",
    });
    resolvePartCostForReconditioning({
      rules: rules(),
      ruleItem: null,
      partKey: "ecran",
      stockItems: behar().stockItems,
      brandName: "Apple",
      modelName: "iPhone 11",
    });
    rules().saveModelReconditioningRule(
      { brand: "Apple", model: "iPhone 11", storage: "64 Go" },
      {
        targetResalePrice: 300,
        parts: {
          ecran: { piece: 49.9, labor: 35, stockItemId: id, source: "stock", active: true },
          batterie: { piece: null, labor: null, source: "missing", active: false },
          vitreArriere: { piece: null, labor: null, source: "missing", active: false },
          connecteur: { piece: null, labor: null, source: "missing", active: false },
          camera: { piece: null, labor: null, source: "missing", active: false },
          hautParleur: { piece: null, labor: null, source: "missing", active: false },
          micro: { piece: null, labor: null, source: "missing", active: false },
          chassis: { piece: null, labor: null, source: "missing", active: false },
        },
      },
    );
    expect(behar().stockItems.find((s) => s.id === id)?.stock).toBe(5);
  });
});

/* ───────── Isolation des règles par modèle ───────── */

describe("les règles d'un modèle ne polluent jamais les autres", () => {
  it("configurer iPhone 11 ne modifie pas iPhone 13 et n'hérite pas de ses pièces", () => {
    rules().saveModelReconditioningRule(
      { brand: "Apple", model: "iPhone 11", storage: "64 Go" },
      { targetResalePrice: 300 },
    );

    const ip11 = findModelRule(rules(), { brand: "Apple", model: "iPhone 11", storage: "64 Go" });
    const ip13 = findModelRule(rules(), { brand: "Apple", model: "iPhone 13", storage: "128 Go" });

    // iPhone 11 (nouveau modèle sans stockage frère) n'hérite d'AUCUN barème iPhone 13.
    expect(ip11?.parts).toBeUndefined();
    expect(ip11?.battery).toBeUndefined();
    // La résolution retombe sur le barème PAR DÉFAUT, affiché comme tel.
    expect(resolvePartCost(rules(), ip11, "ecran").source).toBe("default");
    // iPhone 13 garde ses propres coûts embarqués.
    expect(ip13?.parts?.ecran.piece).toBe(89);
  });

  it("modifier les pièces d'iPhone 11 ne touche pas celles d'iPhone 13", () => {
    const id = rules().saveModelReconditioningRule(
      { brand: "Apple", model: "iPhone 11", storage: "64 Go" },
      {
        targetResalePrice: 300,
        parts: {
          ecran: { piece: 40, labor: 30, source: "manual", active: true },
          batterie: { piece: 18.9, labor: 20, source: "manual", active: true },
          vitreArriere: { piece: null, labor: null, source: "missing", active: false },
          connecteur: { piece: null, labor: null, source: "missing", active: false },
          camera: { piece: null, labor: null, source: "missing", active: false },
          hautParleur: { piece: null, labor: null, source: "missing", active: false },
          micro: { piece: null, labor: null, source: "missing", active: false },
          chassis: { piece: null, labor: null, source: "missing", active: false },
        },
      },
    );
    expect(id).not.toBe("");
    const ip13 = findModelRule(rules(), { brand: "Apple", model: "iPhone 13", storage: "128 Go" });
    expect(ip13?.parts?.ecran.piece).toBe(89);
    expect(ip13?.parts?.batterie.piece).toBe(29.9);
  });

  it("le comptoir utilise la règle EXACTE du modèle + stockage sélectionné", () => {
    rules().saveModelReconditioningRule(
      { brand: "Apple", model: "iPhone 11", storage: "64 Go" },
      { targetResalePrice: 300, calculationMode: "ai" },
    );
    const snapshot = rules();
    const calcIp11 = computeOfferCalculation(
      {
        brand: "Apple",
        model: "iPhone 11",
        storage: "64 Go",
        grade: "A+",
        batteryTier: "90-100",
        defects: [],
        blockerFlags: [],
        parts: [],
      },
      snapshot,
    );
    const calcIp13 = computeOfferCalculation(
      {
        brand: "Apple",
        model: "iPhone 13",
        storage: "128 Go",
        grade: "A+",
        batteryTier: "90-100",
        defects: [],
        blockerFlags: [],
        parts: [],
      },
      snapshot,
    );
    expect(calcIp11.rule?.model).toBe("iPhone 11");
    expect(calcIp11.targetResale).toBe(300);
    expect(calcIp13.rule?.model).toBe("iPhone 13");
    expect(calcIp13.targetResale).toBe(560);
  });

  it("la règle sauvegardée porte exactement la marque, le modèle et le stockage saisis", () => {
    const id = rules().saveModelReconditioningRule(
      { brand: "Apple", model: "iPhone 11", storage: "64 Go" },
      { targetResalePrice: 300 },
    );
    const saved = rules().modelRules.find((r) => r.id === id);
    expect(saved).toMatchObject({ brand: "Apple", model: "iPhone 11", storage: "64 Go", targetResalePrice: 300 });
  });

  it("les prix inconnus ne sont jamais comptés à 0 € dans le calcul", () => {
    const snapshot = rules();
    const calc = computeOfferCalculation(
      {
        brand: "Apple",
        model: "iPhone 13",
        storage: "512 Go", // mode pièces + MO
        grade: "A+",
        batteryTier: "90-100",
        defects: [],
        blockerFlags: [],
        parts: [
          { key: "ecran", label: "Écran", piece: 89, labor: 35, source: "manual" },
          { key: "vitreArriere", label: "Vitre arrière", piece: null, labor: 20, source: "missing" },
        ],
      },
      snapshot,
    );
    expect(calc.partsCost).toBe(89);
    expect(calc.partsMissingPrice).toEqual(["vitreArriere"]);
    expect(calc.manualReview.some((m) => m.includes("Prix à renseigner"))).toBe(true);
  });
});

/* ───────── Migration v1 → v2 ───────── */

describe("migration des anciens profils partagés", () => {
  it("copie les valeurs du profil référencé DANS chaque règle — plus aucune référence croisée", () => {
    const migrated = migrateRulesV1toV2({
      defaultMode: "ai",
      modelRules: [
        {
          id: "mr-legacy-ip12",
          brand: "Apple",
          model: "iPhone 12",
          storage: "128 Go",
          calculationMode: "parts_labor",
          targetResalePrice: 420,
          batteryProfileId: "bp-iphone-12",
          defectProfileId: "dp-iphone-13",
          partProfileId: "pp-iphone-13",
          active: true,
          updatedAt: "2026-01-01",
        },
      ],
      batteryProfiles: [
        {
          id: "bp-iphone-12",
          name: "Batterie iPhone 12",
          tiers: { "90-100": 0, "85-89": 15, "80-84": 35, "<80": 60 },
          replacementAdvisedBelow: 85,
          replacementExtraDeduction: 15,
        },
      ],
      defectProfiles: [
        {
          id: "dp-iphone-13",
          name: "Défauts iPhone 13",
          defects: { ecranCasse: { amount: 80, action: "decote", active: true } },
        },
      ],
      partProfiles: [
        {
          id: "pp-iphone-13",
          name: "Pièces iPhone 13",
          parts: { ecran: { piece: 89, labor: 35, active: true } },
        },
      ],
    });

    const migratedRule = migrated.modelRules?.[0];
    expect(migratedRule?.battery?.tiers["80-84"]).toBe(35);
    expect(migratedRule?.defects?.ecranCasse.amount).toBe(80);
    expect(migratedRule?.parts?.ecran.piece).toBe(89);
    // Les anciens champs de référence disparaissent.
    expect((migratedRule as Record<string, unknown>)?.batteryProfileId).toBeUndefined();
    expect((migratedRule as Record<string, unknown>)?.partProfileId).toBeUndefined();
    // Les barèmes par défaut existent après migration.
    expect(migrated.defaultParts?.ecran.piece).not.toBeUndefined();
  });
});
