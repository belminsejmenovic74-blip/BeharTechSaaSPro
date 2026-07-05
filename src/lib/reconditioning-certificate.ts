// reconditioning-certificate — données dérivées + codec legacy pour le certificat de reconditionnement.
// Le QR canonique pointe vers un token public stable. Le payload encodé reste accepté
// uniquement comme fallback legacy pour les certificats déjà imprimés.

import { realDeviceImage } from "@/lib/real-product-images";
import {
  computeMargin,
  computeTestSummary,
  DEFAULT_PUBLIC_SETTINGS,
  type FunctionalTestKey,
  gradeLabel,
  type PhysicalCheckKey,
  type PhysicalState,
  type ReconditioningPublicSettings,
  type ReconditioningFile,
  type TestState,
} from "@/lib/reconditioning-store";

export const WORKSHOP_NAME = "Boutique";

export type ControlStatus = "validé" | "à signaler" | "non testé" | "non applicable";
export type ControlPoint = { label: string; status: ControlStatus };

export type CertificateData = {
  ref: string;
  publicToken: string;
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
  shopLogoUrl?: string;
  imageUrl: string;
  publicPhotos: string[];
  publicSettings: ReconditioningPublicSettings;
  publicComment: string;
  screenStatus: string;
  backStatus: string;
  biometricStatus: string;
  networkStatus: string;
  cameraStatus: string;
  oxidationStatus: string;
  imeiStatus: string;
  summary: string;
};

export const PUBLIC_ALLOWED_FIELDS = [
  "shop_name",
  "shop_logo",
  "brand",
  "model",
  "storage",
  "color",
  "sale_price",
  "final_grade",
  "battery_health",
  "warranty_months",
  "reconditioned_at",
  "internal_reference",
  "masked_imei",
  "public_final_diagnostic",
  "tested_points_count",
  "total_points_count",
  "public_photos",
  "public_comment",
] as const;

const funcStatus = (value?: TestState): ControlStatus => {
  if (value === "OK") return "validé";
  if (value === "Défaut") return "à signaler";
  if (value === "Non applicable") return "non applicable";
  return "non testé";
};
const physToStatus = (value?: PhysicalState): ControlStatus => {
  if (value === "OK") return "validé";
  if (value === "Léger" || value === "Important") return "à signaler";
  if (value === "Non applicable") return "non applicable";
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

export function publicTokenForReconditioningFile(
  file: Pick<ReconditioningFile, "id" | "number" | "publicToken">,
): string {
  if (file.publicToken) return file.publicToken;
  const stable = (file.number || file.id || "appareil")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `rd-${stable || "appareil"}`;
}

export function getPublicSettings(file: Pick<ReconditioningFile, "publicSettings">): ReconditioningPublicSettings {
  return { ...DEFAULT_PUBLIC_SETTINGS, ...(file.publicSettings ?? {}) };
}

export function getPublicReconditioningMedia(file: Pick<ReconditioningFile, "media" | "photos">): string[] {
  const media = (file.media ?? [])
    .filter((item) => item.visibility === "public_sale" && item.isPublic && item.dataUrl)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => item.dataUrl);
  return media.length ? media : file.photos.cote ? [file.photos.cote] : [];
}

export function getPrimaryPublicImage(file: Pick<ReconditioningFile, "media" | "photos">): string {
  const primary = (file.media ?? []).find(
    (item) => item.visibility === "public_sale" && item.isPublic && item.isPrimary,
  );
  return primary?.dataUrl || getPublicReconditioningMedia(file)[0] || "";
}

export function getDeviceImageFallback(file: Pick<ReconditioningFile, "brand" | "model">): string {
  return realDeviceImage(file.brand, file.model, "smartphone") || "";
}

export function resolveReconditioningDeviceImage(
  file: Pick<ReconditioningFile, "brand" | "model" | "photos" | "media">,
): string {
  return getPrimaryPublicImage(file) || getDeviceImageFallback(file);
}

export function buildSafePublicImageUrl(value?: string): string {
  if (!value || value.startsWith("blob:")) return "";
  return /^(data:image\/|https?:\/\/|\/)/.test(value) ? value : "";
}

export function maskImeiForPublic(value: string): string {
  const clean = value.replace(/\D/g, "");
  if (clean.length < 8) return value ? "Renseigné" : "Non renseigné";
  return `${clean.slice(0, 4)}•••••••${clean.slice(-4)}`;
}

const hasPartMatching = (file: ReconditioningFile, pattern: RegExp) =>
  file.parts.some((part) => pattern.test(part.label));
const finalFunctional = (file: ReconditioningFile, key: FunctionalTestKey, repairedPattern?: RegExp) => {
  const value = file.functionalTests[key];
  if (value === "OK") return repairedPattern && hasPartMatching(file, repairedPattern) ? "Remplacé / testé OK" : "OK";
  if (value === "Défaut") return "Défaut signalé";
  if (value === "Non applicable") return "Non applicable";
  return "Non renseigné";
};
const finalPhysical = (file: ReconditioningFile, key: PhysicalCheckKey, repairedPattern?: RegExp) => {
  const value = file.physicalChecks[key];
  if (value === "OK") return repairedPattern && hasPartMatching(file, repairedPattern) ? "Remplacée / testée OK" : "OK";
  if (value === "Léger") return "Défaut mineur";
  if (value === "Important") return "Défaut signalé";
  if (value === "Non applicable") return "Non applicable";
  return "Non renseigné";
};
export function calculateTestedPoints(file: ReconditioningFile) {
  const controls = buildControls(file);
  const testedPoints = controls.filter((control) => control.status !== "non testé").length;
  return { testedPoints, totalPoints: controls.length, controls };
}

export function buildCertificateData(
  file: ReconditioningFile,
  options: { workshopName?: string; shopLogoUrl?: string } = {},
): CertificateData {
  const summary = computeTestSummary(file);
  const { controls, testedPoints, totalPoints } = calculateTestedPoints(file);
  const publicSettings = getPublicSettings(file);
  const publicPhotos = publicSettings.showPublicPhotos
    ? getPublicReconditioningMedia(file).map(buildSafePublicImageUrl).filter(Boolean)
    : [];
  const visibleControls = publicSettings.showFinalDiagnostic
    ? controls.filter((control) => file.publicTestVisibility?.[control.label] !== false)
    : [];
  const screenStatus = finalFunctional(file, "Écran", /écran|ecran|oled|lcd|incell/i);
  const backStatus = finalPhysical(file, "Back glass", /vitre|dos|face arrière|back glass/i);
  const biometricStatus = finalFunctional(file, "Face ID / Touch ID");
  const networkStatus = finalFunctional(file, "Réseau");
  const cameraStatus = finalFunctional(file, "Caméras", /caméra|camera/i);
  const oxidationStatus =
    file.physicalChecks.Humidité === "OK"
      ? "Non"
      : file.physicalChecks.Humidité === "Léger"
        ? "Légère"
        : file.physicalChecks.Humidité === "Important"
          ? "Forte"
          : "Non renseigné";
  const imeiStatus = file.imei ? "Propre" : "Non renseigné";
  return {
    ref: file.number,
    publicToken: publicTokenForReconditioningFile(file),
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
    protocolPoints: totalPoints,
    validatedPoints: testedPoints,
    defects: buildDefects(file),
    controls: visibleControls,
    technician: "Technicien certifié",
    workshopName: publicShopName(options.workshopName),
    shopLogoUrl: options.shopLogoUrl,
    imageUrl: buildSafePublicImageUrl(publicPhotos[0] || getDeviceImageFallback(file)),
    publicPhotos,
    publicSettings,
    publicComment: file.testComment.trim(),
    screenStatus,
    backStatus,
    biometricStatus,
    networkStatus,
    cameraStatus,
    oxidationStatus,
    imeiStatus,
    summary: "Reconditionnement complet réalisé en atelier, contrôle qualité validé.",
  };
}

function publicShopName(value?: string): string {
  const clean = value?.trim();
  if (!clean) return WORKSHOP_NAME;
  const weak = clean
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (weak === "behar" || weak === "behartech" || weak === "behartechpro") return WORKSHOP_NAME;
  return clean;
}

/* ───────────────────────── Codec URL (base64url, unicode-safe) ───────────────────────── */

const STATUS_CODE: Record<ControlStatus, string> = {
  validé: "1",
  "à signaler": "2",
  "non testé": "0",
  "non applicable": "3",
};
const CODE_STATUS: Record<string, ControlStatus> = {
  "1": "validé",
  "2": "à signaler",
  "0": "non testé",
  "3": "non applicable",
};

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
  const s = data.publicSettings;
  const compact = {
    r: s.showReference ? data.ref : "",
    pt: data.publicToken,
    d: s.showReconditionedDate ? data.date : "",
    b: data.brand,
    m: s.showModel ? data.model : "",
    st: s.showStorage ? data.storage : "",
    cl: s.showColor ? data.color : "",
    // IMEI toujours masqué AVANT encodage : le payload est décodable par n'importe qui.
    im: s.showMaskedImei ? maskImeiForPublic(data.imei) : "",
    g: s.showGrade ? data.grade : "",
    gl: s.showGrade ? data.gradeLabel : "",
    p: s.showPrice ? data.price : 0,
    w: s.showWarranty ? data.warrantyMonths : 0,
    ac: "",
    bt: s.showBattery ? data.batteryHealth : null,
    pp: s.showControlPoints ? data.protocolPoints : 0,
    vp: s.showControlPoints ? data.validatedPoints : 0,
    // Défauts (dont le commentaire de test interne) : uniquement si le commentaire public est activé,
    // comme à l'affichage — sinon ils resteraient lisibles dans l'URL encodée.
    df: s.showPublicComment ? data.defects : [],
    ct: s.showControlPoints ? data.controls.map((c) => STATUS_CODE[c.status]).join("") : "",
    tc: data.technician,
    ws: s.showShopName ? data.workshopName : "",
    lg: s.showShopLogo ? data.shopLogoUrl : undefined,
    img: s.showPublicPhotos ? data.imageUrl : "",
    sc: s.showFinalDiagnostic ? data.screenStatus : "",
    bk: s.showFinalDiagnostic ? data.backStatus : "",
    bi: s.showFinalDiagnostic ? data.biometricStatus : "",
    nw: s.showFinalDiagnostic ? data.networkStatus : "",
    ca: s.showFinalDiagnostic ? data.cameraStatus : "",
    ox: s.showFinalDiagnostic ? data.oxidationStatus : "",
    is: s.showFinalDiagnostic ? data.imeiStatus : "",
    sm: data.summary,
    ps: data.publicSettings,
    pc: s.showPublicComment ? data.publicComment : "",
    ph: s.showPublicPhotos ? data.publicPhotos : [],
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
      publicToken: c.pt ?? "",
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
      protocolPoints: Number(c.pp) || CONTROL_LABELS.length,
      validatedPoints: Number(c.vp) || 0,
      defects: Array.isArray(c.df) ? c.df : [],
      controls,
      technician: c.tc ?? "Technicien certifié",
      workshopName: c.ws ?? WORKSHOP_NAME,
      shopLogoUrl: c.lg ?? undefined,
      imageUrl: c.img ?? "",
      publicPhotos: Array.isArray(c.ph)
        ? c.ph
            .filter((value: unknown) => typeof value === "string")
            .map(buildSafePublicImageUrl)
            .filter(Boolean)
        : [],
      publicSettings: { ...DEFAULT_PUBLIC_SETTINGS, ...(c.ps ?? {}) },
      publicComment: c.pc ?? "",
      screenStatus: c.sc ?? "Inconnu",
      backStatus: c.bk ?? "Inconnu",
      biometricStatus: c.bi ?? "Inconnu",
      networkStatus: c.nw ?? "Inconnu",
      cameraStatus: c.ca ?? "Inconnu",
      oxidationStatus: c.ox ?? "Inconnu",
      imeiStatus: c.is ?? "Inconnu",
      summary: c.sm ?? "",
    };
  } catch {
    return null;
  }
}

/** Chemin relatif de la page publique du certificat (à passer dans publicAbsoluteUrl). */
export function certificatePublicPath(data: CertificateData): string {
  return `/suivi/appareil/${encodeURIComponent(data.publicToken || stockRef(data.ref))}`;
}

/** Référence stock courte pour l'étiquette (ex. ACQ-2026-000123 → 000123). */
export function stockRef(ref: string): string {
  const tail = ref.split("-").pop();
  return tail ?? ref;
}

export { computeMargin };
