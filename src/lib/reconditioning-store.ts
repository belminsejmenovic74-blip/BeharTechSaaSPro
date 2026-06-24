// reconditioning-store — Dossiers de reconditionnement (achat → remise en état → certificat → stock).
// Store isolé et persisté, indépendant du behar-store pour ne pas alourdir le cœur réparation.

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { getMarketData } from "@/data/marketData";

export type ReconditioningStatus =
  | "Brouillon"
  | "Évaluation"
  | "Tests"
  | "Reconditionnement"
  | "Prêt à vendre"
  | "En stock";

export type ReconditioningSource = "Achat comptoir" | "Rachat client" | "Lot fournisseur" | "Reprise";

export type CosmeticGrade = "A" | "B" | "C" | "D";

export type TestState = "OK" | "À vérifier" | "Défaut";
export type PhysicalState = "OK" | "Léger" | "Important";
export type SaleChannel = "Boutique physique" | "Leboncoin" | "Internet / Reconditionné";

export type ReconditioningPart = {
  id: string;
  label: string;
  cost: number;
  quantity: number;
  /** Article de stock sélectionné (behar-store StockItem.id). */
  stockItemId?: string;
  /** Quel prix du stock est utilisé comme coût : prix d'achat ou prix de vente. */
  priceMode?: "achat" | "vente";
};

export type ReconditioningEvent = {
  id: string;
  at: string;
  title: string;
  by?: string;
};

/** Clés des tests fonctionnels (OK / À vérifier / Défaut). */
export const FUNCTIONAL_TESTS = [
  "Écran",
  "Face ID / Touch ID",
  "Caméras",
  "Haut-parleurs",
  "Micro",
  "Boutons",
  "Batterie",
  "Charge",
  "Wi-Fi",
  "Bluetooth",
  "Réseau",
  "Capteurs",
] as const;

/** Clés de l'état physique (OK / Léger / Important). */
export const PHYSICAL_CHECKS = [
  "Rayures",
  "Chocs",
  "Châssis",
  "Vis",
  "Humidité",
  "Écran fissuré",
  "Back glass",
] as const;

export type FunctionalTestKey = (typeof FUNCTIONAL_TESTS)[number];
export type PhysicalCheckKey = (typeof PHYSICAL_CHECKS)[number];

export type ReconditioningFile = {
  id: string;
  number: string;
  status: ReconditioningStatus;
  /** Étape la plus avancée atteinte (1..5). */
  step: number;
  createdAt: string;
  updatedAt: string;

  // Étape 1 — Appareil reçu
  brand: string;
  model: string;
  storage: string;
  color: string;
  imei: string;
  serial: string;
  cosmeticGrade: CosmeticGrade | "";
  source: ReconditioningSource;
  receivedAt: string;
  observations: string;
  photos: Partial<Record<"face" | "dos" | "cote" | "defaut", string>>;

  // Étape 2 — Modèle & marge
  prixAchat: number;
  prixVentePrevu: number;
  prixConseille: number;
  canalVente: SaleChannel;
  delaiVenteEstime: number;
  parts: ReconditioningPart[];

  // Étape 3 — Tests & état
  functionalTests: Partial<Record<FunctionalTestKey, TestState>>;
  physicalChecks: Partial<Record<PhysicalCheckKey, PhysicalState>>;
  testComment: string;

  // Étape 4 — Diagnostic M360
  batteryHealth: number | null;
  m360Notes: string;

  // Étape 5 — Certificat & sortie
  warrantyMonths: number;
  accessories: string;
  destinationShop: string;
  certificateGenerated: boolean;
  publishedToStock: boolean;

  history: ReconditioningEvent[];
};

export type MarginSummary = {
  coutTotal: number;
  margeBrute: number;
  margePct: number;
  rentabilite: "Faible" | "Correcte" | "Rentable" | "Très rentable";
  rentabiliteScore: number; // 0..1 pour la barre
};

export type TestSummary = {
  okCount: number;
  defautCount: number;
  aVerifierCount: number;
  importantCount: number;
  totalTests: number;
  grade: CosmeticGrade;
  riskDetected: boolean;
};

const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const nowIso = () => new Date().toISOString();

const padNumber = (seq: number) => `ACQ-${new Date().getFullYear()}-${String(seq).padStart(6, "0")}`;

export function createBlankFile(seq: number): ReconditioningFile {
  const ts = nowIso();
  return {
    id: uid("recond"),
    number: padNumber(seq),
    status: "Brouillon",
    step: 1,
    createdAt: ts,
    updatedAt: ts,
    brand: "",
    model: "",
    storage: "",
    color: "",
    imei: "",
    serial: "",
    cosmeticGrade: "",
    source: "Achat comptoir",
    receivedAt: ts,
    observations: "",
    photos: {},
    prixAchat: 0,
    prixVentePrevu: 0,
    prixConseille: 0,
    canalVente: "Boutique physique",
    delaiVenteEstime: 0,
    parts: [],
    functionalTests: {},
    physicalChecks: {},
    testComment: "",
    batteryHealth: null,
    m360Notes: "",
    warrantyMonths: 12,
    accessories: "",
    destinationShop: "Behar Tech",
    certificateGenerated: false,
    publishedToStock: false,
    history: [{ id: uid("evt"), at: ts, title: "Dossier de reconditionnement créé", by: "Atelier" }],
  };
}

/** Calcule la marge à partir du dossier. */
export function computeMargin(file: ReconditioningFile): MarginSummary {
  const partsTotal = file.parts.reduce((sum, part) => sum + part.cost * part.quantity, 0);
  const coutTotal = file.prixAchat + partsTotal;
  const margeBrute = file.prixVentePrevu - coutTotal;
  const margePct = file.prixVentePrevu > 0 ? (margeBrute / file.prixVentePrevu) * 100 : 0;
  let rentabilite: MarginSummary["rentabilite"] = "Faible";
  if (margePct >= 35) rentabilite = "Très rentable";
  else if (margePct >= 22) rentabilite = "Rentable";
  else if (margePct >= 12) rentabilite = "Correcte";
  const rentabiliteScore = Math.max(0, Math.min(1, margePct / 45));
  return { coutTotal, margeBrute, margePct, rentabilite, rentabiliteScore };
}

/** Synthèse des tests + grade calculé. */
export function computeTestSummary(file: ReconditioningFile): TestSummary {
  const fVals = FUNCTIONAL_TESTS.map((key) => file.functionalTests[key]);
  const pVals = PHYSICAL_CHECKS.map((key) => file.physicalChecks[key]);
  const okCount =
    fVals.filter((v) => v === "OK").length + pVals.filter((v) => v === "OK").length;
  const defautCount = fVals.filter((v) => v === "Défaut").length;
  const aVerifierCount = fVals.filter((v) => v === "À vérifier").length;
  const importantCount = pVals.filter((v) => v === "Important").length;
  const legerCount = pVals.filter((v) => v === "Léger").length;
  const totalTests = FUNCTIONAL_TESTS.length + PHYSICAL_CHECKS.length;

  let grade: CosmeticGrade = "A";
  if (defautCount >= 2 || importantCount >= 2) grade = "C";
  else if (defautCount === 1 || importantCount === 1) grade = "B";
  else if (legerCount >= 2) grade = "B";
  if (defautCount >= 4 || importantCount >= 3) grade = "D";

  return {
    okCount,
    defautCount,
    aVerifierCount,
    importantCount,
    totalTests,
    grade,
    riskDetected: defautCount > 0 || importantCount > 0,
  };
}

const GRADE_LABEL: Record<CosmeticGrade, string> = {
  A: "Très bon état",
  B: "Bon état",
  C: "État correct",
  D: "État moyen",
};

export const gradeLabel = (grade: CosmeticGrade | "") => (grade ? GRADE_LABEL[grade] : "Non évalué");

export const RECONDITIONING_STEPS = [
  { id: 1, label: "Appareil", caption: "Appareil reçu" },
  { id: 2, label: "Modèle & marge", caption: "Références & prix" },
  { id: 3, label: "Tests & état", caption: "Contrôles & état" },
  { id: 4, label: "Diagnostic M360", caption: "Diagnostic assisté" },
  { id: 5, label: "Certificat", caption: "Rapport & sortie" },
] as const;

type ReconditioningState = {
  files: ReconditioningFile[];
  sequence: number;
  createFile: () => string;
  updateFile: (id: string, patch: Partial<ReconditioningFile>) => void;
  setPhoto: (id: string, slot: keyof ReconditioningFile["photos"], dataUrl: string | undefined) => void;
  appendEvent: (id: string, title: string) => void;
  setStep: (id: string, step: number) => void;
  setTest: (id: string, key: FunctionalTestKey, value: TestState) => void;
  setPhysical: (id: string, key: PhysicalCheckKey, value: PhysicalState) => void;
  addPart: (id: string) => void;
  updatePart: (id: string, partId: string, patch: Partial<ReconditioningPart>) => void;
  removePart: (id: string, partId: string) => void;
  prefillFromMarket: (id: string) => void;
  generateCertificate: (id: string) => void;
  publishToStock: (id: string) => void;
  removeFile: (id: string) => void;
};

const touch = (file: ReconditioningFile, patch: Partial<ReconditioningFile>): ReconditioningFile => ({
  ...file,
  ...patch,
  updatedAt: nowIso(),
});

export const useReconditioningStore = create<ReconditioningState>()(
  persist(
    (set, get) => ({
      files: [],
      sequence: 1,
      createFile: () => {
        const seq = get().sequence;
        const file = createBlankFile(seq);
        set((state) => ({ files: [file, ...state.files], sequence: state.sequence + 1 }));
        return file.id;
      },
      updateFile: (id, patch) =>
        set((state) => ({
          files: state.files.map((file) => (file.id === id ? touch(file, patch) : file)),
        })),
      setPhoto: (id, slot, dataUrl) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id ? touch(file, { photos: { ...file.photos, [slot]: dataUrl } }) : file,
          ),
        })),
      appendEvent: (id, title) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id
              ? touch(file, { history: [...file.history, { id: uid("evt"), at: nowIso(), title, by: "Atelier" }] })
              : file,
          ),
        })),
      setStep: (id, step) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id ? touch(file, { step: Math.max(file.step, step) }) : file,
          ),
        })),
      setTest: (id, key, value) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id ? touch(file, { functionalTests: { ...file.functionalTests, [key]: value } }) : file,
          ),
        })),
      setPhysical: (id, key, value) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id ? touch(file, { physicalChecks: { ...file.physicalChecks, [key]: value } }) : file,
          ),
        })),
      addPart: (id) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id
              ? touch(file, { parts: [...file.parts, { id: uid("part"), label: "", cost: 0, quantity: 1, priceMode: "achat" }] })
              : file,
          ),
        })),
      updatePart: (id, partId, patch) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id
              ? touch(file, {
                  parts: file.parts.map((part) => (part.id === partId ? { ...part, ...patch } : part)),
                })
              : file,
          ),
        })),
      removePart: (id, partId) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id ? touch(file, { parts: file.parts.filter((part) => part.id !== partId) }) : file,
          ),
        })),
      prefillFromMarket: (id) =>
        set((state) => ({
          files: state.files.map((file) => {
            if (file.id !== id) return file;
            const market = getMarketData(`${file.brand} ${file.model}`) ?? getMarketData(file.model);
            if (!market) return file;
            const resale = market.prixInternet ?? market.prixMoyen;
            return touch(file, {
              prixVentePrevu: file.prixVentePrevu || resale,
              prixConseille: file.prixConseille || Math.round(resale * 1.07),
              delaiVenteEstime: file.delaiVenteEstime || Math.round(market.joursMoyenVente),
              history: [
                ...file.history,
                {
                  id: uid("evt"),
                  at: nowIso(),
                  title: `Estimation marché appliquée (${resale} · ${Math.round(market.joursMoyenVente)} j)`,
                  by: "Marché",
                },
              ],
            });
          }),
        })),
      generateCertificate: (id) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id
              ? touch(file, {
                  certificateGenerated: true,
                  status: file.status === "En stock" ? "En stock" : "Prêt à vendre",
                  step: Math.max(file.step, 5),
                  history: [
                    ...file.history,
                    { id: uid("evt"), at: nowIso(), title: "Certificat de reconditionnement généré", by: "Atelier" },
                  ],
                })
              : file,
          ),
        })),
      publishToStock: (id) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id
              ? touch(file, {
                  publishedToStock: true,
                  status: "En stock",
                  history: [
                    ...file.history,
                    { id: uid("evt"), at: nowIso(), title: "Publié en stock boutique", by: "Atelier" },
                  ],
                })
              : file,
          ),
        })),
      removeFile: (id) => set((state) => ({ files: state.files.filter((file) => file.id !== id) })),
    }),
    { name: "behar-reconditioning", version: 1 },
  ),
);
