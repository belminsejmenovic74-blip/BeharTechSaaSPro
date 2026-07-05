// Tests du moteur de reprise PAR MODÈLE (reconditioning-pricing) :
// prix cible par modèle+stockage, profils batterie/défauts/pièces propres au
// modèle, blocages, réactivité de l'estimation et stock intact à l'estimation.

import { beforeEach, describe, expect, it } from "vitest";

import { useBeharStore } from "@/lib/behar-store";
import { formatMoney } from "@/lib/reconditioning-calc";
import {
  type BatteryTierKey,
  calculateBatteryDeduction,
  calculateDefectDeductions,
  calculateGradeDeduction,
  computeOfferCalculation,
  type DefectKey,
  findModelRule,
  type OfferInput,
  type RulesSnapshot,
  suggestParts,
  useReconditioningRules,
} from "@/lib/reconditioning-pricing";
import { useReconditioningStore } from "@/lib/reconditioning-store";

let rules: RulesSnapshot;

beforeEach(() => {
  useReconditioningRules.getState().reset();
  rules = useReconditioningRules.getState();
  useBeharStore.getState().resetDemo();
  useReconditioningStore.setState({ files: [], sequence: 1 });
});

const baseInput = (patch: Partial<OfferInput>): OfferInput => ({
  brand: "Apple",
  model: "iPhone 13",
  storage: "128 Go",
  grade: "A+",
  batteryTier: "90-100",
  defects: [],
  blockerFlags: [],
  parts: [],
  ...patch,
});

/* ───────── 1 & 5 — Prix cible par modèle + stockage ───────── */

describe("règles par modèle et stockage", () => {
  it("Test 1 — iPhone 13 128 Go et 256 Go n'ont pas le même prix cible", () => {
    const r128 = findModelRule(rules, { brand: "Apple", model: "iPhone 13", storage: "128 Go" });
    const r256 = findModelRule(rules, { brand: "Apple", model: "iPhone 13", storage: "256 Go" });
    expect(r128?.targetResalePrice).toBe(560);
    expect(r256?.targetResalePrice).toBe(620);
    expect(r128?.targetResalePrice).not.toBe(r256?.targetResalePrice);
  });

  it("Test 5 — changer le GO change immédiatement l'estimation", () => {
    const calc128 = computeOfferCalculation(baseInput({ storage: "128 Go" }), rules);
    const calc256 = computeOfferCalculation(baseInput({ storage: "256 Go" }), rules);
    expect(calc128.targetResale).toBe(560);
    expect(calc256.targetResale).toBe(620);
    expect(calc256.suggestedOffer).toBeGreaterThan(calc128.suggestedOffer ?? 0);
  });

  it("modèle inconnu sans cote manuelle : tout est null, jamais NaN", () => {
    const calc = computeOfferCalculation(baseInput({ brand: "Nokia", model: "3310", storage: "1 Go" }), rules);
    expect(calc.rule).toBeNull();
    expect(calc.targetResale).toBeNull();
    expect(calc.maxBuyback).toBeNull();
    expect(calc.suggestedOffer).toBeNull();
    expect(formatMoney(calc.suggestedOffer)).toBe("À compléter");
  });

  it("modèle inconnu avec cote manuelle : le calcul fonctionne", () => {
    const calc = computeOfferCalculation(
      baseInput({ brand: "Nokia", model: "3310", storage: "1 Go", manualTarget: 100 }),
      rules,
    );
    expect(calc.targetResale).toBe(100);
    expect(calc.maxBuyback).toBe(72); // 100 − 25 % − 3 %
  });
});

/* ───────── 2 & 6 — Batterie par modèle ───────── */

describe("profils batterie par modèle", () => {
  const tier: BatteryTierKey = "80-84";

  it("Test 2 — une batterie à 84 % décote selon le profil du modèle, pas globalement", () => {
    const ip13 = findModelRule(rules, { brand: "Apple", model: "iPhone 13", storage: "128 Go" });
    const s21 = findModelRule(rules, { brand: "Samsung", model: "Galaxy S21", storage: "128 Go" });
    const dIp13 = calculateBatteryDeduction(rules, ip13, tier);
    const dS21 = calculateBatteryDeduction(rules, s21, tier);
    // iPhone 13 : 40 € + 20 € (remplacement conseillé sous 85 %) = 60 €.
    expect(dIp13).toEqual({ amount: 60, replacementAdvised: true });
    // Galaxy S21 : 30 €, remplacement conseillé seulement sous 80 %.
    expect(dS21).toEqual({ amount: 30, replacementAdvised: false });
    expect(dIp13.amount).not.toBe(dS21.amount);
  });

  it("Test 6 — changer la batterie change immédiatement l'estimation", () => {
    const good = computeOfferCalculation(baseInput({ batteryTier: "90-100" }), rules);
    const bad = computeOfferCalculation(baseInput({ batteryTier: "<80" }), rules);
    expect(good.batteryDeduction).toBe(0);
    expect(bad.batteryDeduction).toBe(90); // 70 + 20 remplacement conseillé
    expect((good.suggestedOffer ?? 0) - (bad.suggestedOffer ?? 0)).toBeGreaterThanOrEqual(85);
  });

  it("remplacement conseillé suggère automatiquement la pièce batterie du modèle", () => {
    const ip13 = findModelRule(rules, { brand: "Apple", model: "iPhone 13", storage: "128 Go" });
    const parts = suggestParts(rules, ip13, [], true);
    expect(parts).toHaveLength(1);
    expect(parts[0]).toMatchObject({ key: "batterie", label: "Batterie", piece: 29.9, labor: 15 });
  });
});

/* ───────── 3, 4 & 7 — Défauts par modèle ───────── */

describe("profils défauts par modèle", () => {
  it("Tests 3 & 4 — écran cassé : -80 € sur iPhone 13, -60 € sur Galaxy S21", () => {
    const ip13 = findModelRule(rules, { brand: "Apple", model: "iPhone 13", storage: "128 Go" });
    const s21 = findModelRule(rules, { brand: "Samsung", model: "Galaxy S21", storage: "128 Go" });
    const dIp13 = calculateDefectDeductions(rules, ip13, ["ecranCasse"]);
    const dS21 = calculateDefectDeductions(rules, s21, ["ecranCasse"]);
    expect(dIp13[0]?.amount).toBe(80);
    expect(dS21[0]?.amount).toBe(60);
  });

  it("Test 7 — cocher un défaut change immédiatement l'estimation", () => {
    const clean = computeOfferCalculation(baseInput({}), rules);
    const broken = computeOfferCalculation(baseInput({ defects: ["ecranCasse"] }), rules);
    expect(broken.defectDeduction).toBe(80);
    expect((clean.suggestedOffer ?? 0) - (broken.suggestedOffer ?? 0)).toBeGreaterThanOrEqual(75);
  });

  it("action par modèle : Réseau HS = validation manuelle sur Galaxy S21, simple décote sur iPhone 13", () => {
    const s21Input = baseInput({ brand: "Samsung", model: "Galaxy S21", defects: ["reseauHs"] as DefectKey[] });
    const s21 = computeOfferCalculation(s21Input, rules);
    expect(s21.blocked).toHaveLength(0);
    expect(s21.manualReview.some((m) => m.includes("Réseau"))).toBe(true);

    const ip13 = computeOfferCalculation(baseInput({ defects: ["reseauHs"] }), rules);
    expect(ip13.manualReview.some((m) => m.includes("Réseau"))).toBe(false);
    expect(ip13.defectDeduction).toBe(25);
  });

  it("décote grade : % global appliqué au prix cible du modèle", () => {
    const ip13 = findModelRule(rules, { brand: "Apple", model: "iPhone 13", storage: "128 Go" });
    // Grade B = 10 % de 560 = 56 €.
    expect(calculateGradeDeduction(rules, ip13, "B", 560)).toBe(56);
    expect(calculateGradeDeduction(rules, ip13, "A+", 560)).toBe(0);
  });
});

/* ───────── 8 & 9 — Blocages ───────── */

describe("blocages critiques", () => {
  it("Test 8 — iCloud actif bloque la reprise : aucun prix proposé", () => {
    const calc = computeOfferCalculation(baseInput({ blockerFlags: ["icloudActif"] }), rules);
    expect(calc.blocked.some((b) => b.includes("iCloud"))).toBe(true);
    expect(calc.maxBuyback).toBeNull();
    expect(calc.suggestedOffer).toBeNull();
  });

  it("Test 9 — IMEI blacklisté bloque la reprise", () => {
    const calc = computeOfferCalculation(baseInput({ blockerFlags: ["imeiBlacklist"] }), rules);
    expect(calc.blocked.some((b) => b.includes("IMEI"))).toBe(true);
    expect(calc.suggestedOffer).toBeNull();
  });

  it("oxydation forte et carte mère suspecte : validation manuelle, prix conservé", () => {
    const calc = computeOfferCalculation(baseInput({ blockerFlags: ["oxydationForte", "carteMere"] }), rules);
    expect(calc.blocked).toHaveLength(0);
    expect(calc.manualReview).toHaveLength(2);
    expect(calc.suggestedOffer).not.toBeNull();
  });

  it("blocage désactivé dans les paramètres : la règle saute", () => {
    useReconditioningRules.getState().setBlocker("imeiBlacklist", { active: false });
    const calc = computeOfferCalculation(
      baseInput({ blockerFlags: ["imeiBlacklist"] }),
      useReconditioningRules.getState(),
    );
    expect(calc.blocked).toHaveLength(0);
  });
});

/* ───────── 12 — Stock intact pendant l'estimation ───────── */

describe("Test 12 — le stock n'est pas décrémenté pendant l'estimation", () => {
  it("les pièces estimées de la reprise ne touchent pas le stock réel", () => {
    const behar = useBeharStore.getState();
    const stockId = behar.addStockItem({
      name: "Écran iPhone 13",
      purchasePrice: 89,
      threshold: 1,
      supplier: "Fournisseur pièces",
      stock: 5,
      itemType: "part",
    });

    // Estimation comptoir : pièces estimées écrites sur la fiche SANS stockItemId.
    const ip13 = findModelRule(rules, { brand: "Apple", model: "iPhone 13", storage: "128 Go" });
    const estimated = suggestParts(rules, ip13, ["ecranCasse"], false);
    const store = useReconditioningStore.getState;
    const id = store().createFile();
    store().updateFile(id, {
      brand: "Apple",
      model: "iPhone 13",
      prixAchat: 300,
      prixVentePrevu: 560,
      parts: estimated.map((line, index) => ({
        id: `part_est_${index}`,
        label: `${line.label} (estimé)`,
        cost: line.piece ?? 0,
        quantity: 1,
        priceMode: "achat" as const,
      })),
    });
    store().acceptIntake(id);

    // Stock inchangé : la pièce n'est qu'estimée.
    expect(useBeharStore.getState().stockItems.find((s) => s.id === stockId)?.stock).toBe(5);

    // Tests 13 & 14 — en atelier, la pièce réelle décrémente le stock et la marge se recalcule.
    store().sendToWorkshop(id);
    store().addPart(id);
    const partId =
      store()
        .files.find((f) => f.id === id)
        ?.parts.at(-1)?.id ?? "";
    store().updatePart(id, partId, { stockItemId: stockId, label: "Écran iPhone 13", cost: 89, quantity: 1 });
    expect(useBeharStore.getState().stockItems.find((s) => s.id === stockId)?.stock).toBe(4);
  });
});

/* ───────── 15 — Jamais de NaN / Infinity ───────── */

describe("Test 15 — aucune valeur cassée", () => {
  it("toutes les sorties du calcul sont finies ou null (jamais NaN/Infinity)", () => {
    const inputs: OfferInput[] = [
      baseInput({}),
      baseInput({ brand: "", model: "", storage: "" }),
      baseInput({ grade: "HS", batteryTier: null }),
      baseInput({ defects: ["ecranCasse", "tactileHs", "oxydationLegere"], blockerFlags: ["icloudActif"] }),
    ];
    for (const input of inputs) {
      const calc = computeOfferCalculation(input, rules);
      for (const value of [
        calc.targetResale,
        calc.batteryDeduction,
        calc.gradeDeduction,
        calc.defectDeduction,
        calc.partsCost,
        calc.laborCost,
        calc.targetMarginAmount,
        calc.riskAmount,
        calc.maxBuyback,
        calc.suggestedOffer,
      ]) {
        if (value != null) expect(Number.isFinite(value)).toBe(true);
      }
      expect(formatMoney(calc.targetResale)).not.toContain("NaN");
      expect(formatMoney(calc.suggestedOffer)).not.toContain("NaN");
    }
  });
});
