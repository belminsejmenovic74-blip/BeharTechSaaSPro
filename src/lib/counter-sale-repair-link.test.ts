import { beforeEach, describe, expect, it } from "vitest";

import { useBeharStore } from "./behar-store";

beforeEach(() => useBeharStore.getState().resetDemo());

describe("vente comptoir rattachée à un dossier", () => {
  it("conserve le dossier et ajoute une trace dans son historique", () => {
    const store = useBeharStore.getState();
    const customerId = store.addCustomer({ name: "Client rattachement test" });
    const repairId = store.addRepair({
      customerId,
      device: "iPhone 12",
      issue: "Écran",
      status: "En réparation",
      amount: 90,
      notes: "",
      droppedAt: "2026-07-27T10:00:00.000Z",
      technician: "Atelier",
    });
    const saleId = useBeharStore.getState().addSale({
      customerId,
      customerName: "Client rattachement test",
      repairId,
      billingCountry: "FR",
      lines: [{ stockItemId: "article-libre", name: "Coque", quantity: 1, unitPrice: 19.9, total: 19.9 }],
    });

    expect(saleId).toBeTruthy();
    expect(useBeharStore.getState().sales.find((sale) => sale.id === saleId)?.repairId).toBe(repairId);
    expect(
      useBeharStore
        .getState()
        .repairs.find((repair) => repair.id === repairId)
        ?.history.at(-1),
    ).toContain("Vente comptoir");
  });
});
