import { describe, expect, it } from "vitest";

import { appliedOffers, computeEstimation, estimationLabel, signedMoney } from "@/lib/widget/widget-pricing";
import type { PublicService, WidgetOffer, WidgetOffersConfig } from "@/lib/widget/public-types";

function service(overrides: Partial<PublicService> = {}): PublicService {
  return {
    publicId: overrides.publicId ?? "svc-1",
    category: "Smartphone",
    brand: "Apple",
    model: "iPhone 12",
    issue: "Écran cassé",
    service: "Écran",
    price: { mode: "from", amount: 129 },
    durationMinutes: 45,
    warranty: "12 mois",
    ...overrides,
  };
}

function offer(overrides: Partial<WidgetOffer>): WidgetOffer {
  return {
    id: overrides.id ?? "offer",
    title: overrides.title ?? "Offre",
    displayMode: "icon",
    behavior: "selectable",
    isPublished: true,
    displayOrder: 0,
    ...overrides,
  };
}

describe("computeEstimation", () => {
  it("applique remises (−) et options (+) : 129 − 25 + 10 = 114", () => {
    const services = [service()];
    const offers = [
      offer({ id: "qr", title: "Bonus QualiRépar", fixedDiscount: 25 }),
      offer({ id: "vt", title: "Verre trempé premium", promotionalPrice: 10, originalPrice: 20 }),
    ];
    const estimation = computeEstimation(services, offers, "EUR");
    expect(estimation.base).toBe(129);
    expect(estimation.total).toBe(114);
    expect(estimation.approximate).toBe(true); // prix « à partir de »
    expect(estimation.hasPricedService).toBe(true);
    const kinds = estimation.lines.map((line) => line.kind);
    expect(kinds).toEqual(["service", "discount", "addon"]);
    expect(estimationLabel(estimation, "fr-FR")).toMatch(/^À partir de .*114/);
  });

  it("applique une remise en pourcentage sur la base", () => {
    const estimation = computeEstimation(
      [service({ price: { mode: "exact", amount: 100 } })],
      [offer({ id: "j", percentageDiscount: 25 })],
      "EUR",
    );
    expect(estimation.total).toBe(75);
    expect(estimation.approximate).toBe(false);
  });

  it("reste « Sur devis » sans prix publié", () => {
    const estimation = computeEstimation([service({ price: { mode: "request" } })], [], "EUR");
    expect(estimation.hasPricedService).toBe(false);
    expect(estimation.onRequest).toBe(true);
    expect(estimationLabel(estimation, "fr-FR")).toBe("Sur devis");
  });

  it("ne descend jamais sous 0", () => {
    const estimation = computeEstimation(
      [service({ price: { mode: "exact", amount: 20 } })],
      [offer({ id: "big", fixedDiscount: 50 })],
      "EUR",
    );
    expect(estimation.total).toBe(0);
  });
});

describe("appliedOffers", () => {
  const config: WidgetOffersConfig = {
    enabled: true,
    layout: "list",
    columns: 1,
    offers: [
      offer({ id: "auto", behavior: "automatic" }),
      offer({ id: "pick", behavior: "selectable" }),
      offer({ id: "hidden", behavior: "hidden" }),
      offer({ id: "unpublished", isPublished: false }),
    ],
  };

  it("retient les automatiques + sélectionnées, ignore masquées / non publiées", () => {
    const ids = appliedOffers(config, ["pick", "unpublished"]).map((entry) => entry.id);
    expect(ids).toEqual(["auto", "pick"]);
  });

  it("rend un tableau vide quand les offres sont désactivées", () => {
    expect(appliedOffers({ ...config, enabled: false }, ["pick"])).toEqual([]);
  });
});

describe("signedMoney", () => {
  it("préfixe le signe", () => {
    expect(signedMoney(-25, "EUR", "fr-FR")).toMatch(/^−/);
    expect(signedMoney(10, "EUR", "fr-FR")).toMatch(/^\+/);
  });
});
