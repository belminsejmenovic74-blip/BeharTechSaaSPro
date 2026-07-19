import "server-only";

import type { NormalizedBusinessState } from "@/lib/data/normalized-sync";

import type { ErpNextClient } from "./client";
import type { ErpNextConfig } from "./config";
import { getErpNextClient, readErpNextConfig } from "./index";
import { syncCustomer, syncItem, syncItemPrice, syncSupplier } from "./sync";

export type ErpNextPayloadSyncSummary = {
  enabled: boolean;
  eligible: boolean;
  customers: number;
  suppliers: number;
  items: number;
  itemPrices: number;
};

function cleanText(value: unknown, fallback = ""): string {
  const result = String(value ?? "").trim();
  return result || fallback;
}

function externalId(workshopId: string, localId: string): string {
  return `${workshopId}:${localId}`;
}

function itemCode(item: NormalizedBusinessState["stockItems"][number]): string {
  const source = cleanText(item.sku || item.internalCode || item.reference || item.id, item.id);
  return source.slice(0, 140);
}

function warrantyMonths(value: unknown): number | undefined {
  const match = cleanText(value).match(/\d+/);
  if (!match) return undefined;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

async function runLimited<T>(values: T[], worker: (value: T) => Promise<unknown>, concurrency = 4): Promise<void> {
  let nextIndex = 0;
  const failures: string[] = [];

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      while (nextIndex < values.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        try {
          await worker(values[currentIndex]);
        } catch (error) {
          failures.push(error instanceof Error ? error.message.slice(0, 300) : "Erreur ERPNext inconnue");
        }
      }
    }),
  );

  if (failures.length) {
    throw new Error(`${failures.length} synchronisation(s) ERPNext ont échoué : ${failures.slice(0, 3).join(" | ")}`);
  }
}

export async function syncPayloadToErpNext(
  payload: NormalizedBusinessState,
  dependencies: { client?: ErpNextClient; config?: ErpNextConfig } = {},
): Promise<ErpNextPayloadSyncSummary> {
  const config = dependencies.config ?? readErpNextConfig();
  const client = dependencies.client ?? getErpNextClient();
  if (!config.enabled || !client) {
    return { enabled: false, eligible: false, customers: 0, suppliers: 0, items: 0, itemPrices: 0 };
  }

  const workshopId = cleanText(payload.workshopId);
  if (!workshopId) throw new Error("L’identifiant atelier est requis pour la synchronisation ERPNext.");
  if (workshopId !== config.workshopId) {
    return { enabled: true, eligible: false, customers: 0, suppliers: 0, items: 0, itemPrices: 0 };
  }

  await runLimited(payload.customers ?? [], (customer) =>
    syncCustomer(client, {
      id: externalId(workshopId, customer.id),
      name: cleanText(customer.name, "Client"),
      shopName: config.branch,
      email: cleanText(customer.email) || undefined,
      phone: cleanText(customer.phone) || undefined,
      customerGroup: config.customerGroup,
      territory: config.territory,
    }),
  );

  await runLimited(payload.suppliers ?? [], (supplier) =>
    syncSupplier(client, {
      id: externalId(workshopId, supplier.id),
      name: cleanText(supplier.name, "Fournisseur"),
      supplierGroup: config.supplierGroup,
      vatNumber: cleanText(supplier.vatNumber) || undefined,
      notes: cleanText(supplier.notes) || undefined,
    }),
  );

  let itemPrices = 0;
  await runLimited(payload.stockItems ?? [], async (item) => {
    const code = itemCode(item);
    await syncItem(client, {
      id: externalId(workshopId, item.id),
      sku: code,
      name: cleanText(item.name || item.part, "Article"),
      itemGroup: config.itemGroup,
      deviceType: cleanText(item.deviceType) || undefined,
      model: item.compatibleModels?.[0] ? cleanText(item.compatibleModels[0]) : undefined,
      quality: cleanText(item.quality) || undefined,
      warrantyMonths: warrantyMonths(item.supplierWarranty),
      compatibleModels: item.compatibleModels,
      active: item.active,
    });

    const prices = [
      { rate: item.salePrice, priceList: config.sellingPriceList },
      { rate: item.purchasePrice, priceList: config.buyingPriceList },
    ].filter((price) => Number.isFinite(price.rate) && price.rate >= 0);
    for (const price of prices) {
      await syncItemPrice(client, {
        itemCode: code,
        priceList: price.priceList,
        currency: config.currency,
        rate: price.rate,
      });
      itemPrices += 1;
    }
  });

  return {
    enabled: true,
    eligible: true,
    customers: payload.customers?.length ?? 0,
    suppliers: payload.suppliers?.length ?? 0,
    items: payload.stockItems?.length ?? 0,
    itemPrices,
  };
}
