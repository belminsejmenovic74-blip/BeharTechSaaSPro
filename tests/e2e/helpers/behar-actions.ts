/**
 * Helpers d'actions UI pour la suite QA.
 *
 * Stratégie : bootstrap de la licence par injection localStorage (la modale
 * d'activation se ferme alors automatiquement), puis navigation par texte/role
 * — robuste aux changements de classes/CSS.
 */

import type { Browser, BrowserContext, Page } from "@playwright/test";

import { LICENSE_MAIN, STORAGE_KEY } from "./behar-data";

/**
 * Crée un contexte navigateur "propre" et active la licence.
 *
 * Deux modes :
 *  - `BEHAR_QA_FAST_SEED=1` : amorçage direct de `localStorage` avant le 1er
 *    load. Pas de modale → le test démarre sur le dashboard. Plus rapide pour
 *    les runs CI / multi-postes.
 *  - sinon : on ouvre l'app, on tape la licence dans le champ de la modale
 *    « Activer Behar Tech Pro », on clique « Activer ». C'est le mode "comme
 *    un vrai utilisateur" — bien visible en headed.
 *
 * Ce drapeau ne concerne que la fixture navigateur. Le serveur n'a plus aucun
 * mode de contournement : les capacités sont toujours lues en base. Un scénario
 * qui exerce la facturation exige donc un atelier de test réellement
 * immatriculé — `workshops.has_billing = true` et un SIRET renseigné — sans
 * quoi les surfaces commerciales seront légitimement absentes.
 */
export async function openPoste(
  browser: Browser,
  opts: { name: string; license?: string; viewport?: { width: number; height: number }; isMobile?: boolean } = {
    name: "poste",
  },
): Promise<{ context: BrowserContext; page: Page }> {
  const license = (opts.license || LICENSE_MAIN).toUpperCase().trim();
  const context = await browser.newContext({
    viewport: opts.viewport ?? (opts.isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }),
    isMobile: opts.isMobile ?? false,
    hasTouch: !!opts.isMobile,
    acceptDownloads: true,
  });

  const page = await context.newPage();
  const useFastInject = process.env.BEHAR_QA_FAST_SEED === "1";

  if (useFastInject) {
    // Mode rapide — injection localStorage avant le 1er load
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(
      ({ key, license }) => {
        const existing = window.localStorage.getItem(key);
        const defaults = {
          licenseKey: license,
          licenseActivated: true,
          onboardingCompleted: true,
          // Session admin pré-créée pour court-circuiter le PinLoginGate
          sessionUserId: "user_admin_qa",
          users: [
            {
              id: "user_admin_qa",
              shopId: "shop",
              name: "QA Admin",
              role: "admin",
              pin: "0000",
              active: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          workshopSettings: {
            name: "Atelier QA",
            commercialName: "Behar Tech QA",
            address: "1 rue de test",
            postalCity: "74100 Annemasse",
            city: "Annemasse",
            postalCode: "74100",
            country: "France",
            // Format valide : le validateur rejette les zéros et les séquences
            // de test, un SIRET factice « 000… » ne passerait plus.
            siret: "83014861800017",
            email: "qa@behartechpro.fr",
            phone: "06 00 00 00 00",
            configuredAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };
        let next: any = { version: 1, state: defaults };
        try {
          if (existing) {
            const parsed = JSON.parse(existing);
            const state = parsed.state ?? parsed;
            next = { ...parsed, state: { ...state, ...defaults } };
          }
        } catch {
          // payload corrompu : on écrase
        }
        window.localStorage.setItem(key, JSON.stringify(next));
      },
      { key: STORAGE_KEY, license },
    );
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    return { context, page };
  }

  // Mode UI — on tape vraiment la licence dans la modale.
  // Délais volontairement longs pour que ce soit VISIBLE en mode headed.
  const typeDelay = Number(process.env.BEHAR_QA_TYPE_DELAY ?? "180"); // ms par caractère
  const pauseBefore = Number(process.env.BEHAR_QA_PAUSE_BEFORE ?? "1200");
  const pauseAfter = Number(process.env.BEHAR_QA_PAUSE_AFTER ?? "1500");

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  // La modale d'activation contient un <input> + un <button>"Activer"
  const input = page
    .locator('input[placeholder*="BT-" i], input[placeholder*="licence" i], input[type="text"]')
    .first();
  const visible = await input
    .waitFor({ state: "visible", timeout: 30_000 })
    .then(() => true)
    .catch(() => false);

  if (visible) {
    // Petite pause pour que l'humain voie la modale s'ouvrir
    await page.waitForTimeout(pauseBefore);
    await input.click();
    await input.fill("");
    // Tape lettre par lettre, BIEN VISIBLE (180 ms par défaut)
    await input.pressSequentially(license, { delay: typeDelay });
    // Pause après saisie pour bien voir la clé tapée avant le clic
    await page.waitForTimeout(600);
    const activateBtn = page.locator('button:has-text("Activer")').first();
    await activateBtn.click().catch(() => {});
    // Bouton devient "Continuer" après succès
    await page
      .locator('button:has-text("Continuer")')
      .first()
      .waitFor({ state: "visible", timeout: 10_000 })
      .catch(() => {});
    // Pause pour voir le succès vert
    await page.waitForTimeout(pauseAfter);
    const continueBtn = page.locator('button:has-text("Continuer")').first();
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click().catch(() => {});
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[openPoste:${opts.name}] Modale d'activation introuvable — licence peut-être déjà active.`);
  }

  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  return { context, page };
}

export async function gotoSection(page: Page, slug: string): Promise<void> {
  await page.goto(`/dashboard/${slug}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
}

/** Essaie plusieurs sélecteurs jusqu'à en trouver un visible. */
export async function findFirstVisible(page: Page, selectors: string[], timeout = 5_000): Promise<string | null> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    for (const sel of selectors) {
      const loc = page.locator(sel).first();
      if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) return sel;
    }
    await page.waitForTimeout(150);
  }
  return null;
}

/** Capture un screenshot dans qa-results/screenshots/ et retourne le chemin relatif. */
export async function snap(page: Page, label: string): Promise<string> {
  const safe = label.replace(/[^a-z0-9._-]+/gi, "-").toLowerCase();
  const file = `qa-results/screenshots/${Date.now()}-${safe}.png`;
  await page.screenshot({ path: file, fullPage: false }).catch(() => {});
  return file;
}

/** Lit l'état Zustand brut depuis localStorage — utile pour vérifier des données sans dépendre du DOM. */
export async function readStoreState(page: Page): Promise<any | null> {
  return page.evaluate((key) => {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.state ?? parsed;
    } catch {
      return null;
    }
  }, STORAGE_KEY);
}

/**
 * Injecte massivement des entités directement dans le state Zustand persisté
 * via localStorage, puis recharge la page. Cela évite de scripter 30 ouvertures
 * de modales lentes alors qu'on veut tester les flux applicatifs en aval.
 *
 * On accepte le risque que cela ne reflète pas exactement le formulaire UI,
 * en contrepartie : 100× plus rapide et déterministe.
 */
export async function bulkSeedViaStore(
  page: Page,
  seed: { customers?: any[]; stockItems?: any[]; repairs?: any[]; appointments?: any[] },
): Promise<void> {
  await page.evaluate(
    ({ key, seed }) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const state = parsed.state ?? parsed;
      if (seed.customers?.length) state.customers = [...(state.customers ?? []), ...seed.customers];
      if (seed.stockItems?.length) state.stockItems = [...(state.stockItems ?? []), ...seed.stockItems];
      if (seed.repairs?.length) state.repairs = [...(state.repairs ?? []), ...seed.repairs];
      if (seed.appointments?.length) state.appointments = [...(state.appointments ?? []), ...seed.appointments];
      window.localStorage.setItem(key, JSON.stringify(parsed.state ? parsed : { state, version: 1 }));
    },
    { key: STORAGE_KEY, seed },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
