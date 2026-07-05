import { beforeEach, describe, expect, it } from "vitest";

import { useBeharStore } from "@/lib/behar-store";

const store = () => useBeharStore.getState();

const nowIso = () => new Date().toISOString();

beforeEach(() => {
  // Réinitialise l'état métier (seed) avant chaque test — l'utilisateur par défaut est admin.
  store().resetDemo();
});

describe("Achats — registre central", () => {
  it("addPurchase crée une entrée avec id + numéro stables et total calculé", () => {
    const id = store().addPurchase({ kind: "piece", source: "Manuel", label: "Écran test", unitCost: 30, quantity: 2 });
    const purchase = store().purchases.find((entry) => entry.id === id);
    expect(purchase).toBeTruthy();
    expect(id).toMatch(/^pur_/);
    expect(purchase?.number).toMatch(/^ACH-\d{4}-\d{6}$/);
    expect(purchase?.total).toBe(60);
  });

  it("restockItem enregistre un achat pièce lié au stock", () => {
    const stockId = store().addStockItem({
      name: "Batterie X",
      purchasePrice: 12,
      threshold: 2,
      supplier: "Fournisseur A",
      stock: 0,
      itemType: "part",
    });
    const before = store().purchases.length;
    store().restockItem(stockId, 5);
    const purchases = store().purchases;
    expect(purchases.length).toBe(before + 1);
    expect(purchases[0].source).toBe("Réapprovisionnement");
    expect(purchases[0].stockItemId).toBe(stockId);
    expect(purchases[0].quantity).toBe(5);
  });

  it("addStockItem logue un achat pour une pièce avec stock, mais respecte skipPurchaseLog", () => {
    store().addStockItem({
      name: "Écran A",
      purchasePrice: 40,
      threshold: 1,
      supplier: "S",
      stock: 3,
      itemType: "part",
    });
    expect(store().purchases.some((purchase) => purchase.source === "Création pièce")).toBe(true);

    const count = store().purchases.length;
    store().addStockItem({
      name: "Produit reconditionné",
      purchasePrice: 100,
      threshold: 0,
      supplier: "S",
      stock: 1,
      itemType: "product",
      skipPurchaseLog: true,
    });
    expect(store().purchases.length).toBe(count);
  });

  it("deletePurchase retire l'entrée", () => {
    const id = store().addPurchase({ kind: "piece", source: "Manuel", label: "X", unitCost: 10 });
    store().deletePurchase(id);
    expect(store().purchases.some((purchase) => purchase.id === id)).toBe(false);
  });
});

describe("Base client", () => {
  it("réutilise un client existant quand le téléphone existe déjà", () => {
    const firstId = store().addCustomer({
      email: "marie.originale@example.com",
      name: "Marie Client",
      phone: "+33 6 12 34 56 78",
    });
    const secondId = store().addCustomer({
      email: "autre@example.com",
      name: "Marie Nouveau Passage",
      phone: "06 12 34 56 78",
    });

    expect(secondId).toBe(firstId);
    expect(store().customers.filter((customer) => customer.id === firstId)).toHaveLength(1);
    expect(store().selectedCustomerId).toBe(firstId);
  });

  it("réutilise un client existant quand l'email existe déjà", () => {
    const firstId = store().addCustomer({
      email: "client@example.com",
      name: "Client Email",
      phone: "06 00 00 00 01",
    });
    const secondId = store().addCustomer({
      email: " CLIENT@example.com ",
      name: "Client Email Retour",
      phone: "06 00 00 00 02",
    });

    expect(secondId).toBe(firstId);
    expect(store().customers.filter((customer) => customer.email.toLowerCase() === "client@example.com")).toHaveLength(
      1,
    );
  });
});

describe("Stock ↔ réparation", () => {
  it("addPartToRepair décrémente le stock (réservation), confirm ne re-décrémente pas, retrait restaure", () => {
    const customerId = store().addCustomer({ name: "Client Test" });
    const stockId = store().addStockItem({
      name: "Écran iPhone 12",
      purchasePrice: 40,
      salePrice: 90,
      threshold: 1,
      supplier: "S",
      stock: 5,
      itemType: "part",
    });
    const repairId = store().addRepair({
      customerId,
      device: "iPhone 12",
      issue: "Écran cassé",
      status: "Reçu",
      amount: 90,
      notes: "",
      droppedAt: nowIso(),
      technician: "Tech",
    });

    // Ajouter la pièce sort 1 du stock immédiatement (5 → 4).
    expect(store().addPartToRepair(repairId, stockId, 1)).toBe(true);
    expect(store().stockItems.find((item) => item.id === stockId)?.stock).toBe(4);

    // Confirmer l'utilisation ne re-décrémente pas (reste 4), mais marque la pièce "utilisée".
    expect(store().confirmPartUsage(repairId, stockId)).toBe(true);
    expect(store().stockItems.find((item) => item.id === stockId)?.stock).toBe(4);
    expect(
      store()
        .repairs.find((r) => r.id === repairId)
        ?.parts.find((p) => p.stockItemId === stockId)?.confirmed,
    ).toBe(true);

    // Retirer la pièce restitue le stock (4 → 5).
    expect(store().removePartFromRepair(repairId, stockId)).toBe(true);
    expect(store().stockItems.find((item) => item.id === stockId)?.stock).toBe(5);
  });

  it("retirer une pièce réservée (non confirmée) restaure aussi le stock", () => {
    const customerId = store().addCustomer({ name: "Client Réservé" });
    const stockId = store().addStockItem({
      name: "Batterie iPhone 12",
      purchasePrice: 15,
      salePrice: 40,
      threshold: 1,
      supplier: "S",
      stock: 3,
      itemType: "part",
    });
    const repairId = store().addRepair({
      customerId,
      device: "iPhone 12",
      issue: "Batterie",
      status: "Reçu",
      amount: 40,
      notes: "",
      droppedAt: nowIso(),
      technician: "Tech",
    });

    expect(store().addPartToRepair(repairId, stockId, 1)).toBe(true);
    expect(store().stockItems.find((item) => item.id === stockId)?.stock).toBe(2);
    // Retrait sans confirmation → le stock remonte quand même.
    expect(store().removePartFromRepair(repairId, stockId)).toBe(true);
    expect(store().stockItems.find((item) => item.id === stockId)?.stock).toBe(3);
  });
});

describe("Règlement / CA", () => {
  it("le CA ne compte que les paiements réglés (Payé)", () => {
    const customerId = store().addCustomer({ name: "Client CA" });
    const repairId = store().addRepair({
      customerId,
      device: "iPhone",
      issue: "Diag",
      status: "Prêt",
      amount: 100,
      notes: "",
      droppedAt: nowIso(),
      technician: "Tech",
    });

    // Avant règlement : aucun paiement Payé → CA = 0.
    expect(store().payments.filter((payment) => payment.status === "Payé").length).toBe(0);

    store().recordRepairSettlement(repairId, {
      status: "Réglé",
      amount: 100,
      date: nowIso(),
      method: "Espèces",
      confirmExternal: true,
    });

    const paid = store().payments.filter((payment) => payment.status === "Payé");
    expect(paid.length).toBeGreaterThanOrEqual(1);
    expect(paid.reduce((sum, payment) => sum + payment.amount, 0)).toBe(100);
  });

  it("la restitution avec règlement clôture le dossier", () => {
    const customerId = store().addCustomer({ name: "Client Clôture" });
    const repairId = store().addRepair({
      customerId,
      device: "iPhone",
      issue: "Écran",
      status: "Prêt",
      amount: 100,
      notes: "",
      droppedAt: nowIso(),
      technician: "Tech",
    });

    const ok = store().closeDossierWithSettlement(repairId, {
      status: "Réglé",
      amount: 100,
      date: nowIso(),
      method: "Espèces",
      confirmExternal: true,
    });

    expect(ok).toBe(true);
    expect(store().repairs.find((repair) => repair.id === repairId)?.status).toBe("Clôturé");
    expect(store().payments.some((payment) => payment.repairId === repairId && payment.status === "Payé")).toBe(true);
  });

  it("un dossier rendu sans règlement indiqué reste hors CA et apparaît comme à finaliser", () => {
    const customerId = store().addCustomer({ name: "Client À finaliser" });
    const repairId = store().addRepair({
      customerId,
      device: "iPhone",
      issue: "Écran",
      status: "Prêt",
      amount: 120,
      notes: "",
      droppedAt: nowIso(),
      technician: "Tech",
    });

    const ok = store().closeDossierWithSettlement(repairId, {
      status: "Non réglé",
      amount: 0,
      date: nowIso(),
      method: "Espèces",
      confirmExternal: false,
    });
    expect(ok).toBe(true);

    const repair = store().repairs.find((entry) => entry.id === repairId);
    expect(repair?.status).toBe("Clôturé");
    expect(repair?.paymentStatus).not.toBe("Réglée");
    // CA validé = paiements "Payé" → 0 pour ce dossier.
    expect(store().payments.filter((p) => p.repairId === repairId && p.status === "Payé").length).toBe(0);
    // Il entre dans la liste "règlements à finaliser" (rendu/clôturé, non réglé, total > payé).
    const isPending =
      (repair?.status === "Rendu" || repair?.status === "Clôturé") &&
      repair?.paymentStatus !== "Réglée" &&
      (repair?.total ?? repair?.amount ?? 0) > 0;
    expect(isPending).toBe(true);
  });
});
