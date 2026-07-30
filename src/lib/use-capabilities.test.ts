// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const STORE_KEY = "behar-tech-local-demo-v3";

async function loadModule() {
  vi.resetModules();
  return import("@/lib/use-capabilities");
}

function seedStore(state: Record<string, unknown>) {
  localStorage.setItem(STORE_KEY, JSON.stringify({ state }));
}

function respondWith(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body })),
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("capacités indisponibles — un atelier établi ne perd pas sa facturation", () => {
  it("conserve la facturation quand le compte a déjà des factures", async () => {
    seedStore({ invoices: [{ id: "i1" }], quotes: [], sales: [] });
    respondWith(401, { error: "Session entreprise requise." });

    const { refreshCapabilities, getCapabilitiesSnapshot } = await loadModule();
    await refreshCapabilities();

    const snapshot = getCapabilitiesSnapshot();
    expect(snapshot.canInvoice).toBe(true);
    // Le bandeau doit rester visible : la vérification n'a pas abouti.
    expect(snapshot.unverified).toBe(true);
  });

  it("reste fermé pour un compte sans aucune activité commerciale", async () => {
    seedStore({ invoices: [], quotes: [], sales: [] });
    respondWith(401, { error: "Session entreprise requise." });

    const { refreshCapabilities, getCapabilitiesSnapshot } = await loadModule();
    await refreshCapabilities();

    expect(getCapabilitiesSnapshot().canInvoice).toBe(false);
    expect(getCapabilitiesSnapshot().unverified).toBe(true);
  });

  it("rejoue la dernière réponse confirmée après un échec ultérieur", async () => {
    respondWith(200, { capabilities: { canInvoice: true, canQuote: true }, registrationNumber: "83014861800017" });
    const first = await loadModule();
    await first.refreshCapabilities();
    expect(first.getCapabilitiesSnapshot().canInvoice).toBe(true);

    // Nouveau chargement de page, serveur muet, aucune donnée commerciale locale.
    respondWith(500, {});
    const second = await loadModule();
    await second.refreshCapabilities();

    const snapshot = second.getCapabilitiesSnapshot();
    expect(snapshot.canInvoice).toBe(true);
    expect(snapshot.registrationNumber).toBe("83014861800017");
    expect(snapshot.unverified).toBe(true);
  });
});
