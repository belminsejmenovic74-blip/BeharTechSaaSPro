import { beforeEach, describe, expect, it } from "vitest";

import { useBeharStore } from "./behar-store";

beforeEach(() => {
  useBeharStore.getState().resetDemo();
  useBeharStore.setState({ priceBookItems: [] });
});

describe("prix d'achat et qualité depuis le stock", () => {
  it("crée une référence à 38 € après import d'une facture d'écran iPhone 12", () => {
    const invoiceId = useBeharStore.getState().commitSupplierInvoice({
      supplier: "Fournisseur test isolé",
      invoiceNumber: "TEST-IP12-38",
      source: "manuel",
      currency: "EUR",
      lines: [
        {
          itemName: "Écran complet iPhone 12",
          rawName: "Écran complet iPhone 12 soft oled",
          sku: "TEST-IP12-SOFT",
          category: "Écran",
          compatibleModel: "iPhone 12",
          quality: "soft oled",
          quantityPurchased: 1,
          unitPurchasePriceExclTax: 38,
          lineTotalExclTax: 38,
          createStockItem: true,
        },
      ],
    });

    expect(invoiceId).toBeTruthy();
    const item = useBeharStore.getState().stockItems.find((entry) => entry.sku === "TEST-IP12-SOFT");
    expect(item).toMatchObject({
      purchasePrice: 38,
      averagePurchasePrice: 38,
      lastPurchasePrice: 38,
      currency: "EUR",
      quality: "Soft OLED",
    });
    expect(useBeharStore.getState().priceBookItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "workshop_import",
          modele: "iPhone 12",
          qualite: "Soft OLED",
          prixAchat: 38,
          stockItemId: item?.id,
        }),
      ]),
    );
  });

  it("crée aussi la référence lors d'un ajout manuel et préserve un prix existant", () => {
    const stockId = useBeharStore.getState().addStockItem({
      name: "Batterie iPhone 13 — OEM",
      sku: "TEST-IP13-BAT-OEM",
      brandName: "Apple",
      compatibleModels: ["iPhone 13"],
      categoryName: "Batterie",
      quality: "oem",
      purchasePrice: 24,
      currency: "EUR",
      salePrice: 69,
      quantity: 2,
      stock: 2,
      threshold: 1,
      supplier: "Fournisseur manuel",
    });

    expect(stockId).toBeTruthy();
    const created = useBeharStore.getState().priceBookItems.find((entry) => entry.stockItemId === stockId);
    expect(created).toMatchObject({ prixAchat: 24, qualite: "OEM", source: "workshop_import" });

    useBeharStore.getState().addStockItem({
      name: "Batterie iPhone 13 — OEM",
      sku: "TEST-IP13-BAT-OEM",
      brandName: "Apple",
      compatibleModels: ["iPhone 13"],
      categoryName: "Batterie",
      quality: "OEM",
      purchasePrice: 30,
      currency: "EUR",
      salePrice: 69,
      quantity: 1,
      stock: 1,
      threshold: 1,
      supplier: "Autre fournisseur",
    });

    const after = useBeharStore.getState().priceBookItems.find((entry) => entry.id === created?.id);
    expect(after?.prixAchat).toBe(24);
    expect(useBeharStore.getState().stockItems.find((entry) => entry.id === stockId)?.averagePurchasePrice).toBe(26);
  });
});
