const strip = (s: string) => s.trim();
const normalizeForSearch = (value: string) => value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

export type InterventionDeviceType = "Smartphone" | "Tablette" | "Ordinateur" | "Console" | "Autre";

const BASE_INTERVENTIONS: Record<InterventionDeviceType, string[]> = {
  Smartphone: [
    "Écran",
    "Batterie",
    "Connecteur de charge",
    "Caméra arrière",
    "Caméra avant",
    "Haut-parleur",
    "Micro",
    "Bouton power",
    "Boutons volume",
    "Face ID / Touch ID",
    "Lecteur carte SIM",
    "Dos arrière",
    "Diagnostic",
    "Nettoyage / désoxydation",
    "Micro-soudure",
    "Autre intervention",
  ],
  Tablette: [
    "Écran",
    "Vitre tactile",
    "Batterie",
    "Connecteur de charge",
    "Caméra arrière",
    "Caméra avant",
    "Haut-parleur",
    "Micro",
    "Lecteur carte SIM",
    "Diagnostic",
    "Nettoyage / désoxydation",
    "Micro-soudure",
    "Autre intervention",
  ],
  Console: [
    "Port HDMI",
    "Ventilateur",
    "Nettoyage ventilation",
    "Pâte thermique",
    "Joystick",
    "Manette / Joy-Con",
    "Lecteur disque",
    "Alimentation",
    "Nettoyage complet",
    "Diagnostic",
    "Autre intervention",
  ],
  Ordinateur: [
    "Diagnostic",
    "Nettoyage + pâte thermique",
    "Batterie",
    "Écran / Dalle",
    "Clavier",
    "Trackpad",
    "Disque SSD",
    "RAM",
    "Chargeur / connecteur alimentation",
    "Carte mère",
    "Système / logiciel",
    "Nettoyage interne",
    "Autre intervention",
  ],
  Autre: ["Diagnostic", "Autre intervention"],
};

export const INTERVENTION_ALIASES: Record<string, string[]> = {
  Écran: [
    "vitre",
    "vitre tactile",
    "remplacement vitre",
    "ecran",
    "écran",
    "lcd",
    "oled",
    "display",
    "tactile",
    "écran cassé",
    "ecran casse",
    "protection ecran",
    "protection écran",
  ],
  "Vitre tactile": ["vitre tactile", "vitre", "tactile"],
  "Connecteur de charge": [
    "charge",
    "dock",
    "connecteur",
    "port charge",
    "usb c",
    "usb-c",
    "lightning",
    "connecteur de charge",
  ],
  "Lecteur carte SIM": ["sim", "lecteur sim", "carte sim", "tiroir sim"],
  Batterie: ["battery", "batterie", "accumulateur"],
  Diagnostic: ["diag", "diagnostic", "diagnostic carte mere", "diagnostic carte mère"],
  "Nettoyage / désoxydation": ["nettoyage", "desox", "désox", "oxydation", "desoxydation"],
  "Nettoyage complet": ["nettoyage complet", "nettoyage console"],
  "Nettoyage ventilation": ["ventilation", "nettoyage ventilation", "ventilo", "ventilateur sale"],
  "Nettoyage + pâte thermique": [
    "pate thermique",
    "pâte thermique",
    "nettoyage pate thermique",
    "nettoyage + pate thermique",
    "thermal paste",
  ],
  "Pâte thermique": ["pate thermique", "pâte thermique", "thermal paste"],
  "Port HDMI": ["hdmi", "port hdmi"],
  Joystick: ["joystick", "stick", "joy stick"],
  "Manette / Joy-Con": ["manette", "joy con", "joy-con", "joy con drift", "joycon"],
  Ventilateur: ["ventilateur", "ventilo", "fan"],
  "Lecteur disque": ["lecteur disque", "lecteur bluray", "lecteur dvd", "blu-ray"],
  Alimentation: ["alimentation", "alim", "psu"],
  "Caméra arrière": ["camera arriere", "caméra arrière", "appareil photo arriere", "camera ar"],
  "Caméra avant": ["camera avant", "caméra avant", "selfie", "camera selfie"],
  "Haut-parleur": ["haut parleur", "haut-parleur", "speaker", "hp"],
  Micro: ["micro", "microphone"],
  "Bouton power": ["bouton power", "power", "bouton allumage", "power button"],
  "Boutons volume": ["bouton volume", "boutons volume", "volume", "volume button"],
  "Face ID / Touch ID": ["face id", "touch id", "capteur empreinte", "tic id"],
  "Dos arrière": ["dos arriere", "dos arrière", "back glass", "vitre arriere"],
  Clavier: ["clavier", "keyboard"],
  Trackpad: ["trackpad", "touchpad"],
  "Disque SSD": ["ssd", "disque", "stockage", "nvme"],
  RAM: ["ram", "memoire", "mémoire"],
  "Chargeur / connecteur alimentation": ["chargeur", "connecteur alimentation", "prise jack alim"],
  "Carte mère": ["carte mere", "carte mère", "motherboard", "logic board"],
  "Système / logiciel": ["systeme", "système", "logiciel", "os", "reinstall"],
  "Nettoyage interne": ["nettoyage interne", "nettoyage pc"],
  "Autre intervention": ["autre", "autre intervention", "intervention libre", "custom"],
};

const aliasEntries = Object.entries(INTERVENTION_ALIASES).flatMap(([canonical, aliases]) =>
  aliases.map((alias) => [normalizeForSearch(alias), canonical] as const),
);

const aliasMap = new Map<string, string>(aliasEntries);

export const INTERVENTION_QUICK_SUGGESTIONS = BASE_INTERVENTIONS.Smartphone;

export function getDefaultInterventionsByDeviceType(deviceType: InterventionDeviceType): string[] {
  return BASE_INTERVENTIONS[deviceType] ?? BASE_INTERVENTIONS.Autre;
}

export function normalizeInterventionHint(raw: string): string {
  const clean = strip(raw);
  if (!clean) return "";
  const normalized = normalizeForSearch(clean);
  return aliasMap.get(normalized) ?? clean;
}

export function canonicalizeIntervention(raw: string): string {
  const clean = strip(raw);
  if (!clean) return "";
  const normalized = normalizeForSearch(clean);
  if (aliasMap.has(normalized)) return aliasMap.get(normalized) as string;
  for (const [key, canonical] of aliasMap.entries()) {
    if (normalized.includes(key)) return canonical;
  }
  return clean;
}

export function filterSuggestionChips(typed: string, deviceType: InterventionDeviceType = "Smartphone"): string[] {
  const q = normalizeForSearch(strip(typed));
  const base = getDefaultInterventionsByDeviceType(deviceType);
  if (!q) return base.slice(0, 8);
  return base.filter((item) => {
    const canonical = normalizeForSearch(item);
    return canonical.includes(q) || q.includes(canonical.slice(0, 4));
  });
}
