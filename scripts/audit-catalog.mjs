import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const candidates = [
  path.join(ROOT, "public", "catalogues", "global.json"),
  path.join(ROOT, "BeharTech-main", "public", "catalogues", "global.json"),
];
const file = candidates.find((p) => fs.existsSync(p));
if (!file) {
  throw new Error(`global.json introuvable. Candidats testés:\n- ${candidates.join("\n- ")}`);
}

const SUSPICIOUS = [
  "LTPS",
  "OLED",
  "SOFT OLED",
  "HARD OLED",
  "INCELL",
  "LCD",
  "120HZ",
  "60HZ",
  "TI",
  "GX",
  "PULLED",
  "ORIGINAL",
  "COMPATIBLE",
  "VITRE",
  "ÉCRAN",
  "ECRAN",
  "BATTERIE",
  "CONNECTEUR",
  "LECTEUR SIM",
  "SIM",
  "CAMÉRA",
  "CAMERA",
  "HAUT-PARLEUR",
  "DIAGNOSTIC",
  "HDMI",
  "PORT HDMI",
];

function clean(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function hasSuspiciousModel(model) {
  const m = clean(model).toUpperCase();
  return SUSPICIOUS.some((w) => m.includes(w));
}

function normalizeModelHeuristic(model) {
  let m = clean(model);
  const lastTail = (hay, needle) => {
    const idx = hay.toLowerCase().lastIndexOf(needle.toLowerCase());
    return idx < 0 ? hay : hay.slice(idx);
  };
  if ((m.match(/iphone/gi) ?? []).length >= 2) m = lastTail(m, "iPhone");
  if ((m.match(/galaxy/gi) ?? []).length >= 2) m = lastTail(m, "Galaxy");
  if ((m.match(/redmi/gi) ?? []).length >= 2) m = lastTail(m, "Redmi");
  if ((m.match(/pixel/gi) ?? []).length >= 2) m = lastTail(m, "Pixel");

  const removals = [
    /\bLTPS\b/gi,
    /\bSoft\s*OLED\b/gi,
    /\bHard\s*OLED\b/gi,
    /\bOLED\b/gi,
    /\bLCD\b/gi,
    /\bIncell\b/gi,
    /\b120\s*Hz\b|\b120Hz\b/gi,
    /\b60\s*Hz\b|\b60Hz\b/gi,
    /\bTI\b/gi,
    /\bGX\b/gi,
    /\bPulled\s*[ABC]?\b/gi,
    /\bOriginal\b/gi,
    /\bCompatible\b/gi,
    /\bService\s*Pack\b/gi,
    /\bVersion\s*US\b/gi,
    /\bUS\b/gi,
    /\bHDMI\b/gi,
    /\b(Batterie|Connecteur|SIM|Lecteur\s*SIM|Cam(é|e)ra|Haut[\s-]*parleur|Diagnostic|Vitre|Écran|Ecran)\b/gi,
  ];
  for (const re of removals) m = m.replace(re, " ");
  m = m.replace(/[()【】[\]{}]/g, " ");
  m = m.replace(/[-/|_]+/g, " ");
  return clean(m);
}

const raw = JSON.parse(fs.readFileSync(file, "utf8"));
if (!Array.isArray(raw)) throw new Error("global.json doit être un tableau");

const types = new Set();
const brands = new Set();
const models = new Set();
const repairs = new Set();

let suspectCount = 0;
const suspectSamples = [];
let wouldAutoCorrect = 0;
let wouldNeedReview = 0;

for (const item of raw) {
  types.add(clean(item.typeAppareil));
  brands.add(clean(item.marque));
  models.add(clean(item.modele));
  repairs.add(clean(item.reparation));

  if (hasSuspiciousModel(item.modele)) {
    suspectCount++;
    if (suspectSamples.length < 80) {
      suspectSamples.push({
        typeAppareil: item.typeAppareil,
        marque: item.marque,
        modele: item.modele,
        reparation: item.reparation,
        qualite: item.qualite,
        sku: item.sku,
      });
    }
  }

  const normalized = normalizeModelHeuristic(item.modele);
  if (normalized && normalized !== clean(item.modele)) {
    // Heuristique de "à vérifier" si le modèle devient trop vague
    const tooVague =
      ["iphone", "galaxy", "macbook"].includes(normalized.toLowerCase()) ||
      normalized.length < 3;
    if (tooVague) wouldNeedReview++;
    else wouldAutoCorrect++;
  }
}

const report = {
  file,
  totalItems: raw.length,
  deviceTypes: Array.from(types).sort(),
  brands: Array.from(brands).sort(),
  modelsCount: models.size,
  interventionsCount: repairs.size,
  suspiciousModelItems: suspectCount,
  heuristic: {
    wouldAutoCorrect,
    wouldNeedReview,
  },
  suspiciousSamples: suspectSamples,
};

console.log(JSON.stringify(report, null, 2));

