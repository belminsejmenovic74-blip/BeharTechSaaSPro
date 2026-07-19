import { describe, expect, it, vi } from "vitest";

import { ErpNextApiError, ErpNextClient } from "./client";
import { getErpNextSafeStatus, readErpNextConfig, type ErpNextConfig } from "./config";

function config(overrides: Partial<ErpNextConfig> = {}): ErpNextConfig {
  return {
    enabled: true,
    configured: true,
    baseUrl: "https://erp.example.com",
    apiKey: "key-value",
    apiSecret: "secret-value",
    company: "Behar Tech Pro",
    branch: "Boutique principale",
    warehouse: "Entrepôt principal - BTP",
    requestTimeoutMs: 5_000,
    ...overrides,
  };
}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("ERPNext configuration", () => {
  it("reste désactivée et non configurée sans variables serveur", () => {
    const result = readErpNextConfig({});
    expect(result.enabled).toBe(false);
    expect(result.configured).toBe(false);
  });

  it("refuse une URL HTTP distante", () => {
    expect(() => readErpNextConfig({ ERPNEXT_BASE_URL: "http://erp.example.com" })).toThrow(/HTTPS/);
  });

  it("n’expose jamais les identifiants dans le statut", () => {
    const status = getErpNextSafeStatus({
      ERPNEXT_BASE_URL: "https://erp.example.com",
      ERPNEXT_API_KEY: "key-value",
      ERPNEXT_API_SECRET: "secret-value",
    });
    expect(JSON.stringify(status)).not.toContain("key-value");
    expect(JSON.stringify(status)).not.toContain("secret-value");
  });
});

describe("ErpNextClient", () => {
  it("utilise l’authentification token uniquement côté serveur", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response({ message: "api@example.com" }));
    const client = new ErpNextClient(config(), fetchMock);

    await expect(client.ping()).resolves.toBe("api@example.com");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://erp.example.com/api/method/frappe.auth.get_logged_user");
    expect(new Headers(init?.headers).get("authorization")).toBe("token key-value:secret-value");
    expect(init?.cache).toBe("no-store");
  });

  it("crée un document lorsque l’identifiant externe est absent", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ data: [] }))
      .mockResolvedValueOnce(response({ data: { name: "CLI-0001", customer_name: "Client" } }));
    const client = new ErpNextClient(config(), fetchMock);

    const result = await client.upsertByExternalId({
      doctype: "Customer",
      externalIdField: "custom_identifiant_client_behar_tech_pro",
      externalId: "client-1",
      document: { customer_name: "Client" },
    });

    expect(result.action).toBe("created");
    expect(result.document.name).toBe("CLI-0001");
    expect(fetchMock.mock.calls[1][1]?.method).toBe("POST");
  });

  it("met à jour le document déjà lié", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ data: [{ name: "CLI-0001" }] }))
      .mockResolvedValueOnce(response({ data: { name: "CLI-0001", customer_name: "Client modifié" } }));
    const client = new ErpNextClient(config(), fetchMock);

    const result = await client.upsertByExternalId({
      doctype: "Customer",
      externalIdField: "custom_identifiant_client_behar_tech_pro",
      externalId: "client-1",
      document: { customer_name: "Client modifié" },
    });

    expect(result.action).toBe("updated");
    expect(fetchMock.mock.calls[1][1]?.method).toBe("PUT");
    expect(String(fetchMock.mock.calls[1][0])).toContain("/api/resource/Customer/CLI-0001");
  });

  it("retourne une erreur exploitable sans exposer le secret API", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response({ exc_type: "PermissionError", exception: "Accès refusé" }, 403));
    const client = new ErpNextClient(config(), fetchMock);

    const error = await client.ping().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ErpNextApiError);
    expect(String(error)).toContain("PermissionError");
    expect(String(error)).not.toContain("secret-value");
  });
});
