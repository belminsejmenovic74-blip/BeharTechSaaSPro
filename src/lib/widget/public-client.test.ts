import { afterEach, describe, expect, it, vi } from "vitest";

import { WidgetApiError, WidgetPublicClient, detectHostOrigin } from "@/lib/widget/public-client";

type Captured = { url: string; init: RequestInit };

function mockFetch(response: { status?: number; body: unknown }) {
  const calls: Captured[] = [];
  const fn = vi.fn(async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(response.body), {
      status: response.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fn);
  return calls;
}

function headersOf(init: RequestInit): Record<string, string> {
  return (init.headers ?? {}) as Record<string, string>;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("WidgetPublicClient", () => {
  const client = new WidgetPublicClient("wdg_testwidget00000001", "https://repair.example.com");

  it("déclare l'origine hôte et ne joint pas de jeton sur /config", async () => {
    const calls = mockFetch({ body: { data: { id: "wdg_testwidget00000001", sessionToken: "tok" } } });
    const config = await client.getConfig();
    expect(config).toMatchObject({ sessionToken: "tok" });
    expect(calls[0].url).toContain("/api/public/widgets/wdg_testwidget00000001/config");
    expect(headersOf(calls[0].init)["x-behar-host-origin"]).toBe("https://repair.example.com");
    expect(headersOf(calls[0].init)["x-widget-token"]).toBeUndefined();
  });

  it("rejoue le jeton et construit la requête catalogue filtrée", async () => {
    const calls = mockFetch({ body: { data: { brands: ["Apple", "Samsung"] } } });
    const brands = await client.getBrands("tok-123", { category: "smartphone" });
    expect(brands).toEqual(["Apple", "Samsung"]);
    expect(calls[0].url).toContain("/brands?category=smartphone");
    expect(headersOf(calls[0].init)["x-widget-token"]).toBe("tok-123");
  });

  it("transmet la clé d'idempotence sur une soumission lead", async () => {
    const calls = mockFetch({ status: 201, body: { data: { accepted: true, duplicate: false, status: "new" } } });
    const result = await client.submitLead(
      "tok",
      // le contenu exact est validé côté serveur ; on vérifie le transport.
      { type: "callback" } as never,
      "idem_key_000001",
    );
    expect(result).toMatchObject({ accepted: true });
    expect(calls[0].init.method).toBe("POST");
    expect(headersOf(calls[0].init)["idempotency-key"]).toBe("idem_key_000001");
    expect(headersOf(calls[0].init)["content-type"]).toBe("application/json");
  });

  it("convertit une enveloppe d'erreur en WidgetApiError typée", async () => {
    mockFetch({ status: 403, body: { error: { code: "domain_forbidden", message: "Domaine refusé." } } });
    await expect(client.getCategories("tok")).rejects.toMatchObject({
      name: "WidgetApiError",
      code: "domain_forbidden",
      status: 403,
    });
    await expect(client.getCategories("tok")).rejects.toBeInstanceOf(WidgetApiError);
  });

  it("ne jette jamais pour l'analytique best-effort", async () => {
    mockFetch({ status: 500, body: { error: { code: "service_unavailable", message: "" } } });
    await expect(client.sendEvent("tok", "widget_loaded", "wses_000000000001")).resolves.toBeUndefined();
  });
});

describe("detectHostOrigin", () => {
  it("retombe sur l'origine courante en accès direct (non embarqué)", () => {
    expect(detectHostOrigin()).toBe(window.location.origin);
  });
});
