import { beforeEach, describe, expect, it } from "vitest";

import { useBeharStore } from "@/lib/behar-store";
import { blankInput, DEFAULT_ESTIMATION_SETTINGS, estimate, useConditionneStore } from "@/lib/conditionne-store";
import {
  computeReconditioningKpis,
  createBlankFile,
  FUNCTIONAL_TESTS,
  PHYSICAL_CHECKS,
  realMargin,
  type ReconditioningFile,
  useReconditioningStore,
} from "@/lib/reconditioning-store";
import { isDeviceComplete } from "@/lib/reconditioning-validation";

beforeEach(() => {
  useBeharStore.getState().resetDemo();
});

function completeFinalDiagnostic(id: string) {
  const store = useReconditioningStore.getState;
  for (const key of FUNCTIONAL_TESTS) store().setTest(id, key, "OK");
  for (const key of PHYSICAL_CHECKS) store().setPhysical(id, key, "OK");
  store().updateFile(id, { batteryHealth: 90, warrantyMonths: 12 });
}

describe("Reprise (Conditionné) → Achats", () => {
  it("applique une règle modèle iPhone 14 écran cassé à -50 €", () => {
    const cs = useConditionneStore.getState();
    useBeharStore.getState().addPriceBookItem({
      typeAppareil: "smartphone",
      marque: "Apple",
      modele: "iPhone 14",
      reparation: "Remplacement écran",
      piece: "Écran iPhone 14",
      qualite: "Standard",
      prixAchat: 50,
      prixVentePiece: 110,
      mainOeuvre: 0,
      source: "manual",
    });
    const input = {
      ...blankInput(),
      brand: "Apple",
      model: "iPhone 14",
      cosmeticGrade: "A+" as const,
      selectedDefects: ["ecran_casse" as const],
      plannedCosts: { ecran: 0, batterie: 0, dos: 0, camera: 0, connecteur: 0, mainOeuvre: 0, autres: 0 },
    };
    const estimation = estimate(input, cs.rules, DEFAULT_ESTIMATION_SETTINGS);
    expect(estimation.deductions.find((d) => d.label.includes("Écran cassé"))?.amount).toBe(50);
    expect(estimation.prixAutomatique).toBe(estimation.coteDeBase - 50);
  });

  it("cumule écran cassé et batterie faible", () => {
    const cs = useConditionneStore.getState();
    useBeharStore.getState().addPriceBookItem({
      typeAppareil: "smartphone",
      marque: "Apple",
      modele: "iPhone 14",
      reparation: "Remplacement écran",
      piece: "Écran iPhone 14",
      qualite: "Standard",
      prixAchat: 50,
      prixVentePiece: 110,
      mainOeuvre: 0,
      source: "manual",
    });
    useBeharStore.getState().addPriceBookItem({
      typeAppareil: "smartphone",
      marque: "Apple",
      modele: "iPhone 14",
      reparation: "Remplacement batterie",
      piece: "Batterie iPhone 14",
      qualite: "Standard",
      prixAchat: 30,
      prixVentePiece: 80,
      mainOeuvre: 0,
      source: "manual",
    });
    const input = {
      ...blankInput(),
      brand: "Apple",
      model: "iPhone 14",
      cosmeticGrade: "A+" as const,
      selectedDefects: ["ecran_casse" as const, "batterie_faible" as const],
      plannedCosts: { ecran: 0, batterie: 0, dos: 0, camera: 0, connecteur: 0, mainOeuvre: 0, autres: 0 },
    };
    const estimation = estimate(input, cs.rules, DEFAULT_ESTIMATION_SETTINGS);
    expect(estimation.totalDeductions).toBe(80);
  });

  it("enregistre la raison quand le prix final est modifié manuellement", () => {
    const cs = useConditionneStore.getState();
    const input = {
      ...blankInput(),
      brand: "Apple",
      model: "iPhone 14",
      cosmeticGrade: "A+" as const,
      selectedDefects: ["ecran_casse" as const],
      plannedCosts: { ecran: 0, batterie: 0, dos: 0, camera: 0, connecteur: 0, mainOeuvre: 0, autres: 0 },
      manualReason: "Écran très abîmé + risque Face ID",
    };
    const estimation = estimate(input, cs.rules, DEFAULT_ESTIMATION_SETTINGS);
    const recordId = cs.saveRecord({
      input,
      estimation,
      prixPropose: Math.max(0, estimation.prixConseille - 20),
      manualReason: input.manualReason,
      decision: "Estimation enregistrée",
    });
    const record = useConditionneStore.getState().records.find((r) => r.id === recordId);
    expect(record?.manualOverride).toBe(true);
    expect(record?.manualReason).toBe(input.manualReason);
  });

  it("un rachat direct crée un achat téléphone ; un envoi en reconditionnement n'en crée pas (anti double-comptage)", () => {
    const cs = useConditionneStore.getState();
    const input = { ...blankInput(), brand: "Apple", model: "iPhone 12", imei: "111222" };
    const estimation = estimate(input, cs.rules);

    const before = useBeharStore.getState().purchases.length;
    cs.saveRecord({ input, estimation, prixPropose: 120, decision: "Achat créé" });
    const afterBuy = useBeharStore.getState().purchases;
    expect(afterBuy.length).toBe(before + 1);
    expect(afterBuy[0].kind).toBe("telephone");
    expect(afterBuy[0].source).toBe("Rachat client");

    const count = useBeharStore.getState().purchases.length;
    cs.saveRecord({ input, estimation, prixPropose: 120, decision: "Envoyé en reconditionnement" });
    expect(useBeharStore.getState().purchases.length).toBe(count);
  });
});

describe("Reconditionnement → stock + achat", () => {
  it("publishToStock crée un article de stock et exactement un achat lié", () => {
    const id = useReconditioningStore.getState().createFile();
    useReconditioningStore.getState().updateFile(id, {
      brand: "Apple",
      model: "iPhone 12",
      storage: "128 Go",
      color: "Noir",
      cosmeticGrade: "B",
      prixAchat: 150,
      prixVentePrevu: 300,
      status: "Reconditionnement",
    });
    completeFinalDiagnostic(id);
    useReconditioningStore.getState().generateCertificate(id);

    const stockBefore = useBeharStore.getState().stockItems.length;
    const purchasesBefore = useBeharStore.getState().purchases.length;

    useReconditioningStore.getState().publishToStock(id);

    expect(useBeharStore.getState().stockItems.length).toBe(stockBefore + 1);
    // Un seul achat malgré la création d'un StockItem (skipPurchaseLog) → pas de double comptage.
    expect(useBeharStore.getState().purchases.length).toBe(purchasesBefore + 1);

    const file = useReconditioningStore.getState().files.find((entry) => entry.id === id);
    expect(file?.publishedToStock).toBe(true);
    expect(file?.stockItemId).toBeTruthy();

    const purchase = useBeharStore.getState().purchases[0];
    expect(purchase.source).toBe("Reconditionnement");
    expect(purchase.kind).toBe("telephone");
    expect(purchase.reconditioningFileId).toBe(id);
  });

  it("markSold retire l'appareil publié du stock boutique et reopenFile le restaure", () => {
    const id = useReconditioningStore.getState().createFile();
    useReconditioningStore.getState().updateFile(id, {
      brand: "Apple",
      model: "iPhone 12",
      storage: "128 Go",
      color: "Noir",
      cosmeticGrade: "B",
      prixAchat: 150,
      prixVentePrevu: 300,
      status: "Reconditionnement",
    });
    completeFinalDiagnostic(id);
    useReconditioningStore.getState().generateCertificate(id);
    useReconditioningStore.getState().publishToStock(id);

    const stockItemId = useReconditioningStore.getState().files.find((f) => f.id === id)?.stockItemId ?? "";
    expect(stockItemId).toBeTruthy();
    expect(useBeharStore.getState().stockItems.find((s) => s.id === stockItemId)?.stock).toBe(1);

    useReconditioningStore.getState().markSold(id, 280);
    const sold = useReconditioningStore.getState().files.find((f) => f.id === id);
    expect(sold?.status).toBe("Vendu");
    expect(sold?.saleStockDecremented).toBe(true);
    expect(useBeharStore.getState().stockItems.find((s) => s.id === stockItemId)?.stock).toBe(0);

    useReconditioningStore.getState().reopenFile(id);
    const reopened = useReconditioningStore.getState().files.find((f) => f.id === id);
    expect(reopened?.status).toBe("En stock");
    expect(reopened?.saleStockDecremented).toBeUndefined();
    expect(useBeharStore.getState().stockItems.find((s) => s.id === stockItemId)?.stock).toBe(1);
  });

  it("paySale est verrouillé : l'appareil reconditionné reste en stock", () => {
    const id = useReconditioningStore.getState().createFile();
    useReconditioningStore.getState().updateFile(id, {
      brand: "Apple",
      model: "iPhone 13",
      storage: "128 Go",
      color: "Bleu",
      cosmeticGrade: "A",
      prixAchat: 180,
      prixVentePrevu: 420,
      status: "Reconditionnement",
    });
    completeFinalDiagnostic(id);
    useReconditioningStore.getState().generateCertificate(id);
    useReconditioningStore.getState().publishToStock(id);

    const file = useReconditioningStore.getState().files.find((f) => f.id === id);
    const stockItemId = file?.stockItemId ?? "";
    expect(stockItemId).toBeTruthy();

    const saleId = useBeharStore.getState().addSale({
      customerId: "counter",
      customerName: "Client comptoir",
      lines: [
        {
          stockItemId,
          name: "iPhone 13 reconditionné",
          itemKind: "refurbished-phone",
          quantity: 1,
          unitPrice: 399,
          total: 399,
          reconditioningFileId: id,
        },
      ],
    });
    // Frontière de paiement : l'encaissement local est verrouillé, la vente reste en brouillon.
    const paymentId = useBeharStore.getState().paySale(saleId, "Carte bancaire");
    expect(paymentId).toBe("");

    const notSold = useReconditioningStore.getState().files.find((f) => f.id === id);
    expect(notSold?.status).toBe("En stock");
    expect(notSold?.saleId).toBeUndefined();
    expect(useBeharStore.getState().stockItems.find((s) => s.id === stockItemId)?.stock).toBe(1);
    expect(
      useBeharStore.getState().stockMovements.some((movement) => movement.movementType === "reconditioned_device_sold"),
    ).toBe(false);
  });

  it("publishToStock marque l'achat comme tracé — acceptIntake ne le recompte pas ensuite", () => {
    const id = useReconditioningStore.getState().createFile();
    useReconditioningStore.getState().updateFile(id, {
      brand: "Apple",
      model: "iPhone 12",
      storage: "128 Go",
      color: "Noir",
      cosmeticGrade: "B",
      prixAchat: 150,
      prixVentePrevu: 300,
      status: "Reconditionnement",
    });
    completeFinalDiagnostic(id);
    useReconditioningStore.getState().generateCertificate(id);
    useReconditioningStore.getState().publishToStock(id);

    expect(useReconditioningStore.getState().files.find((f) => f.id === id)?.purchaseLogged).toBe(true);

    const purchasesAfterPublish = useBeharStore.getState().purchases.length;
    useReconditioningStore.getState().acceptIntake(id);
    expect(useBeharStore.getState().purchases.length).toBe(purchasesAfterPublish);
  });

  it("une pièce de reconditionnement décrémente le stock central et le restaure au retrait", () => {
    const stockId = useBeharStore.getState().addStockItem({
      name: "Écran recond",
      purchasePrice: 30,
      threshold: 1,
      supplier: "S",
      stock: 5,
      itemType: "part",
    });
    const fileId = useReconditioningStore.getState().createFile();
    useReconditioningStore.getState().addPart(fileId);
    const partId = useReconditioningStore.getState().files.find((f) => f.id === fileId)?.parts[0]?.id ?? "";
    expect(partId).toBeTruthy();

    useReconditioningStore.getState().updatePart(fileId, partId, { stockItemId: stockId, quantity: 1, cost: 30 });
    expect(useBeharStore.getState().stockItems.find((s) => s.id === stockId)?.stock).toBe(4);

    useReconditioningStore.getState().removePart(fileId, partId);
    expect(useBeharStore.getState().stockItems.find((s) => s.id === stockId)?.stock).toBe(5);
  });
});

describe("KPI reconditionnement", () => {
  const mk = (patch: Partial<ReconditioningFile>): ReconditioningFile => ({
    ...createBlankFile(1),
    brand: "Apple",
    model: "iPhone 13",
    storage: "128 Go",
    color: "Minuit",
    cosmeticGrade: "B",
    prixAchat: 100,
    prixVentePrevu: 250,
    ...patch,
  });

  it("computeReconditioningKpis agrège statuts, valeur stock et marge réelle", () => {
    const files: ReconditioningFile[] = [
      mk({ status: "Brouillon" }),
      mk({ status: "Reconditionnement" }),
      mk({ status: "Prêt à vendre", prixVentePrevu: 300 }),
      mk({ status: "Vendu", prixAchat: 100, laborCost: 0, soldPrice: 180, soldAt: new Date().toISOString() }),
      mk({ status: "Bloqué" }),
    ];
    const k = computeReconditioningKpis(files);
    expect(k.aTester).toBe(1);
    expect(k.enRecond).toBe(1);
    expect(k.prets).toBe(1);
    expect(k.vendus).toBe(1);
    expect(k.bloques).toBe(1);
    expect(k.valeurStock).toBe(300);
    expect(k.margeReelleTotale).toBe(80);
    expect(k.tauxBlocage).toBe(20);
  });

  it("agrège les KPI issus des estimations d'origine", () => {
    const files: ReconditioningFile[] = [
      mk({
        status: "Reconditionnement",
        prixAchat: 250,
        originalEstimation: {
          createdAt: new Date().toISOString(),
          coteDeBase: 350,
          deductions: [
            { label: "Écran cassé", amount: 50 },
            { label: "Batterie faible", amount: 30 },
          ],
          defects: ["Écran cassé", "Batterie faible"],
          plannedCostsTotal: 0,
          prixAutomatique: 270,
          prixConseille: 270,
          prixMaxAchat: 270,
          prixFinalPaye: 250,
          manualReason: "Risque Face ID",
          manualOverride: true,
          margeEstimee: 120,
          riskLevel: "moyen",
          blockedBy: [],
          confirmationRequired: [],
        },
      }),
    ];
    const k = computeReconditioningKpis(files);
    expect(k.telephonesAchetes).toBe(1);
    expect(k.valeurTotaleAchat).toBe(250);
    expect(k.decoteMoyenne).toBe(80);
    expect(k.modificationsManuelles).toBe(1);
  });

  it("realMargin n'existe que pour un téléphone vendu", () => {
    expect(realMargin(mk({ status: "Vendu", prixAchat: 100, laborCost: 0, soldPrice: 180 }))?.margeReelle).toBe(80);
    expect(realMargin(mk({ status: "Prêt à vendre" }))).toBeNull();
  });

  it("markSold et markBlocked mettent à jour le statut et la marge réelle", () => {
    const store = useReconditioningStore.getState;
    const soldId = store().createFile();
    store().updateFile(soldId, {
      brand: "Apple",
      model: "iPhone 13",
      storage: "128 Go",
      color: "Minuit",
      cosmeticGrade: "A",
      prixAchat: 100,
      prixVentePrevu: 250,
      laborCost: 0,
      status: "Prêt à vendre",
    });
    store().markSold(soldId, 200);
    const sold = store().files.find((f) => f.id === soldId);
    expect(sold?.status).toBe("Vendu");
    expect(sold?.soldPrice).toBe(200);
    expect(sold ? realMargin(sold)?.margeReelle : null).toBe(100);

    const blockedId = store().createFile();
    store().markBlocked(blockedId, "iCloud bloqué");
    expect(store().files.find((f) => f.id === blockedId)?.status).toBe("Bloqué");
    expect(store().files.find((f) => f.id === blockedId)?.blockedReason).toBe("iCloud bloqué");
  });

  it("un appareil incomplet n'est ni complet ni compté comme vendu", () => {
    const incomplete = mk({ brand: "", model: "", storage: "", status: "Vendu", soldPrice: 200 });
    expect(isDeviceComplete(incomplete)).toBe(false);
    const k = computeReconditioningKpis([incomplete]);
    expect(k.vendus).toBe(0);
    expect(k.margeReelleTotale).toBe(0);
    expect(k.bloques).toBe(1);
  });
});
