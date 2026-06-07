"use client";

import type {
  BeharDocument,
  Customer,
  Invoice,
  Payment,
  Quote,
  Repair,
  Sale,
  StockItem,
  StoreState,
  WorkshopSettings,
} from "@/lib/behar-store";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export type NormalizedBusinessState = {
  workshopId?: string;
  licenseKey?: string;
  workshopSettings?: WorkshopSettings;
  customers: Customer[];
  repairs: Repair[];
  quotes: Quote[];
  invoices: Invoice[];
  payments: Payment[];
  sales: Sale[];
  documents: BeharDocument[];
  stockItems: StockItem[];
  users: StoreState["users"];
};

const SYNC_ENDPOINT = "/api/behar/sync";

export function getNormalizedBusinessState(state: Partial<StoreState>): NormalizedBusinessState | null {
  const workshopId = state.cloudSync?.workshopId;
  if (!workshopId) return null;
  return {
    workshopId,
    licenseKey: state.licenseKey,
    workshopSettings: state.workshopSettings,
    customers: Array.isArray(state.customers) ? state.customers : [],
    repairs: Array.isArray(state.repairs) ? state.repairs : [],
    quotes: Array.isArray(state.quotes) ? state.quotes : [],
    invoices: Array.isArray(state.invoices) ? state.invoices : [],
    payments: Array.isArray(state.payments) ? state.payments : [],
    sales: Array.isArray(state.sales) ? state.sales : [],
    documents: Array.isArray(state.documents) ? state.documents : [],
    stockItems: Array.isArray(state.stockItems) ? state.stockItems : [],
    users: Array.isArray(state.users) ? state.users : [],
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
