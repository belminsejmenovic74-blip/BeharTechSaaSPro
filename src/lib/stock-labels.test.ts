import { describe, expect, it } from "vitest";

import type { StockItem, StockMovement, SupplierInvoice, SupplierInvoiceLine } from "@/lib/behar-store";
import { getStockLabelContent } from "@/lib/stock-label-pdf";
import { safeReturnTo, validateStockAppUrl } from "@/lib/stock-label-url";
import { getStockLotsForItem } from "@/lib/stock-lots";
import {
  normalizePartReference,
  resolveStockItem,
  stableShortStockReference,
  stockReferenceMatches,
} from "@/lib/stock-reference";

function stockItem(patch: Partial<StockItem> = {}): StockItem {
  return {
    id: "stock_1",
    shopId: "shop_1",
    sku: "REF-1779044217501",
    internalCode: "PCE-7K4-92",
    legacyReferences: ["OLD SCREEN 13"],
    scanToken: "sp_ABCDEFGHJKLMNPQRSTUVWX",
    scanEnabled: true,
    location: "Tiroir A3",
    displayName: "Écran OLED iPhone 13 Pro extrêmement long pour vérifier la mise en page",
    name: "Écran OLED iPhone 13 Pro extrêmement long pour vérifier la mise en page",
    deviceType: "Smartphone",
    brandName: "Apple",
    modelIds: [],
    compatibleModels: ["iPhone 13 Pro", "iPhone 13 Pro Max"],
    categoryId: "cat_screen",
    categoryName: "Écran",
    part: "Écran",
    reference: "REF-1779044217501",
    category: "Écran",
    quality: "Premium",
    ean: "3701234567890",
    purchasePrice: 45,
    salePrice: 89,
    quantity: 8,
    stock: 8,
    threshold: 2,
    supplier: "UTOPYA",
    leadTime: "2 jours",
    itemType: "part",
    repairEnabled: true,
    counterSaleEnabled: false,
    active: true,
    productCategory: "Pièces détachées",
    counterVisible: false,
    createdAt: "2026-07-02T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    ...patch,
  };
}

describe("résolution centrale des pièces", () => {
  const item = stockItem();

  it.each(["PCE-7K4-92", "pce7k492", " PCE 7K4 92 "])("normalise %s vers la même référence", (input) => {
    expect(stockReferenceMatches(item, input)).toBe(true);
    expect(normalizePartReference(input)).toBe("PCE7K492");
  });

  it("résout le même article par token, ancien identifiant, SKU, EAN et nom", () => {
    const items = [item];
    expect(resolveStockItem(items, item.scanToken)?.id).toBe(item.id);
    expect(resolveStockItem(items, "old-screen-13")?.id).toBe(item.id);
    expect(resolveStockItem(items, item.sku)?.id).toBe(item.id);
    expect(resolveStockItem(items, item.ean)?.id).toBe(item.id);
    expect(resolveStockItem(items, "écran oled", { allowName: true })?.id).toBe(item.id);
  });

  it("ne résout pas un token désactivé sauf pour afficher un état neutre", () => {
    const disabled = stockItem({ scanEnabled: false });
    expect(resolveStockItem([disabled], disabled.scanToken)).toBeUndefined();
    expect(resolveStockItem([disabled], disabled.scanToken, { includeDisabledScanToken: true })?.id).toBe(disabled.id);
  });

  it("produit une référence courte stable sans exposer l'identifiant brut", () => {
    expect(stableShortStockReference("stock_1779044217501_abcdef")).toBe(
      stableShortStockReference("stock_1779044217501_abcdef"),
    );
    expect(stableShortStockReference("stock_1779044217501_abcdef")).toMatch(/^PCE-[A-Z0-9]{4}-[A-Z0-9]{3}$/);
    expect(stableShortStockReference("stock_1779044217501_abcdef")).not.toContain("1779044217501");
  });
});

describe("contenu et URL d'étiquette", () => {
  it("n'affiche la référence principale qu'une fois et conserve SKU/EAN en petit", () => {
    const content = getStockLabelContent(stockItem());
    expect(content.reference).toBe("PCE-7K4-92");
    expect(content.smallCode).toContain("EAN 3701234567890");
    expect(content.smallCode).toContain("SKU REF-1779044217501");
    expect(content.name).not.toContain("PCE-7K4-92");
    expect(content.secondary).toBe("Premium · Tiroir A3");
  });

  it("reste valide sans EAN, emplacement, qualité ni modèle compatible", () => {
    const content = getStockLabelContent(
      stockItem({ ean: undefined, location: undefined, quality: undefined, compatibleModels: [] }),
    );
    expect(content.reference).toBe("PCE-7K4-92");
    expect(content.compatibility).toBe("Apple");
    expect(content.secondary).toBe("");
    expect(content.smallCode).toBe("SKU REF-1779044217501");
  });

  it("rejette localhost, HTTP et les domaines Vercel Preview", () => {
    expect(validateStockAppUrl(undefined).error).toContain("NEXT_PUBLIC_APP_URL");
    expect(validateStockAppUrl("http://app.example.com").error).toContain("HTTPS");
    expect(validateStockAppUrl("https://feature-branch.vercel.app").error).toContain("*.vercel.app");
    expect(validateStockAppUrl("https://app.behartechpro.fr/path")).toEqual({
      url: "https://app.behartechpro.fr",
      error: "",
    });
  });

  it("bloque les returnTo externes", () => {
    expect(safeReturnTo("https://evil.example/phish")).toBe("/dashboard/stock");
    expect(safeReturnTo("//evil.example/phish")).toBe("/dashboard/stock");
    expect(safeReturnTo("/piece/sp_SAFE?returnTo=%2Fpiece%2Fsp_SAFE")).toBe(
      "/piece/sp_SAFE?returnTo=%2Fpiece%2Fsp_SAFE",
    );
  });
});

describe("lots multiples", () => {
  it("additionne les lots actifs et tolère une facture absente", () => {
    const item = stockItem();
    const supplierInvoices: SupplierInvoice[] = [
      {
        id: "invoice_1",
        shopId: "shop_1",
        supplierId: "supplier_1",
        supplierName: "UTOPYA",
        purchaseDate: "2026-07-02",
        invoiceNumber: "FA-2026-018",
        totalExcludingTax: 135,
        taxAmount: 27,
        totalIncludingTax: 162,
        status: "reçu",
        source: "manuel",
        createdAt: "2026-07-02",
        updatedAt: "2026-07-02",
      },
    ];
    const supplierInvoiceLines = [
      {
        id: "line_1",
        shopId: "shop_1",
        supplierInvoiceId: "invoice_1",
        stockItemId: item.id,
        itemName: item.name,
        quantityPurchased: 3,
        unitPurchasePriceExclTax: 45,
        lineTotalExclTax: 135,
        supplierName: "UTOPYA",
        createdAt: "2026-07-02",
      },
      {
        id: "line_2",
        shopId: "shop_1",
        supplierInvoiceId: "missing_invoice",
        stockItemId: item.id,
        itemName: item.name,
        quantityPurchased: 5,
        unitPurchasePriceExclTax: 42,
        lineTotalExclTax: 210,
        supplierName: "MobileSentrix",
        createdAt: "2026-07-08",
      },
    ] as SupplierInvoiceLine[];
    const stockMovements = [
      {
        id: "movement_1",
        shopId: "shop_1",
        stockItemId: item.id,
        movementType: "repair_part_used",
        quantityDelta: -1,
        quantityBefore: 8,
        quantityAfter: 7,
        sourceModule: "atelier_reparation",
        linkedSupplierInvoiceLineId: "line_1",
        createdAt: "2026-07-09",
      },
    ] as StockMovement[];

    const lots = getStockLotsForItem({ purchases: [], supplierInvoices, supplierInvoiceLines, stockMovements }, item);
    expect(lots).toHaveLength(2);
    expect(lots.map((lot) => lot.quantityRemaining)).toEqual([2, 5]);
    expect(lots.reduce((sum, lot) => sum + lot.quantityRemaining, 0)).toBe(7);
    expect(lots[1]?.supplierName).toBe("MobileSentrix");
    expect(lots[1]?.invoiceNumber).toBeUndefined();
  });
});
