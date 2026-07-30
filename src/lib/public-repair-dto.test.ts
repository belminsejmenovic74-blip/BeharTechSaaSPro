import { describe, expect, it } from "vitest";

import type { StoreState } from "@/lib/behar-store";
import { buildPublicRepairDtoFromLocalState } from "@/lib/public-repair-dto";

const TOKEN = "TRK123";

function state(): Parameters<typeof buildPublicRepairDtoFromLocalState>[0] {
  return {
    repairs: [
      {
        id: "rep_1",
        number: "REP-001",
        status: "Prêt",
        total: 149,
        customerId: "cus_1",
        publicAccess: { token: TOKEN, active: true },
      },
    ],
    customers: [{ id: "cus_1", name: "Client Test" }],
    documents: [],
    quotes: [{ id: "q1", repairId: "rep_1", number: "DEV-1", status: "Envoyé", totalTtc: 149, lines: [] }],
    invoices: [{ id: "i1", repairId: "rep_1", number: "FAC-1", status: "Émise", lines: [] }],
    workshopInfo: { name: "Atelier" },
    workshopSettings: { name: "Atelier" },
  } as unknown as StoreState;
}

describe("suivi public — montant du dossier", () => {
  it("expose le montant quand l'atelier n'a pas la facturation", () => {
    const dto = buildPublicRepairDtoFromLocalState(state(), TOKEN, { canInvoice: false });

    expect(dto?.repair.customerPrice).toBe(149);
    // Le montant remplace les documents commerciaux, il ne s'y ajoute pas.
    expect(dto?.quoteLinks).toEqual([]);
    expect(dto?.invoiceLinks).toEqual([]);
  });

  it("laisse le montant vide pour un atelier immatriculé, dont la page ne change pas", () => {
    const dto = buildPublicRepairDtoFromLocalState(state(), TOKEN, { canInvoice: true });

    expect(dto?.repair.customerPrice).toBeUndefined();
    expect(dto?.quoteLinks).toHaveLength(1);
    expect(dto?.invoiceLinks).toHaveLength(1);
  });

  it("n'expose pas de montant nul quand aucun tarif n'est saisi", () => {
    const empty = state();
    empty.repairs[0].total = 0;
    empty.repairs[0].amount = 0;
    const dto = buildPublicRepairDtoFromLocalState(empty, TOKEN, { canInvoice: false });

    expect(dto?.repair.customerPrice).toBeUndefined();
  });
});
