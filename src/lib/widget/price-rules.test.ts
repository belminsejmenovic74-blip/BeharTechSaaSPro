import { describe, expect, it } from "vitest";

import { createPriceBookItem, type PriceBookItem } from "@/lib/price-book";
import {
  buildWidgetCatalog,
  resolvePublicPrice,
  type PriceContext,
  type PriceRule,
  type WidgetCatalogEntry,
} from "@/lib/widget/catalog-projection";

// iPhone 13 Écran : prix client 99 + 30 = 129 € ; prix fournisseur 45 € (jamais publié seul).
const screen = createPriceBookItem({
  typeAppareil: "smartphone",
  marque: "Apple",
  modele: "iPhone 13",
  reparation: "Écran",
  piece: "Écran iPhone 13",
  qualite: "Standard",
  prixVentePiece: 99,
  mainOeuvre: 30,
  prixAchat: 45,
});
const free = createPriceBookItem({
  typeAppareil: "smartphone",
  marque: "Apple",
  modele: "iPhone 13",
  reparation: "Diagnostic",
  piece: "Diagnostic",
  qualite: "Atelier",
  prixVentePiece: 0,
  mainOeuvre: 0,
  prixAchat: 0,
});

const ctx: PriceContext = {
  category: "Smartphone",
  brand: "Apple",
  model: "iPhone 13",
  issue: "Écran",
  quality: "Standard",
  shop: undefined,
};

const price = (rules: PriceRule[], item: PriceBookItem = screen, context: PriceContext = ctx) =>
  resolvePublicPrice(item, context, rules, "FR");

describe("resolvePublicPrice — les cinq modes, choix explicite du réparateur", () => {
  it("sans règle : « sur demande » (le prix n'est pas rendu public)", () => {
    expect(price([])).toEqual({ mode: "request", currency: "EUR" });
  });

  it("prix exact = prix client publié, jamais le prix fournisseur", () => {
    const result = price([{ mode: "exact" }]);
    expect(result).toMatchObject({ mode: "exact", amount: 129, currency: "EUR" });
    expect(result.amount).not.toBe(45);
  });

  it("montant explicite surchargé", () => {
    expect(price([{ mode: "exact", amount: 149 }])).toMatchObject({ mode: "exact", amount: 149 });
  });

  it("« à partir de »", () => {
    expect(price([{ mode: "from" }])).toMatchObject({ mode: "from", amount: 129 });
  });

  it("fourchette explicite et dérivée", () => {
    expect(price([{ mode: "range", min: 120, max: 160 }])).toMatchObject({ mode: "range", min: 120, max: 160 });
    expect(price([{ mode: "range" }])).toMatchObject({ mode: "range", min: 129, max: 129 });
  });

  it("« sur demande » et « masqué » explicites", () => {
    expect(price([{ mode: "request" }])).toMatchObject({ mode: "request" });
    expect(price([{ mode: "hidden" }])).toMatchObject({ mode: "hidden" });
  });

  it("bascule en « sur demande » quand le montant dérivé est nul", () => {
    expect(price([{ mode: "exact" }], free)).toMatchObject({ mode: "request" });
  });

  it("devise CH", () => {
    expect(resolvePublicPrice(screen, ctx, [{ mode: "exact" }], "CH").currency).toBe("CHF");
  });
});

describe("resolvePublicPrice — dépendance et spécificité des règles", () => {
  it("la règle la plus spécifique gagne", () => {
    const rules: PriceRule[] = [{ mode: "exact" }, { mode: "hidden", scope: { model: "iPhone 13" } }];
    expect(price(rules)).toMatchObject({ mode: "hidden" });
  });

  it("à spécificité égale, la dernière déclarée gagne", () => {
    const rules: PriceRule[] = [
      { mode: "exact", scope: { brand: "Apple" } },
      { mode: "hidden", scope: { model: "iPhone 13" } },
    ];
    expect(price(rules)).toMatchObject({ mode: "hidden" });
  });

  it("dépend de la qualité", () => {
    const rules: PriceRule[] = [
      { mode: "hidden", scope: { brand: "Apple" } },
      { mode: "exact", scope: { model: "iPhone 13", quality: "OLED" } },
    ];
    expect(price(rules)).toMatchObject({ mode: "hidden" }); // Standard
    expect(price(rules, screen, { ...ctx, quality: "OLED" })).toMatchObject({ mode: "exact" });
  });

  it("dépend de la boutique", () => {
    const rules: PriceRule[] = [{ mode: "exact" }, { mode: "hidden", scope: { shop: "shop_b" } }];
    expect(price(rules, screen, { ...ctx, shop: "shop_a" })).toMatchObject({ mode: "exact" });
    expect(price(rules, screen, { ...ctx, shop: "shop_b" })).toMatchObject({ mode: "hidden" });
  });
});

describe("buildWidgetCatalog — prix par boutique", () => {
  const priceBook = [screen, free];

  it("sans règle, tout le catalogue est « sur demande »", () => {
    const entries = buildWidgetCatalog(priceBook, {});
    expect(entries.every((entry) => entry.price?.mode === "request")).toBe(true);
  });

  it("scinde une prestation quand son prix diffère selon la boutique", () => {
    const entries = buildWidgetCatalog(priceBook, {
      shops: ["shop_a", "shop_b"],
      priceRules: [{ mode: "exact" }, { mode: "hidden", scope: { shop: "shop_b" } }],
    });
    const screens = entries.filter(
      (entry: WidgetCatalogEntry) => entry.model === "iPhone 13" && entry.issue === "Écran",
    );
    expect(screens).toHaveLength(2);
    const a = screens.find((entry) => entry.shops?.includes("shop_a"));
    const b = screens.find((entry) => entry.shops?.includes("shop_b"));
    expect(a?.price?.mode).toBe("exact");
    expect(b?.price?.mode).toBe("hidden");
    expect(a?.publicId).not.toBe(b?.publicId); // identifiants distincts
    expect(a?.shops).toEqual(["shop_a"]);
    expect(b?.shops).toEqual(["shop_b"]);
  });

  it("une seule entrée quand le prix est identique dans toutes les boutiques", () => {
    const entries = buildWidgetCatalog(priceBook, {
      shops: ["shop_a", "shop_b"],
      priceRules: [{ mode: "exact" }],
    });
    const screens = entries.filter((entry) => entry.model === "iPhone 13" && entry.issue === "Écran");
    expect(screens).toHaveLength(1);
    expect(screens[0].shops).toBeUndefined(); // disponible partout, prix unique
  });
});
