import { expect, test } from "@playwright/test";

import { DEFAULT_WIDGET_CMS_CONFIG } from "../../src/lib/widget/cms-config";
import { openPoste } from "./helpers/behar-actions";

const WORKSHOP_ID = "10000000-0000-4000-8000-000000000001";
const WIDGET_ID = "40000000-0000-4000-8000-000000000001";

test("Widget client — aperçu direct, disposition contrôlée et publication", async ({ browser }) => {
  const { context, page } = await openPoste(browser, { name: "WIDGET-CMS" });
  const publications: Array<Record<string, unknown>> = [];
  const drafts: Array<Record<string, unknown>> = [];
  let publishedVersion = 0;

  await page.route("**/api/behar/widget-settings", async (route) => {
    const body = route.request().postDataJSON() as { operation: string; config?: Record<string, unknown> };
    if (body.operation === "publish") {
      publications.push(body.config || {});
      publishedVersion += 1;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ ok: true, publication: { version: publishedVersion } }),
      });
      return;
    }
    if (body.operation === "save_draft") {
      drafts.push(body.config || {});
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

  await page.evaluate(
    ({ workshopId }) => {
      const key = "behar-tech-local-demo-v3";
      const parsed = JSON.parse(window.localStorage.getItem(key) || '{"state":{},"version":1}');
      parsed.state.cloudSync = { ...(parsed.state.cloudSync || {}), workshopId };
      window.localStorage.setItem(key, JSON.stringify(parsed));
    },
    { workshopId: WORKSHOP_ID },
  );

  await page.goto("/dashboard/parametres/widget", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Widget client" })).toBeVisible();
  await page.getByTestId("widget-shop-name").fill("Atelier Mobile Premium");
  await expect(
    page.frameLocator('iframe[title="Aperçu réel du widget"]').getByText("Atelier Mobile Premium"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Style" }).click();
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

  const published = publications[0] as typeof DEFAULT_WIDGET_CMS_CONFIG;
  expect(published.general.commercialName).toBe("Atelier Mobile Premium");
  expect(published.displayMode).toBe("modal");
  expect(published.visual.buttonStyle).toBe("outline");
  expect(published.layout.columns).toBe(2);
  expect(published.layout.alignment).toBe("center");
  expect(published.layout.hiddenBlocks).toContain("progress");
  expect(published.layout.blockOrder[1]).toBe("header");
  expect(published.icons.phone.mode).toBe("library");
  expect(published.icons.poweredBy).toBe(true);

  await context.close();
});
