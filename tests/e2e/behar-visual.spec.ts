import percySnapshot from "@percy/playwright";
import { expect, type Page, test } from "@playwright/test";

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

const desktopViewport = { width: 1440, height: 900 };
const tabletViewport = { width: 768, height: 1024 };
const mobileViewport = { width: 390, height: 844 };

const visualTargets = [
  { name: "Dashboard Desktop", path: "/dashboard", viewport: desktopViewport },
  { name: "Dashboard Tablet", path: "/dashboard", viewport: tabletViewport },
  { name: "Dashboard Mobile", path: "/dashboard", viewport: mobileViewport },
  { name: "Mode Comptoir Desktop", path: "/comptoir", viewport: desktopViewport },
  { name: "Mode Comptoir Tablet", path: "/comptoir", viewport: tabletViewport },
  { name: "Mode Comptoir Mobile", path: "/comptoir", viewport: mobileViewport },
  { name: "Mode Atelier Desktop", path: "/atelier", viewport: desktopViewport },
  { name: "Mode Atelier Tablet", path: "/atelier", viewport: tabletViewport },
  { name: "Mode Atelier Mobile", path: "/atelier", viewport: mobileViewport },
  { name: "Reparations Dashboard", path: "/dashboard/reparations", viewport: desktopViewport },
  { name: "Dossier Reparation Detail", path: "/dashboard/dossiers/rep_visual_0", viewport: desktopViewport },
  { name: "Documents Dashboard", path: "/dashboard/documents", viewport: desktopViewport },
  { name: "Devis Dashboard", path: "/dashboard/devis", viewport: desktopViewport },
  { name: "Facture Dashboard", path: "/dashboard/factures", viewport: desktopViewport },
  { name: "Suivi Client Mobile", path: "/suivi/rp_visual_token_123", viewport: mobileViewport },
  { name: "Stock Dashboard", path: "/dashboard/stock", viewport: desktopViewport },
  { name: "Parametres Dashboard", path: "/dashboard/parametres", viewport: desktopViewport },
  { name: "Document Prise en charge", path: "/print/document/_?doc=doc_intake_visual", viewport: desktopViewport },
  { name: "Devis Print View", path: "/print/document/_?doc=doc_quote_visual", viewport: desktopViewport },
  { name: "Facture Print View", path: "/print/document/_?doc=doc_invoice_visual", viewport: desktopViewport },
] as const;

async function capturePercyTarget(page: Page, target: (typeof visualTargets)[number]) {
  await page.setViewportSize(target.viewport);
  await page.goto(target.path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
  await expect(page.locator("body")).toBeVisible();
  await page.waitForTimeout(500);
  await percySnapshot(page, target.name);
}

test.describe("Visual Regression Suite - Behar Tech Pro", () => {
  test("Capture visual snapshots on various viewports and pages", async ({ browser }) => {
    const { page } = await openPoste(browser, {
      name: "Visual_Desktop",
      viewport: desktopViewport,
    });

    await injectTestData(page, {
      repairId: "rep_visual_0",
      quoteId: "quote_visual_0",
      invoiceId: "invoice_visual_0",
    });

    for (const target of visualTargets) {
      await capturePercyTarget(page, target);
    }
  });
});
