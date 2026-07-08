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

  it("commitSupplierInvoice relie facture fournisseur, ligne, achat, stock et mouvement", () => {
    const invoiceId = store().commitSupplierInvoice({
      supplier: "Grossiste Pro",
      invoiceNumber: "FP-2026-001",
      source: "manuel",
      lines: [
        {
          itemName: "Écran iPhone 13 OLED",
          sku: "IP13-OLED",
          internalCode: "BT-IP13-OLED",
          category: "Écran",
          compatibleModel: "iPhone 13",
          quality: "OLED",
          quantityPurchased: 3,
          unitPurchasePriceExclTax: 55,
          taxRate: 20,
        },
      ],
    });

    const invoice = store().supplierInvoices.find((entry) => entry.id === invoiceId);
    const line = store().supplierInvoiceLines.find((entry) => entry.supplierInvoiceId === invoiceId);
    const purchase = store().purchases.find((entry) => entry.supplierInvoiceId === invoiceId);
    const stockItem = store().stockItems.find((entry) => entry.id === line?.stockItemId);
    const movement = store().stockMovements.find((entry) => entry.linkedSupplierInvoiceId === invoiceId);

    expect(invoice?.supplierName).toBe("Grossiste Pro");
    expect(line?.purchaseId).toBe(purchase?.id);
    expect(purchase?.stockItemId).toBe(stockItem?.id);
    expect(stockItem?.stock).toBe(3);
    expect(stockItem?.originSupplierInvoiceId).toBe(invoiceId);
    expect(movement?.linkedPurchaseId).toBe(purchase?.id);
    expect(movement?.linkedSupplierInvoiceLineId).toBe(line?.id);
    expect(movement?.quantityBefore).toBe(0);
    expect(movement?.quantityAfter).toBe(3);
  });

  it("commitSupplierInvoice garde la livraison hors stock", () => {
    const invoiceId = store().commitSupplierInvoice({
      supplier: "Utopya",
      invoiceNumber: "UT-2026-001",
      source: "textract",
      lines: [
        {
          itemName: "Ecran Complet iPhone 12/12 Pro (LTPS) (SPARK) EAN 3701344077792 / Garantie : À vie (UTOPYA)",
          sku: "IP12-LTPS",
          category: "Écran",
          compatibleModel: "iPhone 12, iPhone 12 Pro",
          quality: "LTPS",
          quantityPurchased: 2,
          unitPurchasePriceExclTax: 39,
        },
        {
          itemName: "Chrono Relais",
          category: "Livraison",
          quantityPurchased: 1,
          unitPurchasePriceExclTax: 5.9,
          lineTotalExclTax: 5.9,
          createStockItem: false,
        },
      ],
    });

    const lines = store().supplierInvoiceLines.filter((entry) => entry.supplierInvoiceId === invoiceId);
    const purchases = store().purchases.filter((entry) => entry.supplierInvoiceId === invoiceId);
    const movements = store().stockMovements.filter((entry) => entry.linkedSupplierInvoiceId === invoiceId);
    const shippingLine = lines.find((entry) => entry.itemName === "Chrono Relais");
    const shippingPurchase = purchases.find((entry) => entry.label === "Chrono Relais");
    const stockItem = store().stockItems.find((entry) => entry.sku === "IP12-LTPS");

    expect(lines).toHaveLength(2);
    expect(purchases).toHaveLength(2);
    expect(movements).toHaveLength(1);
    expect(stockItem?.name).toBe("Écran complet");
    expect(stockItem?.rawName).toContain("Ecran Complet iPhone 12/12 Pro");
    expect(stockItem?.quality).toBe("LTPS");
    expect(stockItem?.ean).toBe("3701344077792");
    expect(stockItem?.supplierWarranty).toContain("À vie");
    expect(stockItem?.supplierBrand).toBe("SPARK");
    expect(stockItem?.compatibleModels).toEqual(expect.arrayContaining(["iPhone 12", "iPhone 12 Pro"]));
    expect(shippingLine?.stockItemId).toBeUndefined();
    expect(shippingLine?.createStockItem).toBe(false);
    expect(shippingPurchase?.kind).toBe("autre");
    expect(shippingPurchase?.stockItemId).toBeUndefined();
    expect(store().stockItems.some((entry) => entry.name === "Chrono Relais")).toBe(false);
  });

  it("normalise les désignations fournisseur Utopya déjà présentes en stock", () => {
    const stockId = store().addStockItem({
      name: "Lentille Caméra iPhone 13 Pro/13 Pro Max (PIEC) EAN 3701569316669 / Garantie : 6 mois (UTOPYA)",
      sku: "IP13P-LENS",
      reference: "IP13P-LENS",
      categoryName: "Caméra",
      compatibleModels: ["iPhone 13 Pro"],
      quantity: 1,
      stock: 1,
      purchasePrice: 1.6,
      salePrice: 0,
      threshold: 1,
      supplier: "UTOPYA",
      itemType: "part",
      productCategory: "Pièces détachées",
      repairEnabled: true,
      counterSaleEnabled: false,
      counterVisible: false,
      skipPurchaseLog: true,
    });

    const stockItem = store().stockItems.find((entry) => entry.id === stockId);

    expect(stockItem?.name).toBe("Lentille caméra");
    expect(stockItem?.quality).toBe("PIEC");
    expect(stockItem?.ean).toBe("3701569316669");
    expect(stockItem?.supplierWarranty).toContain("6 mois");
    expect(stockItem?.compatibleModels).toEqual(expect.arrayContaining(["iPhone 13 Pro", "iPhone 13 Pro Max"]));
    expect(stockItem?.counterSaleEnabled).toBe(false);
  });

  it("la référence SKU reste unique et fusionne les doublons de stock", () => {
    const firstId = store().addStockItem({
      name: "Écran iPhone 14 Pro OLED",
      sku: "IP14P-OLED",
      reference: "IP14P-OLED",
      internalCode: "BT-STK-2024-0018",
      purchasePrice: 80,
      salePrice: 149,
      threshold: 1,
      supplier: "Grossiste",
      stock: 2,
      itemType: "part",
    });
    const secondId = store().addStockItem({
      name: "Écran iPhone 14 Pro OLED seconde ligne",
      sku: "ip14p oled",
      reference: "ip14p oled",
      purchasePrice: 82,
      salePrice: 155,
      threshold: 1,
      supplier: "Grossiste",
      stock: 3,
      itemType: "part",
    });

    expect(secondId).toBe(firstId);
    expect(store().stockItems.filter((item) => item.sku === "IP14P-OLED")).toHaveLength(1);
    expect(store().resolveStockItemByReference("IP14P-OLED")?.id).toBe(firstId);
    expect(store().resolveStockItemByReference("ip14p oled")?.id).toBe(firstId);
    expect(store().stockItems.find((item) => item.id === firstId)?.stock).toBe(5);
  });

  it("empêche de modifier une pièce vers une référence déjà utilisée", () => {
    const firstId = store().addStockItem({
      name: "Batterie A",
      sku: "BAT-A",
      purchasePrice: 20,
      salePrice: 49,
      threshold: 1,
      supplier: "S",
      stock: 1,
      itemType: "part",
    });
    const secondId = store().addStockItem({
      name: "Batterie B",
      sku: "BAT-B",
      purchasePrice: 22,
      salePrice: 59,
      threshold: 1,
      supplier: "S",
      stock: 1,
      itemType: "part",
    });

    store().updateStockItem(secondId, { sku: "BAT-A" });

    expect(store().stockItems.find((item) => item.id === firstId)?.sku).toBe("BAT-A");
    expect(store().stockItems.find((item) => item.id === secondId)?.sku).toBe("BAT-B");
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
