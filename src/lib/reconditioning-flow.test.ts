// Tests du workflow reconditionnement simplifié :
// Comptoir (achat) → Atelier (travaux, pièces) → Mise en vente (stock + étiquette + QR)
// → Cas fournisseur → KPI Dashboard. Couvre les 6 scénarios obligatoires au niveau des stores.

import { beforeEach, describe, expect, it } from "vitest";

import { useBeharStore } from "@/lib/behar-store";
import { useConditionneStore } from "@/lib/conditionne-store";
import { computeBuyOffer, DEFAULT_RECOND_SETTINGS, estimatedMargin, type RecondSettings } from "@/lib/recond-settings";
import { buildCertificateData, certificatePublicPath } from "@/lib/reconditioning-certificate";
import {
  computeMargin,
  computeReconditioningKpis,
  createBlankFile,
  FUNCTIONAL_TESTS,
  PHYSICAL_CHECKS,
  type ReconditioningFile,
  SIMPLE_STATUS_LABEL,
  useReconditioningStore,
} from "@/lib/reconditioning-store";

const settings: RecondSettings = DEFAULT_RECOND_SETTINGS;

const COMPLETE_FILE_PATCH: Partial<ReconditioningFile> = {
  brand: "Apple",
  model: "iPhone 13",
  storage: "128 Go",
  color: "Minuit",
  cosmeticGrade: "B",
  prixAchat: 100,
  prixVentePrevu: 250,
};

function completeFinalDiagnostic(id: string, patch: Partial<ReconditioningFile> = {}) {
  const store = useReconditioningStore.getState;
  for (const key of FUNCTIONAL_TESTS) store().setTest(id, key, "OK");
  for (const key of PHYSICAL_CHECKS) store().setPhysical(id, key, "OK");
  store().updateFile(id, { cosmeticGrade: "A", batteryHealth: 90, warrantyMonths: 12, ...patch });
}

beforeEach(() => {
  useBeharStore.getState().resetDemo();
  useReconditioningStore.setState({ files: [], sequence: 1 });
  useConditionneStore.setState({ records: [], sequence: 1 });
});

/* ───────────────── Calcul d'offre (paramètres simples) ───────────────── */

describe("computeBuyOffer — prix d'achat depuis les paramètres simples", () => {
  it("applique les décotes défaut + batterie + grade", () => {
    const offer = computeBuyOffer(
      {
        brand: "Apple",
        model: "Inconnu XYZ",
        grade: "B",
        batteryTier: "80-84",
        defects: ["ecranCasse"],
        manualCote: 400,
      },
      settings,
    );
    expect(offer.coteBase).toBe(400);
    // Écran cassé (90) + batterie 80-84 (30) + grade B (12 % de 400 = 48)
    expect(offer.totalDecotes).toBe(90 + 30 + 48);
    expect(offer.prixMax).toBe(400 - 168);
    expect(offer.prixConseille).toBeLessThanOrEqual(offer.prixMax);
    expect(offer.travauxNecessaires).toBe(true);
    expect(offer.coutsPrevus).toBe(settings.defaultLaborCost);
  });

  it("ne compte pas deux fois la batterie quand elle est cochée comme défaut", () => {
    const withDefect = computeBuyOffer(
      { brand: "", model: "X", grade: "A+", batteryTier: "<80", defects: ["batterieFaible"], manualCote: 300 },
      settings,
    );
    // Seule la décote « batterie faible » (30) est appliquée, pas la décote tranche (<80 = 50) en plus.
    expect(withDefect.totalDecotes).toBe(settings.defectDecotes.batterieFaible);
  });

  it("appareil sain : aucun travail, prix conseillé respecte la marge minimale", () => {
    const offer = computeBuyOffer(
      { brand: "", model: "X", grade: "A+", batteryTier: ">=90", defects: [], manualCote: 400 },
      settings,
    );
    expect(offer.travauxNecessaires).toBe(false);
    expect(offer.coutsPrevus).toBe(0);
    const margin = estimatedMargin(offer, offer.prixConseille);
    expect(margin.margePct).toBeGreaterThanOrEqual(settings.minMarginPct);
  });

  it("le prix final reste modifiable manuellement (marge recalculée)", () => {
    const offer = computeBuyOffer(
      { brand: "", model: "X", grade: "B", batteryTier: ">=90", defects: [], manualCote: 400 },
      settings,
    );
    const manual = estimatedMargin(offer, offer.prixConseille + 50);
    expect(manual.marge).toBe(estimatedMargin(offer, offer.prixConseille).marge - 50);
  });
});

/* ───────────────── Test 1 — Achat client avec téléphone cassé ───────────────── */

describe("Test 1 — Achat comptoir iPhone 13 écran cassé, prix manuel", () => {
  it("crée la fiche, la référence interne et envoie en « À reconditionner »", () => {
    const offer = computeBuyOffer(
      {
        brand: "Apple",
        model: "iPhone 13",
        grade: "B",
        batteryTier: "80-84",
        defects: ["ecranCasse"],
        manualCote: 420,
      },
      settings,
    );
    const manualPrice = offer.prixConseille - 20; // prix modifié manuellement

    const id = useReconditioningStore.getState().createFile();
    useReconditioningStore.getState().updateFile(id, {
      brand: "Apple",
      model: "iPhone 13",
      storage: "128 Go",
      source: "Achat comptoir",
      cosmeticGrade: "B",
      batteryHealth: 84,
      prixAchat: manualPrice,
      prixVentePrevu: offer.prixRevente,
      laborCost: offer.coutsPrevus,
      status: "Reconditionnement",
      originalEstimation: {
        createdAt: new Date().toISOString(),
        coteDeBase: offer.coteBase,
        deductions: offer.decotes,
        defects: ["Écran cassé"],
        plannedCostsTotal: offer.coutsPrevus,
        prixAutomatique: offer.prixMax,
        prixConseille: offer.prixConseille,
        prixMaxAchat: offer.prixMax,
        prixFinalPaye: manualPrice,
        manualOverride: true,
        margeEstimee: estimatedMargin(offer, manualPrice).marge,
        riskLevel: "moyen",
        blockedBy: [],
        confirmationRequired: [],
      },
    });

    const file = useReconditioningStore.getState().files.find((f) => f.id === id);
    expect(file).toBeTruthy();
    // Référence interne unique générée (ACQ-AAAA-XXXXXX).
    expect(file?.number).toMatch(/^ACQ-\d{4}-\d{6}$/);
    // Visible dans l'Atelier sous « À reconditionner ».
    expect(SIMPLE_STATUS_LABEL[file?.status ?? "Brouillon"]).toBe("À reconditionner");
    // Prix modifié manuellement conservé + snapshot d'estimation.
    expect(file?.prixAchat).toBe(manualPrice);
    expect(file?.originalEstimation?.manualOverride).toBe(true);

    // Visible dans le Dashboard reconditionnement (KPI achetés ce mois + en cours).
    const kpis = computeReconditioningKpis(useReconditioningStore.getState().files);
    expect(kpis.achetesCeMois).toBe(1);
    expect(kpis.enRecond).toBe(1);

    // Le bon d'achat est généré à partir de la fiche (données présentes).
    expect(file?.originalEstimation?.deductions.length).toBeGreaterThan(0);
  });
});

/* ───────────────── Test 2 — Utilisation d'une pièce en atelier ───────────────── */

describe("Test 2 — Pièce « écran iPhone 13 » utilisée en atelier", () => {
  it("décrémente le stock, recalcule coût total et marge, garde le lien pièce ↔ fiche", () => {
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
    const id = store().createFile();
    store().updateFile(id, {
      brand: "Apple",
      model: "iPhone 13",
      prixAchat: 250,
      prixVentePrevu: 430,
      status: "Reconditionnement",
    });

    // Ajout de la pièce depuis le stock.
    store().addPart(id);
    const partId = store().files.find((f) => f.id === id)?.parts[0]?.id ?? "";
    store().updatePart(id, partId, { stockItemId: stockId, label: "Écran iPhone 13", cost: 60, quantity: 1 });

    // Stock décrémenté automatiquement.
    expect(useBeharStore.getState().stockItems.find((s) => s.id === stockId)?.stock).toBe(2);

    // Main-d'œuvre ajoutée.
    store().updateFile(id, { laborCost: 30 });

    const file = store().files.find((f) => f.id === id) as ReconditioningFile;
    const margin = computeMargin(file);
    // Coût total = achat 250 + pièce 60 + main-d'œuvre 30.
    expect(margin.coutTotal).toBe(340);
    // Marge potentielle recalculée : 430 - 340.
    expect(margin.margeBrute).toBe(90);
    // Pièce liée à la fiche (traçabilité).
    expect(file.parts[0]?.stockItemId).toBe(stockId);
    expect(file.parts[0]?.stockDecremented).toBe(true);

    // Le retrait de la pièce restaure le stock.
    store().removePart(id, partId);
    expect(useBeharStore.getState().stockItems.find((s) => s.id === stockId)?.stock).toBe(3);
  });
});

/* ───────────────── Test 3 — Mise en vente ───────────────── */

describe("Test 3 — Prêt à vendre puis mise en vente", () => {
  it("valide le test final, publie en stock vente, génère fiche + étiquette + QR", () => {
    const store = useReconditioningStore.getState;
    const id = store().createFile();
    store().updateFile(id, {
      brand: "Apple",
      model: "iPhone 13",
      storage: "128 Go",
      imei: "353305113632356",
      prixAchat: 250,
      prixVentePrevu: 449,
      cosmeticGrade: "A",
      batteryHealth: 88,
      warrantyMonths: 12,
      status: "Reconditionnement",
    });

    // « Valider le test final » → prêt à vendre + date de mise en vente.
    completeFinalDiagnostic(id, { cosmeticGrade: "A", batteryHealth: 88 });
    store().generateCertificate(id);
    let file = store().files.find((f) => f.id === id) as ReconditioningFile;
    expect(file.status).toBe("Prêt à vendre");
    expect(file.readyAt).toBeTruthy();

    const kpisBefore = computeReconditioningKpis(store().files);
    expect(kpisBefore.prets).toBe(1);

    // « Mettre en vente » → stock vente + achat tracé.
    store().updateFile(id, { saleLocation: "Vitrine A" });
    store().publishToStock(id);
    file = store().files.find((f) => f.id === id) as ReconditioningFile;
    expect(file.publishedToStock).toBe(true);
    expect(SIMPLE_STATUS_LABEL[file.status]).toBe("Mis en vente");
    expect(file.listedAt).toBeTruthy();

    // Article de stock créé avec la référence interne / IMEI.
    const stockItem = useBeharStore.getState().stockItems.find((s) => s.id === file.stockItemId);
    expect(stockItem).toBeTruthy();
    expect(stockItem?.salePrice).toBe(449);

    // Étiquette : toutes les infos requises présentes dans les données du certificat.
    const cert = buildCertificateData(file);
    expect(cert.model).toBe("iPhone 13");
    expect(cert.storage).toBe("128 Go");
    expect(cert.price).toBe(449);
    expect(cert.warrantyMonths).toBe(12);
    expect(cert.batteryHealth).toBe(88);
    expect(cert.ref).toBe(file.number);

    // QR client : token public stable, données live côté Supabase (payload encodé = legacy seulement).
    const path = certificatePublicPath(cert);
    expect(path.startsWith("/suivi/appareil/rd-")).toBe(true);
    expect(path).not.toContain("?d=");
    expect(path).toBe(`/suivi/appareil/${encodeURIComponent(cert.publicToken)}`);

    // KPI : reste compté dans « prêts / en vente ».
    const kpis = computeReconditioningKpis(store().files);
    expect(kpis.prets).toBe(1);
    expect(kpis.valeurStock).toBe(449);
  });
});

/* ───────────────── Test 4 — Achat fournisseur déjà prêt ───────────────── */

describe("Test 4 — Samsung S23 fournisseur déjà reconditionné", () => {
  it("va directement en stock vente sans passer par l'atelier", () => {
    const store = useReconditioningStore.getState;
    const purchasesBefore = useBeharStore.getState().purchases.length;

    const id = store().createFile();
    store().updateFile(id, {
      brand: "Samsung",
      model: "Galaxy S23",
      storage: "256 Go",
      color: "Noir",
      source: "Lot fournisseur",
      supplierName: "GreenPhone SARL",
      cosmeticGrade: "A",
      batteryHealth: 91,
      prixAchat: 320,
      prixVentePrevu: 480,
      warrantyMonths: 12,
      status: "Prêt à vendre",
    });
    completeFinalDiagnostic(id, { cosmeticGrade: "A", batteryHealth: 91 });
    store().generateCertificate(id);
    store().publishToStock(id);

    const file = store().files.find((f) => f.id === id) as ReconditioningFile;
    // Jamais passé par un statut atelier : directement mis en vente.
    expect(SIMPLE_STATUS_LABEL[file.status]).toBe("Mis en vente");
    expect(file.supplierName).toBe("GreenPhone SARL");

    // Stock vente + achat fournisseur tracé (une seule entrée).
    expect(useBeharStore.getState().purchases.length).toBe(purchasesBefore + 1);
    expect(useBeharStore.getState().stockItems.some((s) => s.id === file.stockItemId)).toBe(true);

    // KPI stock reconditionné mis à jour.
    const kpis = computeReconditioningKpis(store().files);
    expect(kpis.valeurStock).toBe(480);
    expect(kpis.prets).toBe(1);
  });
});

/* ───────────────── Test 5 — Fournisseur à reconditionner ───────────────── */

describe("Test 5 — Téléphone fournisseur à reconditionner", () => {
  it("part en atelier avec le statut « À reconditionner » et accepte pièces + main-d'œuvre", () => {
    const store = useReconditioningStore.getState;
    const id = store().createFile();
    store().updateFile(id, {
      brand: "Samsung",
      model: "Galaxy S21",
      storage: "128 Go",
      color: "Gris",
      cosmeticGrade: "B",
      source: "Lot fournisseur",
      supplierName: "GreenPhone SARL",
      prixAchat: 150,
      prixVentePrevu: 300,
      status: "Reconditionnement",
    });

    const file = store().files.find((f) => f.id === id) as ReconditioningFile;
    expect(SIMPLE_STATUS_LABEL[file.status]).toBe("À reconditionner");

    // Pièces, main-d'œuvre et statut « En attente pièce » disponibles.
    store().addPart(id);
    const partId = store().files.find((f) => f.id === id)?.parts[0]?.id ?? "";
    store().updatePart(id, partId, { label: "Batterie S21", cost: 25 });
    store().updateFile(id, { laborCost: 20, status: "En attente pièce" });

    const updated = store().files.find((f) => f.id === id) as ReconditioningFile;
    expect(computeMargin(updated).coutTotal).toBe(150 + 25 + 20);
    expect(SIMPLE_STATUS_LABEL[updated.status]).toBe("En attente pièce");

    // Test final possible ensuite.
    completeFinalDiagnostic(id, { cosmeticGrade: "B", batteryHealth: 86 });
    store().generateCertificate(id);
    expect(store().files.find((f) => f.id === id)?.status).toBe("Prêt à vendre");
  });

  it("sépare diagnostic initial interne et certificat public final", () => {
    const store = useReconditioningStore.getState;
    const id = store().createFile();
    store().updateFile(id, {
      brand: "Apple",
      model: "iPhone 13",
      storage: "128 Go",
      color: "Bleu",
      cosmeticGrade: "B",
      prixAchat: 220,
      prixVentePrevu: 420,
      batteryHealth: 82,
      warrantyMonths: 12,
      status: "Reconditionnement",
      condition: {
        grade: "B",
        batteryPct: 82,
        batteryTier: "80-84",
        screen: "casse",
        backGlass: "ok",
        biometrics: "ok",
        network: "ok",
        camera: "ok",
        oxidation: "non",
        lock: "libre",
        imeiStatus: "propre",
      },
      originalEstimation: {
        createdAt: new Date().toISOString(),
        coteDeBase: 420,
        deductions: [{ label: "Écran cassé", amount: 90 }],
        defects: ["Écran cassé"],
        plannedCostsTotal: 90,
        prixAutomatique: 240,
        prixConseille: 220,
        prixMaxAchat: 240,
        prixFinalPaye: 220,
        manualOverride: false,
        margeEstimee: 110,
        riskLevel: "moyen",
        blockedBy: [],
        confirmationRequired: [],
      },
    });
    store().addPart(id);
    const partId = store().files.find((f) => f.id === id)?.parts[0]?.id ?? "";
    store().updatePart(id, partId, { label: "Écran OLED iPhone 13", cost: 80, quantity: 1 });
    completeFinalDiagnostic(id, { cosmeticGrade: "A", batteryHealth: 90 });

    const file = store().files.find((f) => f.id === id) as ReconditioningFile;
    const cert = buildCertificateData(file);

    expect(cert.screenStatus).toBe("Remplacé / testé OK");
    expect(cert.defects.join(" ")).not.toContain("cassé");
    expect(cert.protocolPoints).toBe(18);
    expect(cert.validatedPoints).toBe(18);
    expect(file.originalEstimation?.defects).toContain("Écran cassé");
    expect(file.internalQrToken).toMatch(/^ri-/);
  });
});

/* ───────────────── Test 6 — KPI Dashboard ───────────────── */

describe("Test 6 — KPI Dashboard reconditionnement", () => {
  const mk = (patch: Partial<ReconditioningFile>): ReconditioningFile => ({
    ...createBlankFile(1),
    ...COMPLETE_FILE_PATCH,
    ...patch,
  });

  it("tous les KPI s'agrègent automatiquement (achats, en cours, prêts, vendus, marges, stock)", () => {
    const now = new Date().toISOString();
    const files: ReconditioningFile[] = [
      mk({ status: "Évaluation", prixAchat: 100, prixVentePrevu: 180 }),
      mk({ status: "Reconditionnement", prixAchat: 200, prixVentePrevu: 350 }),
      mk({ status: "En attente pièce", prixAchat: 120, prixVentePrevu: 250 }),
      mk({ status: "Prêt à vendre", prixAchat: 180, prixVentePrevu: 320 }),
      mk({ status: "En stock", prixAchat: 220, prixVentePrevu: 400 }),
      mk({
        brand: "Apple",
        model: "iPhone 13",
        status: "Vendu",
        prixAchat: 250,
        laborCost: 0,
        soldPrice: 420,
        soldAt: now,
      }),
      mk({
        brand: "Samsung",
        model: "Galaxy S23",
        status: "Vendu",
        prixAchat: 300,
        laborCost: 0,
        soldPrice: 380,
        soldAt: now,
      }),
      mk({ status: "Bloqué", prixAchat: 60 }),
    ];
    const k = computeReconditioningKpis(files);

    expect(k.achetesCeMois).toBe(8);
    // En cours : à diagnostiquer (1) + reconditionnement/attente pièce (2).
    expect(k.aTester).toBe(1);
    expect(k.enRecond).toBe(2);
    expect(k.enAttentePiece).toBe(1);
    // Prêts / en vente.
    expect(k.prets).toBe(2);
    expect(k.valeurStock).toBe(320 + 400);
    // Vendus + marge réalisée (420-250) + (380-300).
    expect(k.vendus).toBe(2);
    expect(k.margeReelleTotale).toBe(170 + 80);
    // Marge potentielle uniquement sur les non vendus (positives).
    expect(k.margeEstimeeTotale).toBe(80 + 150 + 130 + 140 + 180);
    // Investissement total (hors abandonnés).
    expect(k.valeurTotaleAchat).toBe(100 + 200 + 120 + 180 + 220 + 250 + 300 + 60);
    // Bloqués.
    expect(k.bloques).toBe(1);
    // Top modèles rentables triés par marge.
    expect(k.topModels[0]).toEqual({ model: "Apple iPhone 13", count: 1, margin: 170 });
    expect(k.topModels[1]).toEqual({ model: "Samsung Galaxy S23", count: 1, margin: 80 });
  });
});
