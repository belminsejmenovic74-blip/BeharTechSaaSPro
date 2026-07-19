import "server-only";

import { ErpNextClient } from "./client";
import { readErpNextConfig } from "./config";

export { ErpNextApiError, ErpNextClient } from "./client";
export { getErpNextSafeStatus, readErpNextConfig } from "./config";
export type { ErpNextConfig } from "./config";
export {
  mapCustomerToErpNext,
  mapDraftInvoiceToErpNext,
  mapItemToErpNext,
  mapSupplierToErpNext,
  VAT_EXEMPTION_MENTION,
} from "./mappers";
export { syncCustomer, syncItem, syncSupplier } from "./sync";

export function getErpNextClient(): ErpNextClient | null {
  const config = readErpNextConfig();
  if (!config.enabled || !config.configured) return null;
  return new ErpNextClient(config);
}
