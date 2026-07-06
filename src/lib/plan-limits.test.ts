import { beforeEach, describe, expect, it } from "vitest";

import { useBeharStore } from "@/lib/behar-store";
import {
  checkDeviceQuota,
  checkRepairQuota,
  checkSmsQuota,
  countThisMonth,
  getPlanLimits,
  normalizePlanKey,
} from "@/lib/plan-limits";

describe("plan-limits — normalisation et quotas", () => {
  it("normalise les noms d'offres, plans inconnus = illimité", () => {
    expect(normalizePlanKey("Gratuit")).toBe("gratuit");
    expect(normalizePlanKey("STARTER")).toBe("starter");
    expect(normalizePlanKey("Offre Pro")).toBe("pro");
    expect(normalizePlanKey("Business")).toBe("business");
    expect(normalizePlanKey("Pilote")).toBe("unlimited");
    expect(normalizePlanKey(undefined)).toBe("unlimited");
  });

  it("applique les bons plafonds par offre", () => {
    expect(getPlanLimits("Gratuit")).toEqual({ devices: 1, repairsPerMonth: 10, smsPerMonth: 10 });
    expect(getPlanLimits("Starter")).toEqual({ devices: 2, repairsPerMonth: null, smsPerMonth: 30 });
    expect(getPlanLimits("Pro")).toEqual({ devices: 4, repairsPerMonth: null, smsPerMonth: 150 });
    expect(getPlanLimits("Business")).toEqual({ devices: null, repairsPerMonth: null, smsPerMonth: 250 });
  });

  it("bloque la 11e réparation en Gratuit, jamais en Starter ni Pilote", () => {
    expect(checkRepairQuota("Gratuit", 9).allowed).toBe(true);
    expect(checkRepairQuota("Gratuit", 10).allowed).toBe(false);
    expect(checkRepairQuota("Starter", 999).allowed).toBe(true);
    expect(checkRepairQuota("Pilote", 999).allowed).toBe(true);
  });

  it("bloque le SMS au-delà du quota mensuel", () => {
    expect(checkSmsQuota("Starter", 29).allowed).toBe(true);
    expect(checkSmsQuota("Starter", 30).allowed).toBe(false);
    expect(checkSmsQuota("Business", 250).allowed).toBe(false);
  });

  it("autorise un appareil déjà enregistré, bloque un nouvel appareil hors quota", () => {
    expect(checkDeviceQuota("Gratuit", ["dev-a"], "dev-a").allowed).toBe(true);
    expect(checkDeviceQuota("Gratuit", ["dev-a"], "dev-b").allowed).toBe(false);
    expect(checkDeviceQuota("Pro", ["a", "b", "c"], "d").allowed).toBe(true);
    expect(checkDeviceQuota("Business", ["a", "b", "c", "d", "e"], "f").allowed).toBe(true);
  });

  it("countThisMonth ne compte que le mois courant", () => {
    const now = new Date().toISOString();
    expect(countThisMonth([{ createdAt: now }, { createdAt: "2020-01-15T10:00:00Z" }, {}])).toBe(1);
  });
});

describe("plan-limits — application dans le store", () => {
  beforeEach(() => {
    useBeharStore.getState().resetDemo();
  });

  it("addRepair refuse au-delà du quota mensuel du plan Gratuit", () => {
    useBeharStore.setState({ licensePlan: "Gratuit" });
    const store = useBeharStore.getState();
    const customerId = store.addCustomer({ name: "Client quota" });
    const nowIso = new Date().toISOString();
    // Sature le quota : 10 réparations « créées ce mois-ci ».
    useBeharStore.setState((state) => ({
      repairs: [
        ...Array.from({ length: 10 }, (_, i) => ({
          ...state.repairs[0],
          id: `quota_${i}`,
          createdAt: nowIso,
          droppedAt: nowIso,
        })),
      ],
    }));
    const repairInput = {
      customerId,
      device: "iPhone 12",
      issue: "Écran",
      technician: "Tech",
      status: "Reçu" as const,
      amount: 0,
      notes: "",
      droppedAt: nowIso,
    };
    const blocked = useBeharStore.getState().addRepair(repairInput);
    expect(blocked).toBe("");

    useBeharStore.setState({ licensePlan: "Business" });
    const allowed = useBeharStore.getState().addRepair(repairInput);
    expect(allowed).not.toBe("");
  });

  it("sendMessage refuse le SMS au-delà du quota, l'email passe toujours", () => {
    useBeharStore.setState({ licensePlan: "Gratuit" });
    const nowIso = new Date().toISOString();
    useBeharStore.setState({
      messageLogs: Array.from({ length: 10 }, (_, i) => ({
        id: `sms_${i}`,
        shopId: "shop",
        customerId: "cust_1",
        channel: "SMS" as const,
        subject: "",
        body: "test",
        createdAt: nowIso,
      })),
    });
    const before = useBeharStore.getState().messageLogs.length;
    useBeharStore.getState().sendMessage({ customerId: "cust_1", channel: "SMS", subject: "", body: "bloqué ?" });
    expect(useBeharStore.getState().messageLogs.length).toBe(before);
    useBeharStore.getState().sendMessage({ customerId: "cust_1", channel: "Email", subject: "", body: "ok" });
    expect(useBeharStore.getState().messageLogs.length).toBe(before + 1);
  });
});
