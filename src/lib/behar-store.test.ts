import { beforeEach, describe, expect, it } from "vitest";

import { useBeharStore } from "@/lib/behar-store";
import { mapRemoteWidgetAppointment, type RemoteWidgetAppointment } from "@/lib/widget/appointment-sync";

const store = () => useBeharStore.getState();

function widgetRemote(over: Partial<RemoteWidgetAppointment> = {}): RemoteWidgetAppointment {
  return {
    id: "10000000-0000-4000-a000-000000000042",
    shop_id: "shop_b",
    client_id: null,
    appointment_number: "RDV-W-000000042",
    client_name: "Sarah Martin",
    client_phone: "+33612345678",
    client_email: "sarah@example.fr",
    device_type: "Smartphone",
    device_brand: "Apple",
    device_model: "iPhone 13",
    issue_description: "Écran cassé",
    intervention_label: "Remplacement écran",
    customer_price: 129,
    price_status: "confirmed",
    price_snapshot: { amount: 129, type: "exact", quality: "OLED" },
    appointment_date: "2026-07-20",
    appointment_time: "10:00",
    duration_minutes: 45,
    source: "Widget site internet",
    status: "pending",
    notes: "Rappel avant 12h",
    widget_lead_id: "20000000-0000-4000-a000-000000000043",
    assigned_technician_id: null,
    is_pre_intake: true,
    confirmation_status: "pending",
    stock_confirmation_required: false,
    price_confirmation_required: false,
    created_at: "2026-07-11T09:00:00.000Z",
    updated_at: "2026-07-11T09:00:00.000Z",
    quality_label: "OLED",
    displayed_stock: "Disponible",
    displayed_stock_snapshot: { mode: "simple", status: "available" },
    displayed_warranty: "12 mois",
    photos: ["w/t/wdg/s/a.jpg", "w/t/wdg/s/b.jpg"],
    ...over,
  };
}

function importWidgetAppointment(over: Partial<RemoteWidgetAppointment> = {}): string {
  const customerId = store().addCustomer({ name: "Sarah Martin", phone: "+33612345678", email: "sarah@example.fr" });
  const customer = store().customers.find((entry) => entry.id === customerId);
  const appointment = mapRemoteWidgetAppointment(widgetRemote(over), {
    id: customer?.id ?? customerId,
    shopId: customer?.shopId ?? "shop_atelier_belmin",
    name: customer?.name ?? "Sarah Martin",
    phone: customer?.phone,
    email: customer?.email,
  });
  return store().importExternalAppointment(appointment);
}

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

describe("Rendez-vous widget — import idempotent", () => {
  it("importe une pré-fiche confirmée sans créer de réparation", () => {
    const customerId = store().addCustomer({ name: "Client widget", phone: "+33600000000" });
    const customer = store().customers.find((entry) => entry.id === customerId);
    expect(customer).toBeTruthy();
    const input = {
      id: "10000000-0000-4000-a000-000000000099",
      externalSourceId: "10000000-0000-4000-a000-000000000099",
      widgetLeadId: "10000000-0000-4000-a000-000000000098",
      isPreIntake: true,
      shopId: customer?.shopId || "shop_atelier_belmin",
      customerId,
      device: "Apple iPhone 15",
      issue: "Écran cassé",
      date: "2026-07-20",
      time: "10:00",
      duration: "60 min",
      channel: "Site internet",
      source: "Widget site internet",
      technician: "À assigner",
      notes: "Pré-fiche créée depuis le widget",
      status: "Confirmé" as const,
      confirmed: true,
      dayIndex: 0,
      row: 0,
      color: "mint",
    };
    expect(store().importExternalAppointment(input)).toBe(input.id);
    expect(store().importExternalAppointment(input)).toBe(input.id);
    expect(store().appointments.filter((appointment) => appointment.id === input.id)).toHaveLength(1);
    expect(store().appointments.find((appointment) => appointment.id === input.id)).toMatchObject({
      status: "Confirmé",
      isPreIntake: true,
      repairId: undefined,
    });
    expect(store().repairs.some((repair) => repair.appointmentId === input.id)).toBe(false);
  });
});

describe("Rendez-vous widget — cycle de vie comptoir/atelier", () => {
  it("importe « à confirmer » avec toutes les données consultées", () => {
    const id = importWidgetAppointment();
    const saved = store().appointments.find((entry) => entry.id === id);
    expect(saved).toMatchObject({
      status: "En attente", // à confirmer
      isPreIntake: true,
      qualityLabel: "OLED",
      availabilityLabel: "Disponible",
      warrantyLabel: "12 mois",
      customerPrice: 129,
      source: "Widget site internet",
      repairId: undefined,
    });
    expect(saved?.photos).toHaveLength(2);
    expect(store().repairs.some((repair) => repair.appointmentId === id)).toBe(false);
  });

  it("gère confirmation, déplacement, absence et annulation", () => {
    const id = importWidgetAppointment();

    store().updateAppointment(id, { status: "Confirmé", confirmed: true });
    expect(store().appointments.find((entry) => entry.id === id)?.status).toBe("Confirmé");

    store().updateAppointment(id, {
      appointmentDate: "2026-07-22",
      appointmentTime: "15:30",
      date: "2026-07-22",
      time: "15:30",
    });
    const moved = store().appointments.find((entry) => entry.id === id);
    expect(moved).toMatchObject({ date: "2026-07-22", time: "15:30", qualityLabel: "OLED" }); // données conservées

    store().updateAppointment(id, { status: "Non venu" });
    expect(store().appointments.find((entry) => entry.id === id)?.status).toBe("Non venu");

    store().updateAppointment(id, { status: "Annulé" });
    expect(store().appointments.find((entry) => entry.id === id)?.status).toBe("Annulé");
  });

  it("« Commencer la prise en charge » reprend tout sans ressaisie", () => {
    const id = importWidgetAppointment();
    const repairId = store().createRepairFromAppointment(id);
    expect(repairId).toBeTruthy();
    const repair = store().repairs.find((entry) => entry.id === repairId);
    expect(repair).toMatchObject({ deviceModel: "iPhone 13", brandName: "Apple", amount: 129 });
    expect(repair?.issue).toContain("Écran");
    const appointment = store().appointments.find((entry) => entry.id === id);
    expect(appointment).toMatchObject({ status: "Réparation créée", repairId });
  });

  it("reste idempotent : réimporter ne duplique pas", () => {
    const id = importWidgetAppointment();
    store().importExternalAppointment(
      mapRemoteWidgetAppointment(widgetRemote(), { id: "x", shopId: "shop_atelier_belmin", name: "X" }),
    );
    expect(store().appointments.filter((entry) => entry.id === id)).toHaveLength(1);
  });
});

describe("Notifications widget — centre temps réel", () => {
  const widgetNotifs = () => store().notifications.filter((notification) => notification.category);
  const byCategory = (category: string) => widgetNotifs().filter((notification) => notification.category === category);

  it("émet « nouveau rendez-vous » + « photo reçue » à l'import, avec boutique", () => {
    const id = importWidgetAppointment();
    const appointment = store().appointments.find((entry) => entry.id === id);
    expect(byCategory("new_appointment")).toHaveLength(1);
    expect(byCategory("new_appointment")[0].shopId).toBe(appointment?.shopId);
    expect(byCategory("photo_received")).toHaveLength(1);
    expect(byCategory("stock_to_confirm")).toHaveLength(0); // stock ferme dans la fixture
  });

  it("émet « stock à confirmer » et « prix à confirmer » selon les alertes", () => {
    importWidgetAppointment({
      price_status: "to_confirm",
      customer_price: null,
      stock_confirmation_required: true,
      displayed_stock: null,
      displayed_stock_snapshot: { mode: "hidden" },
    });
    expect(byCategory("price_to_confirm")).toHaveLength(1);
    expect(byCategory("stock_to_confirm")).toHaveLength(1);
  });

  it("émet « rendez-vous déplacé » et « annulé » sur modification locale", () => {
    const id = importWidgetAppointment();
    store().updateAppointment(id, {
      appointmentDate: "2026-07-25",
      appointmentTime: "16:00",
      date: "2026-07-25",
      time: "16:00",
    });
    expect(byCategory("appointment_moved")).toHaveLength(1);
    store().updateAppointment(id, { status: "Annulé" });
    expect(byCategory("appointment_cancelled")).toHaveLength(1);
  });

  it("émet « conversion en dossier » à la prise en charge", () => {
    const id = importWidgetAppointment();
    store().createRepairFromAppointment(id);
    expect(byCategory("converted")).toHaveLength(1);
    expect(byCategory("converted")[0].targetType).toBe("repair");
  });

  it("marque comme lu et tout marquer comme lu", () => {
    importWidgetAppointment();
    const first = widgetNotifs()[0];
    store().markNotificationRead(first.id);
    expect(store().notifications.find((n) => n.id === first.id)?.read).toBe(true);
    store().markAllNotificationsRead();
    expect(store().notifications.every((n) => n.read)).toBe(true);
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
