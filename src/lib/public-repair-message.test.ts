import { describe, expect, it } from "vitest";

import { isValidPublicRepairToken, publicRepairMessageSchema } from "./public-repair-message";

describe("public repair messages", () => {
  it("valide et borne un message textuel idempotent", () => {
    expect(
      publicRepairMessageSchema.parse({
        body: " Bonjour, avez-vous une estimation ? ",
        authorName: "Client",
        clientMessageId: "msg_0123456789abcdef",
      }),
    ).toMatchObject({ body: "Bonjour, avez-vous une estimation ?" });
    expect(
      publicRepairMessageSchema.safeParse({
        body: "x".repeat(1001),
        authorName: "Client",
        clientMessageId: "msg_0123456789abcdef",
      }).success,
    ).toBe(false);
  });

  it("rejette le balisage actif et les tokens devinables", () => {
    expect(
      publicRepairMessageSchema.safeParse({
        body: "<script>alert(1)</script>",
        authorName: "Client",
        clientMessageId: "msg_0123456789abcdef",
      }).success,
    ).toBe(false);
    expect(isValidPublicRepairToken("REP-0001")).toBe(false);
    expect(isValidPublicRepairToken("rp_0123456789abcdef0123456789abcdef")).toBe(true);
  });
});
