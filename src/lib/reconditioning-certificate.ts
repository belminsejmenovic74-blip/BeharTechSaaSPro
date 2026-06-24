// reconditioning-certificate — données dérivées + codec QR pour le certificat de reconditionnement.
// Le payload du certificat est encodé dans l'URL (base64url) : la page publique scannée par
// le client n'a besoin d'aucun backend, elle décode et affiche. Fonctionne sur tout appareil.

import {
  computeMargin,
  computeTestSummary,
  type FunctionalTestKey,
  gradeLabel,
  type PhysicalCheckKey,
  type ReconditioningFile,
  type TestState,
} from "@/lib/reconditioning-store";

export const PROTOCOL_POINTS = 80;
export const WORKSHOP_NAME = "Behar Tech Pro";

export type ControlStatus = "validé" | "à signaler" | "non testé";
export type ControlPoint = { label: string; status: ControlStatus };

export type CertificateData = {
  ref: string;
  date: string;
  brand: string;
  model: string;
  storage: string;
  color: string;
  imei: string;
  grade: string;
  gradeLabel: string;
  price: number;
  warrantyMonths: number;
  accessories: string;
  batteryHealth: number | null;
  protocolPoints: number;
  validatedPoints: number;
  defects: string[];
  controls: ControlPoint[];
  technician: string;
  workshopName: string;
  summary: string;
};

const funcStatus = (value?: TestState): ControlStatus => {
  if (value === "OK") return "validé";
  if (value === "Défaut") return "à signaler";
  return "non testé";
};
const physToStatus = (value?: "OK" | "Léger" | "Important"): ControlStatus => {
  if (value === "OK") return "validé";
  if (value === "Léger" || value === "Important") return "à signaler";
  return "non testé";
};

/**
 * Les 18 points de contrôle affichés (ordre canonique).
 * Chaque point est dérivé des tests atelier (12 fonctions + 7 contrôles physiques).
 */
function buildControls(file: ReconditioningFile): ControlPoint[] {
  const f = (key: FunctionalTestKey) => funcStatus(file.functionalTests[key]);
  const p = (key: PhysicalCheckKey) => physToStatus(file.physicalChecks[key]);
  return [
    { label: "Écran", status: f("Écran") },
    { label: "Tactile", status: f("Écran") },
    { label: "Batterie", status: f("Batterie") },
    { label: "Charge", status: f("Charge") },
    { label: "Face ID / Touch ID", status: f("Face ID / Touch ID") },
    { label: "Caméra avant", status: f("Caméras") },
    { label: "Caméras arrière", status: f("Caméras") },
    { label: "Micro", status: f("Micro") },
    { label: "Haut-parleurs", status: f("Haut-parleurs") },
    { label: "Réseau", status: f("Réseau") },
    { label: "Wi-Fi", status: f("Wi-Fi") },
    { label: "Bluetooth", status: f("Bluetooth") },
    { label: "Boutons", status: f("Boutons") },
    { label: "Capteurs", status: f("Capteurs") },
    { label: "Châssis", status: p("Châssis") },
    { label: "Dos", status: p("Back glass") },
    { label: "Connecteur", status: f("Charge") },
    { label: "Humidité", status: p("Humidité") },
  ];
}

function buildDefects(file: ReconditioningFile): string[] {
  const out: string[] = [];
  const fn: Array<[FunctionalTestKey, string]> = [
    ["Écran", "Écran"],
    ["Batterie", "Batterie"],
    ["Charge", "Connecteur de charge"],
    ["Face ID / Touch ID", "Face ID / Touch ID"],
    ["Caméras", "Caméras"],
    ["Micro", "Micro"],
    ["Haut-parleurs", "Haut-parleurs"],
    ["Réseau", "Réseau"],
    ["Wi-Fi", "Wi-Fi"],
    ["Bluetooth", "Bluetooth"],
    ["Boutons", "Boutons"],
    ["Capteurs", "Capteurs"],
  ];
  for (const [key, label] of fn) {
    if (file.functionalTests[key] === "Défaut") out.push(`${label} : défaut signalé`);
  }
  const phys: Array<[PhysicalCheckKey, string]> = [
    ["Rayures", "Rayures"],
    ["Chocs", "Choc"],
    ["Châssis", "Châssis"],
    ["Écran fissuré", "Écran"],
    ["Back glass", "Dos"],
    ["Humidité", "Humidité"],
  ];
  for (const [key, label] of phys) {
    const v = file.physicalChecks[key];
    if (v === "Léger") out.push(`${label} : trace légère`);
    else if (v === "Important") out.push(`${label} : dommage important`);
  }
  const comment = file.testComment.trim();
  if (comment) out.push(comment);
  return out;
}

export function buildCertificateData(file: ReconditioningFile): CertificateData {
  const summary = computeTestSummary(file);
  const controls = buildControls(file);
  const flagged = controls.filter((c) => c.status === "à signaler").length;
  return {
    ref: file.number,
    date: file.updatedAt,
    brand: file.brand || "—",
    model: file.model || "Appareil",
    storage: file.storage,
    color: file.color,
    imei: file.imei,
    grade: summary.grade,
    gradeLabel: gradeLabel(summary.grade),
    price: file.prixVentePrevu,
    warrantyMonths: file.warrantyMonths,
    accessories: file.accessories,
    batteryHealth: file.batteryHealth,
    protocolPoints: PROTOCOL_POINTS,
    validatedPoints: Math.max(0, PROTOCOL_POINTS - flagged),
    defects: buildDefects(file),
    controls,
    technician: "Technicien certifié",
    workshopName: WORKSHOP_NAME,
    summary: file.m360Notes.trim() || file.testComment.trim() || "Reconditionnement complet réalisé en atelier, contrôle qualité validé.",
  };
}

/* ───────────────────────── Codec URL (base64url, unicode-safe) ───────────────────────── */

const STATUS_CODE: Record<ControlStatus, string> = { validé: "1", "à signaler": "2", "non testé": "0" };
const CODE_STATUS: Record<string, ControlStatus> = { "1": "validé", "2": "à signaler", "0": "non testé" };

function b64urlEncode(input: string): string {
  const b64 = btoa(unescape(encodeURIComponent(input)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(b64)));
}

/** Sérialise le certificat en chaîne compacte pour le QR / l'URL. */
export function encodeCertificate(data: CertificateData): string {
  const compact = {
    r: data.ref,
    d: data.date,
    b: data.brand,
    m: data.model,
    st: data.storage,
    cl: data.color,
    im: data.imei,
    g: data.grade,
    gl: data.gradeLabel,
    p: data.price,
    w: data.warrantyMonths,
    ac: data.accessories,
    bt: data.batteryHealth,
    pp: data.protocolPoints,
    vp: data.validatedPoints,
    df: data.defects,
    ct: data.controls.map((c) => STATUS_CODE[c.status]).join(""),
    tc: data.technician,
    ws: data.workshopName,
    sm: data.summary,
  };
  return b64urlEncode(JSON.stringify(compact));
}

const CONTROL_LABELS = [
  "Écran",
  "Tactile",
  "Batterie",
  "Charge",
  "Face ID / Touch ID",
  "Caméra avant",
  "Caméras arrière",
  "Micro",
  "Haut-parleurs",
  "Réseau",
  "Wi-Fi",
  "Bluetooth",
  "Boutons",
  "Capteurs",
  "Châssis",
  "Dos",
  "Connecteur",
  "Humidité",
];

export function decodeCertificate(encoded: string): CertificateData | null {
  try {
    const c = JSON.parse(b64urlDecode(encoded));
    const controls: ControlPoint[] = CONTROL_LABELS.map((label, i) => ({
      label,
      status: CODE_STATUS[(c.ct as string)?.[i] ?? "0"] ?? "non testé",
    }));
    return {
      ref: c.r ?? "",
      date: c.d ?? "",
      brand: c.b ?? "",
      model: c.m ?? "Appareil",
      storage: c.st ?? "",
      color: c.cl ?? "",
      imei: c.im ?? "",
      grade: c.g ?? "",
      gradeLabel: c.gl ?? "",
      price: Number(c.p) || 0,
      warrantyMonths: Number(c.w) || 0,
      accessories: c.ac ?? "",
      batteryHealth: c.bt ?? null,
      protocolPoints: Number(c.pp) || PROTOCOL_POINTS,
      validatedPoints: Number(c.vp) || 0,
      defects: Array.isArray(c.df) ? c.df : [],
      controls,
      technician: c.tc ?? "Technicien certifié",
      workshopName: c.ws ?? WORKSHOP_NAME,
      summary: c.sm ?? "",
    };
  } catch {
    return null;
  }
}

/** Chemin relatif de la page publique du certificat (à passer dans publicAbsoluteUrl). */
export function certificatePublicPath(data: CertificateData): string {
  return `/certificat?d=${encodeCertificate(data)}`;
}

/** Référence stock courte pour l'étiquette (ex. ACQ-2026-000123 → 000123). */
export function stockRef(ref: string): string {
  const tail = ref.split("-").pop();
  return tail ?? ref;
}

export { computeMargin };
