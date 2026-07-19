import "server-only";

import type { ErpNextClient } from "./client";
import {
  type ErpNextCustomerInput,
  type ErpNextItemInput,
  type ErpNextSupplierInput,
  mapCustomerToErpNext,
  mapItemToErpNext,
  mapSupplierToErpNext,
} from "./mappers";

const EXTERNAL_ID_FIELDS = {
  customer: "custom_identifiant_client_behar_tech_pro",
  supplier: "custom_identifiant_fournisseur_behar_tech_pro",
  item: "custom_identifiant_article_behar_tech_pro",
} as const;

export async function syncCustomer(client: ErpNextClient, input: ErpNextCustomerInput) {
  return client.upsertByExternalId({
    doctype: "Customer",
    externalIdField: EXTERNAL_ID_FIELDS.customer,
    externalId: input.id,
    document: mapCustomerToErpNext(input),
  });
}

export async function syncSupplier(client: ErpNextClient, input: ErpNextSupplierInput) {
  return client.upsertByExternalId({
    doctype: "Supplier",
    externalIdField: EXTERNAL_ID_FIELDS.supplier,
    externalId: input.id,
    document: mapSupplierToErpNext(input),
  });
}

export async function syncItem(client: ErpNextClient, input: ErpNextItemInput) {
  return client.upsertByExternalId({
    doctype: "Item",
    externalIdField: EXTERNAL_ID_FIELDS.item,
    externalId: input.id,
    document: mapItemToErpNext(input),
  });
}

export type ErpNextItemPriceInput = {
  itemCode: string;
  priceList: string;
  currency: string;
  rate: number;
};

export async function syncItemPrice(client: ErpNextClient, input: ErpNextItemPriceInput) {
  if (!Number.isFinite(input.rate) || input.rate < 0) {
    throw new Error("Le prix ERPNext doit être un nombre positif ou nul.");
  }

  const itemCode = input.itemCode.trim();
  const priceList = input.priceList.trim();
  const currency = input.currency.trim();
  if (!itemCode || !priceList || !currency) {
    throw new Error("Le code article, la liste de prix et la devise ERPNext sont requis.");
  }

  const existing = await client.list<{ name: string }>("Item Price", {
    fields: ["name"],
    filters: [
      ["item_code", "=", itemCode],
      ["price_list", "=", priceList],
      ["currency", "=", currency],
      ["uom", "=", "Unit"],
    ],
    limit: 1,
  });
  const document = {
    item_code: itemCode,
    price_list: priceList,
    currency,
    uom: "Unit",
    price_list_rate: input.rate,
  };

  if (existing[0]?.name) {
    return {
      action: "updated" as const,
      document: await client.update("Item Price", existing[0].name, document),
    };
  }

  return {
    action: "created" as const,
    document: await client.create("Item Price", document),
  };
}

export { EXTERNAL_ID_FIELDS };
