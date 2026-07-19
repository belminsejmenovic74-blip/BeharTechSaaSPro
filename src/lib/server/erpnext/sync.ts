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

export { EXTERNAL_ID_FIELDS };
