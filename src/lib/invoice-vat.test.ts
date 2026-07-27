import { describe, expect, it } from "vitest";

import { getVatSummary, workshopInfo } from "./behar-store";

const lines = [{ id: "l1", description: "Réparation", quantity: 1, unitPrice: 120, total: 120 }];

describe("TVA des factures", () => {
  it("décompose correctement un total TTC pour un réparateur assujetti", () => {
    const result = getVatSummary(lines, { ...workshopInfo, country: "FR", vatApplicable: true, vatRate: 20 });
    expect(result).toEqual({ ht: 100, tva: 20, ttc: 120, rate: 0.2 });
  });

  it("ne calcule aucune fausse TVA pour un réparateur non assujetti", () => {
    const result = getVatSummary(lines, {
      ...workshopInfo,
      country: "FR",
      vatApplicable: false,
      vatRate: 0,
      tvaMention: "TVA non applicable, art. 293 B du CGI",
    });
    expect(result).toEqual({ ht: 120, tva: 0, ttc: 120, rate: 0 });
  });
});
