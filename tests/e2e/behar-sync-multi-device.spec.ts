import { expect, type Page, test } from "@playwright/test";

import { openPoste, readStoreState } from "./helpers/behar-actions";
import { runId } from "./helpers/behar-data";

const license = `BHT-2026-SYNC-${runId()}`;

async function clickFirstButton(page: Page, names: string[]): Promise<void> {
  const deadline = Date.now() + 7000;
  while (Date.now() < deadline) {
    for (const name of names) {
      const buttons = page.getByRole("button", { name });
      const count = await buttons.count();
      for (let index = 0; index < count; index += 1) {
        const button = buttons.nth(index);
        if ((await button.isVisible().catch(() => false)) && (await button.isEnabled().catch(() => false))) {
          await button.click();
          return;
        }
      }
    }
    await page.waitForTimeout(150);
  }
  throw new Error(`Bouton introuvable: ${names.join(", ")}`);
}

async function createCounterRepair(page: Page, marker: string): Promise<void> {
  await page.goto("/dashboard/reparations", { waitUntil: "domcontentloaded" });
  await clickFirstButton(page, [
    "Nouvelle prise en charge",
    "Nouvelle réparation",
    "Nouvelle reparation",
    "Ajouter une réparation",
    "Ajouter réparation",
    "Nouveau",
  ]);

  await page
    .getByLabel("Client comptoir")
    .check({ force: true })
    .catch(() => undefined);

  const brand = page.getByPlaceholder("Apple, Samsung, Sony…").first();
  await brand.fill("Apple").catch(() => undefined);
  await page
    .getByRole("option", { name: "Apple" })
    .first()
    .click()
    .catch(async () => {
      await brand.press("Enter").catch(() => undefined);
    });
  const series = page.getByLabel("Gamme / Série").first();
  if ((await series.count()) > 0) {
    await series.fill("iPhone").catch(() => undefined);
    await series.press("Enter").catch(() => undefined);
  }
  const model = page.getByLabel("Modèle").first();
  await model.fill("iPhone 13").catch(async () => {
    await page.getByPlaceholder("Ex. iPhone XR, Switch OLED, ThinkPad…").first().fill("iPhone 13");
  });
  await model.press("Enter").catch(() => undefined);

  const issue = page.getByPlaceholder("Nom intervention (ex: Lecteur carte SIM)").first();
  if ((await issue.count()) === 0 || !(await issue.isVisible().catch(() => false))) {
    await clickFirstButton(page, ["Ajouter Intervention", "+ Ajouter", "Ajouter une intervention"]);
  }
  await page.getByPlaceholder("Nom intervention (ex: Lecteur carte SIM)").first().fill(`Sync écran ${marker}`);
  await page
    .getByPlaceholder(/Prix client final/i)
    .first()
    .fill("129")
    .catch(() => undefined);
  await clickFirstButton(page, ["Utiliser cette intervention", "Ajouter intervention", "Utiliser"]);
  await clickFirstButton(page, ["Créer réparation + devis", "Créer réparation", "Créer", "Enregistrer"]);
}

async function repairCount(page: Page): Promise<number> {
  const state = await readStoreState(page);
  return Array.isArray(state?.repairs) ? state.repairs.length : 0;
}

async function waitForRepairCount(page: Page, previousCount: number) {
  await expect
    .poll(
      async () => {
        return repairCount(page);
      },
      { timeout: 20_000, intervals: [500, 1000, 2000] },
    )
    .toBeGreaterThan(previousCount);
}

test("sync multi-appareils: création réparation A vers B sans refresh", async ({ browser }) => {
  test.setTimeout(90_000);
  const marker = runId();

  const posteA = await openPoste(browser, { name: "poste A", license });
  const posteB = await openPoste(browser, { name: "poste B", license });
  const initialBRepairCount = await repairCount(posteB.page);

  await createCounterRepair(posteA.page, marker);
  await waitForRepairCount(posteB.page, initialBRepairCount);

  await posteA.context.close();
  await posteB.context.close();
});
