import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: vi.fn() }));

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { leadInputSchema } from "@/lib/widget/public-contracts";
import { handleLead } from "@/lib/server/widget-public-handlers";
import {
  createWidgetToken,
  displayedSnapshot,
  displayedStockSnapshot,
  isDomainAllowed,
  publicServices,
  resolveLivePublicStock,
  resolvePublicWidget,
  sanitizePublicConfig,
  serviceAvailableInShop,
  verifyWidgetToken,
  type PublicService,
  type WidgetRow,
} from "@/lib/server/widget-public-api";

const widget: WidgetRow = {
  id: "70000000-0000-4000-8000-000000000001",
  tenant_id: "10000000-0000-4000-8000-000000000001",
  shop_id: "60000000-0000-4000-8000-000000000001",
  public_widget_id: "wdg_testwidget00000001",
  internal_name: "Widget test",
  active: true,
  display_mode: "inline",
  published_version: 3,
  published_at: "2026-07-10T12:00:00.000Z",
  allowed_domains: ["repair.example.com", "*.partner.example.com"],
  published_config: {
    general: {
      commercialName: "Atelier",
      phone: "+33123456789",
      address: { supplier: "Secret imbriqué" },
      purchasePrice: 12,
    },
    visual: { primaryColor: "#2A9D8F", internalNote: "secret" },
    offers: {
      enabled: true,
      title: "Avantages",
      layout: "list",
      columns: 1,
      offers: [
        {
          id: "offer_1",
          title: "Verre trempé",
          description: "Posé en boutique",
          displayMode: "text",
          behavior: "selectable",
          promotionalPrice: 10,
          supplierCost: 2,
          isPublished: true,
          displayOrder: 0,
        },
        { id: "offer_hidden", title: "Secret", displayMode: "text", behavior: "hidden", isPublished: true },
      ],
    },
    catalog: [
      {
        publicId: "svc_screen_iphone13",
        category: "smartphone",
        brand: "Apple",
        model: "iPhone 13",
        issue: "Écran cassé",
        service: "Remplacement écran",
        quality: "OLED",
        price: { mode: "exact", amount: 129, currency: "EUR", purchasePrice: 38, margin: 91 },
        stock: { mode: "simple", status: "available", label: "Disponible", quantity: 7, lotNumber: "LOT-1" },
        durationMinutes: 45,
        warranty: "12 mois",
        supplier: "Fournisseur privé",
        internalNotes: "Ne jamais afficher",
      },
    ],
  },
};

function queryChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const name of ["select", "eq", "order", "limit", "insert", "update", "gte", "lte", "not"]) {
    chain[name] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(async () => result);
  chain.single = vi.fn(async () => result);
  return chain;
}

function fakeAdmin(options: { widget?: WidgetRow | null; priorLead?: Record<string, unknown> | null } = {}) {
  let insertCalls = 0;
  const resolvedWidget = Object.hasOwn(options, "widget") ? options.widget : widget;
  const admin = {
    from: vi.fn((table: string) => {
      if (table === "widget_settings") return queryChain({ data: resolvedWidget, error: null });
      if (table === "widget_leads") {
        const chain = queryChain({ data: options.priorLead ?? null, error: null });
        chain.insert = vi.fn(() => {
          insertCalls += 1;
          return chain;
        });
        return chain;
      }
      return queryChain({ data: [], error: null });
    }),
    rpc: vi.fn(async () => ({ data: true, error: null })),
    storage: { from: vi.fn() },
  };
  return {
    admin,
    get insertCalls() {
      return insertCalls;
    },
  };
}

function request(origin = "https://repair.example.com", token?: string, body?: unknown) {
  const headers = new Headers({
    "x-behar-host-origin": origin,
    "user-agent": "vitest",
    "x-forwarded-for": "127.0.0.1",
  });
  if (token) headers.set("x-widget-token", token);
  if (body) headers.set("content-type", "application/json");
  return new Request("https://widget.behartechpro.fr/api/public/widgets/wdg_testwidget00000001/leads", {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WIDGET_TOKEN_SECRET = "test-widget-token-secret-with-enough-entropy";
});

describe("widget public API security", () => {
  it("accepts exact and explicit wildcard domains only", () => {
    expect(isDomainAllowed("https://repair.example.com/page", widget.allowed_domains)).toBe(true);
    expect(isDomainAllowed("https://shop.partner.example.com", widget.allowed_domains)).toBe(true);
    expect(isDomainAllowed("https://partner.example.com", widget.allowed_domains)).toBe(false);
    expect(isDomainAllowed("https://repair.example.com.attacker.test", widget.allowed_domains)).toBe(false);
  });

  it("resolves an active widget for an allowed domain and ignores a manipulated tenant header", async () => {
    const fake = fakeAdmin();
    vi.mocked(getSupabaseAdmin).mockReturnValue(fake.admin as never);
    const req = request();
    req.headers.set("x-tenant-id", "10000000-0000-4000-8000-000000000099");
    const result = await resolvePublicWidget(req, widget.public_widget_id);
    expect(result).not.toBeInstanceOf(Response);
    if (!(result instanceof Response)) expect(result.widget.tenant_id).toBe(widget.tenant_id);
  });

  it("rejects a disabled widget", async () => {
    const fake = fakeAdmin({ widget: { ...widget, active: false } });
    vi.mocked(getSupabaseAdmin).mockReturnValue(fake.admin as never);
    const result = await resolvePublicWidget(request(), widget.public_widget_id);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(404);
  });

  it("rejects a forbidden domain and a manipulated public identifier", async () => {
    const fake = fakeAdmin();
    vi.mocked(getSupabaseAdmin).mockReturnValue(fake.admin as never);
    const forbidden = await resolvePublicWidget(request("https://attacker.test"), widget.public_widget_id);
    expect((forbidden as Response).status).toBe(403);
    const manipulated = await resolvePublicWidget(request(), "wdg_' OR 1=1--");
    expect((manipulated as Response).status).toBe(404);
  });

  it("binds session tokens to widget, domain and publication", () => {
    const token = createWidgetToken(widget, "https://repair.example.com");
    expect(verifyWidgetToken(token, widget)?.host).toBe("repair.example.com");
    expect(verifyWidgetToken(`${token}x`, widget)).toBeNull();
    expect(verifyWidgetToken(token, { ...widget, published_version: 4 })).toBeNull();
  });

  it("removes all internal commercial fields from public config and services", () => {
    const config = sanitizePublicConfig(widget);
    const services = publicServices(widget.published_config);
    const serialized = JSON.stringify({ config, services });
    expect(serialized).not.toContain("purchasePrice");
    expect(serialized).not.toContain("supplier");
    expect(serialized).not.toContain("margin");
    expect(serialized).not.toContain("internalNote");
    expect(serialized).not.toContain("lotNumber");
    expect(serialized).not.toContain("supplierCost");
    expect(serialized).not.toContain("offer_hidden");
    expect(serialized).toContain("Verre trempé");
    expect(services[0].stock?.quantity).toBeUndefined();
    expect(services[0].price?.amount).toBe(129);
  });

  it("exposes a permissive out-of-catalog policy by default", () => {
    const config = sanitizePublicConfig(widget) as { catalogPolicy: Record<string, unknown> };
    expect(config.catalogPolicy).toMatchObject({
      allowOutOfCatalog: true,
      allowUnconfiguredModels: true,
      allowUnconfiguredIssues: true,
      allowOutOfCatalogAppointments: true,
      fallbackMode: "quote",
    });
  });

  it("parses per-shop scoping and filters catalog by requested shop", () => {
    const config = {
      catalog: [
        { publicId: "svc_all", category: "smartphone", model: "iPhone 13", issue: "Écran", service: "Écran" },
        {
          publicId: "svc_b",
          category: "smartphone",
          model: "Galaxy A52",
          issue: "Écran",
          service: "Écran",
          shops: ["shop_b", "shop_b"],
        },
      ],
    };
    const services = publicServices(config);
    const everywhere = services.find((service) => service.publicId === "svc_all");
    const restricted = services.find((service) => service.publicId === "svc_b");
    expect(everywhere?.shops).toBeUndefined();
    expect(restricted?.shops).toEqual(["shop_b"]); // dédoublonné
    // Sans restriction : disponible partout.
    expect(serviceAvailableInShop(everywhere!, "shop_a")).toBe(true);
    // Restreint : uniquement dans sa boutique.
    expect(serviceAvailableInShop(restricted!, "shop_a")).toBe(false);
    expect(serviceAvailableInShop(restricted!, "shop_b")).toBe(true);
  });

  it("captures a complete, immutable displayed-price snapshot on the request", () => {
    const service: PublicService = {
      publicId: "svc_screen",
      category: "smartphone",
      brand: "Apple",
      model: "iPhone 13",
      issue: "Écran",
      service: "Écran",
      quality: "OLED",
      price: { mode: "from", amount: 129, currency: "EUR" },
      stock: { mode: "simple", status: "available" },
      durationMinutes: 45,
      warranty: "12 mois",
    };
    const snapshot = displayedSnapshot(service, widget, "2026-07-10T12:00:00.000Z");
    expect(snapshot).toEqual({
      amount: 129,
      type: "from",
      currency: "EUR",
      min: null,
      max: null,
      quality: "OLED",
      durationMinutes: 45,
      warranty: "12 mois",
      stock: { mode: "simple", status: "available" },
      capturedAt: "2026-07-10T12:00:00.000Z",
      widgetVersion: widget.published_version,
    });
    expect(displayedSnapshot(undefined, widget)).toBeNull();

    // Le prix consulté reste attaché même si le catalogue change ensuite.
    service.price = { mode: "exact", amount: 199, currency: "EUR" };
    expect(snapshot?.amount).toBe(129);
    expect(snapshot?.type).toBe("from");
  });

  it("returns only live public availability fields and snapshots what the customer saw", async () => {
    const rpc = vi.fn(async () => ({
      data: {
        mode: "quantity",
        status: "available",
        quantity: 5,
        supplier: "Secret",
        invoice: "INV-42",
        lotNumber: "LOT-7",
        purchasePrice: 12,
        internalLocation: "Tiroir A",
      },
      error: null,
    }));
    const context = {
      admin: { rpc } as never,
      widget,
      requestId: "request-stock-test",
      hostOrigin: "https://repair.example.com",
    };
    const stock = await resolveLivePublicStock(context, "svc_screen", "60000000-0000-4000-8000-000000000001");
    expect(stock).toEqual({ mode: "quantity", status: "available", label: undefined, quantity: 5 });
    expect(JSON.stringify(stock)).not.toMatch(/supplier|invoice|lot|purchase|location/i);

    const snapshot = displayedStockSnapshot(
      {
        publicId: "svc_screen",
        category: "smartphone",
        brand: "Apple",
        model: "iPhone 13",
        issue: "Écran",
        service: "Écran",
        stock,
      },
      widget,
      "2026-07-11T00:00:00.000Z",
    );
    expect(snapshot).toEqual({
      mode: "quantity",
      status: "available",
      label: undefined,
      quantity: 5,
      capturedAt: "2026-07-11T00:00:00.000Z",
      widgetVersion: 3,
    });
  });

  it("snapshots a « sur demande » price with a null amount", () => {
    const snapshot = displayedSnapshot(
      {
        publicId: "svc_diag",
        category: "smartphone",
        brand: "Apple",
        model: "iPhone 13",
        issue: "Diagnostic",
        service: "Diagnostic",
        price: { mode: "request", currency: "EUR" },
      },
      widget,
    );
    expect(snapshot).toMatchObject({ amount: null, type: "request", widgetVersion: widget.published_version });
  });

  it("rejects malicious and automated lead payloads", () => {
    const validBase = {
      type: "callback",
      firstName: "Sarah",
      lastName: "Martin",
      phone: "+33612345678",
      email: "",
      deviceCategory: "smartphone",
      brand: "Apple",
      model: "iPhone 13",
      issue: "Écran cassé",
      startedAt: new Date(Date.now() - 5_000).toISOString(),
      consent: {
        service: true,
        marketing: false,
        text: "J’accepte le traitement de ma demande.",
        privacyVersion: "v1",
        acceptedAt: new Date().toISOString(),
      },
    };
    expect(leadInputSchema.safeParse({ ...validBase, comment: '<script>alert("x")</script>' }).success).toBe(false);
    expect(leadInputSchema.safeParse({ ...validBase, website: "spam.example" }).success).toBe(false);
    expect(leadInputSchema.safeParse({ ...validBase, startedAt: new Date().toISOString() }).success).toBe(false);
  });

  it("returns the original outcome for a double submission without inserting again", async () => {
    const fake = fakeAdmin({ widget, priorLead: { status: "new", appointment_id: null } });
    vi.mocked(getSupabaseAdmin).mockReturnValue(fake.admin as never);
    const token = createWidgetToken(widget, "https://repair.example.com");
    const req = request("https://repair.example.com", token, { malicious: "ignored because duplicate" });
    req.headers.set("idempotency-key", "idem_duplicate_000001");
    const response = await handleLead(req, { params: Promise.resolve({ publicId: widget.public_widget_id }) });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.duplicate).toBe(true);
    expect(fake.insertCalls).toBe(0);
  });
});
