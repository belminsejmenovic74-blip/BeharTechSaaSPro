import type { StockItem, StockMovement, StoreState, SupplierInvoice, SupplierInvoiceLine } from "@/lib/behar-store";

type StockLotState = Pick<StoreState, "purchases" | "stockMovements" | "supplierInvoiceLines" | "supplierInvoices">;

export type StockLot = {
  id: string;
  stockItemId: string;
  supplierInvoiceLineId?: string;
  supplierInvoiceId?: string;
  purchaseId?: string;
  supplierName?: string;
  invoiceNumber?: string;
  invoiceUrl?: string;
  purchaseDate?: string;
  quantityPurchased: number;
  quantityRemaining: number;
  unitCost?: number;
  createdAt?: string;
};

function invoiceForLine(invoices: SupplierInvoice[], line: SupplierInvoiceLine): SupplierInvoice | undefined {
  return invoices.find((invoice) => invoice.id === line.supplierInvoiceId);
}

function nonEntryDeltaForLot(movements: StockMovement[], lineId?: string) {
  if (!lineId) return 0;
  return movements
    .filter(
      (movement) =>
        movement.linkedSupplierInvoiceLineId === lineId && movement.movementType !== "supplier_purchase_received",
    )
    .reduce((sum, movement) => sum + movement.quantityDelta, 0);
}

function consumeUnlinkedDeltas(lots: StockLot[], movements: StockMovement[], stockItemId: string) {
  const unlinkedDelta = movements
    .filter(
      (movement) =>
        movement.stockItemId === stockItemId &&
        !movement.linkedSupplierInvoiceLineId &&
        movement.movementType !== "supplier_purchase_received",
    )
    .reduce((sum, movement) => sum + movement.quantityDelta, 0);

  if (unlinkedDelta >= 0) return lots;
  let toConsume = Math.abs(unlinkedDelta);
  return lots.map((lot) => {
    if (toConsume <= 0) return lot;
    const consumed = Math.min(lot.quantityRemaining, toConsume);
    toConsume -= consumed;
    return { ...lot, quantityRemaining: lot.quantityRemaining - consumed };
  });
}

export function getStockLotsForItem(state: StockLotState, stockItem: StockItem | string): StockLot[] {
  const stockItemId = typeof stockItem === "string" ? stockItem : stockItem.id;
  const lines = state.supplierInvoiceLines.filter((line) => line.stockItemId === stockItemId);

  const lotsFromLines = lines.map((line) => {
    const invoice = invoiceForLine(state.supplierInvoices, line);
    const remaining = Math.max(0, line.quantityPurchased + nonEntryDeltaForLot(state.stockMovements, line.id));
    return {
      id: line.id,
      stockItemId,
      supplierInvoiceLineId: line.id,
      supplierInvoiceId: line.supplierInvoiceId,
      purchaseId: line.purchaseId,
      supplierName: invoice?.supplierName || line.supplierName,
      invoiceNumber: invoice?.invoiceNumber,
      invoiceUrl: invoice?.originalFileUrl,
      purchaseDate: invoice?.purchaseDate || line.createdAt,
      quantityPurchased: line.quantityPurchased,
      quantityRemaining: remaining,
      unitCost: line.unitPurchasePriceExclTax,
      createdAt: line.createdAt,
    } satisfies StockLot;
  });

  const lots =
    lotsFromLines.length > 0
      ? lotsFromLines
      : state.purchases
          .filter((purchase) => purchase.stockItemId === stockItemId)
          .map((purchase) => {
            const remaining = Math.max(
              0,
              purchase.quantity + nonEntryDeltaForLot(state.stockMovements, purchase.supplierInvoiceLineId),
            );
            return {
              id: purchase.supplierInvoiceLineId || purchase.id,
              stockItemId,
              supplierInvoiceLineId: purchase.supplierInvoiceLineId,
              supplierInvoiceId: purchase.supplierInvoiceId,
              purchaseId: purchase.id,
              supplierName: purchase.supplier,
              invoiceNumber: purchase.invoiceNumber,
              invoiceUrl: purchase.originalFileUrl,
              purchaseDate: purchase.date || purchase.createdAt,
              quantityPurchased: purchase.quantity,
              quantityRemaining: remaining,
              unitCost: purchase.unitCost,
              createdAt: purchase.createdAt,
            } satisfies StockLot;
          });

  return consumeUnlinkedDeltas(
    [...lots].sort((a, b) =>
      String(a.purchaseDate || a.createdAt || "").localeCompare(String(b.purchaseDate || b.createdAt || "")),
    ),
    state.stockMovements,
    stockItemId,
  );
}

export function pickStockLotForQuantity(
  state: StockLotState,
  stockItem: StockItem,
  quantity: number,
): StockLot | undefined {
  return getStockLotsForItem(state, stockItem).find((lot) => lot.quantityRemaining >= quantity);
}
