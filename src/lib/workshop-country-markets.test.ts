import { describe, expect, it } from "vitest";

import { getAllowedCurrencies, normalizeAllowedMarkets, resolveAllowedMarket } from "./workshop-country";

describe("marchés et devises autorisés", () => {
  it("France uniquement ne propose que EUR", () => {
    expect(normalizeAllowedMarkets(["FR"], "FR")).toEqual(["FR"]);
    expect(getAllowedCurrencies(["FR"], "FR")).toEqual(["EUR"]);
    expect(resolveAllowedMarket("CH", ["FR"], "FR")).toBe("FR");
  });

  it("Suisse uniquement ne propose que CHF", () => {
    expect(normalizeAllowedMarkets(["CH"], "CH")).toEqual(["CH"]);
    expect(getAllowedCurrencies(["CH"], "CH")).toEqual(["CHF"]);
  });

  it("France et Suisse conservent les deux devises sans doublon", () => {
    expect(normalizeAllowedMarkets(["FR", "CH", "FR"], "FR")).toEqual(["FR", "CH"]);
    expect(getAllowedCurrencies(["FR", "CH"], "FR")).toEqual(["EUR", "CHF"]);
  });
});
