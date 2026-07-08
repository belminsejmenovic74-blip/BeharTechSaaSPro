"use client";

import type {
  Customer,
  Purchase,
  Repair,
  RepairPart,
  Sale,
  StockItem,
  StockMovement,
  StoreState,
} from "@/lib/behar-store";
import {
  normalizePartReference,
  stockReferenceMatches,
  stockReferenceKeys,
  stockPrimaryReference,
} from "@/lib/stock-reference";

export type PartRepairUsage = {
  repair: Repair;
  customer?: Customer;
  part: RepairPart;
  usedAt?: string;
  technician?: string;
};

export type PartSaleUsage = {
  sale: Sale;
  line: Sale["lines"][number];
  customer?: Customer;
};

export type PartTraceability = {
  reference: string;
  stockItem?: StockItem;
  purchases: Purchase[];
  supplierInvoiceLines: StoreState["supplierInvoiceLines"];
  supplierInvoices: StoreState["supplierInvoices"];
  movements: StockMovement[];
  repairUsages: PartRepairUsage[];
  saleUsages: PartSaleUsage[];
};

export function findStockItemByPartReference(
  state: Pick<StoreState, "stockItems">,
  reference: string,
): StockItem | undefined {
  const query = normalizePartReference(reference);
  if (!query) return undefined;
  return state.stockItems.find((item) => stockReferenceMatches(item, query));
}

export function getPartTraceability(
  state: Pick<
    StoreState,
    | "stockItems"
    | "purchases"
    | "supplierInvoiceLines"
    | "supplierInvoices"
    | "stockMovements"
    | "repairs"
    | "customers"
    | "sales"
  >,
  reference: string,
): PartTraceability {
  const stockItem = findStockItemByPartReference(state, reference);
  const references = new Set<string>(
    [normalizePartReference(reference), ...(stockItem ? stockReferenceKeys(stockItem) : [])].filter(Boolean),
  );
  const stockItemId = stockItem?.id;

  const purchases = state.purchases.filter((purchase) => {
    if (stockItemId && purchase.stockItemId === stockItemId) return true;
    return [purchase.reference, purchase.internalCode].some((value) => references.has(normalizePartReference(value)));
  });

  const supplierInvoiceLines = state.supplierInvoiceLines.filter((line) => {
    if (stockItemId && line.stockItemId === stockItemId) return true;
    return [line.reference, line.sku, line.internalCode].some((value) => references.has(normalizePartReference(value)));
  });

  const invoiceIds = new Set<string>(
    [
      ...purchases.map((purchase) => purchase.supplierInvoiceId),
      ...supplierInvoiceLines.map((line) => line.supplierInvoiceId),
      stockItem?.originSupplierInvoiceId,
    ].filter(Boolean) as string[],
  );
  const supplierInvoices = state.supplierInvoices.filter((invoice) => invoiceIds.has(invoice.id));

  const movements = state.stockMovements.filter((movement) => {
    if (stockItemId && movement.stockItemId === stockItemId) return true;
    return [movement.partReference, movement.internalCode].some((value) =>
      references.has(normalizePartReference(value)),
    );
  });

  const repairUsages = state.repairs.flatMap((repair) =>
    repair.parts
      .filter((part) => {
        if (stockItemId && part.stockItemId === stockItemId) return true;
        return [part.sku, part.reference, part.internalCode].some((value) =>
          references.has(normalizePartReference(value)),
        );
      })
      .map((part) => ({
        repair,
        customer: state.customers.find((customer) => customer.id === repair.customerId),
        part,
        usedAt:
          movements.find(
            (movement) => movement.linkedRepairId === repair.id && movement.stockItemId === part.stockItemId,
          )?.createdAt ??
          repair.updatedAt ??
          repair.createdAt ??
          repair.droppedAt,
        technician: repair.technician || repair.updatedByName || repair.createdByName,
      })),
  );

  const saleUsages = state.sales.flatMap((sale) =>
    sale.lines
      .filter((line) => {
        if (stockItemId && line.stockItemId === stockItemId) return true;
        return references.has(normalizePartReference(line.sku));
      })
      .map((line) => ({
        sale,
        line,
        customer: state.customers.find((customer) => customer.id === sale.customerId),
      })),
  );

  return {
    reference: stockItem ? stockPrimaryReference(stockItem) : reference,
    stockItem,
    purchases,
    supplierInvoiceLines,
    supplierInvoices,
    movements: movements.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    repairUsages,
    saleUsages,
  };
}
