import { describe, expect, it } from "vitest";

import {
  getWorkshopCapabilityContext,
  redactPublicDocumentAmounts,
  redactPublicRepairPayload,
} from "@/lib/server/capabilities";

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

describe("tolérance au schéma pré-migration", () => {
  const licenseRow = { data: { plan: "Pro" }, error: null };

  function fakeAdmin(workshopResponses: Array<{ data?: unknown; error?: unknown }>) {
    let workshopCall = 0;
    return {
      from(table: string) {
        const chain = {
          select() {
            return chain;
          },
          eq() {
            return chain;
          },
          maybeSingle() {
            if (table === "license_keys") return Promise.resolve(licenseRow);
            const response = workshopResponses[Math.min(workshopCall, workshopResponses.length - 1)];
            workshopCall += 1;
            return Promise.resolve(response);
          },
        };
        return chain;
      },
    } as never;
  }

  it("rejoue le comportement historique quand la colonne has_billing n'existe pas encore", async () => {
    const admin = fakeAdmin([
      { data: null, error: { code: "42703", message: "column workshops.has_billing does not exist" } },
      { data: { siret: "83014861800017" }, error: null },
    ]);

    const context = await getWorkshopCapabilityContext(admin, "ws_1");

    // Avant la migration, tous les ateliers facturaient : on ne leur retire rien.
    expect(context.capabilities.canInvoice).toBe(true);
    expect(context.registrationNumber).toBe("83014861800017");
  });

  it("laisse échouer une erreur qui n'est pas une colonne absente", async () => {
    const admin = fakeAdmin([{ data: null, error: { code: "08006", message: "connection failure" } }]);

    await expect(getWorkshopCapabilityContext(admin, "ws_1")).rejects.toThrow(/indisponible/);
  });

  it("applique la vraie valeur dès que la colonne existe", async () => {
    const admin = fakeAdmin([{ data: { has_billing: false, siret: null }, error: null }]);

    const context = await getWorkshopCapabilityContext(admin, "ws_1");

    expect(context.capabilities.canInvoice).toBe(false);
  });
});
