import { beforeEach, describe, expect, it } from "vitest";

import { useBeharStore } from "./behar-store";
import { buildPublicRepairDtoFromLocalState } from "./public-repair-dto";

beforeEach(() => useBeharStore.getState().resetDemo());

describe("conversation du lien public de suivi", () => {
  it("rend le message client puis la réponse atelier dans l'ordre chronologique", () => {
    const store = useBeharStore.getState();
    const customerId = store.addCustomer({ name: "Client messagerie test" });
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
    const access = useBeharStore.getState().ensureRepairPublicAccess(repairId);
    expect(access?.token).toBeTruthy();

    useBeharStore.getState().addRepairMessage(repairId, {
      body: "Bonjour, quand mon téléphone sera-t-il prêt ?",
      visibility: "client",
      authorType: "client",
      authorName: "Client",
    });
    useBeharStore.getState().addRepairMessage(repairId, {
      body: "Bonjour, il sera prêt cet après-midi.",
      visibility: "client",
      authorType: "staff",
      authorName: "Atelier",
    });

    const dto = buildPublicRepairDtoFromLocalState(useBeharStore.getState(), access?.token || "");
    expect(dto?.messages.slice(-2).map((message) => [message.authorType, message.body])).toEqual([
      ["client", "Bonjour, quand mon téléphone sera-t-il prêt ?"],
      ["staff", "Bonjour, il sera prêt cet après-midi."],
    ]);
    expect(dto?.messages.every((message) => !Number.isNaN(new Date(message.createdAt).getTime()))).toBe(true);
  });

  it("expose la facture liée dans le suivi public du client", () => {
    const store = useBeharStore.getState();
    const customerId = store.addCustomer({ name: "Client facture publique" });
    const repairId = store.addRepair({
      customerId,
      device: "Samsung Galaxy S24",
      issue: "Connecteur de charge",
      status: "Prêt",
      amount: 129,
      notes: "",
      droppedAt: "2026-07-28T10:00:00.000Z",
      technician: "Atelier",
    });
    const invoiceId = useBeharStore.getState().createInvoiceFromRepair(repairId);
    const access = useBeharStore.getState().ensureRepairPublicAccess(repairId);
    const invoice = useBeharStore.getState().invoices.find((entry) => entry.id === invoiceId);

    const dto = buildPublicRepairDtoFromLocalState(useBeharStore.getState(), access?.token || "");

    expect(invoice).toBeDefined();
    expect(dto?.invoiceLinks).toContainEqual(
      expect.objectContaining({
        number: invoice?.number,
        totalTtc: 129,
        previewUrl: `/facture/${invoiceId}`,
      }),
    );
    expect(dto?.documents).toContainEqual(
      expect.objectContaining({
        type: "invoice",
        number: invoice?.number,
        previewUrl: `/facture/${invoiceId}`,
      }),
    );
  });
});
