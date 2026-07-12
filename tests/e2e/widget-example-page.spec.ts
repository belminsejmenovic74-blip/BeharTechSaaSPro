import { expect, test } from "@playwright/test";

const PUBLIC_ID = "wdg_example_e2e_123456";

test("page exemple — le chargeur ouvre le vrai widget publié", async ({ page }) => {
  await page.route(`**/api/public/widgets/${PUBLIC_ID}/config`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          id: PUBLIC_ID,
          active: true,
          displayMode: "modal",
          general: { commercialName: "Atelier Test", locale: "fr-FR", currency: "EUR" },
          visual: { primaryColor: "#167B70", radius: 16 },
          texts: {},
          features: { booking: true, quoteRequest: true, callbackRequest: true },
          catalogPolicy: {
            allowOutOfCatalog: true,
            allowUnconfiguredModels: true,
            allowUnconfiguredIssues: true,
            allowOutOfCatalogAppointments: true,
            fallbackMode: "quote",
          },
          layout: {},
          icons: { poweredBy: true },
          booking: { days: [1, 2, 3, 4, 5, 6], start: "09:00", end: "18:00" },
          offers: { enabled: false, layout: "list", columns: 1, offers: [] },
          publishedAt: new Date().toISOString(),
          shops: [
            {
              id: "shop_example_123456",
              name: "Atelier Test",
              address: { address: "1 rue du Test", postalCode: "75001", city: "Paris", country: "FR" },
              timezone: "Europe/Paris",
            },
          ],
          sessionToken: "e2e-session-token",
        },
        meta: { requestId: "e2e", widgetVersion: 1 },
      }),
    });
  });
  await page.route(`**/api/public/widgets/${PUBLIC_ID}/events`, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { accepted: true } }) }),
  );

  await page.goto(`/exemple-widget/${PUBLIC_ID}`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Votre appareil mérite une seconde vie." })).toBeVisible();
  await page.getByRole("button", { name: /Démarrer mon estimation/ }).click();

  const overlay = page.locator("[data-behar-widget-overlay]");
  await expect(overlay).toBeVisible();
  const widget = page.frameLocator('iframe[title="Demande de devis ou rendez-vous"]');
  await expect(widget.getByText("Atelier Test")).toBeVisible();
  await expect(widget.getByRole("heading", { name: "Quel type d’appareil souhaitez-vous réparer ?" })).toBeVisible();
});
