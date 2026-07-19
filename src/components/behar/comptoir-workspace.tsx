"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  ArrowLeft,
  Calendar,
  CalendarPlus,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Copy,
  CreditCard,
  Download,
  Eye,
  FileSignature,
  FileText,
  FolderOpen,
  GripVertical,
  HelpCircle,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Printer,
  QrCode,
  Receipt,
  RotateCcw,
  ScanLine,
  Search,
  Send,
  ShoppingBag,
  Smartphone,
  Trash2,
  TriangleAlert,
  User,
  Users,
  Wrench,
  X,
  Battery,
  Cable,
  Layers,
  Ear,
  Volume2,
  Mic,
  ScanFace,
  Activity,
  Zap,
  Droplet,
  Database,
  Lock,
  Inbox,
  LayoutDashboard,
} from "lucide-react";

import { CounterLeadSearch } from "@/components/behar/counter-lead-search";
import { toast } from "sonner";

import { BeharLogo } from "@/components/behar/behar-logo";
import { NewReconditioningIntakeWizard } from "@/components/behar/reconditioning-intake-wizard";
import { getPrintableTarget } from "@/components/behar/local-printable-document";
import { RealDeviceVisual, RealProductVisual } from "@/components/behar/real-product-visual";
import { useDocument } from "@/components/behar/print-provider";
import { SettlementModal, useSettlementModal } from "@/components/behar/settlement-modal";
import { TrackingQrModal } from "@/components/behar/tracking-qr-modal";
import { DeviceSelector } from "@/components/DeviceSelector";
import { ProblemSelector } from "@/components/ProblemSelector";
import { deviceCatalog } from "@/data/deviceCatalog";
import { formatBrandModel } from "@/lib/format-device";
import { generateQrDataUrl, publicAbsoluteUrl } from "@/lib/public-link";
import { getShareableDocumentUrl, openDocument, printDocument, printRepairQr } from "@/lib/documents/document-actions";
import {
  deviceBrands as catalogDeviceBrands,
  formatCurrency,
  formatEuro,
  getInvoiceTotal,
  getQuoteDevices,
  getQuoteTotal,
  getVatSummary,
  isTerminalRepairStatus,
  normalizeAppointmentStatus,
  type Appointment,
  type BeharDocument,
  type DeviceType,
  type Invoice,
  type PermissionKey,
  type Quote,
  type QuoteLine,
  type Repair,
  type RepairIntakeCondition,
  type WorkshopCountry,
  useBeharStore,
  type RepairPart,
} from "@/lib/behar-store";
import type { PriceBookItem } from "@/lib/price-book";
import { cn, formatDateTimeFr, formatIntakeBonNumber } from "@/lib/utils";
import { getWorkshopCountryConfig } from "@/lib/workshop-country";
import { getCustomerTrackingUrl } from "@/lib/customer-tracking";

type Tile = {
  id: string;
  label: string;
  description: string;
  icon: any;
  permission: PermissionKey | null;
  onClick: () => void;
  primary?: boolean;
};

function compactText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0033") && digits.length >= 13) return `0${digits.slice(4)}`;
  if (digits.startsWith("33") && digits.length === 11) return `0${digits.slice(2)}`;
  return digits;
}

async function copyCounterText(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Certains navigateurs refusent parfois l'API Clipboard : on utilise le fallback ci-dessous.
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

async function shareCounterLink(value: string, copiedMessage: string) {
  if (await copyCounterText(value)) {
    toast.success(copiedMessage);
    return;
  }
  window.open(value, "_blank", "noopener,noreferrer");
  toast.info("Lien client ouvert : copiez-le depuis la barre d'adresse.");
}

function modelMatchesCatalogue(selectedModel: string, catalogueModel: string) {
  const selected = compactText(selectedModel);
  const catalogue = compactText(catalogueModel);
  if (!selected || !catalogue) return false;
  return catalogue === selected || catalogue.includes(selected);
}

function isSaleOnlyAccessoryLabel(value: string) {
  const text = compactText(value);
  return /\b(coque|etui|housse|chargeur|cable|ecouteurs|verre trempe|protection ecran|film|accessoire)\b/.test(text);
}

function isCounterSaleStockItem(item: ReturnType<typeof useBeharStore.getState>["stockItems"][number]) {
  return item.active !== false && item.counterSaleEnabled === true && (item.stock ?? item.quantity ?? 0) > 0;
}

const counterAccessoryProducts = [
  { id: "free_chargeur_usb_c_20w", name: "Chargeur USB-C 20W", price: 19.9 },
  { id: "free_cable_usb_c", name: "Câble USB-C", price: 9.9 },
  { id: "free_cable_lightning", name: "Câble Lightning", price: 12.9 },
  { id: "free_coque_iphone", name: "Coque iPhone", price: 14.9 },
  { id: "free_verre_trempe", name: "Verre trempé", price: 12.9 },
  { id: "free_ecouteurs", name: "Écouteurs", price: 19.9 },
  { id: "free_adaptateur_secteur", name: "Adaptateur secteur", price: 14.9 },
  { id: "free_batterie_externe", name: "Batterie externe", price: 29.9 },
  { id: "free_support_voiture", name: "Support voiture", price: 16.9 },
] as const;

function parseCounterMoney(value: string) {
  const amount = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function quoteDeviceTypeToPriceBook(type: DeviceType) {
  if (type === "Tablette") return "tablet";
  if (type === "Ordinateur") return "computer";
  if (type === "Console") return "console";
  if (type === "Autre") return "other";
  return "smartphone";
}

function localDateValue(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildCounterTimeSlots(dateValue: string) {
  const slots: string[] = [];
  for (let hour = 9; hour < 18; hour += 1) {
    slots.push(`${String(hour).padStart(2, "0")}:00`);
    slots.push(`${String(hour).padStart(2, "0")}:30`);
  }
  const today = localDateValue();
  if (dateValue !== today) return slots;
  const now = new Date();
  return slots.filter((slot) => {
    const [h, m] = slot.split(":").map(Number);
    const slotDate = new Date();
    slotDate.setHours(h, m, 0, 0);
    return slotDate.getTime() > now.getTime() + 10 * 60_000;
  });
}

type CounterScreen =
  | "home"
  | "intake"
  | "quote"
  | "quotes"
  | "checkout"
  | "follow"
  | "sale"
  | "appointments"
  | "clients"
  | "scanner"
  | "dossiers"
  | "repair-detail"
  | "tracking"
  | "invoices"
  | "documents"
  | "lead-search"
  | "reconditionne";

export function ComptoirWorkspace({ initialScreen = "home" }: Readonly<{ initialScreen?: CounterScreen }>) {
  const router = useRouter();
  const currentUser = useBeharStore((s) => s.currentUser);
  const workshopInfo = useBeharStore((s) => s.workshopInfo);
  const hasPermission = useBeharStore((s) => s.hasPermission);
  const logout = useBeharStore((s) => s.logout);
  const addAuditLog = useBeharStore((s) => s.addAuditLog);

  const [counterScreen, setCounterScreen] = useState<CounterScreen>(initialScreen);
  const [counterRepairId, setCounterRepairId] = useState("");
  const [repairPrefill, setRepairPrefill] = useState<Partial<Repair> | undefined>(undefined);
  const [intakeInitialStep, setIntakeInitialStep] = useState(0);
  // Filtre dossier pour l'écran Documents : vide = tous, sinon docs du dossier ouvert.
  const [docFilterRepairId, setDocFilterRepairId] = useState("");
  const [dossiersScanMode, setDossiersScanMode] = useState(false);
  const [appointmentCreateRequestKey, setAppointmentCreateRequestKey] = useState(0);
  const [appointmentPrefill, setAppointmentPrefill] = useState<CounterAppointmentPrefill | undefined>(undefined);

  // Refresh "today" once every few minutes so date rollover is handled
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Today's metrics
  const repairs = useBeharStore((s) => s.repairs);
  const appointments = useBeharStore((s) => s.appointments);
  const today = useMemo(() => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [now]);
  const repairsToday = useMemo(
    () => repairs.filter((r) => (r.droppedAt || r.createdAt || "").slice(0, 10) === today).length,
    [repairs, today],
  );
  const appointmentsToday = useMemo(
    () => appointments.filter((a) => (a.date || "").slice(0, 10) === today).length,
    [appointments, today],
  );
  // Dossiers actifs = tous les dossiers hors statuts terminaux.
  const activeRepairsCount = useMemo(
    () => repairs.filter((r) => r.status !== "Prêt" && !isTerminalRepairStatus(r.status)).length,
    [repairs],
  );
  const readyRepairsCount = useMemo(() => repairs.filter((r) => r.status === "Prêt").length, [repairs]);

  useEffect(() => {
    addAuditLog({
      action: "comptoir.opened",
      targetType: "comptoir",
      targetId: currentUser.id,
      message: "a ouvert le mode Comptoir",
    });
  }, [addAuditLog, currentUser.id]);

  const primaryTiles: Tile[] = [
    {
      id: "new-repair",
      label: "Nouvelle prise en charge",
      description: "Créer un dossier",
      icon: Plus,
      permission: null,
      onClick: () => {
        setRepairPrefill(undefined);
        setIntakeInitialStep(0);
        setCounterScreen("intake");
      },
      primary: true,
    },
    {
      id: "appointments",
      label: "Rendez-vous du jour",
      description: "Consulter et poursuivre",
      icon: Calendar,
      permission: null,
      onClick: () => setCounterScreen("appointments"),
    },
    {
      id: "scanner",
      label: "Scanner QR",
      description: "Ouvrir le hub en mode scan",
      icon: QrCode,
      permission: null,
      onClick: () => {
        setDossiersScanMode(true);
        setCounterScreen("dossiers");
      },
    },
    {
      id: "search",
      label: "Rechercher un dossier",
      description: "Client, téléphone ou numéro",
      icon: FolderOpen,
      permission: "canViewRepairs",
      onClick: () => {
        setDossiersScanMode(false);
        setCounterScreen("dossiers");
      },
    },
    {
      id: "lead-search",
      label: "Rechercher une demande",
      description: "Demandes reçues du site",
      icon: Inbox,
      permission: null,
      onClick: () => setCounterScreen("lead-search"),
    },
    {
      id: "sale",
      label: "Vente comptoir",
      description: "Créer une vente avant sa facturation",
      icon: ShoppingBag,
      permission: "canViewSales",
      onClick: () => setCounterScreen("sale"),
    },
    {
      id: "reconditionne",
      label: "Acheter un téléphone",
      description: "Reprise client & reconditionnement",
      icon: Smartphone,
      permission: null,
      onClick: () => setCounterScreen("reconditionne"),
    },
    {
      id: "quotes",
      label: "Devis",
      description: "Créer, retrouver et envoyer",
      icon: FileSignature,
      permission: "canViewQuotes",
      onClick: () => setCounterScreen("quotes"),
    },
    {
      id: "documents",
      label: "Documents",
      description: "Ouvrir, imprimer ou télécharger",
      icon: FileText,
      permission: "canViewDocuments",
      onClick: () => {
        setDocFilterRepairId("");
        setCounterScreen("documents");
      },
    },
  ];

  const visiblePrimary = useMemo(
    () => primaryTiles.filter((t) => (t.permission === null ? true : hasPermission(t.permission))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasPermission, currentUser.id],
  );
  const openRepairDetail = (repairId: string) => {
    setCounterRepairId(repairId);
    setCounterScreen("repair-detail");
  };
  const startAppointmentIntake = (appointment: Appointment) => {
    const state = useBeharStore.getState();
    const linkedRepair =
      state.repairs.find((repair) => repair.id === appointment.repairId) ??
      state.repairs.find((repair) => repair.appointmentId === appointment.id);
    if (linkedRepair) {
      openRepairDetail(linkedRepair.id);
      return;
    }
    const customer = state.customers.find((entry) => entry.id === appointment.customerId);
    setRepairPrefill({
      appointmentId: appointment.id,
      customerId: appointment.customerId,
      deviceType: appointment.deviceType,
      brandName: appointment.deviceBrand,
      deviceModel: appointment.deviceModel || appointment.device,
      device: appointment.device,
      imei: appointment.imei || appointment.serialNumber || "",
      issue: appointment.issueDescription || appointment.interventionLabel || appointment.issue,
      issueType: appointment.interventionLabel,
      amount: appointment.estimatedTotal ?? appointment.customerPrice ?? 0,
      notes: appointment.notes,
    });
    setIntakeInitialStep(customer?.type === "counter" ? 0 : 2);
    setCounterScreen("intake");
  };

  if (counterScreen !== "home") {
    return (
      <CounterChrome
        onHome={() => {
          setCounterScreen("home");
          setCounterRepairId("");
          setRepairPrefill(undefined);
          setIntakeInitialStep(0);
        }}
        onLogout={() => {
          logout();
          router.push("/comptoir");
        }}
      >
        {counterScreen === "intake" && (
          <CounterIntakeScreen
            initialStep={intakeInitialStep}
            prefill={repairPrefill}
            onClose={() => setCounterScreen("home")}
            onCreated={(repairId) => {
              setCounterRepairId(repairId);
              setIntakeInitialStep(0);
              setCounterScreen("repair-detail");
            }}
            onCreateAppointment={(prefill) => {
              setAppointmentPrefill(prefill);
              setAppointmentCreateRequestKey((key) => key + 1);
              setCounterScreen("appointments");
            }}
          />
        )}
        {counterScreen === "quote" && (
          <CounterQuoteScreen
            onClose={() => setCounterScreen("home")}
            onTransform={(quoteRepairPrefill) => {
              setRepairPrefill(quoteRepairPrefill);
              setIntakeInitialStep(0);
              setCounterScreen("intake");
            }}
          />
        )}
        {counterScreen === "quotes" && (
          <CounterQuotesScreen
            onClose={() => setCounterScreen("home")}
            onCreate={() => setCounterScreen("quote")}
            onTransform={(quoteRepairPrefill) => {
              setRepairPrefill(quoteRepairPrefill);
              setIntakeInitialStep(0);
              setCounterScreen("intake");
            }}
          />
        )}
        {counterScreen === "checkout" && (
          <CounterCheckoutScreen initialRepairId={counterRepairId} onClose={() => setCounterScreen("home")} />
        )}
        {counterScreen === "follow" && (
          <CounterFollowScreen
            repairId={counterRepairId}
            onClose={() => setCounterScreen("home")}
            onCheckout={(repairId) => {
              setCounterRepairId(repairId);
              setCounterScreen("checkout");
            }}
          />
        )}
        {counterScreen === "sale" && <CounterAccessorySaleScreen onClose={() => setCounterScreen("home")} />}
        {counterScreen === "appointments" && (
          <CounterAppointmentsScreen
            onClose={() => setCounterScreen("home")}
            onOpenRepairDetail={openRepairDetail}
            onTransformAppointment={startAppointmentIntake}
            createRequestKey={appointmentCreateRequestKey}
            createPrefill={appointmentPrefill}
          />
        )}
        {counterScreen === "lead-search" && (
          <CounterLeadSearch onClose={() => setCounterScreen("home")} onOpenRepairDetail={openRepairDetail} />
        )}
        {counterScreen === "clients" && (
          <CounterClientsScreen
            onClose={() => setCounterScreen("home")}
            onCreateRepair={(prefill) => {
              setRepairPrefill(prefill);
              setIntakeInitialStep(0);
              setCounterScreen("intake");
            }}
            onCreateQuote={() => setCounterScreen("quote")}
            onPay={(repairId) => {
              setCounterRepairId(repairId ?? "");
              setCounterScreen("checkout");
            }}
            onOpenRepairDetail={(repairId) => {
              setCounterRepairId(repairId);
              setCounterScreen("repair-detail");
            }}
          />
        )}
        {counterScreen === "scanner" && (
          <CounterScannerScreen
            onClose={() => setCounterScreen("home")}
            onCreateNew={() => {
              setRepairPrefill(undefined);
              setIntakeInitialStep(0);
              setCounterScreen("intake");
            }}
            onOpenTracking={(repairId) => {
              if (repairId) setCounterRepairId(repairId);
              setCounterScreen("tracking");
            }}
          />
        )}
        {counterScreen === "dossiers" && (
          <CounterDossiersScreen
            onClose={() => setCounterScreen("home")}
            onCreate={() => {
              setRepairPrefill(undefined);
              setIntakeInitialStep(0);
              setCounterScreen("intake");
            }}
            onOpenRepairDetail={(repairId) => {
              setCounterRepairId(repairId);
              setCounterScreen("repair-detail");
            }}
            scanMode={dossiersScanMode}
            onScanModeChange={setDossiersScanMode}
          />
        )}
        {counterScreen === "repair-detail" && (
          <CounterRepairDetailScreen
            repairId={counterRepairId}
            onClose={() => setCounterScreen("dossiers")}
            onOpenDocuments={() => {
              setDocFilterRepairId(counterRepairId);
              setCounterScreen("documents");
            }}
          />
        )}
        {counterScreen === "invoices" && <CounterInvoicesScreen onClose={() => setCounterScreen("home")} />}
        {counterScreen === "documents" && (
          <CounterDocumentsScreen onClose={() => setCounterScreen("home")} repairId={docFilterRepairId || undefined} />
        )}
        {counterScreen === "reconditionne" && (
          <NewReconditioningIntakeWizard
            onClose={() => setCounterScreen("home")}
            onOpenDevice={() => setCounterScreen("home")}
          />
        )}
        {counterScreen === "tracking" && (
          <CounterTrackingScreen
            initialRepairId={counterRepairId}
            onClose={() => setCounterScreen("home")}
            onOpenRepairDetail={(repairId) => {
              setCounterRepairId(repairId);
              setCounterScreen("repair-detail");
            }}
          />
        )}
      </CounterChrome>
    );
  }

  return (
    <div className="behar-app fixed inset-0 z-50 flex h-svh w-svw flex-col bg-white text-[#1A1916]">
      {/* Header — minimal, aligné sur l'image */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-[#E8E8E5] border-b bg-white px-6 py-4 lg:px-10">
        <BeharLogo size="sm" />

        <div className="flex items-center gap-3">
          {hasPermission("canViewDashboard") ? (
            <Link
              href="/dashboard"
              className="hidden h-10 items-center gap-2 rounded-[10px] border border-[#E8E8E5] bg-white px-3.5 text-[13px] font-medium text-[#4F4F4B] transition hover:border-[#CFE9E4] hover:text-[#167B70] sm:inline-flex"
            >
              <LayoutDashboard className="size-4" /> Dashboard
            </Link>
          ) : null}
          {hasPermission("canAccessWorkshopMode") ? (
            <Link
              href="/atelier"
              className="hidden h-10 items-center gap-2 rounded-[10px] border border-[#E8E8E5] bg-white px-3.5 text-[13px] font-medium text-[#4F4F4B] transition hover:border-[#CFE9E4] hover:text-[#167B70] md:inline-flex"
            >
              <Wrench className="size-4" /> Atelier
            </Link>
          ) : null}
          <span className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#E8E8E5] bg-white px-4 text-[14px]">
            <span className="size-2.5 rounded-full bg-[#2A9D8F]" />
            Session active
          </span>
          <span className="min-w-[54px] text-center font-medium tabular-nums">
            {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/comptoir");
            }}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#E8E8E5] bg-white px-4 font-medium text-[14px] active:scale-[0.97]"
            title="Quitter le mode comptoir"
          >
            <LogOut className="size-4" />
            Quitter
          </button>
        </div>
      </header>

      {/* Body — match image */}
      <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-12 lg:py-10">
        <div className="mx-auto w-full max-w-[1180px]">
          <div className="mb-6 lg:mb-8">
            <h1 className="font-bold text-[#1A1916] text-[28px] leading-[1.1] tracking-[-0.02em] lg:text-[34px]">
              Comptoir
            </h1>
            <p className="mt-1.5 text-[#6B6B6B] text-[14px] tracking-tight lg:text-[15px]">
              Créer, retrouver ou poursuivre un dossier.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-4">
            {visiblePrimary.map((tile) => {
              const Icon = tile.icon;
              const isPrimary = tile.primary === true;
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={tile.onClick}
                  className="group flex min-h-[148px] flex-col items-center justify-center rounded-[16px] border border-[#E8E8E5] bg-white p-6 text-center shadow-[0_1px_2px_rgba(26,25,22,0.035)] transition hover:border-[#DADADA] active:scale-[0.98]"
                >
                  {isPrimary ? (
                    <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-[#2A9D8F] text-white">
                      <Icon className="size-5" />
                    </span>
                  ) : (
                    <span className="grid size-10 shrink-0 place-items-center text-[#167B70]">
                      <Icon className="size-5" />
                    </span>
                  )}
                  <div className="min-w-0 pt-5">
                    <p className="font-bold text-[#1A1916] text-[15.5px] tracking-tight md:text-[16px]">{tile.label}</p>
                    <p className="mt-0.5 text-[#6B6B6B] text-[12.5px] leading-snug md:text-[13px]">
                      {tile.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {visiblePrimary.length === 0 && (
            <div className="mx-auto mt-12 max-w-md rounded-[20px] border border-[#FFFFFF] bg-white p-8 text-center shadow-[0_1px_4px_rgba(26,25,22,0.04)]">
              <p className="font-semibold text-[#1A1916] text-[16px]">Aucune action disponible</p>
              <p className="mt-2 text-[#6B6B6B] text-[13.5px]">
                Ce compte n'a pas les permissions nécessaires pour les actions Comptoir. Contactez le gérant.
              </p>
            </div>
          )}

          {/* Section "Aujourd'hui" */}
          <section className="mt-7 lg:mt-9">
            <h2 className="mb-3 font-semibold text-[#1A1916] text-[15px] tracking-tight">Aujourd'hui</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              <TodayStat
                icon={<FolderOpen className="size-[18px]" />}
                value={`${activeRepairsCount}`}
                label="Dossiers actifs"
                detail="En cours"
              />
              <TodayStat
                icon={<Calendar className="size-[18px]" />}
                value={`${appointmentsToday}`}
                label="Rendez-vous"
                detail="Aujourd'hui"
              />
              <TodayStat
                icon={<FileText className="size-[18px]" />}
                value={`${repairsToday}`}
                label="Dossiers créés"
                detail="Aujourd'hui"
              />
              <TodayStat
                icon={<Receipt className="size-[18px]" />}
                value={`${readyRepairsCount}`}
                label="Dossiers prêts"
                detail="À restituer"
              />
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 border-[#E8E8E5] border-t bg-white px-6 py-3 text-center text-[#6B6B6B] text-[11px] lg:px-10">
        {workshopInfo.name} · {workshopInfo.phone || ""} · Behar Tech Pro
      </footer>
    </div>
  );
}

function SignaturePad({ value, onChange }: Readonly<{ value: string; onChange: (v: string) => void }>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1A1916";
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    hasInk.current = true;
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (hasInk.current && canvasRef.current) {
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasInk.current = false;
    onChange("");
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className="h-[140px] w-full touch-none rounded-[14px] border border-[#E8E8E5] bg-white"
      />
      <button
        type="button"
        onClick={clear}
        className="absolute right-2 top-2 rounded-full border border-[#E8E8E5] bg-white px-2.5 py-1 font-medium text-[#6B6B6B] text-[11px] hover:bg-[#FFFFFF]"
      >
        Effacer
      </button>
      {!value && (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-[#A3A3A3] text-[12.5px]">
          Signer ici avec le doigt ou le stylet
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Réparations comptoir — prise en charge, suivi, devis, règlement            */
/* ─────────────────────────────────────────────────────────────────────────── */

type CounterConditionValue = "ok" | "abime" | "hs" | "a_tester";
type CounterAccessValue = "non_communique" | "aucun" | "pin" | "mot_de_passe" | "schema" | "biometrie";
type CounterPhotoKey = "avant" | "arriere" | "defaut" | "accessoires";
type CounterClientMode = "counter" | "new" | "existing";
type CounterAppointmentPrefill = {
  clientMode?: CounterClientMode;
  customerId?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  deviceType?: DeviceType;
  brand?: string;
  model?: string;
  device?: string;
  imei?: string;
  issue?: string;
  price?: string;
  notes?: string;
};

const counterTypes: DeviceType[] = ["Smartphone", "Tablette", "Ordinateur", "Console"];
const counterBrands = ["Apple", "Samsung", "Xiaomi", "Google", "Huawei", "OnePlus", "Sony", "Autre"];
const intakeProblems = [
  "Écran cassé",
  "Batterie HS",
  "Connecteur de charge",
  "Vitre arrière",
  "Caméra",
  "Micro-soudure",
  "Diagnostic",
  "Autre",
];

const PRESTATION_FAMILIES = [
  {
    id: "ecran",
    label: "Écran",
    icon: Smartphone,
    subTypes: [
      {
        id: "ecran_avant",
        label: "Écran avant",
        keywords: ["ecran", "vitre tactile", "dalle", "afficheur", "screen", "display"],
      },
      {
        id: "vitre_arriere",
        label: "Vitre arrière",
        keywords: ["vitre arriere", "dos", "chassis", "back glass", "vitre dos"],
      },
    ],
  },
  {
    id: "batterie",
    label: "Batterie",
    icon: Battery,
    subTypes: [{ id: "batterie", label: "Remplacement batterie", keywords: ["batterie", "battery", "bat hs"] }],
  },
  {
    id: "charge",
    label: "Charge",
    icon: Cable,
    subTypes: [
      {
        id: "connecteur_charge",
        label: "Connecteur de charge",
        keywords: ["connecteur", "charge", "usb", "dock", "charging"],
      },
    ],
  },
  {
    id: "cameras",
    label: "Caméras",
    icon: Camera,
    subTypes: [
      {
        id: "camera_arriere",
        label: "Caméra arrière",
        keywords: ["camera arriere", "camera dos", "rear camera", "lentille camera"],
      },
      {
        id: "camera_avant",
        label: "Caméra avant",
        keywords: ["camera avant", "camera face", "front camera", "selfie"],
      },
    ],
  },
  {
    id: "audio",
    label: "Audio",
    icon: Volume2,
    subTypes: [
      { id: "ecouteur_interne", label: "Écouteur interne", keywords: ["ecouteur", "haut parleur oreille", "earpiece"] },
      { id: "haut_parleur", label: "Haut-parleur", keywords: ["haut parleur", "buzzer", "speaker"] },
      { id: "microphone", label: "Micro", keywords: ["micro", "microphone"] },
    ],
  },
  {
    id: "capteurs",
    label: "Capteurs / Face ID",
    icon: ScanFace,
    subTypes: [
      {
        id: "face_id_sensors",
        label: "Face ID / capteurs",
        keywords: ["face id", "touch id", "capteur", "sensors", "proximite", "nappe capteurs"],
      },
    ],
  },
  {
    id: "carte_mere",
    label: "Carte mère",
    icon: Zap,
    subTypes: [
      { id: "micro_soudure", label: "Micro-soudure", keywords: ["soudure", "micro soudure", "carte mere"] },
      {
        id: "diagnostic_carte_mere",
        label: "Diagnostic carte mère",
        keywords: ["diagnostic carte", "recherche panne carte"],
      },
      { id: "reparation_carte_mere", label: "Réparation carte mère", keywords: ["reparation carte", "carte mere hs"] },
    ],
  },
  {
    id: "logiciel",
    label: "Logiciel",
    icon: Lock,
    subTypes: [
      {
        id: "deblocage_logiciel",
        label: "Déblocage logiciel",
        keywords: ["deblocage", "logiciel", "reinstallation", "systeme"],
      },
      {
        id: "transfert_donnees",
        label: "Transfert de données",
        keywords: ["transfert", "sauvegarde", "recuperation de donnees"],
      },
    ],
  },
  {
    id: "services",
    label: "Services",
    icon: Activity,
    subTypes: [
      { id: "diagnostic", label: "Diagnostic", keywords: ["diagnostic", "devis", "recherche panne"] },
      { id: "desoxydation", label: "Désoxydation", keywords: ["deoxydation", "eau", "liquide"] },
    ],
  },
  {
    id: "autre",
    label: "Autre",
    icon: MoreHorizontal,
    subTypes: [{ id: "autre_prestation", label: "Autre prestation", keywords: ["autre"] }],
  },
];

const COUNTER_SERVICES = PRESTATION_FAMILIES.flatMap((f) =>
  f.subTypes.map((s) => ({
    id: s.id,
    label: s.label,
    category: s.id,
    icon: f.icon,
  })),
);

function getAvailableQualitiesForService(
  subTypeId: string,
  subTypeLabel: string,
  priceBookItems: PriceBookItem[],
  brand: string,
  model: string,
) {
  if (!brand || !model) return [];

  let keywords: string[] = [];
  for (const fam of PRESTATION_FAMILIES) {
    const sub = fam.subTypes.find((s) => s.id === subTypeId);
    if (sub) {
      keywords = sub.keywords;
      break;
    }
  }

  if (keywords.length === 0) return [];

  return priceBookItems.filter((item) => {
    if (!item.isActive) return false;

    const sameBrand = compactText(item.marque) === compactText(brand);
    const sameModel = modelMatchesCatalogue(model, item.modele);
    if (!sameBrand || !sameModel) return false;

    const itemRepair = compactText(item.reparation || "");
    const itemPiece = compactText(item.piece || "");

    return keywords.some((kw) => itemRepair.includes(kw) || itemPiece.includes(kw));
  });
}
const intakeAccessories = [
  "Coque",
  "Chargeur",
  "Verre trempé",
  "Câble",
  "Carte SIM",
  "Carte SD",
  "Écouteurs",
  "Boîte d'origine",
  "Autre",
];
const quoteProblems = ["Remplacement écran", "Batterie", "Caméra", "Diagnostic", "Connecteur de charge", "Autre"];
const conditionRows: Array<{ key: keyof CounterConditionState; label: string }> = [
  { key: "etatGeneral", label: "État général" },
  { key: "ecran", label: "Écran" },
  { key: "chassis", label: "Châssis / dos" },
  { key: "batterie", label: "Batterie / charge" },
  { key: "cameras", label: "Caméras" },
  { key: "boutons", label: "Boutons" },
  { key: "micro", label: "Micro / haut-parleur" },
  { key: "connecteur", label: "Connecteur de charge" },
  { key: "reseauSim", label: "Réseau / SIM" },
  { key: "faceTouchId", label: "Face ID / Touch ID" },
];
type CounterConditionState = {
  etatGeneral: CounterConditionValue;
  ecran: CounterConditionValue;
  chassis: CounterConditionValue;
  batterie: CounterConditionValue;
  cameras: CounterConditionValue;
  boutons: CounterConditionValue;
  micro: CounterConditionValue;
  connecteur: CounterConditionValue;
  reseauSim: CounterConditionValue;
  faceTouchId: CounterConditionValue;
};

function defaultCounterCondition(): CounterConditionState {
  return {
    etatGeneral: "a_tester",
    ecran: "a_tester",
    chassis: "a_tester",
    batterie: "a_tester",
    cameras: "a_tester",
    boutons: "a_tester",
    micro: "a_tester",
    connecteur: "a_tester",
    reseauSim: "a_tester",
    faceTouchId: "a_tester",
  };
}

function CounterChrome({
  children,
  onHome,
  onLogout,
}: Readonly<{
  children: React.ReactNode;
  onHome: () => void;
  onLogout: () => void;
}>) {
  const hasPermission = useBeharStore((state) => state.hasPermission);

  return (
    <div className="behar-app fixed inset-0 z-50 flex h-svh w-svw flex-col bg-white text-[#1A1916]">
      <header className="flex h-[72px] shrink-0 items-center justify-between gap-3 border-[#E8E8E5] border-b bg-white px-8 lg:px-12">
        <button type="button" onClick={onHome} className="flex min-h-[52px] items-center active:scale-[0.99]">
          <BeharLogo size="sm" />
        </button>
        <div className="flex items-center gap-3">
          {hasPermission("canViewDashboard") ? (
            <Link
              href="/dashboard"
              className="hidden h-10 items-center gap-2 rounded-[10px] border border-[#E8E8E5] bg-white px-3.5 text-[13px] font-medium text-[#4F4F4B] transition hover:border-[#CFE9E4] hover:text-[#167B70] sm:inline-flex"
            >
              <LayoutDashboard className="size-4" /> Dashboard
            </Link>
          ) : null}
          {hasPermission("canAccessWorkshopMode") ? (
            <Link
              href="/atelier"
              className="hidden h-10 items-center gap-2 rounded-[10px] border border-[#E8E8E5] bg-white px-3.5 text-[13px] font-medium text-[#4F4F4B] transition hover:border-[#CFE9E4] hover:text-[#167B70] md:inline-flex"
            >
              <Wrench className="size-4" /> Atelier
            </Link>
          ) : null}
          <span className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#E8E8E5] bg-white px-4 text-[14px]">
            <span className="size-2.5 rounded-full bg-[#2A9D8F]" /> Session active
          </span>
          <CounterClock />
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#E8E8E5] bg-white px-4 font-medium active:scale-[0.97]"
          >
            <LogOut className="size-4" /> Quitter
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-7 py-7 lg:px-10">{children}</main>
    </div>
  );
}

function CounterClock() {
  const [value, setValue] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setValue(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="min-w-[54px] text-center font-medium tabular-nums">
      {value.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

function CounterStepper({
  steps,
  current,
  onStep,
}: Readonly<{ steps: string[]; current: number; onStep?: (step: number) => void }>) {
  return (
    <div className="my-6 flex items-center gap-3">
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <div key={label} className="flex flex-1 items-center gap-3">
            <button
              type="button"
              disabled={!onStep || index > current}
              onClick={() => onStep?.(index)}
              className={cn(
                "flex min-h-[52px] items-center gap-2 rounded-[14px] px-2 text-left text-[13px] font-semibold transition active:scale-[0.98]",
                index <= current ? "text-[#1E7A6E]" : "text-[#6E6E73]",
              )}
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full border text-[13px]",
                  done
                    ? "border-[#2A9D8F] bg-[#2A9D8F] text-white"
                    : active
                      ? "border-[#2A9D8F] bg-[#2A9D8F] text-white"
                      : "border-[#D9D6CF] bg-white text-[#6E6E73]",
                )}
              >
                {done ? <Check className="size-4" /> : index + 1}
              </span>
              <span className="hidden lg:inline">{label}</span>
            </button>
            {index < steps.length - 1 && <span className={cn("h-px flex-1", done ? "bg-[#2A9D8F]" : "bg-[#FFFFFF]")} />}
          </div>
        );
      })}
    </div>
  );
}

function SelectTile({
  active,
  children,
  onClick,
  className = "",
}: Readonly<{ active: boolean; children: React.ReactNode; onClick: () => void; className?: string }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-[14px] border bg-white px-3 py-3 text-center font-semibold text-[13.5px] leading-tight transition active:scale-[0.97]",
        active
          ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#1E7A6E]"
          : "border-[#E8E8E5] text-[#1D1D1F] hover:border-[#D9D6CF]",
        className,
      )}
    >
      {children}
      {active && (
        <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-[#2A9D8F] text-white">
          <Check className="size-3.5" />
        </span>
      )}
    </button>
  );
}

function ChipButton({
  active,
  children,
  onClick,
}: Readonly<{ active: boolean; children: React.ReactNode; onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] border px-4 font-semibold text-[13px] transition active:scale-[0.97]",
        active ? "border-[#2A9D8F] bg-[#2A9D8F] text-white" : "border-[#E8E8E5] bg-white text-[#1D1D1F]",
      )}
    >
      {active && <Check className="size-4" />} {children}
    </button>
  );
}

function MoneySummary({
  amount,
  lines,
  footer,
  showPriceCard = true,
}: Readonly<{
  amount: number;
  lines?: Array<{ label: string; value: string }>;
  footer?: React.ReactNode;
  showPriceCard?: boolean;
}>) {
  const ws = useBeharStore((s) => s.workshopInfo);
  return (
    <div className="space-y-4">
      {showPriceCard && (
        <section className="rounded-[20px] border border-[#E8E8E5] bg-white p-6 shadow-[0_1px_2px_rgba(26,25,22,0.035)]">
          <p className="font-bold text-[15px]">Prix client</p>
          <p className="mt-4 font-black text-[#1E7A6E] text-[38px] tracking-tight tabular-nums">{formatEuro(amount)}</p>
          <p className="mt-1 text-[#6E6E73]">{ws.vatApplicable ? "TTC" : ""}</p>
        </section>
      )}
      {lines && (
        <section className="rounded-[20px] border border-[#E8E8E5] bg-white p-6 shadow-[0_1px_2px_rgba(26,25,22,0.035)]">
          <p className="mb-4 font-bold text-[15px]">Récapitulatif</p>
          <dl className="space-y-3">
            {lines.map((line) => (
              <div key={line.label} className="grid grid-cols-[120px_1fr] gap-3 text-[14px]">
                <dt className="text-[#6E6E73]">{line.label}</dt>
                <dd className="font-semibold">{line.value || "—"}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex items-center justify-between border-[#E8E8E5] border-t pt-4 font-bold">
            <span>Total estimé</span>
            <span className="text-[#1E7A6E] tabular-nums">
              {formatEuro(amount)} {ws.vatApplicable ? "TTC" : ""}
            </span>
          </div>
          {footer && <div className="mt-5 border-[#E8E8E5] border-t pt-4">{footer}</div>}
        </section>
      )}
    </div>
  );
}

function ExistingCustomerSearch({
  value,
  onChange,
}: Readonly<{ value: string; onChange: (customerId: string) => void }>) {
  const customers = useBeharStore((s) => s.customers);
  const [query, setQuery] = useState("");
  const filteredCustomers = useMemo(() => {
    const q = compactText(query);
    if (q.length < 2) return [];
    return customers
      .filter((customer) => customer.type !== "counter")
      .filter((customer) => {
        return compactText(`${customer.name} ${customer.phone ?? ""} ${customer.email ?? ""}`).includes(q);
      })
      .slice(0, 8);
  }, [customers, query]);
  const selected = customers.find((customer) => customer.id === value);

  return (
    <div className="space-y-3">
      <CounterInput
        placeholder="Rechercher un client (nom, téléphone, email…)"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {selected && (
        <div className="flex min-h-[52px] items-center justify-between rounded-[14px] border border-[#2A9D8F] bg-[#FFFFFF] px-4 text-[#1E7A6E]">
          <span>
            <b>{selected.name}</b>
            <span className="ml-2 text-[#6E6E73]">{selected.phone || selected.email || ""}</span>
          </span>
          <Check className="size-5" />
        </div>
      )}
      {query.trim().length < 2 ? (
        <p className="rounded-[14px] bg-white px-4 py-3 text-[#6E6E73] text-sm">
          Tapez au moins 2 caractères pour chercher dans la base clients.
        </p>
      ) : (
        <div className="grid gap-2">
          {filteredCustomers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => {
                onChange(customer.id);
                setQuery("");
              }}
              className={cn(
                "grid min-h-[56px] grid-cols-[1fr_auto] items-center gap-3 rounded-[14px] border px-4 text-left transition active:scale-[0.98]",
                customer.id === value
                  ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#1E7A6E]"
                  : "border-[#E8E8E5] bg-white text-[#1D1D1F]",
              )}
            >
              <span>
                <b className="block">{customer.name}</b>
                <span className="text-[#6E6E73] text-sm">
                  {[customer.phone, customer.email].filter(Boolean).join(" · ") || "Client enregistré"}
                </span>
              </span>
              {customer.id === value ? (
                <Check className="size-5" />
              ) : (
                <ChevronRight className="size-5 text-[#9A9AA0]" />
              )}
            </button>
          ))}
          {filteredCustomers.length === 0 && (
            <p className="rounded-[14px] border border-dashed border-[#D9D6CF] bg-white px-4 py-4 text-center text-[#6E6E73] text-sm">
              Aucun client trouvé.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CounterInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-[52px] w-full rounded-[14px] border border-[#E8E8E5] bg-white px-4 text-[15px] outline-none placeholder:text-[#9A9AA0] focus:border-[#2A9D8F] focus:ring-4 focus:ring-[#2A9D8F]/10",
        props.className,
      )}
    />
  );
}

function CounterTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-[96px] w-full rounded-[14px] border border-[#E8E8E5] bg-white px-4 py-3 text-[15px] outline-none placeholder:text-[#9A9AA0] focus:border-[#2A9D8F] focus:ring-4 focus:ring-[#2A9D8F]/10",
        props.className,
      )}
    />
  );
}

function toMoney(value: string) {
  const n = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function repairAmount(repair?: Repair) {
  return repair ? Number(repair.total ?? repair.amount ?? 0) : 0;
}

function displayRepairCode(repair?: Repair | null) {
  if (!repair) return "";
  return repair.number.replace(/^R-\d{4}-/, "REP-").replace(/^DEV-/, "DV-");
}

function displayIntakeBonCode(repair?: Repair | null, repairs: Repair[] = []) {
  if (!repair) return "";
  const ordered = [...repairs].sort((a, b) => {
    const da = new Date(a.createdAt || a.droppedAt || 0).getTime();
    const db = new Date(b.createdAt || b.droppedAt || 0).getTime();
    return da - db;
  });
  const fallback = ordered.findIndex((entry) => entry.id === repair.id) + 1;
  return formatIntakeBonNumber(repair.number, fallback > 0 ? fallback : undefined);
}

function formatCounterDateTime(value?: string | Date | number | null, fallback = "Non renseigné") {
  return formatDateTimeFr(value, fallback);
}

function counterDeviceLabel(value?: string | null, fallback = "Non renseigné") {
  const clean = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return fallback;
  return clean.replace(/^Apple\s+(iPhone\b.*)$/i, "$1");
}

function repairDeviceLabel(repair?: Repair | null, fallback = "Non renseigné") {
  return counterDeviceLabel(repair?.deviceModel || repair?.model || repair?.device, fallback);
}

function appointmentDeviceLabel(appointment?: Appointment | null, fallback = "Non renseigné") {
  return counterDeviceLabel(appointment?.deviceModel || appointment?.device, fallback);
}

function conditionLabel(value: CounterConditionValue) {
  if (value === "ok") return "OK";
  if (value === "abime") return "Abîmé";
  if (value === "hs") return "HS";
  return "À tester";
}

function accessLabel(value: CounterAccessValue | string | undefined) {
  const map: Record<string, string> = {
    non_communique: "Non communiqué",
    aucun: "Aucun",
    pin: "Code PIN",
    mot_de_passe: "Mot de passe",
    schema: "Schéma",
    biometrie: "Empreinte / biométrie",
  };
  return map[String(value)] ?? "Non communiqué";
}

function findCataloguePrice(
  priceBookItems: ReturnType<typeof useBeharStore.getState>["priceBookItems"],
  brand: string,
  model: string,
  label: string,
) {
  return findCatalogueItem(priceBookItems, brand, model, label)?.prixClientTotal ?? 0;
}

function findCatalogueItem(
  priceBookItems: ReturnType<typeof useBeharStore.getState>["priceBookItems"],
  brand: string,
  model: string,
  label: string,
) {
  const compactLabel = compactText(label).replace(/^remplacement /, "");
  return priceBookItems.find(
    (item) =>
      item.isActive !== false &&
      (!brand || compactText(item.marque) === compactText(brand)) &&
      (!model || modelMatchesCatalogue(model, item.modele)) &&
      (compactText(item.reparation).includes(compactLabel) || compactText(item.piece).includes(compactLabel)),
  );
}

function cataloguePrestationsForModel(
  priceBookItems: ReturnType<typeof useBeharStore.getState>["priceBookItems"],
  brand: string,
  model: string,
) {
  const seen = new Set<string>();
  const out: Array<{ label: string; prixClient: number }> = [];
  for (const item of priceBookItems) {
    if (item.isActive === false) continue;
    if (brand && compactText(item.marque) !== compactText(brand)) continue;
    if (model && !modelMatchesCatalogue(model, item.modele)) continue;
    const label = item.reparation || item.piece;
    const key = compactText(label);
    if (!label || seen.has(key)) continue;
    seen.add(key);
    out.push({ label, prixClient: item.prixClientTotal || 0 });
  }
  return out.sort((a, b) => b.prixClient - a.prixClient).slice(0, 8);
}

function clarifyCounterPrestationLabel(label: string) {
  const clean = label.trim();
  const text = compactText(clean);
  if (!clean) return clean;
  if (text.includes("oled") && text.includes("ecran")) return "Remplacement écran OLED";
  if (text === "ecran" || text === "remplacement ecran") return "Remplacement écran standard";
  if (text === "ecran casse") return "Diagnostic écran cassé";
  if (text === "batterie" || text === "batterie hs") return "Remplacement batterie";
  if (text === "vitre arriere") return "Remplacement vitre arrière";
  if (text === "connecteur de charge") return "Remplacement connecteur de charge";
  return clean;
}

// Interventions fréquentes consoles (PS5, Xbox, Switch…). Le catalogue aide mais
// ne bloque jamais la saisie libre : « Autre » + le champ prix restent disponibles.
function consolePrestationLabels(model: string): string[] {
  const compact = compactText(model);
  const isPs5 = compact.includes("ps5") || compact.includes("playstation 5");
  return [
    isPs5 ? "Remplacement port HDMI PS5" : "Remplacement port HDMI",
    "Nettoyage console",
    "Remplacement pâte thermique console",
    "Diagnostic console",
    "Remplacement ventilateur console",
    "Autre",
  ];
}

function counterPrestationOptions(
  priceBookItems: ReturnType<typeof useBeharStore.getState>["priceBookItems"],
  brand: string,
  model: string,
  deviceType?: DeviceType,
) {
  const byLabel = new Map<
    string,
    { label: string; lookupLabel: string; prixClient: number; source: "catalogue" | "motif" }
  >();
  for (const entry of cataloguePrestationsForModel(priceBookItems, brand, model)) {
    const label = clarifyCounterPrestationLabel(entry.label);
    const key = compactText(label);
    if (!byLabel.has(key)) {
      byLabel.set(key, { label, lookupLabel: entry.label, prixClient: entry.prixClient, source: "catalogue" });
    }
  }
  // Pour les consoles, on propose les interventions dédiées plutôt que la liste
  // générique smartphone (écran/vitre/caméra) inadaptée.
  const motifLabels = deviceType === "Console" ? consolePrestationLabels(model) : intakeProblems;
  for (const entry of motifLabels) {
    const label = clarifyCounterPrestationLabel(entry);
    const key = compactText(label);
    const price = findCataloguePrice(priceBookItems, brand, model, entry);
    const existing = byLabel.get(key);
    if (existing) {
      if (existing.prixClient <= 0 && price > 0) byLabel.set(key, { ...existing, prixClient: price });
      continue;
    }
    byLabel.set(key, { label, lookupLabel: entry, prixClient: price, source: "motif" });
  }
  return Array.from(byLabel.values()).sort((a, b) => {
    if (a.prixClient > 0 && b.prixClient <= 0) return -1;
    if (a.prixClient <= 0 && b.prixClient > 0) return 1;
    return a.label.localeCompare(b.label, "fr");
  });
}

function addonSuggestionsFor(prestations: string[], model: string) {
  const source = compactText(`${prestations.join(" ")} ${model}`);
  const suggestions = [
    { id: "addon_verre_trempe", label: "Verre trempé", prixClient: 12.9, reason: "À proposer avec chaque écran" },
    { id: "addon_coque", label: "Coque de protection", prixClient: 14.9, reason: "Protection après réparation" },
    { id: "addon_chargeur", label: "Chargeur USB-C", prixClient: 19.9, reason: "Vente additionnelle comptoir" },
  ];
  if (source.includes("ecran") || source.includes("vitre")) return suggestions;
  return suggestions.filter((entry) => entry.id !== "addon_verre_trempe");
}

function counterModelOptions({
  brand,
  deviceType,
  priceBookItems,
  deviceModels,
}: {
  brand: string;
  deviceType: DeviceType;
  priceBookItems: ReturnType<typeof useBeharStore.getState>["priceBookItems"];
  deviceModels: ReturnType<typeof useBeharStore.getState>["deviceModels"];
}) {
  const normalizedBrand = compactText(brand);
  const priceBookType = quoteDeviceTypeToPriceBook(deviceType);
  const official =
    deviceCatalog.find(
      (entry) =>
        compactText(entry.brand) === normalizedBrand ||
        entry.aliases.some((alias) => compactText(alias) === normalizedBrand),
    )?.models ?? [];
  const storeModels = deviceModels
    .filter((entry) => entry.deviceType === deviceType)
    .filter((entry) => {
      const entryBrand = catalogDeviceBrands.find((candidate) => candidate.id === entry.brandId)?.name ?? "";
      return !normalizedBrand || compactText(entryBrand) === normalizedBrand;
    })
    .map((entry) => entry.name);
  const catalogModels = priceBookItems
    .filter((entry) => entry.isActive !== false)
    .filter((entry) => entry.typeAppareil === priceBookType)
    .filter((entry) => !normalizedBrand || compactText(entry.marque) === normalizedBrand)
    .map((entry) => entry.modele);
  return Array.from(new Set([...official, ...storeModels, ...catalogModels]))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
}

function ModelTouchSelector({
  brand,
  deviceType,
  value,
  onChange,
}: Readonly<{ brand: string; deviceType: DeviceType; value: string; onChange: (value: string) => void }>) {
  const priceBookItems = useBeharStore((s) => s.priceBookItems);
  const deviceModelsFromStore = useBeharStore((s) => s.deviceModels);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const allOptions = useMemo(() => {
    const all = counterModelOptions({ brand, deviceType, priceBookItems, deviceModels: deviceModelsFromStore });
    return all.slice(0, 120);
  }, [brand, deviceType, priceBookItems, deviceModelsFromStore]);
  const filteredOptions = useMemo(() => {
    const q = compactText(query);
    const filtered = q ? allOptions.filter((entry) => compactText(entry).includes(q)) : allOptions;
    // Recherche active : on remonte beaucoup plus de résultats pour ne jamais
    // « couper » un modèle (ex. Galaxy S22, loin dans la liste Samsung triée).
    const limit = q ? 48 : expanded ? 48 : 12;
    const visible = filtered.slice(0, limit);
    // Le modèle déjà sélectionné reste toujours affiché — même replié et hors des
    // premiers résultats — pour qu'il ne « disparaisse » jamais après sélection.
    if (
      value &&
      !visible.some((entry) => compactText(entry) === compactText(value)) &&
      allOptions.some((entry) => compactText(entry) === compactText(value))
    ) {
      return [value, ...visible];
    }
    return visible;
  }, [allOptions, expanded, query, value]);
  const canCreate = query.trim().length > 0 && !allOptions.some((entry) => compactText(entry) === compactText(query));

  useEffect(() => {
    setQuery("");
    setExpanded(false);
  }, [brand, deviceType]);

  return (
    <div className="space-y-3">
      {brand ? (
        <>
          <CounterInput
            placeholder="Rechercher ou saisir le modèle exact"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
            {filteredOptions.map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => {
                  onChange(entry);
                  setQuery("");
                }}
                className={cn(
                  "relative min-h-[52px] rounded-[14px] border px-3 text-center font-bold text-[13px] transition active:scale-[0.97]",
                  compactText(value) === compactText(entry)
                    ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#1E7A6E]"
                    : "border-[#E8E8E5] bg-white text-[#1D1D1F]",
                )}
              >
                {compactText(value) === compactText(entry) && <Check className="mr-1 inline size-4" />}
                {entry}
              </button>
            ))}
            {canCreate && (
              <button
                type="button"
                onClick={() => onChange(query.trim())}
                className="min-h-[52px] rounded-[14px] border border-dashed border-[#2A9D8F] bg-[#FFFFFF] px-3 font-bold text-[#1E7A6E] text-[13px] transition active:scale-[0.97]"
              >
                Utiliser « {query.trim()} »
              </button>
            )}
          </div>
          {allOptions.length > 12 && !query.trim() && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="h-[44px] w-full rounded-[12px] border border-[#E8E8E5] bg-white font-semibold text-[#1E7A6E] text-sm active:scale-[0.98]"
            >
              {expanded ? "Voir moins de modèles" : "Voir plus de modèles"}
            </button>
          )}
        </>
      ) : (
        <p className="rounded-[12px] bg-white px-3 py-2 text-[#6E6E73] text-xs">
          Choisissez d'abord une marque pour afficher les modèles tactiles.
        </p>
      )}
    </div>
  );
}

function buildCounterTasks(prestations: string[]) {
  const labels = new Set<string>();
  const source = prestations.join(" ").toLowerCase();
  if (source.includes("écran") || source.includes("vitre")) {
    ["Démontage", "Remplacement écran", "Test tactile + affichage", "Test 50 points", "Nettoyage + remontage"].forEach(
      (label) => labels.add(label),
    );
  } else if (source.includes("batterie")) {
    ["Ouverture appareil", "Remplacement batterie", "Test charge", "Test autonomie", "Nettoyage + remontage"].forEach(
      (label) => labels.add(label),
    );
  } else {
    ["Diagnostic", "Intervention", "Test fonctionnel", "Nettoyage + remontage"].forEach((label) => labels.add(label));
  }
  return Array.from(labels).map((label, index) => ({ id: `task_${Date.now()}_${index}`, label, fait: false }));
}

type SubType = {
  id: string;
  label: string;
  keywords: string[];
};

type SelectedPrestation = {
  familyId: string;
  subTypeId: string;
  label: string;
  quality?: PriceBookItem;
};

function CounterIntakeScreen({
  initialStep = 0,
  prefill,
  onClose,
  onCreated,
  onCreateAppointment,
}: Readonly<{
  initialStep?: number;
  prefill?: Partial<Repair>;
  onClose: () => void;
  onCreated: (repairId: string) => void;
  onCreateAppointment: (prefill: CounterAppointmentPrefill) => void;
}>) {
  const store = useBeharStore();
  const prefillAppointment = prefill?.appointmentId
    ? store.appointments.find((appointment) => appointment.id === prefill.appointmentId)
    : undefined;
  const prefillCustomer = prefill?.customerId
    ? store.customers.find((customer) => customer.id === prefill.customerId)
    : undefined;
  const prefillIsCounter = prefillCustomer?.type === "counter";
  const [step, setStep] = useState(initialStep >= 2 ? 2 : 0);
  const [clientMode, setClientMode] = useState<CounterClientMode>(
    prefill?.customerId && !prefillIsCounter ? "existing" : "counter",
  );
  const [existingCustomerId, setExistingCustomerId] = useState(
    prefill?.customerId && !prefillIsCounter ? prefill.customerId : "",
  );
  const [name, setName] = useState(prefillAppointment?.clientName ?? "");
  const [phone, setPhone] = useState(prefillAppointment?.clientPhone ?? "");
  const [email, setEmail] = useState(prefillAppointment?.clientEmail ?? "");
  const allowedMarkets = store.workshopSettings.allowedMarkets || [store.workshopInfo.country];
  const defaultMarket = store.workshopSettings.defaultMarket || store.workshopInfo.country;

  const [billingCountry, setBillingCountry] = useState<WorkshopCountry>(prefill?.billingCountry ?? defaultMarket);
  const billingConfig = getWorkshopCountryConfig(billingCountry);
  const formatDossier = (value: number) => formatCurrency(value, billingConfig.currency);

  useEffect(() => {
    if (allowedMarkets.length === 1 && billingCountry !== allowedMarkets[0]) {
      setBillingCountry(allowedMarkets[0]);
    }
  }, [allowedMarkets, billingCountry]);
  const [deviceType, setDeviceType] = useState<DeviceType>(prefill?.deviceType ?? "Smartphone");
  const [brand, setBrand] = useState(prefill?.brandName ?? "");
  const [model, setModel] = useState(prefill?.deviceModel ?? "");
  const [imei, setImei] = useState(prefill?.imei ?? "");
  const [prestations, setPrestations] = useState<string[]>(prefill?.issue ? [prefill.issue] : []);
  const [price, setPrice] = useState(String(prefill?.amount ?? prefill?.total ?? ""));
  const [accessories, setAccessories] = useState<string[]>([]);
  const [observations, setObservations] = useState(prefill?.notes ?? "");
  const [clientInforme, setClientInforme] = useState(true);
  const [condition, setCondition] = useState<CounterConditionState>(defaultCounterCondition);
  const [autrePrecision, setAutrePrecision] = useState("");
  const [access, setAccess] = useState<CounterAccessValue>("non_communique");
  const [accessCode, setAccessCode] = useState("");
  const [patternPoints, setPatternPoints] = useState<number[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [showAllAccessories, setShowAllAccessories] = useState(false);
  const [photos, setPhotos] = useState<Record<CounterPhotoKey, string>>({
    avant: "",
    arriere: "",
    defaut: "",
    accessoires: "",
  });
  const [signature, setSignature] = useState("");
  // Anti-litige : au moins une photo est requise, sauf décision explicite et
  // volontaire de continuer sans photo (caméra indisponible sur desktop, etc.).
  const [noPhotoConfirmed, setNoPhotoConfirmed] = useState(false);
  const [selectedQualities, setSelectedQualities] = useState<Record<string, PriceBookItem>>({});
  const [activePrestations, setActivePrestations] = useState<SelectedPrestation[]>([]);
  const [prestationPrices, setPrestationPrices] = useState<Record<string, string>>({});
  const [activeFamilyId, setActiveFamilyId] = useState<string>("ecran");
  const [activeSubTypeId, setActiveSubTypeId] = useState<string>("ecran_avant");

  const selectedCustomer = store.customers.find((customer) => customer.id === existingCustomerId);
  const counterCustomer = store.customers.find(
    (customer) => customer.type === "counter" || customer.name.startsWith("Client comptoir"),
  );
  const duplicateCustomer = useMemo(() => {
    if (clientMode !== "new") return undefined;
    const phoneDigits = compactPhone(phone);
    const emailKey = email.trim().toLowerCase();
    if (!phoneDigits && !emailKey) return undefined;
    return store.customers.find(
      (customer) =>
        customer.type !== "counter" &&
        ((phoneDigits && compactPhone(customer.phone) === phoneDigits) ||
          (emailKey && customer.email.trim().toLowerCase() === emailKey)),
    );
  }, [clientMode, email, phone, store.customers]);
  const prestationOptions = useMemo(
    () => counterPrestationOptions(store.priceBookItems, brand, model, deviceType),
    [store.priceBookItems, brand, model, deviceType],
  );
  const addonSuggestions = useMemo(() => addonSuggestionsFor(prestations, model), [prestations, model]);
  const allAddonOptions = useMemo(() => {
    const stockAccessories = store.stockItems.filter(isCounterSaleStockItem).map((item) => ({
      id: `stock_${item.id}`,
      label: item.part || item.name,
      prixClient: item.salePrice ?? 0,
      reason: `Stock · ${item.stock ?? item.quantity ?? 0}`,
    }));
    const presets = counterAccessoryProducts.map((item) => ({
      id: item.id,
      label: item.name,
      prixClient: item.price,
      reason: "Accessoire comptoir",
    }));
    const byLabel = new Map<string, { id: string; label: string; prixClient: number; reason: string }>();
    for (const addon of [...addonSuggestions, ...stockAccessories, ...presets]) {
      const key = compactText(addon.label);
      if (!byLabel.has(key)) byLabel.set(key, addon);
    }
    return Array.from(byLabel.values());
  }, [addonSuggestions, store.stockItems]);
  const addonTotal = allAddonOptions
    .filter((addon) => selectedAddons.includes(addon.id))
    .reduce((sum, addon) => sum + addon.prixClient, 0);
  const baseAmount = toMoney(price);
  const amount = baseAmount + addonTotal;
  const customerLabel =
    clientMode === "new"
      ? name
      : clientMode === "existing"
        ? (selectedCustomer?.name ?? "")
        : name.trim() || "Client comptoir";
  const deviceLabel = [brand, model].filter(Boolean).join(" ");
  const canNext1 = Boolean(model.trim() && prestations.length);
  const canCreateAppointmentFromIntake = Boolean(
    (clientMode === "counter" ||
      (clientMode === "existing" && existingCustomerId) ||
      (clientMode === "new" && name.trim())) &&
      model.trim() &&
      prestations.length,
  );
  const intakeStepLabels = ["Client & appareil", "Détails", "Anti-litige", "Photos & signature", "Récapitulatif"];
  const appointmentPrefillFromIntake = (): CounterAppointmentPrefill => ({
    clientMode,
    customerId:
      clientMode === "existing" ? existingCustomerId : clientMode === "counter" ? counterCustomer?.id : undefined,
    clientName: customerLabel || "Client comptoir",
    clientPhone: clientMode === "existing" ? selectedCustomer?.phone : phone.trim(),
    clientEmail: clientMode === "existing" ? selectedCustomer?.email : email.trim(),
    deviceType,
    brand,
    model,
    device: deviceLabel || model,
    imei: imei.trim(),
    issue: prestations.join(", "),
    price,
    notes: observations.trim(),
  });

  // Synchronise activePrestations, selectedQualities and prestationPrices from prefilled prestations list
  useEffect(() => {
    if (activePrestations.length > 0) return; // Already initialized
    if (!prestations.length || !brand || !model) return;

    const list: SelectedPrestation[] = [];
    const prices: Record<string, string> = {};

    prestations.forEach((prestationStr) => {
      let label = prestationStr;
      let qualityLabel = "";
      if (prestationStr.includes(" — ")) {
        const parts = prestationStr.split(" — ");
        label = parts[0];
        qualityLabel = parts[1];
      }

      // Find family and sub-type
      let foundFamilyId = "";
      let foundSubTypeId = "";
      let foundLabel = label;

      for (const fam of PRESTATION_FAMILIES) {
        for (const sub of fam.subTypes) {
          if (compactText(sub.label) === compactText(label)) {
            foundFamilyId = fam.id;
            foundSubTypeId = sub.id;
            foundLabel = sub.label;
            break;
          }
        }
        if (foundFamilyId) break;
      }

      if (!foundFamilyId) {
        foundFamilyId = "autre";
        foundSubTypeId = "autre_prestation";
      }

      let qualityItem: PriceBookItem | undefined;
      if (foundSubTypeId && qualityLabel) {
        const qualities = getAvailableQualitiesForService(
          foundSubTypeId,
          foundLabel,
          store.priceBookItems,
          brand,
          model,
        );
        qualityItem = qualities.find((q) => (q.qualite || "") === qualityLabel);
      }

      let pPrice = "0";
      if (qualityItem) {
        pPrice = String(qualityItem.prixClientTotal || qualityItem.prixVentePiece || 0);
      } else {
        const catPrice = findCataloguePrice(store.priceBookItems, brand, model, foundLabel);
        if (catPrice > 0) pPrice = String(catPrice);
      }

      list.push({
        familyId: foundFamilyId,
        subTypeId: foundSubTypeId,
        label: foundLabel,
        quality: qualityItem,
      });
      prices[foundSubTypeId] = pPrice;
    });

    if (list.length > 0) {
      setActivePrestations(list);
      setPrestationPrices(prices);
    }
  }, [prestations, brand, model, store.priceBookItems, activePrestations]);

  // Synchronise prestations string array for backwards compatibility
  useEffect(() => {
    const list = activePrestations.map((p) => {
      if (p.quality) {
        return `${p.label} — ${p.quality.qualite || "Standard"}`;
      }
      return p.label;
    });
    setPrestations(list);
  }, [activePrestations]);

  // Compute total base amount when active prestations or customized prices change
  useEffect(() => {
    const total = Object.entries(prestationPrices)
      .filter(([subTypeId]) => activePrestations.some((ap) => ap.subTypeId === subTypeId))
      .reduce((sum, [_, val]) => sum + (parseFloat(val) || 0), 0);
    if (total > 0) {
      setPrice(String(total));
    }
  }, [prestationPrices, activePrestations]);

  const togglePrestationSelection = (familyId: string, sub: SubType) => {
    setActivePrestations((prev) => {
      const existing = prev.find((ap) => ap.subTypeId === sub.id);
      if (existing) {
        const next = prev.filter((ap) => ap.subTypeId !== sub.id);
        setPrestationPrices((prevPrices) => {
          const nextPrices = { ...prevPrices };
          delete nextPrices[sub.id];
          return nextPrices;
        });
        return next;
      }
      const defaultPrice = findCataloguePrice(store.priceBookItems, brand, model, sub.label);
      const qualities = getAvailableQualitiesForService(sub.id, sub.label, store.priceBookItems, brand, model);
      const qualityItem = qualities.length === 1 ? qualities[0] : undefined;

      const resolvedPrice = qualityItem
        ? String(qualityItem.prixClientTotal || qualityItem.prixVentePiece || 0)
        : defaultPrice > 0
          ? String(defaultPrice)
          : "";

      setPrestationPrices((prevPrices) => ({
        ...prevPrices,
        [sub.id]: resolvedPrice,
      }));

      return [
        ...prev,
        {
          familyId,
          subTypeId: sub.id,
          label: sub.label,
          quality: qualityItem,
        },
      ];
    });
  };

  const selectQualityForSubType = (subTypeId: string, qItem: PriceBookItem) => {
    setActivePrestations((prev) =>
      prev.map((ap) => {
        if (ap.subTypeId === subTypeId) {
          return { ...ap, quality: qItem };
        }
        return ap;
      }),
    );
    setPrestationPrices((prev) => ({
      ...prev,
      [subTypeId]: String(qItem.prixClientTotal || qItem.prixVentePiece || 0),
    }));
  };

  const resolveIntakeCustomerId = () => {
    let customerId = "";
    if (clientMode === "counter") {
      customerId =
        store.customers.find((customer) => customer.type === "counter")?.id ??
        store.addCustomer({ name: "Client comptoir", type: "counter" });
    } else if (clientMode === "existing") {
      if (!existingCustomerId) {
        toast.error("Sélectionnez un client.");
        return "";
      }
      customerId = existingCustomerId;
    } else {
      if (!name.trim()) {
        toast.error("Indiquez le nom du client.");
        return "";
      }
      if (duplicateCustomer) {
        setExistingCustomerId(duplicateCustomer.id);
        setClientMode("existing");
        toast.success(`Client existant repris : ${duplicateCustomer.name}`);
        return duplicateCustomer.id;
      }
      customerId = store.addCustomer({ name: name.trim(), phone: phone.trim(), email: email.trim() });
      if (customerId) {
        setExistingCustomerId(customerId);
        setClientMode("existing");
      }
    }
    return customerId;
  };

  const save = (options: { draft?: boolean } = {}) => {
    const customerId = resolveIntakeCustomerId();
    if (!customerId || typeof customerId !== "string") return "";
    if (!signature && !options.draft) {
      toast.error("La signature est obligatoire pour créer une prise en charge validée.");
      return "";
    }
    const hasIntakePhoto = Object.values(photos).some(Boolean);
    if (!hasIntakePhoto && !noPhotoConfirmed && !options.draft) {
      toast.error("Ajoutez au moins une photo ou confirmez « Continuer sans photo ».");
      return "";
    }
    const now = new Date().toISOString();
    const isDraft = options.draft === true;
    const signedMetadata = signature
      ? {
          signatureDataUrl: signature,
          signatureSignedAt: now,
          signedAt: now,
          signerName: customerLabel,
          signedBy: customerLabel,
        }
      : {};
    const designations = activePrestations.map((ap) => {
      if (ap.quality) {
        return `${ap.label} — ${ap.quality.qualite || "Standard"}`;
      }
      return ap.label;
    });
    const issueText = designations.join(", ") || prestations.join(", ");

    const counterPrestationsList = [
      ...activePrestations.map((ap) => {
        const q = ap.quality;
        const labelWithQuality = q ? `${ap.label} — ${q.qualite || "Standard"}` : ap.label;
        const priceVal = parseFloat(prestationPrices[ap.subTypeId] || "0");
        return { label: labelWithQuality, prixClient: priceVal };
      }),
      ...allAddonOptions
        .filter((addon) => selectedAddons.includes(addon.id))
        .map((addon) => ({ label: addon.label, prixClient: addon.prixClient })),
    ];

    const repairPartsList: RepairPart[] = activePrestations
      .filter((ap) => ap.quality !== undefined)
      .map((ap) => {
        const q = ap.quality!;
        return {
          stockItemId: q.stockItemId || q.id,
          name: `${q.piece || ap.label} ${brand} ${model} — ${q.qualite || "Standard"}`,
          reference: q.id,
          sku: q.sku,
          categoryName: ap.subTypeId,
          purchasePrice: q.prixAchat || 0,
          salePrice: q.prixClientTotal || q.prixVentePiece || 0,
          quantity: 1,
          confirmed: false,
          supplier: q.fournisseur,
          modelName: model,
          modelId: q.modele,
        };
      });

    const repairPayload: Parameters<typeof store.addRepair>[0] = {
      customerId,
      billingCountry,
      currency: billingConfig.currency,
      locale: billingConfig.locale,
      appointmentId: prefill?.appointmentId,
      device: deviceLabel || model,
      issue: issueText,
      status: "Reçu" as const,
      amount,
      total: amount,
      notes: observations.trim(),
      droppedAt: now,
      technician: "",
      deviceType,
      brandName: brand,
      deviceModel: model,
      imei: imei.trim(),
      history: [
        isDraft ? "Brouillon de prise en charge enregistré au comptoir" : "Dossier créé au comptoir",
        ...(!isDraft && !hasIntakePhoto ? ["Prise en charge validée sans photo."] : []),
      ],
      counterPrestations: counterPrestationsList,
      counterTasks: buildCounterTasks(prestations),
      counterPieces: [],
      parts: repairPartsList,
      repairSaleLines: allAddonOptions
        .filter((addon) => selectedAddons.includes(addon.id))
        .map((addon) => ({
          id: `addon_${Date.now()}_${addon.id}`,
          stockItemId: addon.id,
          name: addon.label,
          quantity: 1,
          unitPrice: addon.prixClient,
          total: addon.prixClient,
          status: "confirmed" as const,
          addedAt: now,
        })),
      intakeCondition: {
        generalCondition:
          condition.etatGeneral === "ok" ? "Bon" : condition.etatGeneral === "abime" ? "Abîmé" : "Non renseigné",
        screenState: condition.ecran === "ok" ? "Intact" : condition.ecran === "abime" ? "Fissuré" : "Non renseigné",
        frameState: condition.chassis === "ok" ? "Bon état" : condition.chassis === "abime" ? "Chocs" : "Non renseigné",
        chargingState: condition.batterie === "ok" ? "Charge OK" : "Non renseigné",
        camerasState: condition.cameras === "ok" ? "OK" : "Non renseigné",
        buttonsState: condition.boutons === "ok" ? "OK" : "Non renseigné",
        audioState: condition.micro === "ok" ? "OK" : "Non renseigné",
        chargingPortState: condition.connecteur === "ok" ? "OK" : "Non renseigné",
        biometricState: condition.faceTouchId === "ok" ? "OK" : "Non renseigné",
        networkState: condition.reseauSim === "ok" ? "OK" : "Non renseigné",
        accessMethod: accessLabel(access) as RepairIntakeCondition["accessMethod"],
        accessCode: access === "pin" || access === "mot_de_passe" ? accessCode.trim() : undefined,
        patternData:
          access === "schema" && patternPoints.length
            ? { points: patternPoints, label: patternPoints.join("-") }
            : undefined,
        accessories,
        visibleDefects: autrePrecision,
        customerStatement: clientInforme ? "Client informé" : "Client non informé",
        photos: Object.entries(photos)
          .filter(([, value]) => value)
          .map(([key, value]) => ({ id: key, name: key, dataUrl: value, createdAt: now })),
        ...signedMetadata,
        customerConfirmed: !isDraft && Boolean(signature),
        createdAt: now,
        updatedAt: now,
      },
    };
    const existingRepairId = prefill?.id && store.repairs.some((repair) => repair.id === prefill.id) ? prefill.id : "";
    const repairId = existingRepairId || store.addRepair(repairPayload);
    if (!repairId) {
      toast.error("Impossible de créer le dossier.");
      return "";
    }
    if (existingRepairId) {
      store.updateRepair(existingRepairId, {
        ...repairPayload,
        history: [
          ...(store.repairs.find((repair) => repair.id === existingRepairId)?.history ?? []),
          isDraft
            ? "Brouillon de prise en charge mis à jour au comptoir"
            : "Prise en charge complétée depuis le comptoir",
        ],
      });
    }
    // Le bon de prise en charge (doc_intake_${repairId}) est déjà généré par
    // store.addRepair — on ne crée pas de second document intake en double.
    toast.success(
      isDraft
        ? "Brouillon de prise en charge enregistré."
        : existingRepairId
          ? "Prise en charge mise à jour."
          : "Prise en charge créée.",
    );
    onCreated(repairId);
    return repairId;
  };

  const saveAndPrint = () => {
    const repairId = save();
    if (!repairId) return;
    if (!printDocument({ id: `doc_intake_${repairId}`, type: "intake" }))
      toast.error("Bon de prise en charge introuvable.");
  };

  const saveAndShareTracking = () => {
    const repairId = save();
    if (!repairId) return;
    const repair = useBeharStore.getState().repairs.find((entry) => entry.id === repairId);
    const access = repair?.publicAccess ?? useBeharStore.getState().ensureRepairPublicAccess(repairId);
    if (access?.url) void shareCounterLink(publicAbsoluteUrl(access.url), "Lien de suivi copié pour le client.");
  };

  return (
    <div className="mx-auto max-w-[1180px]">
      <h1 className="font-black text-[32px] tracking-tight">Nouvelle prise en charge</h1>
      <p className="mt-1 text-[#6E6E73]">Créer un dossier rapidement.</p>
      <CounterStepper steps={intakeStepLabels} current={step} onStep={(next) => setStep(next)} />

      {step === 0 && (
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-4 rounded-[20px] border border-[#E8E8E5] bg-white p-5">
            {allowedMarkets.length > 1 && (
              <div className="rounded-[16px] border border-[#DDEFEA] bg-[#FFFFFF] p-4">
                <p className="font-bold text-[14px]">Pays de facturation / marché</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {allowedMarkets.map((country) => (
                    <SelectTile
                      key={country}
                      active={billingCountry === country}
                      onClick={() => setBillingCountry(country)}
                    >
                      {country === "CH" ? "Suisse · CHF" : "France · EUR"}
                    </SelectTile>
                  ))}
                </div>
              </div>
            )}
            <h2 className="font-bold">1. Client</h2>
            <div className="grid grid-cols-3 gap-3">
              <SelectTile active={clientMode === "counter"} onClick={() => setClientMode("counter")}>
                <User className="size-5" />
                Client comptoir
              </SelectTile>
              <SelectTile active={clientMode === "new"} onClick={() => setClientMode("new")}>
                <User className="size-5" />
                Nouveau client
              </SelectTile>
              <SelectTile active={clientMode === "existing"} onClick={() => setClientMode("existing")}>
                <Users className="size-5" />
                Client existant
              </SelectTile>
            </div>
            {clientMode === "counter" && (
              <div className="rounded-[14px] border border-[#DDEFEA] bg-[#FFFFFF] px-4 py-3 text-sm font-semibold text-[#1E7A6E]">
                Client comptoir sélectionné pour une prise en charge rapide.
              </div>
            )}
            {clientMode === "new" && (
              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <CounterInput placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} />
                  <CounterInput placeholder="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <CounterInput
                    placeholder="Email (optionnel)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {duplicateCustomer ? (
                  <div className="flex flex-col gap-3 rounded-[14px] border border-[#D7EFEA] bg-[#FFFFFF] p-3 text-sm md:flex-row md:items-center md:justify-between">
                    <span className="text-[#1A1916]">
                      <b>Client déjà connu</b>
                      <span className="block text-[#6B6B6B]">
                        {duplicateCustomer.name}
                        {duplicateCustomer.phone ? ` · ${duplicateCustomer.phone}` : ""}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setExistingCustomerId(duplicateCustomer.id);
                        setClientMode("existing");
                      }}
                      className="h-10 rounded-[12px] bg-[#2A9D8F] px-4 font-bold text-white active:scale-[0.98]"
                    >
                      Reprendre ce client
                    </button>
                  </div>
                ) : null}
              </div>
            )}
            {clientMode === "existing" && (
              <ExistingCustomerSearch value={existingCustomerId} onChange={setExistingCustomerId} />
            )}
            <h2 className="pt-2 font-bold">2. Appareil</h2>
            <div className="grid grid-cols-4 gap-3">
              {counterTypes.map((type) => (
                <ChipButton key={type} active={deviceType === type} onClick={() => setDeviceType(type)}>
                  {type}
                </ChipButton>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
              {counterBrands.map((entry) => (
                <ChipButton key={entry} active={brand === entry} onClick={() => setBrand(entry)}>
                  {entry}
                </ChipButton>
              ))}
            </div>
            <ModelTouchSelector brand={brand} deviceType={deviceType} value={model} onChange={setModel} />
            <CounterInput
              placeholder="IMEI / numéro de série (optionnel)"
              inputMode="numeric"
              value={imei}
              onChange={(e) => setImei(e.target.value)}
            />
            <div className="flex items-center gap-3 pt-2">
              <div className="flex size-7 shrink-0 place-items-center justify-center rounded-full bg-[#1E7A6E] text-[13px] font-black text-white">
                3
              </div>
              <div>
                <h2 className="font-bold text-[#1A1916] text-[16px] leading-tight">Problème / Prestation</h2>
                <p className="text-[12px] text-[#6B6B6B] mt-0.5">Sélectionnez une catégorie puis une prestation</p>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-5 items-stretch mt-4 min-h-[480px]">
              {/* Left Column - Prestation Families */}
              <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 shrink-0 lg:w-[220px] scrollbar-none">
                {PRESTATION_FAMILIES.map((family) => {
                  const Icon = family.icon;
                  const isSelected = activeFamilyId === family.id;
                  const count = activePrestations.filter((ap) => ap.familyId === family.id).length;
                  return (
                    <button
                      key={family.id}
                      type="button"
                      onClick={() => {
                        setActiveFamilyId(family.id);
                        if (family.subTypes.length === 1) {
                          setActiveSubTypeId(family.subTypes[0].id);
                        } else {
                          setActiveSubTypeId("");
                        }
                      }}
                      className={cn(
                        "relative flex items-center justify-between gap-3 rounded-[14px] border p-3 lg:p-4 text-left transition active:scale-[0.98] shrink-0 min-w-[130px] lg:min-w-0 lg:w-full",
                        isSelected
                          ? "border-[#2A9D8F] bg-[#E6F4F1] text-[#1E7A6E]"
                          : "border-[#E8E8E5] bg-white hover:border-[#D0D0CD] text-[#1A1916]",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "grid size-9 shrink-0 place-items-center rounded-[10px] transition",
                            isSelected ? "bg-[#1E7A6E] text-white" : "bg-[#FAFAF8] text-[#6B6B6B]",
                          )}
                        >
                          <Icon className="size-4.5" />
                        </div>
                        <span className="font-bold text-[14px]">{family.label}</span>
                      </div>
                      {count > 0 && (
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#2A9D8F] text-[11px] font-black text-white ml-2">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Right Column - Dynamic Details Panel */}
              <div className="flex-1 rounded-[18px] border border-[#E8E8E5] bg-white p-5 lg:p-6 shadow-sm flex flex-col justify-between">
                {activeFamilyId ? (
                  (() => {
                    const family = PRESTATION_FAMILIES.find((f) => f.id === activeFamilyId)!;
                    const subType = family.subTypes.find((s) => s.id === activeSubTypeId);

                    return (
                      <div className="space-y-5 flex-1 flex flex-col justify-between">
                        <div>
                          {/* Title & Subtext */}
                          <div>
                            <h3 className="text-[17px] font-black text-[#1A1916]">{family.label}</h3>
                            <p className="text-[12px] text-[#6B6B6B] mt-0.5">
                              {family.id === "ecran"
                                ? "Choisissez le type de réparation écran"
                                : family.id === "batterie"
                                  ? "Choisissez la batterie à remplacer"
                                  : family.id === "cameras"
                                    ? "Choisissez la caméra à réparer"
                                    : family.id === "audio"
                                      ? "Choisissez le composant audio"
                                      : "Sélectionnez le type de service"}
                            </p>
                          </div>

                          {/* Step 1: Subtype choices (only show if family has > 1 subType) */}
                          {family.subTypes.length >= 1 && (
                            <div className="mt-4">
                              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8A8A8A] mb-2">
                                Étape 1 : type de réparation
                              </label>
                              <div className="grid grid-cols-2 gap-3">
                                {family.subTypes.map((sub) => {
                                  const isSubSelected = activePrestations.some((ap) => ap.subTypeId === sub.id);
                                  const isSubActive = activeSubTypeId === sub.id;
                                  return (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      onClick={() => {
                                        setActiveSubTypeId(sub.id);
                                        togglePrestationSelection(family.id, sub);
                                      }}
                                      className={cn(
                                        "flex items-center gap-3 w-full rounded-[14px] border p-4 text-left transition active:scale-[0.98]",
                                        isSubActive
                                          ? "border-[#2A9D8F] bg-white ring-1 ring-[#2A9D8F]"
                                          : isSubSelected
                                            ? "border-[#E8E8E5] bg-[#FAFAF8] text-[#1E7A6E]"
                                            : "border-[#E8E8E5] bg-white hover:border-[#D0D0CD]",
                                      )}
                                    >
                                      <div
                                        className={cn(
                                          "grid size-5 shrink-0 place-items-center rounded-full border transition",
                                          isSubSelected
                                            ? "border-[#2A9D8F] bg-[#2A9D8F] text-white"
                                            : "border-[#C7C7C2] bg-white",
                                        )}
                                      >
                                        {isSubSelected && <Check className="size-3" />}
                                      </div>
                                      <span className="font-bold text-[13px] text-[#1A1916]">{sub.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Step 2: Quality & Details (Only show if activeSubTypeId is set) */}
                          {subType &&
                            (() => {
                              const isSubSelected = activePrestations.some((ap) => ap.subTypeId === subType.id);
                              const selectedQual = activePrestations.find((ap) => ap.subTypeId === subType.id)?.quality;
                              const qualities = getAvailableQualitiesForService(
                                subType.id,
                                subType.label,
                                store.priceBookItems,
                                brand,
                                model,
                              );
                              const currentPriceVal = prestationPrices[subType.id] ?? "";

                              return (
                                <div className="mt-5 space-y-4">
                                  {isSubSelected ? (
                                    <>
                                      {/* Qualities Grid */}
                                      {qualities.length > 0 && (
                                        <div>
                                          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8A8A8A] mb-2.5">
                                            Étape 2 : Qualité de la pièce
                                          </label>
                                          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                                            {qualities.map((q) => {
                                              const isQualSelected = selectedQual?.id === q.id;
                                              const stockCount = q.stockDisponible ?? 0;
                                              const cardPrice = q.prixClientTotal || q.prixVentePiece || 0;
                                              return (
                                                <button
                                                  key={q.id}
                                                  type="button"
                                                  onClick={() => selectQualityForSubType(subType.id, q)}
                                                  className={cn(
                                                    "flex flex-col rounded-[14px] border p-4 text-left transition active:scale-[0.97] bg-white shadow-sm",
                                                    isQualSelected
                                                      ? "border-[#2A9D8F] ring-1 ring-[#2A9D8F]"
                                                      : "border-[#E8E8E5] hover:border-[#D0D0CD]",
                                                  )}
                                                >
                                                  <span className="font-black text-[#1A1916] text-[14px]">
                                                    {q.qualite || "Standard"}
                                                  </span>
                                                  <span className="mt-1 text-[#1E7A6E] font-black text-[15px] tabular-nums">
                                                    {cardPrice > 0 ? formatDossier(cardPrice) : "Prix à saisir"}
                                                  </span>
                                                  <div className="mt-3 flex flex-col gap-0.5 text-[11px] text-[#6B6B6B] border-t border-[#FAFAF8] pt-2">
                                                    <span className="font-bold">
                                                      {stockCount > 0 ? `En stock : ${stockCount}` : "Stock à vérifier"}
                                                    </span>
                                                    {q.sku && (
                                                      <span className="font-mono text-[9px]">SKU : {q.sku}</span>
                                                    )}
                                                  </div>
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}

                                      {/* Price Input Field */}
                                      <div className="pt-2">
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8A8A8A] mb-2">
                                          Étape 3 : Prix client pour {subType.label}
                                        </label>
                                        <div className="relative max-w-xs">
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="Prix à saisir"
                                            value={currentPriceVal}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setPrestationPrices((prev) => ({
                                                ...prev,
                                                [subType.id]: val,
                                              }));
                                            }}
                                            className="w-full h-12 rounded-[14px] border border-[#E8E8E5] bg-white pl-4 pr-10 text-[15px] font-bold text-[#1A1916] placeholder-[#B2B2AE] focus:border-[#2A9D8F] focus:outline-none transition shadow-sm"
                                          />
                                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-bold text-[#8A8A8A]">
                                            €
                                          </span>
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="rounded-[14px] border border-dashed border-[#E8E8E5] p-5 text-center bg-[#FAFAF8] mt-3">
                                      <p className="text-[13px] font-bold text-[#6B6B6B]">
                                        Cliquez sur « {subType.label} » ci-dessus pour activer cette prestation.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                        </div>

                        {/* Step 4: Summary of selected items */}
                        {activePrestations.length > 0 && (
                          <div className="mt-6 border-t border-[#E8E8E5] pt-5">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#8A8A8A] mb-3">
                              Prestations sélectionnées
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {activePrestations.map((ap) => {
                                const priceVal = prestationPrices[ap.subTypeId] || "";
                                return (
                                  <div
                                    key={ap.subTypeId}
                                    className="flex items-center justify-between gap-3 rounded-[14px] bg-[#FAFAF8] border border-[#E8E8E5] p-3 shadow-sm"
                                  >
                                    <div className="min-w-0">
                                      <span className="block font-black text-[13px] text-[#1A1916] truncate">
                                        {ap.label}
                                      </span>
                                      {ap.quality && (
                                        <span className="block text-[11px] text-[#2A9D8F] font-black mt-0.5">
                                          {ap.quality.qualite || "Standard"}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                      <span className="text-[13px] font-black text-[#1E7A6E] tabular-nums">
                                        {priceVal ? `${priceVal} €` : "Prix à saisir"}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const fam = PRESTATION_FAMILIES.find((f) => f.id === ap.familyId);
                                          const sub = fam?.subTypes.find((s) => s.id === ap.subTypeId);
                                          if (fam && sub) {
                                            togglePrestationSelection(fam.id, sub);
                                          }
                                        }}
                                        className="grid size-7 place-items-center rounded-full text-[#C7493B] hover:bg-[#FDF2F0] transition"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-[#6B6B6B]">
                    <Smartphone className="size-10 mb-3 text-[#B2B2AE] stroke-1" />
                    <span className="font-bold text-[14px]">Aucune catégorie sélectionnée</span>
                    <span className="text-[12px] mt-1">Choisissez une catégorie à gauche pour commencer.</span>
                  </div>
                )}
              </div>
            </div>
          </section>
          <MoneySummary
            amount={amount}
            lines={[
              { label: "Client", value: customerLabel },
              { label: "Appareil", value: model },
              { label: "Problème", value: prestations.join(", ") },
              { label: "Accessoires", value: accessories.join(", ") },
              {
                label: "Vente +",
                value: allAddonOptions
                  .filter((addon) => selectedAddons.includes(addon.id))
                  .map((addon) => addon.label)
                  .join(", "),
              },
            ]}
            showPriceCard={false}
            footer={
              <button
                type="button"
                disabled={!canCreateAppointmentFromIntake}
                onClick={() => onCreateAppointment(appointmentPrefillFromIntake())}
                className={cn(
                  "inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-[14px] font-black transition active:scale-[0.98]",
                  canCreateAppointmentFromIntake
                    ? "border border-[#2A9D8F] bg-[#2A9D8F] text-white shadow-[0_12px_22px_rgba(42,157,143,0.18)]"
                    : "cursor-not-allowed bg-[#FFFFFF] text-white",
                )}
              >
                <CalendarPlus className="size-5" /> Créer rendez-vous
              </button>
            }
          />
          <div className="lg:col-span-2 grid grid-cols-[160px_1fr] gap-4">
            <button
              type="button"
              onClick={onClose}
              className="h-[52px] rounded-[14px] border border-[#E8E8E5] bg-white font-semibold"
            >
              Retour
            </button>
            <button
              type="button"
              disabled={!canNext1}
              onClick={() => setStep(1)}
              className={cn("h-[52px] rounded-[14px] font-bold text-white", canNext1 ? "bg-[#2A9D8F]" : "bg-[#FFFFFF]")}
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-5 rounded-[20px] border border-[#E8E8E5] bg-white p-5">
            <h2 className="font-bold">Accessoires confiés</h2>
            <div className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-4">
              {intakeAccessories.map((entry) => (
                <SelectTile
                  key={entry}
                  active={accessories.includes(entry)}
                  onClick={() =>
                    setAccessories((prev) =>
                      prev.includes(entry) ? prev.filter((x) => x !== entry) : [...prev, entry],
                    )
                  }
                >
                  {entry}
                </SelectTile>
              ))}
            </div>
            <section className="rounded-[16px] border border-[#E8E8E5] bg-white p-4">
              <h2 className="font-bold">Déverrouillage / accès appareil</h2>
              <div className="mt-4 grid grid-cols-3 gap-3 lg:grid-cols-6">
                {(
                  ["non_communique", "aucun", "pin", "mot_de_passe", "schema", "biometrie"] as CounterAccessValue[]
                ).map((entry) => (
                  <SelectTile
                    key={entry}
                    active={access === entry}
                    onClick={() => {
                      setAccess(entry);
                      if (entry !== "schema") setPatternPoints([]);
                      if (entry !== "pin" && entry !== "mot_de_passe") setAccessCode("");
                    }}
                  >
                    {accessLabel(entry)}
                  </SelectTile>
                ))}
              </div>
              {(access === "pin" || access === "mot_de_passe") && (
                <div className="mt-4 grid grid-cols-[180px_1fr] items-center gap-4 rounded-[16px] bg-[#FFFFFF] p-4">
                  <span className="font-semibold">{access === "pin" ? "Code PIN" : "Mot de passe"}</span>
                  {access === "pin" ? (
                    <PinPad value={accessCode} onChange={setAccessCode} />
                  ) : (
                    <CounterInput
                      placeholder="Mot de passe communiqué"
                      value={accessCode}
                      onChange={(event) => setAccessCode(event.target.value)}
                    />
                  )}
                </div>
              )}
              {access === "schema" && (
                <div className="mt-4 rounded-[16px] bg-[#FFFFFF] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-semibold">Dessiner le schéma</span>
                    <button
                      type="button"
                      onClick={() => setPatternPoints([])}
                      className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white px-3 font-semibold text-[#C7493B]"
                    >
                      <RotateCcw className="size-4" /> Refaire
                    </button>
                  </div>
                  <PatternGrid value={patternPoints} onChange={setPatternPoints} />
                </div>
              )}
            </section>
            <div className="mt-5 rounded-[16px] border border-[#DDEFEA] bg-[#FFFFFF] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-[#1D1D1F]">Vente additionnelle à proposer</h3>
                  <p className="mt-1 text-[#6E6E73] text-sm">
                    Si le client parle d'accessoires, propose en priorité la protection adaptée.
                  </p>
                  <p className="mt-1 text-[#6E6E73] text-[12px] font-medium">
                    Options proposées — non incluses tant qu'elles ne sont pas sélectionnées.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllAccessories(true)}
                  className="grid size-[52px] shrink-0 place-items-center rounded-[14px] border border-[#2A9D8F] bg-white text-[#1E7A6E] transition active:scale-[0.96]"
                  title="Tous les accessoires"
                >
                  <ShoppingBag className="size-6" />
                </button>
              </div>
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {addonSuggestions.map((addon) => (
                  <button
                    key={addon.id}
                    onClick={() =>
                      setSelectedAddons((prev) =>
                        prev.includes(addon.id) ? prev.filter((entry) => entry !== addon.id) : [...prev, addon.id],
                      )
                    }
                    type="button"
                    className={cn(
                      "relative min-h-[112px] w-[180px] shrink-0 rounded-[14px] border bg-white p-4 text-left transition active:scale-[0.97]",
                      selectedAddons.includes(addon.id)
                        ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#1E7A6E]"
                        : "border-[#E8E8E5] text-[#1D1D1F]",
                    )}
                  >
                    {selectedAddons.includes(addon.id) && (
                      <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-[#2A9D8F] text-white">
                        <Check className="size-3.5" />
                      </span>
                    )}
                    <span className="block pr-6 font-bold text-[14px]">{addon.label}</span>
                    <span className="mt-2 block text-[#1E7A6E] text-[15px] font-black tabular-nums">
                      {formatDossier(addon.prixClient)}
                    </span>
                    <span className="mt-2 block text-[#6E6E73] text-[11px] font-medium">{addon.reason}</span>
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[#6E6E73] text-[11px]">Glissez horizontalement pour proposer plus d'options.</p>
            </div>
            {showAllAccessories && (
              <AccessoryDrawer
                options={allAddonOptions}
                selected={selectedAddons}
                onToggle={(id) =>
                  setSelectedAddons((prev) =>
                    prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id],
                  )
                }
                onClose={() => setShowAllAccessories(false)}
              />
            )}
            <div className="mt-5">
              <CounterTextarea
                placeholder="Observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
              />
            </div>
            <div className="mt-4 flex items-center gap-2 font-semibold">
              Client informé{" "}
              <ChipButton active={clientInforme} onClick={() => setClientInforme(true)}>
                Oui
              </ChipButton>
              <ChipButton active={!clientInforme} onClick={() => setClientInforme(false)}>
                Non
              </ChipButton>
            </div>
          </section>
          <MoneySummary
            amount={amount}
            lines={[
              { label: "Client", value: customerLabel },
              { label: "Appareil", value: model },
              { label: "Problème", value: prestations.join(", ") },
              { label: "Accessoires", value: accessories.join(", ") },
              {
                label: "Vente +",
                value: allAddonOptions
                  .filter((addon) => selectedAddons.includes(addon.id))
                  .map((addon) => addon.label)
                  .join(", "),
              },
            ]}
          />
          <div className="lg:col-span-2 grid grid-cols-[180px_1fr] gap-4">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="h-[52px] rounded-[14px] border border-[#E8E8E5] bg-white font-semibold"
            >
              Retour
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="h-[52px] rounded-[14px] bg-[#2A9D8F] font-bold text-white"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3 rounded-[14px] border border-[#E8E8E5] bg-white p-4 text-[13px]">
            <b>
              Client
              <br />
              {customerLabel}
            </b>
            <b>
              Appareil
              <br />
              {deviceLabel}
            </b>
            <b>
              Intervention
              <br />
              {prestations.join(", ")}
            </b>
            <b>
              Prix client
              <br />
              {formatDossier(amount)}
            </b>
          </div>
          <section className="rounded-[20px] border border-[#E8E8E5] bg-white p-5">
            <h2 className="font-bold">État de l'appareil</h2>
            <div className="mt-4 grid gap-x-7 gap-y-3 lg:grid-cols-2">
              {conditionRows.map((row) => (
                <ConditionRow
                  key={row.key}
                  label={row.label}
                  value={condition[row.key]}
                  onChange={(value) => setCondition((prev) => ({ ...prev, [row.key]: value }))}
                />
              ))}
            </div>
            <div className="mt-5 grid grid-cols-[220px_1fr] items-center gap-4">
              <span className="text-[#6E6E73] text-sm">Autre précision (optionnel)</span>
              <CounterInput value={autrePrecision} onChange={(e) => setAutrePrecision(e.target.value)} />
            </div>
          </section>
          <div className="grid grid-cols-[180px_1fr] gap-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="h-[52px] rounded-[14px] border border-[#E8E8E5] bg-white font-semibold"
            >
              Retour
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="h-[52px] rounded-[14px] bg-[#2A9D8F] font-bold text-white"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {step === 3 &&
        (() => {
          const hasIntakePhoto = Object.values(photos).some(Boolean);
          const photoRequirementMet = hasIntakePhoto || noPhotoConfirmed;
          const canContinue = Boolean(signature) && photoRequirementMet;
          return (
            <div className="space-y-5">
              <div className="grid grid-cols-4 gap-4">
                {(["avant", "arriere", "defaut", "accessoires"] as CounterPhotoKey[]).map((key) => (
                  <PhotoCaptureCard
                    key={key}
                    title={
                      {
                        avant: "Avant",
                        arriere: "Arrière",
                        defaut: "Défaut visible",
                        accessoires: "Accessoires fournis",
                      }[key]
                    }
                    value={photos[key]}
                    onChange={(value) => {
                      setPhotos((prev) => ({ ...prev, [key]: value }));
                      if (value) setNoPhotoConfirmed(false);
                    }}
                  />
                ))}
              </div>
              {!hasIntakePhoto && (
                <section className="rounded-[16px] border border-[#E8E8E5] bg-white p-5">
                  <p className="font-bold text-[#1D1D1F]">Photo anti-litige requise</p>
                  <p className="mt-1 text-[#6B6B6B] text-sm">
                    Au moins une photo protège l'atelier et le client en cas de litige. Sur mobile ou tablette,
                    privilégiez la prise de photo.
                  </p>
                  {noPhotoConfirmed ? (
                    <p className="mt-3 inline-flex items-center gap-2 rounded-[12px] bg-[#FFFFFF] px-3 py-2 font-semibold text-[#1E7A6E] text-sm">
                      <Check className="size-4" /> Vous continuez sans photo — mention ajoutée au dossier.
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setNoPhotoConfirmed(true)}
                      className="mt-3 h-[44px] rounded-[12px] border border-[#E8E8E5] bg-white px-4 font-semibold text-[#6B6B6B] active:scale-[0.98]"
                    >
                      Continuer sans photo
                    </button>
                  )}
                </section>
              )}
              <section className="rounded-[20px] border border-[#E8E8E5] bg-white p-5">
                <h2 className="font-bold">Signature du client</h2>
                <SignaturePad value={signature} onChange={setSignature} />
              </section>
              <div className="grid grid-cols-[140px_1fr] gap-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="h-[52px] rounded-[14px] border border-[#E8E8E5] bg-white font-semibold"
                >
                  Retour
                </button>
                <button
                  type="button"
                  disabled={!canContinue}
                  onClick={() => setStep(4)}
                  className={cn(
                    "h-[52px] rounded-[14px] font-bold text-white",
                    canContinue ? "bg-[#2A9D8F]" : "bg-[#FFFFFF]",
                  )}
                >
                  Continuer
                </button>
              </div>
            </div>
          );
        })()}

      {step === 4 && (
        <section className="ml-auto max-w-[720px] rounded-[20px] border border-[#E8E8E5] bg-white p-7 shadow-[0_10px_30px_rgba(29,29,31,0.04)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[#6E6E73] text-sm">Dossier</p>
              <h2 className="mt-1 font-black text-[26px]">R-{new Date().getFullYear()}-XXXX</h2>
              <StatusPillCounter tone="green">Prête à valider</StatusPillCounter>
            </div>
            <button
              type="button"
              onClick={() => setStep(0)}
              className="h-11 rounded-[14px] border border-[#E8E8E5] px-4 font-semibold"
            >
              Modifier
            </button>
          </div>
          <dl className="mt-6 divide-y divide-[#E8E8E5]">
            {[
              ["Client", `${customerLabel}${phone ? `\n${phone}` : ""}`],
              ["Appareil", model],
              ["Intervention", prestations.join(", ")],
              ["Accessoires", accessories.join(", ") || "Aucun"],
              [
                "Vente additionnelle",
                addonSuggestions
                  .filter((addon) => selectedAddons.includes(addon.id))
                  .map((addon) => addon.label)
                  .join(", ") || "Aucune",
              ],
              [
                "Accès",
                `${accessLabel(access)}${accessCode ? ` · ${accessCode}` : patternPoints.length ? ` · schéma ${patternPoints.join("-")}` : ""}`,
              ],
              [
                "État",
                conditionRows
                  .filter((row) => condition[row.key] !== "ok")
                  .map((row) => `${row.label} : ${conditionLabel(condition[row.key])}`)
                  .join(", ") || "OK",
              ],
              ["Signature", "Signée"],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[150px_1fr] gap-4 py-4">
                <dt className="font-bold">{label}</dt>
                <dd className={label === "État" ? "text-[#6B6B6B]" : label === "Signature" ? "text-[#1E7A6E]" : ""}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex items-end justify-between">
            <span className="font-bold">Montant total</span>
            <span className="font-black text-[32px] tabular-nums">
              {formatDossier(amount)} {store.workshopInfo.vatApplicable ? "TTC" : ""}
            </span>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="h-[56px] rounded-[14px] border border-[#E8E8E5] bg-white font-bold active:scale-[0.99]"
            >
              Retour
            </button>
            <button
              type="button"
              onClick={saveAndPrint}
              className="h-[56px] rounded-[14px] bg-[#2A9D8F] font-bold text-white active:scale-[0.99]"
            >
              Générer le bon
            </button>
          </div>
          <button
            type="button"
            onClick={saveAndShareTracking}
            className="mt-3 h-[52px] w-full rounded-[14px] border border-[#2A9D8F] bg-white font-bold text-[#1E7A6E] active:scale-[0.99]"
          >
            Créer + lien suivi
          </button>
        </section>
      )}
    </div>
  );
}

function ConditionRow({
  label,
  value,
  onChange,
}: Readonly<{ label: string; value: CounterConditionValue; onChange: (value: CounterConditionValue) => void }>) {
  const options: Array<{ value: CounterConditionValue; label: string; className: string; icon: React.ReactNode }> = [
    { value: "ok", label: "OK", className: "text-[#1E7A6E]", icon: <Check className="size-3.5" /> },
    { value: "abime", label: "Abîmé", className: "text-[#6B6B6B]", icon: <TriangleAlert className="size-3.5" /> },
    { value: "hs", label: "HS", className: "text-[#C7493B]", icon: <X className="size-3.5" /> },
    { value: "a_tester", label: "À tester", className: "text-[#4B5563]", icon: <HelpCircle className="size-3.5" /> },
  ];
  return (
    <div className="grid grid-cols-[150px_1fr] items-center gap-3">
      <span className="font-semibold text-sm">{label}</span>
      <div className="grid grid-cols-4 rounded-[10px] border border-[#E8E8E5]">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-10 items-center justify-center gap-1 border-[#E8E8E5] border-r text-[12px] font-semibold last:border-r-0",
              option.className,
              value === option.value && "bg-[#FFFFFF] ring-1 ring-[#2A9D8F]",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PatternGrid({ value, onChange }: Readonly<{ value: number[]; onChange: (value: number[]) => void }>) {
  const toggle = (point: number) => {
    onChange(value.includes(point) ? value.filter((entry) => entry !== point) : [...value, point]);
  };
  return (
    <div className="mx-auto grid w-[220px] grid-cols-3 gap-3">
      {Array.from({ length: 9 }, (_, index) => index + 1).map((point) => (
        <button
          key={point}
          type="button"
          onClick={() => toggle(point)}
          className={cn(
            "grid size-[64px] place-items-center rounded-full border-2 font-black transition active:scale-[0.94]",
            value.includes(point)
              ? "border-[#2A9D8F] bg-[#2A9D8F] text-white"
              : "border-[#D9D6CF] bg-white text-[#6E6E73]",
          )}
        >
          {value.indexOf(point) >= 0 ? value.indexOf(point) + 1 : ""}
        </button>
      ))}
    </div>
  );
}

function PinPad({ value, onChange }: Readonly<{ value: string; onChange: (value: string) => void }>) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "Effacer", "0", "⌫"];
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
      <div className="flex min-h-[64px] items-center justify-center rounded-[14px] border border-[#E8E8E5] bg-white px-4 font-black text-[26px] tracking-[0.3em] tabular-nums">
        {value ? (
          "•".repeat(value.length)
        ) : (
          <span className="text-[#9A9AA0] text-[15px] tracking-normal">Touchez les chiffres</span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              if (key === "Effacer") return onChange("");
              if (key === "⌫") return onChange(value.slice(0, -1));
              onChange((value + key).slice(0, 8));
            }}
            className={cn(
              "grid min-h-[52px] place-items-center rounded-[14px] border font-black text-[18px] transition active:scale-[0.95]",
              key === "Effacer"
                ? "border-[#F2C8C3] bg-white px-2 text-[#C7493B] text-[12px]"
                : "border-[#E8E8E5] bg-white text-[#1D1D1F]",
            )}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}

function AccessoryDrawer({
  options,
  selected,
  onToggle,
  onClose,
  formatValue = formatEuro,
}: Readonly<{
  options: Array<{ id: string; label: string; prixClient: number; reason: string }>;
  selected: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
  formatValue?: (value: number) => string;
}>) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#1A1916]/18 p-4">
      <section className="max-h-[78vh] w-full max-w-[980px] overflow-hidden rounded-[20px] border border-[#E8E8E5] bg-white shadow-[0_1px_2px_rgba(26,25,22,0.035)]">
        <div className="flex items-center justify-between border-[#E8E8E5] border-b px-5 py-4">
          <div>
            <h3 className="font-black text-[20px]">Tous les accessoires</h3>
            <p className="text-[#6E6E73] text-sm">Sélection tactile pour ajouter une vente complémentaire.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-[52px] place-items-center rounded-[14px] border border-[#E8E8E5] bg-white"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="grid max-h-[58vh] grid-cols-2 gap-3 overflow-y-auto p-5 md:grid-cols-3 lg:grid-cols-4">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option.id)}
              className={cn(
                "relative min-h-[116px] rounded-[14px] border p-4 text-left transition active:scale-[0.97]",
                selected.includes(option.id)
                  ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#1E7A6E]"
                  : "border-[#E8E8E5] bg-white text-[#1D1D1F]",
              )}
            >
              {selected.includes(option.id) && (
                <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-[#2A9D8F] text-white">
                  <Check className="size-3.5" />
                </span>
              )}
              <span className="block pr-6 font-bold text-[14px]">{option.label}</span>
              <span className="mt-2 block font-black text-[#1E7A6E] text-[16px] tabular-nums">
                {formatValue(option.prixClient)}
              </span>
              <span className="mt-2 block text-[#6E6E73] text-[11px]">{option.reason}</span>
            </button>
          ))}
        </div>
        <div className="border-[#E8E8E5] border-t p-4">
          <button
            type="button"
            onClick={onClose}
            className="h-[52px] w-full rounded-[14px] bg-[#2A9D8F] font-bold text-white"
          >
            Valider les accessoires
          </button>
        </div>
      </section>
    </div>
  );
}

function PhotoCaptureCard({
  title,
  value,
  onChange,
}: Readonly<{ title: string; value: string; onChange: (value: string) => void }>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const addPhoto = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.readAsDataURL(file);
  };
  return (
    <section className="rounded-[20px] border border-[#E8E8E5] bg-white p-5 text-center">
      <h3 className="font-bold">{title}</h3>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => addPhoto(event.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "mt-4 flex min-h-[190px] w-full flex-col items-center justify-center overflow-hidden rounded-[14px] border-2 border-dashed border-[#CFE2DF] transition active:scale-[0.98]",
          value ? "bg-[#FFFFFF]" : "bg-white",
        )}
      >
        {value ? (
          <img src={value} alt={title} className="aspect-[4/3] size-full object-cover" />
        ) : (
          <>
            <span className="grid size-14 place-items-center rounded-full bg-[#FFFFFF] text-[#1E7A6E]">
              <Camera className="size-7" />
            </span>
            <span className="mt-4 font-bold">Prendre ou ajouter une photo</span>
            <span className="mt-2 text-[#6E6E73] text-sm">Caméra ou photothèque</span>
          </>
        )}
      </button>
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="mt-3 h-10 rounded-[12px] border border-[#E8E8E5] px-4 font-semibold text-[#B42318] text-sm"
        >
          Retirer
        </button>
      ) : null}
    </section>
  );
}

function DetailLine({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 border-[#E8E8E5] border-b pb-3">
      <dt className="font-bold">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

function StatusPillCounter({ tone, children }: Readonly<{ tone: "green" | "orange"; children: React.ReactNode }>) {
  return (
    <span
      className={cn(
        "mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-bold",
        tone === "green" ? "bg-[#FFFFFF] text-[#1E7A6E]" : "bg-[#FFFFFF] text-[#6B6B6B]",
      )}
    >
      <span className={cn("size-2 rounded-full", tone === "green" ? "bg-[#1E7A6E]" : "bg-[#6B6B6B]")} />
      {children}
    </span>
  );
}

function CounterFollowScreen({
  repairId,
  onClose,
  onCheckout,
}: Readonly<{ repairId: string; onClose: () => void; onCheckout: (repairId: string) => void }>) {
  const store = useBeharStore();
  const repair =
    store.repairs.find((entry) => entry.id === repairId) ??
    store.repairs.find((entry) => !isTerminalRepairStatus(entry.status)) ??
    store.repairs[0];
  const [pieceName, setPieceName] = useState("");
  const [piecePrice, setPiecePrice] = useState("");
  if (!repair) return <EmptyCounter title="Suivi du dossier" message="Aucun dossier à suivre." onClose={onClose} />;
  const customer = store.customers.find((entry) => entry.id === repair.customerId);
  const tasks = repair.counterTasks?.length ? repair.counterTasks : buildCounterTasks([repair.issue]);
  const pieces = repair.counterPieces ?? [];
  const done = tasks.filter((task) => task.fait).length;
  const pieceCost = pieces.reduce((sum, piece) => sum + piece.prix, 0);
  const margin = repairAmount(repair) - pieceCost;
  const setStatus = (status: "À faire" | "En cours" | "En attente pièce" | "Prêt à rendre") => {
    const mapped: Record<string, Repair["status"]> = {
      "À faire": "Reçu",
      "En cours": "En réparation",
      "En attente pièce": "Diagnostic",
      "Prêt à rendre": "Prêt",
    };
    store.updateRepair(repair.id, { status: mapped[status] });
  };
  const currentStatus =
    repair.status === "Prêt"
      ? "Prêt à rendre"
      : repair.status === "En réparation"
        ? "En cours"
        : repair.status === "Diagnostic"
          ? "En attente pièce"
          : "À faire";
  return (
    <div className="mx-auto max-w-[1180px]">
      <button
        type="button"
        onClick={onClose}
        className="mb-4 inline-flex h-[52px] items-center gap-2 rounded-full bg-white px-4 shadow-sm"
      >
        <ArrowLeft className="size-5" /> Suivi du dossier
      </button>
      <div className="mb-5">
        <p className="font-bold text-[#1E7A6E]">
          {displayRepairCode(repair)}{" "}
          <StatusPillCounter tone={repair.status === "Prêt" ? "green" : "orange"}>{currentStatus}</StatusPillCounter>
        </p>
        <h1 className="font-black text-[34px]">{repair.deviceModel || repair.device}</h1>
        <p className="text-[#6E6E73]">
          {customer?.name ?? "Comptoir"} · entré il y a{" "}
          {Math.max(
            1,
            Math.round((Date.now() - new Date(repair.droppedAt || repair.createdAt || Date.now()).getTime()) / 36e5),
          )}{" "}
          h
        </p>
      </div>
      <div className="mb-6 grid grid-cols-4 rounded-[14px] border border-[#E8E8E5] bg-white p-1">
        {(["À faire", "En cours", "En attente pièce", "Prêt à rendre"] as const).map((status) => (
          <button
            type="button"
            key={status}
            onClick={() => setStatus(status)}
            className={cn(
              "h-[52px] rounded-[12px] font-semibold",
              currentStatus === status && "bg-[#FFFFFF] text-[#1E7A6E]",
            )}
          >
            {status}
          </button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <section className="rounded-[20px] border border-[#E8E8E5] bg-white p-5">
            <div className="flex justify-between">
              <h2 className="font-bold text-xl">Tâches atelier</h2>
              <b>
                {done}/{tasks.length}
              </b>
            </div>
            <div className="mt-3 h-2 rounded-full bg-[#FFFFFF]">
              <div
                className="h-full rounded-full bg-[#2A9D8F]"
                style={{ width: `${tasks.length ? (done / tasks.length) * 100 : 0}%` }}
              />
            </div>
            <ul className="mt-4 divide-y divide-[#E8E8E5]">
              {tasks.map((task) => (
                <li key={task.id} className="flex min-h-[52px] items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      store.updateRepair(repair.id, {
                        counterTasks: tasks.map((entry) =>
                          entry.id === task.id ? { ...entry, fait: !entry.fait } : entry,
                        ),
                      })
                    }
                    className={cn(
                      "grid size-7 place-items-center rounded-full border",
                      task.fait ? "border-[#2A9D8F] bg-[#2A9D8F] text-white" : "border-[#9A9AA0]",
                    )}
                  >
                    {task.fait && <Check className="size-4" />}
                  </button>
                  <span className={cn("flex-1", task.fait && "text-[#6E6E73] line-through")}>{task.label}</span>
                  <GripVertical className="size-4 text-[#9A9AA0]" />
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-[20px] border border-[#E8E8E5] bg-white p-5">
            <h2 className="font-bold text-xl">Pièces utilisées</h2>
            <ul className="mt-4 space-y-2">
              {pieces.map((piece) => (
                <li
                  key={piece.id}
                  className="flex h-[52px] items-center justify-between rounded-[12px] border border-[#E8E8E5] px-4"
                >
                  <span>{piece.nom}</span>
                  <b>{formatEuro(piece.prix)}</b>
                </li>
              ))}
            </ul>
            <div className="mt-3 grid grid-cols-[1fr_120px_140px] gap-2">
              <CounterInput
                placeholder="Ajouter une pièce"
                value={pieceName}
                onChange={(e) => setPieceName(e.target.value)}
              />
              <CounterInput placeholder="Prix" value={piecePrice} onChange={(e) => setPiecePrice(e.target.value)} />
              <button
                type="button"
                className="rounded-[14px] border border-dashed border-[#D9D6CF] font-semibold"
                onClick={() => {
                  if (!pieceName.trim()) return;
                  store.updateRepair(repair.id, {
                    counterPieces: [
                      ...pieces,
                      { id: `piece_${Date.now()}`, nom: pieceName.trim(), prix: toMoney(piecePrice) },
                    ],
                  });
                  setPieceName("");
                  setPiecePrice("");
                }}
              >
                Ajouter
              </button>
            </div>
          </section>
        </div>
        <aside className="space-y-4">
          <section className="rounded-[20px] border border-[#E8E8E5] bg-white p-5">
            <h2 className="font-bold text-xl">Récap dossier</h2>
            <dl className="mt-4 divide-y divide-[#E8E8E5]">
              <DetailRowLite label="Intervention" value={repair.issue} />
              <DetailRowLite label="Prix client" value={formatEuro(repairAmount(repair))} />
              <DetailRowLite label="Coût pièces" value={formatEuro(pieceCost)} />
              <DetailRowLite label="Marge" value={formatEuro(margin)} green />
            </dl>
          </section>
          <button
            type="button"
            onClick={() => {
              store.updateRepair(repair.id, { counterNotifiedAt: new Date().toISOString() });
              toast.success("Client marqué comme prévenu.");
            }}
            className="h-[64px] w-full rounded-[14px] border border-[#1D1D1F] bg-white font-bold"
          >
            <MessageCircle className="mr-2 inline size-5" /> Marquer client prévenu
          </button>
          <button
            type="button"
            disabled={repair.status !== "Prêt"}
            onClick={() => onCheckout(repair.id)}
            className={cn(
              "h-[64px] w-full rounded-[14px] font-bold text-white",
              repair.status === "Prêt" ? "bg-[#2A9D8F]" : "bg-[#FFFFFF]",
            )}
          >
            Créer une demande de paiement <ChevronRight className="ml-2 inline size-5" />
          </button>
        </aside>
      </div>
    </div>
  );
}

function DetailRowLite({ label, value, green }: Readonly<{ label: string; value: string; green?: boolean }>) {
  return (
    <div className="flex justify-between py-3">
      <span className="text-[#6E6E73]">{label}</span>
      <b className={green ? "text-[#1E7A6E]" : ""}>{value}</b>
    </div>
  );
}

// Initiales d'un nom client réel (pour les avatars comptoir).
function counterInitials(name: string) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

// Index d'étape de la timeline comptoir à partir du vrai statut de réparation.
function counterTimelineIndex(status: Repair["status"]) {
  switch (status) {
    case "Reçu":
      return 0;
    case "Diagnostic":
      return 1;
    case "En attente":
    case "Devis envoyé":
    case "Devis accepté":
      return 2;
    case "En réparation":
    case "Test final":
      return 3;
    case "Prêt":
    case "Rendu":
    case "Clôturé":
      return 4;
    case "SAV":
      return 1;
    default:
      return 0;
  }
}

type CounterCartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  detail?: string;
  stockItemId?: string;
  sku?: string;
};

function CounterMockPill({
  children,
  tone = "green",
}: Readonly<{ children: React.ReactNode; tone?: "green" | "orange" | "gray" }>) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-[9px] px-3 font-bold text-[12px]",
        tone === "green" && "bg-[#FFFFFF] text-[#1E7A6E]",
        tone === "orange" && "bg-[#FFFFFF] text-[#6B6B6B]",
        tone === "gray" && "bg-[#FFFFFF] text-[#6B6B6B]",
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          tone === "orange" ? "bg-[#6B6B6B]" : tone === "gray" ? "bg-[#9A9AA0]" : "bg-[#2A9D8F]",
        )}
      />
      {children}
    </span>
  );
}

// Vrai QR encodant le lien public sécurisé d'une réparation.
function CounterRepairQr({ repair, className = "" }: Readonly<{ repair: Repair; className?: string }>) {
  const store = useBeharStore();
  const ensureRepairPublicAccess = store.ensureRepairPublicAccess;
  const [qr, setQr] = useState("");
  const workshop = store.workshopSettings ?? store.workshopInfo;

  useEffect(() => {
    const access = repair.publicAccess ?? ensureRepairPublicAccess(repair.id);
    if (!access) return;

    const trackingUrl = getCustomerTrackingUrl(repair, workshop);

    if (process.env.NODE_ENV === "development") {
      console.log("[CounterRepairQr] generated trackingUrl:", trackingUrl);
      if (!trackingUrl) {
        throw new Error("Lien de suivi client invalide : dossier sans trackingId/publicId");
      }
    }

    if (trackingUrl) {
      generateQrDataUrl(trackingUrl)
        .then(setQr)
        .catch((err) => {
          console.error("Failed to generate QR Code", err);
          setQr("");
        });
    }
  }, [repair.id, ensureRepairPublicAccess, repair.publicAccess, workshop]);

  if (!qr) {
    return (
      <div className={cn("flex items-center justify-center bg-white text-xs text-[#6B6B6B]", className)}>
        Génération du QR...
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={qr} alt="QR code de suivi" className={cn("rounded-[10px] bg-white", className)} />;
}

function CounterScreenTitle({
  title,
  subtitle,
  onClose,
}: Readonly<{ title: string; subtitle?: string; onClose: () => void }>) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <button
        type="button"
        onClick={onClose}
        className="mt-1 grid size-[52px] place-items-center rounded-full bg-white shadow-sm active:scale-[0.97]"
      >
        <ArrowLeft className="size-5" />
      </button>
      <div>
        <h1 className="font-black text-[34px] leading-tight tracking-[-0.03em]">{title}</h1>
        {subtitle && <p className="mt-1 text-[#6B6B6B] text-[15px]">{subtitle}</p>}
      </div>
    </div>
  );
}

function CounterAccessorySaleScreen({ onClose }: Readonly<{ onClose: () => void }>) {
  const stockItems = useBeharStore((s) => s.stockItems);
  const repairs = useBeharStore((s) => s.repairs);
  const customers = useBeharStore((s) => s.customers);
  const addSale = useBeharStore((s) => s.addSale);
  const addCustomer = useBeharStore((s) => s.addCustomer);
  const workshopInfo = useBeharStore((s) => s.workshopInfo);
  const [cart, setCart] = useState<CounterCartItem[]>([]);
  const [freeName, setFreeName] = useState("");
  const [freePrice, setFreePrice] = useState("");
  const [freeQty, setFreeQty] = useState(1);
  const [confirmingClear, setConfirmingClear] = useState(false);
  // Modes (brief §7 + client) : vente simple, rattachée à un client, ou à un dossier.
  const [mode, setMode] = useState<"simple" | "client" | "repair">("simple");
  const [billingCountry, setBillingCountry] = useState<WorkshopCountry>(workshopInfo.country);
  const [linkedRepairId, setLinkedRepairId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [query, setQuery] = useState("");
  const selectedCustomer = customers.find((c) => c.id === customerId);
  // Dossiers ouverts auxquels on peut rattacher une vente.
  const openRepairs = useMemo(() => repairs.filter((r) => !isTerminalRepairStatus(r.status)).slice(0, 40), [repairs]);
  const linkedRepair = openRepairs.find((r) => r.id === linkedRepairId);
  const saleCountry = mode === "repair" && linkedRepair ? linkedRepair.billingCountry : billingCountry;
  const saleConfig = getWorkshopCountryConfig(saleCountry);
  const formatSale = (value: number) => formatCurrency(value, saleConfig.currency);
  // Vrai stock : on ne garde que les accessoires (catégorie/nom) encore disponibles.
  const accessories = useMemo(() => {
    const q = compactText(query);
    const fromStock = stockItems
      .filter(isCounterSaleStockItem)
      .filter((item) => !q || compactText(`${item.name} ${item.sku ?? ""} ${item.categoryName ?? ""}`).includes(q))
      .slice(0, q ? 24 : 12)
      .map((item) => ({
        id: item.id,
        name: item.name,
        salePrice: item.salePrice,
        stock: item.stock,
        stockItemId: item.id,
        sku: item.sku,
        categoryName: item.categoryName || item.category,
      }));
    if (fromStock.length) return fromStock;
    return counterAccessoryProducts
      .filter((item) => !q || compactText(item.name).includes(q))
      .map((item) => ({
        id: item.id,
        name: item.name,
        salePrice: item.price,
        stock: 12,
        stockItemId: undefined,
        sku: undefined,
        categoryName: "Accessoires",
      }));
  }, [stockItems, query]);
  const addProduct = (item: (typeof accessories)[number]) => {
    setCart((items) => {
      const existing = items.find((entry) => entry.id === item.id);
      if (existing) {
        const nextQuantity = item.stockItemId ? Math.min(item.stock, existing.quantity + 1) : existing.quantity + 1;
        return items.map((entry) => (entry.id === item.id ? { ...entry, quantity: nextQuantity } : entry));
      }
      return [
        ...items,
        {
          id: item.id,
          name: item.name,
          price: item.salePrice,
          quantity: 1,
          stockItemId: item.stockItemId,
          sku: item.sku,
        },
      ];
    });
  };
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal;
  const updateQty = (id: string, delta: number) =>
    setCart((items) =>
      items.flatMap((item) => {
        if (item.id !== id) return [item];
        const stockItem = item.stockItemId ? stockItems.find((stock) => stock.id === item.stockItemId) : undefined;
        const maxQty = stockItem ? Math.max(1, stockItem.stock ?? stockItem.quantity ?? 1) : Number.POSITIVE_INFINITY;
        return [{ ...item, quantity: Math.min(maxQty, Math.max(1, item.quantity + delta)) }];
      }),
    );
  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("Ajoutez au moins un article.");
      return;
    }
    if (mode === "repair" && !linkedRepair) {
      toast.error("Choisissez le dossier auquel rattacher la vente.");
      return;
    }
    if (mode === "client" && !customerId) {
      toast.error("Choisissez ou créez un client.");
      return;
    }
    const linkedCustomer = linkedRepair ? customers.find((c) => c.id === linkedRepair.customerId) : undefined;
    let saleCustomerId = "counter";
    let saleCustomerName = "Client comptoir";
    if (mode === "repair" && linkedRepair) {
      saleCustomerId = linkedRepair.customerId;
      saleCustomerName = linkedCustomer?.name || "Client dossier";
    } else if (mode === "client" && selectedCustomer) {
      saleCustomerId = selectedCustomer.id;
      saleCustomerName = selectedCustomer.name;
    }
    const saleId = addSale({
      customerId: saleCustomerId,
      customerName: saleCustomerName,
      repairId: mode === "repair" && linkedRepair ? linkedRepair.id : undefined,
      billingCountry: saleCountry,
      status: "Brouillon",
      lines: cart.map((item) => ({
        stockItemId: item.stockItemId ?? item.id,
        name: item.detail ? `${item.name} — ${item.detail}` : item.name,
        sku: item.sku,
        itemKind: "accessory",
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.quantity * item.price,
      })),
    });
    if (!saleId) {
      toast.error("Vente impossible : vérifiez le panier et le stock.");
      return;
    }
    toast.success(
      mode === "repair" && linkedRepair
        ? `Vente enregistrée pour ${linkedRepair.number} (${formatSale(total)}). Finalisez la facture pour créer une demande de paiement.`
        : mode === "client" && selectedCustomer
          ? `Vente enregistrée pour ${selectedCustomer.name} (${formatSale(total)}). Finalisez la facture pour créer une demande de paiement.`
          : `Vente enregistrée (${formatSale(total)}). Finalisez une facture pour créer une demande de paiement.`,
    );
    setCart([]);
  };
  const createNewClient = () => {
    const name = newClientName.trim();
    if (!name) {
      toast.error("Nom du client requis.");
      return;
    }
    const id = addCustomer({ name, phone: newClientPhone.trim() || undefined });
    if (!id) {
      toast.error("Création du client impossible.");
      return;
    }
    setCustomerId(id);
    setNewClientOpen(false);
    setNewClientName("");
    setNewClientPhone("");
    toast.success(`Client « ${name} » créé.`);
  };
  return (
    <div className="mx-auto max-w-[1180px]">
      <CounterScreenTitle
        title="Vente comptoir"
        subtitle="Accessoires et produits actifs. Le règlement reste géré hors Behar Tech Pro."
        onClose={onClose}
      />

      {/* Modes : vente simple, à un client, ou à un dossier (brief §7) */}
      <div className="mb-4 space-y-3">
        <div className="inline-flex rounded-[14px] border border-[#E8E8E5] bg-white p-1">
          {(["simple", "client", "repair"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "h-10 rounded-[10px] px-4 font-bold text-sm transition",
                mode === m ? "bg-[#2A9D8F] text-white" : "text-[#6B6B6B] hover:text-[#1A1916]",
              )}
            >
              {m === "simple" ? "Vente simple" : m === "client" ? "À un client" : "À un dossier"}
            </button>
          ))}
        </div>

        <div className="rounded-[14px] border border-[#DDEFEA] bg-[#FFFFFF] p-3">
          <p className="text-xs font-semibold text-[#1A1916]">Pays de facturation de la vente</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["FR", "CH"] as const).map((country) => (
              <button
                key={country}
                type="button"
                disabled={mode === "repair" && Boolean(linkedRepair)}
                onClick={() => setBillingCountry(country)}
                className={cn(
                  "h-10 rounded-[10px] border text-xs font-bold disabled:cursor-not-allowed disabled:opacity-70",
                  saleCountry === country
                    ? "border-[#2A9D8F] bg-white text-[#167B70]"
                    : "border-[#E8E8E5] bg-white text-[#6B6B6B]",
                )}
              >
                {country === "CH" ? "Suisse · CHF" : "France · EUR"}
              </button>
            ))}
          </div>
        </div>

        {mode === "repair" && (
          <select
            value={linkedRepairId}
            onChange={(e) => setLinkedRepairId(e.target.value)}
            className="h-12 w-full rounded-[14px] border border-[#E8E8E5] bg-white px-4 font-semibold text-[#1A1916] outline-none focus:border-[#2A9D8F]"
          >
            <option value="">Choisir un dossier…</option>
            {openRepairs.map((r) => {
              const c = customers.find((entry) => entry.id === r.customerId);
              return (
                <option key={r.id} value={r.id}>
                  #{r.number} · {c?.name || "Client"} · {r.deviceModel || r.device}
                </option>
              );
            })}
          </select>
        )}

        {mode === "client" && (
          <div className="rounded-[16px] border border-[#E8E8E5] bg-white p-4">
            {selectedCustomer ? (
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <b className="text-[#1A1916]">{selectedCustomer.name}</b>
                  {selectedCustomer.phone ? (
                    <span className="ml-2 text-[#6B6B6B] text-sm">{selectedCustomer.phone}</span>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => setCustomerId("")}
                  className="shrink-0 font-bold text-[#1E7A6E] text-sm"
                >
                  Changer
                </button>
              </div>
            ) : newClientOpen ? (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <CounterInput
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Nom du client"
                  />
                  <CounterInput
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="Téléphone (optionnel)"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={createNewClient}
                    className="h-[48px] flex-1 rounded-[14px] bg-[#2A9D8F] font-bold text-white"
                  >
                    Créer le client
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewClientOpen(false)}
                    className="h-[48px] rounded-[14px] border border-[#E8E8E5] px-4 font-bold text-[#6B6B6B]"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <ExistingCustomerSearch value={customerId} onChange={setCustomerId} />
                <button
                  type="button"
                  onClick={() => setNewClientOpen(true)}
                  className="inline-flex items-center gap-2 font-bold text-[#1E7A6E] text-sm"
                >
                  <Plus className="size-4" /> Nouveau client
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_410px]">
        <section>
          <CounterInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un article (nom, référence)…"
          />
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
            {accessories.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => addProduct(item)}
                className="group flex min-h-[220px] flex-col items-center justify-center rounded-[18px] border border-[#E8E8E5] bg-white p-4 text-center shadow-[0_10px_26px_rgba(26,25,22,0.04)] transition hover:-translate-y-0.5 hover:border-[#2A9D8F]/40 hover:shadow-[0_14px_32px_rgba(26,25,22,0.08)] active:scale-[0.98]"
              >
                <RealProductVisual
                  name={item.name}
                  category={item.categoryName}
                  className="size-[112px] rounded-[12px] p-2"
                />
                <b className="mt-3 line-clamp-2">{item.name}</b>
                <span className="mt-1 text-[#6B6B6B] text-xs">
                  {item.stockItemId ? `${item.stock} en stock` : "Disponible"}
                </span>
                <span className="mt-2 font-black text-[#1E7A6E] tabular-nums">{formatSale(item.salePrice)}</span>
              </button>
            ))}
            <div className="flex min-h-[190px] flex-col items-center justify-center rounded-[18px] border border-dashed border-[#C8C8C2] bg-white p-5 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-[#2A9D8F] text-white">
                <Plus className="size-7" />
              </span>
              <b className="mt-4">Article libre</b>
              <span className="mt-1 text-[#6B6B6B] text-sm">Voir le formulaire à droite →</span>
            </div>
          </div>
          {accessories.length === 0 && (
            <p className="mt-4 rounded-[14px] border border-dashed border-[#E8E8E5] bg-white px-4 py-6 text-center text-[#6B6B6B] text-sm">
              Aucun article ne correspond à « {query} ». Utilisez l'article libre à droite.
            </p>
          )}
        </section>
        <aside className="space-y-4">
          <section className="rounded-[18px] border border-[#E8E8E5] bg-white p-4 shadow-[0_10px_30px_rgba(26,25,22,0.04)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-black text-xl">Panier</h2>
              <CounterMockPill>{cart.reduce((sum, item) => sum + item.quantity, 0)} articles</CounterMockPill>
            </div>
            <ul className="divide-y divide-[#E8E8E5]">
              {cart.map((item) => (
                <li
                  key={item.id}
                  className="grid min-h-[78px] grid-cols-[52px_minmax(0,1fr)_auto_auto] items-center gap-3 py-3"
                >
                  <RealProductVisual name={item.name} className="size-[52px] rounded-[10px] p-1.5" />
                  <div>
                    <b>{item.name}</b>
                    {item.detail && <p className="text-[#6B6B6B] text-sm">{item.detail}</p>}
                    <p className="font-bold tabular-nums">{formatSale(item.price)}</p>
                  </div>
                  <div className="inline-flex h-9 items-center rounded-[10px] border border-[#E8E8E5]">
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, -1)}
                      className="grid size-9 place-items-center"
                    >
                      −
                    </button>
                    <span className="w-8 text-center tabular-nums">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, 1)}
                      className="grid size-9 place-items-center"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCart((items) => items.filter((entry) => entry.id !== item.id))}
                    className="grid size-10 place-items-center text-[#6B6B6B]"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-[#E8E8E5] border-t pt-4 text-sm">
              <div className="flex justify-between">
                <dt>Sous-total</dt>
                <dd>{formatSale(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>TVA</dt>
                <dd>incluse</dd>
              </div>
              <div className="flex items-end justify-between pt-2">
                <dt className="font-black text-lg">Total TTC</dt>
                <dd className="font-black text-[#1E7A6E] text-[34px] tabular-nums">{formatSale(total)}</dd>
              </div>
            </dl>
          </section>
          <section className="rounded-[18px] border border-[#E8E8E5] bg-white p-4">
            <h2 className="font-black text-lg">Article libre</h2>
            <div className="mt-3 grid grid-cols-[1fr_90px_90px] gap-2">
              <CounterInput
                value={freeName}
                onChange={(e) => setFreeName(e.target.value)}
                placeholder="Ex : Étui AirPods"
              />
              <CounterInput
                value={freePrice}
                onChange={(e) => setFreePrice(e.target.value)}
                placeholder={`0,00 ${saleConfig.currency}`}
              />
              <div className="inline-flex h-[52px] items-center rounded-[14px] border border-[#E8E8E5]">
                <button
                  type="button"
                  onClick={() => setFreeQty((qty) => Math.max(1, qty - 1))}
                  className="grid size-[52px] place-items-center"
                >
                  −
                </button>
                <span className="w-7 text-center">{freeQty}</span>
                <button
                  type="button"
                  onClick={() => setFreeQty((qty) => qty + 1)}
                  className="grid size-[52px] place-items-center"
                >
                  +
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const amount = parseCounterMoney(freePrice);
                if (!freeName.trim()) return toast.error("Nom d'article requis.");
                if (amount <= 0) return toast.error(`Indiquez un prix supérieur à 0 ${saleConfig.currency}.`);
                setCart((items) => [
                  ...items,
                  { id: `free_${Date.now()}`, name: freeName.trim(), price: amount, quantity: freeQty },
                ]);
                setFreeName("");
                setFreePrice("");
                setFreeQty(1);
                setConfirmingClear(false);
              }}
              className="mt-3 h-[52px] w-full rounded-[14px] border border-[#E8E8E5] font-bold"
            >
              <Plus className="mr-2 inline size-4" /> Ajouter au panier
            </button>
          </section>
          <section className="rounded-[18px] border border-[#E8E8E5] bg-white p-4">
            <h2 className="font-black text-lg">Finaliser la vente</h2>
            <p className="mt-1 text-[#6B6B6B] text-xs leading-relaxed">
              Enregistrez d’abord la vente, puis créez une facture finalisée pour transmettre une demande à votre
              prestataire externe.
            </p>
          </section>
          <p className="rounded-[14px] border border-[#E8E8E5] bg-[#FFFFFF] px-4 py-3 text-[#6B6B6B] text-xs leading-relaxed">
            Le règlement est géré hors Behar Tech Pro via votre prestataire externe.
          </p>
          <button
            type="button"
            disabled={cart.length === 0 || (mode === "repair" && !linkedRepair) || (mode === "client" && !customerId)}
            onClick={handleCheckout}
            className="h-[58px] w-full rounded-[14px] bg-[#2A9D8F] font-black text-white disabled:cursor-not-allowed disabled:bg-[#FFFFFF]"
          >
            <FileText className="mr-2 inline size-5" /> Enregistrer la vente {total > 0 ? `· ${formatSale(total)}` : ""}
          </button>
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => {
              if (!confirmingClear) {
                setConfirmingClear(true);
                return;
              }
              setCart([]);
              setConfirmingClear(false);
              toast.success("Panier vidé.");
            }}
            className={cn(
              "h-[52px] w-full rounded-[14px] border font-bold disabled:cursor-not-allowed disabled:opacity-45",
              confirmingClear ? "border-[#B42318] bg-[#B42318] text-white" : "border-[#F2C8C3] bg-white text-[#C7493B]",
            )}
          >
            <Trash2 className="mr-2 inline size-4" />{" "}
            {confirmingClear ? "Confirmer : vider le panier" : "Vider le panier"}
          </button>
        </aside>
      </div>
    </div>
  );
}

function appointmentPriceLabel(apt: Appointment) {
  const amount = Number(apt.estimatedTotal ?? apt.customerPrice ?? 0);
  if (apt.priceStatus === "diagnostic") return "Diagnostic";
  return amount > 0 ? formatEuro(amount) : "Prix à confirmer";
}

function appointmentDay(apt: Appointment) {
  return (apt.appointmentDate || apt.date || "").slice(0, 10);
}

function CounterAppointmentsScreen({
  onClose,
  onOpenRepairDetail,
  onTransformAppointment,
  createRequestKey = 0,
  createPrefill,
}: Readonly<{
  onClose: () => void;
  onOpenRepairDetail: (repairId: string) => void;
  onTransformAppointment: (appointment: Appointment) => void;
  createRequestKey?: number;
  createPrefill?: CounterAppointmentPrefill;
}>) {
  const appointments = useBeharStore((s) => s.appointments);
  const customers = useBeharStore((s) => s.customers);
  const repairs = useBeharStore((s) => s.repairs);
  const today = localDateValue();
  const [selectedDay, setSelectedDay] = useState(today);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<{ open: boolean; editing: Appointment | null }>({ open: false, editing: null });

  useEffect(() => {
    if (createRequestKey > 0) setForm({ open: true, editing: null });
  }, [createRequestKey]);

  const customerName = (apt: Appointment) => {
    const customer = customers.find((entry) => entry.id === apt.customerId);
    if (customer?.type === "counter") return apt.clientName || "Client comptoir";
    return customer?.name || apt.clientName || "Client comptoir";
  };
  const customerPhone = (apt: Appointment) => {
    const customer = customers.find((entry) => entry.id === apt.customerId);
    if (customer?.type === "counter") return apt.clientPhone || "Non renseigné";
    return customer?.phone || apt.clientPhone || "Non renseigné";
  };
  const linkedRepairOf = (apt?: Appointment) =>
    apt
      ? (repairs.find((repair) => repair.id === apt.repairId) ??
        repairs.find((repair) => repair.appointmentId === apt.id))
      : undefined;

  const matchesSearch = (apt: Appointment) => {
    const q = compactText(search);
    if (q.length < 2) return true;
    const repair = linkedRepairOf(apt);
    return compactText(
      [
        customerName(apt),
        customerPhone(apt),
        apt.clientEmail,
        apt.device,
        apt.deviceModel,
        apt.issue,
        apt.issueDescription,
        apt.interventionLabel,
        repair?.number,
        apt.repairNumber,
      ]
        .filter(Boolean)
        .join(" "),
    ).includes(q);
  };

  const dayAppointments = useMemo(
    () =>
      appointments
        .filter((apt) => appointmentDay(apt) === selectedDay && normalizeAppointmentStatus(apt.status) !== "Annulé")
        .filter(matchesSearch)
        .sort((a, b) => (a.appointmentTime || a.time).localeCompare(b.appointmentTime || b.time)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appointments, customers, repairs, selectedDay, search],
  );
  const selected = dayAppointments.find((apt) => apt.id === selectedId) ?? dayAppointments[0];
  const selectedRepair = linkedRepairOf(selected);
  const selectedDateLabel = frLongDate(selectedDay);
  const selectedStatus = selected
    ? selectedRepair
      ? selected.source === "repair"
        ? "Lié à une prise en charge"
        : "Transformé"
      : normalizeAppointmentStatus(selected.status, selected.confirmed)
    : "";

  const transform = (apt: Appointment) => {
    const existing = linkedRepairOf(apt);
    if (existing) {
      onOpenRepairDetail(existing.id);
      return;
    }
    onTransformAppointment(apt);
  };

  return (
    <div className="mx-auto grid h-[calc(100svh-128px)] max-w-[1180px] gap-6 overflow-hidden lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="flex min-h-0 flex-col">
        <div className="shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-black text-[28px] tracking-tight">Rendez-vous</h1>
              <p className="mt-1 text-[#6B6B6B] text-[15px]">{selectedDateLabel}</p>
            </div>
            <span className="rounded-[12px] border border-[#E8E8E5] bg-white px-3 py-2 font-bold text-[#6B6B6B] text-sm">
              {dayAppointments.length} RDV
            </span>
          </div>
          <div className="mt-4 grid grid-cols-[42px_1fr_42px_260px] gap-2">
            <button
              type="button"
              onClick={() => setSelectedDay((d) => isoAddDays(d, -1))}
              className="grid h-11 place-items-center rounded-[12px] border border-[#E8E8E5] bg-white active:scale-95"
              aria-label="Jour précédent"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDay(today)}
              className={cn(
                "h-11 rounded-[12px] border font-bold",
                selectedDay === today ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#1E7A6E]" : "border-[#E8E8E5] bg-white",
              )}
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={() => setSelectedDay((d) => isoAddDays(d, 1))}
              className="grid h-11 place-items-center rounded-[12px] border border-[#E8E8E5] bg-white active:scale-95"
              aria-label="Jour suivant"
            >
              <ChevronRight className="size-5" />
            </button>
            <div className="relative">
              <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-[#6B6B6B]" />
              <CounterInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Client, tél, appareil…"
                className="h-11 pl-10"
              />
            </div>
          </div>
          <CounterWeekStrip
            selectedDay={selectedDay}
            onSelect={(iso) => {
              setSelectedDay(iso);
              setSelectedId("");
            }}
            appointments={appointments}
            className="mt-3 shadow-[0_10px_26px_rgba(26,25,22,0.04)]"
          />
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          {dayAppointments.length === 0 ? (
            <div className="grid min-h-[250px] place-items-center rounded-[18px] border border-dashed border-[#D9D6CF] bg-white text-center">
              <div>
                <CalendarPlus className="mx-auto size-8 text-[#6B6B6B]" />
                <p className="mt-3 font-bold">Aucun rendez-vous ce jour.</p>
                <p className="mt-1 text-[#6B6B6B] text-sm">
                  {search.trim().length >= 2
                    ? "Aucun résultat pour cette recherche."
                    : "Les rendez-vous liés aux dossiers apparaîtront ici."}
                </p>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {dayAppointments.map((apt) => {
                const linked = linkedRepairOf(apt);
                const active = selected?.id === apt.id;
                const time = apt.appointmentTime || apt.time;
                return (
                  <li key={apt.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(apt.id)}
                      className={cn(
                        "grid w-full grid-cols-[72px_1fr_auto] items-center gap-3 rounded-[16px] border bg-white p-4 text-left shadow-[0_10px_24px_rgba(26,25,22,0.04)] transition active:scale-[0.99]",
                        active ? "border-[#2A9D8F] shadow-[0_14px_32px_rgba(42,157,143,0.16)]" : "border-[#E8E8E5]",
                      )}
                    >
                      <span className="border-[#E8E8E5] border-r pr-3 font-black text-[20px] tabular-nums">{time}</span>
                      <span className="min-w-0">
                        <b className="block truncate text-[15px]">{customerName(apt)}</b>
                        <span className="block truncate text-[#6B6B6B] text-[12.5px]">{customerPhone(apt)}</span>
                        <span className="block truncate text-[#6B6B6B] text-[13px]">{appointmentDeviceLabel(apt)}</span>
                        <span className="block truncate text-[#6B6B6B] text-[13px]">
                          {apt.interventionLabel || apt.issueDescription || apt.issue}
                        </span>
                        <span
                          className={cn(
                            "mt-1 inline-flex rounded-full px-2 py-0.5 font-bold text-[11.5px]",
                            appointmentPriceLabel(apt) === "Prix à confirmer"
                              ? "bg-[#FFFFFF] text-[#6B6B6B]"
                              : "bg-[#FFFFFF] text-[#1E7A6E]",
                          )}
                        >
                          {appointmentPriceLabel(apt)}
                        </span>
                        {linked && (
                          <span className="ml-2 inline-flex rounded-full bg-[#FFFFFF] px-2 py-0.5 font-bold text-[#1E7A6E] text-[11.5px]">
                            {linked.number}
                          </span>
                        )}
                        {apt.source === "Widget site internet" && (
                          <span className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full border border-[#BFE7DD] bg-[#ECF8F4] px-2 py-0.5 font-bold text-[#167B70] text-[11px]">
                              Widget
                            </span>
                            {apt.availabilityLabel && (
                              <span className="rounded-full bg-[#F1F0EC] px-2 py-0.5 font-medium text-[#6B6B6B] text-[11px]">
                                {apt.availabilityLabel}
                              </span>
                            )}
                            {apt.alerts?.map((alert) => (
                              <span
                                key={alert}
                                className="rounded-full border border-[#EBD9B4] bg-[#FBF6EA] px-2 py-0.5 font-medium text-[#8A6D1B] text-[11px]"
                              >
                                {alert}
                              </span>
                            ))}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        <CounterApptStatusPill apt={apt} converted={Boolean(linked)} />
                        <ChevronRight className="size-4 text-[#6B6B6B]" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {selected && (
          <div className="mt-4 shrink-0 rounded-[18px] border border-[#E8E8E5] bg-white p-4 shadow-[0_12px_28px_rgba(26,25,22,0.05)]">
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="min-w-0">
                <p className="font-bold">{customerName(selected)}</p>
                <p className="truncate text-[#6B6B6B] text-sm">
                  {customerPhone(selected)} · {appointmentDeviceLabel(selected)}
                </p>
                <p className="truncate text-[#6B6B6B] text-sm">
                  {selected.interventionLabel || selected.issueDescription || selected.issue} ·{" "}
                  {appointmentPriceLabel(selected)}
                </p>
              </div>
              {selectedRepair ? (
                <button
                  type="button"
                  onClick={() => onOpenRepairDetail(selectedRepair.id)}
                  className="h-12 rounded-[14px] bg-[#1A1916] px-4 font-black text-white active:scale-[0.98]"
                >
                  Continuer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => transform(selected)}
                  className="h-12 rounded-[14px] bg-[#2A9D8F] px-4 font-black text-white active:scale-[0.98]"
                >
                  Transformer
                </button>
              )}
            </div>
            {selectedRepair && (
              <p className="mt-2 font-bold text-[#1E7A6E] text-sm">Dossier créé · {selectedRepair.number}</p>
            )}
          </div>
        )}
      </section>

      <aside className="min-h-0 overflow-y-auto rounded-[20px] border border-[#E8E8E5] bg-white p-5 shadow-[0_14px_36px_rgba(26,25,22,0.05)]">
        {!selected ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <CalendarPlus className="mx-auto size-9 text-[#6B6B6B]" />
              <p className="mt-3 font-bold">Sélectionnez un rendez-vous</p>
              <p className="mt-1 text-[#6B6B6B] text-sm">Le détail et l'action principale s'affichent ici.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-[16px] border border-[#E8E8E5] bg-[#FFFFFF] p-4">
              <p className="font-bold text-[#6B6B6B] text-[12px] uppercase tracking-[0.06em]">
                {frLongDate(appointmentDay(selected))} · {selected.appointmentTime || selected.time}
              </p>
              <h2 className="mt-2 font-black text-[22px] tracking-tight">{customerName(selected)}</h2>
              <p className="mt-1 text-[#6B6B6B] text-sm">{customerPhone(selected)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <CounterApptStatusPill apt={selected} converted={Boolean(selectedRepair)} />
                {selectedRepair && <CounterMockPill tone="green">{selectedRepair.number}</CounterMockPill>}
              </div>
            </div>
            <dl className="space-y-3 text-sm">
              <CounterApptInfoRow
                icon={<Smartphone className="size-4" />}
                label="Appareil"
                value={appointmentDeviceLabel(selected)}
              />
              <CounterApptInfoRow
                icon={<ClipboardCheck className="size-4" />}
                label="Motif"
                value={selected.interventionLabel || selected.issueDescription || selected.issue || "Non renseigné"}
              />
              <CounterApptInfoRow
                icon={<CreditCard className="size-4" />}
                label="Tarif estimé"
                value={appointmentPriceLabel(selected)}
              />
              <CounterApptInfoRow icon={<Clock className="size-4" />} label="Statut" value={selectedStatus} />
              <CounterApptInfoRow
                icon={<FileText className="size-4" />}
                label="Notes"
                value={selected.notes || "Aucune note"}
              />
            </dl>
            {selectedRepair ? (
              <button
                type="button"
                onClick={() => onOpenRepairDetail(selectedRepair.id)}
                className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#1A1916] font-black text-white active:scale-[0.98]"
              >
                <Wrench className="size-5" /> Continuer la prise en charge
              </button>
            ) : (
              <button
                type="button"
                onClick={() => transform(selected)}
                className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#2A9D8F] font-black text-white active:scale-[0.98]"
              >
                <ClipboardCheck className="size-5" /> Transformer en prise en charge
              </button>
            )}
          </div>
        )}
      </aside>
      {form.open && (
        <CounterAppointmentForm
          defaultDate={selectedDay}
          editing={form.editing}
          prefill={form.editing ? undefined : createPrefill}
          onClose={() => setForm({ open: false, editing: null })}
          onSaved={(id, iso) => {
            setForm({ open: false, editing: null });
            setSearch("");
            if (iso) setSelectedDay(iso);
            setSelectedId(id);
          }}
        />
      )}
    </div>
  );
}

function CounterApptStatusPill({ apt, converted }: Readonly<{ apt: Appointment; converted: boolean }>) {
  if (converted)
    return <CounterMockPill tone="green">{apt.source === "repair" ? "Lié" : "Transformé"}</CounterMockPill>;
  const status = normalizeAppointmentStatus(apt.status, apt.confirmed);
  if (status === "Confirmé" || status === "Arrivé") return <CounterMockPill tone="green">{status}</CounterMockPill>;
  return <CounterMockPill tone="orange">{status}</CounterMockPill>;
}

function CounterApptInfoRow({ icon, label, value }: Readonly<{ icon: React.ReactNode; label: string; value: string }>) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[10px] bg-[#FFFFFF] text-[#6B6B6B]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[#6B6B6B] text-[12px]">{label}</p>
        <p className="font-semibold text-[#1A1916] text-[14px] leading-snug">{value}</p>
      </div>
    </div>
  );
}

// Mini-semaine tactile : navigation semaine + 7 jours cliquables.
function CounterWeekStrip({
  selectedDay,
  onSelect,
  appointments = [],
  allowPast = true,
  className = "",
}: Readonly<{
  selectedDay: string;
  onSelect: (iso: string) => void;
  appointments?: Appointment[];
  allowPast?: boolean;
  className?: string;
}>) {
  const today = localDateValue();
  const monday = mondayOfIso(selectedDay);
  const days = Array.from({ length: 7 }).map((_, i) => localDateValue(addDaysToDate(monday, i)));
  const monthLabel = capitalizeFr(new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(monday));
  const hasEvents = (iso: string) =>
    appointments.some((a) => (a.date || "").slice(0, 10) === iso && normalizeAppointmentStatus(a.status) !== "Annulé");
  return (
    <div className={cn("rounded-[18px] border border-[#E8E8E5] bg-white p-3 shadow-sm", className)}>
      <div className="mb-2 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => onSelect(isoAddDays(selectedDay, -7))}
          className="grid size-9 place-items-center rounded-full bg-[#FFFFFF] text-[#1A1916] transition active:scale-90"
          aria-label="Semaine précédente"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="font-bold text-[14px] tracking-tight">{monthLabel}</span>
        <button
          type="button"
          onClick={() => onSelect(isoAddDays(selectedDay, 7))}
          className="grid size-9 place-items-center rounded-full bg-[#FFFFFF] text-[#1A1916] transition active:scale-90"
          aria-label="Semaine suivante"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((iso, idx) => {
          const isSel = iso === selectedDay;
          const isToday = iso === today;
          const disabled = !allowPast && iso < today;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(iso)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-[12px] py-2 transition active:scale-[0.97]",
                disabled ? "cursor-not-allowed opacity-40" : "hover:bg-[#FFFFFF]",
              )}
            >
              <span className="font-bold text-[#6B6B6B] text-[11px] uppercase tracking-wide">{FR_DAY_SHORT[idx]}</span>
              <span
                className={cn(
                  "grid size-10 place-items-center rounded-full font-black text-[15px] tabular-nums transition",
                  isSel
                    ? "bg-[#2A9D8F] text-white shadow-[0_4px_12px_rgba(42,157,143,0.3)]"
                    : isToday
                      ? "bg-[#FFFFFF] text-[#1E7A6E]"
                      : "text-[#1A1916]",
                )}
              >
                {isoToDate(iso).getDate()}
              </span>
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  hasEvents(iso) ? (isSel ? "bg-white" : "bg-[#2A9D8F]") : "bg-transparent",
                )}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

const APPOINTMENT_QUICK_MOTIFS = [
  "Écran",
  "Batterie",
  "Connecteur de charge",
  "Caméra",
  "Haut-parleur",
  "Micro",
  "Diagnostic",
  "Micro-soudure",
  "HDMI console",
  "Nettoyage",
  "Autre",
];

// Formulaire compact & tactile : client (existant/nouveau) · appareil · motif · créneau · notes.
// Réutilise DeviceSelector, ProblemSelector et la recherche client existante.
function CounterAppointmentForm({
  defaultDate,
  editing,
  prefill,
  onClose,
  onSaved,
}: Readonly<{
  defaultDate: string;
  editing: Appointment | null;
  prefill?: CounterAppointmentPrefill;
  onClose: () => void;
  onSaved: (id: string, iso: string) => void;
}>) {
  const customers = useBeharStore((s) => s.customers);
  const addCustomer = useBeharStore((s) => s.addCustomer);
  const addAppointment = useBeharStore((s) => s.addAppointment);
  const updateAppointment = useBeharStore((s) => s.updateAppointment);

  const today = localDateValue();
  const editingCustomer = editing?.customerId
    ? customers.find((customer) => customer.id === editing.customerId)
    : undefined;
  const initialMode: CounterClientMode = editing
    ? editingCustomer?.type === "counter"
      ? "counter"
      : "existing"
    : (prefill?.clientMode ?? (prefill?.customerId ? "existing" : "existing"));
  const initialModel = editing?.deviceModel || prefill?.model || "Autre";
  const initialBrand = editing?.deviceBrand || prefill?.brand || "Apple";
  const initialDevice =
    editing?.device ||
    prefill?.device ||
    [initialBrand, initialModel === "Autre" ? "" : initialModel].filter(Boolean).join(" ");
  const prefillPrice = toMoney(prefill?.price ?? "");
  const [mode, setMode] = useState<CounterClientMode>(initialMode);
  const [customerId, setCustomerId] = useState(editing?.customerId ?? prefill?.customerId ?? "");
  const [newName, setNewName] = useState(initialMode === "new" ? (prefill?.clientName ?? "") : "");
  const [newPhone, setNewPhone] = useState(initialMode === "new" ? (prefill?.clientPhone ?? "") : "");
  const [newEmail, setNewEmail] = useState(initialMode === "new" ? (prefill?.clientEmail ?? "") : "");
  const [deviceState, setDeviceState] = useState({
    deviceType: editing?.deviceType || prefill?.deviceType || "Smartphone",
    brand: initialBrand,
    model: initialModel,
    customModel: "",
    deviceLabel: initialDevice,
  });
  const [issue, setIssue] = useState(editing?.issue ?? prefill?.issue ?? "");
  const [dateValue, setDateValue] = useState(editing ? (editing.date || "").slice(0, 10) || defaultDate : defaultDate);
  const [time, setTime] = useState(editing?.time ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? prefill?.notes ?? "");

  const slots = useMemo(() => buildCounterTimeSlots(dateValue), [dateValue]);
  const selectedCustomer = customers.find((c) => c.id === customerId);
  const counterCustomer = customers.find(
    (customer) => customer.type === "counter" || customer.name.startsWith("Client comptoir"),
  );
  const duplicateCustomer = useMemo(() => {
    if (mode !== "new") return undefined;
    const phoneDigits = compactPhone(newPhone);
    const emailKey = newEmail.trim().toLowerCase();
    if (!phoneDigits && !emailKey) return undefined;
    return customers.find(
      (customer) =>
        customer.type !== "counter" &&
        ((phoneDigits && compactPhone(customer.phone) === phoneDigits) ||
          (emailKey && customer.email.trim().toLowerCase() === emailKey)),
    );
  }, [customers, mode, newEmail, newPhone]);
  const finalModelLabel =
    deviceState.model === "Autre" ? deviceState.customModel.trim() || initialModel : deviceState.model;
  const device =
    deviceState.deviceLabel.trim() ||
    [deviceState.brand, finalModelLabel === "Autre" ? "" : finalModelLabel].filter(Boolean).join(" ").trim();

  const submit = () => {
    let resolvedId = customerId;
    let clientName = selectedCustomer?.name || prefill?.clientName || "Client comptoir";
    let clientPhone = selectedCustomer?.phone || prefill?.clientPhone || "";
    let clientEmail = selectedCustomer?.email || prefill?.clientEmail || "";
    if (mode === "counter") {
      resolvedId = customerId || counterCustomer?.id || addCustomer({ name: "Client comptoir", type: "counter" });
      clientName = prefill?.clientName?.trim() || "Client comptoir";
      clientPhone = prefill?.clientPhone?.trim() || "";
      clientEmail = prefill?.clientEmail?.trim() || "";
    } else if (mode === "new") {
      const name = newName.trim() || "Client comptoir";
      resolvedId =
        duplicateCustomer?.id ??
        addCustomer({
          name,
          phone: newPhone.trim() || "Non renseigné",
          email: newEmail.trim() || "Non renseigné",
          device: device || "Appareil",
          lastRepair: issue.trim(),
          source: "Rendez-vous comptoir",
        });
      clientName = name;
      clientPhone = newPhone.trim();
      clientEmail = newEmail.trim();
    } else {
      clientName = selectedCustomer?.name || "Client comptoir";
      clientPhone = selectedCustomer?.phone || "";
      clientEmail = selectedCustomer?.email || "";
    }
    if (!resolvedId) {
      toast.error("Sélectionnez un client existant ou créez-en un.");
      return;
    }
    if (!dateValue) {
      toast.error("Choisissez une date.");
      return;
    }
    if (!time) {
      toast.error("Choisissez un créneau horaire.");
      return;
    }
    const finalDevice = device || "Appareil";
    const finalIssue = issue.trim() || "Diagnostic";
    if (editing) {
      updateAppointment(editing.id, {
        customerId: resolvedId,
        clientMode: mode,
        clientName,
        clientPhone,
        clientEmail,
        device: finalDevice,
        deviceType: deviceState.deviceType as DeviceType,
        deviceBrand: deviceState.brand,
        deviceModel: finalModelLabel,
        issue: finalIssue,
        issueDescription: finalIssue,
        interventionLabel: finalIssue,
        date: dateValue,
        time,
        appointmentDate: dateValue,
        appointmentTime: time,
        notes,
        status: "Planifié",
        confirmed: false,
      });
      toast.success("Rendez-vous mis à jour.");
      onSaved(editing.id, dateValue);
      return;
    }
    const id = addAppointment({
      customerId: resolvedId,
      clientMode: mode,
      clientName,
      clientPhone,
      clientEmail,
      device: finalDevice,
      deviceType: deviceState.deviceType as DeviceType,
      deviceBrand: deviceState.brand,
      deviceModel: finalModelLabel,
      issue: finalIssue,
      issueDescription: finalIssue,
      interventionLabel: finalIssue,
      customerPrice: prefillPrice > 0 ? prefillPrice : undefined,
      estimatedTotal: prefillPrice > 0 ? prefillPrice : undefined,
      priceStatus: prefillPrice > 0 ? "confirmed" : "to_confirm",
      date: dateValue,
      time,
      appointmentDate: dateValue,
      appointmentTime: time,
      notes,
      status: "Planifié",
      confirmed: false,
      source: "Rendez-vous comptoir",
      channel: "Comptoir tablette",
    });
    if (!id) {
      toast.error("Rendez-vous non créé.");
      return;
    }
    toast.success("Rendez-vous créé.");
    onSaved(id, dateValue);
  };
  const prefilledFromIntake = Boolean(prefill && !editing);

  return (
    <div className="fixed inset-0 z-50 grid place-items-stretch overflow-y-auto bg-[#1A1916]/25 p-0 md:place-items-center md:p-5">
      <div className="flex min-h-svh w-full max-w-none flex-col bg-white md:max-h-[calc(100svh-2.5rem)] md:min-h-0 md:w-[600px] md:max-w-[600px] md:rounded-[22px] md:bg-white md:shadow-[0_30px_80px_rgba(26,25,22,0.22)]">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-[#E8E8E5] border-b bg-white px-5 py-4 md:rounded-t-[22px]">
          <div>
            <h2 className="font-black text-[22px] tracking-tight">
              {editing ? "Modifier le rendez-vous" : "Nouveau rendez-vous"}
            </h2>
            <p className="mt-0.5 text-[#6B6B6B] text-[13px]">
              {prefilledFromIntake
                ? "Choisissez uniquement la date et le créneau."
                : "Client, appareil, motif et créneau en une fois."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-[12px] border border-[#E8E8E5] bg-white text-[#1A1916] transition active:scale-90"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {!prefilledFromIntake && (
            <>
              <section className="rounded-[16px] border border-[#E8E8E5] bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-black text-[15px]">Client</h3>
                  <div className="grid grid-cols-3 rounded-[10px] border border-[#E8E8E5] bg-[#FFFFFF] p-0.5">
                    {(["counter", "existing", "new"] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setMode(value)}
                        className={cn(
                          "h-8 rounded-[8px] px-3 font-bold text-[12.5px] transition",
                          mode === value ? "bg-white text-[#1A1916] shadow-sm" : "text-[#6B6B6B]",
                        )}
                      >
                        {value === "counter" ? "Comptoir" : value === "existing" ? "Existant" : "Nouveau"}
                      </button>
                    ))}
                  </div>
                </div>
                {mode === "counter" ? (
                  <div className="rounded-[14px] border border-[#DDEFEA] bg-[#FFFFFF] px-4 py-3 text-sm font-semibold text-[#1E7A6E]">
                    {prefill?.clientName || "Client comptoir"}
                    {prefill?.clientPhone ? <span className="ml-2 text-[#6B6B6B]">{prefill.clientPhone}</span> : null}
                  </div>
                ) : mode === "existing" ? (
                  <ExistingCustomerSearch value={customerId} onChange={setCustomerId} />
                ) : (
                  <div className="grid gap-2.5">
                    <CounterInput
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nom du client"
                    />
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <CounterInput
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="Téléphone"
                        inputMode="tel"
                      />
                      <CounterInput
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Email"
                        type="email"
                      />
                    </div>
                    {duplicateCustomer ? (
                      <div className="flex flex-col gap-3 rounded-[14px] border border-[#D7EFEA] bg-[#FFFFFF] p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-[#1A1916]">
                          <b>Client déjà connu</b>
                          <span className="block text-[#6B6B6B]">
                            {duplicateCustomer.name}
                            {duplicateCustomer.phone ? ` · ${duplicateCustomer.phone}` : ""}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerId(duplicateCustomer.id);
                            setMode("existing");
                          }}
                          className="h-10 rounded-[12px] bg-[#2A9D8F] px-4 font-bold text-white active:scale-[0.98]"
                        >
                          Reprendre ce client
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
                {mode === "existing" && selectedCustomer && (
                  <p className="mt-2 text-[#6B6B6B] text-[13px]">
                    {selectedCustomer.phone || "Non renseigné"}
                    {selectedCustomer.email ? ` · ${selectedCustomer.email}` : ""}
                  </p>
                )}
              </section>

              <section className="rounded-[16px] border border-[#E8E8E5] bg-white p-4">
                <h3 className="mb-3 font-black text-[15px]">Appareil</h3>
                <DeviceSelector
                  deviceType={deviceState.deviceType}
                  brand={deviceState.brand}
                  model={deviceState.model}
                  customModel={deviceState.customModel}
                  onChange={(updates) =>
                    setDeviceState((prev) => ({
                      ...prev,
                      ...updates,
                      deviceType: (updates.deviceType ?? prev.deviceType) as DeviceType,
                    }))
                  }
                />
                {editing && device && (
                  <p className="mt-2 text-[#6B6B6B] text-[12.5px]">
                    Appareil actuel : <b className="text-[#1A1916]">{device}</b>
                  </p>
                )}
              </section>

              <section className="rounded-[16px] border border-[#E8E8E5] bg-white p-4">
                <h3 className="mb-3 font-black text-[15px]">Motif</h3>
                <div className="mb-3 flex flex-wrap gap-2">
                  {APPOINTMENT_QUICK_MOTIFS.map((motif) => (
                    <button
                      key={motif}
                      type="button"
                      onClick={() => setIssue(motif === "Autre" ? "" : motif)}
                      className={cn(
                        "h-10 rounded-[12px] border px-3.5 font-semibold text-[13.5px] transition active:scale-[0.97]",
                        issue === motif
                          ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#1E7A6E]"
                          : "border-[#E8E8E5] bg-white text-[#1A1916]",
                      )}
                    >
                      {motif}
                    </button>
                  ))}
                </div>
                <ProblemSelector
                  deviceType={deviceState.deviceType}
                  value={issue}
                  onChange={setIssue}
                  label="Motif précis (ou libre)"
                />
              </section>
            </>
          )}

          {/* Étape 4 — Date / créneau */}
          <section className="rounded-[16px] border border-[#E8E8E5] bg-white p-4">
            <h3 className="mb-3 font-black text-[15px]">Date & créneau</h3>
            <CounterWeekStrip
              selectedDay={dateValue}
              onSelect={(iso) => {
                setDateValue(iso);
                setTime("");
              }}
              allowPast={false}
              className="mb-3"
            />
            <span className="mb-2 block font-bold text-[14px]">Créneau — {frLongDate(dateValue)}</span>
            {slots.length === 0 ? (
              <p className="rounded-[14px] border border-[#E8E8E5] bg-[#FFFFFF] px-4 py-5 text-center text-[#6B6B6B] text-sm">
                Aucun créneau disponible pour cette date.
              </p>
            ) : (
              <div className="grid max-h-[176px] grid-cols-4 gap-2 overflow-y-auto">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setTime(slot)}
                    className={cn(
                      "h-11 rounded-[12px] border font-semibold tabular-nums transition active:scale-[0.97]",
                      time === slot
                        ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#1E7A6E]"
                        : "border-[#E8E8E5] bg-white text-[#1A1916] hover:bg-[#FFFFFF]",
                    )}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </section>

          {!prefilledFromIntake && (
            <section className="rounded-[16px] border border-[#E8E8E5] bg-white p-4">
              <h3 className="mb-3 font-black text-[15px]">Notes (optionnel)</h3>
              <CounterTextarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajouter une note courte…"
              />
            </section>
          )}
        </div>

        <div className="sticky bottom-0 z-10 grid grid-cols-[1fr_1.4fr] gap-3 border-[#E8E8E5] border-t bg-white px-5 py-4 md:rounded-b-[22px]">
          <button
            type="button"
            onClick={onClose}
            className="h-[54px] rounded-[14px] border border-[#E8E8E5] font-bold active:scale-[0.98]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            className="inline-flex h-[54px] items-center justify-center gap-2 rounded-[14px] bg-[#2A9D8F] font-black text-white active:scale-[0.98]"
          >
            <Check className="size-5" /> {editing ? "Enregistrer" : "Créer le rendez-vous"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers date pour les rendez-vous comptoir ──────────────────────────────
const FR_DAY_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function isoToDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

function mondayOfIso(iso: string) {
  const date = isoToDate(iso);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDaysToDate(date: Date, n: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + n);
  return next;
}

function isoAddDays(iso: string, n: number) {
  return localDateValue(addDaysToDate(isoToDate(iso), n));
}

function capitalizeFr(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function frLongDate(iso: string) {
  return capitalizeFr(
    new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(isoToDate(iso)),
  );
}

function CounterClientsScreen({
  onClose,
  onCreateRepair,
  onCreateQuote,
  onPay,
  onOpenRepairDetail,
}: Readonly<{
  onClose: () => void;
  onCreateRepair: (prefill: Partial<Repair>) => void;
  onCreateQuote: () => void;
  onPay: (repairId?: string) => void;
  onOpenRepairDetail: (repairId: string) => void;
}>) {
  const customersAll = useBeharStore((s) => s.customers);
  const repairs = useBeharStore((s) => s.repairs);
  const quotes = useBeharStore((s) => s.quotes);
  const invoices = useBeharStore((s) => s.invoices);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  // Vrais clients du dashboard (on masque le client comptoir anonyme).
  const clients = useMemo(() => customersAll.filter((c) => c.type !== "counter"), [customersAll]);
  const filtered = useMemo(
    () =>
      clients.filter((client) =>
        compactText(`${client.name} ${client.phone ?? ""} ${client.email ?? ""}`).includes(compactText(query)),
      ),
    [clients, query],
  );
  const selected = clients.find((client) => client.id === selectedId) ?? filtered[0] ?? clients[0];
  const customerRepairs = useMemo(
    () => (selected ? repairs.filter((r) => r.customerId === selected.id) : []),
    [repairs, selected],
  );
  const customerQuotes = useMemo(
    () => (selected ? quotes.filter((q) => q.customerId === selected.id) : []),
    [quotes, selected],
  );
  const paymentRequestRepairId = customerRepairs.find((repair) =>
    invoices.some(
      (invoice) =>
        invoice.repairId === repair.id &&
        invoice.status !== "Brouillon" &&
        invoice.status !== "Annulée" &&
        getInvoiceTotal(invoice) > 0,
    ),
  )?.id;

  if (clients.length === 0) {
    return (
      <div className="mx-auto max-w-[680px]">
        <CounterScreenTitle title="Clients" subtitle="Rechercher et gérer vos clients" onClose={onClose} />
        <div className="rounded-[20px] border border-[#E8E8E5] bg-white p-10 text-center shadow-[0_10px_30px_rgba(26,25,22,0.04)]">
          <p className="font-black text-lg">Aucun client pour le moment</p>
          <p className="mt-2 text-[#6B6B6B]">Créez une prise en charge pour enregistrer votre premier client.</p>
          <button
            type="button"
            onClick={() => onCreateRepair({})}
            className="mt-5 inline-flex h-[52px] items-center gap-2 rounded-[14px] bg-[#2A9D8F] px-6 font-black text-white"
          >
            <Plus className="size-5" /> Ajouter un client
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-[1180px] gap-7 lg:grid-cols-[380px_1fr]">
      <aside className="rounded-[20px] border border-[#E8E8E5] bg-white p-5 shadow-[0_10px_30px_rgba(26,25,22,0.04)]">
        <CounterScreenTitle title="Clients" subtitle="Rechercher et gérer vos clients" onClose={onClose} />
        <div className="grid grid-cols-[1fr_52px] gap-3">
          <CounterInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, téléphone ou email"
          />
          <button type="button" className="rounded-[14px] border border-[#E8E8E5]">
            <Search className="mx-auto size-5" />
          </button>
        </div>
        <p className="mt-4 text-[#6B6B6B] text-sm">{filtered.length} clients trouvés</p>
        <ul className="mt-3 space-y-2">
          {filtered.map((client) => (
            <li key={client.id}>
              <button
                type="button"
                onClick={() => setSelectedId(client.id)}
                className={cn(
                  "grid min-h-[62px] w-full grid-cols-[42px_1fr_auto] items-center gap-3 rounded-[13px] border px-3 text-left transition active:scale-[0.99]",
                  client.id === selected?.id ? "border-[#2A9D8F] bg-[#FFFFFF]" : "border-[#E8E8E5] bg-white",
                )}
              >
                <span className="grid size-9 place-items-center rounded-full bg-[#FFFFFF] font-bold text-[#1E7A6E]">
                  {counterInitials(client.name)}
                </span>
                <span>
                  <b>{client.name}</b>
                  <span className="block text-[#6B6B6B] text-sm">{client.phone || "Non renseigné"}</span>
                </span>
                <ChevronRight className="size-4 text-[#6B6B6B]" />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => onCreateRepair({})}
          className="mt-3 h-[52px] w-full rounded-[14px] border border-[#E8E8E5] font-bold"
        >
          <Plus className="mr-2 inline size-4" /> Ajouter un client
        </button>
      </aside>
      <section className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <span className="grid size-16 place-items-center rounded-full bg-[#FFFFFF] font-black text-[#1E7A6E] text-2xl">
              {counterInitials(selected?.name ?? "")}
            </span>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-black text-[26px]">{selected?.name}</h1>
                <CounterMockPill>Client actif</CounterMockPill>
              </div>
              <p className="mt-1 text-[#6B6B6B]">
                <span className="mr-4">{selected?.phone || "Non renseigné"}</span>
                {selected?.email || ""}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-4 gap-4">
          <ClientQuickAction
            icon={<Plus className="size-8" />}
            label="Nouvelle prise en charge"
            onClick={() =>
              onCreateRepair({
                customerId: selected?.id,
                notes: `Client : ${selected?.name}${selected?.phone ? ` — ${selected.phone}` : ""}`,
              })
            }
            primary
          />
          <ClientQuickAction icon={<FileText className="size-7" />} label="Nouveau devis" onClick={onCreateQuote} />
          <ClientQuickAction
            icon={<CreditCard className="size-7" />}
            label="Créer une demande de paiement"
            onClick={() => onPay(paymentRequestRepairId)}
          />
          <ClientQuickAction
            icon={<ClipboardCheck className="size-7" />}
            label="Voir les dossiers"
            onClick={() => customerRepairs[0] && onOpenRepairDetail(customerRepairs[0].id)}
          />
        </div>
        <div className="mt-8 flex items-center justify-between">
          <h2 className="font-black text-xl">Derniers dossiers</h2>
        </div>
        {customerRepairs.length === 0 && customerQuotes.length === 0 ? (
          <p className="mt-4 rounded-[14px] border border-[#E8E8E5] bg-white px-4 py-8 text-center text-[#6B6B6B]">
            Aucun dossier pour ce client.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {customerRepairs.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onOpenRepairDetail(r.id)}
                  className="grid min-h-[74px] w-full grid-cols-[52px_1fr_110px_90px] items-center rounded-[14px] border border-[#E8E8E5] bg-white px-4 text-left shadow-sm"
                >
                  <span className="grid size-10 place-items-center rounded-full bg-[#FFFFFF] text-[#1E7A6E]">
                    <Wrench className="size-5" />
                  </span>
                  <span>
                    <b>Réparation — {r.deviceModel || r.device}</b>
                    <span className="block text-[#6B6B6B] text-sm">{r.issue || "Non renseigné"}</span>
                  </span>
                  <CounterMockPill tone={counterDossierTone(r.status)}>{r.status}</CounterMockPill>
                  <b className="text-right">{formatEuro(repairAmount(r))}</b>
                </button>
              </li>
            ))}
            {customerQuotes.map((q) => (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={onCreateQuote}
                  className="grid min-h-[74px] w-full grid-cols-[52px_1fr_110px_90px] items-center rounded-[14px] border border-[#E8E8E5] bg-white px-4 text-left shadow-sm"
                >
                  <span className="grid size-10 place-items-center rounded-full bg-[#FFFFFF] text-[#1E7A6E]">
                    <FileText className="size-5" />
                  </span>
                  <span>
                    <b>Devis — {q.deviceModel || q.device || "Appareil"}</b>
                    <span className="block text-[#6B6B6B] text-sm">{q.issue || q.number}</span>
                  </span>
                  <CounterMockPill tone={q.status === "Accepté" || q.status === "Facturé" ? "green" : "orange"}>
                    {q.status}
                  </CounterMockPill>
                  <b className="text-right">{formatEuro(q.totalTtc ?? q.totalAmount ?? 0)}</b>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ClientQuickAction({
  icon,
  label,
  onClick,
  primary,
}: Readonly<{ icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[142px] flex-col items-center justify-center rounded-[16px] border border-[#E8E8E5] bg-white p-4 text-center font-black shadow-[0_10px_26px_rgba(26,25,22,0.04)] active:scale-[0.98]"
    >
      <span
        className={cn(
          "grid size-14 place-items-center rounded-full",
          primary ? "bg-[#2A9D8F] text-white" : "bg-[#FFFFFF] text-[#1E7A6E]",
        )}
      >
        {icon}
      </span>
      <span className="mt-4 leading-tight">{label}</span>
    </button>
  );
}

const COUNTER_DOSSIER_FILTERS: Array<Repair["status"] | "all"> = [
  "all",
  "Reçu",
  "Diagnostic",
  "Devis envoyé",
  "Devis accepté",
  "En réparation",
  "Test final",
  "Prêt",
  "Rendu",
  "SAV",
  "Clôturé",
];

function counterDossierTone(status: Repair["status"]): "green" | "orange" | "gray" {
  if (status === "Prêt") return "green";
  if (isTerminalRepairStatus(status)) return "gray";
  return "orange";
}

function CounterDossiersScreen({
  onClose,
  onCreate,
  onOpenRepairDetail,
  scanMode = false,
  onScanModeChange,
}: Readonly<{
  onClose: () => void;
  onCreate: () => void;
  onOpenRepairDetail: (repairId: string) => void;
  scanMode?: boolean;
  onScanModeChange?: (value: boolean) => void;
}>) {
  const store = useBeharStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Repair["status"] | "all">("all");
  const visibleStatuses = useMemo(
    () => new Set(COUNTER_DOSSIER_FILTERS.filter((entry): entry is Repair["status"] => entry !== "all")),
    [],
  );
  const handleScanResult = useCallback(
    (value: string) => {
      const q = value.trim();
      if (!q) return;
      const normalized = q.toLowerCase();
      const digits = normalized.replace(/\D/g, "");
      const found = store.repairs.find((repair) => {
        if (repair.number.toLowerCase() === normalized || repair.number.toLowerCase().includes(normalized)) return true;
        if ((repair.imei || "").toLowerCase() === normalized) return true;
        if (digits.length >= 6) {
          const customer = store.customers.find((entry) => entry.id === repair.customerId);
          if (customer?.phone && customer.phone.replace(/\D/g, "").includes(digits)) return true;
        }
        return false;
      });
      if (found) {
        toast.success(`Dossier reconnu : ${displayRepairCode(found)}`);
        onOpenRepairDetail(found.id);
        return;
      }
      setQuery(q);
      toast.info("Aucun QR exact reconnu. La recherche Dossiers a été préremplie.");
    },
    [store.repairs, store.customers, onOpenRepairDetail],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.repairs
      .map((repair) => {
        const customer = store.customers.find((c) => c.id === repair.customerId);
        const linkedAppointment = repair.appointmentId
          ? store.appointments.find((a) => a.id === repair.appointmentId)
          : undefined;
        const name =
          customer?.type === "counter"
            ? linkedAppointment?.clientName || customer.name || "Client comptoir"
            : customer?.name || linkedAppointment?.clientName || "Client comptoir";
        const phone =
          customer?.type === "counter"
            ? linkedAppointment?.clientPhone || ""
            : customer?.phone || linkedAppointment?.clientPhone || "";
        const quote = store.quotes.find((entry) => entry.repairId === repair.id);
        const invoice = store.invoices.find((entry) => entry.repairId === repair.id);
        const device = repairDeviceLabel(repair, "Appareil");
        const haystack = [repair.number, name, phone, device, repair.imei, repair.issue, quote?.number, invoice?.number]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return { repair, name, phone, device, quote, invoice, haystack };
      })
      .filter((row) => (filter === "all" ? visibleStatuses.has(row.repair.status) : row.repair.status === filter))
      .filter((row) => (q ? row.haystack.includes(q) : true))
      .sort((a, b) => {
        const da = new Date(a.repair.updatedAt || a.repair.droppedAt || a.repair.createdAt || 0).getTime();
        const db = new Date(b.repair.updatedAt || b.repair.droppedAt || b.repair.createdAt || 0).getTime();
        return db - da;
      });
  }, [
    store.repairs,
    store.customers,
    store.appointments,
    store.quotes,
    store.invoices,
    query,
    filter,
    visibleStatuses,
  ]);

  const counts = useMemo(() => {
    const map = new Map<Repair["status"] | "all", number>();
    let total = 0;
    for (const repair of store.repairs) {
      if (!visibleStatuses.has(repair.status)) continue;
      total += 1;
      map.set(repair.status, (map.get(repair.status) ?? 0) + 1);
    }
    map.set("all", total);
    return map;
  }, [store.repairs, visibleStatuses]);

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <CounterScreenTitle
          title="Dossiers"
          subtitle="Recherche, filtres et accès rapide aux dossiers comptoir."
          onClose={onClose}
        />
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-[52px] items-center gap-2 rounded-[14px] bg-[#2A9D8F] px-6 font-black text-white shadow-sm active:scale-[0.98]"
        >
          <Plus className="size-5" /> Nouvelle prise en charge
        </button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_1fr]">
        <button
          type="button"
          onClick={() => onScanModeChange?.(false)}
          className={cn(
            "h-[52px] rounded-[14px] border font-black active:scale-[0.98]",
            !scanMode ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#1E7A6E]" : "border-[#E8E8E5] bg-white text-[#1D1D1F]",
          )}
        >
          <Search className="mr-2 inline size-5" /> Recherche
        </button>
        <button
          type="button"
          onClick={() => onScanModeChange?.(true)}
          className={cn(
            "h-[52px] rounded-[14px] border font-black active:scale-[0.98]",
            scanMode ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#1E7A6E]" : "border-[#E8E8E5] bg-white text-[#1D1D1F]",
          )}
        >
          <ScanLine className="mr-2 inline size-5" /> Scan QR
        </button>
      </div>

      {scanMode ? (
        <section className="mb-4 rounded-[18px] border border-[#E8E8E5] bg-white p-4 shadow-[0_10px_26px_rgba(26,25,22,0.04)]">
          <CounterLiveScanner onDetected={handleScanResult} />
        </section>
      ) : null}

      <div className="mb-4">
        <CounterInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher : client, téléphone, appareil, IMEI, n° dossier ou facture"
        />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {COUNTER_DOSSIER_FILTERS.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => setFilter(entry)}
            className={cn(
              "inline-flex h-[44px] items-center gap-2 rounded-full border px-4 font-semibold active:scale-[0.98]",
              filter === entry
                ? "border-[#2A9D8F] bg-[#2A9D8F] text-white"
                : "border-[#E8E8E5] bg-white text-[#1A1916]",
            )}
          >
            {entry === "all" ? "Tous" : entry}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[12px]",
                filter === entry ? "bg-white" : "bg-[#FFFFFF] text-[#6B6B6B]",
              )}
            >
              {counts.get(entry) ?? 0}
            </span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-[#E8E8E5] bg-white px-6 py-16 text-center text-[#6B6B6B]">
          Aucun dossier ne correspond à votre recherche.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(({ repair, name, phone, device, quote, invoice }) => {
            const amount = repairAmount(repair);
            const tone = counterDossierTone(repair.status);
            return (
              <button
                key={repair.id}
                type="button"
                onClick={() => onOpenRepairDetail(repair.id)}
                className="flex w-full items-center gap-4 rounded-[18px] border border-[#E8E8E5] bg-white p-4 text-left shadow-[0_1px_2px_rgba(26,25,22,0.04)] transition hover:border-[#2A9D8F]/40 hover:shadow-[0_10px_28px_rgba(26,25,22,0.06)] active:scale-[0.995]"
              >
                <RealDeviceVisual
                  brand={repair.brandName}
                  model={repairDeviceLabel(repair, repair.device)}
                  type={repair.deviceType}
                  className="size-[66px] rounded-[12px] border border-[#E8E8E5] p-1.5"
                />
                <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-[#FFFFFF] font-black text-[#1E7A6E]">
                  {counterInitials(name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-[8px] bg-[#FFFFFF] px-2 py-0.5 font-black text-[#1A1916] text-[13px]">
                      #{repair.number}
                    </span>
                    <CounterMockPill tone={tone}>{repair.status}</CounterMockPill>
                  </div>
                  <p className="mt-1.5 truncate font-bold text-[#1A1916]">{name}</p>
                  <p className="truncate text-[#6B6B6B] text-sm">
                    {device}
                    {phone ? ` · ${phone}` : ""}
                  </p>
                  <p className="mt-0.5 truncate text-[#6B6B6B] text-sm">{repair.issue || "Intervention à préciser"}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {quote ? (
                      <span className="inline-flex items-center gap-1 rounded-[7px] border border-[#E8E8E5] bg-[#FFFFFF] px-2 py-0.5 font-semibold text-[#6B6B6B] text-[11px]">
                        <FileText className="size-3" /> {quote.number}
                      </span>
                    ) : null}
                    {invoice ? (
                      <span className="inline-flex items-center gap-1 rounded-[7px] border border-[#E8E8E5] bg-[#FFFFFF] px-2 py-0.5 font-semibold text-[#6B6B6B] text-[11px]">
                        <Receipt className="size-3" /> {invoice.number}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="font-black text-[#1A1916] text-lg tabular-nums">{formatEuro(amount)}</p>
                  <p className="mt-0.5 text-[#6B6B6B] text-xs">
                    {formatCounterDateTime(repair.droppedAt || repair.createdAt)}
                  </p>
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#2A9D8F] text-white">
                  <ChevronRight className="size-5" />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CounterRepairDetailScreen({
  repairId,
  onClose,
  onOpenDocuments,
}: Readonly<{ repairId: string; onClose: () => void; onOpenDocuments?: () => void }>) {
  const store = useBeharStore();
  const { print } = useDocument();
  const settlement = useSettlementModal();
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [selectedQrRepairId, setSelectedQrRepairId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const repair =
    store.repairs.find((r) => r.id === repairId) ??
    store.repairs.find((r) => !isTerminalRepairStatus(r.status)) ??
    store.repairs[0];
  if (!repair) return <EmptyCounter title="Dossier réparation" message="Aucun dossier à afficher." onClose={onClose} />;
  const customer = store.customers.find((c) => c.id === repair.customerId);
  const linkedAppointment = repair.appointmentId
    ? store.appointments.find((appointment) => appointment.id === repair.appointmentId)
    : undefined;
  const customerLabel =
    customer?.type === "counter"
      ? linkedAppointment?.clientName || customer.name || "Client comptoir"
      : customer?.name || linkedAppointment?.clientName || "Non renseigné";
  const customerPhone =
    customer?.type === "counter"
      ? linkedAppointment?.clientPhone || "Non renseigné"
      : customer?.phone || linkedAppointment?.clientPhone || "Non renseigné";
  const invoice = store.invoices.find((i) => i.repairId === repair.id);
  const amount = repairAmount(repair);
  const photos = repair.intakeCondition?.photos ?? [];
  const prestations = repair.counterPrestations ?? [];
  const intakeDoc = store.documents.find((d) => d.type === "intake" && d.repairId === repair.id);
  const openClientTracking = () => {
    const url = getCustomerTrackingUrl(repair, store.workshopSettings ?? store.workshopInfo);
    if (!url) return toast.error("Lien de suivi indisponible.");
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openPaymentRequest = () => {
    const invoiceId = invoice?.id || store.createInvoiceFromRepair(repair.id);
    if (!invoiceId) return toast.error("Finalisez une facture avant de créer la demande.");
    settlement.open(repair.id);
  };
  // Étape suivante du dossier atelier (statut), pensée pour le comptoir tactile.
  const COUNTER_NEXT_STATUS: Partial<Record<Repair["status"], { next: Repair["status"]; label: string }>> = {
    Reçu: { next: "Diagnostic", label: "Passer en diagnostic" },
    Diagnostic: { next: "En réparation", label: "Passer en réparation" },
    "Devis accepté": { next: "En réparation", label: "Passer en réparation" },
    "En réparation": { next: "Test final", label: "Passer en test final" },
    "Test final": { next: "Prêt", label: "Marquer prêt" },
  };
  const nextStep = COUNTER_NEXT_STATUS[repair.status];
  const advanceStatus = () => {
    if (!nextStep) return;
    store.changeRepairStatus(repair.id, nextStep.next);
    toast.success(`Dossier passé en « ${nextStep.next} ».`);
  };
  // La clôture reste strictement opérationnelle et indépendante du règlement externe.
  const confirmCloseDossier = () => {
    if (isTerminalRepairStatus(repair.status)) return toast.info("Dossier déjà terminé.");
    setCloseConfirmOpen(false);
    store.changeRepairStatus(repair.id, "Clôturé");
    toast.success("Dossier clôturé.");
  };
  // Génère le vrai bon de prise en charge via le système Documents existant.
  const validatePriseEnCharge = () => {
    if (!customer) {
      toast.error("Associez un client avant de générer le bon de prise en charge.");
      return;
    }
    if (!(repair.deviceModel || repair.device)) {
      toast.error("Renseignez l'appareil avant de générer le bon.");
      return;
    }
    // Le bon existe déjà (doc_intake_${repair.id}) dès la création du dossier :
    // on ne crée pas de doublon, on confirme simplement sa disponibilité.
    store.updateRepair(repair.id, {
      history: [...repair.history, "Bon de prise en charge généré (comptoir)"],
    });
    toast.success("Bon de prise en charge généré — disponible dans Documents.");
  };
  const addInternalNote = () => {
    const value = noteDraft.trim();
    if (!value) return;
    store.updateRepair(repair.id, { notes: [repair.notes, value].filter(Boolean).join("\n") });
    setNoteDraft("");
    toast.success("Note interne ajoutée.");
  };
  const addPhoto = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const now = new Date().toISOString();
      store.updateRepair(repair.id, {
        intakeCondition: {
          ...(repair.intakeCondition ?? {}),
          photos: [
            ...(repair.intakeCondition?.photos ?? []),
            { id: `photo_${Date.now()}`, name: file.name || "Photo dossier", dataUrl: reader.result, createdAt: now },
          ],
          updatedAt: now,
        },
      });
      toast.success("Photo ajoutée au dossier.");
    };
    reader.readAsDataURL(file);
  };
  return (
    <div className="mx-auto max-w-[1160px]">
      <div className="mb-5 flex items-start justify-between">
        <CounterScreenTitle title="Dossier réparation" subtitle={repairDeviceLabel(repair)} onClose={onClose} />
        <div className="pt-4">
          <CounterMockPill tone={counterDossierTone(repair.status)}>{repair.status}</CounterMockPill>
        </div>
      </div>
      <div className="mb-5 flex items-center gap-3">
        <span className="rounded-[9px] bg-[#FFFFFF] px-4 py-2 font-black text-[#1E7A6E]">#{repair.number}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <TopInfoCard
          label="Client"
          title={customerLabel}
          detail={customerPhone}
          icon={
            <span className="grid size-10 place-items-center rounded-full bg-[#2A9D8F] font-bold text-white">
              {counterInitials(customerLabel)}
            </span>
          }
        />
        <TopInfoCard
          label="Appareil"
          title={repairDeviceLabel(repair)}
          detail={repair.imei ? `IMEI ${repair.imei}` : repair.model || ""}
          icon={
            <RealDeviceVisual
              brand={repair.brandName}
              model={repairDeviceLabel(repair, repair.device)}
              type={repair.deviceType}
              className="size-12 rounded-[10px] border border-[#E8E8E5] p-1"
            />
          }
        />
        <TopInfoCard
          label="Réception"
          title={formatCounterDateTime(repair.droppedAt || repair.createdAt)}
          detail={repair.technician ? `Par ${repair.technician}` : ""}
          icon={<Calendar className="size-7 text-[#1E7A6E]" />}
        />
      </div>
      <CounterTimeline
        className="mt-5"
        activeIndex={counterTimelineIndex(repair.status)}
        labels={["Reçu", "Diagnostic", "Devis", "Réparation", "Prêt"]}
        details={[formatCounterDateTime(repair.droppedAt || repair.createdAt, ""), "", "", "", ""]}
      />
      {repair.status === "Reçu" && (
        <section className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#D7EFEA] bg-[#FFFFFF] p-5">
          <div>
            <p className="font-black text-[#1A1916]">Valider la prise en charge</p>
            <p className="text-[#6B6B6B] text-sm">
              {displayIntakeBonCode(repair, store.repairs)} ·{" "}
              {intakeDoc
                ? "Bon déjà généré — vous pouvez le régénérer si besoin."
                : "Génère le bon de prise en charge et l'ajoute aux Documents."}
            </p>
          </div>
          <button
            type="button"
            onClick={validatePriseEnCharge}
            className="inline-flex h-[52px] items-center gap-2 rounded-[14px] bg-[#2A9D8F] px-6 font-black text-white active:scale-[0.98]"
          >
            <FileSignature className="size-5" /> {intakeDoc ? "Régénérer le bon" : "Générer le bon de prise en charge"}
          </button>
        </section>
      )}
      <div className="mt-5 grid gap-4 lg:grid-cols-[310px_1fr_240px]">
        <section className="rounded-[18px] border border-[#E8E8E5] bg-white p-4">
          <h2 className="font-black">Photos</h2>
          {photos.length === 0 ? (
            <p className="mt-4 rounded-[12px] bg-[#FFFFFF] px-3 py-6 text-center text-[#6B6B6B] text-sm">
              Aucune photo ajoutée
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {photos.slice(0, 6).map((photo) => (
                <img
                  key={photo.id}
                  src={photo.dataUrl}
                  alt={photo.name}
                  className="aspect-square rounded-[12px] object-cover"
                />
              ))}
            </div>
          )}
        </section>
        <section className="rounded-[18px] border border-[#E8E8E5] bg-white p-5">
          <DetailBlock title="Problème signalé">{repair.issue || "Non renseigné"}</DetailBlock>
          <DetailBlock title="Intervention prévue">
            {prestations.length
              ? prestations.map((p) => (
                  <span key={p.label} className="block">
                    {p.label}
                  </span>
                ))
              : "Non renseigné"}
          </DetailBlock>
          <DetailBlock title="Messages client">
            {(repair.messages ?? []).filter((message) => message.visibility === "client").length
              ? (repair.messages ?? [])
                  .filter((message) => message.visibility === "client")
                  .slice(-3)
                  .map((message) => (
                    <span key={message.id} className="mb-2 block last:mb-0">
                      <b>{message.authorName}</b> · {message.body}
                    </span>
                  ))
              : "Aucun message client."}
          </DetailBlock>
          <DetailBlock title="Garantie">Selon conditions de l'atelier</DetailBlock>
        </section>
        <aside className="space-y-4">
          <section className="rounded-[18px] border border-[#E8E8E5] bg-white p-4">
            <p>Montant devis</p>
            <p className="font-black text-2xl">
              {formatEuro(amount)} <span className="text-[#6B6B6B] text-sm">TTC</span>
            </p>
            <div className="mt-4 border-[#E8E8E5] border-t pt-4">
              <p>Facture</p>
              <b className="text-[#1E7A6E]">{invoice ? "Finalisée" : "À finaliser"}</b>
              <p className="mt-3 text-[#6B6B6B] text-sm">
                Référence
                <br />
                <b className="text-[#1A1916]">{invoice ? `#${invoice.number}` : "Non renseigné"}</b>
              </p>
              <p className="mt-4 rounded-[12px] bg-[#FFFFFF] px-3 py-2.5 text-[#6B6B6B] text-xs leading-relaxed">
                Le règlement est géré hors Behar Tech Pro via votre TPE ou prestataire externe.
              </p>
            </div>
          </section>
          <section className="rounded-[18px] border border-[#E8E8E5] bg-white p-4 text-center">
            <h2 className="font-black text-left">QR Code dossier</h2>
            <div className="cursor-pointer" onClick={() => setSelectedQrRepairId(repair.id)}>
              <CounterRepairQr repair={repair} className="mx-auto mt-3 w-28" />
            </div>
            <p className="mt-2 text-[#6B6B6B] text-xs">Scannez pour suivre l'avancement</p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setSelectedQrRepairId(repair.id)}
                className="inline-flex h-[44px] w-full items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white font-bold text-[#1A1916] text-xs active:scale-[0.98]"
              >
                Afficher QR Code
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = getCustomerTrackingUrl(repair, store.workshopSettings ?? store.workshopInfo);
                  if (url) void shareCounterLink(url, "Lien de suivi copié pour le client.");
                }}
                className="inline-flex h-[44px] w-full items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white font-bold text-[#1A1916] text-xs active:scale-[0.98]"
              >
                Copier le lien client
              </button>
              <button
                type="button"
                onClick={openClientTracking}
                className="mt-3 inline-flex h-[44px] w-full items-center justify-center gap-2 rounded-[12px] border border-[#D7EFEA] bg-[#FFFFFF] font-bold text-[#1E7A6E] active:scale-[0.98]"
              >
                <Eye className="size-4" /> Ouvrir le suivi client
              </button>
            </div>
          </section>
          <section className="rounded-[18px] border border-[#E8E8E5] bg-white p-4 text-sm">
            <h2 className="font-black">Notes internes</h2>
            <p className="mt-2 whitespace-pre-line">{repair.notes || "Aucune note interne."}</p>
          </section>
        </aside>
      </div>
      {/* Actions principales — gros boutons tactiles (min 56px) */}
      {nextStep ? (
        <button
          type="button"
          onClick={advanceStatus}
          className="mt-5 flex h-[60px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#2A9D8F] font-black text-[17px] text-white shadow-sm active:scale-[0.99]"
        >
          {nextStep.label} <ChevronRight className="size-5" />
        </button>
      ) : null}
      <section className="mt-5 rounded-[18px] border border-[#E8E8E5] bg-white p-4">
        <h2 className="font-black">Ajouter une note interne</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_190px]">
          <CounterInput
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="Information utile pour l'équipe"
          />
          <button
            type="button"
            onClick={addInternalNote}
            disabled={!noteDraft.trim()}
            className="h-[52px] rounded-[14px] bg-[#1A1916] px-4 font-bold text-white disabled:cursor-not-allowed disabled:bg-[#FFFFFF]"
          >
            Ajouter la note
          </button>
        </div>
      </section>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => addPhoto(event.target.files?.[0])}
      />
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_64px]">
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          className="h-[60px] rounded-[16px] bg-[#2A9D8F] font-black text-white shadow-sm active:scale-[0.98]"
        >
          <Camera className="mr-2 inline size-5" /> Ajouter une photo
        </button>
        <button
          type="button"
          onClick={() => (onOpenDocuments ? onOpenDocuments() : print("intake", repair.id))}
          className="h-[60px] rounded-[16px] border border-[#E8E8E5] bg-white font-black active:scale-[0.98]"
        >
          <FolderOpen className="mr-2 inline size-5" /> Voir documents
        </button>
        <button
          type="button"
          onClick={() => setAppointmentModalOpen(true)}
          className="h-[60px] rounded-[16px] border border-[#E8E8E5] bg-white font-black active:scale-[0.98]"
        >
          <Calendar className="mr-2 inline size-5" /> Nouveau rendez-vous
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setActionsMenuOpen((open) => !open)}
            className="grid h-[60px] w-full place-items-center rounded-[16px] border border-[#E8E8E5] bg-white active:scale-[0.98]"
            aria-label="Actions secondaires"
          >
            <MoreHorizontal className="size-6" />
          </button>
          {actionsMenuOpen ? (
            <div className="absolute right-0 top-[68px] z-20 w-[260px] overflow-hidden rounded-[16px] border border-[#E8E8E5] bg-white p-2 text-left shadow-[0_18px_48px_rgba(26,25,22,0.16)]">
              <button
                type="button"
                onClick={() => {
                  setActionsMenuOpen(false);
                  print("intake", repair.id);
                }}
                className="flex h-12 w-full items-center gap-3 rounded-[12px] px-3 font-bold hover:bg-[#FFFFFF]"
              >
                <Printer className="size-4" /> Imprimer le bon
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionsMenuOpen(false);
                  openPaymentRequest();
                }}
                className="flex h-12 w-full items-center gap-3 rounded-[12px] px-3 font-bold hover:bg-[#FFFFFF]"
              >
                <Receipt className="size-4" /> Créer une demande de paiement
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionsMenuOpen(false);
                  setCloseConfirmOpen(true);
                }}
                disabled={isTerminalRepairStatus(repair.status)}
                className="flex h-12 w-full items-center gap-3 rounded-[12px] px-3 font-bold text-[#B42318] hover:bg-[#FFFFFF] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="size-4" /> Clôturer le dossier
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-center text-[#6B6B6B] text-xs">
        La clôture du dossier est indépendante du règlement, géré hors Behar Tech Pro.
      </p>
      {appointmentModalOpen && (
        <RepairAppointmentModal
          repair={repair}
          customerName={customerLabel}
          customerPhone={customerPhone}
          customerEmail={customer?.type === "counter" ? linkedAppointment?.clientEmail : customer?.email}
          onClose={() => setAppointmentModalOpen(false)}
          onCreated={() => setAppointmentModalOpen(false)}
        />
      )}
      {closeConfirmOpen && (
        <CloseDossierConfirmModal onCancel={() => setCloseConfirmOpen(false)} onConfirm={confirmCloseDossier} />
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

const REPAIR_APPOINTMENT_REASONS: Array<{ value: NonNullable<Appointment["appointmentReason"]>; label: string }> = [
  { value: "dropoff", label: "Dépôt" },
  { value: "diagnosis", label: "Diagnostic" },
  { value: "repair", label: "Intervention" },
  { value: "pickup", label: "Récupération" },
  { value: "customer_return", label: "Retour client" },
  { value: "other", label: "Autre" },
];

function RepairAppointmentModal({
  repair,
  customerName,
  customerPhone,
  customerEmail,
  onClose,
  onCreated,
}: Readonly<{
  repair: Repair;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  onClose: () => void;
  onCreated: () => void;
}>) {
  const store = useBeharStore();
  const [dateValue, setDateValue] = useState(localDateValue());
  const [time, setTime] = useState("");
  const [reason, setReason] = useState<NonNullable<Appointment["appointmentReason"]>>("pickup");
  const [notes, setNotes] = useState("");
  const slots = useMemo(() => buildCounterTimeSlots(dateValue), [dateValue]);
  const amount = repairAmount(repair);
  const reasonLabel = REPAIR_APPOINTMENT_REASONS.find((entry) => entry.value === reason)?.label ?? "Rendez-vous";

  const submit = () => {
    if (!dateValue) return toast.error("Choisissez une date.");
    if (!time) return toast.error("Choisissez une heure.");
    const existing = store.appointments.find(
      (appointment) =>
        appointment.repairId === repair.id &&
        appointmentDay(appointment) === dateValue &&
        (appointment.appointmentTime || appointment.time) === time &&
        appointment.appointmentReason === reason &&
        normalizeAppointmentStatus(appointment.status) !== "Annulé",
    );
    if (existing) {
      toast.info("Ce rendez-vous existe déjà pour ce dossier.");
      onCreated();
      return;
    }
    const id = store.addAppointment({
      customerId: repair.customerId,
      repairId: repair.id,
      repairNumber: repair.number,
      clientMode: "existing",
      clientName: customerName,
      clientPhone: customerPhone,
      clientEmail: customerEmail,
      device: repair.deviceModel || repair.device || "Appareil",
      deviceType: repair.deviceType,
      deviceBrand: repair.brandName,
      deviceModel: repair.deviceModel || repair.model,
      imei: repair.imei,
      issue: reasonLabel,
      issueDescription: repair.issue,
      interventionLabel: reasonLabel,
      customerPrice: amount > 0 ? amount : undefined,
      estimatedTotal: amount > 0 ? amount : undefined,
      priceStatus: amount > 0 ? "confirmed" : "to_confirm",
      priceSnapshot: repair.selectedPriceSnapshot,
      appointmentDate: dateValue,
      appointmentTime: time,
      appointmentReason: reason,
      date: dateValue,
      time,
      status: "Planifié",
      confirmed: false,
      source: "repair",
      channel: "Dossier atelier",
      notes: notes.trim(),
    });
    if (!id) return toast.error("Rendez-vous non créé.");
    toast.success("Rendez-vous lié à la prise en charge.");
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#1A1916]/30 p-5">
      <div className="flex max-h-[calc(100svh-2.5rem)] w-full max-w-[520px] flex-col rounded-[22px] border border-[#E8E8E5] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.035)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-black text-[22px] tracking-tight">Nouveau rendez-vous</h2>
            <p className="mt-1 text-[#6B6B6B] text-sm">
              {displayRepairCode(repair)} · {repairDeviceLabel(repair)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full bg-[#FFFFFF]"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <section>
            <p className="mb-2 font-bold text-sm">Date</p>
            <CounterWeekStrip
              selectedDay={dateValue}
              onSelect={(iso) => {
                setDateValue(iso);
                setTime("");
              }}
              appointments={store.appointments}
              allowPast={false}
            />
          </section>
          <section>
            <p className="mb-2 font-bold text-sm">Heure</p>
            <div className="grid max-h-[132px] grid-cols-4 gap-2 overflow-y-auto">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTime(slot)}
                  className={cn(
                    "h-11 rounded-[12px] border font-semibold tabular-nums active:scale-[0.98]",
                    time === slot ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#1E7A6E]" : "border-[#E8E8E5] bg-white",
                  )}
                >
                  {slot}
                </button>
              ))}
            </div>
          </section>
          <section>
            <p className="mb-2 font-bold text-sm">Motif</p>
            <div className="grid grid-cols-3 gap-2">
              {REPAIR_APPOINTMENT_REASONS.map((entry) => (
                <ChipButton key={entry.value} active={reason === entry.value} onClick={() => setReason(entry.value)}>
                  {entry.label}
                </ChipButton>
              ))}
            </div>
          </section>
          <section>
            <p className="mb-2 font-bold text-sm">Notes optionnelles</p>
            <CounterTextarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Pièce à commander, retour client, récupération…"
            />
          </section>
        </div>
        <div className="mt-5 grid shrink-0 grid-cols-[1fr_1.4fr] gap-3 border-[#E8E8E5] border-t pt-4">
          <button type="button" onClick={onClose} className="h-[52px] rounded-[14px] border border-[#E8E8E5] font-bold">
            Annuler
          </button>
          <button type="button" onClick={submit} className="h-[52px] rounded-[14px] bg-[#2A9D8F] font-black text-white">
            Créer rendez-vous
          </button>
        </div>
      </div>
    </div>
  );
}

function CloseDossierConfirmModal({ onCancel, onConfirm }: Readonly<{ onCancel: () => void; onConfirm: () => void }>) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#1A1916]/35 p-5">
      <section className="w-full max-w-[460px] rounded-[22px] border border-[#E8E8E5] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.035)]">
        <h2 className="font-black text-[#1D1D1F] text-[22px] tracking-tight">Marquer ce dossier comme rendu ?</h2>
        <p className="mt-3 text-[#6B6B6B] leading-relaxed">
          Cette action finalise le dossier. Vous pourrez toujours le consulter, mais il ne sera plus considéré comme
          actif.
        </p>
        <div className="mt-6 grid grid-cols-[1fr_1.4fr] gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-[52px] rounded-[14px] border border-[#E8E8E5] bg-white font-bold"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-[52px] rounded-[14px] bg-[#B42318] font-black text-white"
          >
            Clôturer le dossier
          </button>
        </div>
      </section>
    </div>
  );
}

function TopInfoCard({
  label,
  title,
  detail,
  icon,
}: Readonly<{ label: string; title: string; detail: string; icon: React.ReactNode }>) {
  const cleanTitle = String(title ?? "").trim();
  const cleanDetail = String(detail ?? "").trim();
  if (!cleanTitle && !cleanDetail) return null;
  return (
    <section className="grid min-h-[92px] grid-cols-[54px_1fr] items-center gap-4 rounded-[16px] border border-[#E8E8E5] bg-white p-4 shadow-sm">
      {icon}
      <div>
        <p className="text-[#6B6B6B] text-sm">{label}</p>
        <b>{cleanTitle || "Non renseigné"}</b>
        {cleanDetail ? <p className="text-[#6B6B6B] text-sm">{cleanDetail}</p> : null}
      </div>
    </section>
  );
}

function CounterTimeline({
  labels,
  details,
  activeIndex,
  className = "",
}: Readonly<{ labels: string[]; details: string[]; activeIndex: number; className?: string }>) {
  return (
    <section className={cn("rounded-[18px] border border-[#E8E8E5] bg-white p-5", className)}>
      <div className="grid grid-cols-5">
        {labels.map((label, index) => (
          <div key={label} className="relative text-center">
            <div
              className={cn(
                "absolute left-0 right-0 top-4 h-px",
                index === 0 ? "left-1/2" : "",
                index === labels.length - 1 ? "right-1/2" : "",
                index <= activeIndex ? "bg-[#2A9D8F]" : "bg-[#FFFFFF]",
              )}
            />
            <span
              className={cn(
                "relative z-10 mx-auto grid size-8 place-items-center rounded-full border bg-white",
                index < activeIndex
                  ? "border-[#2A9D8F] bg-[#2A9D8F] text-white"
                  : index === activeIndex
                    ? "border-[#2A9D8F] text-[#2A9D8F]"
                    : "border-[#C9C9C4] text-[#9A9AA0]",
              )}
            >
              {index < activeIndex ? <Check className="size-4" /> : ""}
            </span>
            <b className="mt-3 block">{label}</b>
            <span className="text-[#6B6B6B] text-xs">{details[index]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function DetailBlock({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div className="border-[#E8E8E5] border-b py-4 first:pt-0 last:border-0">
      <h3 className="font-bold text-[#6B6B6B] text-sm">{title}</h3>
      <p className="mt-2 leading-relaxed">{children}</p>
    </div>
  );
}

function counterStatusMessage(status: Repair["status"]) {
  switch (status) {
    case "Reçu":
      return "Votre appareil a bien été reçu. Le diagnostic va démarrer.";
    case "Diagnostic":
      return "Le diagnostic est en cours. Nous revenons vers vous avec le devis.";
    case "En réparation":
      return "Votre appareil est en réparation. Nous vous prévenons dès qu'il est prêt.";
    case "Test final":
      return "Réparation terminée, tests finaux en cours.";
    case "Prêt":
      return "Votre appareil est prêt. Vous pouvez passer à l'atelier.";
    case "Clôturé":
      return "Appareil restitué. Merci de votre confiance.";
    default:
      return "Dossier annulé.";
  }
}

function CounterTrackingScreen({
  initialRepairId,
  onClose,
  onOpenRepairDetail,
}: Readonly<{ initialRepairId?: string; onClose: () => void; onOpenRepairDetail: (repairId: string) => void }>) {
  const repairs = useBeharStore((s) => s.repairs);
  const customers = useBeharStore((s) => s.customers);
  const invoices = useBeharStore((s) => s.invoices);
  const payments = useBeharStore((s) => s.payments);
  const updateRepair = useBeharStore((s) => s.updateRepair);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initialRepairId || "");
  const [selectedQrRepairId, setSelectedQrRepairId] = useState<string | null>(null);
  const { download, print } = useDocument();
  const workshopSettings = useBeharStore((s) => s.workshopSettings);
  const [defaultActionFired, setDefaultActionFired] = useState(false);
  const customerOf = (id: string) => customers.find((c) => c.id === id);
  const recents = useMemo(
    () =>
      [...repairs].sort((a, b) => ((a.createdAt ?? a.droppedAt ?? "") > (b.createdAt ?? b.droppedAt ?? "") ? -1 : 1)),
    [repairs],
  );
  const filtered = useMemo(
    () =>
      recents.filter((r) => {
        const c = customers.find((entry) => entry.id === r.customerId);
        return compactText(
          `${r.number} ${r.device} ${r.deviceModel ?? ""} ${r.issue ?? ""} ${c?.name ?? ""} ${c?.phone ?? ""}`,
        ).includes(compactText(query));
      }),
    [recents, customers, query],
  );
  const selected = recents.find((r) => r.id === selectedId) ?? filtered[0] ?? recents[0];
  if (!selected)
    return <EmptyCounter title="Suivi du dossier" message="Aucun dossier à suivre pour le moment." onClose={onClose} />;
  const customer = customerOf(selected.customerId);
  const invoice = invoices.find((i) => i.repairId === selected.id);
  const workshop = useBeharStore((s) => s.workshopSettings ?? s.workshopInfo);
  const openClientTracking = () => {
    const url = getCustomerTrackingUrl(selected, workshop);
    if (!url) return toast.error("Lien de suivi indisponible.");
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const copyClientTracking = async () => {
    const url = getCustomerTrackingUrl(selected, workshop);
    if (!url) return toast.error("Lien de suivi indisponible.");
    await shareCounterLink(url, "Lien de suivi copié pour le client.");
  };

  useEffect(() => {
    if (initialRepairId === selected.id && !defaultActionFired) {
      setDefaultActionFired(true);
      const action = workshopSettings.counterDefaultAction || "none";
      if (action === "download") {
        download("intake", selected.id);
      } else if (action === "print_doc") {
        print("intake", selected.id);
      } else if (action === "print_qr") {
        if (!printRepairQr(selected.id, { format: workshopSettings.counterQrFormat })) {
          toast.error("Erreur d'impression du QR code.");
        }
      }
    }
  }, [initialRepairId, selected, defaultActionFired, workshopSettings, download, print]);

  return (
    <div className="mx-auto max-w-[1180px]">
      <CounterScreenTitle title="Suivi du dossier" subtitle="État d'avancement de la réparation." onClose={onClose} />
      <div className="grid gap-6 lg:grid-cols-[430px_1fr]">
        <aside className="space-y-4">
          <section className="rounded-[18px] border border-[#E8E8E5] bg-white p-5">
            <CounterInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par nom, téléphone, numéro de dossier ou appareil"
            />
            <p className="mt-3 text-[#6B6B6B] text-sm">La liste est filtrée automatiquement pendant la saisie.</p>
          </section>
          <section className="rounded-[18px] border border-[#E8E8E5] bg-white p-4">
            <h2 className="font-black">Dossiers récents</h2>
            {filtered.length === 0 ? (
              <p className="mt-3 rounded-[12px] bg-[#FFFFFF] px-3 py-6 text-center text-[#6B6B6B] text-sm">
                Aucun dossier trouvé.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {filtered.slice(0, 12).map((r) => {
                  const c = customers.find((entry) => entry.id === r.customerId);
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(r.id)}
                        className={cn(
                          "w-full rounded-[14px] border p-4 text-left",
                          selected.id === r.id ? "border-[#2A9D8F] bg-[#FFFFFF]" : "border-[#E8E8E5] bg-white",
                        )}
                      >
                        <div className="flex justify-between">
                          <b>#{displayRepairCode(r)}</b>
                          <CounterMockPill tone={counterDossierTone(r.status)}>{r.status}</CounterMockPill>
                        </div>
                        <p className="mt-1 font-bold">{c?.name ?? "Non renseigné"}</p>
                        <p className="text-[#6B6B6B] text-sm">
                          {repairDeviceLabel(r)} — {r.issue || "Non renseigné"}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
        <section className="rounded-[20px] border border-[#E8E8E5] bg-white p-6 shadow-[0_10px_30px_rgba(26,25,22,0.04)]">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-black text-2xl">Dossier #{selected.number}</h2>
              <CounterMockPill tone={counterDossierTone(selected.status)}>{selected.status}</CounterMockPill>
            </div>
            <button
              type="button"
              onClick={() => onOpenRepairDetail(selected.id)}
              className="h-[44px] rounded-[12px] border border-[#E8E8E5] px-4 font-bold"
            >
              Ouvrir dossier
            </button>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <DetailRowLite label="Client" value={customer?.name ?? "Non renseigné"} />
            <DetailRowLite label="Téléphone" value={customer?.phone || "Non renseigné"} />
            <DetailRowLite label="Appareil" value={repairDeviceLabel(selected)} />
            <DetailRowLite label="Facture" value={invoice ? invoice.number : "Non générée"} />
            <DetailRowLite label="Problème" value={selected.issue || "Non renseigné"} />
            <DetailRowLite label="Montant" value={`${formatEuro(repairAmount(selected))} TTC`} />
          </dl>
          <CounterTimeline
            className="mt-6"
            activeIndex={counterTimelineIndex(selected.status)}
            labels={["Reçu", "Diagnostic", "Devis accepté", "En réparation", "Prêt"]}
            details={["", "", "", "", ""]}
          />
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_250px]">
            <section className="rounded-[16px] border border-[#E8E8E5] bg-[#FFFFFF] p-5">
              <h3 className="font-black">Message client</h3>
              <p className="mt-2 text-[#6B6B6B]">{counterStatusMessage(selected.status)}</p>
            </section>
            <section className="rounded-[16px] border border-[#E8E8E5] bg-[#FFFFFF] p-5">
              <h3 className="font-black">Estimation</h3>
              <p className="mt-2 text-sm">
                Temps estimé : {formatCounterDateTime(selected.estimatedDoneAt)}
                <br />
                Technicien : {selected.technician || "Non renseigné"}
              </p>
            </section>
          </div>
          <section className="mt-5 grid grid-cols-[120px_1fr] gap-4 rounded-[16px] border border-[#E8E8E5] bg-[#FFFFFF] p-4">
            <div className="cursor-pointer shrink-0" onClick={() => setSelectedQrRepairId(selected.id)}>
              <CounterRepairQr repair={selected} className="size-[112px]" />
            </div>
            <div>
              <h3 className="font-black">Lien de suivi client</h3>
              <p className="mt-1 text-[#6B6B6B]">
                Le client peut suivre son dossier depuis son téléphone en scannant ce QR code.
              </p>
              {selected.publicAccess ? (
                <p className="mt-2 break-all text-[#1E7A6E] text-xs">{publicAbsoluteUrl(selected.publicAccess.url)}</p>
              ) : null}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedQrRepairId(selected.id)}
                  className="inline-flex h-[44px] items-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white px-4 font-bold text-[#1A1916] text-xs active:scale-[0.98]"
                >
                  Afficher QR Code
                </button>
                <button
                  type="button"
                  onClick={copyClientTracking}
                  className="inline-flex h-[44px] items-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white px-4 font-bold text-[#1A1916] text-xs active:scale-[0.98]"
                >
                  Copier le lien
                </button>
                <button
                  type="button"
                  onClick={openClientTracking}
                  className="inline-flex h-[44px] items-center gap-2 rounded-[12px] border border-[#D7EFEA] bg-white px-4 font-bold text-[#1E7A6E] active:scale-[0.98]"
                >
                  <Eye className="size-4" /> Ouvrir le suivi client
                </button>
              </div>
            </div>
          </section>
          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => download("intake", selected.id)}
              className="h-[52px] rounded-[14px] border border-[#E8E8E5] font-bold active:scale-[0.98]"
            >
              <Download className="mr-2 inline size-4" /> Télécharger le bon
            </button>
            <button
              type="button"
              onClick={() => print("intake", selected.id)}
              className="h-[52px] rounded-[14px] border border-[#E8E8E5] font-bold active:scale-[0.98]"
            >
              <Printer className="mr-2 inline size-4" /> Imprimer le bon
            </button>
            <button
              type="button"
              onClick={() => {
                toast.loading("Impression du QR...", { id: "print-qr" });
                if (printRepairQr(selected.id, { format: workshopSettings.counterQrFormat })) {
                  toast.success("Impression lancée.", { id: "print-qr" });
                } else {
                  toast.error("Erreur d'impression.", { id: "print-qr" });
                }
              }}
              className="h-[52px] rounded-[14px] bg-[#1A1916] font-bold text-white active:scale-[0.98]"
            >
              <QrCode className="mr-2 inline size-4" /> Imprimer QR Code
            </button>
            {workshopSettings.counterShowCopyLink !== false && (
              <button
                type="button"
                onClick={copyClientTracking}
                className="h-[52px] rounded-[14px] border border-[#E8E8E5] font-bold active:scale-[0.98]"
              >
                <Copy className="mr-2 inline size-4" /> Copier lien suivi
              </button>
            )}
          </div>
        </section>
      </div>
      {selectedQrRepairId && (
        <TrackingQrModal
          isOpen={Boolean(selectedQrRepairId)}
          onClose={() => setSelectedQrRepairId(null)}
          repairId={selectedQrRepairId}
        />
      )}
    </div>
  );
}

// Vraie caméra (getUserMedia) + lecture QR via BarcodeDetector quand disponible.
function CounterLiveScanner({ onDetected }: Readonly<{ onDetected: (value: string) => void }>) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState("Démarrage de la caméra…");
  const [error, setError] = useState("");
  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    const stop = () => {
      stopped = true;
      if (frame) cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("Caméra non disponible sur ce navigateur.");
        setError("Utilisez la saisie manuelle ou la liste des dossiers récents.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (!videoRef.current || stopped) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const BarcodeDetectorCtor = (window as typeof window & { BarcodeDetector?: any }).BarcodeDetector;
        if (!BarcodeDetectorCtor) {
          setStatus("Caméra active. Lecture QR en attente d'intégration sur ce navigateur.");
          return;
        }
        const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });
        setStatus("Caméra active. Présentez le QR du dossier.");
        const scan = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const detected = await detector.detect(videoRef.current);
            const raw = detected?.[0]?.rawValue;
            if (raw) {
              stop();
              onDetected(String(raw));
              return;
            }
          } catch {
            // on continue de scanner
          }
          frame = requestAnimationFrame(scan);
        };
        frame = requestAnimationFrame(scan);
      } catch {
        setStatus("Accès caméra refusé.");
        setError("Autorisez la caméra dans le navigateur, ou utilisez la saisie manuelle.");
      }
    };
    start();
    return stop;
  }, [onDetected]);
  return (
    <div className="relative grid min-h-[360px] place-items-center overflow-hidden rounded-[18px] bg-[#1A1916] text-white shadow-[0_18px_44px_rgba(26,25,22,0.18)]">
      <video ref={videoRef} className="absolute inset-0 size-full object-cover" muted playsInline />
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="size-40 rounded-[20px] border-2 border-white/80 shadow-[0_0_0_999px_rgba(15,23,42,0.32)]" />
      </div>
      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 rounded-[14px] bg-white px-3 py-2 text-[#1A1916] text-[12px]">
        <Camera className="size-4 shrink-0 text-[#2A9D8F]" />
        <div className="min-w-0">
          <p className="font-semibold">{status}</p>
          {error ? <p className="text-[#B42318]">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

function CounterScannerScreen({
  onClose,
  onCreateNew,
  onOpenTracking,
}: Readonly<{ onClose: () => void; onCreateNew: () => void; onOpenTracking: (repairId?: string) => void }>) {
  const repairs = useBeharStore((s) => s.repairs);
  const customers = useBeharStore((s) => s.customers);
  const [manualCode, setManualCode] = useState("");
  const recents = useMemo(
    () =>
      [...repairs]
        .sort((a, b) => ((a.createdAt ?? a.droppedAt ?? "") > (b.createdAt ?? b.droppedAt ?? "") ? -1 : 1))
        .slice(0, 5),
    [repairs],
  );
  // Traite un QR/numéro lu : ouvre le vrai dossier (REP, IMEI ou téléphone client).
  const handleQrResult = useCallback(
    (value: string) => {
      const q = value.trim().toLowerCase();
      if (!q) return;
      const digits = q.replace(/\D/g, "");
      const found = repairs.find((r) => {
        if (r.number.toLowerCase() === q || r.number.toLowerCase().includes(q)) return true;
        if ((r.imei || "").toLowerCase() === q) return true;
        if (digits.length >= 6) {
          const customer = customers.find((c) => c.id === r.customerId);
          if (customer?.phone && customer.phone.replace(/\D/g, "").includes(digits)) return true;
        }
        return false;
      });
      if (found) {
        toast.success(`Dossier reconnu : ${found.number}`);
        onOpenTracking(found.id);
        return;
      }
      toast.error(`Aucun dossier trouvé pour « ${value} ».`);
    },
    [repairs, customers, onOpenTracking],
  );
  return (
    <div className="mx-auto max-w-[1120px]">
      <CounterScreenTitle
        title="Scanner un dossier"
        subtitle="Scannez une étiquette dossier ou recherchez un numéro REP."
        onClose={onClose}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
        <section>
          <CounterLiveScanner onDetected={handleQrResult} />
          <section className="mt-5 rounded-[18px] border border-[#E8E8E5] bg-white p-5">
            <h2 className="font-black">Recherche manuelle</h2>
            <p className="mt-1 text-[#6B6B6B] text-sm">
              Saisissez un numéro de dossier, un IMEI ou un téléphone client si la caméra n'est pas disponible.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px]">
              <CounterInput
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
                placeholder="N° de dossier, IMEI ou téléphone"
              />
              <button
                type="button"
                onClick={() => handleQrResult(manualCode)}
                disabled={!manualCode.trim()}
                className="h-[52px] rounded-[14px] bg-[#2A9D8F] px-5 font-black text-white disabled:cursor-not-allowed disabled:bg-[#FFFFFF]"
              >
                Ouvrir le dossier
              </button>
            </div>
          </section>
        </section>
        <aside className="space-y-5">
          <button
            type="button"
            onClick={onCreateNew}
            className="flex min-h-[64px] w-full items-center gap-3 rounded-[18px] border border-[#2A9D8F]/30 bg-[#FFFFFF] px-5 text-left font-black text-[#1E7A6E] transition active:scale-[0.99]"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#2A9D8F] text-white">
              <Plus className="size-5" />
            </span>
            Créer un nouveau dossier
          </button>
          <section className="rounded-[18px] border border-[#E8E8E5] bg-white p-5">
            <div className="flex justify-between">
              <h2 className="font-black">Dossiers récents</h2>
              <button type="button" onClick={() => onOpenTracking()} className="font-bold text-[#1E7A6E] text-sm">
                Voir tout
              </button>
            </div>
            {recents.length === 0 ? (
              <p className="mt-3 rounded-[12px] bg-[#FFFFFF] px-3 py-6 text-center text-[#6B6B6B] text-sm">
                Aucun dossier.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-[#E8E8E5]">
                {recents.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => onOpenTracking(r.id)}
                      className="grid min-h-[72px] w-full grid-cols-[46px_1fr_auto] items-center gap-2 text-left"
                    >
                      <RealDeviceVisual
                        brand={r.brandName}
                        model={r.deviceModel || r.device}
                        type={r.deviceType}
                        className="size-11 rounded-[9px] border border-[#E8E8E5] p-1"
                      />
                      <span>
                        <b>#{r.number}</b>
                        <span className="block text-[#6B6B6B] text-sm">{r.deviceModel || r.device}</span>
                      </span>
                      <CounterMockPill tone={counterDossierTone(r.status)}>{r.status}</CounterMockPill>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function CounterCheckoutScreen({
  initialRepairId,
  onClose,
}: Readonly<{ initialRepairId: string; onClose: () => void }>) {
  const store = useBeharStore();
  const eligible = store.repairs.filter((repair) => {
    if (repair.status === "Annulé" || repair.status === "Irréparable") return false;
    const invoice = store.invoices.find((entry) => entry.repairId === repair.id);
    return Boolean(
      invoice && invoice.status !== "Brouillon" && invoice.status !== "Annulée" && getInvoiceTotal(invoice) > 0,
    );
  });
  const [selectedId, setSelectedId] = useState(initialRepairId || eligible[0]?.id || "");
  const settlement = useSettlementModal();
  const repair = store.repairs.find((entry) => entry.id === selectedId) ?? eligible[0];

  useEffect(() => {
    if (initialRepairId) setSelectedId(initialRepairId);
  }, [initialRepairId]);

  if (!repair) {
    return (
      <EmptyCounter
        message="Aucune facture finalisée n’est disponible."
        onClose={onClose}
        title="Demander le paiement"
      />
    );
  }

  const customer = store.customers.find((entry) => entry.id === repair.customerId);
  const invoice = store.invoices.find((entry) => entry.repairId === repair.id);
  if (!invoice) return null;
  const total = getInvoiceTotal(invoice);
  const vat = getVatSummary(invoice.lines, store.workshopInfo);

  const printInvoice = () => {
    const document = store.documents.find((entry) => entry.type === "invoice" && entry.invoiceId === invoice.id) ?? {
      id: `doc_${invoice.id}`,
      type: "invoice" as const,
    };
    if (!printDocument(document)) toast.error("Facture introuvable.");
  };

  const closeRepair = () => {
    store.changeRepairStatus(repair.id, "Clôturé");
    toast.success("Dossier clôturé. Le règlement reste géré par le prestataire externe.");
  };

  return (
    <div className="mx-auto max-w-[1180px]">
      <button
        className="mb-4 inline-flex h-[52px] items-center gap-2 rounded-full bg-white px-4 shadow-sm"
        onClick={onClose}
        type="button"
      >
        <ArrowLeft className="size-5" /> Retour
      </button>
      <h1 className="mb-5 text-center font-black text-[32px]">Demander le paiement</h1>
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="rounded-[20px] border border-[#E8E8E5] bg-white p-4">
          <h2 className="mb-4 font-bold">
            Factures finalisées{" "}
            <span className="rounded-[7px] border border-[#E8E8E5] bg-[#FAFAF8] px-2">{eligible.length}</span>
          </h2>
          <ul className="space-y-3">
            {eligible.map((entry) => {
              const linkedCustomer = store.customers.find((candidate) => candidate.id === entry.customerId);
              const linkedInvoice = store.invoices.find((candidate) => candidate.repairId === entry.id);
              if (!linkedInvoice) return null;
              return (
                <li key={entry.id}>
                  <button
                    className={cn(
                      "w-full rounded-[14px] border p-4 text-left",
                      entry.id === repair.id ? "border-[#2A9D8F] bg-[#F4FBF9]" : "border-[#E8E8E5] bg-white",
                    )}
                    onClick={() => setSelectedId(entry.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <b>{linkedCustomer?.name ?? "Client comptoir"}</b>
                      <span className="rounded-full bg-[#F1FAF8] px-2 py-1 text-[#167B70] text-[10px] font-bold uppercase">
                        Finalisée
                      </span>
                    </div>
                    <b className="mt-2 block text-[#167B70]">
                      {formatCurrency(getInvoiceTotal(linkedInvoice), linkedInvoice.currency)}
                    </b>
                    <p className="mt-1 text-[#6B6B6B] text-sm">{repairDeviceLabel(entry)}</p>
                    <p className="text-[#6B6B6B] text-xs">Facture {linkedInvoice.number}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="space-y-5">
          <div className="rounded-[20px] border border-[#E8E8E5] bg-white p-5">
            <div className="grid gap-5 lg:grid-cols-[1fr_350px]">
              <div>
                <h2 className="font-black text-[20px]">{customer?.name ?? "Client comptoir"}</h2>
                <p className="text-[#6E6E73]">
                  {customer?.phone}
                  <br />
                  {customer?.email}
                </p>
                <dl className="mt-8 grid grid-cols-[120px_1fr] gap-y-5">
                  <dt>Facture</dt>
                  <dd>
                    <b>{invoice.number}</b>
                  </dd>
                  <dt>Dossier</dt>
                  <dd>
                    <b>#{displayRepairCode(repair)}</b>
                  </dd>
                  <dt>Appareil</dt>
                  <dd>
                    <b>{repairDeviceLabel(repair)}</b>
                  </dd>
                  <dt>Boutique</dt>
                  <dd>
                    <b>{repair.shopId || invoice.shopId || "Boutique active"}</b>
                  </dd>
                </dl>
              </div>
              <div>
                <p className="text-[#6B6B6B] text-sm">Total TTC de la facture</p>
                <p className="font-black text-[#1E7A6E] text-[42px] tabular-nums">
                  {formatCurrency(total, invoice.currency)}
                </p>
                <MiniInvoice lines={invoice.lines} repair={repair} vat={vat} />
              </div>
            </div>
          </div>

          <div className="rounded-[16px] border border-[#D7EFEA] bg-[#F1FAF8] p-4 text-[#47706B] text-sm">
            Le règlement est géré en dehors de Behar Tech Pro par le prestataire sélectionné.
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <button
              className="h-[56px] rounded-[14px] bg-[#2A9D8F] font-bold text-white"
              onClick={() => settlement.open(repair.id)}
              type="button"
            >
              Demander le paiement
            </button>
            <button
              className="h-[56px] rounded-[14px] border border-[#E8E8E5] bg-white font-bold"
              onClick={printInvoice}
              type="button"
            >
              <Receipt className="mr-2 inline size-4" /> Imprimer la facture
            </button>
            <button
              className="h-[56px] rounded-[14px] border border-[#E8E8E5] bg-white font-bold"
              onClick={closeRepair}
              type="button"
            >
              Clôturer le dossier
            </button>
          </div>

          <SettlementModal
            draft={settlement.draft}
            invoice={settlement.invoice}
            isOpen={settlement.isOpen}
            onClose={settlement.close}
            onDraftChange={settlement.setDraft}
            onSubmit={settlement.submit}
            total={settlement.total}
          />
        </section>
      </div>
    </div>
  );
}
function MiniInvoice({
  repair,
  lines,
  vat,
}: Readonly<{ repair: Repair; lines: QuoteLine[]; vat: ReturnType<typeof getVatSummary> }>) {
  const ws = useBeharStore((s) => s.workshopInfo);
  return (
    <div className="mt-5 rounded-[14px] border border-[#E8E8E5] bg-white p-4 text-[12px]">
      <div className="flex justify-between">
        <b>{ws.commercialName || ws.name}</b>
        <span>
          Dossier #{displayRepairCode(repair)}
          <br />
          {new Date().toLocaleDateString("fr-FR")}
        </span>
      </div>
      <p className="mt-1 text-[#6E6E73]">
        {ws.address}
        <br />
        {ws.phone}
      </p>
      <div className="my-3 border-t border-[#E8E8E5]" />
      {lines.map((line) => (
        <div key={line.id} className="flex justify-between py-1">
          <span>{line.description}</span>
          <span>{formatEuro(line.total)}</span>
        </div>
      ))}
      <div className="mt-2 border-t border-[#E8E8E5] pt-2">
        {ws.vatApplicable ? (
          <>
            <div className="flex justify-between">
              <span>Sous-total HT</span>
              <span>{formatEuro(vat.ht)}</span>
            </div>
            <div className="flex justify-between">
              <span>TVA ({Math.round(vat.rate * 1000) / 10}%)</span>
              <span>{formatEuro(vat.tva)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total TTC</span>
              <span className="text-[#1E7A6E]">{formatEuro(vat.ttc)}</span>
            </div>
          </>
        ) : (
          <>
            <p className="text-[#6E6E73]">{ws.tvaMention || "TVA non applicable, art. 293 B du CGI"}</p>
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-[#1E7A6E]">{formatEuro(vat.ttc)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function quoteNumberCounter(quote: Quote) {
  return quote.number.replace(/^DEV-/, "DV-");
}

function quoteStatusLabelCounter(status: string) {
  if (status === "Accepté") return "Accepté";
  if (status === "Refusé") return "Refusé";
  return "En attente";
}

function quoteRelativeDateCounter(value?: string) {
  const ts = new Date(value || Date.now()).getTime();
  if (!Number.isFinite(ts)) return "aujourd'hui";
  const diff = Math.max(0, Date.now() - ts);
  const hours = Math.floor(diff / 36e5);
  if (hours < 1) return "à l'instant";
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} jour${days > 1 ? "s" : ""}`;
  return `il y a ${Math.floor(days / 7)} semaine${days >= 14 ? "s" : ""}`;
}

function quoteDeviceSummaryCounter(quote: Quote) {
  const devices = getQuoteDevices(quote);
  const first = devices[0];
  if (!first) return quote.deviceModel || quote.device || "Appareil";
  return `${first.model || first.brand || "Appareil"}${devices.length > 1 ? ` +${devices.length - 1}` : ""}`;
}

function quoteClientNameCounter(quote: Quote, customers: ReturnType<typeof useBeharStore.getState>["customers"]) {
  const customer = customers.find((entry) => entry.id === quote.customerId);
  return quote.clientSnapshot?.name || customer?.name || "Client comptoir";
}

function quoteClientPhoneCounter(quote: Quote, customers: ReturnType<typeof useBeharStore.getState>["customers"]) {
  const customer = customers.find((entry) => entry.id === quote.customerId);
  return quote.clientSnapshot?.phone || customer?.phone || "";
}

function CounterQuotesScreen({
  onClose,
  onCreate,
  onTransform,
}: Readonly<{ onClose: () => void; onCreate: () => void; onTransform: (prefill: Partial<Repair>) => void }>) {
  const store = useBeharStore();
  const { download } = useDocument();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "En attente" | "Accepté" | "Refusé">("all");
  const [confirmingRefusal, setConfirmingRefusal] = useState(false);
  const quotes = useMemo(() => {
    const q = compactText(search);
    return [...store.quotes]
      .filter((quote) => {
        if (statusFilter !== "all" && quoteStatusLabelCounter(quote.status) !== statusFilter) return false;
        if (!q) return true;
        const needle = compactText(
          `${quote.number} ${quoteClientNameCounter(quote, store.customers)} ${quoteClientPhoneCounter(quote, store.customers)} ${quoteDeviceSummaryCounter(quote)}`,
        );
        return needle.includes(q);
      })
      .sort(
        (a, b) => new Date(b.date || b.createdAt || "").getTime() - new Date(a.date || a.createdAt || "").getTime(),
      );
  }, [search, statusFilter, store.customers, store.quotes]);
  const selected = store.quotes.find((quote) => quote.id === selectedId);

  const transformQuote = (quote: Quote) => {
    const devices = getQuoteDevices(quote);
    if (!devices.length) return toast.error("Ce devis n'a aucun appareil à transformer.");
    const device = devices[0];
    const serviceLabels = device.services.map((service) => service.label);
    const accessoryLabels = device.accessories.map((accessory) => accessory.label);
    onTransform({
      customerId: quote.customerId,
      quoteId: quote.id,
      deviceType: device.type,
      brandName: device.brand,
      deviceModel: device.model,
      device: [device.brand, device.model].filter(Boolean).join(" ") || "Appareil",
      issue: serviceLabels.join(", "),
      amount: device.subtotalTtc,
      total: device.subtotalTtc,
      notes: [
        `Depuis le devis ${quoteNumberCounter(quote)}.`,
        devices.length > 1
          ? `Le devis contient ${devices.length} appareils. Appareil pré-rempli : ${device.model || device.brand || "Appareil 1"}.`
          : "",
        accessoryLabels.length ? `Accessoires devis : ${accessoryLabels.join(", ")}.` : "",
      ]
        .filter(Boolean)
        .join(" "),
      counterPrestations: [
        ...device.services.map((service) => ({
          label: service.label,
          prixClient: service.priceTtc * service.quantity,
        })),
        ...device.accessories.map((accessory) => ({
          label: accessory.label,
          prixClient: accessory.included ? 0 : (accessory.priceTtc ?? 0),
        })),
      ],
    });
    toast.success("Devis repris dans la prise en charge.");
  };

  if (selected) {
    const devices = getQuoteDevices(selected);
    const vat = getVatSummary(selected.lines, store.workshopInfo);
    const statusLabel = quoteStatusLabelCounter(selected.status);
    return (
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-6 flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setSelectedId("");
              setConfirmingRefusal(false);
            }}
            className="grid size-[52px] place-items-center rounded-full bg-white shadow-sm active:scale-[0.97]"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="font-black text-[30px] tracking-tight">Devis {quoteNumberCounter(selected)}</h1>
          <StatusPillCounter tone={statusLabel === "Accepté" ? "green" : "orange"}>{statusLabel}</StatusPillCounter>
        </div>
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-[20px] border border-[#E8E8E5] bg-white p-6">
            <div className="mb-5 flex min-h-[52px] items-center gap-3 text-[17px]">
              <User className="size-6" />
              <b>{quoteClientNameCounter(selected, store.customers)}</b>
              {quoteClientPhoneCounter(selected, store.customers) && (
                <span className="text-[#6E6E73]">· {quoteClientPhoneCounter(selected, store.customers)}</span>
              )}
            </div>
            <div className="space-y-3">
              {devices.map((device, index) => (
                <article key={device.id} className="rounded-[16px] border border-[#E8E8E5] bg-white p-4">
                  <div className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-4">
                    <RealDeviceVisual
                      brand={device.brand}
                      model={device.model}
                      type={device.type}
                      className="size-[76px] rounded-[12px] border border-[#E8E8E5] p-1"
                    />
                    <div>
                      <p className="text-[#6E6E73] text-sm">Appareil {index + 1}</p>
                      <h2 className="mt-1 font-black text-[18px]">
                        {formatBrandModel(device.brand, device.model, `Appareil ${index + 1}`)}
                      </h2>
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-[14px]">
                        {device.services.map((service) => (
                          <li key={service.id}>{service.label}</li>
                        ))}
                        {device.accessories.map((accessory) => (
                          <li key={accessory.id}>{accessory.label}</li>
                        ))}
                      </ul>
                    </div>
                    <b className="font-black text-[20px] tabular-nums">{formatEuro(device.subtotalTtc)}</b>
                  </div>
                </article>
              ))}
            </div>
            <section className="mt-5 rounded-[16px] border border-[#E8E8E5] bg-white p-4">
              <h2 className="font-bold">Récapitulatif du devis</h2>
              <div className="mt-4 space-y-3">
                {store.workshopInfo.vatApplicable && (
                  <>
                    <DetailRowLite label="Total HT" value={formatEuro(vat.ht)} />
                    <DetailRowLite label={`TVA (${Math.round(vat.rate * 1000) / 10}%)`} value={formatEuro(vat.tva)} />
                  </>
                )}
                <DetailRowLite label="Total TTC" value={formatEuro(getQuoteTotal(selected))} green />
              </div>
            </section>
          </section>
          <aside className="space-y-5">
            <section className="rounded-[20px] border border-[#E8E8E5] bg-white p-6">
              <h2 className="font-bold text-[18px]">Actions</h2>
              <button
                type="button"
                onClick={() => transformQuote(selected)}
                className="mt-5 h-[62px] w-full rounded-[14px] bg-[#2A9D8F] font-bold text-white shadow-[0_14px_30px_rgba(42,157,143,0.18)] active:scale-[0.98]"
              >
                <Wrench className="mr-2 inline size-5" /> Transformer en prise en charge
              </button>
              <button
                type="button"
                onClick={() => {
                  const doc = store.documents.find((d) => d.quoteId === selected.id && d.type === "quote");
                  if (!printDocument(doc ?? { id: `doc_${selected.id}`, type: "quote" })) {
                    toast.error("Devis introuvable.");
                  }
                }}
                className="mt-3 h-[56px] w-full rounded-[14px] border border-[#E8E8E5] bg-white font-bold active:scale-[0.98]"
              >
                <Printer className="mr-2 inline size-5" /> Imprimer
              </button>
              {store.hasPermission("canDownloadDocuments") && (
                <button
                  type="button"
                  onClick={() => download("quote", selected.id)}
                  className="mt-3 h-[56px] w-full rounded-[14px] border border-[#E8E8E5] bg-white font-bold active:scale-[0.98]"
                >
                  <Download className="mr-2 inline size-5" /> Télécharger PDF
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  const doc = store.documents.find((d) => d.quoteId === selected.id && d.type === "quote");
                  const url = getShareableDocumentUrl(doc ?? { id: `doc_${selected.id}`, type: "quote" });
                  await shareCounterLink(url, "Lien du devis copié pour le client.");
                }}
                className="mt-3 h-[56px] w-full rounded-[14px] border border-[#E8E8E5] bg-white font-bold active:scale-[0.98]"
              >
                <Send className="mr-2 inline size-5" /> Partager le lien client
              </button>
              <button
                type="button"
                disabled={statusLabel === "Refusé"}
                onClick={() => {
                  if (!confirmingRefusal) {
                    setConfirmingRefusal(true);
                    return;
                  }
                  store.updateQuote(selected.id, { status: "Refusé" });
                  setConfirmingRefusal(false);
                  toast.success("Devis marqué comme refusé.");
                }}
                className={cn(
                  "mt-3 h-[56px] w-full rounded-[14px] border font-bold active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
                  confirmingRefusal
                    ? "border-[#B42318] bg-[#B42318] text-white"
                    : "border-[#F2C8C3] bg-white text-[#C7493B]",
                )}
              >
                <X className="mr-2 inline size-5" />{" "}
                {statusLabel === "Refusé"
                  ? "Devis refusé"
                  : confirmingRefusal
                    ? "Confirmer le refus"
                    : "Marquer refusé"}
              </button>
            </section>
            <section className="rounded-[20px] border border-[#E8E8E5] bg-white p-5 text-[#6E6E73]">
              Devis valable 30 jours · émis le{" "}
              {new Date(selected.date || selected.createdAt || Date.now()).toLocaleDateString("fr-FR")}
            </section>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="grid size-[52px] place-items-center rounded-full bg-white shadow-sm active:scale-[0.97]"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="font-black text-[32px] tracking-tight">Devis</h1>
            <p className="text-[#6E6E73]">Retrouvez et gérez vos devis</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="h-[56px] rounded-[14px] bg-[#2A9D8F] px-6 font-bold text-white shadow-[0_12px_26px_rgba(42,157,143,0.18)] active:scale-[0.98]"
        >
          <Plus className="mr-2 inline size-5" /> Nouveau devis
        </button>
      </div>
      <div className="mb-4">
        <CounterInput
          placeholder="Rechercher un devis (n°, client, téléphone…)"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {(["all", "En attente", "Accepté", "Refusé"] as const).map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => setStatusFilter(entry)}
            className={cn(
              "h-[40px] rounded-full border px-4 font-semibold text-sm",
              statusFilter === entry
                ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#1E7A6E]"
                : "border-[#E8E8E5] bg-white text-[#6B6B6B]",
            )}
          >
            {entry === "all" ? "Tous" : entry}
          </button>
        ))}
      </div>
      <section className="space-y-3">
        {quotes.length === 0 ? (
          <div className="rounded-[20px] border border-[#E8E8E5] bg-white p-8 text-center text-[#6E6E73]">
            Aucun devis pour le moment.
          </div>
        ) : (
          quotes.map((quote) => {
            const status = quoteStatusLabelCounter(quote.status);
            return (
              <button
                key={quote.id}
                type="button"
                onClick={() => {
                  setSelectedId(quote.id);
                  setConfirmingRefusal(false);
                }}
                className="grid min-h-[92px] w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 rounded-[18px] border border-[#E8E8E5] bg-white px-5 py-4 text-left shadow-[0_8px_26px_rgba(29,29,31,0.035)] transition active:scale-[0.99] xl:grid-cols-[140px_minmax(0,1fr)_180px_110px_130px_160px] xl:px-6 xl:py-0"
              >
                <b className="order-1 font-black text-[#1E7A6E] text-[20px] xl:order-none">
                  {quoteNumberCounter(quote)}
                </b>
                <span className="order-3 col-span-2 min-w-0 xl:order-none xl:col-span-1">
                  <b className="block">{quoteClientNameCounter(quote, store.customers)}</b>
                  <span className="text-[#6E6E73] text-sm">{quoteClientPhoneCounter(quote, store.customers)}</span>
                </span>
                <span className="order-4 col-span-2 flex min-w-0 items-center gap-3 xl:order-none xl:col-span-1">
                  <RealDeviceVisual
                    brand={getQuoteDevices(quote)[0]?.brand}
                    model={getQuoteDevices(quote)[0]?.model}
                    type={getQuoteDevices(quote)[0]?.type}
                    className="size-12 rounded-[9px] border border-[#E8E8E5] p-1"
                  />
                  <span className="min-w-0">
                    <b className="block truncate">{quoteDeviceSummaryCounter(quote)}</b>
                    <span className="text-[#6E6E73] text-sm">
                      {getQuoteDevices(quote).length} appareil{getQuoteDevices(quote).length > 1 ? "s" : ""}
                    </span>
                  </span>
                </span>
                <span className="order-5 text-[#6E6E73] xl:order-none">
                  {quoteRelativeDateCounter(quote.date || quote.createdAt)}
                </span>
                <b className="order-2 text-right text-[#1E7A6E] text-[20px] tabular-nums xl:order-none xl:text-left">
                  {formatEuro(getQuoteTotal(quote))}
                </b>
                <span className="order-6 flex items-center justify-end gap-4 xl:order-none xl:justify-start">
                  <StatusPillCounter tone={status === "Accepté" ? "green" : "orange"}>{status}</StatusPillCounter>
                  <ChevronRight className="size-5" />
                </span>
              </button>
            );
          })
        )}
      </section>
    </div>
  );
}

type CounterQuoteExtraLine = {
  id: string;
  kind: "libre" | "accessoire";
  description: string;
  prixClient: number;
};

type CounterQuoteAccessoryLine = {
  id: string;
  sourceLabel: string;
  label: string;
  price: string;
};

type CounterQuoteDevicePage = {
  id: string;
  label: string;
  deviceType: DeviceType;
  brand: string;
  model: string;
  imei: string;
  prestations: string[];
  accessories: CounterQuoteAccessoryLine[];
  customProblemLabel: string;
  customProblemPrice: string;
  price: string;
};

const makeCounterQuoteDevicePage = (index: number): CounterQuoteDevicePage => ({
  id: `quote_device_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
  label: `Appareil ${index}`,
  deviceType: "Smartphone",
  brand: "",
  model: "",
  imei: "",
  prestations: [],
  accessories: [],
  customProblemLabel: "",
  customProblemPrice: "",
  price: "",
});

function quoteAccessoryLabelForDevice(label: string, model: string) {
  const cleanLabel = label.trim();
  const cleanModel = model.trim();
  if (!cleanModel) return cleanLabel;
  if (compactText(cleanLabel).includes(compactText(cleanModel))) return cleanLabel;
  const baseLabel = cleanLabel
    .replace(/\s+iPhone$/i, "")
    .replace(/\s+Samsung$/i, "")
    .trim();
  return `${baseLabel} ${cleanModel}`;
}

function CounterQuoteScreen({
  onClose,
  onTransform,
}: Readonly<{ onClose: () => void; onTransform: (prefill: Partial<Repair>) => void }>) {
  const store = useBeharStore();
  const [clientMode, setClientMode] = useState<CounterClientMode>("counter");
  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [devicePages, setDevicePages] = useState<CounterQuoteDevicePage[]>(() => [makeCounterQuoteDevicePage(1)]);
  const [activeDeviceId, setActiveDeviceId] = useState("");
  const [createdId, setCreatedId] = useState("");
  const [extraLines, setExtraLines] = useState<CounterQuoteExtraLine[]>([]);
  const [addLineMode, setAddLineMode] = useState<null | "libre" | "accessoire" | "telephone">(null);
  const [freeLineLabel, setFreeLineLabel] = useState("");
  const [freeLinePrice, setFreeLinePrice] = useState("");
  const [sendOpen, setSendOpen] = useState(false);
  const [sendChannel, setSendChannel] = useState<"Email" | "SMS">("Email");
  const [sendTarget, setSendTarget] = useState("");
  const counterCustomer = store.customers.find(
    (entry) => entry.type === "counter" || entry.name.startsWith("Client comptoir"),
  );
  const customer = clientMode === "existing" ? store.customers.find((entry) => entry.id === customerId) : undefined;
  const quoteCustomerLabel =
    clientMode === "counter" ? "Client comptoir" : clientMode === "existing" ? (customer?.name ?? "") : name.trim();
  const activeDevice = devicePages.find((page) => page.id === activeDeviceId) ?? devicePages[0];
  const deviceType = activeDevice.deviceType;
  const brand = activeDevice.brand;
  const model = activeDevice.model;
  const prestations = activeDevice.prestations;
  const selectedAccessories = activeDevice.accessories.map((entry) => entry.id);
  const price = activeDevice.price;
  const updateActiveDevice = (patch: Partial<CounterQuoteDevicePage>) => {
    setDevicePages((prev) => prev.map((page) => (page.id === activeDevice.id ? { ...page, ...patch } : page)));
  };
  const updateQuoteDevicePage = (id: string, patch: Partial<CounterQuoteDevicePage>) => {
    setDevicePages((prev) => prev.map((page) => (page.id === id ? { ...page, ...patch } : page)));
  };
  const pageTotal = (page: CounterQuoteDevicePage) =>
    toMoney(page.price) +
    page.accessories.reduce((sum, accessory) => sum + toMoney(accessory.price), 0) +
    (page.prestations.includes("Autre") ? toMoney(page.customProblemPrice) : 0);
  const devicesTotal = devicePages.reduce((sum, page) => sum + pageTotal(page), 0);
  const extraTotal = extraLines.reduce((sum, line) => sum + line.prixClient, 0);
  const amount = devicesTotal + extraTotal;
  const quoteCataloguePrestations = useMemo(
    () => cataloguePrestationsForModel(store.priceBookItems, brand, model),
    [store.priceBookItems, brand, model],
  );
  // Motifs proposés : interventions consoles dédiées pour les consoles, liste
  // générique sinon. « Autre » reste toujours présent pour la saisie libre.
  const quoteProblemList = useMemo(
    () => (deviceType === "Console" ? consolePrestationLabels(model) : quoteProblems),
    [deviceType, model],
  );
  const quoteAccessoryOptions = useMemo(() => {
    const stockAccessories = store.stockItems
      .filter((item) => (item.stock ?? item.quantity ?? 0) > 0)
      .filter((item) => isSaleOnlyAccessoryLabel(`${item.name} ${item.part} ${item.categoryName} ${item.category}`))
      .map((item) => ({
        id: `stock_${item.id}`,
        label: item.part || item.name,
        prixClient: item.salePrice ?? 0,
        reason: `Stock · ${item.stock ?? item.quantity ?? 0}`,
      }));
    const presets = counterAccessoryProducts.map((item) => ({
      id: item.id,
      label: item.name,
      prixClient: item.price,
      reason: "Accessoire comptoir",
    }));
    const byLabel = new Map<string, { id: string; label: string; prixClient: number; reason: string }>();
    for (const option of [...addonSuggestionsFor(prestations, model), ...stockAccessories, ...presets]) {
      const key = compactText(option.label);
      if (!byLabel.has(key)) byLabel.set(key, option);
    }
    return Array.from(byLabel.values());
  }, [model, prestations, store.stockItems]);
  const devicesForQuote = devicePages.map((page) => ({
    id: page.id,
    type: page.deviceType,
    brand: page.brand,
    model: page.model,
    services: [
      ...page.prestations
        .filter((label) => label !== "Autre")
        .map((label, index, normalPrestations) => ({
          id: `${page.id}_service_${index}`,
          label,
          priceTtc: normalPrestations.length ? toMoney(page.price) / normalPrestations.length : toMoney(page.price),
          quantity: 1,
        })),
      ...(page.prestations.includes("Autre")
        ? [
            {
              id: `${page.id}_service_custom`,
              label: page.customProblemLabel.trim() || "Autre panne",
              priceTtc: toMoney(page.customProblemPrice),
              quantity: 1,
            },
          ]
        : []),
    ],
    accessories: page.accessories.map((accessory, index) => ({
      id: `${page.id}_accessory_${accessory.id || index}`,
      label: accessory.label,
      included: false,
      priceTtc: toMoney(accessory.price),
    })),
    subtotalTtc: pageTotal(page),
  }));
  const lines: QuoteLine[] = [
    ...devicesForQuote.flatMap((device, deviceIndex) => [
      ...device.services.map((service) => ({
        id: service.id,
        description: `${device.model || `Appareil ${deviceIndex + 1}`} · ${service.label}`,
        quantity: service.quantity,
        unitPrice: service.priceTtc,
        total: service.priceTtc * service.quantity,
      })),
      ...device.accessories.map((accessory) => ({
        id: accessory.id,
        description: `${device.model || `Appareil ${deviceIndex + 1}`} · ${accessory.label}`,
        quantity: 1,
        unitPrice: accessory.priceTtc,
        total: accessory.priceTtc,
      })),
    ]),
    ...extraLines.map((line) => ({
      id: line.id,
      description: line.description,
      quantity: 1,
      unitPrice: line.prixClient,
      total: line.prixClient,
    })),
  ];
  const vat = getVatSummary(lines, store.workshopInfo);
  useEffect(() => {
    if (!model.trim() || prestations.length === 0) return;
    const foundPrice = prestations.reduce(
      (sum, entry) => sum + findCataloguePrice(store.priceBookItems, brand, model, entry),
      0,
    );
    if (foundPrice > 0 && String(foundPrice) !== price) updateActiveDevice({ price: String(foundPrice) });
  }, [activeDevice.id, brand, model, prestations, price, store.priceBookItems]);
  const selectQuoteCataloguePrestation = (entry: { label: string; prixClient: number }) => {
    updateActiveDevice({ prestations: [entry.label], price: entry.prixClient > 0 ? String(entry.prixClient) : price });
  };
  const setActivePrestations = (updater: (prev: string[]) => string[]) => {
    updateActiveDevice({ prestations: updater(prestations) });
  };
  const togglePageAccessory = (
    page: CounterQuoteDevicePage,
    option: { id: string; label: string; prixClient: number },
  ) => {
    const existing = page.accessories.find((entry) => entry.id === option.id);
    updateQuoteDevicePage(page.id, {
      accessories: existing
        ? page.accessories.filter((entry) => entry.id !== option.id)
        : [
            ...page.accessories,
            {
              id: option.id,
              sourceLabel: option.label,
              label: quoteAccessoryLabelForDevice(option.label, page.model),
              price: option.prixClient > 0 ? String(option.prixClient) : "",
            },
          ],
    });
  };
  const addQuoteDevicePage = () => {
    const next = makeCounterQuoteDevicePage(devicePages.length + 1);
    setDevicePages((prev) => [...prev, next]);
    setActiveDeviceId(next.id);
    setAddLineMode(null);
    toast.success("Nouvel appareil ajouté au devis.");
  };
  const removeQuoteDevicePage = (id: string) => {
    if (devicePages.length === 1) return;
    const nextPages = devicePages.filter((page) => page.id !== id);
    setDevicePages(nextPages);
    if (activeDevice.id === id) setActiveDeviceId(nextPages[0]?.id ?? "");
  };
  const addExtraLine = (kind: CounterQuoteExtraLine["kind"], description: string, prixClient: number) => {
    const cleanDescription = description.trim();
    if (!cleanDescription) return toast.error("Indiquez un libellé.");
    if (prixClient <= 0) return toast.error("Indiquez un prix.");
    setExtraLines((prev) => [
      ...prev,
      {
        id: `quote_extra_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
        kind,
        description: cleanDescription,
        prixClient,
      },
    ]);
    setFreeLineLabel("");
    setFreeLinePrice("");
    setAddLineMode(null);
  };
  const toggleQuoteAccessory = (optionId: string) => {
    const option = quoteAccessoryOptions.find((entry) => entry.id === optionId);
    if (!option) return;
    togglePageAccessory(activeDevice, option);
  };
  const resolveQuoteCustomerId = () => {
    if (clientMode === "counter") {
      return counterCustomer?.id ?? store.addCustomer({ name: "Client comptoir", type: "counter" });
    }
    if (clientMode === "existing") {
      if (!customerId) {
        toast.error("Sélectionnez un client.");
        return "";
      }
      return customerId;
    }
    if (!name.trim()) {
      toast.error("Indiquez le nom du client.");
      return "";
    }
    return store.addCustomer({ name: name.trim(), phone: phone.trim() });
  };
  const resolveTransformCustomerId = () => {
    if (created?.customerId) return created.customerId;
    if (clientMode === "counter")
      return counterCustomer?.id ?? store.addCustomer({ name: "Client comptoir", type: "counter" });
    if (clientMode === "existing") return customerId || undefined;
    return undefined;
  };
  const generate = () => {
    const cid = resolveQuoteCustomerId();
    if (!cid) return;
    if (!devicesForQuote.some((device) => device.model.trim() && device.services.length && device.subtotalTtc > 0)) {
      return toast.error("Sélectionnez au moins un modèle, une prestation et un prix.");
    }
    const firstDevice = devicePages[0];
    const id = store.addQuote({
      customerId: cid,
      status: "Brouillon",
      deviceType: firstDevice.deviceType,
      brandName: firstDevice.brand,
      deviceModel: firstDevice.model,
      device: [firstDevice.brand, firstDevice.model].filter(Boolean).join(" "),
      imei: firstDevice.imei.trim(),
      issue: lines.map((line) => line.description).join(", "),
      devices: devicesForQuote,
      lines,
    });
    if (!id) return toast.error("Impossible de créer le devis.");
    setCreatedId(id);
    toast.success("Devis généré.");
  };
  const created = store.quotes.find((quote) => quote.id === createdId);
  const resolvedCustomerId =
    created?.customerId ??
    (clientMode === "existing" ? customerId : clientMode === "counter" ? (counterCustomer?.id ?? "") : "");
  const resolvedCustomer = resolvedCustomerId
    ? store.customers.find((entry) => entry.id === resolvedCustomerId)
    : undefined;
  const handlePrintQuote = () => {
    if (!created) return toast.info("Générez d'abord le devis avant de l'imprimer.");
    const document = store.documents.find((entry) => entry.type === "quote" && entry.quoteId === created.id);
    if (!printDocument(document ?? { id: `doc_${created.id}`, type: "quote" })) toast.error("Devis introuvable.");
  };
  const handleSendQuote = () => {
    const quote = created ?? store.quotes.find((entry) => entry.id === createdId);
    const cid = quote?.customerId || resolvedCustomerId;
    if (!cid) return toast.error("Générez le devis avec un client avant l'envoi.");
    const target =
      sendTarget.trim() || (sendChannel === "Email" ? resolvedCustomer?.email : resolvedCustomer?.phone) || "";
    if (!target) return toast.error(`Renseignez ${sendChannel === "Email" ? "un email" : "un numéro SMS"}.`);
    store.sendMessage({
      customerId: cid,
      channel: sendChannel,
      subject: `Devis ${quote?.number ?? "comptoir"}`,
      body: `Bonjour, voici votre devis ${quote?.number ?? ""} d'un montant de ${formatEuro(amount)}.`,
    });
    if (quote) store.updateQuote(quote.id, { status: "Envoyé" });
    toast.success(`Envoi par ${sendChannel} enregistré pour ${target}.`);
    setSendOpen(false);
  };
  return (
    <div className="mx-auto max-w-[1180px]">
      <h1 className="font-black text-[32px] tracking-tight">Nouveau devis</h1>
      <p className="text-[#6E6E73]">Créer un devis rapidement</p>
      <CounterStepper steps={["Client & appareil", "Prestations", "Aperçu"]} current={created ? 2 : 0} />
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4 rounded-[20px] border border-[#E8E8E5] bg-white p-5">
          <h2 className="font-bold">1. Client</h2>
          <div className="grid grid-cols-3 gap-3">
            <SelectTile active={clientMode === "counter"} onClick={() => setClientMode("counter")}>
              <User className="size-5" />
              Client comptoir
            </SelectTile>
            <SelectTile active={clientMode === "new"} onClick={() => setClientMode("new")}>
              <User className="size-5" />
              Nouveau client
            </SelectTile>
            <SelectTile active={clientMode === "existing"} onClick={() => setClientMode("existing")}>
              <Users className="size-5" />
              Client existant
            </SelectTile>
          </div>
          {clientMode === "counter" && (
            <div className="rounded-[14px] border border-[#DDEFEA] bg-[#FFFFFF] px-4 py-3 text-sm font-semibold text-[#1E7A6E]">
              Client comptoir sélectionné pour un devis rapide.
            </div>
          )}
          {clientMode === "new" && (
            <div className="grid grid-cols-2 gap-3">
              <CounterInput placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} />
              <CounterInput placeholder="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          )}
          {clientMode === "existing" && <ExistingCustomerSearch value={customerId} onChange={setCustomerId} />}
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">2. Appareil</h2>
            <button
              type="button"
              onClick={addQuoteDevicePage}
              className="h-11 rounded-[12px] border border-[#2A9D8F] px-4 font-bold text-[#1E7A6E] active:scale-[0.97]"
            >
              <Plus className="mr-2 inline size-4" /> Ajouter un appareil
            </button>
          </div>
          {devicePages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {devicePages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setActiveDeviceId(page.id)}
                  className={cn(
                    "min-h-[52px] shrink-0 rounded-[14px] border px-4 text-left transition active:scale-[0.97]",
                    page.id === activeDevice.id
                      ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#1E7A6E]"
                      : "border-[#E8E8E5] bg-white",
                  )}
                >
                  <b>{page.label}</b>
                  <span className="ml-2 text-[#6E6E73] text-[12px]">{page.model || "À choisir"}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => removeQuoteDevicePage(activeDevice.id)}
                className="min-h-[52px] shrink-0 rounded-[14px] border border-[#F2C8C3] px-4 font-bold text-[#C7493B]"
              >
                Supprimer
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {counterTypes.map((entry) => (
              <SelectTile
                key={entry}
                active={deviceType === entry}
                onClick={() =>
                  updateActiveDevice({ deviceType: entry, model: "", prestations: [], accessories: [], price: "" })
                }
              >
                {entry}
              </SelectTile>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
            {counterBrands.map((entry) => (
              <SelectTile
                key={entry}
                active={brand === entry}
                onClick={() =>
                  updateActiveDevice({ brand: entry, model: "", prestations: [], accessories: [], price: "" })
                }
              >
                {entry}
              </SelectTile>
            ))}
          </div>
          <ModelTouchSelector
            brand={brand}
            deviceType={deviceType}
            value={model}
            onChange={(nextModel) =>
              updateActiveDevice({
                model: nextModel,
                accessories: activeDevice.accessories.map((entry) => ({
                  ...entry,
                  label: quoteAccessoryLabelForDevice(entry.sourceLabel || entry.label, nextModel),
                })),
              })
            }
          />
          <CounterInput
            placeholder="IMEI / numéro de série (optionnel)"
            inputMode="numeric"
            value={activeDevice.imei}
            onChange={(event) => updateActiveDevice({ imei: event.target.value })}
          />
          <h2 className="font-bold">3. Problème / Prestation</h2>
          {quoteCataloguePrestations.length > 0 && (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {quoteCataloguePrestations.map((entry) => (
                <button
                  key={entry.label}
                  type="button"
                  onClick={() => selectQuoteCataloguePrestation(entry)}
                  className={cn(
                    "min-h-[62px] rounded-[14px] border px-3 text-left transition active:scale-[0.97]",
                    prestations.includes(entry.label)
                      ? "border-[#2A9D8F] bg-[#FFFFFF]"
                      : "border-[#DDEFEA] bg-[#FFFFFF]",
                  )}
                >
                  <span className="block font-bold text-[13px]">{entry.label}</span>
                  <span className="block text-[#1E7A6E] text-[12px] font-black">
                    {entry.prixClient > 0 ? formatEuro(entry.prixClient) : "Prix à saisir"}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {quoteProblemList.map((entry) => {
              const cataloguePrice = findCataloguePrice(store.priceBookItems, brand, model, entry);
              return (
                <SelectTile
                  key={entry}
                  active={prestations.includes(entry)}
                  onClick={() => {
                    const nextPrestations = prestations.includes(entry)
                      ? prestations.filter((item) => item !== entry)
                      : [...prestations, entry];
                    const nextPrice = nextPrestations
                      .filter((item) => item !== "Autre")
                      .reduce((sum, item) => sum + findCataloguePrice(store.priceBookItems, brand, model, item), 0);
                    updateActiveDevice({
                      prestations: nextPrestations,
                      price: nextPrice > 0 ? String(nextPrice) : price,
                    });
                  }}
                >
                  <span>
                    {entry}
                    {cataloguePrice > 0 && (
                      <span className="mt-1 block text-[#1E7A6E] text-[12px] tabular-nums">
                        {formatEuro(cataloguePrice)}
                      </span>
                    )}
                  </span>
                </SelectTile>
              );
            })}
          </div>
          {prestations.includes("Autre") && (
            <div className="grid gap-3 md:grid-cols-[1fr_180px]">
              <CounterInput
                placeholder="Décrire la panne"
                value={activeDevice.customProblemLabel}
                onChange={(event) => updateActiveDevice({ customProblemLabel: event.target.value })}
              />
              <CounterInput
                inputMode="decimal"
                placeholder="Prix"
                value={activeDevice.customProblemPrice}
                onChange={(event) => updateActiveDevice({ customProblemPrice: event.target.value })}
              />
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <CounterInput
              placeholder="Prix client"
              value={price}
              onChange={(event) => updateActiveDevice({ price: event.target.value })}
            />
            <div className="flex min-h-[52px] items-center justify-end rounded-[14px] bg-[#FFFFFF] px-4 font-black text-[#1E7A6E] tabular-nums">
              {formatEuro(pageTotal(activeDevice))}
            </div>
          </div>
          <section className="rounded-[16px] border border-[#DDEFEA] bg-[#FFFFFF] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold">Vente additionnelle</h3>
                <p className="text-[#6E6E73] text-sm">Coque, chargeur, câble, verre trempé adaptés au modèle.</p>
              </div>
              <button
                type="button"
                onClick={() => setAddLineMode("accessoire")}
                className="grid size-[52px] place-items-center rounded-[14px] border border-[#2A9D8F] bg-white text-[#1E7A6E] active:scale-[0.96]"
              >
                <ShoppingBag className="size-6" />
              </button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {quoteAccessoryOptions.slice(0, 8).map((option) => {
                const selected = activeDevice.accessories.some((entry) => entry.id === option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => togglePageAccessory(activeDevice, option)}
                    className={cn(
                      "min-h-[52px] shrink-0 rounded-[14px] border px-4 font-semibold transition active:scale-[0.97]",
                      selected
                        ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#1E7A6E]"
                        : "border-[#E8E8E5] bg-white text-[#1D1D1F]",
                    )}
                  >
                    {selected && <Check className="mr-2 inline size-4" />}
                    {quoteAccessoryLabelForDevice(option.label, model)}
                  </button>
                );
              })}
            </div>
            {activeDevice.accessories.length > 0 && (
              <div className="mt-3 space-y-2">
                {activeDevice.accessories.map((accessory) => (
                  <div
                    key={accessory.id}
                    className="grid grid-cols-[1fr_130px_42px] items-center gap-2 rounded-[14px] border border-[#E8E8E5] bg-white p-2"
                  >
                    <span className="truncate pl-2 font-semibold text-[13px]">{accessory.label}</span>
                    <CounterInput
                      className="h-10 rounded-[12px] px-3 text-right text-[13px]"
                      inputMode="decimal"
                      placeholder="Prix"
                      value={accessory.price}
                      onChange={(event) =>
                        updateActiveDevice({
                          accessories: activeDevice.accessories.map((entry) =>
                            entry.id === accessory.id ? { ...entry, price: event.target.value } : entry,
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveDevice({
                          accessories: activeDevice.accessories.filter((entry) => entry.id !== accessory.id),
                        })
                      }
                      className="grid size-10 place-items-center rounded-full text-[#C7493B] active:scale-[0.96]"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="rounded-[16px] border border-[#E8E8E5] bg-[#FFFFFF] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold">Ajouter une ligne</h3>
                <p className="text-[#6E6E73] text-sm">Champ libre, accessoire ou autre téléphone.</p>
              </div>
              <button
                type="button"
                onClick={() => setAddLineMode(addLineMode ? null : "libre")}
                className="grid size-[52px] place-items-center rounded-[14px] bg-[#2A9D8F] text-white active:scale-[0.96]"
              >
                <Plus className="size-6" />
              </button>
            </div>
            {addLineMode && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <ChipButton active={addLineMode === "libre"} onClick={() => setAddLineMode("libre")}>
                    Champ libre
                  </ChipButton>
                  <ChipButton active={addLineMode === "accessoire"} onClick={() => setAddLineMode("accessoire")}>
                    Accessoire
                  </ChipButton>
                  <ChipButton active={addLineMode === "telephone"} onClick={addQuoteDevicePage}>
                    Autre téléphone
                  </ChipButton>
                </div>
                {addLineMode === "accessoire" ? (
                  <AccessoryDrawer
                    options={quoteAccessoryOptions.map((option) => ({
                      ...option,
                      label: quoteAccessoryLabelForDevice(option.label, activeDevice.model),
                    }))}
                    selected={selectedAccessories}
                    onToggle={toggleQuoteAccessory}
                    onClose={() => setAddLineMode(null)}
                  />
                ) : addLineMode === "libre" ? (
                  <div className="grid grid-cols-[1fr_140px_130px] gap-2">
                    <CounterInput
                      placeholder="Libellé libre"
                      value={freeLineLabel}
                      onChange={(e) => setFreeLineLabel(e.target.value)}
                    />
                    <CounterInput
                      placeholder="Prix"
                      inputMode="decimal"
                      value={freeLinePrice}
                      onChange={(e) => setFreeLinePrice(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => addExtraLine("libre", freeLineLabel, toMoney(freeLinePrice))}
                      className="rounded-[14px] bg-[#1D1D1F] font-bold text-white"
                    >
                      Ajouter
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={addQuoteDevicePage}
                    className="h-[52px] w-full rounded-[14px] border border-[#2A9D8F] bg-white font-bold text-[#1E7A6E]"
                  >
                    Créer la page du 2e appareil
                  </button>
                )}
              </div>
            )}
            {extraLines.length > 0 && (
              <ul className="mt-4 space-y-2">
                {extraLines.map((line) => (
                  <li
                    key={line.id}
                    className="flex min-h-[52px] items-center justify-between gap-3 rounded-[14px] border border-[#E8E8E5] bg-white px-4"
                  >
                    <span>
                      <b>{line.description}</b>
                      <span className="ml-2 text-[#6E6E73] text-[12px]">{line.kind}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <b>{formatEuro(line.prixClient)}</b>
                      <button
                        type="button"
                        onClick={() => setExtraLines((prev) => prev.filter((entry) => entry.id !== line.id))}
                        className="grid size-9 place-items-center rounded-full text-[#C7493B]"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </section>
        <aside className="space-y-4">
          <MoneySummary
            amount={amount}
            lines={[
              { label: "Client", value: quoteCustomerLabel || "À renseigner" },
              { label: "Appareils", value: devicePages.map((page) => page.model || page.label).join(", ") },
              { label: "Page active", value: [brand, model].filter(Boolean).join(" ") },
              { label: "Prestation", value: prestations.join(", ") },
              { label: "Accessoires", value: activeDevice.accessories.map((entry) => entry.label).join(", ") },
              { label: "Total", value: `${formatEuro(amount)} ${store.workshopInfo.vatApplicable ? "TTC" : ""}` },
            ]}
          />
          <section className="rounded-[20px] border border-[#E8E8E5] bg-white p-5">
            <h2 className="font-bold">Aperçu du devis</h2>
            <p className="mt-3 font-bold">{created?.number.replace(/^DEV-/, "DV-") ?? "DV-AAAA-XXXX"}</p>
            <p className="text-[#6E6E73] text-sm">{new Date().toLocaleDateString("fr-FR")}</p>
            <div className="mt-3 max-h-[190px] space-y-3 overflow-y-auto border-y border-[#E8E8E5] py-3 text-sm">
              {devicePages.map((page, index) => (
                <div key={page.id}>
                  <div className="flex justify-between gap-3 font-bold">
                    <span>
                      Appareil {index + 1} : {page.model || "À choisir"}
                    </span>
                    <span>{formatEuro(pageTotal(page))}</span>
                  </div>
                  <ul className="mt-1 list-disc pl-4 text-[#6E6E73]">
                    {page.prestations
                      .filter((item) => item !== "Autre")
                      .map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    {page.prestations.includes("Autre") && <li>{page.customProblemLabel || "Autre panne"}</li>}
                    {page.accessories.map((item) => (
                      <li key={item.id}>
                        {item.label} · {formatEuro(toMoney(item.price))}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {extraLines.map((line) => (
                <div key={line.id} className="flex justify-between gap-3">
                  <span>{line.description}</span>
                  <b>{formatEuro(line.prixClient)}</b>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {store.workshopInfo.vatApplicable ? (
                <>
                  <DetailRowLite label="Sous-total HT" value={formatEuro(vat.ht)} />
                  <DetailRowLite label={`TVA (${Math.round(vat.rate * 1000) / 10}%)`} value={formatEuro(vat.tva)} />
                  <DetailRowLite label="Total TTC" value={formatEuro(vat.ttc)} green />
                </>
              ) : (
                <>
                  <p className="text-[#6E6E73]">
                    {store.workshopInfo.tvaMention || "TVA non applicable, art. 293 B du CGI"}
                  </p>
                  <DetailRowLite label="Total" value={formatEuro(amount)} green />
                </>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={handlePrintQuote}
                className="h-11 rounded-[12px] border border-[#E8E8E5] font-semibold"
                type="button"
              >
                <Printer className="mr-2 inline size-4" />
                Imprimer
              </button>
              <button
                onClick={() => setSendOpen(true)}
                className="h-11 rounded-[12px] border border-[#E8E8E5] font-semibold"
                type="button"
              >
                <Send className="mr-2 inline size-4" />
                Envoyer
              </button>
            </div>
            <button
              type="button"
              onClick={() =>
                onTransform({
                  customerId: resolveTransformCustomerId(),
                  deviceType: devicePages[0].deviceType,
                  brandName: devicePages[0].brand,
                  deviceModel: devicePages[0].model,
                  device: [devicePages[0].brand, devicePages[0].model].filter(Boolean).join(" "),
                  imei: devicePages[0].imei.trim(),
                  issue: lines.map((line) => line.description).join(", "),
                  amount,
                })
              }
              className="mt-3 h-11 w-full rounded-[12px] border border-[#2A9D8F] font-bold text-[#1E7A6E]"
            >
              Transformer en prise en charge
            </button>
            <div className="mt-3 rounded-[12px] bg-[#FFFFFF] py-3 text-center font-bold text-[#6B6B6B]">En attente</div>
          </section>
        </aside>
        <div className="lg:col-span-2 grid grid-cols-[180px_1fr] gap-4">
          <button
            type="button"
            onClick={onClose}
            className="h-[52px] rounded-[14px] border border-[#E8E8E5] bg-white font-semibold"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={generate}
            className="h-[52px] rounded-[14px] bg-[#2A9D8F] font-bold text-white"
          >
            Générer le devis
          </button>
        </div>
      </div>
      {sendOpen && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/35 p-4">
          <section className="w-full max-w-[520px] rounded-[20px] border border-[#E8E8E5] bg-white p-5 shadow-[0_24px_70px_rgba(29,29,31,0.22)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-black text-[20px]">Enregistrer l'envoi du devis</h2>
                <p className="text-[#6E6E73] text-sm">Conserve le canal et le destinataire dans l'historique client.</p>
              </div>
              <button
                type="button"
                onClick={() => setSendOpen(false)}
                className="grid size-11 place-items-center rounded-[12px] border border-[#E8E8E5]"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <SelectTile active={sendChannel === "Email"} onClick={() => setSendChannel("Email")}>
                Email
              </SelectTile>
              <SelectTile active={sendChannel === "SMS"} onClick={() => setSendChannel("SMS")}>
                SMS
              </SelectTile>
            </div>
            <div className="mt-4">
              <CounterInput
                placeholder={sendChannel === "Email" ? "Adresse email" : "Numéro de téléphone"}
                value={sendTarget}
                onChange={(event) => setSendTarget(event.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={handleSendQuote}
              className="mt-5 h-[52px] w-full rounded-[14px] bg-[#2A9D8F] font-bold text-white"
            >
              Enregistrer l'envoi par {sendChannel}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

// ─── Factures (comptoir) ─────────────────────────────────────────────────────
// Liste des factures imprimables directement au comptoir. Un seul geste pour
// donner la facture au client (impression du vrai document, via la même route
// /print/document/[id] que le dashboard).
function counterInvoiceTotal(invoice: Invoice) {
  return (invoice.lines ?? []).reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
}

function CounterInvoicesScreen({ onClose }: Readonly<{ onClose: () => void }>) {
  const store = useBeharStore();
  const [search, setSearch] = useState("");
  const invoices = useMemo(() => {
    const q = compactText(search);
    return [...store.invoices]
      .filter((invoice) => {
        if (!q) return true;
        const customer = store.customers.find((entry) => entry.id === invoice.customerId);
        const repair = invoice.repairId ? store.repairs.find((entry) => entry.id === invoice.repairId) : undefined;
        const needle = compactText(
          `${invoice.number} ${customer?.name ?? ""} ${customer?.phone ?? ""} ${repair?.deviceModel ?? repair?.device ?? ""}`,
        );
        return needle.includes(q);
      })
      .sort((a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime());
  }, [search, store.invoices, store.customers, store.repairs]);

  const invoiceDoc = (invoice: Invoice) =>
    store.documents.find((doc) => doc.type === "invoice" && doc.invoiceId === invoice.id) ?? {
      id: `doc_${invoice.id}`,
      type: "invoice" as const,
    };
  const printInvoice = (invoice: Invoice) => {
    if (!printDocument(invoiceDoc(invoice))) toast.error("Facture introuvable.");
  };
  const openInvoice = (invoice: Invoice) => {
    if (!openDocument(invoiceDoc(invoice))) toast.error("Facture introuvable.");
  };

  return (
    <div className="mx-auto max-w-[1180px]">
      <CounterScreenTitle title="Factures" subtitle="Éditer, imprimer et remettre au client." onClose={onClose} />
      <div className="mb-5">
        <CounterInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une facture (n°, client, téléphone, appareil…)"
        />
      </div>
      {invoices.length === 0 ? (
        <p className="rounded-[16px] border border-dashed border-[#D9D6CF] bg-white px-4 py-12 text-center text-[#6B6B6B]">
          Aucune facture pour le moment.
        </p>
      ) : (
        <ul className="space-y-3">
          {invoices.map((invoice) => {
            const customer = store.customers.find((entry) => entry.id === invoice.customerId);
            const repair = invoice.repairId ? store.repairs.find((entry) => entry.id === invoice.repairId) : undefined;
            return (
              <li
                key={invoice.id}
                className="grid grid-cols-1 gap-3 rounded-[16px] border border-[#E8E8E5] bg-white p-4 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <b className="text-[16px]">{invoice.number}</b>
                    <StatusPillCounter tone="green">Finalisée</StatusPillCounter>
                  </div>
                  <p className="mt-1 truncate text-[#6B6B6B] text-sm">
                    {customer?.name ?? "Client"} · {repair?.deviceModel || repair?.device || "—"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <b className="mr-1 text-[18px] tabular-nums text-[#1E7A6E]">
                    {formatEuro(counterInvoiceTotal(invoice))}
                  </b>
                  <button
                    type="button"
                    onClick={() => openInvoice(invoice)}
                    className="h-[48px] rounded-[12px] border border-[#E8E8E5] bg-white px-4 font-bold"
                  >
                    <FileText className="mr-2 inline size-4" /> Ouvrir
                  </button>
                  <button
                    type="button"
                    onClick={() => printInvoice(invoice)}
                    className="h-[48px] rounded-[12px] bg-[#2A9D8F] px-5 font-bold text-white"
                  >
                    <Printer className="mr-2 inline size-4" /> Imprimer la facture
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Documents (comptoir) ────────────────────────────────────────────────────
const COUNTER_DOC_LABEL: Record<string, string> = {
  intake: "Bon de prise en charge",
  quote: "Devis",
  invoice: "Facture",
  internal: "Fiche interne",
  summary: "Résumé dossier",
};
const COUNTER_DOC_FILTERS: Array<{ key: string; label: string }> = [
  { key: "all", label: "Tous" },
  { key: "intake", label: "Bons" },
  { key: "quote", label: "Devis" },
  { key: "invoice", label: "Factures" },
  { key: "diagnostic_report", label: "Diagnostics" },
  { key: "summary", label: "Rapports finaux" },
];
function CounterDocumentsScreen({ onClose, repairId }: Readonly<{ onClose: () => void; repairId?: string }>) {
  const store = useBeharStore();
  const { download, preview } = useDocument();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const scopedRepair = repairId ? store.repairs.find((r) => r.id === repairId) : undefined;
  const docNumberLabel = (doc: BeharDocument) => {
    const invoice = doc.invoiceId ? store.invoices.find((entry) => entry.id === doc.invoiceId) : undefined;
    const quote = doc.quoteId ? store.quotes.find((entry) => entry.id === doc.quoteId) : undefined;
    const repair = doc.repairId ? store.repairs.find((entry) => entry.id === doc.repairId) : undefined;
    if (doc.type === "intake" && repair) return displayIntakeBonCode(repair, store.repairs);
    return invoice?.number ?? quote?.number ?? repair?.number ?? doc.id.slice(-6).toUpperCase();
  };
  const repairIdForDocument = (doc: BeharDocument) => {
    if (doc.repairId) return doc.repairId;
    const quote = doc.quoteId ? store.quotes.find((entry) => entry.id === doc.quoteId) : undefined;
    const invoice = doc.invoiceId ? store.invoices.find((entry) => entry.id === doc.invoiceId) : undefined;
    return quote?.repairId ?? invoice?.repairId ?? "";
  };
  const documents = useMemo(() => {
    const q = compactText(search);
    return store.documents.filter((doc) => {
      if (["payment", "sale-receipt", "sale-invoice"].includes(doc.type)) return false;
      if (repairId && repairIdForDocument(doc) !== repairId) return false;
      if (filter !== "all" && doc.type !== filter) return false;
      if (!q) return true;
      const customer = store.customers.find((entry) => entry.id === doc.customerId);
      const needle = compactText(
        `${COUNTER_DOC_LABEL[doc.type] ?? ""} ${docNumberLabel(doc)} ${customer?.name ?? ""} ${doc.title}`,
      );
      return needle.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filter, repairId, store.documents, store.customers, store.invoices, store.quotes, store.repairs]);

  return (
    <div className="mx-auto max-w-[1180px]">
      <CounterScreenTitle
        title="Documents"
        subtitle={
          scopedRepair
            ? `Documents du dossier ${scopedRepair.number}.`
            : "Tous les fichiers : bons, devis, factures et rapports."
        }
        onClose={onClose}
      />
      <div className="mb-4">
        <CounterInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un document (type, n°, client…)"
        />
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {COUNTER_DOC_FILTERS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setFilter(entry.key)}
            className={cn(
              "h-[40px] rounded-full border px-4 font-semibold text-sm",
              filter === entry.key
                ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#1E7A6E]"
                : "border-[#E8E8E5] bg-white text-[#6B6B6B]",
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>
      {documents.length === 0 ? (
        <p className="rounded-[16px] border border-dashed border-[#D9D6CF] bg-white px-4 py-12 text-center text-[#6B6B6B]">
          Aucun document à afficher.
        </p>
      ) : (
        <ul className="space-y-3">
          {documents.map((doc) => {
            const customer = store.customers.find((entry) => entry.id === doc.customerId);
            const target = getPrintableTarget(doc);
            const linkedRepairId = repairIdForDocument(doc);
            const documentUnavailable = !target;
            return (
              <li
                key={doc.id}
                className="grid grid-cols-1 gap-3 rounded-[16px] border border-[#E8E8E5] bg-white p-4 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="rounded-[7px] border border-[#E8E8E5] bg-[#FFFFFF] px-2.5 py-0.5 text-[#6B6B6B] text-[11px] font-semibold uppercase tracking-wide">
                      {COUNTER_DOC_LABEL[doc.type] ?? "Document"}
                    </span>
                    <b className="font-mono text-[13px]">{docNumberLabel(doc)}</b>
                  </div>
                  <p className="mt-1 truncate text-[#6B6B6B] text-sm">
                    {customer?.name ?? "Client"} · {formatCounterDateTime(doc.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {documentUnavailable ? (
                    <span className="inline-flex h-[44px] items-center rounded-[12px] border border-[#E8E8E5] bg-[#FFFFFF] px-4 font-bold text-[#8A8A8A] text-sm">
                      Document non disponible
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => preview(target.type, target.id)}
                        className="inline-flex h-[44px] items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white px-4 font-bold text-[#1A1916] text-sm active:scale-[0.98]"
                      >
                        <Eye className="size-4" /> Aperçu
                      </button>
                      {store.hasPermission("canDownloadDocuments") && (
                        <button
                          type="button"
                          onClick={() => download(target.type, target.id)}
                          className="inline-flex h-[44px] items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white px-4 font-bold text-[#1A1916] text-sm active:scale-[0.98]"
                        >
                          <Download className="size-4" /> Télécharger PDF
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (!printDocument(doc)) toast.error("Document introuvable.");
                        }}
                        className="inline-flex h-[44px] items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white px-4 font-bold text-[#1A1916] text-sm active:scale-[0.98]"
                      >
                        <Printer className="size-4" /> Imprimer document
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    disabled={!linkedRepairId}
                    onClick={() => {
                      if (!printRepairQr(linkedRepairId, { format: store.workshopSettings.counterQrFormat })) {
                        toast.error("QR Code non disponible.");
                      }
                    }}
                    className="inline-flex h-[44px] items-center justify-center gap-2 rounded-[12px] bg-[#1A1916] px-4 font-bold text-sm text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#D7D7D2] disabled:text-[#777]"
                  >
                    <QrCode className="size-4" /> Imprimer QR suivi
                  </button>
                  <button
                    type="button"
                    disabled={!linkedRepairId}
                    onClick={() => {
                      const linkedRepair = store.repairs.find((entry) => entry.id === linkedRepairId);
                      if (!linkedRepair) return;
                      const access = linkedRepair.publicAccess ?? store.ensureRepairPublicAccess(linkedRepair.id);
                      if (access)
                        void shareCounterLink(publicAbsoluteUrl(access.url), "Lien de suivi copié pour le client.");
                    }}
                    className="inline-flex h-[44px] items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white px-4 font-bold text-[#1A1916] text-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#F7F7F4] disabled:text-[#777]"
                  >
                    <Copy className="size-4" /> Copier lien suivi
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EmptyCounter({ title, message, onClose }: Readonly<{ title: string; message: string; onClose: () => void }>) {
  return (
    <div className="mx-auto max-w-xl rounded-[20px] border border-[#E8E8E5] bg-white p-8 text-center">
      <h1 className="font-black text-[30px]">{title}</h1>
      <p className="mt-2 text-[#6E6E73]">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="mt-6 h-[52px] rounded-[14px] bg-[#2A9D8F] px-8 font-bold text-white"
      >
        Retour accueil
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  TodayStat — petite carte métrique                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

function TodayStat({
  icon,
  value,
  label,
  detail,
}: Readonly<{
  icon: React.ReactNode;
  value: string;
  label: string;
  detail?: string;
}>) {
  return (
    <div className="flex min-h-[92px] items-center gap-4 rounded-[16px] border border-[#E8E8E5] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(26,25,22,0.035)]">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#FFFFFF] text-[#1E7A6E]">{icon}</span>
      <div className="min-w-0">
        <p className="truncate font-bold text-[#1A1916] text-[20px] leading-none tabular-nums tracking-tight">
          {value}
        </p>
        <p className="mt-1.5 truncate text-[#6B6B6B] text-[12px]">{label}</p>
        {detail && <p className="mt-0.5 truncate text-[#6B6B6B] text-[11.5px]">{detail}</p>}
      </div>
    </div>
  );
}
