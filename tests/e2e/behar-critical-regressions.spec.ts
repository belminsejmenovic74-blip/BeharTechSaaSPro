import { expect, test } from "@playwright/test";

import { bulkSeedViaStore, openPoste, readStoreState } from "./helpers/behar-actions";

const stockBase = {
  shopId: "main_shop",
  deviceType: "Autre",
  compatibleModels: [],
  modelIds: [],
  categoryId: "cat_other",
  categoryName: "Accessoires",
  category: "Accessoires",
  productCategory: "Accessoires",
  itemType: "accessory",
  repairEnabled: false,
  counterSaleEnabled: true,
  counterVisible: true,
  active: true,
  purchasePrice: 2,
  quantity: 5,
  stock: 5,
  threshold: 1,
  supplier: "QA",
  leadTime: "2 à 3 jours",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

test.describe("régressions critiques livraison", () => {
  test("workspace neuf: aucune donnée démo et aucun CA négatif", async ({ browser }) => {
    const { page, context } = await openPoste(browser, { name: "critical-empty-workspace" });

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("CA du jour")).toBeVisible();

    const state = await readStoreState(page);
    expect(state.repairs ?? []).toHaveLength(0);
    expect(state.payments ?? []).toHaveLength(0);
    expect(state.invoices ?? []).toHaveLength(0);
    expect(state.stockItems ?? []).toHaveLength(0);
    expect(state.sales ?? []).toHaveLength(0);

    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/-\s?\d+(?:[,.]\d+)?\s?(?:€|EUR|CHF)/);

    await context.close();
  });

  test("vente comptoir: prix accessoire cohérent et prix manquant bloqué", async ({ browser }) => {
    const { page, context } = await openPoste(browser, { name: "critical-accessory-price" });
    await bulkSeedViaStore(page, {
      stockItems: [
        { ...stockBase, id: "stock_accessory_no_price", sku: "ACC-NOPRICE", name: "Coque sans prix", salePrice: 0 },
        { ...stockBase, id: "stock_accessory_priced", sku: "ACC-PRICED", name: "Coque prix QA", salePrice: 19.9 },
      ],
    });

    await page.goto("/dashboard/ventes", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Coque sans prix")).toBeVisible();
    await expect(page.getByText("Prix à définir")).toBeVisible();
    await page.getByLabel("Coque sans prix - Prix à définir").click();
    await expect(page.getByText("Prix à définir avant encaissement.")).toBeVisible();

    await page.getByLabel("Ajouter Coque prix QA au panier").click();
    await expect(page.locator("body")).toContainText("19,90");
    await page.getByRole("button", { name: "Espèces" }).first().click();
    await page.getByRole("button", { name: "Valider la vente" }).click();
    await page.getByRole("button", { name: "Valider le règlement" }).click();
    await expect(page.getByText("Vente validée.")).toBeVisible();

    const state = await readStoreState(page);
    const sale = state.sales.find((entry: any) => entry.lines?.some((line: any) => line.stockItemId === "stock_accessory_priced"));
    const payment = state.payments.find((entry: any) => entry.saleId === sale?.id);
    expect(sale?.total).toBe(19.9);
    expect(sale?.paymentMethod).toBe("Espèces");
    expect(payment?.amount).toBe(19.9);
    expect(payment?.method).toBe("Espèces");

    await context.close();
  });
});
