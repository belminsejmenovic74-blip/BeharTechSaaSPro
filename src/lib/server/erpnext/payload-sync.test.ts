import { describe, expect, it, vi } from "vitest";

import type { NormalizedBusinessState } from "@/lib/data/normalized-sync";

import type { ErpNextClient } from "./client";
import type { ErpNextConfig } from "./config";
import { syncPayloadToErpNext } from "./payload-sync";

function config(enabled = true): ErpNextConfig {
  return {
    enabled,
    configured: enabled,
    baseUrl: "https://erp.example.com",
    apiKey: "key",
    apiSecret: "secret",
    company: "Behar Tech Pro",
    branch: "Boutique principale",
    warehouse: "Entrepôt principal - BTP",
    customerGroup: "Particuliers",
    supplierGroup: "Fournisseurs BEHAR TECH PRO",
    itemGroup: "Articles synchronisés BEHAR TECH PRO",
    territory: "All Territories",
    requestTimeoutMs: 5_000,
  };
}

function payload(): NormalizedBusinessState {
  return {
    workshopId: "workshop-1",
    customers: [
      {
        id: "client-1",
        shopId: "shop-1",
        name: "Jean Dupont",
        initials: "JD",
        phone: "",
        email: "",
        device: "",
        lastVisit: "",
        totalSpent: 0,
        status: "",
        lastRepair: "",
        interventions: 0,
        source: "",
      },
    ],
    suppliers: [{ id: "supplier-1", shopId: "shop-1", name: "Pièces Pro", createdAt: "2026-07-19" }],
    stockItems: [
      {
        id: "item-1",
        shopId: "shop-1",
        sku: "ECR-IP15",
        name: "Écran iPhone 15",
        deviceType: "Smartphone",
        modelIds: [],
        compatibleModels: ["iPhone 15"],
        categoryId: "screens",
        categoryName: "Écrans",
        part: "Écran",
        reference: "ECR-IP15",
        category: "Écrans",
        purchasePrice: 50,
        salePrice: 99,
        quantity: 2,
        stock: 2,
        threshold: 1,
        supplier: "Pièces Pro",
        leadTime: "",
        itemType: "part",
        repairEnabled: true,
        counterSaleEnabled: false,
        active: true,
        productCategory: "Pièces détachées",
        counterVisible: false,
        createdAt: "2026-07-19",
        updatedAt: "2026-07-19",
      },
    ],
    repairs: [],
    quotes: [],
    invoices: [],
    payments: [],
    sales: [],
    documents: [],
    stockMovements: [],
    purchases: [],
    supplierInvoices: [],
    supplierInvoiceLines: [],
    users: [],
  };
}

describe("synchronisation du payload ERPNext", () => {
  it("reste sans effet lorsque l’intégration est désactivée", async () => {
    const upsertByExternalId = vi.fn();
    const result = await syncPayloadToErpNext(payload(), {
      config: config(false),
      client: { upsertByExternalId } as unknown as ErpNextClient,
    });
    expect(result.enabled).toBe(false);
    expect(upsertByExternalId).not.toHaveBeenCalled();
  });

  it("synchronise les trois référentiels avec des identifiants isolés par atelier", async () => {
    const upsertByExternalId = vi.fn().mockResolvedValue({ action: "created", document: { name: "DOC-1" } });
    const result = await syncPayloadToErpNext(payload(), {
      config: config(),
      client: { upsertByExternalId } as unknown as ErpNextClient,
    });

    expect(result).toEqual({ enabled: true, customers: 1, suppliers: 1, items: 1 });
    expect(upsertByExternalId).toHaveBeenCalledTimes(3);
    expect(upsertByExternalId.mock.calls.map(([call]) => call.externalId)).toEqual([
      "workshop-1:client-1",
      "workshop-1:supplier-1",
      "workshop-1:item-1",
    ]);
  });
});
