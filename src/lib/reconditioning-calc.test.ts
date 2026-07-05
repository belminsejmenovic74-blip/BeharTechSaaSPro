// Tests du module Reconditionnement refondu :
// calculs sûrs (jamais de NaN), blocages, et workflow
// reprise → acheté → atelier → pièce stock → prêt à vendre → vendu.

import { beforeEach, describe, expect, it } from "vitest";

import { useBeharStore } from "@/lib/behar-store";
import { DEFAULT_RECOND_SETTINGS, type RecondSettings } from "@/lib/recond-settings";
import {
  blankCondition,
  calculateBuybackMaxPrice,
  calculateEstimatedMargin,
  calculateEstimatedResalePrice,
  calculateRealMargin,
  calculateSuggestedOffer,
  evaluateIntakeBlockers,
  formatMoney,
  formatPercent,
  safeNumber,
  safePercent,
} from "@/lib/reconditioning-calc";
import {
  computeReconditioningKpis,
  DEVICE_STATUS_LABEL,
  FUNCTIONAL_TESTS,
  PHYSICAL_CHECKS,
  pipelineStage,
  useReconditioningStore,
} from "@/lib/reconditioning-store";

const settings: RecondSettings = DEFAULT_RECOND_SETTINGS;

beforeEach(() => {
  useBeharStore.getState().resetDemo();
  useReconditioningStore.setState({ files: [], sequence: 1 });
});

function completeFinalDiagnostic(id: string) {
  const store = useReconditioningStore.getState;
  for (const key of FUNCTIONAL_TESTS) store().setTest(id, key, "OK");
  for (const key of PHYSICAL_CHECKS) store().setPhysical(id, key, "OK");
  store().updateFile(id, { cosmeticGrade: "A", batteryHealth: 90, warrantyMonths: 12 });
}

/* ───────── Garde-fous : jamais de NaN / Infinity / undefined ───────── */

describe("garde-fous numériques", () => {
  it("safeNumber neutralise NaN, Infinity, null et undefined", () => {
    expect(safeNumber(Number.NaN)).toBe(0);
    expect(safeNumber(Number.POSITIVE_INFINITY)).toBe(0);
    expect(safeNumber(undefined)).toBe(0);
    expect(safeNumber(null)).toBe(0);
    expect(safeNumber("12")).toBe(12);
  });

  it("safePercent retourne null quand le total est nul (jamais Infinity)", () => {
    expect(safePercent(50, 0)).toBeNull();
    expect(safePercent(50, Number.NaN)).toBeNull();
    expect(safePercent(50, 200)).toBe(25);
  });

  it("formatMoney / formatPercent affichent « À compléter » pour les valeurs cassées", () => {
    expect(formatMoney(null)).toBe("À compléter");
    expect(formatMoney(Number.NaN)).toBe("À compléter");
    expect(formatPercent(null)).toBe("À compléter");
    expect(formatMoney(120)).toContain("120");
    expect(formatMoney(120)).toContain("€");
  });
});

/* ───────── Test 1 — Module vide ───────── */

describe("Test 1 — module vide", () => {
  it("KPI à 0, aucun NaN", () => {
    const kpis = computeReconditioningKpis([]);
    expect(kpis.telephonesAchetes).toBe(0);
    expect(kpis.enRecond).toBe(0);
    expect(kpis.prets).toBe(0);
    expect(kpis.vendus).toBe(0);
    expect(kpis.bloques).toBe(0);
    expect(kpis.margeEstimeeTotale).toBe(0);
    for (const value of Object.values(kpis)) {
      if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
    }
  });
});

/* ───────── Calculs de prix ───────── */

describe("calculs de prix de reprise", () => {
  it("prix de revente estimé : cote manuelle ajustée par le grade", () => {
    const priceB = calculateEstimatedResalePrice(
      { brand: "X", model: "Inconnu", grade: "B", manualResale: 400 },
      settings,
    );
    expect(priceB).toBe(400); // grade B = référence (0 %)
    const priceAPlus = calculateEstimatedResalePrice(
      { brand: "X", model: "Inconnu", grade: "A+", manualResale: 400 },
      settings,
    );
    expect(priceAPlus).toBe(480); // +20 %
    const priceHS = calculateEstimatedResalePrice(
      { brand: "X", model: "Inconnu", grade: "HS", manualResale: 400 },
      settings,
    );
    expect(priceHS).toBeNull(); // non revendable
  });

  it("prix_reprise_max = revente − pièces − MO − marge minimale − risque", () => {
    const max = calculateBuybackMaxPrice({ resalePrice: 400, partsCost: 90, laborCost: 30 }, settings);
    // 400 − 90 − 30 − 100 (25 %) − 12 (3 %) = 168
    expect(max).toBe(168);
    const suggested = calculateSuggestedOffer({ resalePrice: 400, partsCost: 90, laborCost: 30 }, settings);
    expect(suggested).toBe(165); // arrondi à 5 € en dessous
  });

  it("données incomplètes : null (pas de NaN), l'UI affiche « À compléter »", () => {
    expect(calculateBuybackMaxPrice({ resalePrice: null, partsCost: 0, laborCost: 0 }, settings)).toBeNull();
    expect(calculateSuggestedOffer({ resalePrice: null, partsCost: 0, laborCost: 0 }, settings)).toBeNull();
    expect(calculateEstimatedMargin({ resalePrice: null, buyPrice: 100 })).toBeNull();
    expect(calculateEstimatedMargin({ resalePrice: 0, buyPrice: 100 })).toBeNull();
    expect(calculateRealMargin({ soldPrice: null, buyPrice: 100 })).toBeNull();
  });

  it("marge estimée et marge réelle", () => {
    const est = calculateEstimatedMargin({ resalePrice: 400, buyPrice: 200, partsCost: 50, laborCost: 30 });
    expect(est).toEqual({ amount: 120, pct: 30 });
    const real = calculateRealMargin({ soldPrice: 420, buyPrice: 200, partsCost: 50, laborCost: 30 });
    expect(real).toEqual({ amount: 140, pct: 33.3 });
  });
});

/* ───────── Tests 8 & 9 — Blocages ───────── */

describe("Tests 8 & 9 — blocages critiques", () => {
  it("iCloud actif : reprise impossible, message clair", () => {
    const check = evaluateIntakeBlockers({ ...blankCondition(), lock: "actif" }, settings);
    expect(check.blocked).toBe(true);
    expect(check.critical[0]).toContain("reprise impossible");
  });

  it("IMEI blacklisté : blocage critique", () => {
    const check = evaluateIntakeBlockers({ ...blankCondition(), imeiStatus: "blackliste" }, settings);
    expect(check.blocked).toBe(true);
    expect(check.critical.some((c) => c.includes("IMEI"))).toBe(true);
  });

  it("oxydation forte : validation manuelle, pas de blocage", () => {
    const check = evaluateIntakeBlockers({ ...blankCondition(), oxidation: "forte" }, settings);
    expect(check.blocked).toBe(false);
    expect(check.manualReview.some((c) => c.includes("Oxydation"))).toBe(true);
  });

  it("règle désactivée : le blocage saute", () => {
    const relaxed: RecondSettings = {
      ...settings,
      blockingRules: settings.blockingRules.map((r) => (r.key === "imei" ? { ...r, active: false } : r)),
    };
    const check = evaluateIntakeBlockers({ ...blankCondition(), imeiStatus: "blackliste" }, relaxed);
    expect(check.blocked).toBe(false);
  });
});

/* ───────── Tests 2 à 7 — Workflow complet ───────── */

describe("Tests 2 à 7 — workflow reprise → vente", () => {
  const createIntake = () => {
    const store = useReconditioningStore.getState;
    const id = store().createFile();
    store().updateFile(id, {
      brand: "Apple",
      model: "iPhone 13",
      storage: "128 Go",
      customerName: "Client Test",
      provenance: "client",
      source: "Rachat client",
      prixAchat: 250,
      prixVentePrevu: 450,
      condition: blankCondition(),
    });
    return id;
  };

  it("Test 2 — reprise refusée : statut Refusé, hors stock et hors pipeline", () => {
    const store = useReconditioningStore.getState;
    const id = createIntake();
    store().markRefused(id, "Prix refusé par le client");

    const file = store().files.find((f) => f.id === id);
    expect(file?.status).toBe("Refusé");
    expect(DEVICE_STATUS_LABEL[file?.status ?? "Brouillon"]).toBe("Refusé");
    expect(file?.refusedReason).toBe("Prix refusé par le client");
    expect(pipelineStage(file?.status ?? "Brouillon")).toBeNull();
    // Pas comptés dans les KPI d'activité, pas d'achat tracé.
    const kpis = computeReconditioningKpis(store().files);
    expect(kpis.telephonesAchetes).toBe(0);
    expect(useBeharStore.getState().stockItems.some((s) => s.id === file?.stockItemId)).toBe(false);
  });

  it("Test 3 — reprise acceptée : statut Acheté, visible en pipeline, achat tracé une seule fois", () => {
    const store = useReconditioningStore.getState;
    const purchasesBefore = useBeharStore.getState().purchases.length;
    const id = createIntake();
    store().acceptIntake(id);

    const file = store().files.find((f) => f.id === id);
    expect(file?.status).toBe("Acheté");
    expect(pipelineStage("Acheté")).toBe("achete");
    expect(file?.purchaseLogged).toBe(true);
    expect(useBeharStore.getState().purchases.length).toBe(purchasesBefore + 1);

    const kpis = computeReconditioningKpis(store().files);
    expect(kpis.telephonesAchetes).toBe(1);
    expect(kpis.achetesCeMois).toBe(1);
  });

  it("Test 4 — envoi en atelier : statut En reconditionnement, colonne Diagnostic atelier", () => {
    const store = useReconditioningStore.getState;
    const id = createIntake();
    store().acceptIntake(id);
    store().sendToWorkshop(id);

    const file = store().files.find((f) => f.id === id);
    expect(file?.status).toBe("Reconditionnement");
    expect(DEVICE_STATUS_LABEL[file?.status ?? "Brouillon"]).toBe("En reconditionnement");
    expect(pipelineStage(file?.status ?? "Brouillon")).toBe("atelier");
  });

  it("Test 5 — pièce du stock utilisée : stock décrémenté, coût réel ajouté, marge recalculée", () => {
    const behar = useBeharStore.getState();
    const stockId = behar.addStockItem({
      name: "Écran iPhone 13",
      purchasePrice: 60,
      threshold: 1,
      supplier: "Fournisseur pièces",
      stock: 3,
      itemType: "part",
    });

    const store = useReconditioningStore.getState;
    const id = createIntake();
    store().acceptIntake(id);
    store().sendToWorkshop(id);
    store().addPart(id);
    const partId = store().files.find((f) => f.id === id)?.parts[0]?.id ?? "";
    store().updatePart(id, partId, { stockItemId: stockId, label: "Écran iPhone 13", cost: 60, quantity: 1 });
    store().updateFile(id, { laborCost: 30 });

    expect(useBeharStore.getState().stockItems.find((s) => s.id === stockId)?.stock).toBe(2);
    const file = store().files.find((f) => f.id === id);
    const margin = calculateEstimatedMargin({
      resalePrice: file?.prixVentePrevu,
      buyPrice: file?.prixAchat,
      partsCost: 60,
      laborCost: 30,
    });
    // 450 − 250 − 60 − 30 = 110.
    expect(margin?.amount).toBe(110);
  });

  it("Test 6 — prêt à vendre : statut correct, prix de vente présent", () => {
    const store = useReconditioningStore.getState;
    const id = createIntake();
    store().acceptIntake(id);
    store().sendToWorkshop(id);
    completeFinalDiagnostic(id);
    store().generateCertificate(id);

    const file = store().files.find((f) => f.id === id);
    expect(file?.status).toBe("Prêt à vendre");
    expect(pipelineStage(file?.status ?? "Brouillon")).toBe("pret");
    expect(file?.prixVentePrevu).toBe(450);
    expect(file?.readyAt).toBeTruthy();
  });

  it("Test 7 — vendu : marge réelle calculée, KPI vendus à jour, pas de double achat", () => {
    const store = useReconditioningStore.getState;
    const purchasesBefore = useBeharStore.getState().purchases.length;
    const id = createIntake();
    store().acceptIntake(id);
    store().sendToWorkshop(id);
    completeFinalDiagnostic(id);
    store().generateCertificate(id);
    store().publishToStock(id);
    // L'achat a été tracé à l'acceptation : publishToStock ne doit pas le retracer.
    expect(useBeharStore.getState().purchases.length).toBe(purchasesBefore + 1);

    store().markSold(id, 430);
    const file = store().files.find((f) => f.id === id);
    expect(file?.status).toBe("Vendu");
    const real = calculateRealMargin({ soldPrice: file?.soldPrice, buyPrice: file?.prixAchat });
    expect(real?.amount).toBe(180);

    const kpis = computeReconditioningKpis(store().files);
    expect(kpis.vendus).toBe(1);
    expect(kpis.margeReelleTotale).toBe(180);
  });
});
