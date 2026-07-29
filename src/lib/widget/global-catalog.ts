// Catalogue GLOBAL du widget — indépendant de la configuration boutique.
//
// Objectif : capter la demande. Le widget navigue d'abord sur ce catalogue large
// (toutes les grandes marques, tous les modèles connus, toutes les pannes
// courantes) ; la configuration boutique (prix / durée / qualité / dispo) vient
// ENRICHIR ces éléments quand elle existe, mais son absence ne bloque JAMAIS le
// parcours. Données pures, client-safe, extensibles.

export type GlobalDeviceType = { id: string; label: string; hasBrands: boolean };

// 1. Types d'appareil.
export const GLOBAL_DEVICE_TYPES: GlobalDeviceType[] = [
  { id: "smartphone", label: "Smartphone", hasBrands: true },
  { id: "tablet", label: "Tablette", hasBrands: true },
  { id: "laptop", label: "Ordinateur portable", hasBrands: true },
  { id: "desktop", label: "Ordinateur fixe", hasBrands: true },
  { id: "console", label: "Console", hasBrands: true },
  { id: "watch", label: "Montre connectée", hasBrands: true },
  { id: "audio", label: "Écouteurs / audio", hasBrands: true },
  { id: "other", label: "Autre appareil", hasBrands: false },
];

// 2. Marques par type (listes larges, extensibles).
const PHONE_BRANDS = [
  "Apple",
  "Samsung",
  "Xiaomi",
  "Redmi",
  "Poco",
  "Huawei",
  "Honor",
  "Oppo",
  "Realme",
  "OnePlus",
  "Google",
  "Sony",
  "Nokia",
  "Wiko",
  "Asus",
  "Motorola",
  "Nothing",
  "Vivo",
  "TCL",
  "Crosscall",
  "Alcatel",
  "Fairphone",
  "ZTE",
  "Doogee",
];
const COMPUTER_BRANDS = [
  "Apple",
  "Asus",
  "Acer",
  "Dell",
  "HP",
  "Lenovo",
  "MSI",
  "Huawei",
  "Microsoft",
  "Samsung",
  "Razer",
  "Toshiba",
  "LG",
  "Gigabyte",
  "Medion",
];
const TABLET_BRANDS = ["Apple", "Samsung", "Xiaomi", "Huawei", "Lenovo", "Microsoft", "Asus", "Honor", "TCL"];
const CONSOLE_BRANDS = [
  "Sony PlayStation",
  "Microsoft Xbox",
  "Nintendo",
  "Steam Deck",
  "Asus ROG Ally",
  "Lenovo Legion Go",
];
const WATCH_BRANDS = ["Apple", "Samsung", "Garmin", "Huawei", "Honor", "Fitbit", "Xiaomi", "Withings", "Fossil"];
const AUDIO_BRANDS = ["Apple", "Samsung", "Sony", "Bose", "JBL", "Jabra", "Sennheiser", "Beats", "Marshall", "Nothing"];

const BRANDS_BY_TYPE: Record<string, string[]> = {
  smartphone: PHONE_BRANDS,
  tablet: TABLET_BRANDS,
  laptop: COMPUTER_BRANDS,
  desktop: COMPUTER_BRANDS,
  console: CONSOLE_BRANDS,
  watch: WATCH_BRANDS,
  audio: AUDIO_BRANDS,
  other: [],
};

// Marques mises en avant (suggestions populaires) par type.
const POPULAR_BY_TYPE: Record<string, string[]> = {
  smartphone: ["Apple", "Samsung", "Xiaomi", "Google", "Honor"],
  tablet: ["Apple", "Samsung", "Xiaomi", "Lenovo"],
  laptop: ["Apple", "HP", "Lenovo", "Dell", "Asus"],
  desktop: ["Apple", "HP", "Dell", "Lenovo"],
  console: ["Sony PlayStation", "Microsoft Xbox", "Nintendo"],
  watch: ["Apple", "Samsung", "Garmin"],
  audio: ["Apple", "Samsung", "Sony", "Bose"],
  other: [],
};

// 3. Modèles par marque (majeures enrichies ; saisie manuelle pour le reste).
const APPLE_IPHONE = [
  "iPhone SE (2016)",
  "iPhone SE (2020)",
  "iPhone SE (2022)",
  "iPhone 8",
  "iPhone 8 Plus",
  "iPhone X",
  "iPhone XR",
  "iPhone XS",
  "iPhone XS Max",
  "iPhone 11",
  "iPhone 11 Pro",
  "iPhone 11 Pro Max",
  "iPhone 12 mini",
  "iPhone 12",
  "iPhone 12 Pro",
  "iPhone 12 Pro Max",
  "iPhone 13 mini",
  "iPhone 13",
  "iPhone 13 Pro",
  "iPhone 13 Pro Max",
  "iPhone 14",
  "iPhone 14 Plus",
  "iPhone 14 Pro",
  "iPhone 14 Pro Max",
  "iPhone 15",
  "iPhone 15 Plus",
  "iPhone 15 Pro",
  "iPhone 15 Pro Max",
  "iPhone 16",
  "iPhone 16 Plus",
  "iPhone 16 Pro",
  "iPhone 16 Pro Max",
  "iPhone 16e",
  "iPhone 17",
  "iPhone Air",
  "iPhone 17 Pro",
  "iPhone 17 Pro Max",
  "iPhone 17e",
];
const APPLE_IPAD = [
  "iPad (7e génération)",
  "iPad (8e génération)",
  "iPad (9e génération)",
  "iPad (10e génération)",
  "iPad Air (3e)",
  "iPad Air (4e)",
  "iPad Air (5e)",
  "iPad Air 11 (M2)",
  "iPad Air 13 (M2)",
  "iPad mini (5e)",
  "iPad mini (6e)",
  "iPad Pro 11",
  "iPad Pro 12.9",
  "iPad Pro 11 (M4)",
  "iPad Pro 13 (M4)",
];
const APPLE_MAC = [
  "MacBook Air 13 (Intel)",
  "MacBook Air 13 (M1)",
  "MacBook Air 13 (M2)",
  "MacBook Air 15 (M2)",
  "MacBook Air 13 (M3)",
  "MacBook Pro 13",
  "MacBook Pro 14",
  "MacBook Pro 16",
  "iMac 24 (M1)",
  "iMac 24 (M3)",
  "Mac mini",
  "Mac Studio",
];
const SAMSUNG_PHONE = [
  "Galaxy S9",
  "Galaxy S10",
  "Galaxy S10+",
  "Galaxy S20",
  "Galaxy S20 FE",
  "Galaxy S21",
  "Galaxy S21 Ultra",
  "Galaxy S22",
  "Galaxy S22 Ultra",
  "Galaxy S23",
  "Galaxy S23+",
  "Galaxy S23 Ultra",
  "Galaxy S24",
  "Galaxy S24+",
  "Galaxy S24 Ultra",
  "Galaxy S25",
  "Galaxy S25+",
  "Galaxy S25 Edge",
  "Galaxy S25 Ultra",
  "Galaxy S26",
  "Galaxy S26+",
  "Galaxy S26 Ultra",
  "Galaxy A13",
  "Galaxy A14",
  "Galaxy A15",
  "Galaxy A16 5G",
  "Galaxy A26 5G",
  "Galaxy A36 5G",
  "Galaxy A34",
  "Galaxy A54",
  "Galaxy A55",
  "Galaxy A56 5G",
  "Galaxy A57 5G",
  "Galaxy Note 10",
  "Galaxy Note 20",
  "Galaxy Z Flip 4",
  "Galaxy Z Flip 5",
  "Galaxy Z Flip 6",
  "Galaxy Z Flip 7",
  "Galaxy Z Fold 4",
  "Galaxy Z Fold 5",
  "Galaxy Z Fold 6",
  "Galaxy Z Fold 7",
];
const XIAOMI_PHONE = [
  "Xiaomi 12",
  "Xiaomi 13",
  "Xiaomi 13 Pro",
  "Xiaomi 14",
  "Xiaomi 14 Pro",
  "Redmi Note 11",
  "Redmi Note 12",
  "Redmi Note 13",
  "Redmi Note 13 Pro",
  "Redmi 12",
  "Redmi 13C",
  "Poco X5",
  "Poco X6",
  "Poco F5",
  "Poco F6",
];
const GOOGLE_PHONE = [
  "Pixel 6",
  "Pixel 6a",
  "Pixel 7",
  "Pixel 7a",
  "Pixel 8",
  "Pixel 8a",
  "Pixel 8 Pro",
  "Pixel 9",
  "Pixel 9 Pro",
];
const PS_MODELS = [
  "PlayStation 5",
  "PlayStation 5 Slim",
  "PlayStation 5 Pro",
  "PlayStation 4",
  "PlayStation 4 Pro",
  "PlayStation 4 Slim",
];
const XBOX_MODELS = ["Xbox Series X", "Xbox Series S", "Xbox One", "Xbox One X", "Xbox One S"];
const NINTENDO_MODELS = ["Nintendo Switch", "Nintendo Switch OLED", "Nintendo Switch Lite"];
const APPLE_WATCH = [
  "Apple Watch SE",
  "Apple Watch Series 6",
  "Apple Watch Series 7",
  "Apple Watch Series 8",
  "Apple Watch Series 9",
  "Apple Watch Series 10",
  "Apple Watch Ultra",
  "Apple Watch Ultra 2",
];
const APPLE_AUDIO = ["AirPods (2e)", "AirPods (3e)", "AirPods Pro", "AirPods Pro 2", "AirPods Max"];

// Modèles indexés par « type|marque » (repliés).
const MODELS: Record<string, string[]> = {
  "smartphone|apple": APPLE_IPHONE,
  "tablet|apple": APPLE_IPAD,
  "laptop|apple": APPLE_MAC,
  "desktop|apple": ["iMac 24 (M1)", "iMac 24 (M3)", "Mac mini", "Mac Studio", "Mac Pro"],
  "smartphone|samsung": SAMSUNG_PHONE,
  "smartphone|xiaomi": XIAOMI_PHONE,
  "smartphone|redmi": XIAOMI_PHONE.filter((model) => model.startsWith("Redmi")),
  "smartphone|poco": XIAOMI_PHONE.filter((model) => model.startsWith("Poco")),
  "smartphone|google": GOOGLE_PHONE,
  "console|sony playstation": PS_MODELS,
  "console|microsoft xbox": XBOX_MODELS,
  "console|nintendo": NINTENDO_MODELS,
  "watch|apple": APPLE_WATCH,
  "audio|apple": APPLE_AUDIO,
};

export function fold(value: string): string {
  let out = "";
  for (const character of value.trim().toLowerCase().normalize("NFD")) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x0300 || code > 0x036f) out += character;
  }
  return out;
}

/**
 * Clé de rapprochement entre les libellés génériques proposés au client et
 * ceux du catalogue atelier. Le catalogue peut publier « Écran » tandis que le
 * parcours grand public emploie « Écran cassé » : il s'agit de la même panne,
 * pas d'une demande « sur devis ».
 */
export function issueMatchKey(value: string): string {
  const normalized = fold(value)
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(remplacement|changer|changement|reparation)\s+(de\s+|du\s+|d\s+)?/, "");

  if (["ecran", "ecran casse", "ecran brise", "afficheur"].includes(normalized)) return "ecran";
  return normalized;
}

export function sameIssueLabel(a: string, b: string): boolean {
  const first = issueMatchKey(a);
  return first.length > 0 && first === issueMatchKey(b);
}

// 4. Pannes / prestations.
const COMMON_ISSUES = [
  "Écran cassé",
  "Batterie",
  "Connecteur de charge",
  "Caméra arrière",
  "Caméra avant",
  "Haut-parleur",
  "Micro",
  "Boutons volume",
  "Bouton power",
  "Désoxydation",
  "Dégât liquide",
  "Diagnostic",
  "Logiciel",
  "Surchauffe",
  "Ne s'allume plus",
  "Autre panne",
];
const ISSUES_BY_TYPE: Record<string, string[]> = {
  smartphone: [
    "Écran cassé",
    "Vitre arrière",
    "Batterie",
    "Connecteur de charge",
    "Caméra arrière",
    "Caméra avant",
    "Lentille caméra",
    "Écouteur interne",
    "Haut-parleur",
    "Micro",
    "Boutons volume",
    "Bouton power",
    "Face ID",
    "Touch ID",
    "Châssis",
    "Désoxydation",
    "Dégât liquide",
    "Logiciel",
    "Mise à jour",
    "Déblocage",
    "Diagnostic",
    "Surchauffe",
    "Ne s'allume plus",
    "Problème réseau",
    "Wi-Fi",
    "Bluetooth",
    "Données / récupération",
    "Autre panne",
  ],
  tablet: [
    "Écran cassé",
    "Vitre tactile",
    "Batterie",
    "Connecteur de charge",
    "Caméra",
    "Haut-parleur",
    "Micro",
    "Bouton power",
    "Châssis",
    "Désoxydation",
    "Dégât liquide",
    "Logiciel",
    "Diagnostic",
    "Ne s'allume plus",
    "Wi-Fi",
    "Données / récupération",
    "Autre panne",
  ],
  laptop: [
    "Écran",
    "Clavier",
    "Batterie",
    "Connecteur de charge",
    "Ventilateur / surchauffe",
    "Disque / SSD",
    "Mémoire RAM",
    "Carte mère",
    "Désoxydation",
    "Dégât liquide",
    "Logiciel",
    "Système lent",
    "Ne s'allume plus",
    "Wi-Fi",
    "Données / récupération",
    "Diagnostic",
    "Autre panne",
  ],
  desktop: [
    "Ne s'allume plus",
    "Alimentation",
    "Disque / SSD",
    "Mémoire RAM",
    "Carte graphique",
    "Ventilation / surchauffe",
    "Carte mère",
    "Logiciel",
    "Système lent",
    "Réseau",
    "Données / récupération",
    "Diagnostic",
    "Autre panne",
  ],
  console: [
    "Port HDMI",
    "Ne s'allume plus",
    "Lecteur / disque",
    "Surchauffe",
    "Ventilateur",
    "Manette",
    "Connecteur de charge",
    "Alimentation",
    "Nettoyage complet",
    "Logiciel",
    "Réseau",
    "Diagnostic",
    "Autre panne",
  ],
  watch: [
    "Écran cassé",
    "Vitre",
    "Batterie",
    "Bouton",
    "Étanchéité",
    "Bracelet",
    "Désoxydation",
    "Logiciel",
    "Diagnostic",
    "Autre panne",
  ],
  audio: [
    "Ne charge plus",
    "Son défectueux",
    "Batterie",
    "Connecteur de charge",
    "Micro",
    "Boîtier de charge",
    "Désoxydation",
    "Diagnostic",
    "Autre panne",
  ],
  other: COMMON_ISSUES,
};

// ---------------------------------------------------------------------------
// Accès et recherche.
// ---------------------------------------------------------------------------

export function deviceTypeLabels(): string[] {
  return GLOBAL_DEVICE_TYPES.map((type) => type.label);
}

function typeId(typeLabel: string): string {
  const match = GLOBAL_DEVICE_TYPES.find((type) => fold(type.label) === fold(typeLabel));
  return match?.id ?? "other";
}

export function brandsForType(typeLabel: string): string[] {
  return BRANDS_BY_TYPE[typeId(typeLabel)] ?? [];
}

export function popularBrandsForType(typeLabel: string): string[] {
  return POPULAR_BY_TYPE[typeId(typeLabel)] ?? [];
}

export function modelsForBrand(typeLabel: string, brand: string): string[] {
  if (!brand) return [];
  return MODELS[`${typeId(typeLabel)}|${fold(brand)}`] ?? [];
}

export function issuesForType(typeLabel: string): string[] {
  return ISSUES_BY_TYPE[typeId(typeLabel)] ?? COMMON_ISSUES;
}

// Recherche live : filtre par sous-chaîne insensible casse/accents.
export function searchList(items: string[], query: string): string[] {
  const q = fold(query);
  if (!q) return items;
  return items.filter((item) => fold(item).includes(q));
}

// ---------------------------------------------------------------------------
// 5. Visuels d'appareils (miniatures publiques déjà optimisées).
// ---------------------------------------------------------------------------

// Miniature par type d'appareil (étape 1). `null` = pas d'image dédiée : la carte
// retombe sur une icône fine et cohérente plutôt qu'un gros pictogramme.
export const DEVICE_TYPE_IMAGES: Record<string, string | null> = {
  smartphone: "/assets/devices/smartphone-generic.png",
  tablet: "/assets/devices/tablet-generic.png",
  laptop: "/assets/devices/laptop-generic.png",
  desktop: null,
  console: "/assets/devices/console-generic.png",
  watch: null,
  audio: null,
  other: null,
};

// Visuel du modèle sélectionné (aperçu étape 2). On préfère l'image de marque
// quand elle existe, puis l'image générique du type, sinon `null` (icône).
const BRAND_IMAGES: Record<string, string> = {
  "smartphone|apple": "/assets/devices/apple-iphone.png",
  "smartphone|samsung": "/assets/devices/samsung-galaxy.png",
  "smartphone|xiaomi": "/assets/devices/xiaomi-smartphone.png",
  "smartphone|redmi": "/assets/devices/xiaomi-smartphone.png",
  "smartphone|poco": "/assets/devices/xiaomi-smartphone.png",
  "smartphone|google": "/assets/devices/google-pixel.png",
  "tablet|apple": "/assets/devices/apple-ipad.png",
  "laptop|apple": "/assets/devices/apple-macbook.png",
  "desktop|apple": "/assets/devices/apple-macbook.png",
  "console|sony playstation": "/assets/devices/sony-ps5.png",
  "console|microsoft xbox": "/assets/devices/xbox-series.png",
  "console|nintendo": "/assets/devices/nintendo-switch.png",
};

export function deviceImageFor(typeLabel: string, brand?: string): string | null {
  const id = typeId(typeLabel);
  if (brand) {
    const key = `${id}|${fold(brand)}`;
    if (BRAND_IMAGES[key]) return BRAND_IMAGES[key];
  }
  return DEVICE_TYPE_IMAGES[id] ?? null;
}

// ---------------------------------------------------------------------------
// 6. Pannes populaires + regroupement par catégorie.
//    On ne noie jamais le client sous 150 cartes : d'abord les plus demandées,
//    puis des catégories repliables pour le reste.
// ---------------------------------------------------------------------------

const POPULAR_ISSUES_BY_TYPE: Record<string, string[]> = {
  smartphone: [
    "Écran cassé",
    "Batterie",
    "Connecteur de charge",
    "Vitre arrière",
    "Caméra arrière",
    "Caméra avant",
    "Haut-parleur",
    "Micro",
    "Dégât liquide",
  ],
  tablet: ["Écran cassé", "Batterie", "Connecteur de charge", "Vitre tactile", "Caméra", "Haut-parleur"],
  laptop: ["Écran", "Batterie", "Clavier", "Connecteur de charge", "Disque / SSD", "Ventilateur / surchauffe"],
  desktop: [
    "Ne s'allume plus",
    "Disque / SSD",
    "Alimentation",
    "Carte graphique",
    "Mémoire RAM",
    "Ventilation / surchauffe",
  ],
  console: ["Port HDMI", "Ne s'allume plus", "Lecteur / disque", "Surchauffe", "Manette", "Connecteur de charge"],
  watch: ["Écran cassé", "Batterie", "Vitre", "Bouton", "Étanchéité", "Bracelet"],
  audio: ["Ne charge plus", "Son défectueux", "Batterie", "Connecteur de charge", "Micro", "Boîtier de charge"],
  other: ["Écran cassé", "Batterie", "Connecteur de charge", "Dégât liquide", "Diagnostic", "Ne s'allume plus"],
};

// Pannes populaires effectivement disponibles pour ce type (intersection avec la
// liste globale pour éviter d'exposer une panne inconnue du catalogue).
export function popularIssuesForType(typeLabel: string): string[] {
  const all = new Set(issuesForType(typeLabel).map(fold));
  return (POPULAR_ISSUES_BY_TYPE[typeId(typeLabel)] ?? POPULAR_ISSUES_BY_TYPE.other).filter((issue) =>
    all.has(fold(issue)),
  );
}

export const ISSUE_CATEGORY_ORDER = [
  "Écran & châssis",
  "Batterie & charge",
  "Caméra",
  "Son & micro",
  "Boutons & capteurs",
  "Réseau & connectivité",
  "Logiciel & données",
  "Diagnostic & autre",
] as const;

export type IssueCategory = (typeof ISSUE_CATEGORY_ORDER)[number];

// Classement d'une panne dans une catégorie par mots-clés (repli : Diagnostic & autre).
export function issueCategory(issue: string): IssueCategory {
  const f = fold(issue);
  const has = (...keys: string[]) => keys.some((key) => f.includes(key));
  if (has("ecran", "vitre", "chassis", "oled", "lcd", "tactile", "dalle")) return "Écran & châssis";
  if (has("batterie", "connecteur", "charge", "recharge", "alimentation")) return "Batterie & charge";
  if (has("camera", "lentille", "flash")) return "Caméra";
  if (has("haut-parleur", "micro", "ecouteur", "son", "audio", "hdmi", "haut parleur")) {
    return f.includes("hdmi") ? "Réseau & connectivité" : "Son & micro";
  }
  if (has("bouton", "power", "volume", "home", "face id", "touch id", "capteur", "manette")) {
    return "Boutons & capteurs";
  }
  if (has("reseau", "wi-fi", "wifi", "bluetooth", "port hdmi")) return "Réseau & connectivité";
  if (
    has("logiciel", "mise a jour", "deblocage", "systeme", "donnees", "recuperation", "sauvegarde", "reinitialisation")
  )
    return "Logiciel & données";
  return "Diagnostic & autre";
}

// Regroupe des pannes en catégories ordonnées (catégories vides omises).
export function categorizeIssues(issues: string[]): Array<{ category: IssueCategory; issues: string[] }> {
  const buckets = new Map<IssueCategory, string[]>();
  for (const issue of issues) {
    const category = issueCategory(issue);
    const list = buckets.get(category) ?? [];
    list.push(issue);
    buckets.set(category, list);
  }
  return ISSUE_CATEGORY_ORDER.filter((category) => buckets.has(category)).map((category) => ({
    category,
    issues: buckets.get(category) ?? [],
  }));
}
