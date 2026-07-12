import { expect, test } from "@playwright/test";

test("widget démo — parcours réel sans message technique", async ({ page }) => {
  await page.goto("/widget/demo", { waitUntil: "networkidle" });
  await expect(page.getByText("Atelier de démonstration")).toHaveCount(0);
  await expect(page.getByRole("progressbar", { name: "Appareil — 1 / 4" })).toBeVisible();

  await page.getByRole("button", { name: "Smartphone" }).click();
  await page.getByRole("button", { name: "Apple" }).click();
  await page.getByRole("button", { name: "iPhone SE (2020)" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();

  await page.getByRole("button", { name: /Écran cassé/ }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByRole("heading", { name: "Choisissez la qualité de votre réparation" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Personnalisez votre réparation" })).toBeVisible();

  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(
    page.getByRole("heading", { name: "Comment souhaitez-vous nous confier votre appareil ?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Venir directement/ }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByRole("heading", { name: "Vos coordonnées" })).toBeVisible();

  await expect(page.getByText("Modèle non configuré")).toHaveCount(0);
  await expect(page.getByText(/Ce modèle n’est pas encore configuré/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Envoyer ma demande" })).toBeDisabled();
});

test("recherche intégrée — appareil, marque et modèle ouvrent le widget prérempli", async ({ page, baseURL }) => {
  await page.route("**/api/public/widgets/demo/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/\/$/, "");
    const data = path.endsWith("/config")
      ? { sessionToken: "demo-token" }
      : path.endsWith("/categories")
        ? { categories: ["Smartphone", "Tablette"] }
        : path.endsWith("/brands")
          ? { brands: ["Apple", "Samsung"] }
          : { models: ["iPhone SE (2020)", "iPhone 15"] };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({ data }),
    });
  });

  const scriptUrl = new URL("/widget.js", baseURL).toString();
  await page.setContent(
    `<main style="padding:40px"><div data-behar-widget-search></div></main><script src="${scriptUrl}" data-widget-id="demo"></script>`,
  );

  await page.getByLabel("Quel appareil ?").selectOption("Smartphone");
  await page.getByLabel("Quelle marque ?").selectOption("Apple");
  await page.getByLabel("Quel modèle ?").selectOption("iPhone SE (2020)");
  await page.getByRole("button", { name: "Voir les réparations et les prix" }).click();

  await expect(page.locator("[data-behar-widget-overlay] iframe")).toHaveAttribute("src", /type=Smartphone/);
  await expect(page.locator("[data-behar-widget-overlay] iframe")).toHaveAttribute("src", /brand=Apple/);
  await expect(page.locator("[data-behar-widget-overlay] iframe")).toHaveAttribute(
    "src",
    /model=iPhone\+SE\+%282020%29/,
  );
});
