import { expect, test } from "@playwright/test";

import { createPriceBookItem } from "../../src/lib/price-book";
import { DEFAULT_WIDGET_CMS_CONFIG } from "../../src/lib/widget/cms-config";
import { openPoste } from "./helpers/behar-actions";

const WORKSHOP_ID = "10000000-0000-4000-8000-000000000001";
const WIDGET_ID = "40000000-0000-4000-8000-000000000001";
const E2E_LICENSE = "BTP-E2E0-0000-0000-0001";

test("Widget client — aperçu direct, disposition contrôlée et publication", async ({ browser }) => {
  // Une licence synthétique empêche l'hydratation cloud de remplacer le
  // PriceBook et le mode de réception construits expressément par ce test.
  const { context, page } = await openPoste(browser, { name: "WIDGET-CMS", license: E2E_LICENSE });
  const publications: Array<{ config: Record<string, any>; catalog: Array<Record<string, any>> }> = [];
  const drafts: Array<{ config: Record<string, any>; catalog: Array<Record<string, any>> }> = [];
  let publishedVersion = 0;

  await page.route("**/api/behar/widget-settings", async (route) => {
    const body = route.request().postDataJSON() as {
      operation: string;
      config?: Record<string, any>;
      catalog?: Array<Record<string, any>>;
    };
    if (body.operation === "publish") {
      publications.push({ config: body.config || {}, catalog: body.catalog || [] });
      publishedVersion += 1;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ ok: true, publication: { version: publishedVersion } }),
      });
      return;
    }
    if (body.operation === "save_draft") {
      drafts.push({ config: body.config || {}, catalog: body.catalog || [] });
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true }) });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        widget: {
          id: WIDGET_ID,
          publicWidgetId: "wdg_cms_e2e_123456",
          publishedVersion,
          publishedAt: publishedVersion ? new Date().toISOString() : null,
          config: DEFAULT_WIDGET_CMS_CONFIG,
        },
        versions: publishedVersion
          ? [
              {
                version: publishedVersion,
                status: "published",
                created_at: new Date().toISOString(),
                published_at: new Date().toISOString(),
              },
            ]
          : [],
      }),
    });
  });
  await page.route("**/api/behar/widget-assets", async (route) => {
    const contentType = route.request().headers()["content-type"] || "";
    if (contentType.includes("application/json")) {
      const body = route.request().postDataJSON() as { operation?: string };
      if (body.operation === "list") {
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ assets: [] }) });
        return;
      }
    }
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "Import refusé" }),
    });
  });

  const mobilePrice = createPriceBookItem({
    typeAppareil: "smartphone",
    marque: "Apple",
    modele: "iPhone 15",
    reparation: "Batterie",
    piece: "Batterie iPhone 15",
    qualite: "Standard",
    prixAchat: 35,
    prixVentePiece: 99,
    mainOeuvre: 30,
    stockDisponible: 2,
    source: "manual",
  });
  const premiumMobilePrice = createPriceBookItem({
    typeAppareil: "smartphone",
    marque: "Apple",
    modele: "iPhone 15",
    reparation: "Batterie",
    piece: "Batterie iPhone 15 Premium",
    qualite: "Premium",
    prixAchat: 45,
    prixVentePiece: 119,
    mainOeuvre: 30,
    stockDisponible: 1,
    source: "manual",
  });
  const snapshotState = await page.evaluate(
    ({ workshopId, mobilePrice, premiumMobilePrice }) => {
      const key = "behar-tech-local-demo-v3";
      const parsed = JSON.parse(window.localStorage.getItem(key) || '{"state":{},"version":1}');
      parsed.state.cloudSync = { ...(parsed.state.cloudSync || {}), workshopId };
      parsed.state.workshopSettings = {
        ...(parsed.state.workshopSettings || {}),
        customerReceptionMode: "mobile",
      };
      parsed.state.priceBookItems = [mobilePrice, premiumMobilePrice];
      window.localStorage.setItem(key, JSON.stringify(parsed));
      return parsed.state;
    },
    { workshopId: WORKSHOP_ID, mobilePrice, premiumMobilePrice },
  );
  const snapshotUpdatedAt = new Date().toISOString();
  await page.route("**/api/behar/snapshot", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        snapshot: {
          id: "snapshot-widget-cms-e2e",
          workshopId: WORKSHOP_ID,
          licenseKey: E2E_LICENSE,
          workshopName: "Atelier Mobile Premium",
          state: snapshotState,
          stateSizeBytes: JSON.stringify(snapshotState).length,
          updatedAt: snapshotUpdatedAt,
        },
      }),
    });
  });

  await page.goto("/dashboard/parametres/widget", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Widget client" })).toBeVisible();
  const shopName = page.getByTestId("widget-shop-name");
  await shopName.fill("Atelier Mobile Premium");
  await expect(shopName).toHaveValue("Atelier Mobile Premium");
  await expect(page.frameLocator('iframe[title="Aperçu réel du widget"]').getByRole("progressbar")).toBeVisible();

  await page.getByRole("button", { name: "Style" }).click();
  await page.getByLabel("Couleur principale — code hexadécimal").fill("#7C3AED");
  const previewRoot = page
    .frameLocator('iframe[title="Aperçu réel du widget"]')
    .locator('[style*="--w-primary"]')
    .first();
  await expect
    .poll(() => previewRoot.evaluate((element) => (element as HTMLElement).style.getPropertyValue("--w-primary")))
    .toBe("#7C3AED");
  await page.getByText("Style des boutons").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Contour" }).click();

  await page.getByRole("button", { name: "Blocs" }).click();
  await page.getByRole("button", { name: "Deux colonnes" }).click();
  await page.getByRole("button", { name: "Centré" }).click();
  await page.getByRole("button", { name: "Descendre En-tête et logo" }).click();
  await page.getByRole("button", { name: "Masquer Progression" }).click();

  await page.getByTitle("Mobile").click();
  await expect(page.getByTestId("widget-preview")).toBeVisible();

  await page.getByRole("button", { name: "Médias" }).click();
  const upload = page.getByTestId("widget-icon-upload");
  await upload.setInputFiles({ name: "danger.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg></svg>") });
  await expect(page.getByText(/Format refusé/)).toBeVisible();
  await upload.setInputFiles({
    name: "trop-lourd.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
  });
  await expect(page.getByText(/maximum 2 Mo/)).toBeVisible();
  await page.getByRole("button", { name: "Proposée" }).click();
  await page.getByLabel("Mention « Propulsé par Behar Tech Pro »").check();

  await page.getByRole("button", { name: "Affichage" }).click();
  await page.getByRole("button", { name: /Fenêtre modale/ }).click();
  await page.getByRole("button", { name: "Compact", exact: true }).click();

  await page.getByRole("button", { name: /Brouillon/ }).click();
  await expect.poll(() => drafts.length).toBe(1);
  await page.getByRole("button", { name: /Publier/ }).click();
  await expect.poll(() => publications.length).toBe(1);

  const published = publications[0].config as typeof DEFAULT_WIDGET_CMS_CONFIG;
  expect(published.general.commercialName).toBe("Atelier Mobile Premium");
  expect(published.features).toMatchObject({
    booking: false,
    walkIn: false,
    homeService: true,
    quoteRequest: false,
    callbackRequest: false,
  });
  expect(published.displayMode).toBe("modal");
  expect(published.visual.primaryColor).toBe("#7C3AED");
  expect(published.visual.buttonStyle).toBe("outline");
  expect(published.layout.columns).toBe(2);
  expect(published.layout.alignment).toBe("center");
  expect(published.layout.hiddenBlocks).toContain("progress");
  expect(published.layout.blockOrder[1]).toBe("header");
  expect(published.icons.phone.mode).toBe("library");
  expect(published.icons.poweredBy).toBe(true);

  expect(publications[0].catalog).toHaveLength(2);
  expect(publications[0].catalog).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        brand: "Apple",
        model: "iPhone 15",
        issue: "Batterie",
        price: { mode: "exact", amount: 129, currency: "EUR" },
      }),
      expect.objectContaining({
        brand: "Apple",
        model: "iPhone 15",
        issue: "Batterie",
        quality: "Premium",
        price: { mode: "exact", amount: 149, currency: "EUR" },
      }),
    ]),
  );

  await page.getByRole("button", { name: "Affichage" }).click();
  const integrationSection = page.getByRole("heading", { name: "Code d’intégration" }).locator("..").locator("..");
  await expect(integrationSection).toContainText("wdg_cms_e2e_123456");
  await expect(integrationSection).toContainText("https://behartechpro.fr/widget.js");
  const iframeCode = page.getByTestId("widget-iframe-code");
  await expect(iframeCode).toContainText("https://behartechpro.fr/widget/wdg_cms_e2e_123456");
  const aiPrompt = page.locator("textarea[readonly]");
  await expect(aiPrompt).toHaveValue(/wdg_cms_e2e_123456/);
  await expect(aiPrompt).toHaveValue(/https:\/\/behartechpro\.fr\/widget\.js/);
  await expect(aiPrompt).not.toHaveValue(new RegExp(E2E_LICENSE));

  await context.close();
});
