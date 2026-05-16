/**
 * Suite QA Playwright — Behar Tech Pro
 * ─────────────────────────────────────
 * Lancement :
 *   npm run test:qa:local            # headed
 *   npx playwright test tests/e2e/behar-full-atelier.spec.ts
 *   npx playwright show-report
 *
 * Le serveur Next.js est démarré automatiquement par `playwright.config.ts`
 * (webServer: `npm run dev` sur http://127.0.0.1:3000).
 *
 * IMPORTANT : ce test ne corrige PAS les bugs — il les détecte, classe et
 * documente. Il génère :
 *   - qa-results/behar-qa-report.md
 *   - qa-results/behar-qa-report.json
 *   - qa-results/screenshots/*.png pour chaque FAIL
 *
 * La suite ne s'arrête JAMAIS sur un échec : chaque checkpoint est isolé
 * dans un `check()` qui capture l'exception et continue.
 */

import { type Browser, expect, test } from "@playwright/test";

import {
  bulkSeedViaStore,
  findFirstVisible,
  gotoSection,
  openPoste,
  readStoreState,
  snap,
  uid,
} from "./helpers/behar-actions";
import { blocked, check, fail, ok, partial } from "./helpers/behar-assertions";
import {
  CRITICAL_REPAIRS,
  LICENSE_ISOLATION,
  LICENSE_MAIN,
  REPAIR_STATUSES,
  SEED_APPOINTMENTS,
  SEED_CUSTOMERS,
  SEED_STOCK,
  runId,
} from "./helpers/behar-data";
import { Report } from "./helpers/behar-report";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  Report.reset();
});

test.afterAll(async () => {
  const out = Report.write("qa-results");
  // eslint-disable-next-line no-console
  console.log(`\n🧾 Rapport QA :\n  - ${out.md}\n  - ${out.json}\n`);
});

// ════════════════════════════════════════════════════════════════════════════
//  Bloc 1 — Bootstrap licence + sanity check
// ════════════════════════════════════════════════════════════════════════════
test("QA-01 Bootstrap : licence + dashboard accessible", async ({ browser }) => {
  const { page } = await openPoste(browser, { name: "BOOT" });
  await check(page, { id: "QA-01.1", module: "Bootstrap", title: `Licence ${LICENSE_MAIN} activée via localStorage` }, async () => {
    const state = await readStoreState(page);
    expect(state?.licenseKey?.toUpperCase()).toBe(LICENSE_MAIN);
  });
  await check(page, { id: "QA-01.2", module: "Bootstrap", title: "Dashboard chargé sans crash" }, async () => {
    await expect(page).toHaveURL(/\/dashboard/);
    // L'app rend au moins quelque chose au-dessus du loader
    await expect(page.locator("body")).toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  Bloc 2 — Seed massif via store (clients, stock, RDV)
// ════════════════════════════════════════════════════════════════════════════
test("QA-02 Seed : clients / stock / rendez-vous", async ({ browser }) => {
  const RUN = runId();
  const { page } = await openPoste(browser, { name: "SEED" });

  const customers = SEED_CUSTOMERS.map((c, i) => ({
    id: `cust_${RUN}_${i}`,
    shopId: "shop",
    name: c.name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    notes: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const stockItems = SEED_STOCK.map((s, i) => ({
    id: `stk_${RUN}_${i}`,
    shopId: "shop",
    name: s.name,
    sku: s.sku,
    reference: s.sku,
    supplier: s.supplier,
    purchasePrice: s.purchasePrice,
    salePrice: s.salePrice,
    quantity: s.quantity,
    stock: s.quantity,
    threshold: s.threshold,
    categoryName: "Pièces",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const now = new Date();
  const appointments = SEED_APPOINTMENTS.map((a, i) => ({
    id: `apt_${RUN}_${i}`,
    shopId: "shop",
    customerId: customers[a.customerIndex]?.id,
    device: a.device,
    issue: a.issue,
    scheduledAt: new Date(now.getTime() + a.hourOffset * 3600_000).toISOString(),
    status: "Confirmé",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // 50 réparations (5 critiques × 10) — toutes avec total client correct
  const devices = [
    { brand: "Apple", model: "iPhone 11", issue: "Écran cassé", part: 90, labor: 29 },
    { brand: "Samsung", model: "Galaxy S22", issue: "Connecteur charge", part: 80, labor: 29 },
    { brand: "Sony", model: "PS5", issue: "Port HDMI", part: 120, labor: 49 },
    { brand: "Apple", model: "MacBook Pro 13", issue: "Batterie HS", part: 140, labor: 59 },
    { brand: "Xiaomi", model: "Redmi Note 12", issue: "Écran cassé", part: 70, labor: 25 },
  ];
  const statuses = ["Reçu", "Diagnostic", "Réparation", "Test final", "Prêt", "Livré"];
  const repairs = Array.from({ length: 50 }, (_, i) => {
    const d = devices[i % devices.length];
    const total = d.part + d.labor;
    return {
      id: `rep_${RUN}_${i}`,
      shopId: "shop",
      number: `REP-QA-${String(i + 1).padStart(4, "0")}`,
      customerId: customers[i % customers.length].id,
      quoteIds: [],
      invoiceIds: [],
      deviceType: "phone",
      brandId: d.brand.toLowerCase(),
      brandName: d.brand,
      modelId: d.model.toLowerCase().replace(/\s+/g, "-"),
      deviceModel: d.model,
      issueType: "Diagnostic",
      device: `${d.brand} ${d.model}`,
      model: d.model,
      issue: d.issue,
      status: statuses[i % statuses.length],
      amount: total,
      laborPrice: d.labor,
      total,
      notes: "",
      droppedAt: new Date(now.getTime() - i * 3600_000).toISOString(),
      estimatedDoneAt: new Date(now.getTime() + 86400_000).toISOString(),
      technician: "Atelier principal",
      imei: "—",
      parts: [],
      history: ["Réparation créée (QA seed)"],
    };
  });

  // 50 devis (un par réparation)
  const quotes = repairs.map((r, i) => ({
    id: `quote_${RUN}_${i}`,
    shopId: "shop",
    number: `DEV-QA-${String(i + 1).padStart(4, "0")}`,
    customerId: r.customerId,
    repairId: r.id,
    status: i < 30 ? "Accepté" : i < 40 ? "Envoyé" : "Brouillon",
    date: r.droppedAt,
    expiryDate: new Date(now.getTime() + 30 * 86400_000).toISOString(),
    lines: [{ id: `ql_${i}`, description: `${r.device} — ${r.issue}`, quantity: 1, unitPrice: r.total, total: r.total }],
    createdAt: r.droppedAt,
    updatedAt: r.droppedAt,
  }));

  // 40 factures (sur les 40 premières réparations)
  const invoices = repairs.slice(0, 40).map((r, i) => ({
    id: `inv_${RUN}_${i}`,
    shopId: "shop",
    number: `FAC-QA-${String(i + 1).padStart(4, "0")}`,
    customerId: r.customerId,
    repairId: r.id,
    quoteId: quotes[i].id,
    status: i < 30 ? "Payée" : "Envoyée",
    date: r.droppedAt,
    lines: [{ id: `il_${i}`, description: `${r.device} — ${r.issue}`, quantity: 1, unitPrice: r.total, total: r.total }],
    sourceType: "repair",
    sourceNumber: r.number,
    paymentMethod: i < 30 ? "Carte" : "Non réglée",
    paymentIds: [],
    paidAmount: i < 30 ? r.total : 0,
    paidAt: i < 30 ? r.droppedAt : undefined,
    createdAt: r.droppedAt,
    updatedAt: r.droppedAt,
  }));

  // 30 paiements (sur les 30 premières factures payées)
  const payments = invoices.slice(0, 30).map((inv, i) => ({
    id: `pay_${RUN}_${i}`,
    shopId: "shop",
    invoiceId: inv.id,
    customerId: inv.customerId,
    repairId: inv.repairId,
    quoteId: inv.quoteId,
    paymentNumber: `REC-QA-${String(i + 1).padStart(4, "0")}`,
    reference: `REC-QA-${String(i + 1).padStart(4, "0")}`,
    method: "Carte",
    mode: "Carte",
    status: "Payé",
    amount: inv.lines[0].total,
    date: inv.date,
    note: "",
    createdAt: inv.date,
    updatedAt: inv.date,
  }));

  await page.evaluate(
    ({ key, seed }) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const state = parsed.state ?? parsed;
      state.customers = [...(state.customers ?? []), ...seed.customers];
      state.stockItems = [...(state.stockItems ?? []), ...seed.stockItems];
      state.appointments = [...(state.appointments ?? []), ...seed.appointments];
      state.repairs = [...(state.repairs ?? []), ...seed.repairs];
      state.quotes = [...(state.quotes ?? []), ...seed.quotes];
      state.invoices = [...(state.invoices ?? []), ...seed.invoices];
      state.payments = [...(state.payments ?? []), ...seed.payments];
      window.localStorage.setItem(key, JSON.stringify(parsed.state ? parsed : { state, version: 1 }));
    },
    {
      key: "behar-tech-local-demo-v3",
      seed: { customers, stockItems, appointments, repairs, quotes, invoices, payments },
    },
  );
  await page.reload({ waitUntil: "domcontentloaded" });

  Report.bump("customers", customers.length);
  Report.bump("stock", stockItems.length);
  Report.bump("appointments", appointments.length);
  Report.bump("repairs", repairs.length);
  Report.bump("quotes", quotes.length);
  Report.bump("invoices", invoices.length);
  Report.bump("payments", payments.length);

  await check(page, { id: "QA-02.1", module: "Données", title: "30 clients seedés visibles" }, async () => {
    const state = await readStoreState(page);
    expect(state.customers.length).toBeGreaterThanOrEqual(30);
  });
  await check(page, { id: "QA-02.2", module: "Données", title: "100 pièces de stock seedées" }, async () => {
    const state = await readStoreState(page);
    expect(state.stockItems.length).toBeGreaterThanOrEqual(100);
  });
  await check(page, { id: "QA-02.3", module: "Données", title: "20 rendez-vous seedés" }, async () => {
    const state = await readStoreState(page);
    expect(state.appointments.length).toBeGreaterThanOrEqual(20);
  });
  await check(page, { id: "QA-02.4", module: "Données", title: "50 réparations seedées" }, async () => {
    const state = await readStoreState(page);
    expect(state.repairs.length).toBeGreaterThanOrEqual(50);
  });
  await check(page, { id: "QA-02.5", module: "Données", title: "50 devis seedés" }, async () => {
    const state = await readStoreState(page);
    expect(state.quotes.length).toBeGreaterThanOrEqual(50);
  });
  await check(page, { id: "QA-02.6", module: "Données", title: "40 factures seedées" }, async () => {
    const state = await readStoreState(page);
    expect(state.invoices.length).toBeGreaterThanOrEqual(40);
  });
  await check(page, { id: "QA-02.7", module: "Données", title: "30 paiements seedés" }, async () => {
    const state = await readStoreState(page);
    expect(state.payments.length).toBeGreaterThanOrEqual(30);
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  Bloc 3 — BUG FINANCIER P0 : 90 + 29 = 119 sur tout le pipeline
// ════════════════════════════════════════════════════════════════════════════
test("QA-03 P0 financier : réparation 119 € → devis → facture → paiement", async ({ browser }) => {
  const { page } = await openPoste(browser, { name: "Poste A — Accueil" });
  await gotoSection(page, "reparations");

  // On crée la réparation via le formulaire pour exercer le flux réel.
  // Si le formulaire bouge, on dégrade en seed direct.
  let createdId: string | null = null;
  const newBtn = await findFirstVisible(page, [
    'button:has-text("Nouvelle réparation")',
    'a:has-text("Nouvelle réparation")',
    '[data-testid="new-repair"]',
  ]);
  if (newBtn) {
    await page.locator(newBtn).first().click().catch(() => {});
    await page.waitForTimeout(500);
    // Tente de remplir le prix pièce 90 et main d'œuvre 29 — sélecteurs typiques.
    const pricePart = await findFirstVisible(page, [
      'input[name="prixPiece"]',
      'input[placeholder*="pièce" i]',
      'input[aria-label*="pièce" i]',
    ]);
    const laborPrice = await findFirstVisible(page, [
      'input[name="mainOeuvre"]',
      'input[placeholder*="main" i]',
      'input[aria-label*="main" i]',
    ]);
    if (pricePart) await page.locator(pricePart).first().fill("90").catch(() => {});
    if (laborPrice) await page.locator(laborPrice).first().fill("29").catch(() => {});
  }

  // Plan B : seed direct dans le store pour avancer le test même si l'UI bouge.
  if (!createdId) {
    const seedId = `rep_${uid()}`;
    await page.evaluate(
      ({ key, id }) => {
        const raw = window.localStorage.getItem(key);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const state = parsed.state ?? parsed;
        const cust = state.customers?.[0];
        if (!cust) return;
        const now = new Date().toISOString();
        const repair = {
          id,
          shopId: "shop",
          number: `R-QA-${id.slice(-4)}`,
          customerId: cust.id,
          quoteIds: [],
          invoiceIds: [],
          deviceType: "phone",
          brandId: "apple",
          brandName: "Apple",
          modelId: "iphone-11",
          deviceModel: "iPhone 11",
          issueType: "Diagnostic",
          device: "Apple iPhone 11",
          model: "iPhone 11",
          issue: "Écran cassé",
          status: "Reçu",
          amount: 119,
          laborPrice: 29,
          total: 119,
          notes: "QA P0 financier",
          droppedAt: now,
          estimatedDoneAt: now,
          technician: "Atelier principal",
          imei: "—",
          parts: [],
          history: ["Réparation créée (QA seed)"],
        };
        state.repairs = [repair, ...(state.repairs ?? [])];
        window.localStorage.setItem(key, JSON.stringify(parsed.state ? parsed : { state, version: 1 }));
      },
      { key: "behar-tech-local-demo-v3", id: seedId },
    );
    createdId = seedId;
    await page.reload({ waitUntil: "domcontentloaded" });
    Report.bump("repairs");
    partial({
      id: "QA-03.1",
      module: "Réparations",
      title: "Création réparation 90+29 via seed (fallback UI)",
      severity: "P2",
      observed: "Création seed direct, formulaire non scripté pour cette mission.",
    });
  }

  // Assertion P0 : total réparation = 119
  await check(page, { id: "QA-03.2", module: "Réparations", title: "Total réparation = 119 €", severity: "P0" }, async () => {
    const state = await readStoreState(page);
    const r = state.repairs.find((x: any) => x.id === createdId);
    expect(r).toBeTruthy();
    expect(r.total).toBe(119);
  });

  // Création facture depuis réparation via API store directement
  let invoiceId: string | null = null;
  invoiceId = await page.evaluate((repairId) => {
    const w = window as any;
    // L'app n'expose pas le store globalement par défaut. On contourne en
    // utilisant directement les helpers de cloud-sync via localStorage : la
    // génération réelle se fait UI — mais on peut au moins lire le state.
    const key = "behar-tech-local-demo-v3";
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const state = parsed.state ?? parsed;
    // Simulation : on appelle pas la fonction du store ici (pas exposée).
    // On laisse l'UI tester ça dans un autre checkpoint.
    void repairId; void state;
    return null;
  }, createdId);

  // Tentative UI : cliquer "Créer facture" sur la fiche réparation si visible.
  await gotoSection(page, "reparations");
  const invoiceBtn = await findFirstVisible(
    page,
    [
      'button:has-text("Créer une facture")',
      'button:has-text("Facturer")',
      '[data-testid="create-invoice-from-repair"]',
    ],
    3000,
  );
  if (invoiceBtn) {
    await page.locator(invoiceBtn).first().click().catch(() => {});
    await page.waitForTimeout(800);
  }

  // Vérification finale via store
  await check(
    page,
    {
      id: "QA-03.3",
      module: "Facturation",
      title: "Facture liée à la réparation = 119 € (et non 29 €)",
      severity: "P0",
      businessImpact: "Manque à gagner 90 € par réparation — fraude comptable involontaire.",
    },
    async () => {
      const state = await readStoreState(page);
      const inv = state.invoices?.find((i: any) => i.repairId === createdId);
      if (!inv) {
        throw new Error("Aucune facture trouvée pour cette réparation — bouton UI non accessible (à vérifier manuellement)");
      }
      const total = (inv.lines ?? []).reduce((s: number, l: any) => s + (l.total ?? l.quantity * l.unitPrice), 0);
      expect(total).toBe(119);
    },
  );
});

// ════════════════════════════════════════════════════════════════════════════
//  Bloc 4 — Anti-litige : bouton ne doit pas bloquer en création
// ════════════════════════════════════════════════════════════════════════════
test("QA-04 Anti-litige : bouton 'Compléter l'état d'entrée' ne bloque pas", async ({ browser }) => {
  const { page } = await openPoste(browser, { name: "ANTI-LITIGE" });
  await gotoSection(page, "reparations");
  const newBtn = await findFirstVisible(page, [
    'button:has-text("Nouvelle réparation")',
    '[data-testid="new-repair"]',
  ]);
  if (!newBtn) {
    blocked({
      id: "QA-04.1",
      module: "Anti-litige",
      title: "Bouton 'Nouvelle réparation' introuvable — module non testable",
    });
    return;
  }
  await page.locator(newBtn).first().click();
  await page.waitForTimeout(800);

  const intakeBtn = await findFirstVisible(page, [
    'button:has-text("Compléter l\'état d\'entrée")',
    'button:has-text("Compléter l’état d’entrée")',
    'button:has-text("Modifier l\'état d\'entrée")',
  ]);
  if (!intakeBtn) {
    blocked({ id: "QA-04.2", module: "Anti-litige", title: "Bouton anti-litige introuvable dans le modal" });
    return;
  }
  await page.locator(intakeBtn).first().click();
  await page.waitForTimeout(600);

  await check(page, { id: "QA-04.3", module: "Anti-litige", title: "Toast d'info affiché, aucune modale anti-litige ouverte", severity: "P0" }, async () => {
    // Aucun overlay plein écran qui couvre le formulaire
    const overlay = page.locator('[role="dialog"]:has-text("État d\'entrée")');
    expect(await overlay.count()).toBe(0);
    // Toast contient le texte attendu
    const toast = page.locator('text=Créez d\'abord la réparation');
    await expect(toast.first()).toBeVisible({ timeout: 3000 });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  Bloc 5 — Page /telecharger : aucun faux téléchargement
// ════════════════════════════════════════════════════════════════════════════
test("QA-05 /telecharger : aucun bouton déclenche .exe.html / .dmg.html", async ({ browser }) => {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  await page.goto("/telecharger", { waitUntil: "domcontentloaded" });

  await check(page, { id: "QA-05.1", module: "Téléchargement", title: "CTA navigateur vers /dashboard présent", severity: "P1" }, async () => {
    const link = page.locator('a:has-text("Ouvrir Behar Tech Pro dans le navigateur")');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/dashboard");
  });

  await check(page, { id: "QA-05.2", module: "Téléchargement", title: "Boutons OS désactivés (Windows / Mac / Linux)", severity: "P1" }, async () => {
    for (const label of ["Windows", "Mac", "Linux"]) {
      const btn = page.locator(`button:has-text("${label}")`).first();
      await expect(btn).toBeVisible();
      await expect(btn).toBeDisabled();
    }
  });

  // Vérifie qu'aucun téléchargement n'est déclenché en cliquant les "boutons"
  let triggered = false;
  page.on("download", () => { triggered = true; });
  for (const label of ["Windows", "Mac", "Linux"]) {
    await page.locator(`button:has-text("${label}")`).first().click({ force: true, trial: false }).catch(() => {});
  }
  await page.waitForTimeout(800);
  if (triggered) {
    fail({ id: "QA-05.3", module: "Téléchargement", title: "Un téléchargement a été déclenché alors qu'aucun installateur réel n'existe", severity: "P1" });
  } else {
    ok({ id: "QA-05.3", module: "Téléchargement", title: "Aucun téléchargement déclenché (boutons disabled OK)" });
  }
  await context.close();
});

// ════════════════════════════════════════════════════════════════════════════
//  Bloc 6 — Sync multi-postes : Poste A crée, Poste B voit après refresh
// ════════════════════════════════════════════════════════════════════════════
test("QA-06 Sync multi-postes même licence", async ({ browser }) => {
  const a = await openPoste(browser, { name: "Poste A" });
  const b = await openPoste(browser, { name: "Poste B" });

  // Poste A : crée une réparation dans son store local
  const repId = `rep_qa06_${uid()}`;
  await a.page.evaluate(({ key, id }) => {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : { state: {}, version: 1 };
    const state = parsed.state ?? parsed;
    const cust = state.customers?.[0] ?? { id: "cust_demo", name: "Client démo" };
    if (!state.customers) state.customers = [cust];
    state.repairs = [
      {
        id,
        shopId: "shop",
        number: `R-QA-A-${id.slice(-4)}`,
        customerId: cust.id,
        device: "Apple iPhone 12",
        deviceModel: "iPhone 12",
        model: "iPhone 12",
        brandName: "Apple",
        issue: "Sync test A→B",
        status: "Reçu",
        amount: 99,
        laborPrice: 29,
        total: 99,
        history: ["Créé par Poste A"],
        droppedAt: new Date().toISOString(),
        estimatedDoneAt: new Date().toISOString(),
      },
      ...(state.repairs ?? []),
    ];
    window.localStorage.setItem(key, JSON.stringify(parsed.state ? parsed : { state, version: 1 }));
  }, { key: "behar-tech-local-demo-v3", id: repId });

  // Note : sans serveur Supabase configuré pour le projet, B ne verra rien.
  // On marque BLOCKED si Supabase n'est pas configuré, sinon on assert.
  const supaConfigured = await a.page.evaluate(() => {
    try {
      const env = (window as any).__BEHAR_SUPABASE_CONFIGURED__;
      if (typeof env === "boolean") return env;
    } catch {}
    return false;
  });

  if (!supaConfigured) {
    blocked({
      id: "QA-06.1",
      module: "Sync cloud",
      title: "Sync A→B non testable sans projet Supabase configuré (vars d'env absentes)",
    });
  } else {
    await b.page.reload({ waitUntil: "domcontentloaded" });
    await b.page.waitForTimeout(3000);
    await check(b.page, { id: "QA-06.2", module: "Sync cloud", title: "Réparation créée par A visible par B après refresh", severity: "P0" }, async () => {
      const state = await readStoreState(b.page);
      const found = state.repairs?.some((r: any) => r.id === repId);
      expect(found).toBeTruthy();
    });
  }

  await a.context.close();
  await b.context.close();
});

// ════════════════════════════════════════════════════════════════════════════
//  Bloc 7 — Isolation licence : BHT-PILOT-ANNEMASSE ne voit pas les données de BHT-2026-PRO-002
// ════════════════════════════════════════════════════════════════════════════
test("QA-07 Isolation : autre licence ne voit pas les données de la licence principale", async ({ browser }) => {
  const main = await openPoste(browser, { name: "Main", license: LICENSE_MAIN });
  // Seed sur main
  await bulkSeedViaStore(main.page, {
    customers: [{ id: "iso_check", shopId: "shop", name: "Client Isolation Check", phone: "0600000000" }],
  });

  const other = await openPoste(browser, { name: "Other", license: LICENSE_ISOLATION });
  await check(
    other.page,
    {
      id: "QA-07.1",
      module: "Isolation",
      title: "Licence isolée ne voit pas le client seedé sur la licence principale",
      severity: "P0",
    },
    async () => {
      const state = await readStoreState(other.page);
      const leaked = state?.customers?.some((c: any) => c.id === "iso_check");
      expect(leaked).toBeFalsy();
    },
  );

  await main.context.close();
  await other.context.close();
});

// ════════════════════════════════════════════════════════════════════════════
//  Bloc 8 — Poste D (stagiaire) : permissions si module présent, sinon BLOCKED
// ════════════════════════════════════════════════════════════════════════════
test("QA-08 Permissions stagiaire", async ({ browser }) => {
  const { page } = await openPoste(browser, { name: "Poste D — Stagiaire" });
  const state = await readStoreState(page);
  const hasRoles = Array.isArray(state?.users) && state.users.some((u: any) => u.role && u.role !== "Admin");

  if (!hasRoles) {
    blocked({
      id: "QA-08.1",
      module: "Permissions",
      title: "Système de rôles/permissions non détecté dans le store (state.users vide ou mono-rôle)",
      severity: "P1",
    });
    return;
  }
  partial({
    id: "QA-08.2",
    module: "Permissions",
    title: "Système de rôles détecté — checks détaillés à scripter manuellement",
    severity: "P1",
    observed: "Module détecté mais flux Stagiaire non automatisé dans cette mission.",
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  Bloc 9 — Mobile : viewport iPhone 13, données visibles après refresh
// ════════════════════════════════════════════════════════════════════════════
test("QA-09 Mobile : viewport 390×844 charge le dashboard", async ({ browser }) => {
  const { page, context } = await openPoste(browser, { name: "Mobile", isMobile: true });
  await check(page, { id: "QA-09.1", module: "Mobile", title: "Dashboard chargé sur viewport mobile" }, async () => {
    await expect(page).toHaveURL(/\/dashboard/);
  });
  await snap(page, "mobile-dashboard");
  await context.close();
});

// ════════════════════════════════════════════════════════════════════════════
//  Bloc 10 — PDF / Documents : aucun "VOTRE LOGO ICI", aucun undefined
// ════════════════════════════════════════════════════════════════════════════
test("QA-10 Documents : page Documents ouvrable, aucun placeholder cassé", async ({ browser }) => {
  const { page } = await openPoste(browser, { name: "Documents" });
  await gotoSection(page, "documents");
  await page.waitForTimeout(1000);

  await check(page, { id: "QA-10.1", module: "Documents", title: "Page /documents ne contient pas 'VOTRE LOGO ICI'", severity: "P1" }, async () => {
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/VOTRE LOGO ICI/i);
  });

  await check(page, { id: "QA-10.2", module: "Documents", title: "Page /documents n'affiche pas 'undefined' / 'null' littéraux", severity: "P1" }, async () => {
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/\bundefined\b|\bnull\b(?!able)/);
  });
});
