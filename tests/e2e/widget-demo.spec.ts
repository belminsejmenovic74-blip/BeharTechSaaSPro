import { expect, test } from "@playwright/test";

test("widget démo — parcours réel sans message technique", async ({ page }) => {
  await page.goto("/widget/demo", { waitUntil: "networkidle" });
  await expect(page.getByText("Atelier de démonstration")).toBeVisible();

  await page.getByRole("button", { name: "Smartphone" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page
    .getByRole("button", { name: /Samsung/ })
    .first()
    .click();
  await page
    .getByRole("button", { name: /Galaxy S24/ })
    .first()
    .click();

  await expect(page.getByText("Modèle non configuré")).toHaveCount(0);
  await expect(page.getByText(/Ce modèle n’est pas encore configuré/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Continuer" })).toHaveCount(2);
});
