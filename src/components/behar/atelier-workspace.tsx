"use client";

import { useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Clock,
  FileText,
  History,
  ImagePlus,
  LockKeyhole,
  MessageSquare,
  Package,
  Pause,
  Play,
  Plus,
  Printer,
  QrCode,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Timer,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { AtelierUpcoming } from "@/components/behar/atelier-upcoming";
import { RealDeviceVisual, RealProductVisual } from "@/components/behar/real-product-visual";
import {
  type BeharDocument,
  type Customer,
  type Repair,
  type RepairChecklistItem,
  type RepairEvidencePhoto,
  type RepairFinalTestStatus,
  type RepairPriority,
  type RepairStatus,
  type RepairSubStatus,
  type RepairTestResult,
  type StockItem,
  type SupplierInvoice,
  type DeviceModel,
  formatEuro,
  formatIsoToDisplay,
  getNowIso,
  getRepairReadyDisplayLabel,
  isTerminalRepairStatus,
  useBeharStore,
} from "@/lib/behar-store";
import { displayCustomerName } from "@/lib/customer-display";
import { normalizeCustomerPhone } from "@/lib/customer-phone";
import { getCustomerTrackingUrl } from "@/lib/customer-tracking";
import { formatDeviceLabel } from "@/lib/format-device";
import { getPartTraceability } from "@/lib/part-traceability";
import { repairReadyStatusLabel } from "@/lib/repair-status";
import { sendRealSms } from "@/lib/send-sms";
import {
  normalizePartReference,
  resolveStockItem,
  stockPrimaryReference,
  stockReferenceMatches,
} from "@/lib/stock-reference";
import { cn } from "@/lib/utils";

import { Panel, PrimaryButton, SearchBox, SecondaryButton, StatusBadge } from "./primitives";
import { PartReferenceLink } from "./part-reference-link";
import { useDocument } from "./print-provider";
import { SettlementModal, useSettlementModal } from "./settlement-modal";
import { TrackingQrModal } from "./tracking-qr-modal";

type AtelierView =
  | "queue"
  | "fiche"
  | "diagnostic"
  | "parts"
  | "intervention"
  | "photos"
  | "final-test"
  | "history"
  | "documents"
  | "sav";

type QueueColumn = {
  title: string;
  caption: string;
  statuses: RepairStatus[];
  icon: typeof Wrench;
  tone: "blue" | "gray" | "amber" | "green" | "purple";
};

const queueColumns: QueueColumn[] = [
  { title: "Reçu", caption: "0-24h", statuses: ["Reçu"], icon: ClipboardCheck, tone: "blue" },
  { title: "Diagnostic", caption: "0-48h", statuses: ["Diagnostic"], icon: Search, tone: "blue" },
  {
    title: "En attente",
    caption: "Pièce / client",
    statuses: ["En attente", "Devis envoyé", "Devis accepté"],
    icon: Package,
    tone: "amber",
  },
  { title: "En réparation", caption: "En cours", statuses: ["En réparation"], icon: Wrench, tone: "green" },
  { title: "Test final", caption: "Contrôle qualité", statuses: ["Test final"], icon: ShieldCheck, tone: "purple" },
  { title: "Prêt", caption: "À restituer", statuses: ["Prêt"], icon: CheckCircle2, tone: "green" },
];

const tabs: Array<{ id: AtelierView; label: string; icon: typeof Wrench }> = [
  { id: "fiche", label: "Fiche", icon: ClipboardCheck },
  { id: "diagnostic", label: "Diagnostic", icon: Search },
  { id: "parts", label: "Pièces & stock", icon: Package },
  { id: "intervention", label: "Intervention", icon: Timer },
  { id: "photos", label: "Photos", icon: Camera },
  { id: "final-test", label: "Test final", icon: ShieldCheck },
  { id: "history", label: "Historique", icon: History },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "sav", label: "SAV", icon: RotateCcw },
];

const priorityOrder: Record<RepairPriority, number> = { Urgent: 0, Haute: 1, Normale: 2, Basse: 3 };

const smartphoneChecks = [
  "Allumage",
  "Écran",
  "Tactile",
  "Charge",
  "Caméra",
  "Micro / son",
  "Wi-Fi",
  "Bluetooth",
  "Réseau",
  "Face ID / Touch ID",
  "Oxydation",
  "Traces de choc",
];

const consoleChecks = [
  "Allumage",
  "HDMI",
  "Ventilation",
  "Stockage",
  "Manette détectée",
  "Température",
  "Bruit anormal",
];
const computerChecks = [
  "Démarrage",
  "Écran",
  "Clavier",
  "Trackpad",
  "Charge",
  "Batterie",
  "Wi-Fi",
  "Disque",
  "Température",
  "Ventilateur",
];
const finalSmartphoneChecks = [
  "Allumage",
  "Écran",
  "Tactile",
  "Charge",
  "Caméra avant",
  "Caméra arrière",
  "Micro",
  "Haut-parleur",
  "Wi-Fi",
  "Bluetooth",
  "Réseau",
  "Face ID / Touch ID",
  "Nettoyage",
  "Données intactes",
  "Boutons",
  "Capteurs",
];

const evidenceCategories: RepairEvidencePhoto["category"][] = [
  "Avant / réception",
  "Diagnostic",
  "Réparation",
  "Après / contrôle final",
  "SAV",
];

const noteTags = ["Général", "Diagnostic", "Stock", "Client", "Priorité", "SAV"] as const;
type NoteTag = (typeof noteTags)[number];

const clientMessageTemplates: string[] = [
  "Votre appareil est en diagnostic.",
  "Votre devis est disponible.",
  "Nous attendons votre validation.",
  "Votre appareil est en réparation.",
  "Votre appareil est prêt à être récupéré.",
  "Merci de passer avec votre bon de dépôt.",
];

const READY_CLIENT_MESSAGE = "Bonjour, votre appareil est prêt. Vous pouvez passer le récupérer à votre convenance.";

const photoCategoryType = (category: RepairEvidencePhoto["category"]): RepairEvidencePhoto["type"] =>
  category === "Avant / réception"
    ? "État d'entrée"
    : category === "Après / contrôle final"
      ? "Contrôle final"
      : category === "SAV"
        ? "Retour SAV"
        : category === "Diagnostic"
          ? "Diagnostic"
          : "Intervention";

// Best-effort : tente d'uploader la photo vers Supabase Storage. En cas d'échec ou
// d'absence de config Supabase, la photo reste persistée localement (data URL) — aucune perte.
async function uploadPhotoToCloud(repairId: string, photoId: string, fileName: string, dataUrl: string): Promise<void> {
  try {
    const res = await fetch("/api/repair-photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repairId, fileName, dataUrl }),
    });
    if (!res.ok) return;
    const json = (await res.json().catch(() => null)) as { url?: string; storagePath?: string } | null;
    if (!json?.url) return;
    const state = useBeharStore.getState();
    const repair = state.repairs.find((entry) => entry.id === repairId);
    if (!repair) return;
    // On remplace la data URL base64 par l'URL publique Storage (allège le stockage local).
    state.updateRepair(repairId, {
      workshopPhotos: (repair.workshopPhotos ?? []).map((photo) =>
        photo.id === photoId ? { ...photo, dataUrl: json.url, storagePath: json.storagePath } : photo,
      ),
    });
  } catch {
    // Silencieux : la photo reste disponible en local.
  }
}

function priorityForRepair(repair: Repair): RepairPriority {
  if (repair.priority) return repair.priority;
  const text = `${repair.issue} ${repair.notes}`.toLowerCase();
  if (text.includes("urgent") || text.includes("pro") || text.includes("hdmi")) return "Urgent";
  if (text.includes("écran") || text.includes("ecran") || text.includes("charge")) return "Haute";
  return "Normale";
}

function priorityBadge(priority: RepairPriority) {
  return cn(
    "inline-flex items-center gap-1.5 rounded-[8px] border px-2 py-1 font-semibold text-[11px]",
    priority === "Urgent" && "border-[#F2D4D1] bg-[#FFFFFF] text-[#B42318]",
    priority === "Haute" && "border-[#FFE6C7] bg-[#FFFFFF] text-[#936100]",
    priority === "Normale" && "border-[#D8E9FF] bg-[#FFFFFF] text-[#2563A9]",
    priority === "Basse" && "border-[#D7EFEA] bg-[#FFFFFF] text-[#167B70]",
  );
}

function parseDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : undefined;
}

function relativeSince(value?: string) {
  const date = parseDate(value);
  if (!date) return value ? formatIsoToDisplay(value) : "Non horodaté";
  const diff = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ${minutes % 60} min`;
  const days = Math.floor(hours / 24);
  return `${days} j ${hours % 24} h`;
}

function isOverdue(repair: Repair) {
  const promise = parseDate(repair.estimatedDoneAt);
  if (!promise) return false;
  return promise.getTime() < Date.now() && repair.status !== "Prêt" && !isTerminalRepairStatus(repair.status);
}

function resultTone(result: RepairTestResult) {
  if (result === "OK") return "border-[#D7EFEA] bg-[#FFFFFF] text-[#167B70]";
  if (result === "KO" || result === "Défaut constaté") return "border-[#F2D4D1] bg-[#FFFFFF] text-[#B42318]";
  if (result === "Non testable") return "border-[#E4E7EC] bg-[#FFFFFF] text-[#71717A]";
  if (result === "Test repoussé") return "border-[#FEF0C7] bg-[#FFFFFF] text-[#B54708]";
  if (result === "Non applicable") return "border-[#E4E7EC] bg-[#FFFFFF] text-[#667085]";
  return "border-[#E4E7EC] bg-white text-[#667085]";
}

function defaultChecklist(repair: Repair, final = false): RepairChecklistItem[] {
  const type = `${repair.deviceType ?? ""} ${repair.device} ${repair.model}`.toLowerCase();
  const labels = final
    ? finalSmartphoneChecks
    : type.includes("console") || type.includes("ps5") || type.includes("switch")
      ? consoleChecks
      : type.includes("ordinateur") || type.includes("macbook")
        ? computerChecks
        : smartphoneChecks;
  return labels.map((label, index) => ({
    id: `${final ? "final" : "diag"}_${index}_${label.toLowerCase().replace(/\W+/g, "_")}`,
    label,
    result: final ? "Non testé" : index < 2 ? "OK" : "Non testé",
  }));
}

function compactCurrency(value: number | undefined) {
  return formatEuro(typeof value === "number" && Number.isFinite(value) ? value : 0);
}

function customerFor(repair: Repair | undefined, customers: Customer[]) {
  return repair ? customers.find((customer) => customer.id === repair.customerId) : undefined;
}

function searchable(value?: string) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parsePartReferenceInput(value: string) {
  const input = value.trim();
  if (!input) return "";
  try {
    const url = new URL(input, window.location.origin);
    const pathSegments = url.pathname.split("/");
    const pieceIndex = pathSegments.indexOf("piece");
    const pathReference = pieceIndex >= 0 ? pathSegments[pieceIndex + 1] : "";
    const queryReference = url.searchParams.get("ref") || url.searchParams.get("sku") || url.searchParams.get("q");
    return decodeURIComponent(pathReference || queryReference || input).trim();
  } catch {
    return input;
  }
}

function stockItemMatchesQuery(item: StockItem, query: string) {
  const normalizedReference = normalizePartReference(query);
  if (normalizedReference && stockReferenceMatches(item, normalizedReference)) return true;
  const q = searchable(query);
  if (!q) return true;
  return [
    item.displayName,
    item.name,
    item.rawName,
    item.categoryName,
    item.category,
    item.quality,
    item.supplier,
    item.primarySupplier,
    item.supplierBrand,
    ...item.compatibleModels,
  ].some((value) => searchable(value).includes(q));
}

function originInvoiceForStockItem(
  item: StockItem | undefined,
  trace: ReturnType<typeof getPartTraceability>,
): SupplierInvoice | undefined {
  if (!item) return trace.supplierInvoices[0];
  return (
    trace.supplierInvoices.find((invoice) => invoice.id === item.originSupplierInvoiceId) ?? trace.supplierInvoices[0]
  );
}

function inferModelFromPieceNameStrict(
  pieceName: string,
  brandId?: string,
  deviceModelsList: DeviceModel[] = [],
): DeviceModel | undefined {
  const pName = pieceName
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!pName) return undefined;

  let bestMatch: DeviceModel | undefined;
  let longestLength = 0;

  const candidateModels = brandId ? deviceModelsList.filter((m) => m.brandId === brandId) : deviceModelsList;

  for (const m of candidateModels) {
    const mName = m.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (!mName) continue;

    const regex = new RegExp(`\\b${mName}\\b`, "i");
    if (regex.test(pName)) {
      if (mName.length > longestLength) {
        longestLength = mName.length;
        bestMatch = m;
      }
    }

    if (m.aliases) {
      for (const alias of m.aliases) {
        const aName = alias
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{M}/gu, "")
          .replace(/[^a-z0-9]+/g, " ")
          .trim();
        if (!aName) continue;
        const aliasRegex = new RegExp(`\\b${aName}\\b`, "i");
        if (aliasRegex.test(pName)) {
          if (aName.length > longestLength) {
            longestLength = aName.length;
            bestMatch = m;
          }
        }
      }
    }
  }

  return bestMatch;
}

export function isStockItemCompatibleWithRepair(
  item: StockItem,
  repair: Repair,
  deviceModelsList: DeviceModel[],
): boolean {
  if (item.brandId && repair.brandId && item.brandId !== repair.brandId) {
    return false;
  }
  if (item.brandName && repair.brandName && item.brandName.toLowerCase() !== repair.brandName.toLowerCase()) {
    return false;
  }

  if (repair.modelId && item.modelIds && item.modelIds.includes(repair.modelId)) {
    return true;
  }

  const repairModelName = (repair.deviceModel ?? repair.model ?? "").trim().toLowerCase();
  if (repairModelName && item.compatibleModels && item.compatibleModels.length > 0) {
    const isCompatible = item.compatibleModels.some((m) => m.trim().toLowerCase() === repairModelName);
    if (isCompatible) return true;
  }

  const hasNoModels =
    (!item.modelIds || item.modelIds.length === 0) && (!item.compatibleModels || item.compatibleModels.length === 0);
  if (hasNoModels) {
    const inferred = inferModelFromPieceNameStrict(item.name || item.part, item.brandId, deviceModelsList);
    if (inferred) {
      if (repair.modelId && inferred.id === repair.modelId) {
        return true;
      }
      const inferredName = inferred.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
      const repairName = repairModelName
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
      if (inferredName === repairName) {
        return true;
      }
    }
  }

  return false;
}

export function AtelierWorkspace() {
  const {
    deviceModels,
    repairs,
    customers,
    stockItems,
    purchases,
    supplierInvoices,
    supplierInvoiceLines,
    stockMovements,
    sales,
    documents,
    quotes,
    invoices,
    payments,
    auditLogs,
    currentUser,
    selectedRepairId,
    setSelected,
    updateRepair,
    changeRepairStatus,
    appendRepairHistory,
    validateRepairFinalTest,
    markRepairTestImpossible,
    setRepairWorkshopOutcome,
    addRepairMessage,
    addPartToRepair,
    confirmPartUsage,
    removePartFromRepair,
    addQuote,
    addDocument,
    addRepair,
    ensureRepairPublicAccess,
    hasPermission,
  } = useBeharStore(
    useShallow((s) => ({
      repairs: s.repairs,
      customers: s.customers,
      stockItems: s.stockItems,
      purchases: s.purchases,
      supplierInvoices: s.supplierInvoices,
      supplierInvoiceLines: s.supplierInvoiceLines,
      stockMovements: s.stockMovements,
      sales: s.sales,
      documents: s.documents,
      quotes: s.quotes,
      invoices: s.invoices,
      payments: s.payments,
      auditLogs: s.auditLogs,
      currentUser: s.currentUser,
      selectedRepairId: s.selectedRepairId,
      setSelected: s.setSelected,
      updateRepair: s.updateRepair,
      changeRepairStatus: s.changeRepairStatus,
      appendRepairHistory: s.appendRepairHistory,
      validateRepairFinalTest: s.validateRepairFinalTest,
      markRepairTestImpossible: s.markRepairTestImpossible,
      setRepairWorkshopOutcome: s.setRepairWorkshopOutcome,
      addRepairMessage: s.addRepairMessage,
      addPartToRepair: s.addPartToRepair,
      confirmPartUsage: s.confirmPartUsage,
      removePartFromRepair: s.removePartFromRepair,
      addQuote: s.addQuote,
      addDocument: s.addDocument,
      addRepair: s.addRepair,
      ensureRepairPublicAccess: s.ensureRepairPublicAccess,
      hasPermission: s.hasPermission,
      deviceModels: s.deviceModels,
    })),
  );

  const [query, setQuery] = useState("");
  const [view, setView] = useState<AtelierView>("queue");
  const [showAllStock, setShowAllStock] = useState(false);
  const [codeVisible, setCodeVisible] = useState(false);
  const [diagnosisItems, setDiagnosisItems] = useState<RepairChecklistItem[]>([]);
  const [finalItems, setFinalItems] = useState<RepairChecklistItem[]>([]);
  const [finalComment, setFinalComment] = useState("");
  const [impossibleReason, setImpossibleReason] = useState("");
  const [timerTick, setTimerTick] = useState(0);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteTag, setNoteTag] = useState<NoteTag>("Général");
  const [clientDraft, setClientDraft] = useState("");
  const [selectedQrRepairId, setSelectedQrRepairId] = useState<string | null>(null);
  const [partSearch, setPartSearch] = useState("");
  const [focusedStockItemId, setFocusedStockItemId] = useState("");

  // Génération/téléchargement PDF réel (bon de dépôt, fiche d'intervention, devis, facture…).
  const { download: downloadDocument, uploadToCloud: uploadDocumentToCloud } = useDocument();
  const settlement = useSettlementModal();

  const selectedRepair = repairs.find((repair) => repair.id === selectedRepairId) ?? repairs[0];
  const selectedCustomer = customerFor(selectedRepair, customers);

  const compatibleItems = useMemo(() => {
    if (!selectedRepair) return [];
    return stockItems.filter((item) => isStockItemCompatibleWithRepair(item, selectedRepair, deviceModels));
  }, [stockItems, selectedRepair, deviceModels]);

  const partCandidates = useMemo(() => {
    const parsedQuery = parsePartReferenceInput(partSearch);
    const baseItems = parsedQuery ? stockItems : showAllStock ? stockItems : compatibleItems;
    return baseItems
      .filter((item) => item.active !== false && item.repairEnabled !== false)
      .filter((item) => !parsedQuery || stockItemMatchesQuery(item, parsedQuery))
      .sort((a, b) => {
        const aCompatible = selectedRepair ? isStockItemCompatibleWithRepair(a, selectedRepair, deviceModels) : false;
        const bCompatible = selectedRepair ? isStockItemCompatibleWithRepair(b, selectedRepair, deviceModels) : false;
        if (aCompatible !== bCompatible) return aCompatible ? -1 : 1;
        return (b.stock > 0 ? 1 : 0) - (a.stock > 0 ? 1 : 0);
      });
  }, [compatibleItems, deviceModels, partSearch, selectedRepair, showAllStock, stockItems]);

  const focusedStockItem = partCandidates.find((item) => item.id === focusedStockItemId) ?? partCandidates[0];
  const focusedPartTrace = useMemo(
    () =>
      focusedStockItem
        ? getPartTraceability(
            {
              stockItems,
              purchases,
              supplierInvoiceLines,
              supplierInvoices,
              stockMovements,
              repairs,
              customers,
              sales,
            },
            stockPrimaryReference(focusedStockItem),
          )
        : undefined,
    [
      customers,
      focusedStockItem,
      purchases,
      repairs,
      sales,
      stockItems,
      stockMovements,
      supplierInvoiceLines,
      supplierInvoices,
    ],
  );
  const focusedOriginInvoice =
    focusedStockItem && focusedPartTrace ? originInvoiceForStockItem(focusedStockItem, focusedPartTrace) : undefined;
  const focusedOriginLine =
    focusedPartTrace?.supplierInvoiceLines.find((line) => line.id === focusedStockItem?.originSupplierInvoiceLineId) ??
    focusedPartTrace?.supplierInvoiceLines[0];

  const canViewMoney = hasPermission("canViewMargin");
  const canViewPurchasePrice = hasPermission("canViewPurchasePrice");
  const canViewSupplier = hasPermission("canViewSupplier");
  const canUseStockItem = hasPermission("canUseStockItem");
  const isManager = currentUser.role === "admin";

  const selectPartFromSearch = () => {
    const parsed = parsePartReferenceInput(partSearch);
    if (!parsed) {
      toast.error("Tapez ou scannez une référence pièce.");
      return;
    }
    const match =
      resolveStockItem(stockItems, parsed, { allowName: true }) ??
      stockItems.find((item) => stockItemMatchesQuery(item, parsed));
    if (!match) {
      toast.error("Aucune pièce trouvée pour cette référence.");
      return;
    }
    setFocusedStockItemId(match.id);
    setPartSearch(stockPrimaryReference(match));
    setShowAllStock(true);
  };

  const useStockItemInRepair = (item: StockItem) => {
    if (!selectedRepair) return;
    const existingPart = selectedRepair.parts.find((part) => part.stockItemId === item.id);
    if (existingPart?.confirmed) {
      toast.info("Cette pièce est déjà utilisée dans le dossier.");
      return;
    }
    const compatible = isStockItemCompatibleWithRepair(item, selectedRepair, deviceModels);
    if (!compatible) {
      const confirmed = window.confirm(
        `La pièce "${item.displayName ?? item.name}" n'est pas marquée compatible avec ${selectedRepair.brandName} ${selectedRepair.deviceModel || selectedRepair.model}. L'utiliser quand même ?`,
      );
      if (!confirmed) return;
    }
    if (!existingPart && item.stock <= 0) {
      toast.error("Stock indisponible pour cette pièce.");
      return;
    }
    const added = existingPart ? true : addPartToRepair(selectedRepair.id, item.id, 1);
    const used = added ? confirmPartUsage(selectedRepair.id, item.id) : false;
    if (!added || !used) {
      toast.error("Impossible d'utiliser cette pièce. Vérifiez le stock et les permissions.");
      return;
    }
    setFocusedStockItemId(item.id);
    toast.success("Pièce utilisée, stock décrémenté et mouvement lié au dossier.");
  };

  const filteredRepairs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return repairs
      .filter((repair) => !isTerminalRepairStatus(repair.status))
      .filter((repair) => {
        if (!q) return true;
        const customer = customerFor(repair, customers);
        return [
          repair.number,
          displayCustomerName(customer),
          repair.device,
          repair.deviceModel,
          repair.issue,
          repair.imei,
          repair.technician,
          repair.subStatus,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => priorityOrder[priorityForRepair(a)] - priorityOrder[priorityForRepair(b)]);
  }, [customers, query, repairs]);

  const queueStats = useMemo(() => {
    const late = filteredRepairs.filter(isOverdue).length;
    const blocked = filteredRepairs.filter(
      (repair) => repair.blockReason || repair.subStatus?.includes("attente"),
    ).length;
    const ready = filteredRepairs.filter((repair) => repair.status === "Prêt").length;
    const load = Math.min(100, Math.round((filteredRepairs.length / 24) * 100));
    return { late, blocked, ready, load };
  }, [filteredRepairs]);

  useEffect(() => {
    if (!selectedRepair) return;
    setDiagnosisItems(
      selectedRepair.diagnosisChecklist?.length ? selectedRepair.diagnosisChecklist : defaultChecklist(selectedRepair),
    );
    setFinalItems(
      selectedRepair.finalTest?.items?.length ? selectedRepair.finalTest.items : defaultChecklist(selectedRepair, true),
    );
    setFinalComment(selectedRepair.finalTest?.comment ?? "");
    setImpossibleReason(selectedRepair.finalTest?.testImpossibleReason ?? "");
    setCodeVisible(false);
    setShowAllStock(false);
  }, [selectedRepair?.id]);

  useEffect(() => {
    if (!selectedRepair?.intervention?.timerRunning) return;
    const interval = window.setInterval(() => setTimerTick((tick) => tick + 1), 1000);
    return () => window.clearInterval(interval);
  }, [selectedRepair?.intervention?.timerRunning]);

  const openRepair = (repairId: string, nextView: AtelierView = "fiche") => {
    setSelected("repair", repairId);
    setView(nextView);
    setShowAllStock(false);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  const updateChecklistResult = (kind: "diagnosis" | "final", itemId: string, result: RepairTestResult) => {
    const setter = kind === "diagnosis" ? setDiagnosisItems : setFinalItems;
    setter((items) => items.map((item) => (item.id === itemId ? { ...item, result } : item)));
  };

  const updateChecklistComment = (kind: "diagnosis" | "final", itemId: string, comment: string) => {
    const setter = kind === "diagnosis" ? setDiagnosisItems : setFinalItems;
    setter((items) => items.map((item) => (item.id === itemId ? { ...item, comment } : item)));
  };

  if (!repairs.length) {
    return (
      <div className="space-y-5">
        <AtelierUpcoming />
        <Panel className="overflow-hidden bg-[#FFFFFF] p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
            <div className="max-w-2xl">
              <span className="inline-flex size-11 items-center justify-center rounded-[14px] bg-[#FFFFFF] text-[#2A9D8F]">
                <Wrench className="size-5" />
              </span>
              <h2 className="mt-5 font-semibold text-[#101828] text-[30px] leading-tight tracking-tight">
                File d'attente atelier prête à recevoir les dossiers comptoir.
              </h2>
              <p className="mt-3 text-[#667085] text-sm leading-6">
                Dès qu'une prise en charge est créée au comptoir, elle apparaît ici avec le client, l'appareil, la
                panne, la date promise et les actions technicien.
              </p>
            </div>
            <div className="grid gap-3">
              {[
                ["Reçu", "Dossier comptoir"],
                ["Diagnostic", "Contrôle technicien"],
                ["En réparation", "Intervention atelier"],
              ].map(([status, label], index) => (
                <div
                  className="rounded-[16px] border border-[#E4E7EC] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.035)]"
                  key={label}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#101828] text-sm">Étape {index + 1}</span>
                    <StatusBadge status={status} />
                  </div>
                  <p className="mt-3 text-[#101828] text-sm">{label}</p>
                  <p className="mt-1 text-[#667085] text-xs">Synchronisé avec le dossier central</p>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  if (view === "queue") {
    return (
      <div className="space-y-5">
        <AtelierUpcoming />
        <div className="grid gap-3 md:grid-cols-4">
          <WorkshopMetric
            label="Dossiers actifs"
            value={String(filteredRepairs.length)}
            helper="Tous statuts atelier"
          />
          <WorkshopMetric
            label="En retard"
            value={String(queueStats.late)}
            helper="Date promise dépassée"
            tone="danger"
          />
          <WorkshopMetric
            label="Bloqués"
            value={String(queueStats.blocked)}
            helper="Pièce, client ou devis"
            tone="amber"
          />
          <WorkshopMetric
            label="Charge atelier"
            value={`${queueStats.load}%`}
            helper={`${queueStats.ready} prêts à récupérer`}
            tone="green"
          />
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <SearchBox
            className="md:max-w-[460px]"
            placeholder="Rechercher dossier, client, appareil, IMEI..."
            value={query}
            onChange={setQuery}
          />
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={() => setQuery("")}>Filtres</SecondaryButton>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[1180px] grid-cols-6 gap-3">
            {queueColumns.map((column) => {
              const columnRepairs = filteredRepairs.filter((repair) => column.statuses.includes(repair.status));
              return (
                <section
                  className="min-h-[620px] rounded-[18px] border border-[#E4E7EC] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.035)]"
                  key={column.title}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn("grid size-8 place-items-center rounded-[10px]", columnTone(column.tone))}>
                        <column.icon className="size-4" />
                      </span>
                      <div>
                        <h3 className="font-semibold text-[#101828] text-[14px]">{column.title}</h3>
                        <p className="text-[#667085] text-[11px]">{column.caption}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-[#FFFFFF] px-2 py-0.5 font-semibold text-[#667085] text-[11px]">
                      {columnRepairs.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {columnRepairs.map((repair) => (
                      <RepairQueueCard
                        customer={customerFor(repair, customers)}
                        key={repair.id}
                        onOpen={() => openRepair(repair.id)}
                        repair={repair}
                      />
                    ))}
                    {!columnRepairs.length && (
                      <div className="rounded-[14px] border border-dashed border-[#E4E7EC] p-4 text-center text-[#98A2B3] text-xs">
                        Aucun dossier
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (!selectedRepair) return null;

  const relatedDocuments = documents.filter((document) => document.repairId === selectedRepair.id);
  const relatedQuotes = quotes.filter(
    (quote) => quote.repairId === selectedRepair.id || selectedRepair.quoteIds?.includes(quote.id),
  );
  const relatedInvoices = invoices.filter(
    (invoice) => invoice.repairId === selectedRepair.id || selectedRepair.invoiceIds?.includes(invoice.id),
  );
  const relatedPayments = payments.filter(
    (payment) => payment.repairId === selectedRepair.id || selectedRepair.paymentIds?.includes(payment.id),
  );
  const relatedAudit = auditLogs.filter(
    (entry) => entry.targetType === "repair" && entry.targetId === selectedRepair.id,
  );
  const selectedPriority = priorityForRepair(selectedRepair);
  const elapsed = interventionElapsed(selectedRepair);
  const relatedPaidLabel = getRepairReadyDisplayLabel(selectedRepair, relatedPayments);

  const markWorkshopOutcome = (outcome: RepairFinalTestStatus, fallbackNote = "") => {
    const note =
      outcome === "Test impossible" || outcome === "Test refusé par le client"
        ? impossibleReason.trim() || finalComment.trim() || fallbackNote
        : finalComment.trim() || fallbackNote;
    setRepairWorkshopOutcome(selectedRepair.id, outcome, note);
  };

  const saveDiagnosis = () => {
    updateRepair(selectedRepair.id, {
      diagnosticNotes:
        selectedRepair.diagnosticNotes ||
        `Diagnostic confirmé : ${selectedRepair.issue}. Intervention recommandée après contrôle atelier.`,
      diagnosticCause: selectedRepair.diagnosticCause || "Défaillance confirmée après tests fonctionnels.",
      repairability: selectedRepair.repairability || "Oui",
      diagnosticDelay: selectedRepair.diagnosticDelay || "45 à 60 min",
      diagnosticWarranty: selectedRepair.diagnosticWarranty || "6 mois pièces et main d'oeuvre",
      diagnosticRisks: selectedRepair.diagnosticRisks || "Risque faible. Contrôle complet recommandé après réparation.",
      diagnosisChecklist: diagnosisItems,
    });
    // Le passage de statut est une vraie transition métier : on route via le garde central.
    if (selectedRepair.status === "Reçu") changeRepairStatus(selectedRepair.id, "Diagnostic");
    appendRepairHistory(selectedRepair.id, "Diagnostic ajouté", { source: "atelier.diagnostic" });
    toast.success("Diagnostic enregistré dans le dossier central.");
  };

  // Un devis ne peut être créé que depuis un statut compatible (jamais sur un dossier prêt/rendu).
  const canCreateQuote = ["Reçu", "Diagnostic", "En attente"].includes(selectedRepair.status);

  const createQuote = () => {
    if (!canCreateQuote) {
      toast.error("Création de devis impossible à ce stade du dossier.");
      return;
    }
    const linePrice =
      selectedRepair.total || selectedRepair.amount || selectedRepair.selectedPriceSnapshot?.prixClientTotal || 0;
    const id = addQuote({
      customerId: selectedRepair.customerId,
      repairId: selectedRepair.id,
      status: linePrice > 0 ? "Envoyé" : "Brouillon",
      lines:
        linePrice > 0
          ? [
              {
                description: `${selectedRepair.issue} - ${formatDeviceLabel(selectedRepair, "")}`,
                quantity: 1,
                unitPrice: linePrice,
                total: linePrice,
              },
            ]
          : [],
    });
    if (!id) {
      toast.error("Impossible de créer le devis. Ajoutez un tarif client si nécessaire.");
      return;
    }
    if (linePrice > 0) updateRepair(selectedRepair.id, { subStatus: "Devis envoyé" });
    appendRepairHistory(selectedRepair.id, linePrice > 0 ? "Devis envoyé" : "Devis brouillon créé", { quoteId: id });
    toast.success(linePrice > 0 ? "Devis créé et envoyé." : "Devis brouillon créé.");
  };

  // Envoie un message au client SANS jamais modifier le statut du dossier.
  // Le message est toujours publié sur le suivi client (lien public) — c'est réel, pas une simulation.
  // En plus, si un numéro est connu, on tente un vrai SMS via ClickSend.
  const sendClientMessage = (body: string) => {
    const clean = body.trim();
    if (!clean) {
      toast.error("Le message est vide.");
      return;
    }
    addRepairMessage(selectedRepair.id, {
      visibility: "client",
      authorType: "staff",
      authorName: currentUser.name,
      body: clean,
    });
    appendRepairHistory(selectedRepair.id, "Message client publié sur le suivi", { source: "atelier.message" });
    setClientDraft("");

    const phone = normalizeCustomerPhone(
      selectedCustomer?.phone,
      selectedRepair.billingCountry ?? useBeharStore.getState().workshopInfo.country,
    );
    if (!phone) {
      toast.success("Message publié sur le suivi client.");
      return;
    }
    // Tentative d'envoi SMS réel. La fonction lève si ClickSend n'est pas configuré.
    const link = publicUrl ? `\nSuivi : ${publicUrl}` : "";
    sendRealSms(phone, `${clean}${link}`)
      .then(() => {
        appendRepairHistory(selectedRepair.id, "SMS envoyé au client", { source: "atelier.sms" });
        toast.success("SMS envoyé au client.");
      })
      .catch((error: unknown) => {
        const reason = error instanceof Error ? error.message : "SMS indisponible";
        toast.message("Message publié sur le suivi client.", {
          description: `SMS non envoyé : ${reason}. Configurez ClickSend pour l'envoi automatique.`,
        });
      });
  };

  // Demande explicite de validation : action métier volontaire qui met en attente.
  const askClientValidation = () => {
    addRepairMessage(selectedRepair.id, {
      visibility: "client",
      authorType: "system",
      authorName: "Atelier",
      body: "Nous attendons votre validation pour poursuivre la réparation.",
    });
    updateRepair(selectedRepair.id, { subStatus: "En attente validation client" });
    if (selectedRepair.status !== "En attente") changeRepairStatus(selectedRepair.id, "En attente");
    appendRepairHistory(selectedRepair.id, "Validation client demandée", { source: "atelier" });
    toast.success("Demande de validation publiée dans le suivi client.");
  };

  const addInternalNote = () => {
    const clean = noteDraft.trim();
    if (!clean) {
      toast.error("La note est vide.");
      return;
    }
    addRepairMessage(selectedRepair.id, {
      visibility: "internal",
      authorType: "staff",
      authorName: currentUser.name,
      body: `[${noteTag}] ${clean}`,
    });
    toast.success("Note interne enregistrée.");
    setNoteDraft("");
    setNoteTag("Général");
  };

  // Restitution = règlement obligatoire, puis clôture du dossier.
  const markDelivered = () => {
    settlement.open(selectedRepair.id, { closeAfterSubmit: true });
  };

  const uploadPhoto = (category: RepairEvidencePhoto["category"], file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) return;
      const photo: RepairEvidencePhoto = {
        id: `proof_${Date.now()}`,
        category,
        stage: category,
        type: photoCategoryType(category),
        label: `${category} - ${file.name}`,
        comment: "Photo ajoutée depuis le poste atelier.",
        createdAt: getNowIso(),
        createdBy: currentUser.name,
        dataUrl,
      };
      updateRepair(selectedRepair.id, { workshopPhotos: [...(selectedRepair.workshopPhotos ?? []), photo] });
      appendRepairHistory(selectedRepair.id, `Photo ajoutée : ${category}`, { photoId: photo.id });
      toast.success("Photo ajoutée au dossier.");
      // Upload cloud best-effort (Supabase Storage si configuré), sans bloquer l'UI.
      void uploadPhotoToCloud(selectedRepair.id, photo.id, file.name, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const startIntervention = () => {
    updateRepair(selectedRepair.id, {
      status: "En réparation",
      intervention: {
        ...(selectedRepair.intervention ?? {}),
        timerRunning: true,
        timerStartedAt: selectedRepair.intervention?.timerStartedAt ?? getNowIso(),
        currentStep: selectedRepair.intervention?.currentStep ?? "Préparation",
        estimatedMinutes: selectedRepair.intervention?.estimatedMinutes ?? estimateMinutes(selectedRepair),
        progress: Math.max(selectedRepair.intervention?.progress ?? 0, 12),
      },
    });
    appendRepairHistory(selectedRepair.id, "Réparation commencée", { source: "atelier.intervention" });
  };

  const pauseIntervention = () => {
    updateRepair(selectedRepair.id, {
      intervention: {
        ...(selectedRepair.intervention ?? {}),
        timerRunning: false,
        timerPausedAt: getNowIso(),
        timerSeconds: elapsed,
      },
    });
    appendRepairHistory(selectedRepair.id, "Intervention mise en pause", { source: "atelier.intervention" });
  };

  const finishIntervention = () => {
    updateRepair(selectedRepair.id, {
      intervention: {
        ...(selectedRepair.intervention ?? {}),
        timerRunning: false,
        timerFinishedAt: getNowIso(),
        timerSeconds: elapsed,
        progress: 100,
        currentStep: "Contrôle final",
      },
    });
    changeRepairStatus(selectedRepair.id, "Test final");
    appendRepairHistory(selectedRepair.id, "Intervention terminée", { source: "atelier.intervention" });
    toast.success("Dossier passé en test final.");
  };

  const createRepairReport = () => {
    const existing = relatedDocuments.find((document) => document.type === "summary");
    if (existing) {
      toast.info("Le rapport réparation existe déjà.");
      return;
    }
    const docId = addDocument({
      type: "summary",
      title: `Rapport de réparation - ${selectedRepair.number}`,
      customerId: selectedRepair.customerId,
      repairId: selectedRepair.id,
    });
    appendRepairHistory(selectedRepair.id, "Document généré : rapport réparation", { source: "atelier.documents" });
    toast.success("Rapport réparation généré.");
    // Génère le PDF + upload Storage pour que le client le télécharge depuis n'importe quel appareil.
    if (docId) uploadDocumentToCloud("summary", selectedRepair.id, docId);
  };

  const createDiagnosticReport = () => {
    const existing = relatedDocuments.find((document) => document.type === "diagnostic_report");
    if (existing) {
      toast.info("Le rapport diagnostic existe déjà.");
      return;
    }
    const docId = addDocument({
      type: "diagnostic_report",
      title: `Rapport diagnostic - ${selectedRepair.number}`,
      customerId: selectedRepair.customerId,
      repairId: selectedRepair.id,
    });
    appendRepairHistory(selectedRepair.id, "Document généré : rapport diagnostic", { source: "atelier.documents" });
    toast.success("Rapport diagnostic généré.");
    // Génère le PDF + upload Storage pour que le client le télécharge depuis n'importe quel appareil.
    if (docId) uploadDocumentToCloud("diagnostic_report", selectedRepair.id, docId);
  };

  // Mappe un document du dossier vers la cible du moteur d'impression (type + id entité).
  type DocPrintTarget = {
    type: "intake" | "quote" | "invoice" | "payment" | "internal" | "summary" | "sale-receipt" | "diagnostic_report";
    id: string;
  };
  const docPrintTarget = (doc: BeharDocument): DocPrintTarget | null => {
    switch (doc.type) {
      case "intake":
        return { type: "intake", id: doc.repairId ?? selectedRepair.id };
      case "summary":
        return { type: "summary", id: doc.repairId ?? selectedRepair.id };
      case "diagnostic_report":
        return { type: "diagnostic_report", id: doc.repairId ?? selectedRepair.id };
      case "internal":
        return { type: "internal", id: doc.repairId ?? selectedRepair.id };
      case "quote":
        return doc.quoteId ? { type: "quote", id: doc.quoteId } : null;
      case "invoice":
      case "sale-invoice":
        return doc.invoiceId ? { type: "invoice", id: doc.invoiceId } : null;
      case "payment":
        return doc.paymentId ? { type: "payment", id: doc.paymentId } : null;
      case "sale-receipt":
        return doc.saleId ? { type: "sale-receipt", id: doc.saleId } : null;
      default:
        return null;
    }
  };

  // Un document est partageable au client s'il a une cible imprimable et n'est pas la fiche interne.
  const isClientPublishable = (doc: BeharDocument) => doc.type !== "internal" && docPrintTarget(doc) !== null;

  // Télécharge un vrai PDF du document via le moteur d'impression partagé.
  const downloadDoc = (doc: BeharDocument) => {
    const target = docPrintTarget(doc);
    if (!target) return toast.error("Type de document non téléchargeable.");
    downloadDocument(target.type, target.id);
  };

  // Publie (ou republie) le PDF d'un document vers Supabase Storage pour le client (tout appareil).
  const publishDocToClient = async (doc: BeharDocument) => {
    if (!isClientPublishable(doc)) return toast.info("Ce document ne se partage pas au client.");
    const target = docPrintTarget(doc);
    if (target) await uploadDocumentToCloud(target.type, target.id, doc.id);
  };

  // Publie d'un coup tous les documents client du dossier (séquentiel, pour éviter la file unique).
  const publishAllClientDocs = async () => {
    const pending = relatedDocuments.filter(isClientPublishable);
    if (!pending.length) return toast.info("Aucun document à publier pour le client.");
    toast.message(`Publication de ${pending.length} document(s) pour le client…`);
    for (const doc of pending) {
      const target = docPrintTarget(doc);
      if (target) {
        // eslint-disable-next-line no-await-in-loop
        await uploadDocumentToCloud(target.type, target.id, doc.id);
      }
    }
    toast.success("Documents publiés — téléchargeables par le client depuis n'importe quel appareil.");
  };

  // Rapport de réparation = fiche d'intervention interne (PDF réel).
  const downloadRepairReport = () => downloadDocument("internal", selectedRepair.id);

  const createSav = () => {
    const number = `SAV-${new Date().getFullYear()}-${String(repairs.filter((repair) => repair.originalRepairId === selectedRepair.id).length + 1).padStart(3, "0")}`;
    const id = addRepair({
      customerId: selectedRepair.customerId,
      device: selectedRepair.device,
      model: selectedRepair.model,
      issue: `SAV - ${selectedRepair.issue}`,
      status: "SAV",
      amount: 0,
      notes: `Retour SAV lié au dossier ${selectedRepair.number}.`,
      droppedAt: getNowIso(),
      estimatedDoneAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      technician: selectedRepair.technician,
      priority: "Haute",
      originalRepairId: selectedRepair.id,
      sav: {
        savNumber: number,
        originalRepairId: selectedRepair.id,
        originalRepairNumber: selectedRepair.number,
        reason: "Retour client après réparation",
        status: "En cours",
        warrantyRemaining: "À vérifier",
        nextAction: "Contrôler la pièce remplacée",
        createdAt: getNowIso(),
      },
    });
    if (!id) {
      toast.error("Impossible de créer le dossier SAV.");
      return;
    }
    appendRepairHistory(selectedRepair.id, `SAV créé : ${number}`, { savRepairId: id });
    toast.success("Dossier SAV créé et lié à la réparation initiale.");
    openRepair(id, "sav");
  };

  // Actions de l'en-tête, dépendantes du statut réel du dossier.
  // Règle clé : un dossier "Prêt" ne propose jamais devis / diagnostic / mise en attente,
  // et "Envoyer message client" ne change jamais le statut.
  type HeaderAction = { label: string; onClick: () => void; danger?: boolean };
  const headerActions: HeaderAction[] = (() => {
    const id = selectedRepair.id;
    switch (selectedRepair.status) {
      case "Reçu":
        return [
          { label: "Démarrer le diagnostic", onClick: () => changeRepairStatus(id, "Diagnostic") },
          { label: "Envoyer message client", onClick: () => setView("history") },
        ];
      case "Diagnostic":
        return [
          { label: "Créer un devis", onClick: () => setView("diagnostic") },
          { label: "Téléphone prêt", onClick: () => markWorkshopOutcome("Téléphone prêt") },
          { label: "Passer en réparation", onClick: () => changeRepairStatus(id, "En réparation") },
          { label: "Envoyer message client", onClick: () => setView("history") },
        ];
      case "En attente":
      case "Devis accepté":
        return [
          { label: "Passer en réparation", onClick: () => changeRepairStatus(id, "En réparation") },
          { label: "Envoyer message client", onClick: () => setView("history") },
        ];
      case "Devis envoyé":
        return [
          { label: "Envoyer message client", onClick: () => setView("history") },
          { label: "Rapport / documents", onClick: () => setView("documents") },
        ];
      case "En réparation":
        return [
          { label: "Mode intervention", onClick: () => setView("intervention") },
          { label: "Passer au test final", onClick: () => changeRepairStatus(id, "Test final") },
          { label: "Envoyer message client", onClick: () => setView("history") },
        ];
      case "Test final":
        return [
          { label: "Valider le test final", onClick: () => setView("final-test") },
          { label: "Téléphone prêt", onClick: () => markWorkshopOutcome("Téléphone prêt") },
          { label: "Envoyer message client", onClick: () => setView("history") },
        ];
      case "Prêt":
        return [
          { label: "Envoyer message client", onClick: () => sendClientMessage(READY_CLIENT_MESSAGE) },
          { label: "Clôturer / règlement", onClick: markDelivered },
          { label: "Rapport / documents", onClick: () => setView("documents") },
          { label: "Créer SAV", onClick: () => setView("sav") },
        ];
      case "Rendu":
      case "Clôturé":
        return [
          { label: "Imprimer documents", onClick: () => setView("documents") },
          { label: "Créer SAV", onClick: () => setView("sav") },
        ];
      case "Irréparable":
        return [
          { label: "Envoyer message client", onClick: () => setView("history") },
          { label: "Imprimer documents", onClick: () => setView("documents") },
          { label: "Créer SAV", onClick: () => setView("sav") },
        ];
      case "SAV":
        return [
          { label: "Ouvrir le suivi SAV", onClick: () => setView("sav") },
          { label: "Démarrer diagnostic", onClick: () => changeRepairStatus(id, "Diagnostic") },
          { label: "Envoyer message client", onClick: () => setView("history") },
        ];
      default:
        return [{ label: "Envoyer message client", onClick: () => setView("history") }];
    }
  })();

  const currentWorkshop = useBeharStore.getState().workshopSettings ?? useBeharStore.getState().workshopInfo;
  const publicUrl = getCustomerTrackingUrl(selectedRepair, currentWorkshop);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          className="inline-flex items-center gap-2 font-medium text-[#667085] text-sm transition hover:text-[#101828]"
          onClick={() => setView("queue")}
          type="button"
        >
          <ArrowLeft className="size-4" />
          Retour à la file atelier
        </button>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={selectedRepair.status} />
          {selectedRepair.status === "Prêt" && <StatusBadge status={relatedPaidLabel} />}
          {selectedRepair.finalTest?.status && <StatusBadge status={selectedRepair.finalTest.status} />}
          {selectedRepair.subStatus && <StatusBadge status={selectedRepair.subStatus} />}
          <span className={priorityBadge(selectedPriority)}>
            <Circle className="size-2 fill-current" />
            {selectedPriority}
          </span>
        </div>
      </div>

      <Panel className="overflow-hidden">
        <div className="grid gap-5 border-[#E4E7EC] border-b p-5 lg:grid-cols-[1.15fr_1fr_0.85fr]">
          <div className="flex min-w-0 gap-4">
            <RealDeviceVisual
              brand={selectedRepair.brandName}
              className="size-[74px] rounded-[14px] border border-[#E4E7EC]"
              model={selectedRepair.deviceModel || selectedRepair.model}
              type={selectedRepair.deviceType}
            />
            <div className="min-w-0">
              <p className="font-semibold text-[#101828] text-[18px] leading-tight">{selectedRepair.number}</p>
              <h2 className="mt-1 truncate font-semibold text-[#101828] text-[24px] leading-tight tracking-tight">
                {formatDeviceLabel(selectedRepair, selectedRepair.device)}
              </h2>
              <p className="mt-1 text-[#667085] text-sm">{selectedRepair.issue}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <SummaryCell label="Client" value={displayCustomerName(selectedCustomer)} />
            <SummaryCell label="Technicien" value={selectedRepair.technician || "Non assigné"} />
            <SummaryCell label="Déposé depuis" value={relativeSince(selectedRepair.droppedAt)} />
            <SummaryCell label="Promis le" value={formatIsoToDisplay(selectedRepair.estimatedDoneAt)} />
          </div>
          <div className="grid gap-2">
            {headerActions.map((action) => (
              <ActionButton danger={action.danger} key={action.label} label={action.label} onClick={action.onClick} />
            ))}
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto px-4 py-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = view === tab.id;
            return (
              <button
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-[10px] px-3 font-semibold text-[12px] transition",
                  active ? "bg-[#FFFFFF] text-[#167B70]" : "text-[#667085] hover:bg-[#FFFFFF] hover:text-[#101828]",
                )}
                key={tab.id}
                onClick={() => setView(tab.id)}
                type="button"
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </Panel>

      {view === "fiche" && (
        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.9fr_0.72fr]">
          <Panel className="p-5">
            <SectionTitle title="Résumé dossier" />
            <p className="mt-3 text-[#101828] text-sm leading-6">
              {selectedRepair.notes ||
                `Le client signale : ${selectedRepair.issue}. Le dossier suit le cycle atelier central et reste visible au comptoir, au client et au dashboard.`}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoLine label="Diagnostic réel" value={selectedRepair.diagnosticNotes || "À renseigner"} />
              <InfoLine
                label="Motif de blocage"
                value={selectedRepair.blockReason || selectedRepair.subStatus || "Aucun"}
              />
              <InfoLine label="Temps de cycle" value={`Déposé depuis ${relativeSince(selectedRepair.droppedAt)}`} />
              <InfoLine
                label="Paiement externe"
                value={
                  relatedPayments.some((payment) => payment.status === "Payé") ? "Réglé hors Behar Tech" : "Non réglé"
                }
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {canCreateQuote && (
                <PrimaryButton onClick={() => setView("diagnostic")}>Ajouter diagnostic</PrimaryButton>
              )}
              <SecondaryButton onClick={() => setView("parts")}>Ajouter pièce</SecondaryButton>
              {canCreateQuote && <SecondaryButton onClick={createQuote}>Créer devis</SecondaryButton>}
              {!canCreateQuote && (
                <SecondaryButton onClick={() => setView("history")}>Envoyer message client</SecondaryButton>
              )}
            </div>
          </Panel>

          <Panel className="p-5">
            <SectionTitle title="Client & appareil" />
            <div className="mt-4 space-y-3">
              <InfoLine label="Client" value={displayCustomerName(selectedCustomer)} />
              <InfoLine label="Téléphone" value={selectedCustomer?.phone || "Non renseigné"} />
              <InfoLine label="Email" value={selectedCustomer?.email || "Non renseigné"} />
              <InfoLine label="IMEI / série" value={selectedRepair.imei || "Non renseigné"} />
              <InfoLine
                label="Code appareil"
                value={
                  selectedRepair.intakeCondition?.accessCode ? (
                    <button
                      className="font-semibold text-[#167B70]"
                      onClick={() => {
                        setCodeVisible((visible) => !visible);
                        if (!codeVisible)
                          appendRepairHistory(selectedRepair.id, "Code appareil consulté", { source: "atelier.fiche" });
                      }}
                      type="button"
                    >
                      {codeVisible ? selectedRepair.intakeCondition.accessCode : "••••••"}
                    </button>
                  ) : (
                    "Non communiqué"
                  )
                }
              />
              <InfoLine
                label="Accessoires"
                value={selectedRepair.intakeCondition?.accessories?.join(", ") || "Aucun"}
              />
              <InfoLine label="Garantie" value={selectedRepair.diagnosticWarranty || "À définir"} />
            </div>
          </Panel>

          <Panel className="p-5">
            <SectionTitle title="Prochaine action" />
            <div className="mt-4 rounded-[16px] bg-[#FFFFFF] p-4">
              <p className="font-semibold text-[#101828] text-sm">{nextActionLabel(selectedRepair)}</p>
              <p className="mt-1 text-[#667085] text-xs leading-5">
                Le statut, le stock, le suivi client et l'historique seront mis à jour depuis ce dossier central.
              </p>
              <PrimaryButton className="mt-4 w-full" onClick={() => setView(nextActionView(selectedRepair))}>
                Ouvrir
                <ChevronRight className="ml-2 size-4" />
              </PrimaryButton>
            </div>
            <div className="mt-4 space-y-2">
              {selectedRepair.history
                .slice(-4)
                .reverse()
                .map((entry) => (
                  <div className="border-[#E4E7EC] border-l-2 pl-3 text-[#667085] text-xs" key={entry}>
                    {entry}
                  </div>
                ))}
            </div>
          </Panel>
        </div>
      )}

      {view === "diagnostic" && (
        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.85fr]">
          <Panel className="p-5">
            <SectionTitle title="Diagnostic technicien" />
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <DiagnosticCard title="Panne déclarée" value={selectedRepair.issue} />
              <DiagnosticCard
                title="Diagnostic confirmé"
                value={selectedRepair.diagnosticNotes || "À confirmer"}
                tone="green"
              />
              <DiagnosticCard title="Réparation possible" value={selectedRepair.repairability || "Oui"} tone="green" />
            </div>
            <div className="mt-5 overflow-hidden rounded-[16px] border border-[#E4E7EC]">
              <table className="w-full text-sm">
                <thead className="bg-[#FFFFFF] text-left text-[#667085] text-xs">
                  <tr>
                    <th className="px-4 py-3">Test</th>
                    <th className="px-4 py-3">Résultat</th>
                    <th className="px-4 py-3">Commentaire</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnosisItems.map((item) => (
                    <ChecklistRow
                      item={item}
                      key={item.id}
                      onChange={(result) => updateChecklistResult("diagnosis", item.id, result)}
                      onCommentChange={(comment) => updateChecklistComment("diagnosis", item.id, comment)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <TextBox
                label="Risques / remarques"
                value={selectedRepair.diagnosticRisks || "Aucune oxydation visible. Contrôle final recommandé."}
              />
              <TextBox
                label="Commentaires internes"
                value={selectedRepair.repairNotes || "Visible uniquement par l'équipe atelier."}
              />
            </div>
          </Panel>
          <Panel className="p-5">
            <SectionTitle title="Décision" />
            <div className="mt-4 space-y-3">
              <PrimaryButton className="w-full" onClick={createQuote}>
                Créer devis
              </PrimaryButton>
              <PrimaryButton className="w-full" onClick={() => markWorkshopOutcome("Téléphone prêt")}>
                Téléphone prêt
              </PrimaryButton>
              <button
                className="w-full rounded-[12px] bg-[#FFFFFF] px-4 py-3 font-semibold text-[#167B70] text-sm"
                onClick={() => markWorkshopOutcome("Test non applicable")}
                type="button"
              >
                Test non applicable
              </button>
              <button
                className="w-full rounded-[12px] bg-[#FFFFFF] px-4 py-3 font-semibold text-[#167B70] text-sm"
                onClick={askClientValidation}
                type="button"
              >
                Demander validation client
              </button>
              <button
                className="w-full rounded-[12px] bg-[#FFFFFF] px-4 py-3 font-semibold text-[#936100] text-sm"
                onClick={() => {
                  setRepairWorkshopOutcome(selectedRepair.id, "Pièce en attente", finalComment);
                }}
                type="button"
              >
                Pièce en attente
              </button>
              <button
                className="w-full rounded-[12px] border border-[#F2D4D1] px-4 py-3 font-semibold text-[#B42318] text-sm"
                onClick={() => {
                  setRepairWorkshopOutcome(selectedRepair.id, "Irréparable", finalComment);
                }}
                type="button"
              >
                Marquer irréparable
              </button>
              <SecondaryButton className="w-full" onClick={saveDiagnosis}>
                Enregistrer le diagnostic
              </SecondaryButton>
            </div>
          </Panel>
        </div>
      )}

      {view === "parts" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between border-[#E4E7EC] border-b p-5 gap-3">
              <div>
                <SectionTitle title="Pièces utilisées" />
                <span className="text-[#667085] text-xs font-normal mt-0.5 block">
                  Tapez une référence, scannez un QR code ou cherchez par nom/modèle compatible.
                </span>
              </div>
              <SecondaryButton className="h-9 text-xs px-3" onClick={() => setShowAllStock(!showAllStock)}>
                {showAllStock ? "Voir uniquement compatibles" : "Voir tout le stock"}
              </SecondaryButton>
            </div>
            <div className="border-[#E4E7EC] border-b bg-[#FFFFFF] p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <div className="relative">
                  <label className="sr-only" htmlFor="atelier-part-reference">
                    Scanner ou saisir une référence
                  </label>
                  <QrCode className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-[#667085]" />
                  <input
                    id="atelier-part-reference"
                    className="h-11 w-full rounded-[12px] border border-[#E4E7EC] bg-white pr-3 pl-10 text-[#101828] text-sm outline-none transition placeholder:text-[#98A2B3] focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10"
                    onChange={(event) => setPartSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") selectPartFromSearch();
                    }}
                    placeholder="Scanner ou saisir une référence"
                    value={partSearch}
                  />
                </div>
                <PrimaryButton className="h-11" onClick={selectPartFromSearch}>
                  <Search className="size-4" />
                  Rechercher
                </PrimaryButton>
                <SecondaryButton
                  className="h-11"
                  onClick={() => {
                    setPartSearch("");
                    setFocusedStockItemId("");
                  }}
                >
                  Réinitialiser
                </SecondaryButton>
              </div>
              <p className="mt-2 text-[#667085] text-xs">
                Un scanner douchette peut saisir directement l'URL QR ou la référence lue sur l'étiquette.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-[#FFFFFF] text-left text-[#667085] text-xs">
                  <tr>
                    <th className="px-4 py-3">Pièce</th>
                    <th className="px-4 py-3">Référence</th>
                    <th className="px-4 py-3">Modèle</th>
                    <th className="px-4 py-3">Catégorie</th>
                    <th className="px-4 py-3">Stock</th>
                    {canViewSupplier && <th className="px-4 py-3">Fournisseur</th>}
                    {canViewPurchasePrice && <th className="px-4 py-3">Prix moyen</th>}
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {partCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-8 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Package className="size-8 text-[#98A2B3]" />
                          <p className="text-[#667085] text-sm font-medium">
                            Aucune pièce trouvée pour ce dossier ou cette recherche.
                          </p>
                          <SecondaryButton className="h-9 text-xs px-4 mt-1" onClick={() => setShowAllStock(true)}>
                            Voir tout le stock
                          </SecondaryButton>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    partCandidates.map((item) => {
                      const selectedPart = selectedRepair.parts.find((part) => part.stockItemId === item.id);
                      return (
                        <tr
                          className={cn(
                            "cursor-pointer border-[#E4E7EC] border-t transition hover:bg-[#F9FAFB]",
                            focusedStockItem?.id === item.id && "bg-[#F9FAFB]",
                          )}
                          key={item.id}
                          onClick={() => setFocusedStockItemId(item.id)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <RealProductVisual
                                category={item.categoryName}
                                className="size-10 rounded-[10px] border border-[#E4E7EC]"
                                name={item.displayName || item.name}
                              />
                              <div>
                                <p className="font-semibold text-[#101828]">{item.displayName || item.name}</p>
                                <p className="text-[#667085] text-xs">{item.quality || "Qualité à compléter"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[#667085]">
                            <PartReferenceLink reference={item.sku || item.reference} />
                          </td>
                          <td className="px-4 py-3 text-[#667085]">
                            {item.compatibleModels.join(" / ") || "Compatibilité à vérifier"}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={item.categoryName || "En stock"} />
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                item.stock <= item.threshold ? "font-semibold text-[#B42318]" : "text-[#101828]"
                              }
                            >
                              {item.stock}
                            </span>
                          </td>
                          {canViewSupplier && (
                            <td className="px-4 py-3 text-[#667085]">{item.primarySupplier || item.supplier}</td>
                          )}
                          {canViewPurchasePrice && (
                            <td className="px-4 py-3">{formatEuro(item.averagePurchasePrice ?? item.purchasePrice)}</td>
                          )}
                          <td className="px-4 py-3">
                            {selectedPart?.confirmed ? (
                              <StatusBadge status="Pièce utilisée" />
                            ) : selectedPart ? (
                              <PrimaryButton
                                className="h-9 px-3"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  useStockItemInRepair(item);
                                }}
                              >
                                Utiliser
                              </PrimaryButton>
                            ) : (
                              <PrimaryButton
                                className="h-9 px-3"
                                disabled={!canUseStockItem || item.stock <= 0}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  useStockItemInRepair(item);
                                }}
                              >
                                Utiliser
                              </PrimaryButton>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel className="p-5">
            <SectionTitle title="Pièce sélectionnée" />
            {focusedStockItem ? (
              <div className="mt-4 rounded-[16px] border border-[#E4E7EC] bg-white p-4">
                <div className="flex items-start gap-3">
                  <RealProductVisual
                    category={focusedStockItem.categoryName}
                    className="size-12 rounded-[12px] border border-[#E4E7EC]"
                    name={focusedStockItem.displayName || focusedStockItem.name}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-[#101828] text-sm">
                      {focusedStockItem.displayName || focusedStockItem.name}
                    </p>
                    <div className="mt-1 text-[#667085] text-xs">
                      <PartReferenceLink reference={focusedStockItem.sku || focusedStockItem.reference} />
                    </div>
                  </div>
                </div>
                <dl className="mt-4 grid gap-2">
                  {[
                    ["Stock disponible", String(focusedStockItem.stock)],
                    [
                      "Modèle compatible",
                      focusedStockItem.compatibleModels.length
                        ? focusedStockItem.compatibleModels.join(" / ")
                        : "Compatibilité à vérifier",
                    ],
                    ["Catégorie", focusedStockItem.categoryName || focusedStockItem.category || "Non défini"],
                    ...(canViewPurchasePrice
                      ? [
                          [
                            "Prix achat moyen",
                            formatEuro(focusedStockItem.averagePurchasePrice ?? focusedStockItem.purchasePrice),
                          ],
                          [
                            "Dernier prix achat",
                            formatEuro(focusedStockItem.lastPurchasePrice ?? focusedStockItem.purchasePrice),
                          ],
                        ]
                      : []),
                    ...(canViewSupplier
                      ? [
                          [
                            "Fournisseur",
                            focusedStockItem.primarySupplier || focusedStockItem.supplier || "Non renseigné",
                          ],
                          ["Facture origine", focusedOriginInvoice?.invoiceNumber || "Non renseignée"],
                        ]
                      : []),
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-start justify-between gap-3 rounded-[10px] bg-[#F9FAFB] px-3 py-2"
                    >
                      <dt className="text-[#667085] text-xs">{label}</dt>
                      <dd className="max-w-[58%] text-right font-semibold text-[#101828] text-xs">{value}</dd>
                    </div>
                  ))}
                </dl>
                {focusedOriginLine && canViewSupplier && (
                  <p className="mt-3 text-[#667085] text-xs">
                    Origine : {focusedOriginLine.supplierName} · {focusedOriginLine.quantityPurchased} achetée(s)
                  </p>
                )}
                <div className="mt-4 grid gap-2">
                  <PrimaryButton
                    disabled={!canUseStockItem || focusedStockItem.stock <= 0}
                    onClick={() => useStockItemInRepair(focusedStockItem)}
                  >
                    <Package className="size-4" />
                    Utiliser dans la réparation
                  </PrimaryButton>
                  <SecondaryButton
                    onClick={() => {
                      window.location.href = `/dashboard/stock?ref=${encodeURIComponent(stockPrimaryReference(focusedStockItem))}`;
                    }}
                  >
                    Voir fiche pièce
                  </SecondaryButton>
                  {canViewSupplier && focusedOriginInvoice?.originalFileUrl && (
                    <SecondaryButton
                      onClick={() => window.open(focusedOriginInvoice.originalFileUrl, "_blank", "noopener,noreferrer")}
                    >
                      <FileText className="size-4" />
                      Voir facture
                    </SecondaryButton>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-[14px] bg-[#F9FAFB] p-4 text-[#667085] text-sm">
                Cherchez ou scannez une référence pour afficher la traçabilité de la pièce.
              </p>
            )}

            <div className="mt-6 border-[#E4E7EC] border-t pt-5">
              <SectionTitle title={`Pièces du dossier (${selectedRepair.parts.length})`} />
              <div className="mt-4 space-y-3">
                {selectedRepair.parts.map((part) => (
                  <div className="rounded-[14px] border border-[#E4E7EC] p-3" key={part.stockItemId}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#101828] text-sm">{part.name}</p>
                        <div className="text-[#667085] text-xs">
                          <PartReferenceLink reference={part.sku || part.reference} />
                        </div>
                      </div>
                      <button
                        className="text-[#B42318]"
                        onClick={() => removePartFromRepair(selectedRepair.id, part.stockItemId)}
                        type="button"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <StatusBadge status={part.confirmed ? "Pièce utilisée" : "En attente pièce"} />
                      <span className="font-semibold">{formatEuro(part.salePrice * part.quantity)}</span>
                    </div>
                  </div>
                ))}
                {!selectedRepair.parts.length && (
                  <p className="text-[#667085] text-sm">Aucune pièce utilisée pour ce dossier.</p>
                )}
              </div>
              {canViewMoney && (
                <div className="mt-5 rounded-[16px] bg-[#FFFFFF] p-4">
                  <p className="text-[#667085] text-xs">Marge brute pièces</p>
                  <p className="mt-1 font-semibold text-[#167B70] text-[24px]">
                    {formatEuro(
                      selectedRepair.parts.reduce(
                        (sum, part) => sum + (part.salePrice - part.purchasePrice) * part.quantity,
                        0,
                      ),
                    )}
                  </p>
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}

      {view === "intervention" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <Panel className="p-5">
            <SectionTitle title="Mode intervention" />
            <div className="mt-5 rounded-[18px] border border-[#E4E7EC] bg-[#FFFFFF] p-5">
              <p className="text-[#667085] text-sm">Temps de main-d'oeuvre réel optionnel</p>
              <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="font-semibold text-[#101828] text-[48px] leading-none tracking-tight">
                    {formatSeconds(elapsed)}
                  </p>
                  <p className="mt-2 text-[#167B70] text-sm">
                    {selectedRepair.intervention?.timerRunning ? "En cours" : "Timer optionnel"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <SecondaryButton onClick={startIntervention}>
                    <Play className="mr-2 size-4" />
                    Démarrer
                  </SecondaryButton>
                  <SecondaryButton onClick={pauseIntervention}>
                    <Pause className="mr-2 size-4" />
                    Pause
                  </SecondaryButton>
                  <PrimaryButton onClick={finishIntervention}>
                    <Check className="mr-2 size-4" />
                    Terminer
                  </PrimaryButton>
                </div>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <ProgressPanel repair={selectedRepair} />
              <Panel className="p-4">
                <SectionTitle title="Pièces utilisées" small />
                <div className="mt-3 space-y-2">
                  {selectedRepair.parts
                    .filter((part) => part.confirmed)
                    .map((part) => (
                      <p className="text-[#101828] text-sm" key={part.stockItemId}>
                        {part.name} x{part.quantity}
                      </p>
                    ))}
                  {!selectedRepair.parts.some((part) => part.confirmed) && (
                    <p className="text-[#667085] text-sm">Aucune pièce utilisée.</p>
                  )}
                </div>
              </Panel>
              <Panel className="p-4">
                <SectionTitle title="Notes techniques" small />
                <p className="mt-3 rounded-[12px] bg-[#FFFFFF] p-3 text-[#667085] text-sm">
                  {selectedRepair.intervention?.notes ||
                    selectedRepair.repairNotes ||
                    "Connecteurs à manipuler avec précaution."}
                </p>
              </Panel>
            </div>
          </Panel>
          <Panel className="p-5">
            <SectionTitle title="Actions rapides" />
            <div className="mt-4 space-y-2">
              <ActionButton label="Passer au test final" onClick={finishIntervention} />
              <ActionButton label="Ajouter une pièce" onClick={() => setView("parts")} />
              <ActionButton label="Ajouter une photo" onClick={() => setView("photos")} />
              <ActionButton
                label="Suspendre intervention"
                danger
                onClick={() => {
                  updateRepair(selectedRepair.id, {
                    subStatus: "Client injoignable",
                    intervention: {
                      ...(selectedRepair.intervention ?? {}),
                      timerRunning: false,
                      suspendedReason: "Intervention suspendue",
                    },
                  });
                  changeRepairStatus(selectedRepair.id, "En attente");
                  appendRepairHistory(selectedRepair.id, "Intervention suspendue : motif requis");
                }}
              />
            </div>
          </Panel>
        </div>
      )}

      {view === "photos" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Panel className="p-5">
            <SectionTitle title="Photos & anti-litige" />
            <div className="mt-4 space-y-4">
              {evidenceCategories.map((category) => {
                const photos = (selectedRepair.workshopPhotos ?? []).filter((photo) => photo.category === category);
                return (
                  <div className="rounded-[16px] border border-[#E4E7EC] p-4" key={category}>
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-[#101828] text-sm">{category}</p>
                      <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-[#167B70] text-xs">
                        <ImagePlus className="size-4" />
                        Ajouter photo
                        <input
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            uploadPhoto(category, event.target.files?.[0]);
                            event.target.value = "";
                          }}
                          type="file"
                        />
                      </label>
                    </div>
                    <div className="mt-3 flex gap-3 overflow-x-auto">
                      {photos.map((photo) =>
                        photo.dataUrl ? (
                          // biome-ignore lint/performance/noImgElement: photo locale en data URL, pas d'optimisation Next/Image possible
                          <img
                            alt={photo.label}
                            className="size-24 shrink-0 rounded-[12px] border border-[#E4E7EC] object-cover"
                            key={photo.id}
                            src={photo.dataUrl}
                          />
                        ) : (
                          <div
                            className="grid size-24 shrink-0 place-items-center rounded-[12px] border border-[#E4E7EC] bg-[#FFFFFF] text-center text-[#667085] text-[11px]"
                            key={photo.id}
                          >
                            <Camera className="mb-1 size-5 text-[#2A9D8F]" />
                            {photo.label}
                          </div>
                        ),
                      )}
                      {!photos.length && (
                        <div className="rounded-[12px] border border-dashed border-[#E4E7EC] px-4 py-8 text-[#98A2B3] text-sm">
                          Aucune photo
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
          <Panel className="p-5">
            <SectionTitle title="État d'entrée" />
            <div className="mt-4 space-y-3">
              <InfoLine
                label="Écran / affichage"
                value={selectedRepair.intakeCondition?.screenState || "Non renseigné"}
              />
              <InfoLine
                label="Châssis / bordures"
                value={selectedRepair.intakeCondition?.frameState || "Non renseigné"}
              />
              <InfoLine label="Allumage" value={selectedRepair.intakeCondition?.powerState || "Non renseigné"} />
              <InfoLine
                label="Oxydation"
                value={
                  selectedRepair.intakeCondition?.visibleDefects?.toLowerCase().includes("oxyd")
                    ? "À signaler"
                    : "Non signalée"
                }
              />
              <InfoLine
                label="Accessoires"
                value={selectedRepair.intakeCondition?.accessories?.join(", ") || "Aucun"}
              />
            </div>
            <div className="mt-5 rounded-[16px] bg-[#FFFFFF] p-4">
              <p className="font-semibold text-[#167B70] text-sm">Accord client enregistré</p>
              <p className="mt-1 text-[#667085] text-xs">
                Photos horodatées, signature et document de prise en charge liés au dossier.
              </p>
            </div>
          </Panel>
        </div>
      )}

      {view === "final-test" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Panel className="p-5">
            <SectionTitle title="Test final" />
            <div className="mt-4 overflow-hidden rounded-[16px] border border-[#E4E7EC]">
              <table className="w-full text-sm">
                <thead className="bg-[#FFFFFF] text-left text-[#667085] text-xs">
                  <tr>
                    <th className="px-4 py-3">Point</th>
                    <th className="px-4 py-3">Résultat</th>
                    <th className="px-4 py-3">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {finalItems.map((item) => (
                    <ChecklistRow
                      compact
                      item={item}
                      key={item.id}
                      onChange={(result) => updateChecklistResult("final", item.id, result)}
                      onCommentChange={(comment) => updateChecklistComment("final", item.id, comment)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <label className="mt-4 block">
              <span className="font-medium text-[#101828] text-sm">Remarque finale</span>
              <textarea
                className="mt-2 min-h-24 w-full rounded-[12px] border border-[#E4E7EC] bg-white p-3 text-sm outline-none focus:border-[#2A9D8F]/55 focus:ring-4 focus:ring-[#2A9D8F]/10"
                value={finalComment}
                onChange={(event) => setFinalComment(event.target.value)}
                placeholder="Remplacement effectué. Toutes les fonctions vérifiées."
              />
            </label>
          </Panel>
          <Panel className="overflow-hidden">
            <div className="p-5">
              <SectionTitle title="Validation qualité" />
              <div className="mt-5 rounded-[18px] bg-[#FFFFFF] p-5 text-center">
                <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#2A9D8F] text-white">
                  <ShieldCheck className="size-8" />
                </span>
                <p className="mt-4 font-semibold text-[#101828]">Contrôle qualité flexible.</p>
                <p className="mt-1 text-[#667085] text-sm">
                  OK, défaut, non applicable ou non testé avec note : le dossier peut refléter la réalité terrain.
                </p>
              </div>
              <PrimaryButton
                className="mt-5 w-full"
                onClick={() => validateRepairFinalTest(selectedRepair.id, finalItems, finalComment)}
              >
                Test final validé
              </PrimaryButton>
              <SecondaryButton className="mt-3 w-full" onClick={() => markWorkshopOutcome("Téléphone prêt")}>
                Téléphone prêt
              </SecondaryButton>
              <SecondaryButton className="mt-3 w-full" onClick={() => markWorkshopOutcome("Test non applicable")}>
                Test non applicable
              </SecondaryButton>
              <div className="mt-5 rounded-[16px] border border-[#E4E7EC] p-4">
                <label className="font-medium text-[#101828] text-sm">Exception atelier</label>
                <textarea
                  className="mt-2 min-h-20 w-full rounded-[12px] border border-[#E4E7EC] p-3 text-sm outline-none"
                  value={impossibleReason}
                  onChange={(event) => setImpossibleReason(event.target.value)}
                  placeholder="Raison obligatoire pour test impossible ou refusé"
                />
                <SecondaryButton
                  className="mt-3 w-full"
                  onClick={() => markRepairTestImpossible(selectedRepair.id, impossibleReason)}
                >
                  Test impossible
                </SecondaryButton>
                <SecondaryButton
                  className="mt-3 w-full"
                  onClick={() => markWorkshopOutcome("Test refusé par le client")}
                >
                  Test refusé par le client
                </SecondaryButton>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {view === "history" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_390px]">
          <Panel className="p-5">
            <SectionTitle title="Historique automatique" />
            <div className="mt-5 space-y-3">
              {relatedAudit.slice(0, 10).map((entry) => (
                <div
                  className="grid gap-3 rounded-[16px] border border-[#E4E7EC] p-4 md:grid-cols-[140px_1fr_170px]"
                  key={entry.id}
                >
                  <p className="text-[#667085] text-xs">{entry.createdAt}</p>
                  <div>
                    <p className="font-semibold text-[#101828] text-sm">{entry.action}</p>
                    <p className="mt-1 text-[#667085] text-sm">{entry.message}</p>
                  </div>
                  <p className="text-[#667085] text-xs">
                    {entry.actorName} · {entry.actorRole}
                  </p>
                </div>
              ))}
              {!relatedAudit.length &&
                selectedRepair.history.map((entry, index) => (
                  <div
                    className="rounded-[16px] border border-[#E4E7EC] p-4 text-[#101828] text-sm"
                    key={`${entry}-${index}`}
                  >
                    {entry}
                  </div>
                ))}
            </div>
          </Panel>
          <div className="space-y-4">
            <Panel className="p-5">
              <SectionTitle title="Notes internes" />
              <p className="mt-1 text-[#98A2B3] text-xs">
                Visible uniquement par l'équipe atelier, jamais par le client.
              </p>
              <div className="mt-4 space-y-3">
                {(selectedRepair.messages ?? [])
                  .filter((message) => message.visibility === "internal")
                  .map((message) => (
                    <div className="rounded-[14px] bg-[#FFFFFF] p-3" key={message.id}>
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-[#101828] text-sm">{message.authorName}</p>
                        <p className="text-[#98A2B3] text-xs">{formatIsoToDisplay(message.createdAt)}</p>
                      </div>
                      <p className="mt-1 text-[#667085] text-sm">{message.body}</p>
                    </div>
                  ))}
                {!(selectedRepair.messages ?? []).some((message) => message.visibility === "internal") && (
                  <p className="text-[#98A2B3] text-sm">Aucune note interne pour ce dossier.</p>
                )}
              </div>
              <div className="mt-4 space-y-2 rounded-[14px] border border-[#E4E7EC] p-3">
                <div className="flex flex-wrap gap-1.5">
                  {noteTags.map((tag) => (
                    <button
                      className={cn(
                        "rounded-full px-2.5 py-1 font-semibold text-[11px] transition",
                        noteTag === tag
                          ? "bg-[#FFFFFF] text-[#167B70]"
                          : "bg-[#FFFFFF] text-[#667085] hover:text-[#101828]",
                      )}
                      key={tag}
                      onClick={() => setNoteTag(tag)}
                      type="button"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <textarea
                  className="min-h-20 w-full rounded-[12px] border border-[#E4E7EC] bg-white p-3 text-sm outline-none focus:border-[#2A9D8F]/55 focus:ring-4 focus:ring-[#2A9D8F]/10"
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="Nouvelle note interne…"
                  value={noteDraft}
                />
                <div className="flex gap-2">
                  <PrimaryButton className="flex-1" onClick={addInternalNote}>
                    <Plus className="mr-2 size-4" />
                    Enregistrer
                  </PrimaryButton>
                  {noteDraft.trim() && <SecondaryButton onClick={() => setNoteDraft("")}>Annuler</SecondaryButton>}
                </div>
              </div>
            </Panel>
            <Panel className="p-5">
              <SectionTitle title="Messages client" />
              <div className="mt-4 space-y-3">
                {(selectedRepair.messages ?? [])
                  .filter((message) => message.visibility === "client")
                  .slice(-5)
                  .map((message) => (
                    <div className="rounded-[14px] bg-[#FFFFFF] p-3" key={message.id}>
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-[#101828] text-sm">{message.authorName}</p>
                        <span className="rounded-full bg-[#FFFFFF] px-2 py-0.5 font-semibold text-[#167B70] text-[10px]">
                          Suivi client
                        </span>
                      </div>
                      <p className="mt-1 text-[#667085] text-sm">{message.body}</p>
                      <p className="mt-1 text-[#98A2B3] text-[10px]">{formatIsoToDisplay(message.createdAt)}</p>
                    </div>
                  ))}
                {!(selectedRepair.messages ?? []).some((message) => message.visibility === "client") && (
                  <p className="text-[#98A2B3] text-sm">Aucun message client pour le moment.</p>
                )}
              </div>
              <div className="mt-4 space-y-2 rounded-[14px] border border-[#E4E7EC] p-3">
                <div className="flex flex-wrap gap-1.5">
                  {clientMessageTemplates.map((template) => (
                    <button
                      className="rounded-full bg-[#FFFFFF] px-2.5 py-1 text-[#667085] text-[11px] transition hover:text-[#101828]"
                      key={template}
                      onClick={() => setClientDraft(template)}
                      type="button"
                    >
                      {template}
                    </button>
                  ))}
                </div>
                <textarea
                  className="min-h-20 w-full rounded-[12px] border border-[#E4E7EC] bg-white p-3 text-sm outline-none focus:border-[#2A9D8F]/55 focus:ring-4 focus:ring-[#2A9D8F]/10"
                  onChange={(event) => setClientDraft(event.target.value)}
                  placeholder="Message au client…"
                  value={clientDraft}
                />
                <PrimaryButton className="w-full" onClick={() => sendClientMessage(clientDraft)}>
                  <Send className="mr-2 size-4" />
                  Envoyer au client
                </PrimaryButton>
                <p className="text-[#98A2B3] text-[11px]">
                  Le message est publié sur le suivi client et envoyé par SMS si un numéro est connu. Le statut du
                  dossier reste inchangé.
                </p>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {view === "documents" && (
        <div className="grid gap-4 lg:grid-cols-[390px_1fr]">
          <Panel className="p-5">
            <SectionTitle title={`Documents (${relatedDocuments.length})`} />
            <div className="mt-4 space-y-2">
              {relatedDocuments.map((document) => (
                <div className="rounded-[14px] border border-[#E4E7EC] p-3" key={document.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-[#101828] text-sm">{document.title}</p>
                    {document.fileUrl && (
                      <span className="shrink-0 rounded-full bg-[#FFFFFF] px-2 py-0.5 font-semibold text-[#167B70] text-[10px]">
                        Client
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[#667085] text-xs">
                    {document.type} · {document.createdAt}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#E4E7EC] px-2.5 py-1 font-semibold text-[#167B70] text-xs hover:bg-[#FFFFFF]"
                      onClick={() => downloadDoc(document)}
                      type="button"
                    >
                      <Printer className="size-3.5" />
                      Télécharger PDF
                    </button>
                    {isClientPublishable(document) && (
                      <button
                        className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#E4E7EC] px-2.5 py-1 font-semibold text-[#667085] text-xs hover:bg-[#FFFFFF]"
                        onClick={() => void publishDocToClient(document)}
                        type="button"
                      >
                        <Send className="size-3.5" />
                        {document.fileUrl ? "Republier" : "Publier pour le client"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {relatedDocuments.some(isClientPublishable) && (
                <SecondaryButton className="mt-3 w-full" onClick={() => void publishAllClientDocs()}>
                  <Send className="mr-2 size-4" />
                  Publier tous les documents pour le client
                </SecondaryButton>
              )}
              <PrimaryButton className="mt-2 w-full" onClick={createRepairReport}>
                Générer rapport réparation
              </PrimaryButton>
              <SecondaryButton className="mt-2 w-full text-xs font-semibold" onClick={createDiagnosticReport}>
                Générer rapport diagnostic
              </SecondaryButton>
            </div>
          </Panel>
          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between border-[#E4E7EC] border-b p-5">
              <SectionTitle title="Aperçu rapport réparation" />
              <div className="flex gap-2">
                <SecondaryButton className="h-9 px-3" onClick={downloadRepairReport}>
                  <Printer className="mr-2 size-4" />
                  Télécharger
                </SecondaryButton>
                <PrimaryButton
                  className="h-9 px-3"
                  onClick={() =>
                    sendClientMessage(
                      `Votre rapport de réparation pour ${formatDeviceLabel(selectedRepair, selectedRepair.device)} est disponible.`,
                    )
                  }
                >
                  <Send className="mr-2 size-4" />
                  Envoyer au client
                </PrimaryButton>
              </div>
            </div>
            <div className="p-6">
              <div className="mx-auto max-w-[720px] rounded-[8px] border border-[#D0D5DD] bg-white p-8 shadow-[0_12px_30px_rgba(16,24,40,0.08)]">
                <div className="flex items-start justify-between border-[#E4E7EC] border-b pb-5">
                  <p className="font-bold text-[#101828] text-lg">BEHAR · TECH PRO</p>
                  <div className="text-right">
                    <p className="font-semibold text-[#101828]">RAPPORT DE RÉPARATION</p>
                    <p className="text-[#667085] text-sm">{selectedRepair.number}</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-6 text-sm md:grid-cols-2">
                  <InfoLine label="Client" value={displayCustomerName(selectedCustomer)} />
                  <InfoLine label="Appareil" value={formatDeviceLabel(selectedRepair, selectedRepair.device)} />
                  <InfoLine
                    label="Intervention"
                    value={selectedRepair.recommendedIntervention || selectedRepair.issue}
                  />
                  <InfoLine
                    label="Test final"
                    value={
                      selectedRepair.finalTest?.status ||
                      (selectedRepair.finalTest?.validatedAt ? "Test final validé" : "Non renseigné")
                    }
                  />
                </div>
                <p className="mt-8 text-[#667085] text-sm">
                  Les documents client n'affichent pas les prix d'achat, marge, fournisseur ou notes internes sensibles.
                </p>
              </div>
              <div className="mt-5 rounded-[16px] border border-[#E4E7EC] bg-white p-4">
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setSelectedQrRepairId(selectedRepair.id)}
                >
                  <QrCode className="size-10 text-[#101828] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#101828] text-sm">Lien de suivi client</p>
                    <p className="truncate text-[#667085] text-xs">{publicUrl || "Générer le lien"}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 border-t border-[#FFFFFF] pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedQrRepairId(selectedRepair.id)}
                    className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-[#E4E7EC] bg-white font-semibold text-[#101828] text-xs transition hover:bg-[#FFFFFF]"
                  >
                    Afficher QR
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!publicUrl) return;
                      try {
                        await navigator.clipboard.writeText(publicUrl);
                        toast.success("Lien de suivi copié");
                      } catch {
                        toast.error("Impossible de copier");
                      }
                    }}
                    className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-[#E4E7EC] bg-white font-semibold text-[#101828] text-xs transition hover:bg-[#FFFFFF]"
                  >
                    Copier lien
                  </button>
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-[#2A9D8F] font-semibold text-white text-xs transition hover:bg-[#238579]"
                  >
                    Ouvrir
                  </a>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {view === "sav" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Panel className="p-5">
            <SectionTitle title="SAV & retours liés" />
            <div className="mt-4 space-y-3">
              {repairs
                .filter(
                  (repair) =>
                    repair.originalRepairId === selectedRepair.id || repair.id === selectedRepair.originalRepairId,
                )
                .map((repair) => (
                  <div className="rounded-[16px] border border-[#E4E7EC] p-4" key={repair.id}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-[#101828]">{repair.sav?.savNumber || repair.number}</p>
                        <p className="mt-1 text-[#667085] text-sm">{repair.issue}</p>
                      </div>
                      <StatusBadge status={repair.sav?.status || repair.status} />
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <InfoLine
                        label="Réparation initiale"
                        value={repair.sav?.originalRepairNumber || selectedRepair.number}
                      />
                      <InfoLine label="Décision" value={repair.sav?.decision || "À décider"} />
                      <InfoLine label="Prochaine action" value={repair.sav?.nextAction || "Diagnostic SAV"} />
                    </div>
                  </div>
                ))}
              {!repairs.some(
                (repair) =>
                  repair.originalRepairId === selectedRepair.id || repair.id === selectedRepair.originalRepairId,
              ) && <p className="text-[#667085] text-sm">Aucun SAV lié à ce dossier.</p>}
            </div>
          </Panel>
          <Panel className="p-5">
            <SectionTitle title="Créer un retour" />
            <p className="mt-3 text-[#667085] text-sm leading-6">
              Un SAV crée un nouveau dossier lié à la réparation initiale. L'ancien dossier n'est jamais écrasé.
            </p>
            <PrimaryButton className="mt-5 w-full" onClick={createSav}>
              <RotateCcw className="mr-2 size-4" />
              Créer dossier SAV
            </PrimaryButton>
          </Panel>
        </div>
      )}
      {selectedQrRepairId && (
        <TrackingQrModal
          isOpen={Boolean(selectedQrRepairId)}
          onClose={() => setSelectedQrRepairId(null)}
          repairId={selectedQrRepairId}
        />
      )}
      <SettlementModal
        draft={settlement.draft}
        invoice={settlement.invoice}
        isOpen={settlement.isOpen}
        onClose={settlement.close}
        onDraftChange={settlement.setDraft}
        onSubmit={settlement.submit}
        total={settlement.total}
      />
    </div>
  );
}

function RepairQueueCard({
  repair,
  customer,
  onOpen,
}: Readonly<{ repair: Repair; customer?: Customer; onOpen: () => void }>) {
  const priority = priorityForRepair(repair);
  const readyLabel = repairReadyStatusLabel(repair.status, repair.paymentStatus);
  return (
    <button
      className="w-full rounded-[15px] border border-[#E4E7EC] bg-white p-3 text-left shadow-[0_1px_2px_rgba(16,24,40,0.035)] transition hover:-translate-y-0.5 hover:border-[#2A9D8F]/35 hover:shadow-[0_10px_24px_rgba(16,24,40,0.07)]"
      onClick={onOpen}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-semibold text-[#101828] text-xs">{repair.number}</span>
        <span className="truncate text-[#667085] text-xs">{displayCustomerName(customer)}</span>
      </div>
      <div className="mt-3 flex gap-3">
        <RealDeviceVisual
          brand={repair.brandName}
          className="size-11 rounded-[10px] border border-[#E4E7EC]"
          model={repair.deviceModel || repair.model}
          type={repair.deviceType}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[#101828] text-sm">{formatDeviceLabel(repair, repair.device)}</p>
          <p className="mt-0.5 line-clamp-2 text-[#101828] text-xs">{repair.issue}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className={priorityBadge(priority)}>
          <Circle className="size-2 fill-current" />
          {priority}
        </span>
        {repair.status === "Prêt" && <StatusBadge status={readyLabel} />}
        {repair.finalTest?.status && <StatusBadge status={repair.finalTest.status} />}
        {repair.subStatus && <StatusBadge status={repair.subStatus} />}
        {isOverdue(repair) && <StatusBadge status="En retard" />}
      </div>
      <div className="mt-3 flex items-center justify-between text-[#667085] text-xs">
        <span>{repair.technician || "Atelier"}</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" />
          {relativeSince(repair.droppedAt)}
        </span>
      </div>
      <div className="mt-3 rounded-[10px] bg-[#FFFFFF] px-3 py-2 font-semibold text-[#167B70] text-xs">
        Promis : {formatIsoToDisplay(repair.estimatedDoneAt)}
      </div>
      {repair.blockReason && <p className="mt-2 text-[#B42318] text-xs">{repair.blockReason}</p>}
    </button>
  );
}

function WorkshopMetric({
  label,
  value,
  helper,
  tone = "neutral",
}: Readonly<{ label: string; value: string; helper: string; tone?: "neutral" | "danger" | "amber" | "green" }>) {
  return (
    <Panel className="p-4">
      <p className="text-[#667085] text-xs">{label}</p>
      <p
        className={cn(
          "mt-2 font-semibold text-[28px] leading-none tracking-tight",
          tone === "danger" ? "text-[#B42318]" : tone === "green" ? "text-[#167B70]" : "text-[#101828]",
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-[#667085] text-xs">{helper}</p>
    </Panel>
  );
}

function SummaryCell({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <p className="text-[#667085] text-xs">{label}</p>
      <p className="mt-1 truncate font-semibold text-[#101828] text-sm">{value}</p>
    </div>
  );
}

function InfoLine({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="flex items-start justify-between gap-4 border-[#E4E7EC] border-b py-2.5 last:border-b-0">
      <dt className="text-[#667085] text-sm">{label}</dt>
      <dd className="max-w-[60%] text-right font-medium text-[#101828] text-sm">{value}</dd>
    </div>
  );
}

function SectionTitle({ title, small }: Readonly<{ title: string; small?: boolean }>) {
  return (
    <h3 className={cn("font-semibold text-[#101828] tracking-tight", small ? "text-[15px]" : "text-[18px]")}>
      {title}
    </h3>
  );
}

function ActionButton({ label, onClick, danger }: Readonly<{ label: string; onClick: () => void; danger?: boolean }>) {
  return (
    <button
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-[12px] border px-3 font-semibold text-sm transition",
        danger
          ? "border-[#F2D4D1] text-[#B42318] hover:bg-[#FFFFFF]"
          : "border-[#E4E7EC] text-[#101828] hover:bg-[#FFFFFF]",
      )}
      onClick={onClick}
      type="button"
    >
      {label}
      <ChevronRight className="size-4 text-[#98A2B3]" />
    </button>
  );
}

function DiagnosticCard({
  title,
  value,
  tone = "neutral",
}: Readonly<{ title: string; value: string; tone?: "neutral" | "green" }>) {
  return (
    <div
      className={cn(
        "rounded-[16px] border p-4",
        tone === "green" ? "border-[#D7EFEA] bg-[#FFFFFF]" : "border-[#E4E7EC] bg-white",
      )}
    >
      <p className="font-semibold text-[#101828] text-sm">{title}</p>
      <p className="mt-3 text-[#667085] text-sm leading-6">{value}</p>
    </div>
  );
}

const visibleRepairTestResults: RepairTestResult[] = ["OK", "Défaut constaté", "Non applicable", "Non testé"];

function ChecklistRow({
  item,
  onChange,
  onCommentChange,
}: Readonly<{
  item: RepairChecklistItem;
  onChange: (result: RepairTestResult) => void;
  onCommentChange?: (comment: string) => void;
  compact?: boolean;
}>) {
  return (
    <tr className="border-[#E4E7EC] border-t">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {item.result === "OK" ? (
            <CheckCircle2 className="size-4 text-[#2A9D8F]" />
          ) : item.result === "Défaut constaté" || item.result === "KO" ? (
            <X className="size-4 text-[#B42318]" />
          ) : (
            <Circle className="size-4 text-[#98A2B3]" />
          )}
          <span className="font-medium text-[#101828]">{item.label}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {visibleRepairTestResults.map((result) => (
            <button
              className={cn(
                "rounded-[8px] border px-2 py-1 font-semibold text-[11px]",
                item.result === result ? resultTone(result) : "border-[#E4E7EC] bg-white text-[#667085]",
              )}
              key={result}
              onClick={() => onChange(result)}
              type="button"
            >
              {result}
            </button>
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        {onCommentChange ? (
          <input
            className="h-9 w-full min-w-[160px] rounded-[10px] border border-[#E4E7EC] bg-white px-3 text-xs outline-none focus:border-[#2A9D8F]/55 focus:ring-4 focus:ring-[#2A9D8F]/10"
            value={item.comment ?? ""}
            onChange={(event) => onCommentChange(event.target.value)}
            placeholder={item.result === "Non testé" ? "Note requise" : "Note optionnelle"}
          />
        ) : (
          <span className="text-[#667085]">{item.comment || "À compléter si nécessaire"}</span>
        )}
      </td>
    </tr>
  );
}

function TextBox({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <p className="font-semibold text-[#101828] text-sm">{label}</p>
      <p className="mt-2 min-h-20 rounded-[12px] border border-[#E4E7EC] bg-white p-3 text-[#667085] text-sm leading-6">
        {value}
      </p>
    </div>
  );
}

function ProgressPanel({ repair }: Readonly<{ repair: Repair }>) {
  const steps = ["Préparation", "Démontage", "Remplacement", "Remontage", "Test final"];
  const progress =
    repair.intervention?.progress ??
    (repair.status === "En réparation" ? 40 : repair.status === "Test final" ? 80 : 15);
  return (
    <Panel className="p-4">
      <SectionTitle title="Progression" small />
      <div className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <div className="flex items-center justify-between text-sm" key={step}>
            <span
              className={cn(
                "text-[#667085]",
                repair.intervention?.currentStep === step && "font-semibold text-[#167B70]",
              )}
            >
              {index + 1}. {step}
            </span>
            {index * 20 < progress ? (
              <Check className="size-4 text-[#2A9D8F]" />
            ) : (
              <Circle className="size-4 text-[#D0D5DD]" />
            )}
          </div>
        ))}
      </div>
      <div className="mt-5 h-2 rounded-full bg-[#FFFFFF]">
        <div className="h-full rounded-full bg-[#2A9D8F]" style={{ width: `${Math.min(100, progress)}%` }} />
      </div>
    </Panel>
  );
}

function columnTone(tone: QueueColumn["tone"]) {
  if (tone === "blue") return "bg-[#FFFFFF] text-[#2563A9]";
  if (tone === "amber") return "bg-[#FFFFFF] text-[#936100]";
  if (tone === "green") return "bg-[#FFFFFF] text-[#167B70]";
  if (tone === "purple") return "bg-[#FFFFFF] text-[#5D4BA8]";
  return "bg-[#FFFFFF] text-[#667085]";
}

function nextActionLabel(repair: Repair) {
  if (repair.status === "Reçu") return "Démarrer le diagnostic";
  if (repair.status === "Diagnostic") return "Créer un devis ou demander validation";
  if (repair.status === "En attente" || repair.status === "Devis accepté")
    return "Lever le blocage / préparer la réparation";
  if (repair.status === "En réparation") return "Continuer l'intervention";
  if (repair.status === "Test final") return "Valider le test final";
  if (repair.status === "Prêt") return "Consulter documents / restitution";
  return "Consulter le dossier";
}

function nextActionView(repair: Repair): AtelierView {
  if (repair.status === "Reçu" || repair.status === "Diagnostic") return "diagnostic";
  if (repair.status === "En attente" || repair.status === "Devis accepté") return "parts";
  if (repair.status === "En réparation") return "intervention";
  if (repair.status === "Test final") return "final-test";
  if (repair.status === "Prêt") return "documents";
  return "fiche";
}

function estimateMinutes(repair: Repair) {
  const text = `${repair.issue} ${repair.device}`.toLowerCase();
  if (text.includes("batterie")) return 45;
  if (text.includes("écran") || text.includes("ecran")) return 75;
  if (text.includes("hdmi") || text.includes("macbook")) return 110;
  return 60;
}

function interventionElapsed(repair: Repair) {
  const base = repair.intervention?.timerSeconds ?? 0;
  if (!repair.intervention?.timerRunning || !repair.intervention.timerStartedAt) return base;
  const started = parseDate(repair.intervention.timerStartedAt);
  if (!started) return base;
  return base + Math.max(0, Math.floor((Date.now() - started.getTime()) / 1000));
}

function formatSeconds(value: number) {
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}
