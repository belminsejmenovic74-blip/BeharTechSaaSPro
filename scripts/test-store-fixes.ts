/**
 * Smoke test for the P0/P1 cross-module fixes in behar-store.
 * Run: npx tsx scripts/test-store-fixes.ts
 */

// ─── Browser globals shim (Zustand persist + crypto + navigator) ──────────────
const memoryStore: Record<string, string> = {};
(globalThis as any).window = globalThis;
(globalThis as any).localStorage = {
  getItem: (k: string) => (k in memoryStore ? memoryStore[k] : null),
  setItem: (k: string, v: string) => {
    memoryStore[k] = v;
  },
  removeItem: (k: string) => {
    delete memoryStore[k];
  },
  clear: () => {
    Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
  },
  key: (i: number) => Object.keys(memoryStore)[i] ?? null,
  get length() {
    return Object.keys(memoryStore).length;
  },
};
try {
  Object.defineProperty(globalThis, "navigator", {
    value: { userAgent: "node-test" },
    configurable: true,
    writable: true,
  });
} catch {
  // Node 21+ already has navigator; ignore.
}

// ─── Test runner ──────────────────────────────────────────────────────────────
let pass = 0;
let fail = 0;
const failures: string[] = [];

function expect(label: string, ok: boolean, detail?: string) {
  if (ok) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(name: string) {
  console.log(`\n▸ ${name}`);
}

// ─── Imports (after shim) ─────────────────────────────────────────────────────
import { useBeharStore } from "../src/lib/behar-store";

const store = useBeharStore.getState;
const setState = useBeharStore.setState;

// Helper: reset store to a known seed before each scenario
function reset() {
  // re-import seed by resetting persist + reloading defaults
  setState({
    customers: store().customers.filter((c) => c.type === "counter"),
    repairs: [],
    sales: [],
    quotes: [],
    invoices: [],
    payments: [],
    appointments: [],
    documents: [],
    notifications: [],
    auditLogs: [],
    selectedRepairId: "",
    selectedSaleId: "",
    selectedQuoteId: "",
    selectedInvoiceId: "",
    selectedPaymentId: "",
    selectedCustomerId: "",
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// P0 #1 — markInvoicePaid flips linked Rattachée sale to Payée
// ═════════════════════════════════════════════════════════════════════════════
section("P0 #1 — Encaisser facture → vente Rattachée passe à Payée");
reset();
{
  const s = store();
  const customerId = s.addCustomer({ name: "Alice", phone: "0102030405", email: "" });
  const stockItem = s.stockItems[0];
  expect("Stock item disponible pour le test", Boolean(stockItem && stockItem.stock > 0));

  const repairId = s.addRepair({
    customerId,
    device: stockItem.compatibleModels?.[0] ?? "Smartphone",
    deviceModel: stockItem.compatibleModels?.[0] ?? "Modèle",
    issue: "Écran",
    laborPrice: 50,
  });
  expect("Réparation créée", Boolean(repairId));

  const saleId = store().addSale({
    customerId,
    customerName: "Alice",
    lines: [
      {
        stockItemId: stockItem.id,
        name: stockItem.name,
        sku: stockItem.sku,
        itemKind: "accessory",
        warrantyMonths: 3,
        quantity: 1,
        unitPrice: 10,
        total: 10,
      } as any,
    ],
    repairId,
    status: "Rattachée",
  });
  expect("Vente Rattachée créée", Boolean(saleId));
  store().addSaleLinesToRepair(
    repairId,
    [
      {
        stockItemId: stockItem.id,
        name: stockItem.name,
        sku: stockItem.sku,
        itemKind: "accessory",
        warrantyMonths: 3,
        quantity: 1,
        unitPrice: 10,
        total: 10,
      } as any,
    ],
    saleId,
  );

  // Create invoice for the repair
  const invoiceId = store().addInvoice({
    customerId,
    repairId,
    lines: [{ description: "Réparation + accessoire", quantity: 1, unitPrice: 60, total: 60 } as any],
    status: "Envoyée",
  });
  expect("Facture créée pour la répa", Boolean(invoiceId));

  // Pay the invoice
  const paymentId = store().markInvoicePaid(invoiceId, "Carte");
  expect("Paiement encaissé", Boolean(paymentId));

  const saleAfter = store().sales.find((sl) => sl.id === saleId);
  expect(
    "Vente est passée Rattachée → Payée",
    saleAfter?.status === "Payée",
    `status actuel: ${saleAfter?.status}`,
  );
  expect("Vente a un paymentId", Boolean(saleAfter?.paymentId));
  expect("Vente a un paidAt", Boolean(saleAfter?.paidAt));
}

// ═════════════════════════════════════════════════════════════════════════════
// P0 #2 — paySale sur une Rattachée déclenche une notification claire
// ═════════════════════════════════════════════════════════════════════════════
section("P0 #2 — paySale sur Rattachée → notification");
reset();
{
  const s = store();
  const customerId = s.addCustomer({ name: "Bob", phone: "0606060606", email: "" });
  const stockItem = s.stockItems[0];
  const repairId = s.addRepair({
    customerId,
    device: "Smartphone",
    deviceModel: "Test",
    issue: "Test",
    laborPrice: 0,
  });
  const saleId = store().addSale({
    customerId,
    customerName: "Bob",
    lines: [
      {
        stockItemId: stockItem.id,
        name: stockItem.name,
        sku: stockItem.sku,
        itemKind: "accessory",
        warrantyMonths: 3,
        quantity: 1,
        unitPrice: 20,
        total: 20,
      } as any,
    ],
    repairId,
    status: "Rattachée",
  });

  const notifsBefore = store().notifications.length;
  const result = store().paySale(saleId, "Carte");
  expect("paySale retourne chaîne vide pour Rattachée", result === "");
  const notifsAfter = store().notifications;
  expect("Une notification a été ajoutée", notifsAfter.length === notifsBefore + 1);
  expect(
    "Notification mentionne la vente rattachée",
    notifsAfter[0]?.title?.toLowerCase().includes("rattach") ?? false,
    `titre: ${notifsAfter[0]?.title}`,
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// P0 #3 — deleteRepair supprime les ventes Rattachée, délie les ventes payées
// ═════════════════════════════════════════════════════════════════════════════
section("P0 #3 — Supprimer répa → cascade ventes rattachées");
reset();
{
  const s = store();
  const customerId = s.addCustomer({ name: "Carla", phone: "0707070707", email: "" });
  const stockItem = s.stockItems[0];
  const repairId = s.addRepair({
    customerId,
    device: "Smartphone",
    deviceModel: "Test",
    issue: "Test",
    laborPrice: 0,
  });
  const linkedRattacheeId = store().addSale({
    customerId,
    customerName: "Carla",
    lines: [
      {
        stockItemId: stockItem.id,
        name: stockItem.name,
        sku: stockItem.sku,
        itemKind: "accessory",
        warrantyMonths: 3,
        quantity: 1,
        unitPrice: 5,
        total: 5,
      } as any,
    ],
    repairId,
    status: "Rattachée",
  });
  // Simulate a paid sale that ends up linked to the same repair (edge case)
  const linkedPaidId = store().addSale({
    customerId,
    customerName: "Carla",
    lines: [
      {
        stockItemId: stockItem.id,
        name: stockItem.name,
        sku: stockItem.sku,
        itemKind: "accessory",
        warrantyMonths: 3,
        quantity: 1,
        unitPrice: 5,
        total: 5,
      } as any,
    ],
    repairId,
    status: "Brouillon",
  });
  store().paySale(linkedPaidId, "Carte");
  // Manually mark its repairId since paySale doesn't change it
  setState((cur) => ({
    sales: cur.sales.map((sl) => (sl.id === linkedPaidId ? { ...sl, repairId } : sl)),
  }));

  store().deleteRepair(repairId);

  const sales = store().sales;
  expect("Vente Rattachée supprimée", !sales.find((sl) => sl.id === linkedRattacheeId));
  const paidStill = sales.find((sl) => sl.id === linkedPaidId);
  expect("Vente Payée toujours présente", Boolean(paidStill));
  expect("Vente Payée déliée du repairId", paidStill?.repairId === undefined);
}

// ═════════════════════════════════════════════════════════════════════════════
// P1 #4 — updateStockItem propage le nouveau prix aux ventes Brouillon
// ═════════════════════════════════════════════════════════════════════════════
section("P1 #4 — Changer prix stock → ventes Brouillon mises à jour");
reset();
{
  const s = store();
  const customerId = s.addCustomer({ name: "Dan", phone: "0808080808", email: "" });
  const stockItem = s.stockItems[0];
  const originalPrice = stockItem.salePrice;

  const saleId = store().addSale({
    customerId,
    customerName: "Dan",
    lines: [
      {
        stockItemId: stockItem.id,
        name: stockItem.name,
        sku: stockItem.sku,
        itemKind: "accessory",
        warrantyMonths: 3,
        quantity: 2,
        unitPrice: originalPrice,
        total: 2 * originalPrice,
      } as any,
    ],
    status: "Brouillon",
  });
  expect("Vente Brouillon créée", Boolean(saleId));

  const newPrice = originalPrice + 10;
  store().updateStockItem(stockItem.id, { salePrice: newPrice });

  const saleAfter = store().sales.find((sl) => sl.id === saleId);
  const line = saleAfter?.lines.find((l) => l.stockItemId === stockItem.id);
  expect("Ligne mise à jour avec nouveau prix", line?.unitPrice === newPrice, `unitPrice: ${line?.unitPrice}`);
  expect("Total ligne recalculé", line?.total === 2 * newPrice, `total: ${line?.total}`);
  expect("Total vente recalculé", saleAfter?.total === 2 * newPrice, `total: ${saleAfter?.total}`);

  // Now restore price and verify no impact on a Payée sale
  const paidSaleId = store().addSale({
    customerId,
    customerName: "Dan",
    lines: [
      {
        stockItemId: stockItem.id,
        name: stockItem.name,
        sku: stockItem.sku,
        itemKind: "accessory",
        warrantyMonths: 3,
        quantity: 1,
        unitPrice: newPrice,
        total: newPrice,
      } as any,
    ],
    status: "Brouillon",
  });
  store().paySale(paidSaleId, "Carte");
  store().updateStockItem(stockItem.id, { salePrice: newPrice + 50 });
  const paidAfter = store().sales.find((sl) => sl.id === paidSaleId);
  const paidLine = paidAfter?.lines.find((l) => l.stockItemId === stockItem.id);
  expect("Vente Payée NON mise à jour (intégrité comptable)", paidLine?.unitPrice === newPrice);
}

// ═════════════════════════════════════════════════════════════════════════════
// P1 #5 — deleteCustomer bloque si ventes payées
// ═════════════════════════════════════════════════════════════════════════════
section("P1 #5 — Supprimer client avec ventes payées → bloqué");
reset();
{
  const customerId = store().addCustomer({ name: "Eve", phone: "0909090909", email: "" });
  const stockItem = store().stockItems[0];
  const saleId = store().addSale({
    customerId,
    customerName: "Eve",
    lines: [
      {
        stockItemId: stockItem.id,
        name: stockItem.name,
        sku: stockItem.sku,
        itemKind: "accessory",
        warrantyMonths: 3,
        quantity: 1,
        unitPrice: 15,
        total: 15,
      } as any,
    ],
    status: "Brouillon",
  });
  store().paySale(saleId, "Carte");
  store().deleteCustomer(customerId);
  const customer = store().customers.find((c) => c.id === customerId);
  expect("Client toujours présent (ventes payées le bloquent)", Boolean(customer));
}

// ═════════════════════════════════════════════════════════════════════════════
// P1 #6 — updateQuote → Accepté déclenche conversion auto en facture
// ═════════════════════════════════════════════════════════════════════════════
section("P1 #6 — Devis → Accepté = facture créée auto");
reset();
{
  const customerId = store().addCustomer({ name: "Fred", phone: "0202020202", email: "" });
  const quoteId = store().addQuote({
    customerId,
    customerName: "Fred",
    lines: [{ description: "Diag", quantity: 1, unitPrice: 30, total: 30 } as any],
    status: "Envoyé",
    totalAmount: 30,
  });
  expect("Devis créé", Boolean(quoteId));
  const invoicesBefore = store().invoices.length;
  store().updateQuote(quoteId, { status: "Accepté" });
  const invoicesAfter = store().invoices.length;
  expect("Une facture a été créée automatiquement", invoicesAfter === invoicesBefore + 1);
  const quote = store().quotes.find((q) => q.id === quoteId);
  expect("Devis a maintenant un invoiceId", Boolean(quote?.invoiceId));
}

// ═════════════════════════════════════════════════════════════════════════════
// P1 #7 — deleteStockItem bloque si utilisé dans Brouillon
// ═════════════════════════════════════════════════════════════════════════════
section("P1 #7 — Supprimer pièce utilisée → bloqué + notif");
reset();
{
  const customerId = store().addCustomer({ name: "Gina", phone: "0303030303", email: "" });
  const stockItem = store().stockItems[0];
  store().addSale({
    customerId,
    customerName: "Gina",
    lines: [
      {
        stockItemId: stockItem.id,
        name: stockItem.name,
        sku: stockItem.sku,
        itemKind: "accessory",
        warrantyMonths: 3,
        quantity: 1,
        unitPrice: stockItem.salePrice,
        total: stockItem.salePrice,
      } as any,
    ],
    status: "Brouillon",
  });
  const notifsBefore = store().notifications.length;
  store().deleteStockItem(stockItem.id);
  const stillThere = store().stockItems.find((i) => i.id === stockItem.id);
  expect("Pièce non supprimée (utilisée dans brouillon)", Boolean(stillThere));
  expect("Notification de blocage ajoutée", store().notifications.length === notifsBefore + 1);
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n────────────────────────────────────────`);
console.log(`Résultat : ${pass} ✓   ${fail} ✗`);
if (fail > 0) {
  console.log(`\nÉchecs:`);
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
process.exit(0);
