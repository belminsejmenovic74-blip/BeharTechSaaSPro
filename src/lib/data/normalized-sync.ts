"use client";

import type {
  BeharDocument,
  Customer,
  Invoice,
  Quote,
  Repair,
  StockItem,
  StockMovement,
  StoreState,
  Supplier,
  SupplierInvoice,
  SupplierInvoiceLine,
  Purchase,
  WorkshopSettings,
} from "@/lib/behar-store";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { sanitizePaymentDataForPersistence } from "@/lib/payment-data-boundary";

export type NormalizedBusinessState = {
  workshopId?: string;
  licenseKey?: string;
  workshopSettings?: WorkshopSettings;
  customers: Customer[];
  repairs: Repair[];
  quotes: Quote[];
  invoices: Invoice[];
  documents: BeharDocument[];
  stockItems: StockItem[];
  stockMovements: StockMovement[];
  purchases: Purchase[];
  suppliers: Supplier[];
  supplierInvoices: SupplierInvoice[];
  supplierInvoiceLines: SupplierInvoiceLine[];
  users: StoreState["users"];
};

const SYNC_ENDPOINT = "/api/behar/sync";

export function getNormalizedBusinessState(state: Partial<StoreState>): NormalizedBusinessState | null {
  const safeState = sanitizePaymentDataForPersistence(state as Partial<StoreState> & Record<string, unknown>);
  const workshopId = safeState.cloudSync?.workshopId;
  if (!workshopId) return null;
  return {
    workshopId,
    licenseKey: safeState.licenseKey,
    workshopSettings: safeState.workshopSettings,
    customers: Array.isArray(safeState.customers) ? safeState.customers : [],
    repairs: Array.isArray(safeState.repairs) ? safeState.repairs : [],
    quotes: Array.isArray(safeState.quotes) ? safeState.quotes : [],
    invoices: Array.isArray(safeState.invoices) ? safeState.invoices : [],
    documents: Array.isArray(safeState.documents) ? safeState.documents : [],
    stockItems: Array.isArray(safeState.stockItems) ? safeState.stockItems : [],
    stockMovements: Array.isArray(safeState.stockMovements) ? safeState.stockMovements : [],
    purchases: Array.isArray(safeState.purchases) ? safeState.purchases : [],
    suppliers: Array.isArray(safeState.suppliers) ? safeState.suppliers : [],
    supplierInvoices: Array.isArray(safeState.supplierInvoices) ? safeState.supplierInvoices : [],
    supplierInvoiceLines: Array.isArray(safeState.supplierInvoiceLines) ? safeState.supplierInvoiceLines : [],
    users: Array.isArray(safeState.users) ? safeState.users : [],
  };
}

export async function syncNormalizedBusinessState(state: Partial<StoreState>): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const payload = getNormalizedBusinessState(state);
  if (!payload) return;

  const response = await fetch(SYNC_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || "Synchronisation métier Supabase impossible.");
  }
}
