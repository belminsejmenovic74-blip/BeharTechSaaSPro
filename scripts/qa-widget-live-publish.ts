import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { normalizeEditableWidgetConfig, type EditableWidgetConfig } from "../src/lib/widget/cms-config";
import { buildWidgetCatalog } from "../src/lib/widget/catalog-projection";
import type { PriceBookItem } from "../src/lib/price-book";

const WORKSHOP_ID = "2fcecc53-1f3c-4676-ad40-a3bf7288d0e8";
const APP_ORIGIN = "https://app.behartechpro.fr";
const HOST_ORIGIN = "https://behartechpro.fr";
const DEMO_URL = `${HOST_ORIGIN}/exemple`;
const TEMP_PRIMARY = "#7C3AED";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error("Variables Supabase QA manquantes.");

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${APP_ORIGIN}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || `${path} a répondu ${response.status}.`);
  return payload;
}

async function publicGet<T>(publicId: string, path: string, token?: string): Promise<T> {
  const response = await fetch(`${APP_ORIGIN}/api/public/widgets/${publicId}${path}`, {
    headers: {
      origin: HOST_ORIGIN,
      "x-behar-host-origin": HOST_ORIGIN,
      ...(token ? { "x-widget-token": token } : {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as { data?: T; error?: { message?: string } };
  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message || `API publique ${path}: ${response.status}.`);
  }
  return payload.data;
}

async function main() {
  const [{ data: snapshot, error: snapshotError }, { data: row, error: widgetError }] = await Promise.all([
    admin
      .from("workshop_snapshots")
      .select("license_key,state")
      .eq("workshop_id", WORKSHOP_ID)
      .maybeSingle(),
    admin
      .from("widget_settings")
      .select("id,public_widget_id,published_config,allowed_domains")
      .eq("tenant_id", WORKSHOP_ID)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  if (snapshotError || !snapshot) throw new Error("Snapshot de l’atelier de démonstration introuvable.");
  if (widgetError || !row) throw new Error("Widget de l’atelier de démonstration introuvable.");

  const state = (snapshot.state ?? {}) as Record<string, unknown>;
  const priceBook = Array.isArray(state.priceBookItems) ? (state.priceBookItems as PriceBookItem[]) : [];
  const original = normalizeEditableWidgetConfig(row.published_config);
  const catalog = buildWidgetCatalog(priceBook, {
    market: original.general.currency === "CHF" ? "CH" : "FR",
    stockMode: original.features.stockAvailability ? "simple" : "hidden",
    priceRules: original.features.priceEstimate ? [{ mode: "exact" }] : [],
  });
  if (!catalog.length) throw new Error("Le vrai catalogue de démonstration est vide.");
  if (!catalog.some((entry) => entry.price?.mode === "exact" && Number(entry.price.amount) > 0)) {
    throw new Error("Aucun tarif client exact n’a été projeté.");
  }

  const baseRequest = {
    workshopId: WORKSHOP_ID,
    licenseKey: snapshot.license_key,
    widgetId: row.id,
    catalog,
    allowedDomains: row.allowed_domains,
  };
  const publish = (config: EditableWidgetConfig) =>
    postJson<{ ok: true; publication: { version: number } }>("/api/behar/widget-settings/", {
      operation: "publish",
      ...baseRequest,
      config,
    });
  const restoreDirectly = async () => {
    const configuration = { ...original, catalog };
    const { error } = await admin.rpc("publish_widget_config", {
      p_tenant_id: WORKSHOP_ID,
      p_widget_id: row.id,
      p_configuration: configuration,
      p_display_mode: original.displayMode,
      p_internal_name: original.internalName,
      p_active: original.active,
      p_created_by: null,
    });
    if (error) throw error;
  };

  const temporary: EditableWidgetConfig = {
    ...original,
    visual: {
      ...original.visual,
      primaryColor: TEMP_PRIMARY,
      buttonColor: TEMP_PRIMARY,
      buttonTextColor: "#FFFFFF",
    },
  };

  let temporaryPublished = false;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    let publication: { ok: true; publication: { version: number } };
    try {
      publication = await publish(temporary);
      temporaryPublished = true;
    } catch (error) {
      // Certaines erreurs post-publication peuvent arriver après le RPC
      // atomique. On détecte cet état pour garantir la restauration.
      const current = await publicGet<{ visual: { primaryColor?: string } }>(row.public_widget_id, "/config/").catch(
        () => null,
      );
      temporaryPublished = current?.visual.primaryColor === TEMP_PRIMARY;
      throw error;
    }

    const publicConfig = await publicGet<{
      visual: { primaryColor?: string };
      sessionToken: string;
      shops: Array<{ id: string }>;
    }>(row.public_widget_id, "/config/");
    if (publicConfig.visual.primaryColor !== TEMP_PRIMARY) {
      throw new Error(`Couleur publique inattendue: ${publicConfig.visual.primaryColor || "absente"}.`);
    }

    const first = catalog[0];
    const query = new URLSearchParams({
      category: first.category,
      brand: first.brand,
      model: first.model,
      issue: first.issue,
      ...(publicConfig.shops[0]?.id ? { shop: publicConfig.shops[0].id } : {}),
    });
    const publicServices = await publicGet<{ services: Array<{ price?: { mode?: string; amount?: number } }> }>(
      row.public_widget_id,
      `/services/?${query}`,
      publicConfig.sessionToken,
    );
    if (!publicServices.services.some((service) => service.price?.mode === "exact" && Number(service.price.amount) > 0)) {
      throw new Error("Le tarif exact n’est pas lisible depuis l’API publique.");
    }

    browser = await chromium.launch({ channel: "chrome", headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    await page.goto(DEMO_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByLabel("Quel appareil ?").selectOption({ label: first.category });
    await page.getByLabel("Quelle marque ?").selectOption({ label: first.brand });
    await page.getByLabel("Quel modèle ?").selectOption({ label: first.model });
    await page.getByRole("button", { name: "Voir les réparations et les prix" }).click();
    const frame = page.frameLocator("[data-behar-widget-overlay] iframe");
    await frame.getByRole("progressbar").waitFor({ state: "visible", timeout: 30_000 });
    const livePrimary = await frame.locator("div[style*='--w-primary']").first().evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--w-primary").trim().toUpperCase(),
    );
    if (livePrimary !== TEMP_PRIMARY) throw new Error(`Thème navigateur inattendu: ${livePrimary}.`);
    if (browserErrors.length) throw new Error(`Erreur navigateur: ${browserErrors.join(" | ")}`);

    console.log(
      JSON.stringify({
        ok: true,
        publicWidgetId: row.public_widget_id,
        temporaryVersion: publication.publication.version,
        testedPrimaryColor: TEMP_PRIMARY,
        catalogEntries: catalog.length,
        exactPrices: catalog.filter((entry) => entry.price?.mode === "exact").length,
        demoIntegration: "ok",
      }),
    );
  } finally {
    await browser?.close().catch(() => undefined);
    if (temporaryPublished) {
      // On remet l’apparence d’origine tout en conservant le catalogue réel
      // fraîchement resynchronisé dans la version publique finale.
      await restoreDirectly();
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
