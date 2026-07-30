import { describe, expect, it } from "vitest";

import { redactPublicDocumentAmounts, redactPublicRepairPayload } from "@/lib/server/capabilities";

describe("server capabilities — public payload redaction", () => {
  it("retire récursivement tous les champs monétaires de la réponse brute", () => {
    const result = redactPublicDocumentAmounts({
      kind: "intake",
      document: { number: "REP-42", totalTtc: 149 },
      lines: [{ label: "Écran", unitPriceTtc: 149, totalTtc: 149 }],
      repair: { customerPrice: 149, nested: { amount: 149 } },
    });

    expect(result).toEqual({
      kind: "intake",
      document: { number: "REP-42" },
      lines: [{ label: "Écran" }],
      repair: { nested: {} },
    });
    expect(JSON.stringify(result)).not.toMatch(/amount|customerPrice|totalTtc|unitPriceTtc/);
  });

  it("retire les liens commerciaux du suivi réparation sans supprimer les documents internes", () => {
    const result = redactPublicRepairPayload({
      quoteLinks: [{ number: "DEV-1", totalTtc: 99 }],
      invoiceLinks: [{ number: "FAC-1", totalTtc: 99 }],
      documents: [
        { type: "intake", title: "Bon" },
        { type: "diagnostic_report", title: "Diagnostic" },
        { type: "quote", title: "Devis" },
      ],
    });

    expect(result).toMatchObject({
      quoteLinks: [],
      invoiceLinks: [],
      receiptLinks: [],
      documents: [
        { type: "intake", title: "Bon" },
        { type: "diagnostic_report", title: "Diagnostic" },
      ],
    });
  });
});
