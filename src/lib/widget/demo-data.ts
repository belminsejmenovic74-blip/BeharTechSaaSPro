// Mode démo public du widget — aucune dépendance backend et aucune donnée client.
//
// Permet d'ouvrir /widget/demo et de voir le parcours réel (mêmes
// composants React) avec des données d'exemple : config Behar Tech, catalogue
// Apple configuré, créneaux générés, offres QualiRépar. Aucune donnée n'est
// créée : les soumissions renvoient une référence factice.

import {
  WidgetPublicClient,
  type CatalogQuery,
  type WidgetEventData,
  type WidgetEventName,
} from "@/lib/widget/public-client";
import type {
  PublicService,
  PublicShop,
  QuoteResult,
  Slot,
  SubmissionResult,
  WidgetConfig,
  WidgetIconChoice,
  WidgetIcons,
  WidgetIconTarget,
} from "@/lib/widget/public-types";
import { fold } from "@/lib/widget/global-catalog";

const DEMO_SHOPS: PublicShop[] = [
  {
    id: "shop-demo",
    name: "Atelier de démonstration",
    address: { address: "", postalCode: "", city: "", country: "FR" },
    timezone: "Europe/Paris",
  },
];

const NONE_ICON: WidgetIconChoice = { mode: "none", size: 20 };
const DEMO_ICONS: WidgetIcons = (() => {
  const targets: WidgetIconTarget[] = [
    "phone",
    "tablet",
    "computer",
    "console",
    "battery",
    "screen",
    "charging",
    "appointment",
    "confirmation",
  ];
  const record = {} as WidgetIcons;
  for (const target of targets) record[target] = NONE_ICON;
  record.poweredBy = true;
  return record;
})();

export const DEMO_CONFIG: WidgetConfig = {
  id: "demo",
  active: true,
  displayMode: "modal",
  general: {
    commercialName: "Atelier de démonstration",
    locale: "fr-FR",
    currency: "EUR",
  },
  visual: {
    primaryColor: "#2A9D8F",
    radius: 14,
    logoUrl: "",
    backgroundStyle: "plain",
    buttonStyle: "solid",
    headingSize: "medium",
    textSize: "medium",
    contentWidth: "wide",
  },
  texts: {},
  features: { multiIssue: true, photos: true },
  catalogPolicy: {
    allowOutOfCatalog: true,
    allowUnconfiguredModels: true,
    allowUnconfiguredIssues: true,
    allowOutOfCatalogAppointments: true,
    fallbackMode: "quote",
  },
  layout: {},
  icons: DEMO_ICONS,
  booking: { durationMinutes: 45, intervalMinutes: 30, capacity: 1, days: [1, 2, 3, 4, 5, 6] },
  offers: {
    enabled: true,
    title: "Ajoutez des options ou profitez de nos offres",
    layout: "list",
    columns: 1,
    offers: [
      {
        id: "qualirepar",
        title: "Bonus QualiRépar",
        description: "Jusqu’à −25 € sur votre réparation éligible.",
        conditionText: "Éligibilité à confirmer en boutique",
        displayMode: "icon",
        behavior: "selectable",
        fixedDiscount: 25,
        isPublished: true,
        displayOrder: 0,
      },
      {
        id: "verre-trempe",
        title: "Verre trempé premium",
        description: "Posé en boutique · Garantie 3 mois",
        displayMode: "icon",
        behavior: "selectable",
        originalPrice: 20,
        promotionalPrice: 10,
        isPublished: true,
        displayOrder: 1,
      },
      {
        id: "chargeur",
        title: "Chargeur rapide",
        description: "Chargeur compatible haute qualité",
        displayMode: "icon",
        behavior: "selectable",
        originalPrice: 12,
        promotionalPrice: 5,
        isPublished: true,
        displayOrder: 2,
      },
      {
        id: "moins-25",
        title: "Offre moins de 25 ans",
        description: "−25 % sur présentation d’un justificatif",
        conditionText: "Sur présentation d’un justificatif",
        displayMode: "text",
        behavior: "validation",
        percentageDiscount: 25,
        isPublished: true,
        displayOrder: 3,
      },
    ],
  },
  publishedAt: new Date().toISOString(),
  shops: DEMO_SHOPS,
  sessionToken: "demo-session-token",
};

// Prestations configurées pour les iPhone (démontre l'état « configuré »).
const IPHONE_SERVICES: Array<[string, string, number, number, string]> = [
  ["Écran cassé", "Écran (OLED premium)", 129, 45, "12 mois"],
  ["Batterie", "Batterie", 69, 30, "12 mois"],
  ["Connecteur de charge", "Connecteur de charge", 69, 45, "12 mois"],
  ["Vitre arrière", "Vitre arrière", 89, 45, "6 mois"],
  ["Caméra arrière", "Caméra arrière", 69, 45, "6 mois"],
  ["Caméra avant", "Caméra avant", 59, 30, "6 mois"],
  ["Haut-parleur", "Haut-parleur", 49, 30, "6 mois"],
  ["Micro", "Micro", 49, 30, "6 mois"],
];

function demoServices(query: CatalogQuery): PublicService[] {
  const brand = fold(query.brand ?? "");
  const model = fold(query.model ?? "");
  if (brand !== "apple" || !model.includes("iphone")) return [];
  return IPHONE_SERVICES.map(([issue, service, amount, durationMinutes, warranty], index) => ({
    publicId: `demo-svc-${index}`,
    category: query.category ?? "Smartphone",
    brand: query.brand ?? "Apple",
    model: query.model ?? "",
    issue,
    service,
    price: { mode: "from", amount, currency: "EUR" },
    stock: { mode: "simple", status: "available" },
    durationMinutes,
    warranty,
  }));
}

function demoSlots(): Slot[] {
  const slots: Slot[] = [];
  const times = ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];
  const now = new Date();
  for (let offset = 1; offset <= 21; offset += 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    if (day.getDay() === 0) continue; // fermé le dimanche
    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    for (const time of times) slots.push({ date: iso, time, durationMinutes: 45 });
  }
  return slots;
}

function demoReference(): string {
  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `BT-${stamp}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

// Client factice type-compatible : renvoie des données d'exemple, ne crée rien.
export class DemoWidgetClient extends WidgetPublicClient {
  constructor() {
    super("demo", "");
  }

  override getConfig(): Promise<WidgetConfig> {
    return Promise.resolve(DEMO_CONFIG);
  }

  override getCategories(): Promise<string[]> {
    return Promise.resolve([]);
  }

  override getBrands(): Promise<string[]> {
    return Promise.resolve([]); // le catalogue global fournit déjà toutes les marques
  }

  override getModels(): Promise<string[]> {
    return Promise.resolve([]);
  }

  override getIssues(): Promise<string[]> {
    return Promise.resolve([]);
  }

  override getServices(_token: string, query: CatalogQuery): Promise<PublicService[]> {
    return Promise.resolve(demoServices(query));
  }

  override quote(): Promise<QuoteResult> {
    return Promise.resolve({
      service: { publicId: "demo-svc-0", label: "Écran (OLED premium)" },
      price: { mode: "from", amount: 129, currency: "EUR" },
      durationMinutes: 45,
      warranty: "12 mois",
      shop: DEMO_SHOPS[0],
    });
  }

  override getSlots(): Promise<{ shop: PublicShop; slots: Slot[] }> {
    return Promise.resolve({ shop: DEMO_SHOPS[0], slots: demoSlots() });
  }

  override submitLead(): Promise<SubmissionResult> {
    return Promise.resolve({ accepted: true, duplicate: false, status: "received", reference: demoReference() });
  }

  override submitAppointment(_token: string, body: { date: string; time: string }): Promise<SubmissionResult> {
    return Promise.resolve({
      accepted: true,
      duplicate: false,
      status: "confirmed",
      reference: demoReference(),
      date: body.date,
      time: body.time,
      durationMinutes: 45,
    });
  }

  override signUpload(): Promise<{ path: string; token: string; signedUrl: string }> {
    return Promise.reject(new Error("Upload désactivé en mode démo."));
  }

  override async sendEvent(_token: string, _name: WidgetEventName, _sessionId: string, _data: WidgetEventData = {}) {
    // no-op en démo
  }
}
