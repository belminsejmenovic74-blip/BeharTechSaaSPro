import percySnapshot from "@percy/playwright";
import { type Page, test } from "@playwright/test";

import { openPoste } from "./helpers/behar-actions";
import { STORAGE_KEY } from "./helpers/behar-data";

// Seed data visual test
const SEED_DATA = {
  customers: [
    {
      id: "cust_visual_0",
      shopId: "shop",
      name: "Jean Dupont",
      phone: "06 12 34 56 78",
      email: "jean.dupont@mail.fr",
      address: "12 rue de la Paix, 74100 Annemasse",
      notes: "Client VIP",
      createdAt: "2026-06-26T10:00:00.000Z",
      updatedAt: "2026-06-26T10:00:00.000Z",
    },
  ],
  repairs: [
    {
      id: "rep_visual_0",
      shopId: "shop",
      number: "REP-2026-0001",
      customerId: "cust_visual_0",
      quoteIds: ["quote_visual_0"],
      invoiceIds: ["invoice_visual_0"],
      deviceType: "phone",
      brandId: "apple",
      brandName: "Apple",
      modelId: "iphone-11",
      deviceModel: "iPhone 11",
      device: "Apple iPhone 11",
      model: "iPhone 11",
      issue: "Écran cassé + Diagnostic batterie",
      status: "Réparation",
      amount: 119,
      laborPrice: 29,
      total: 119,
      notes: "Écran tactile complètement brisé",
      droppedAt: "2026-06-26T10:00:00.000Z",
      estimatedDoneAt: "2026-06-27T10:00:00.000Z",
      technician: "Jean Tech",
      imei: "351234567890123",
      history: ["Réparation créée", "Diagnostic validé", "En cours de réparation"],
      publicAccess: {
        token: "rp_visual_token_123",
        active: true,
      },
    },
  ],
  quotes: [
    {
      id: "quote_visual_0",
      shopId: "shop",
      number: "DEV-2026-0001",
      customerId: "cust_visual_0",
      repairId: "rep_visual_0",
      status: "Accepté",
      date: "2026-06-26T10:00:00.000Z",
      expiryDate: "2026-07-26T10:00:00.000Z",
      lines: [
        {
          id: "ql_0",
          description: "Remplacement bloc écran d'origine iPhone 11",
          quantity: 1,
          unitPrice: 90,
          total: 90,
        },
        {
          id: "ql_1",
          description: "Main d'œuvre remplacement écran",
          quantity: 1,
          unitPrice: 29,
          total: 29,
        },
      ],
      createdAt: "2026-06-26T10:00:00.000Z",
      updatedAt: "2026-06-26T10:00:00.000Z",
      currency: "EUR",
    },
  ],
  invoices: [
    {
      id: "invoice_visual_0",
      shopId: "shop",
      number: "FAC-2026-0001",
      customerId: "cust_visual_0",
      repairId: "rep_visual_0",
      quoteId: "quote_visual_0",
      status: "Payée",
      date: "2026-06-26T11:00:00.000Z",
      lines: [
        {
          id: "il_0",
          description: "Remplacement bloc écran d'origine iPhone 11",
          quantity: 1,
          unitPrice: 90,
          total: 90,
        },
        {
          id: "il_1",
          description: "Main d'œuvre remplacement écran",
          quantity: 1,
          unitPrice: 29,
          total: 29,
        },
      ],
      sourceType: "repair",
      sourceNumber: "REP-2026-0001",
      paymentMethod: "Carte",
      paidAmount: 119,
      paidAt: "2026-06-26T11:15:00.000Z",
      createdAt: "2026-06-26T11:00:00.000Z",
      updatedAt: "2026-06-26T11:00:00.000Z",
      currency: "EUR",
    },
  ],
  payments: [
    {
      id: "pay_visual_0",
      shopId: "shop",
      invoiceId: "invoice_visual_0",
      customerId: "cust_visual_0",
      repairId: "rep_visual_0",
      quoteId: "quote_visual_0",
      paymentNumber: "REC-2026-0001",
      reference: "REC-2026-0001",
      method: "Carte",
      status: "Payé",
      amount: 119,
      date: "2026-06-26T11:15:00.000Z",
      createdAt: "2026-06-26T11:15:00.000Z",
      updatedAt: "2026-06-26T11:15:00.000Z",
    },
  ],
  documents: [
    {
      id: "doc_intake_visual",
      shopId: "shop",
      type: "intake",
      title: "Fiche de prise en charge",
      customerId: "cust_visual_0",
      repairId: "rep_visual_0",
      createdAt: "2026-06-26T10:00:00.000Z",
    },
    {
      id: "doc_quote_visual",
      shopId: "shop",
      type: "quote",
      title: "Aperçu Devis",
      customerId: "cust_visual_0",
      quoteId: "quote_visual_0",
      createdAt: "2026-06-26T10:00:00.000Z",
    },
    {
      id: "doc_invoice_visual",
      shopId: "shop",
      type: "invoice",
      title: "Aperçu Facture",
      customerId: "cust_visual_0",
      invoiceId: "invoice_visual_0",
      createdAt: "2026-06-26T11:00:00.000Z",
    },
  ],
  stockItems: [
    {
      id: "stk_visual_0",
      shopId: "shop",
      name: "Écran iPhone 11 d'origine",
      sku: "SCR-IP11-001",
      reference: "SCR-IP11-001",
      supplier: "Mobilax",
      purchasePrice: 35,
      salePrice: 90,
      quantity: 15,
      stock: 15,
      threshold: 3,
      categoryName: "Pièces",
      createdAt: "2026-06-26T10:00:00.000Z",
      updatedAt: "2026-06-26T10:00:00.000Z",
    },
  ],
  appointments: [
    {
      id: "apt_visual_0",
      shopId: "shop",
      customerId: "cust_visual_0",
      device: "iPhone 11",
      issue: "Écran cassé",
      scheduledAt: "2026-06-27T14:00:00.000Z",
      status: "Confirmé",
      createdAt: "2026-06-26T10:00:00.000Z",
      updatedAt: "2026-06-26T10:00:00.000Z",
    },
  ],
};

async function injectTestData(
  page: Page,
  selectedIds: { repairId?: string; quoteId?: string; invoiceId?: string } = {},
) {
  await page.evaluate(
    ({ key, seed, selected }) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const state = parsed.state ?? parsed;

      // Inject seed data
      state.customers = seed.customers;
      state.repairs = seed.repairs;
      state.quotes = seed.quotes;
      state.invoices = seed.invoices;
      state.payments = seed.payments;
      state.documents = seed.documents;
      state.stockItems = seed.stockItems;
      state.appointments = seed.appointments;

      // Set selected entities
      if (selected.repairId) state.selectedRepairId = selected.repairId;
      if (selected.quoteId) state.selectedQuoteId = selected.quoteId;
      if (selected.invoiceId) state.selectedInvoiceId = selected.invoiceId;

      window.localStorage.setItem(key, JSON.stringify(parsed.state ? parsed : { state, version: 1 }));
    },
    { key: STORAGE_KEY, seed: SEED_DATA, selected: selectedIds },
  );
  await page.reload({ waitUntil: "networkidle" });
}

test.describe("Visual Regression Suite - Behar Tech Pro", () => {
  test("Capture visual snapshots on various viewports and pages", async ({ browser }) => {
    // 1. Initialize page with standard desktop view
    const { page } = await openPoste(browser, {
      name: "Visual_Desktop",
      viewport: { width: 1440, height: 900 },
    });

    // Seed test data and pre-select items
    await injectTestData(page, {
      repairId: "rep_visual_0",
      quoteId: "quote_visual_0",
      invoiceId: "invoice_visual_0",
    });

    // Capture 1: Dashboard
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(500); // stable render
    await percySnapshot(page, "Dashboard Desktop");

    // Capture 1 (tablet & mobile): Responsiveness of Dashboard
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);
    await percySnapshot(page, "Dashboard Tablet");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await percySnapshot(page, "Dashboard Mobile");

    // Reset back to desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });

    // Capture 2: Mode Comptoir
    await page.goto("/comptoir", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await percySnapshot(page, "Mode Comptoir Desktop");

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);
    await percySnapshot(page, "Mode Comptoir Tablet");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await percySnapshot(page, "Mode Comptoir Mobile");

    // Reset back to desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });

    // Capture 3: Mode Atelier
    await page.goto("/atelier", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await percySnapshot(page, "Mode Atelier Desktop");

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);
    await percySnapshot(page, "Mode Atelier Tablet");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await percySnapshot(page, "Mode Atelier Mobile");

    // Reset back to desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });

    // Capture 4: Dossier Réparation (with pre-selected repair in layout)
    await page.goto("/dashboard/reparations", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await percySnapshot(page, "Dossier Réparation");

    // Capture 5: Devis (Dashboard view with pre-selected quote)
    await page.goto("/dashboard/devis", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await percySnapshot(page, "Devis Dashboard");

    // Capture 6: Facture (Dashboard view with pre-selected invoice)
    await page.goto("/dashboard/factures", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await percySnapshot(page, "Facture Dashboard");

    // Capture 7: Stock (Dashboard stock section)
    await page.goto("/dashboard/stock", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await percySnapshot(page, "Stock Dashboard");

    // Capture 8: Paramètres (Dashboard settings section)
    await page.goto("/dashboard/parametres", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await percySnapshot(page, "Paramètres Dashboard");

    // --- PRINT VIEWS (White background pages) ---

    // Capture 9: Document Prise en charge (Local Print view)
    await page.goto("/print/document/_?doc=doc_intake_visual", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await percySnapshot(page, "Document Prise en charge");

    // Capture 10: Devis (Local Print view)
    await page.goto("/print/document/_?doc=doc_quote_visual", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await percySnapshot(page, "Devis Print View");

    // Capture 11: Facture (Local Print view)
    await page.goto("/print/document/_?doc=doc_invoice_visual", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await percySnapshot(page, "Facture Print View");

    // --- PUBLIC VIEWS (Intercepted client tracking QR code / lien) ---

    // Capture 12: Suivi Client QR code / lien (viewport mobile)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/suivi/rp_visual_token_123", { waitUntil: "networkidle" });
    await page.waitForTimeout(800); // extra wait for local storage compilation
    await percySnapshot(page, "Suivi Client Mobile");
  });
});
