// biome-ignore-all lint/suspicious/noExplicitAny: E2E tests deal with raw JSON structures
import { expect, type Page, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

import { openPoste, readStoreState } from "./helpers/behar-actions";
import { STORAGE_KEY } from "./helpers/behar-data";

const PDF_DATA_URL = `data:application/pdf;base64,${Buffer.from(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 180] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 61 >>
stream
BT
/F1 18 Tf
36 120 Td
(Behar Tech Pro PDF QA) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000250 00000 n 
0000000320 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
431
%%EOF`).toString("base64")}`;
const LEGACY_PAYMENT_FILENAME_PATTERN = new RegExp("recu-" + "paiement", "i");

const seed = {
  customers: [
    {
      id: "cust_doc_0",
      shopId: "shop",
      name: "Camille Martin",
      phone: "06 22 33 44 55",
      email: "camille@example.com",
      address: "12 rue des Tests, Annemasse",
      createdAt: "2026-06-26T10:00:00.000Z",
      updatedAt: "2026-06-26T10:00:00.000Z",
    },
  ],
  repairs: [
    {
      id: "rep_doc_0",
      billingCountry: "FR",
      currency: "EUR",
      locale: "fr-FR",
      shopId: "shop",
      number: "REP-2026-DOC1",
      customerId: "cust_doc_0",
      invoiceId: "invoice_doc_0",
      invoiceIds: ["invoice_doc_0"],
      deviceType: "Smartphone",
      brandName: "Apple",
      deviceModel: "iPhone 13",
      device: "Apple iPhone 13",
      model: "iPhone 13",
      issue: "Écran cassé",
      status: "Prêt",
      amount: 149,
      laborPrice: 49,
      total: 149,
      notes: "Dossier QA documents",
      droppedAt: "2026-06-26T10:00:00.000Z",
      estimatedDoneAt: "2026-06-27T10:00:00.000Z",
      technician: "QA Tech",
      imei: "351234567890123",
      parts: [],
      history: ["Dossier créé"],
      publicAccess: { token: "rp_doc_token_0", url: "/suivi/rp_doc_token_0", active: true },
      createdAt: "2026-06-26T10:00:00.000Z",
      updatedAt: "2026-06-26T10:00:00.000Z",
    },
  ],
  invoices: [
    {
      id: "invoice_doc_0",
      billingCountry: "FR",
      currency: "EUR",
      locale: "fr-FR",
      shopId: "shop",
      number: "FAC-2026-DOC1",
      customerId: "cust_doc_0",
      repairId: "rep_doc_0",
      status: "Envoyée",
      date: "2026-06-26",
      lines: [
        { id: "line_doc_0", description: "Remplacement écran iPhone 13", quantity: 1, unitPrice: 149, total: 149 },
      ],
      sourceType: "repair",
      sourceNumber: "REP-2026-DOC1",
      paymentMethod: "Non réglée",
      paymentIds: [],
      createdAt: "2026-06-26T11:00:00.000Z",
      updatedAt: "2026-06-26T11:00:00.000Z",
    },
  ],
  payments: [],
  quotes: [],
  documents: [
    {
      id: "doc_intake_doc_0",
      shopId: "shop",
      type: "intake",
      title: "Bon de prise en charge - REP-2026-DOC1",
      customerId: "cust_doc_0",
      repairId: "rep_doc_0",
      fileUrl: PDF_DATA_URL,
      createdAt: "2026-06-26T10:00:00.000Z",
    },
    {
      id: "doc_invoice_doc_0",
      shopId: "shop",
      type: "invoice",
      title: "Facture - FAC-2026-DOC1",
      customerId: "cust_doc_0",
      repairId: "rep_doc_0",
      invoiceId: "invoice_doc_0",
      fileUrl: PDF_DATA_URL,
      createdAt: "2026-06-26T11:00:00.000Z",
    },
  ],
};

async function injectSeed(
  page: Page,
  options: { brokenIntakePdf?: boolean; repairStatus?: string; paymentStatus?: string } = {},
) {
  await page.evaluate(
    ({ key, seedValue, brokenIntakePdf, repairStatus, paymentStatus }) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const state = parsed.state ?? parsed;
      const repairs = seedValue.repairs.map((repair: any) => ({
        ...repair,
        status: repairStatus ?? repair.status,
        paymentStatus: paymentStatus ?? repair.paymentStatus,
      }));
      const documents = seedValue.documents.map((document: any) =>
        brokenIntakePdf && document.type === "intake"
          ? { ...document, fileUrl: "/api/documents/missing-document.pdf?mode=download" }
          : document,
      );
      Object.assign(state, {
        ...seedValue,
        repairs,
        documents,
        selectedRepairId: "rep_doc_0",
        selectedInvoiceId: "invoice_doc_0",
        selectedDocumentId: "doc_intake_doc_0",
      });
      window.localStorage.setItem(key, JSON.stringify(parsed.state ? parsed : { state, version: 1 }));
    },
    {
      key: STORAGE_KEY,
      seedValue: seed,
      brokenIntakePdf: options.brokenIntakePdf ?? false,
      repairStatus: options.repairStatus,
      paymentStatus: options.paymentStatus,
    },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
}

async function expectPdfDownload(
  page: Page,
  click: () => Promise<void>,
  filenameChecks: { contains?: RegExp; notContains?: RegExp } = {},
) {
  const downloadPromise = page.waitForEvent("download");
  await click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  const bytes = await readFile(path as string);
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  const filename = download.suggestedFilename();
  expect(filename.toLowerCase()).toContain(".pdf");
  if (filenameChecks.contains) expect(filename).toMatch(filenameChecks.contains);
  if (filenameChecks.notContains) expect(filename).not.toMatch(filenameChecks.notContains);
}

async function openCounterDocuments(page: Page) {
  await page.goto("/comptoir", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Documents/i }).click();
  await expect(page.getByText("Tous les fichiers")).toBeVisible();
}

async function openDossierDocuments(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto("/dashboard/dossiers/_/?id=rep_doc_0", { waitUntil: "domcontentloaded" });
    const found = await page
      .locator("body")
      .getByText("REP-2026-DOC1")
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!found) {
      await injectSeed(page);
      continue;
    }
    await page.waitForTimeout(250);
    await page.getByRole("button", { name: "Documents" }).first().click({ force: true });
    await expect(page.getByText("Bon de prise en charge").first()).toBeVisible();
    return;
  }
  throw new Error("Dossier QA introuvable après injection.");
}

function dossierDocumentCard(page: Page, title: string | RegExp) {
  return page.getByText(title).locator("xpath=ancestor::div[.//button][1]");
}

async function openDossierTab(page: Page, name: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto("/dashboard/dossiers/_/?id=rep_doc_0", { waitUntil: "domcontentloaded" });
    const found = await page
      .locator("body")
      .getByText("REP-2026-DOC1")
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!found) {
      await injectSeed(page);
      continue;
    }
    await page.waitForTimeout(300);
    await page.getByRole("button", { name }).first().click({ force: true });
    return;
  }
  throw new Error(`Onglet ${name} indisponible après injection.`);
}

async function gotoPublicTracking(page: Page, status: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await injectSeed(page, { repairStatus: status });
    await page.goto("/suivi/rp_doc_token_0", { waitUntil: "domcontentloaded" });
    const unavailable = await page
      .getByText("Lien de suivi indisponible")
      .isVisible({ timeout: 1_500 })
      .catch(() => false);
    if (!unavailable) return;
  }
}

test.describe("Documents, impression et règlement", () => {
  test("bon de prise en charge: diagnostic et état des photos restent visibles", async ({ browser }) => {
    const { page, context } = await openPoste(browser, { name: "intake-diagnostic-photos" });
    await injectSeed(page);
    await page.goto("/dashboard/documents", { waitUntil: "domcontentloaded" });

    const preview = page.getByTestId("document-preview-panel");
    await expect(preview).toContainText("Diagnostic / intervention");
    await expect(preview).toContainText("Diagnostic");
    await expect(preview).toContainText("Photos");
    await expect(preview).toContainText("Aucune photo jointe");

    await context.close();
  });

  const statusCases = [
    { status: "Reçu", title: "Suivi de votre réparation", badge: "Reçu", active: "Reçu" },
    { status: "Diagnostic", title: "Suivi de votre réparation", badge: "Diagnostic", active: "Diagnostic" },
    { status: "En réparation", title: "Suivi de votre réparation", badge: "Réparation", active: "Réparation" },
    { status: "Test final", title: "Suivi de votre réparation", badge: "Test final", active: "Test final" },
    { status: "Prêt", title: "Suivi de votre réparation", badge: "Prêt", active: "Prêt" },
    { status: "Rendu", title: "Votre réparation est terminée", badge: "Appareil rendu", active: "Appareil rendu" },
    { status: "Clôturé", title: "Votre réparation est terminée", badge: "Dossier clôturé", active: "Dossier clôturé" },
    { status: "Annulé", title: "Votre dossier est annulé", badge: "Annulé", active: "Dossier annulé" },
  ];

  for (const entry of statusCases) {
    test(`portail client: statut ${entry.status} affiche une timeline cohérente`, async ({ browser }) => {
      const { page, context } = await openPoste(browser, { name: `tracking-${entry.status}` });
      await gotoPublicTracking(page, entry.status);
      await expect(page.getByRole("heading", { name: entry.title })).toBeVisible();
      await expect(page.locator("body")).toContainText(entry.badge);
      await expect(page.locator("body")).toContainText(entry.active);
      if (entry.status === "Rendu" || entry.status === "Clôturé") {
        await expect(page.locator("body")).toContainText(
          "Votre appareil a été remis au client. Merci pour votre confiance.",
        );
        await expect(page.locator("body")).not.toContainText(
          "Votre appareil est bien arrivé à l'atelier. Le diagnostic va démarrer.",
        );
      }
      await context.close();
    });
  }

  test("mode Comptoir dossier: télécharger le bon renvoie un PDF, pas un JSON", async ({ browser }) => {
    const { page, context } = await openPoste(browser, { name: "docs-counter-download" });
    await injectSeed(page);
    await openCounterDocuments(page);

    await expectPdfDownload(page, () => page.getByRole("button", { name: "Télécharger PDF" }).first().click());
    await context.close();
  });

  test("mode Comptoir dossier: imprimer le document ouvre un PDF/blob, pas la PWA", async ({ browser }) => {
    const { page, context } = await openPoste(browser, { name: "docs-counter-print" });
    await injectSeed(page);
    await openCounterDocuments(page);

    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Imprimer document" }).first().click();
    const popup = await popupPromise;
    await popup.waitForLoadState("domcontentloaded").catch(() => undefined);
    expect(popup.url()).not.toContain("/dashboard");
    expect(popup.url()).not.toContain("/comptoir");
    await context.close();
  });

  test("mode Comptoir dossier: imprimer QR ouvre seulement la page QR", async ({ browser }) => {
    const { page, context } = await openPoste(browser, { name: "docs-counter-qr" });
    await injectSeed(page);
    await openCounterDocuments(page);

    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Imprimer QR suivi" }).first().click();
    const popup = await popupPromise;
    await expect(popup.locator("body")).toContainText("Dossier");
    await expect(popup.locator("body")).toContainText("Scannez pour suivre votre réparation");
    expect(popup.url()).toContain("/print/qr/");
    await context.close();
  });

  test("atelier/dashboard dossier: télécharger la facture renvoie un PDF", async ({ browser }) => {
    const { page, context } = await openPoste(browser, { name: "docs-invoice-download" });
    await injectSeed(page);
    await openDossierDocuments(page);

    await expectPdfDownload(
      page,
      () => dossierDocumentCard(page, "Facture - FAC-2026-DOC1").getByRole("button", { name: "Télécharger" }).click(),
      {
        contains: /facture-FAC-2026-DOC1\.pdf/i,
        notContains: new RegExp(`${LEGACY_PAYMENT_FILENAME_PATTERN.source}|confirmation-reglement`, "i"),
      },
    );
    await context.close();
  });

  test("facture et confirmation de règlement restent deux documents séparés", async ({ browser }) => {
    const { page, context } = await openPoste(browser, { name: "docs-invoice-payment-separation" });
    await injectSeed(page);
    await openDossierTab(page, "Facture");
    await page.getByRole("button", { name: "Indiquer règlement" }).click();
    await page.getByLabel("Montant réglé").fill("149");
    await page.getByLabel("Moyen de paiement").selectOption("SumUp");
    await page.getByLabel("Référence externe facultative").fill("SUMUP-4242");
    await page.getByLabel("Je confirme que le paiement a été encaissé hors Behar Tech Pro.").check();
    await page.getByRole("button", { name: "Enregistrer le règlement" }).click();

    const state = await readStoreState(page);
    const invoiceDocument = state.documents.find(
      (entry: any) => entry.type === "invoice" && entry.invoiceId === "invoice_doc_0",
    );
    const paymentDocument = state.documents.find(
      (entry: any) => entry.type === "payment" && entry.invoiceId === "invoice_doc_0",
    );
    expect(invoiceDocument.id).not.toBe(paymentDocument.id);

    await page.goto(`/print/document/_/?doc=${invoiceDocument.id}&public=1`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toContainText("FACTURE");
    await expect(page.locator("body")).toContainText("FAC-2026-DOC1");
    await expect(page.locator("body")).toContainText("Moyen de paiement");
    await expect(page.locator("body")).toContainText("SumUp");
    await expect(page.locator("body")).not.toContainText("CONFIRMATION DE RÈGLEMENT");
    await expect(page.locator("body")).not.toContainText("Ce document ne remplace pas une facture");

    await page.goto(`/print/document/_/?doc=${paymentDocument.id}&public=1`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toContainText("CONFIRMATION DE RÈGLEMENT");
    await expect(page.locator("body")).toContainText("Facture liée");
    await expect(page.locator("body")).toContainText("FAC-2026-DOC1");
    await expect(page.locator("body")).toContainText("SUMUP-4242");

    await openDossierDocuments(page);
    await expectPdfDownload(
      page,
      () => dossierDocumentCard(page, "Facture - FAC-2026-DOC1").getByRole("button", { name: "Télécharger" }).click(),
      {
        contains: /facture-FAC-2026-DOC1\.pdf/i,
        notContains: new RegExp(`${LEGACY_PAYMENT_FILENAME_PATTERN.source}|confirmation-reglement`, "i"),
      },
    );
    await expectPdfDownload(
      page,
      () =>
        dossierDocumentCard(page, /Confirmation de règlement - CONF-/i)
          .getByRole("button", { name: "Télécharger" })
          .click(),
      {
        contains: /confirmation-reglement-CONF-\d{4}\.pdf/i,
        notContains: new RegExp(`${LEGACY_PAYMENT_FILENAME_PATTERN.source}|FAC-2026-DOC1`, "i"),
      },
    );
    await context.close();
  });

  test("portail client: télécharger un document renvoie un PDF, pas l'application interne", async ({ browser }) => {
    const { page, context } = await openPoste(browser, { name: "docs-public-download" });
    await injectSeed(page);
    await page.goto("/suivi/rp_doc_token_0", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Suivi de votre réparation")).toBeVisible();

    await expectPdfDownload(page, () => page.getByLabel("Télécharger le document").first().click());
    await context.close();
  });

  test("portail client: la facture liée est visible et consultable", async ({ browser }) => {
    const { page, context } = await openPoste(browser, { name: "docs-public-invoice" });
    await gotoPublicTracking(page, "Prêt");

    const invoiceRow = page.getByRole("listitem").filter({ hasText: "Facture FAC-2026-DOC1" });
    await expect(invoiceRow).toContainText("149,00");
    await expect(invoiceRow.getByRole("button", { name: "Ouvrir" })).toBeVisible();
    await expect(invoiceRow.getByLabel("Télécharger le document")).toBeVisible();
    await context.close();
  });

  test("service worker: les routes documents et print sont exclues du fallback PWA", async ({ page }) => {
    const response = await page.request.get("/sw.js");
    const source = await response.text();
    for (const route of ["/api/documents/", "/documents/", "/document/", "/print/", "/download/", "/qr-print/"]) {
      expect(source).toContain(route);
    }
    expect(source).toContain("isDocumentOrPrintRoute");
  });

  test.skip("erreur génération PDF: affiche une erreur UI et ne télécharge pas de JSON", async ({ browser }) => {
    const { page, context } = await openPoste(browser, { name: "docs-error-json" });
    await injectSeed(page, { brokenIntakePdf: true });
    await openCounterDocuments(page);

    const downloadPromise = page.waitForEvent("download", { timeout: 1500 }).catch(() => null);
    await page.getByRole("button", { name: "Télécharger PDF" }).first().click();
    await expect(page.getByText(/Document impossible à générer/)).toBeVisible();
    expect(await downloadPromise).toBeNull();
    await context.close();
  });

  test("règlement: moyen externe, statut dossier, confirmation et audit sont créés", async ({ browser }) => {
    const { page, context } = await openPoste(browser, { name: "docs-settlement" });
    await injectSeed(page);
    await openDossierTab(page, "Facture");
    await page.getByRole("button", { name: "Indiquer règlement" }).click();
    await page.getByLabel("Montant réglé").fill("149");
    await page.getByLabel("Moyen de paiement").selectOption("Stripe");
    await page.getByLabel("Référence externe facultative").fill("STRIPE-QA-42");
    await page.getByLabel("Je confirme que le paiement a été encaissé hors Behar Tech Pro.").check();
    await page.getByRole("button", { name: "Enregistrer le règlement" }).click();

    const state = await readStoreState(page);
    const repair = state.repairs.find((entry: any) => entry.id === "rep_doc_0");
    const payment = state.payments.find((entry: any) => entry.repairId === "rep_doc_0");
    const document = state.documents.find((entry: any) => entry.paymentId === payment.id);
    const audit = state.auditLogs.find((entry: any) => entry.action === "payment.settlement.created");
    expect(repair.paymentStatus).toBe("Réglée");
    expect(payment.method).toBe("Stripe");
    expect(payment.externalReference).toBe("STRIPE-QA-42");
    expect(document.title).toContain("Confirmation de règlement");
    expect(audit.metadata.newStatus).toBe("Réglée");
    expect(audit.metadata.oldStatus).toBe("À régler");

    await page.goto(`/print/document/_/?doc=${document.id}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Paiement enregistré manuellement")).toBeVisible();
    await expect(page.getByText("Ce document ne remplace pas une facture")).toBeVisible();
    await context.close();
  });

  test("atelier: téléphone rendu, règlement hors Behar et CA encaissé", async ({ browser }) => {
    const { page, context } = await openPoste(browser, { name: "atelier-return-turnover" });
    await injectSeed(page);
    await page.goto("/dashboard/atelier", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("button", { name: /iPhone 13/i })
      .first()
      .click();
    await page.getByRole("button", { name: "Téléphone rendu / règlement" }).click();

    await expect(page.getByText("Téléphone rendu · indiquer le règlement", { exact: true })).toBeVisible();
    await page.getByLabel("Moyen de paiement").selectOption("Carte bancaire");
    await page.getByLabel("Je confirme que le règlement a été encaissé hors Behar Tech Pro.").check();
    await page.getByRole("button", { name: "Enregistrer le règlement" }).click();

    const state = await readStoreState(page);
    const repair = state.repairs.find((entry: any) => entry.id === "rep_doc_0");
    expect(repair.status).toBe("Rendu");
    expect(repair.externalSettlement).toMatchObject({
      status: "Réglé",
      amount: 149,
      method: "Carte bancaire",
      recordedOutsideBeharTechPro: true,
    });
    expect(state.payments).toEqual([]);

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("dashboard-finance-overview")).toContainText("CA encaissé");
    await expect(page.getByTestId("dashboard-finance-overview")).toContainText("149");
    await context.close();
  });

  test("tableau de bord: un téléphone prêt peut être marqué rendu", async ({ browser }) => {
    const { page, context } = await openPoste(browser, { name: "dashboard-return" });
    await injectSeed(page);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: "Téléphone rendu / règlement" }).click();
    await page.getByRole("button", { name: "Non réglé", exact: true }).click();
    await page.getByRole("button", { name: "Marquer le téléphone rendu" }).click();

    const state = await readStoreState(page);
    const repair = state.repairs.find((entry: any) => entry.id === "rep_doc_0");
    expect(repair.status).toBe("Rendu");
    expect(repair.externalSettlement).toMatchObject({ status: "Non réglé", amount: 0 });
    await context.close();
  });

  test("site mobile: restitution accessible directement depuis le tableau de bord", async ({ browser }) => {
    const { page, context } = await openPoste(browser, { name: "mobile-dashboard-return" });
    await page.setViewportSize({ width: 390, height: 844 });
    await injectSeed(page);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Téléphones prêts à rendre", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Téléphone rendu", exact: true }).click();
    await expect(page.getByText("Téléphone rendu · indiquer le règlement", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Non réglé", exact: true }).click();
    await page.getByRole("button", { name: "Marquer le téléphone rendu" }).click();

    const state = await readStoreState(page);
    const repair = state.repairs.find((entry: any) => entry.id === "rep_doc_0");
    expect(repair.status).toBe("Rendu");
    expect(repair.externalSettlement).toMatchObject({ status: "Non réglé", amount: 0 });
    await context.close();
  });
});
