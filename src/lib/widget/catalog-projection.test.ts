import { describe, expect, it } from "vitest";

import {
  createPriceBookItem,
  type PriceBookDeviceType,
  type PriceBookItem,
  type PriceBookSource,
} from "@/lib/price-book";
import { leadInputSchema } from "@/lib/widget/public-contracts";
import { buildWidgetCatalog, isEntryAvailableInShop, type WidgetCatalogEntry } from "@/lib/widget/catalog-projection";
import { applyCustomerReceptionPolicy, isHomeServiceOnly } from "@/lib/widget/reception-policy";

type Over = {
  marque: string;
  modele: string;
  reparation: string;
  typeAppareil?: PriceBookDeviceType;
  piece?: string;
  qualite?: string;
  prixVentePiece?: number;
  mainOeuvre?: number;
  prixAchat?: number;
  isActive?: boolean;
  stockDisponible?: number;
  source?: PriceBookSource;
  garantie?: string;
  updatedAt?: string;
};

function mk(over: Over): PriceBookItem {
  const item = createPriceBookItem({
    typeAppareil: over.typeAppareil ?? "smartphone",
    marque: over.marque,
    modele: over.modele,
    reparation: over.reparation,
    piece: over.piece ?? `${over.reparation} ${over.modele}`,
    qualite: over.qualite ?? "Standard",
    prixVentePiece: over.prixVentePiece ?? 90,
    mainOeuvre: over.mainOeuvre ?? 30,
    prixAchat: over.prixAchat ?? 40,
    isActive: over.isActive ?? true,
    stockDisponible: over.stockDisponible,
    source: over.source ?? "manual",
    garantie: over.garantie,
  });
  return over.updatedAt ? { ...item, updatedAt: over.updatedAt } : item;
}

// Catalogue atelier de référence pour les tests.
const priceBook: PriceBookItem[] = [
  mk({
    marque: "Apple",
    modele: "iPhone 13",
    reparation: "Écran",
    stockDisponible: 3,
    garantie: "6 mois",
    updatedAt: "2026-01-01T10:00:00.000Z",
  }),
  // Doublon public (même identité, pièce différente, en rupture) → doit fusionner.
  mk({
    marque: "apple",
    modele: "iPhone 13",
    reparation: "écran",
    piece: "Écran OEM",
    stockDisponible: 0,
    source: "behar_example",
    updatedAt: "2026-01-01T10:00:00.000Z",
  }),
  mk({
    marque: "Apple",
    modele: "iPhone 13",
    reparation: "Écran",
    qualite: "OLED",
    prixVentePiece: 140,
    stockDisponible: 2,
    updatedAt: "2026-01-01T10:00:00.000Z",
  }),
  mk({
    marque: "Apple",
    modele: "iPhone 13",
    reparation: "Batterie",
    prixVentePiece: 44,
    mainOeuvre: 25,
    updatedAt: "2026-01-01T10:00:00.000Z",
  }),
  mk({
    marque: "Apple",
    modele: "iPhone 13",
    reparation: "Diagnostic",
    qualite: "Atelier",
    prixVentePiece: 0,
    mainOeuvre: 0,
    prixAchat: 0,
    updatedAt: "2026-01-01T10:00:00.000Z",
  }),
  // Modèle inactif → exclu.
  mk({ marque: "Apple", modele: "iPhone 12", reparation: "Écran", isActive: false }),
  // Prestation supprimée (désactivée) → exclue.
  mk({ marque: "Apple", modele: "iPhone 13", reparation: "Haut-parleur", isActive: false }),
  // Modèle récent → doit passer devant iPhone 13 dans le classement Apple.
  mk({
    marque: "Apple",
    modele: "iPhone 14",
    reparation: "Écran",
    stockDisponible: 1,
    updatedAt: "2026-07-01T10:00:00.000Z",
  }),
  // Autre catégorie, moins fournie.
  mk({
    typeAppareil: "tablet",
    marque: "Apple",
    modele: "iPad 10",
    reparation: "Écran",
    updatedAt: "2026-03-01T10:00:00.000Z",
  }),
  // Catégorie entièrement inactive → catégorie vide.
  mk({ typeAppareil: "console", marque: "Sony", modele: "PlayStation 5", reparation: "Port HDMI", isActive: false }),
  // Marque activée pour une seule boutique (voir test multi-boutiques).
  mk({
    marque: "Samsung",
    modele: "Galaxy A52",
    reparation: "Écran",
    stockDisponible: 5,
    updatedAt: "2026-02-01T10:00:00.000Z",
  }),
];

const models = (entries: WidgetCatalogEntry[], category: string, brand: string) => {
  const seen: string[] = [];
  for (const entry of entries) {
    if (entry.category === category && entry.brand === brand && !seen.includes(entry.model)) seen.push(entry.model);
  }
  return seen;
};

// Règle « prix exact » large : le réparateur rend public le prix client de tout
// le catalogue. Sans règle, les prix resteraient « sur demande » (voir PROMPT 7).
const EXACT_ALL = [{ mode: "exact" as const }];

describe("buildWidgetCatalog — connexion au vrai catalogue", () => {
  const entries = buildWidgetCatalog(priceBook, { market: "FR", priceRules: EXACT_ALL });

  it("expose un modèle actif avec sa prestation, son prix et sa garantie", () => {
    const screen = entries.find(
      (e) => e.brand === "Apple" && e.model === "iPhone 13" && e.issue === "Écran" && !e.quality,
    );
    expect(screen).toBeDefined();
    expect(screen?.price).toMatchObject({ mode: "exact", currency: "EUR" });
    expect(screen?.warranty).toBe("6 mois");
    expect(screen?.category).toBe("Smartphone");
  });

  it("exclut un modèle inactif", () => {
    expect(entries.some((e) => e.model === "iPhone 12")).toBe(false);
  });

  it("exclut une prestation supprimée (désactivée)", () => {
    expect(entries.some((e) => e.issue === "Haut-parleur")).toBe(false);
  });

  it("laisse une catégorie entièrement inactive vide", () => {
    expect(entries.some((e) => e.category === "Console")).toBe(false);
    expect(entries.some((e) => e.model === "PlayStation 5")).toBe(false);
  });

  it("fusionne les doublons et retient le meilleur (pièce en stock)", () => {
    const screenStd = entries.filter((e) => e.model === "iPhone 13" && e.issue === "Écran" && !e.quality);
    expect(screenStd).toHaveLength(1);
    expect(screenStd[0].stock).toMatchObject({ mode: "simple", status: "available" });
  });

  it("garde les variantes de qualité comme prestations distinctes", () => {
    const qualities = entries
      .filter((e) => e.model === "iPhone 13" && e.issue === "Écran")
      .map((e) => e.quality ?? "Standard");
    expect(qualities).toContain("OLED");
    expect(qualities).toContain("Standard");
  });

  it("bascule en demande de contact quand aucun prix n'est publié", () => {
    const diag = entries.find((e) => e.model === "iPhone 13" && e.issue === "Diagnostic");
    expect(diag?.price?.mode).toBe("request");
  });

  it("classe les catégories les plus fournies d'abord et les modèles récents en tête", () => {
    const categoriesOrder = [...new Set(entries.map((e) => e.category))];
    expect(categoriesOrder[0]).toBe("Smartphone");
    expect(categoriesOrder).toContain("Tablette");
    expect(categoriesOrder.indexOf("Smartphone")).toBeLessThan(categoriesOrder.indexOf("Tablette"));
    // iPhone 14 (récent) doit précéder iPhone 13 chez Apple.
    expect(models(entries, "Smartphone", "Apple")).toEqual(["iPhone 14", "iPhone 13"]);
  });

  it("produit des identifiants publics opaques, stables et déterministes", () => {
    const again = buildWidgetCatalog(priceBook, { market: "FR", priceRules: EXACT_ALL });
    const byModel = (list: WidgetCatalogEntry[]) =>
      list.find((e) => e.model === "iPhone 13" && e.issue === "Batterie")?.publicId;
    expect(byModel(entries)).toBe(byModel(again));
    expect(byModel(entries)).toMatch(/^svc_[a-z0-9]+$/);
    // Aucune donnée interne (pièce, SKU) n'est exposée.
    expect(JSON.stringify(entries)).not.toContain("OEM");
  });

  it("conserve les tarifs exacts pour un réparateur en déplacement uniquement", () => {
    const features = applyCustomerReceptionPolicy(
      {
        booking: true,
        walkIn: true,
        homeService: false,
        quoteRequest: true,
        callbackRequest: true,
        priceEstimate: true,
      },
      "mobile",
    );
    const mobileCatalog = buildWidgetCatalog(priceBook, {
      market: "FR",
      priceRules: features.priceEstimate ? EXACT_ALL : [],
    });
    const battery = mobileCatalog.find((entry) => entry.model === "iPhone 13" && entry.issue === "Batterie");

    expect(isHomeServiceOnly(features)).toBe(true);
    expect(battery?.price).toEqual({ mode: "exact", amount: 69, currency: "EUR" });
  });
});

describe("buildWidgetCatalog — boutiques différentes", () => {
  const shops = ["shop_a", "shop_b"];
  const entries = buildWidgetCatalog(priceBook, {
    shops,
    isEnabledForShop: (item, shop) => (item.marque.toLowerCase() === "samsung" ? shop === "shop_b" : true),
  });

  it("restreint un élément à sa boutique et laisse les autres partout", () => {
    const galaxy = entries.find((e) => e.brand === "Samsung");
    expect(galaxy?.shops).toEqual(["shop_b"]);
    const iphone = entries.find((e) => e.brand === "Apple" && e.model === "iPhone 13");
    expect(iphone?.shops).toBeUndefined(); // activé pour toutes les boutiques
  });

  it("filtre correctement par boutique demandée", () => {
    const galaxy = entries.find((e) => e.brand === "Samsung")!;
    expect(isEntryAvailableInShop(galaxy, "shop_a")).toBe(false);
    expect(isEntryAvailableInShop(galaxy, "shop_b")).toBe(true);
    const iphone = entries.find((e) => e.brand === "Apple")!;
    expect(isEntryAvailableInShop(iphone, "shop_a")).toBe(true);
    expect(isEntryAvailableInShop(iphone, "shop_b")).toBe(true);
  });

  it("supprime un élément activé pour aucune boutique servie", () => {
    const restricted = buildWidgetCatalog(priceBook, {
      shops: ["shop_a"],
      isEnabledForShop: (item) => item.marque !== "Samsung",
    });
    expect(restricted.some((e) => e.brand === "Samsung")).toBe(false);
  });
});

describe("saisie « autre » — texte conservé et transmis au réparateur", () => {
  it("accepte un appareil / modèle / problème hors catalogue et préserve le texte", () => {
    const parsed = leadInputSchema.safeParse({
      type: "callback",
      firstName: "Sarah",
      lastName: "Martin",
      phone: "+33612345678",
      deviceCategory: "Montre connectée",
      brand: "Marque inconnue",
      model: "Modèle importé du client",
      issue: "Problème inhabituel décrit à la main",
      issueDescription: "Autres problèmes : bouton bloqué",
      startedAt: new Date(Date.now() - 5_000).toISOString(),
      consent: {
        service: true,
        marketing: false,
        text: "J’accepte le traitement de ma demande.",
        privacyVersion: "1",
        acceptedAt: new Date().toISOString(),
      },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.deviceCategory).toBe("Montre connectée");
      expect(parsed.data.model).toBe("Modèle importé du client");
      expect(parsed.data.issue).toBe("Problème inhabituel décrit à la main");
    }
  });
});
