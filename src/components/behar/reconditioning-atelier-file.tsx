"use client";

// reconditioning-atelier-file — fiche atelier d'un appareil en reconditionnement.
// Même structure que la fiche réparation atelier : header dossier + actions rapides
// + onglets (Fiche · Diagnostic initial · Pièces & stock · Intervention · Photos ·
// Diagnostic final · Historique · Documents · Vente).

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
  Copy,
  ExternalLink,
  FileText,
  History,
  Package,
  Plus,
  Printer,
  QrCode,
  Search,
  ShieldCheck,
  Tag,
  Timer,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PhotoSlot } from "@/components/behar/photo-slot";
import { Panel, PrimaryButton, SecondaryButton } from "@/components/behar/primitives";
import { formatEuro, useBeharStore } from "@/lib/behar-store";
import { fileToCompressedDataUrl } from "@/lib/image-capture";
import { generateQrCodeDataUrl, publicAbsoluteUrl } from "@/lib/public-access";
import { formatMoney, safeNumber } from "@/lib/reconditioning-calc";
import {
  buildCertificateData,
  calculateTestedPoints,
  type CertificateData,
  certificatePublicPath,
  resolveReconditioningDeviceImage,
} from "@/lib/reconditioning-certificate";
import { maskImei, relativeSinceIso } from "@/lib/reconditioning-formatters";
import {
  computeMargin,
  type CosmeticGrade,
  DEFAULT_PUBLIC_SETTINGS,
  type FunctionalTestKey,
  gradeLabel,
  type PhysicalCheckKey,
  type PhysicalState,
  type ReconditioningMedia,
  type ReconditioningPublicSettings,
  realMargin,
  type ReconditioningFile,
  type ReconditioningStatus,
  SIMPLE_STATUS_LABEL,
  type TestState,
  useReconditioningStore,
  WORK_STATUSES,
} from "@/lib/reconditioning-store";
import {
  canGenerateSaleLabel,
  canMarkSold,
  canPublishPublicCertificate,
  getReadyForSaleChecklist,
} from "@/lib/reconditioning-validation";
import { useRecondSettings } from "@/lib/recond-settings";
import { isStockItemCompatibleWithModel } from "@/lib/stock-parts";
import { cn } from "@/lib/utils";

/* ═══════════════════════ Tokens & helpers partagés ═══════════════════════ */

export const RECOND_STATUS_TONE: Record<ReconditioningStatus, string> = {
  "À compléter": "border-[#FFD7B5] bg-[#FFF2E8] text-[#C05621]",
  Brouillon: "border-[#E8E8E5] bg-white text-[#6B6B6B]",
  Acheté: "border-[#D7EFEA] bg-[#ECF8F4] text-[#167B70]",
  Refusé: "border-[#E8E8E5] bg-[#F7F7F5] text-[#8A8A85]",
  Évaluation: "border-[#D9E7FF] bg-[#F3F7FF] text-[#2563EB]",
  Reconditionnement: "border-[#D7EFEA] bg-[#ECF8F4] text-[#167B70]",
  "En attente pièce": "border-[#F0E0BC] bg-[#FFF7E8] text-[#9A6B1B]",
  Tests: "border-[#D9E7FF] bg-[#F3F7FF] text-[#2563EB]",
  "Prêt à vendre": "border-[#CDEBE4] bg-[#ECF8F4] text-[#147065]",
  "En stock": "border-[#1F2937]/12 bg-white text-[#1F2937]",
  Vendu: "border-[#CDEBE4] bg-[#F4FAF7] text-[#147065]",
  Bloqué: "border-[#F0D9D6] bg-[#FCF4F3] text-[#B4342A]",
  Abandonné: "border-[#E8E8E5] bg-[#F7F7F5] text-[#8A8A85]",
};

export function RecondStatusPill({
  status,
  className,
}: Readonly<{ status: ReconditioningStatus; className?: string }>) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-[8px] border px-2.5 font-semibold text-[12px]",
        RECOND_STATUS_TONE[status],
        className,
      )}
    >
      {SIMPLE_STATUS_LABEL[status]}
    </span>
  );
}

/** Problème constaté à l'achat (défauts de la reprise, sinon observations). */
export function initialProblemLabel(file: ReconditioningFile): string {
  const defects = file.originalEstimation?.defects ?? [];
  if (defects.length) return defects.join(" · ");
  if (file.observations.trim()) return file.observations.trim();
  const c = file.condition;
  const derived = [
    c?.screen === "casse" ? "Écran cassé" : "",
    c?.screen === "tactile_hs" ? "Tactile HS" : "",
    c?.backGlass === "casse" ? "Face arrière cassée" : "",
    c?.batteryPct != null && c.batteryPct < 80 ? "Batterie faible" : "",
  ].filter(Boolean);
  return derived.length ? derived.join(" · ") : "Aucun problème signalé";
}

export const sourceLabel = (file: ReconditioningFile): string => file.customerName || file.supplierName || file.source;

const fmtDateTime = (iso?: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return `${d.toLocaleDateString("fr-FR")} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
};

const inputCls =
  "h-10 w-full rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-[#1A1916] text-sm outline-none transition focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10";
const selectCls = `${inputCls} cursor-pointer appearance-none pr-8`;

const WORKING_STATUSES: ReconditioningStatus[] = [
  "Brouillon",
  "Acheté",
  "Évaluation",
  "Reconditionnement",
  "En attente pièce",
  "Tests",
];

type FileTab =
  | "fiche"
  | "initial"
  | "parts"
  | "intervention"
  | "photos"
  | "final"
  | "publication"
  | "history"
  | "documents"
  | "vente";

const TABS: Array<{ id: FileTab; label: string; icon: typeof Wrench }> = [
  { id: "fiche", label: "Fiche", icon: ClipboardCheck },
  { id: "initial", label: "Diagnostic initial", icon: Search },
  { id: "parts", label: "Pièces & stock", icon: Package },
  { id: "intervention", label: "Intervention", icon: Timer },
  { id: "photos", label: "Photos", icon: Camera },
  { id: "final", label: "Diagnostic final", icon: ShieldCheck },
  { id: "publication", label: "Publication client", icon: QrCode },
  { id: "history", label: "Historique", icon: History },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "vente", label: "Vente", icon: Tag },
];

/* ═══════════════════════════ Composant racine ═══════════════════════════ */

export function ReconditioningAtelierFile({ fileId, onBack }: Readonly<{ fileId: string; onBack: () => void }>) {
  const file = useReconditioningStore((s) => s.files.find((f) => f.id === fileId));
  if (!file) {
    return (
      <Panel className="p-8 text-center">
        <p className="text-[#6B6B6B] text-sm">Appareil introuvable.</p>
        <SecondaryButton className="mt-4" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Retour à la file reconditionnement
        </SecondaryButton>
      </Panel>
    );
  }
  return <FileInner file={file} onBack={onBack} />;
}

function FileInner({ file, onBack }: Readonly<{ file: ReconditioningFile; onBack: () => void }>) {
  const [tab, setTab] = useState<FileTab>("fiche");
  const [soldOpen, setSoldOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  const updateFile = useReconditioningStore((s) => s.updateFile);
  const appendEvent = useReconditioningStore((s) => s.appendEvent);
  const generateCertificate = useReconditioningStore((s) => s.generateCertificate);
  const publishToStock = useReconditioningStore((s) => s.publishToStock);
  const markSold = useReconditioningStore((s) => s.markSold);
  const markBlocked = useReconditioningStore((s) => s.markBlocked);
  const reopenFile = useReconditioningStore((s) => s.reopenFile);
  const workshopSettings = useBeharStore((s) => s.workshopSettings);

  const margin = computeMargin(file);
  const real = realMargin(file);
  const image = resolveReconditioningDeviceImage(file);
  const shopName = workshopSettings.commercialName || workshopSettings.name || workshopSettings.brand || "Boutique";
  const certificateData = useMemo(
    () => buildCertificateData(file, { workshopName: shopName, shopLogoUrl: workshopSettings.logoUrl }),
    [file, shopName, workshopSettings.logoUrl],
  );
  const publicUrl = useMemo(() => publicAbsoluteUrl(certificatePublicPath(certificateData)), [certificateData]);
  const checklist = getReadyForSaleChecklist(file);
  const missing = checklist.filter((item) => !item.done);
  const working = WORKING_STATUSES.includes(file.status);

  const openDoc = (doc: "certificat" | "sortie" | "etiquette" | "achat" | "interne") =>
    window.open(`/print/reconditionnement?id=${encodeURIComponent(file.id)}&doc=${doc}`, "_blank", "noopener");

  const printInternalLabel = () => {
    openDoc("interne");
    updateFile(file.id, { internalLabelPrintedAt: new Date().toISOString() });
    appendEvent(file.id, "Étiquette interne imprimée");
  };

  const generateSaleLabel = () => {
    if (!canGenerateSaleLabel(file)) {
      setTab("vente");
      toast.error(`Étiquette de vente indisponible — à compléter : ${missing.map((m) => m.label).join(", ")}`);
      return;
    }
    if (!file.saleLabelGeneratedAt) {
      updateFile(file.id, { saleLabelGeneratedAt: new Date().toISOString() });
      appendEvent(file.id, "Étiquette de vente générée");
    }
    openDoc("etiquette");
  };

  const validateFinalDiagnostic = () => {
    if (!canPublishPublicCertificate(file)) {
      setTab("final");
      toast.error(`Diagnostic final incomplet — à compléter : ${missing.map((m) => m.label).join(", ")}`);
      return;
    }
    generateCertificate(file.id);
    toast.success("Diagnostic final validé — QR public et certificat générés.");
  };

  const markListed = () => {
    if (!canPublishPublicCertificate(file) || !file.publicEnabled) {
      toast.error("Validez d'abord le diagnostic final (QR public) avant la mise en vente.");
      setTab("final");
      return;
    }
    publishToStock(file.id);
    toast.success("Téléphone mis en vente — publié dans le stock boutique.");
  };

  const askSold = () => {
    if (!canMarkSold(file)) {
      toast.error("L'appareil doit être « Prêt à vendre » ou « Mis en vente » pour être vendu.");
      return;
    }
    setSoldOpen(true);
  };

  const headerActions: Array<{ label: string; onClick: () => void; danger?: boolean }> = (() => {
    switch (file.status) {
      case "À compléter":
      case "Brouillon":
        return [
          { label: "Compléter la fiche", onClick: () => setTab("fiche") },
          { label: "Imprimer l'étiquette interne", onClick: printInternalLabel },
        ];
      case "Acheté":
      case "Évaluation":
      case "Reconditionnement":
      case "En attente pièce":
      case "Tests":
        return [
          { label: "Ajouter une pièce", onClick: () => setTab("parts") },
          { label: "Passer au diagnostic final", onClick: () => setTab("final") },
          { label: "Générer l'étiquette de vente", onClick: generateSaleLabel },
        ];
      case "Prêt à vendre":
        return [
          { label: "Mettre en vente", onClick: markListed },
          { label: "Imprimer l'étiquette de vente", onClick: generateSaleLabel },
          { label: "Voir la page publique", onClick: () => window.open(publicUrl, "_blank", "noopener") },
        ];
      case "En stock":
        return [
          { label: "Marquer vendu", onClick: askSold },
          { label: "Imprimer l'étiquette de vente", onClick: generateSaleLabel },
          { label: "Voir la page publique", onClick: () => window.open(publicUrl, "_blank", "noopener") },
        ];
      case "Vendu":
        return [
          { label: "Voir la page publique", onClick: () => window.open(publicUrl, "_blank", "noopener") },
          { label: "Documents", onClick: () => setTab("documents") },
        ];
      default:
        return [{ label: "Réactiver le dossier", onClick: () => reopenFile(file.id) }];
    }
  })();

  const deviceTitleFull = [file.brand, file.model].filter(Boolean).join(" ") || "Appareil à définir";
  const deviceSubtitle = [file.storage, file.color, sourceLabel(file)].filter(Boolean).join(" · ");

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          className="inline-flex items-center gap-2 font-medium text-[#6B6B6B] text-sm transition hover:text-[#1A1916]"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="size-4" />
          Retour à la file reconditionnement
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <RecondStatusPill status={file.status} />
          {file.status === "Bloqué" ? (
            <span className="inline-flex h-7 items-center gap-1.5 rounded-[8px] border border-[#F2D4D1] bg-white px-2.5 font-semibold text-[#B42318] text-[12px]">
              <Circle className="size-2 fill-current" />
              {file.blockedReason || "Bloqué"}
            </span>
          ) : (
            <span className="inline-flex h-7 items-center gap-1.5 rounded-[8px] border border-[#D8E9FF] bg-white px-2.5 font-semibold text-[#2563A9] text-[12px]">
              <Circle className="size-2 fill-current" />
              Flux normal
            </span>
          )}
        </div>
      </div>

      <Panel className="overflow-hidden">
        <div className="grid gap-5 border-[#E8E8E5] border-b p-5 lg:grid-cols-[1.15fr_1fr_0.85fr]">
          <div className="flex min-w-0 gap-4">
            <span className="grid size-[74px] shrink-0 place-items-center overflow-hidden rounded-[14px] border border-[#E8E8E5] bg-[#FAFAF8] text-[#6B6B6B]">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={deviceTitleFull} className="size-full object-contain p-1.5" src={image} />
              ) : (
                <Package className="size-6" />
              )}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-[#1A1916] text-[18px] leading-tight">{file.number}</p>
              <h2 className="mt-1 truncate font-semibold text-[#1A1916] text-[24px] leading-tight tracking-tight">
                {deviceTitleFull}
              </h2>
              <p className="mt-1 truncate text-[#6B6B6B] text-sm">
                {deviceSubtitle || "Stockage / couleur à compléter"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <SummaryCell label="Source" value={sourceLabel(file)} />
            <SummaryCell label="Technicien" value={file.technician || "Atelier principal"} />
            <SummaryCell label="Acheté depuis" value={relativeSinceIso(file.receivedAt || file.createdAt)} />
            <SummaryCell
              label="Promis prêt le"
              value={file.promisedReadyAt ? fmtDateTime(file.promisedReadyAt) : "À planifier"}
            />
          </div>
          <div className="grid content-start gap-2">
            {headerActions.map((action) => (
              <ActionButton danger={action.danger} key={action.label} label={action.label} onClick={action.onClick} />
            ))}
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto px-4 py-3">
          {TABS.map((entry) => {
            const Icon = entry.icon;
            const active = tab === entry.id;
            return (
              <button
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-[10px] px-3 font-semibold text-[12px] transition",
                  active ? "bg-[#ECF8F4] text-[#167B70]" : "text-[#6B6B6B] hover:bg-[#F7F7F5] hover:text-[#1A1916]",
                )}
                key={entry.id}
                onClick={() => setTab(entry.id)}
                type="button"
              >
                <Icon className="size-4" />
                {entry.label}
              </button>
            );
          })}
        </div>
      </Panel>

      {tab === "fiche" && <FicheTab file={file} margin={margin} onOpenTab={setTab} />}
      {tab === "initial" && <InitialDiagnosticTab file={file} />}
      {tab === "parts" && <PartsTab file={file} margin={margin} />}
      {tab === "intervention" && <InterventionTab file={file} onOpenFinal={() => setTab("final")} />}
      {tab === "photos" && <PhotosTab file={file} />}
      {tab === "final" && <FinalDiagnosticTab file={file} missing={missing} onValidate={validateFinalDiagnostic} />}
      {tab === "publication" && (
        <PublicationClientTab
          certificateData={certificateData}
          file={file}
          onOpenPublic={() => window.open(publicUrl, "_blank", "noopener")}
          onPrintLabel={generateSaleLabel}
          onGenerateQr={validateFinalDiagnostic}
        />
      )}
      {tab === "history" && <HistoryTab file={file} />}
      {tab === "documents" && (
        <DocumentsTab
          file={file}
          onOpenDoc={openDoc}
          onPrintInternal={printInternalLabel}
          onSaleLabel={generateSaleLabel}
          publicUrl={publicUrl}
        />
      )}
      {tab === "vente" && (
        <VenteTab
          checklist={checklist}
          file={file}
          margin={margin}
          onBlock={() => setBlockOpen(true)}
          onListed={markListed}
          onSaleLabel={generateSaleLabel}
          onSold={askSold}
          onValidateFinal={validateFinalDiagnostic}
          publicUrl={publicUrl}
          real={real}
        />
      )}

      {working && (
        <Panel className="flex flex-wrap items-center gap-1.5 p-4">
          <span className="mr-1 text-[#6B6B6B] text-[12px]">Étape atelier :</span>
          {WORK_STATUSES.map(({ status, label }) => (
            <button
              className={cn(
                "h-9 rounded-[10px] border px-3 font-semibold text-[13px] transition",
                file.status === status ||
                  (status === "Évaluation" && (file.status === "Brouillon" || file.status === "Acheté"))
                  ? "border-[#2A9D8F] bg-[#ECF8F4] text-[#147065]"
                  : "border-[#E8E8E5] bg-white text-[#6B6B6B] hover:text-[#1A1916]",
              )}
              key={status}
              onClick={() => {
                if (file.status === status) return;
                updateFile(file.id, { status });
                appendEvent(file.id, `Statut : ${SIMPLE_STATUS_LABEL[status]}`);
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </Panel>
      )}

      {soldOpen && (
        <SoldModal
          defaultPrice={file.prixVentePrevu}
          onClose={() => setSoldOpen(false)}
          onConfirm={(price) => {
            markSold(file.id, price);
            setSoldOpen(false);
          }}
        />
      )}
      {blockOpen && (
        <BlockModal
          onClose={() => setBlockOpen(false)}
          onConfirm={(reason) => {
            markBlocked(file.id, reason);
            setBlockOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════ Onglet Fiche ═══════════════════════════ */

function FicheTab({
  file,
  margin,
  onOpenTab,
}: Readonly<{
  file: ReconditioningFile;
  margin: ReturnType<typeof computeMargin>;
  onOpenTab: (tab: FileTab) => void;
}>) {
  const next = nextAction(file);
  const decremented = file.parts.filter((part) => part.stockDecremented).length;
  const stockStatus = !file.parts.length
    ? "Aucune pièce utilisée"
    : decremented
      ? `${decremented} pièce${decremented > 1 ? "s" : ""} décrémentée${decremented > 1 ? "s" : ""} du stock`
      : `${file.parts.length} pièce${file.parts.length > 1 ? "s" : ""} (hors stock)`;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_0.8fr]">
        <Panel className="p-5">
          <SectionTitle title="Résumé dossier" />
          <p className="mt-3 text-[#1A1916] text-sm leading-6">
            Téléphone repris avec {initialProblemLabel(file).toLowerCase()}. Le dossier suit le cycle de
            reconditionnement central et reste visible au comptoir, à l'atelier et au dashboard.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoLine label="Diagnostic initial" value={initialProblemLabel(file)} />
            <InfoLine label="Statut stock" value={stockStatus} />
            <InfoLine label="Temps depuis achat" value={relativeSinceIso(file.receivedAt || file.createdAt)} />
            <InfoLine
              label="Registre / conformité"
              value={file.purchaseLogged ? "Achat tracé au registre" : "À compléter"}
            />
            <InfoLine label="Achat" value={file.prixAchat > 0 ? formatEuro(file.prixAchat) : "À compléter"} />
            <InfoLine
              label="Marge estimée"
              value={
                <span
                  className={margin.margeBrute >= 0 ? "font-semibold text-[#147065]" : "font-semibold text-[#B4342A]"}
                >
                  {file.prixVentePrevu > 0
                    ? `${margin.margeBrute >= 0 ? "+" : ""}${formatEuro(margin.margeBrute)}`
                    : "À compléter"}
                </span>
              }
            />
          </div>
        </Panel>

        <Panel className="p-5">
          <SectionTitle title="Traçabilité appareil" />
          <div className="mt-4 space-y-3">
            <InfoLine label="Référence interne" value={file.number} />
            <InfoLine label="IMEI" value={maskImei(file.imei || file.serial)} />
            <InfoLine label="Source" value={sourceLabel(file)} />
            <InfoLine label="Emplacement" value={file.workshopLocation || file.saleLocation || "À définir"} />
            <InfoLine
              label="Étiquette interne"
              value={
                file.internalLabelPrintedAt
                  ? "Imprimée"
                  : file.internalLabelGeneratedAt
                    ? "Générée (à imprimer)"
                    : "À générer"
              }
            />
            <InfoLine label="QR interne" value={file.internalQrToken ? "Actif" : "À générer"} />
            <InfoLine label="QR public" value={file.publicEnabled ? "Actif" : "Non publié"} />
          </div>
        </Panel>

        <Panel className="p-5">
          <SectionTitle title="Prochaine action" />
          <div className="mt-4 rounded-[16px] bg-[#FAFAF8] p-4">
            <p className="font-semibold text-[#1A1916] text-sm">{next.title}</p>
            <p className="mt-1 text-[#6B6B6B] text-xs leading-5">{next.description}</p>
            <PrimaryButton className="mt-4 w-full" onClick={() => onOpenTab(next.tab)}>
              Ouvrir
              <ChevronRight className="ml-2 size-4" />
            </PrimaryButton>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <IdentityPanel file={file} />
        <Panel className="p-5">
          <SectionTitle title="Historique rapide" />
          <EventsTable events={[...file.history].reverse().slice(0, 6)} />
        </Panel>
      </div>
    </div>
  );
}

function IdentityPanel({ file }: Readonly<{ file: ReconditioningFile }>) {
  const updateFile = useReconditioningStore((s) => s.updateFile);
  return (
    <Panel className="p-5">
      <SectionTitle title="Identité appareil" />
      <p className="mt-1 text-[#6B6B6B] text-xs">
        Modèle, stockage, couleur et prix d'achat sont requis pour débloquer le flux.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <FieldLabel label="Marque">
          <input
            className={inputCls}
            onChange={(e) => updateFile(file.id, { brand: e.target.value })}
            value={file.brand}
          />
        </FieldLabel>
        <FieldLabel label="Modèle">
          <input
            className={inputCls}
            onChange={(e) => updateFile(file.id, { model: e.target.value })}
            value={file.model}
          />
        </FieldLabel>
        <FieldLabel label="Capacité">
          <input
            className={inputCls}
            onChange={(e) => updateFile(file.id, { storage: e.target.value })}
            placeholder="128 Go"
            value={file.storage}
          />
        </FieldLabel>
        <FieldLabel label="Couleur">
          <input
            className={inputCls}
            onChange={(e) => updateFile(file.id, { color: e.target.value })}
            value={file.color}
          />
        </FieldLabel>
        <FieldLabel label="IMEI / Série">
          <input
            className={inputCls}
            onChange={(e) => updateFile(file.id, { imei: e.target.value })}
            value={file.imei}
          />
        </FieldLabel>
        <FieldLabel label="Accessoires">
          <input
            className={inputCls}
            onChange={(e) => updateFile(file.id, { accessories: e.target.value })}
            value={file.accessories}
          />
        </FieldLabel>
        <FieldLabel label="Prix d'achat (€)">
          <input
            className={inputCls}
            min={0}
            onChange={(e) => updateFile(file.id, { prixAchat: Math.max(0, safeNumber(e.target.value)) })}
            type="number"
            value={file.prixAchat || ""}
          />
        </FieldLabel>
        <FieldLabel label="Prix de vente prévu (€)">
          <input
            className={inputCls}
            min={0}
            onChange={(e) => updateFile(file.id, { prixVentePrevu: Math.max(0, safeNumber(e.target.value)) })}
            type="number"
            value={file.prixVentePrevu || ""}
          />
        </FieldLabel>
      </div>
    </Panel>
  );
}

function nextAction(file: ReconditioningFile): { title: string; description: string; tab: FileTab } {
  switch (file.status) {
    case "À compléter":
    case "Brouillon":
      return {
        title: "Compléter la fiche",
        description: "Renseignez modèle, stockage, grade et prix pour débloquer le flux.",
        tab: "fiche",
      };
    case "Acheté":
    case "Évaluation":
      return {
        title: "Démarrer le reconditionnement",
        description: "Vérifiez le diagnostic initial puis lancez la remise en état.",
        tab: "initial",
      };
    case "Reconditionnement":
    case "En attente pièce":
      return {
        title: "Continuer le reconditionnement",
        description: "Ajouter les pièces, valider le diagnostic final et générer l'étiquette de vente.",
        tab: "parts",
      };
    case "Tests":
      return {
        title: "Valider le diagnostic final",
        description: "Contrôle final avant publication du QR client.",
        tab: "final",
      };
    case "Prêt à vendre":
      return {
        title: "Mettre en vente",
        description: "Étiquette de vente, QR public et publication en stock boutique.",
        tab: "vente",
      };
    case "En stock":
      return {
        title: "Marquer vendu",
        description: "Enregistrez la vente pour calculer la marge réelle.",
        tab: "vente",
      };
    case "Vendu":
      return {
        title: "Dossier terminé",
        description: "Consultez l'historique complet et la marge réelle.",
        tab: "history",
      };
    default:
      return { title: "Dossier bloqué", description: "Réactivez le dossier pour reprendre le flux.", tab: "fiche" };
  }
}

/* ═══════════════════════ Onglet Diagnostic initial ═══════════════════════ */

function InitialDiagnosticTab({ file }: Readonly<{ file: ReconditioningFile }>) {
  const condition = file.condition;
  const battery = condition?.batteryTier || (condition?.batteryPct != null ? `${condition.batteryPct} %` : "");
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle title="État du téléphone à l'achat" />
          <span className="rounded-full bg-[#F7F7F5] px-2.5 py-1 font-semibold text-[#6B6B6B] text-[11px]">
            Interne uniquement — jamais visible côté client
          </span>
        </div>
        <div className="mt-4 grid gap-2 text-[12.5px] sm:grid-cols-3">
          <InternalInfo label="Écran" value={condition?.screen} />
          <InternalInfo label="Batterie" value={battery} />
          <InternalInfo label="Face arrière" value={condition?.backGlass} />
          <InternalInfo label="Face ID / Touch ID" value={condition?.biometrics} />
          <InternalInfo label="Réseau" value={condition?.network} />
          <InternalInfo label="Caméra" value={condition?.camera} />
          <InternalInfo label="Oxydation" value={condition?.oxidation} />
          <InternalInfo label="iCloud / Google" value={condition?.lock} />
          <InternalInfo label="IMEI" value={condition?.imeiStatus} />
          <InternalInfo label="Grade initial" value={condition?.grade || file.cosmeticGrade || undefined} />
          <InternalInfo label="Problème signalé" value={initialProblemLabel(file)} />
          <InternalInfo label="Source" value={sourceLabel(file)} />
        </div>
        {(file.originalEstimation?.defects?.length ?? 0) > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {file.originalEstimation?.defects.map((defect) => (
              <span
                className="rounded-[8px] bg-[#FFF7E8] px-2.5 py-1 font-semibold text-[#9A6B1B] text-[11px]"
                key={defect}
              >
                {defect}
              </span>
            ))}
          </div>
        )}
        <p className="mt-4 rounded-[12px] border border-[#D7EFEA] bg-[#ECF8F4] px-3.5 py-2.5 text-[#147065] text-[12.5px]">
          Si un défaut est réparé en atelier, la page publique affichera l'état final (« OK » ou « Remplacé »), jamais
          ce constat d'achat.
        </p>
      </Panel>

      <Panel className="p-5">
        <SectionTitle title="Photos à l'achat" />
        <p className="mt-1 text-[#6B6B6B] text-xs">Prises à la reprise — internes, jamais publiées.</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {(["face", "dos", "defaut"] as const).map((slot) =>
            file.photos[slot] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={slot}
                className="aspect-square w-full rounded-[12px] border border-[#E8E8E5] object-cover"
                key={slot}
                src={file.photos[slot]}
              />
            ) : (
              <div
                className="grid aspect-square w-full place-items-center rounded-[12px] border border-[#E8E8E5] border-dashed text-[#9A9A95] text-[11px]"
                key={slot}
              >
                {slot === "face" ? "Face" : slot === "dos" ? "Dos" : "Défaut"}
              </div>
            ),
          )}
        </div>
        {file.originalEstimation && (
          <div className="mt-4 space-y-3 border-[#F1F1EF] border-t pt-4">
            <InfoLine label="Cote de base" value={formatMoney(file.originalEstimation.coteDeBase)} />
            <InfoLine label="Prix conseillé (reprise)" value={formatMoney(file.originalEstimation.prixConseille)} />
            <InfoLine label="Prix payé" value={formatMoney(file.originalEstimation.prixFinalPaye)} />
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ═══════════════════════ Onglet Pièces & stock ═══════════════════════ */

function PartsTab({ file, margin }: Readonly<{ file: ReconditioningFile; margin: ReturnType<typeof computeMargin> }>) {
  const stockItems = useBeharStore((s) => s.stockItems);
  const addPartFromStock = useReconditioningStore((s) => s.addPartFromStock);
  const addPart = useReconditioningStore((s) => s.addPart);
  const updatePart = useReconditioningStore((s) => s.updatePart);
  const removePart = useReconditioningStore((s) => s.removePart);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");

  const compatible = useMemo(
    () =>
      stockItems.filter(
        (item) => (item.stock ?? 0) > 0 && isStockItemCompatibleWithModel(item, file.brand, file.model),
      ),
    [stockItems, file.brand, file.model],
  );
  const others = useMemo(
    () =>
      stockItems.filter(
        (item) => item.active !== false && (item.stock ?? 0) > 0 && !compatible.some((c) => c.id === item.id),
      ),
    [stockItems, compatible],
  );
  const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const pool = showAll || compatible.length === 0 ? [...compatible, ...others] : compatible;
  const filtered = query.trim()
    ? pool.filter((item) => norm(`${item.name} ${item.sku} ${item.reference} ${item.supplier}`).includes(norm(query)))
    : pool;

  const partsTotal = file.parts.reduce(
    (sum, part) => sum + safeNumber(part.cost) * Math.max(1, safeNumber(part.quantity)),
    0,
  );
  const stockEvents = file.history.filter((event) => /pièce|stock|facture|étiquette/i.test(event.title));

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-[#E8E8E5] border-b p-5">
          <div>
            <SectionTitle title="Pièces utilisées" />
            <p className="mt-0.5 text-[#6B6B6B] text-xs">
              Le stock est décrémenté à la validation réelle de la pièce — jamais pendant l'estimation.
            </p>
          </div>
          <PrimaryButton onClick={() => setPickerOpen((open) => !open)}>
            <Plus className="size-4" />
            Ajouter une pièce
          </PrimaryButton>
        </div>

        {pickerOpen && (
          <div className="border-[#E8E8E5] border-b bg-[#FAFAF8] p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#9A9A95]" />
                <input
                  className={cn(inputCls, "pl-9")}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher une pièce, référence, fournisseur…"
                  value={query}
                />
              </div>
              {compatible.length > 0 && others.length > 0 && (
                <label className="flex cursor-pointer items-center gap-2 text-[#6B6B6B] text-[12.5px]">
                  <input checked={showAll} onChange={(e) => setShowAll(e.target.checked)} type="checkbox" />
                  Tout le stock
                </label>
              )}
              <button
                className="grid size-9 place-items-center rounded-[10px] border border-[#E8E8E5] bg-white text-[#6B6B6B]"
                onClick={() => setPickerOpen(false)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-[#6B6B6B] text-[12px]">
              {compatible.length > 0
                ? `${compatible.length} pièce${compatible.length > 1 ? "s" : ""} compatible${compatible.length > 1 ? "s" : ""} avec ${[file.brand, file.model].filter(Boolean).join(" ") || "ce modèle"} — seules les pièces compatibles sont proposées.`
                : "Aucune pièce compatible trouvée — tout le stock disponible est proposé."}
            </p>
            <div className="mt-3 max-h-[300px] space-y-2 overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <p className="rounded-[12px] bg-white px-3 py-4 text-center text-[#6B6B6B] text-xs">
                  Aucune pièce en stock ne correspond.
                </p>
              ) : (
                filtered.map((item) => (
                  <div
                    className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[#E8E8E5] bg-white px-3.5 py-2.5"
                    key={item.id}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[#1A1916] text-[13px]">{item.name}</p>
                      <p className="truncate text-[#9A9A95] text-[11.5px]">
                        {item.sku || item.reference || "Réf. non renseignée"} ·{" "}
                        {item.supplier || "Fournisseur non renseigné"}
                      </p>
                    </div>
                    <span className="text-[#6B6B6B] text-[12px]">{item.stock ?? 0} en stock</span>
                    <span className="font-semibold text-[#1A1916] text-[12.5px]">
                      {item.purchasePrice > 0 ? formatEuro(item.purchasePrice) : "Prix à renseigner"}
                    </span>
                    <SecondaryButton
                      className="h-8 px-3 text-[12px]"
                      onClick={() => {
                        addPartFromStock(file.id, item.id, 1);
                        setPickerOpen(false);
                        toast.success(`${item.name} ajoutée — stock décrémenté.`);
                      }}
                    >
                      Sélectionner
                    </SecondaryButton>
                  </div>
                ))
              )}
            </div>
            <button
              className="mt-3 inline-flex items-center gap-1.5 font-semibold text-[#2A9D8F] text-xs hover:underline"
              onClick={() => {
                addPart(file.id);
                setPickerOpen(false);
              }}
              type="button"
            >
              <Plus className="size-3.5" />
              Pièce hors stock (coût manuel)
            </button>
          </div>
        )}

        {file.parts.length === 0 ? (
          <p className="p-8 text-center text-[#9A9A95] text-[13px]">Aucune pièce utilisée pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-[#E8E8E5] border-b text-left text-[#6B6B6B] text-xs">
                <tr>
                  <th className="px-4 py-3 font-semibold">Pièce</th>
                  <th className="px-4 py-3 font-semibold">Référence</th>
                  <th className="px-4 py-3 font-semibold">Fournisseur</th>
                  <th className="px-4 py-3 font-semibold">Facture</th>
                  <th className="px-4 py-3 text-right font-semibold">Qté</th>
                  <th className="px-4 py-3 text-right font-semibold">Coût unitaire</th>
                  <th className="px-4 py-3 font-semibold">Mouvement stock</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {file.parts.map((part) => {
                  const manual = !part.stockItemId;
                  return (
                    <tr className="border-[#F1F1EF] border-b last:border-0" key={part.id}>
                      <td className="px-4 py-3">
                        {manual ? (
                          <input
                            className={cn(inputCls, "h-9 min-w-[150px]")}
                            onChange={(e) => updatePart(file.id, part.id, { label: e.target.value })}
                            placeholder="Nom de la pièce"
                            value={part.label}
                          />
                        ) : (
                          <span className="font-medium text-[#1A1916]">{part.label || "Pièce atelier"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#6B6B6B]">{part.reference || part.sku || "—"}</td>
                      <td className="px-4 py-3 text-[#6B6B6B]">{part.supplier || file.supplierName || "Interne"}</td>
                      <td className="px-4 py-3 text-[#6B6B6B]">
                        {part.supplierInvoice || file.supplierInvoice || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          className={cn(inputCls, "h-9 w-16 text-right")}
                          min={1}
                          onChange={(e) =>
                            updatePart(file.id, part.id, {
                              quantity: Math.max(1, Math.round(safeNumber(e.target.value))),
                            })
                          }
                          type="number"
                          value={part.quantity || 1}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {manual ? (
                          <input
                            className={cn(inputCls, "h-9 w-24 text-right")}
                            min={0}
                            onChange={(e) =>
                              updatePart(file.id, part.id, { cost: Math.max(0, safeNumber(e.target.value)) })
                            }
                            type="number"
                            value={part.cost}
                          />
                        ) : (
                          <span className="font-semibold text-[#1A1916] tabular-nums">{formatEuro(part.cost)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {part.stockBefore != null && part.stockAfter != null ? (
                          <span className="font-semibold text-[#167B70] tabular-nums">
                            {part.stockBefore} → {part.stockAfter}
                          </span>
                        ) : part.stockDecremented ? (
                          <span className="text-[#167B70]">Décrémenté</span>
                        ) : (
                          <span className="text-[#9A9A95]">Manuel</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#6B6B6B]">
                        {part.usedAt ? new Date(part.usedAt).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-2 py-3">
                        <button
                          className="grid size-8 place-items-center rounded-[8px] text-[#9B9B96] transition hover:bg-[#FCF4F3] hover:text-[#B4342A]"
                          onClick={() => removePart(file.id, part.id)}
                          title="Retirer la pièce (restaure le stock)"
                          type="button"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="space-y-4">
        <Panel className="p-5">
          <SectionTitle title="Traçabilité stock" />
          <div className="mt-4 space-y-1 text-[13px]">
            <FinRow label="Achat" value={file.prixAchat > 0 ? formatEuro(file.prixAchat) : "À compléter"} />
            <FinRow label="Coût pièces" value={formatEuro(partsTotal)} />
            <FinRow label="Main-d'œuvre" value={formatEuro(safeNumber(file.laborCost))} />
            <div className="border-[#F1F1EF] border-t pt-1.5">
              <FinRow bold label="Coût réel" value={formatEuro(margin.coutTotal)} />
            </div>
            <FinRow
              label="Prix de vente conseillé"
              value={file.prixVentePrevu > 0 ? formatEuro(file.prixVentePrevu) : "À compléter"}
            />
            <FinRow
              label="Marge estimée"
              tone={margin.margeBrute >= 0 ? "good" : "bad"}
              value={
                file.prixVentePrevu > 0
                  ? `${margin.margeBrute >= 0 ? "+" : ""}${formatEuro(margin.margeBrute)}`
                  : "À compléter"
              }
            />
          </div>
        </Panel>

        <Panel className="p-5">
          <SectionTitle title="Chronologie pièces & stock" />
          <div className="mt-4 space-y-2.5">
            {stockEvents.length === 0 ? (
              <p className="text-[#9A9A95] text-[12.5px]">Aucun mouvement pour le moment.</p>
            ) : (
              [...stockEvents]
                .reverse()
                .slice(0, 8)
                .map((event) => (
                  <div className="flex items-start gap-2.5" key={event.id}>
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#ECF8F4] text-[#147065]">
                      <Check className="size-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#1A1916] text-[12.5px]">{event.title}</p>
                      <p className="text-[#9A9A95] text-[11px]">
                        {fmtDateTime(event.at)}
                        {event.by ? ` · ${event.by}` : ""}
                      </p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ═══════════════════════ Onglet Intervention ═══════════════════════ */

function InterventionTab({ file, onOpenFinal }: Readonly<{ file: ReconditioningFile; onOpenFinal: () => void }>) {
  const updateFile = useReconditioningStore((s) => s.updateFile);
  const tested = calculateTestedPoints(file);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle title="Travaux effectués" />
          <span className="rounded-full bg-[#F7F7F5] px-2.5 py-1 font-semibold text-[#6B6B6B] text-[11px]">
            Interne — jamais visible sur le QR client
          </span>
        </div>
        {file.parts.length === 0 ? (
          <p className="mt-4 rounded-[12px] bg-[#F7F7F5] px-3 py-4 text-center text-[#6B6B6B] text-xs">
            Aucune pièce posée — les pièces ajoutées dans « Pièces & stock » apparaissent ici comme travaux.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {file.parts.map((part) => (
              <div
                className="flex items-center gap-3 rounded-[12px] border border-[#E8E8E5] px-3.5 py-2.5"
                key={part.id}
              >
                <Wrench className="size-4 shrink-0 text-[#147065]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[#1A1916] text-[13px]">
                    {part.label || "Pièce atelier"} — remplacement
                  </p>
                  <p className="text-[#9A9A95] text-[11.5px]">
                    {part.usedAt ? fmtDateTime(part.usedAt) : "Date non renseignée"} ·{" "}
                    {part.technician || file.technician || "Atelier principal"}
                  </p>
                </div>
                <span className="font-semibold text-[#1A1916] text-[12.5px]">
                  {formatEuro(safeNumber(part.cost) * Math.max(1, safeNumber(part.quantity)))}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <FieldLabel label="Notes internes atelier">
            <textarea
              className={cn(inputCls, "h-auto py-3")}
              onChange={(e) => updateFile(file.id, { m360Notes: e.target.value })}
              placeholder="Nettoyage, tests, remarques…"
              rows={3}
              value={file.m360Notes}
            />
          </FieldLabel>
        </div>
      </Panel>

      <Panel className="p-5">
        <SectionTitle title="Main-d'œuvre & suivi" />
        <div className="mt-4 space-y-3.5">
          <FieldLabel label="Technicien">
            <input
              className={inputCls}
              onChange={(e) => updateFile(file.id, { technician: e.target.value })}
              placeholder="Atelier principal"
              value={file.technician ?? ""}
            />
          </FieldLabel>
          <FieldLabel label="Main-d'œuvre (€)">
            <input
              className={inputCls}
              min={0}
              onChange={(e) => updateFile(file.id, { laborCost: Math.max(0, safeNumber(e.target.value)) })}
              type="number"
              value={file.laborCost ?? ""}
            />
          </FieldLabel>
          <FieldLabel label="Temps passé (minutes)">
            <input
              className={inputCls}
              min={0}
              onChange={(e) =>
                updateFile(file.id, { interventionMinutes: Math.max(0, Math.round(safeNumber(e.target.value))) })
              }
              type="number"
              value={file.interventionMinutes ?? ""}
            />
          </FieldLabel>
          <FieldLabel label="Promis prêt le">
            <input
              className={inputCls}
              onChange={(e) =>
                updateFile(file.id, {
                  promisedReadyAt: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                })
              }
              type="datetime-local"
              value={file.promisedReadyAt ? toLocalInput(file.promisedReadyAt) : ""}
            />
          </FieldLabel>
          <FieldLabel label="Emplacement atelier">
            <input
              className={inputCls}
              onChange={(e) => updateFile(file.id, { workshopLocation: e.target.value || undefined })}
              placeholder="Bac reconditionnement A2…"
              value={file.workshopLocation ?? ""}
            />
          </FieldLabel>
        </div>
        <div className="mt-4 rounded-[12px] bg-[#FAFAF8] p-3.5">
          <p className="font-semibold text-[#1A1916] text-[12.5px]">Contrôle effectué</p>
          <p className="mt-0.5 text-[#6B6B6B] text-[12px]">
            {tested.testedPoints} / {tested.totalPoints} points contrôlés au diagnostic final.
          </p>
          <SecondaryButton className="mt-3 w-full" onClick={onOpenFinal}>
            <ShieldCheck className="size-4" />
            Ouvrir le diagnostic final
          </SecondaryButton>
        </div>
      </Panel>
    </div>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ═══════════════════════ Onglet Photos ═══════════════════════ */

function PhotosTab({ file }: Readonly<{ file: ReconditioningFile }>) {
  const setPhoto = useReconditioningStore((s) => s.setPhoto);
  const addMedia = useReconditioningStore((s) => s.addMedia);
  const deleteMedia = useReconditioningStore((s) => s.deleteMedia);
  const setPrimaryMedia = useReconditioningStore((s) => s.setPrimaryMedia);
  const toggleMediaPublic = useReconditioningStore((s) => s.toggleMediaPublic);
  const reorderMedia = useReconditioningStore((s) => s.reorderMedia);
  const media = file.media ?? [];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <MediaPanel
          badge="Interne uniquement"
          description="État à l'achat. Ces photos ne sont jamais publiées automatiquement."
          items={media.filter((item) => item.visibility === "internal_purchase")}
          onAdd={(dataUrl, fileInfo) =>
            addMedia(file.id, {
              ...fileInfo,
              dataUrl,
              visibility: "internal_purchase",
              isPublic: false,
              isPrimary: false,
            })
          }
          onDelete={(mediaId) => deleteMedia(file.id, mediaId)}
          title="Photos à l'achat"
        />
        <MediaPanel
          badge="Interne uniquement"
          description="Photos après intervention, contrôle atelier ou preuve interne."
          items={media.filter((item) => item.visibility === "internal_workshop")}
          onAdd={(dataUrl, fileInfo) =>
            addMedia(file.id, {
              ...fileInfo,
              dataUrl,
              visibility: "internal_workshop",
              isPublic: false,
              isPrimary: false,
            })
          }
          onDelete={(mediaId) => deleteMedia(file.id, mediaId)}
          title="Photos atelier"
        />
        <MediaPanel
          badge="Visible sur QR client"
          description="Seules ces photos peuvent apparaître sur la page client et l'étiquette."
          items={media.filter((item) => item.visibility === "public_sale").sort((a, b) => a.sortOrder - b.sortOrder)}
          onAdd={(dataUrl, fileInfo) =>
            addMedia(file.id, { ...fileInfo, dataUrl, visibility: "public_sale", isPublic: true, isPrimary: false })
          }
          onDelete={(mediaId) => deleteMedia(file.id, mediaId)}
          onPrimary={(mediaId) => setPrimaryMedia(file.id, mediaId)}
          onTogglePublic={(mediaId, visible) => toggleMediaPublic(file.id, mediaId, visible)}
          onMove={(mediaId, direction) => reorderMedia(file.id, mediaId, direction)}
          title="Photos publiques client"
          publicPanel
        />
      </div>

      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle title="Photos historiques" />
          <span className="rounded-full bg-[#F7F7F5] px-2.5 py-1 font-semibold text-[#6B6B6B] text-[11px]">
            Compatibilité anciennes fiches
          </span>
        </div>
        <p className="mt-1 text-[#6B6B6B] text-xs">
          Ces emplacements restent disponibles, mais seules les photos publiques client sont publiées.
        </p>
        <div className="mt-4 grid max-w-[560px] grid-cols-4 gap-3">
          <PhotoSlot label="Face" onChange={(v) => setPhoto(file.id, "face", v)} value={file.photos.face} />
          <PhotoSlot label="Dos" onChange={(v) => setPhoto(file.id, "dos", v)} value={file.photos.dos} />
          <PhotoSlot label="Défaut" onChange={(v) => setPhoto(file.id, "defaut", v)} value={file.photos.defaut} />
          <PhotoSlot label="Vente" onChange={(v) => setPhoto(file.id, "cote", v)} value={file.photos.cote} />
        </div>
      </Panel>
    </div>
  );
}

function MediaPanel({
  badge,
  description,
  items,
  onAdd,
  onDelete,
  onMove,
  onPrimary,
  onTogglePublic,
  publicPanel,
  title,
}: Readonly<{
  badge: string;
  description: string;
  items: ReconditioningMedia[];
  onAdd: (dataUrl: string, fileInfo: Pick<ReconditioningMedia, "fileName" | "fileSize" | "mimeType">) => void;
  onDelete: (mediaId: string) => void;
  onMove?: (mediaId: string, direction: "up" | "down") => void;
  onPrimary?: (mediaId: string) => void;
  onTogglePublic?: (mediaId: string, visible: boolean) => void;
  publicPanel?: boolean;
  title: string;
}>) {
  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle title={title} />
        <span
          className={cn(
            "rounded-full px-2.5 py-1 font-semibold text-[11px]",
            publicPanel ? "border border-[#D7EFEA] bg-[#ECF8F4] text-[#147065]" : "bg-[#F7F7F5] text-[#6B6B6B]",
          )}
        >
          {badge}
        </span>
      </div>
      <p className="mt-1 min-h-8 text-[#6B6B6B] text-xs">{description}</p>
      <MediaUploadButton className="mt-4" onAdd={onAdd} />
      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <p className="rounded-[12px] border border-[#E8E8E5] border-dashed px-3 py-4 text-center text-[#9A9A95] text-[12px]">
            Aucune photo.
          </p>
        ) : (
          items.map((item, index) => (
            <div className="flex gap-2 rounded-[12px] border border-[#E8E8E5] bg-white p-2" key={item.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" className="size-14 rounded-[8px] object-cover" src={item.dataUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[#1A1916] text-[12px]">
                  {item.fileName || `Photo ${index + 1}`}
                </p>
                <p className="text-[#6B6B6B] text-[11px]">
                  {item.isPrimary ? "Principale" : item.isPublic ? "Visible client" : "Non publiée"}
                </p>
                {publicPanel && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    <button
                      className="rounded-[7px] bg-[#F7F7F5] px-2 py-1 font-semibold text-[#6B6B6B] text-[10px]"
                      onClick={() => onPrimary?.(item.id)}
                      type="button"
                    >
                      Principale
                    </button>
                    <button
                      className="rounded-[7px] bg-[#F7F7F5] px-2 py-1 font-semibold text-[#6B6B6B] text-[10px]"
                      onClick={() => onTogglePublic?.(item.id, !item.isPublic)}
                      type="button"
                    >
                      {item.isPublic ? "Retirer du public" : "Rendre publique"}
                    </button>
                    <button
                      className="rounded-[7px] bg-[#F7F7F5] px-2 py-1 font-semibold text-[#6B6B6B] text-[10px]"
                      onClick={() => onMove?.(item.id, "up")}
                      type="button"
                    >
                      Monter
                    </button>
                    <button
                      className="rounded-[7px] bg-[#F7F7F5] px-2 py-1 font-semibold text-[#6B6B6B] text-[10px]"
                      onClick={() => onMove?.(item.id, "down")}
                      type="button"
                    >
                      Descendre
                    </button>
                  </div>
                )}
              </div>
              <button
                className="grid size-8 shrink-0 place-items-center rounded-[8px] text-[#C0564D] hover:bg-[#FCF4F3]"
                onClick={() => onDelete(item.id)}
                type="button"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

function MediaUploadButton({
  className,
  onAdd,
}: Readonly<{
  className?: string;
  onAdd: (dataUrl: string, fileInfo: Pick<ReconditioningMedia, "fileName" | "fileSize" | "mimeType">) => void;
}>) {
  const [busy, setBusy] = useState(false);
  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Format refusé : utilisez JPG, PNG ou WebP.");
      return;
    }
    if (file.size <= 0) {
      toast.error("Image vide refusée.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image trop lourde (10 Mo maximum).");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file, 1400, 0.74);
      onAdd(dataUrl, { fileName: file.name, fileSize: file.size, mimeType: file.type });
      toast.success("Photo sauvegardée.");
    } catch {
      toast.error("Upload impossible, réessayez.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <label
      className={cn(
        "inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-[#E8E8E5] bg-white px-3 font-semibold text-[#1A1916] text-[12px] transition hover:border-[#2A9D8F]/45",
        className,
      )}
    >
      <Plus className="size-4 text-[#2A9D8F]" />
      {busy ? "Traitement..." : "Ajouter une photo"}
      <input
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={busy}
        onChange={onFile}
        type="file"
      />
    </label>
  );
}

/* ═══════════════════════ Onglet Diagnostic final ═══════════════════════ */

type AtelierQaState = "Non testé" | "OK" | "À vérifier" | "Défaut final" | "Non applicable";
type AtelierQaItem =
  | { kind: "functional"; key: FunctionalTestKey; label: string }
  | { kind: "physical"; key: PhysicalCheckKey; label: string };

const ATELIER_QA_GROUPS: { title: string; items: AtelierQaItem[] }[] = [
  {
    title: "Écran & tactile",
    items: [
      { kind: "functional", key: "Écran", label: "Écran, tactile, luminosité" },
      { kind: "physical", key: "Écran fissuré", label: "Face avant" },
    ],
  },
  {
    title: "Batterie & charge",
    items: [
      { kind: "functional", key: "Batterie", label: "Batterie" },
      { kind: "functional", key: "Charge", label: "Charge filaire / connecteur" },
    ],
  },
  {
    title: "Réseau & connectivité",
    items: [
      { kind: "functional", key: "Réseau", label: "Réseau mobile" },
      { kind: "functional", key: "Wi-Fi", label: "Wi-Fi" },
      { kind: "functional", key: "Bluetooth", label: "Bluetooth" },
      { kind: "functional", key: "Capteurs", label: "GPS / capteurs" },
    ],
  },
  {
    title: "Caméras & audio",
    items: [
      { kind: "functional", key: "Caméras", label: "Caméras avant / arrière" },
      { kind: "functional", key: "Micro", label: "Micro" },
      { kind: "functional", key: "Haut-parleurs", label: "Haut-parleurs" },
      { kind: "functional", key: "Boutons", label: "Boutons / vibreur" },
    ],
  },
  {
    title: "Sécurité & identité",
    items: [
      { kind: "functional", key: "Face ID / Touch ID", label: "Face ID / Touch ID" },
      { kind: "physical", key: "Vis", label: "Visserie" },
      { kind: "physical", key: "Humidité", label: "Oxydation" },
    ],
  },
  {
    title: "État esthétique",
    items: [
      { kind: "physical", key: "Back glass", label: "Face arrière" },
      { kind: "physical", key: "Châssis", label: "Châssis" },
      { kind: "physical", key: "Rayures", label: "Rayures" },
      { kind: "physical", key: "Chocs", label: "Chocs" },
    ],
  },
];

const atelierQaState = (file: ReconditioningFile, item: AtelierQaItem): AtelierQaState => {
  const value = item.kind === "functional" ? file.functionalTests[item.key] : file.physicalChecks[item.key];
  if (!value) return "Non testé";
  if (value === "Défaut" || value === "Important") return "Défaut final";
  if (value === "Léger") return "À vérifier";
  return value;
};

const atelierFunctionalValue = (value: AtelierQaState): TestState | undefined => {
  if (value === "Non testé") return undefined;
  if (value === "Défaut final") return "Défaut";
  return value;
};

const atelierPhysicalValue = (value: AtelierQaState): PhysicalState | undefined => {
  if (value === "Non testé") return undefined;
  if (value === "À vérifier") return "Léger";
  if (value === "Défaut final") return "Important";
  return value === "OK" || value === "Non applicable" ? value : undefined;
};

const atelierGroupScore = (file: ReconditioningFile, items: AtelierQaItem[]) => ({
  done: items.filter((item) => atelierQaState(file, item) !== "Non testé").length,
  total: items.length,
});

function FinalDiagnosticTab({
  file,
  missing,
  onValidate,
}: Readonly<{ file: ReconditioningFile; missing: { label: string; done: boolean }[]; onValidate: () => void }>) {
  const updateFile = useReconditioningStore((s) => s.updateFile);
  const activeGrades = useRecondSettings((s) => s.settings.grades).filter((g) => g.active);
  const tested = calculateTestedPoints(file);
  const ready = canPublishPublicCertificate(file);
  const options: AtelierQaState[] = ["Non testé", "OK", "À vérifier", "Défaut final", "Non applicable"];
  const setQa = (item: AtelierQaItem, value: AtelierQaState) => {
    if (item.kind === "functional") {
      const next = { ...file.functionalTests };
      const normalized = atelierFunctionalValue(value);
      if (normalized) next[item.key] = normalized;
      else delete next[item.key];
      updateFile(file.id, { functionalTests: next });
      return;
    }
    const next = { ...file.physicalChecks };
    const normalized = atelierPhysicalValue(value);
    if (normalized) next[item.key] = normalized;
    else delete next[item.key];
    updateFile(file.id, { physicalChecks: next });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <SectionTitle title="Diagnostic final avant vente" />
            <p className="mt-0.5 text-[#6B6B6B] text-xs">
              Source unique des données publiques (QR client, étiquette, certificat).
            </p>
          </div>
          <span className="rounded-full border border-[#D7EFEA] bg-[#ECF8F4] px-2.5 py-1 font-semibold text-[#147065] text-[11px]">
            {tested.testedPoints} / {tested.totalPoints} points contrôlés
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {ATELIER_QA_GROUPS.map((group, index) => {
            const score = atelierGroupScore(file, group.items);
            return (
              <details
                className="rounded-[14px] border border-[#E8E8E5] bg-[#FAFAF8]"
                key={group.title}
                open={index === 0}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3">
                  <span className="font-semibold text-[#1A1916] text-sm">{group.title}</span>
                  <span className="rounded-full border border-[#E8E8E5] bg-white px-2.5 py-1 font-semibold text-[#6B6B6B] text-[11px]">
                    {score.done} / {score.total} validés
                  </span>
                </summary>
                <div className="space-y-2 border-[#E8E8E5] border-t bg-white p-3">
                  {group.items.map((item) => (
                    <SegmentedRow
                      key={`${item.kind}-${item.key}`}
                      label={item.label}
                      onChange={(value) => setQa(item, value as AtelierQaState)}
                      options={options}
                      value={atelierQaState(file, item)}
                    />
                  ))}
                </div>
              </details>
            );
          })}
        </div>
        <div className="mt-4">
          <FieldLabel label="Commentaire public (visible client)">
            <textarea
              className={cn(inputCls, "h-auto py-3")}
              onChange={(e) => updateFile(file.id, { testComment: e.target.value })}
              placeholder="Micro-rayures sur le châssis…"
              rows={2}
              value={file.testComment}
            />
          </FieldLabel>
        </div>
      </Panel>

      <Panel className="p-5">
        <SectionTitle title="Synthèse publique" />
        <div className="mt-4 space-y-3.5">
          <FieldLabel label="Grade final">
            <select
              className={selectCls}
              onChange={(e) => updateFile(file.id, { cosmeticGrade: e.target.value as CosmeticGrade })}
              value={file.cosmeticGrade}
            >
              <option value="">—</option>
              {activeGrades.map((g) => (
                <option key={g.grade} value={g.grade}>
                  Grade {g.grade} — {gradeLabel(g.grade)}
                </option>
              ))}
            </select>
          </FieldLabel>
          <FieldLabel label="Batterie finale (%)">
            <input
              className={inputCls}
              max={100}
              min={0}
              onChange={(e) =>
                updateFile(file.id, {
                  batteryHealth: e.target.value === "" ? null : Math.max(0, Math.min(100, safeNumber(e.target.value))),
                })
              }
              type="number"
              value={file.batteryHealth ?? ""}
            />
          </FieldLabel>
          <FieldLabel label="Garantie (mois)">
            <input
              className={inputCls}
              min={0}
              onChange={(e) =>
                updateFile(file.id, { warrantyMonths: Math.max(0, Math.round(safeNumber(e.target.value))) })
              }
              type="number"
              value={file.warrantyMonths}
            />
          </FieldLabel>
          <InfoLine
            label="Date de reconditionnement"
            value={file.reconditionedAt ? fmtDateTime(file.reconditionedAt) : "À la validation"}
          />
        </div>

        {missing.length > 0 && (
          <div className="mt-4 rounded-[12px] border border-[#FFD7B5] bg-[#FFF2E8] p-3.5">
            <p className="font-semibold text-[#C05621] text-[12.5px]">À compléter avant publication :</p>
            <ul className="mt-1.5 space-y-1">
              {missing.map((item) => (
                <li className="flex items-center gap-1.5 text-[#C05621] text-[12px]" key={item.label}>
                  <Circle className="size-1.5 fill-current" />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        <PrimaryButton
          className="mt-4 w-full disabled:cursor-not-allowed disabled:opacity-55"
          disabled={!ready}
          onClick={onValidate}
        >
          <ShieldCheck className="size-4" />
          Valider le diagnostic final
        </PrimaryButton>
        <p className="mt-2 text-[#9A9A95] text-[11.5px]">
          La validation publie le QR client avec uniquement l'état final — jamais les défauts d'achat réparés, ni les
          coûts, ni les pièces.
        </p>
      </Panel>
    </div>
  );
}

/* ═══════════════════════ Onglet Publication client ═══════════════════════ */

const PUBLICATION_GROUPS: Array<{
  title: string;
  items: Array<{ key: keyof ReconditioningPublicSettings; label: string }>;
}> = [
  {
    title: "Informations produit",
    items: [
      { key: "showModel", label: "Modèle" },
      { key: "showStorage", label: "Stockage" },
      { key: "showColor", label: "Couleur" },
      { key: "showReference", label: "Référence stock" },
      { key: "showMaskedImei", label: "IMEI masqué" },
    ],
  },
  {
    title: "Vente",
    items: [
      { key: "showPrice", label: "Prix" },
      { key: "showWarranty", label: "Garantie" },
      { key: "showReconditionedDate", label: "Date de reconditionnement" },
    ],
  },
  {
    title: "Qualité",
    items: [
      { key: "showGrade", label: "Grade final" },
      { key: "showBattery", label: "Batterie" },
      { key: "showFinalDiagnostic", label: "Diagnostic final" },
      { key: "showControlPoints", label: "Points de contrôle" },
    ],
  },
  {
    title: "Photos",
    items: [{ key: "showPublicPhotos", label: "Photos publiques" }],
  },
  {
    title: "Boutique",
    items: [
      { key: "showShopName", label: "Nom boutique" },
      { key: "showShopLogo", label: "Logo boutique" },
      { key: "showTrustText", label: "Texte de confiance" },
      { key: "showPoweredBy", label: "Footer Behar Tech Pro" },
    ],
  },
  {
    title: "Commentaire public",
    items: [{ key: "showPublicComment", label: "Afficher le commentaire public" }],
  },
];

function PublicationClientTab({
  certificateData,
  file,
  onGenerateQr,
  onOpenPublic,
  onPrintLabel,
}: Readonly<{
  certificateData: CertificateData;
  file: ReconditioningFile;
  onGenerateQr: () => void;
  onOpenPublic: () => void;
  onPrintLabel: () => void;
}>) {
  const updateFile = useReconditioningStore((s) => s.updateFile);
  const appendEvent = useReconditioningStore((s) => s.appendEvent);
  const settings = { ...DEFAULT_PUBLIC_SETTINGS, ...(file.publicSettings ?? {}) };
  const publicMedia = (file.media ?? []).filter((item) => item.visibility === "public_sale" && item.isPublic);
  const validation = [
    settings.showBattery && file.batteryHealth == null ? "Batterie activée mais batterie finale non renseignée" : "",
    settings.showPrice && file.prixVentePrevu <= 0 ? "Prix activé mais prix de vente manquant" : "",
    settings.showPublicPhotos && publicMedia.length === 0 && !file.photos.cote
      ? "Photos activées mais aucune photo publique"
      : "",
    settings.showFinalDiagnostic && certificateData.controls.length === 0
      ? "Diagnostic activé mais aucun test visible"
      : "",
  ].filter(Boolean);

  const updateSetting = (key: keyof ReconditioningPublicSettings, value: boolean) => {
    updateFile(file.id, { publicSettings: { ...settings, [key]: value } });
  };
  const toggleTestVisibility = (label: string, visible: boolean) => {
    updateFile(file.id, { publicTestVisibility: { ...(file.publicTestVisibility ?? {}), [label]: visible } });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <Panel className="p-5">
          <SectionTitle title="Publication client" />
          <p className="mt-1 text-[#6B6B6B] text-xs">
            Choisissez ce qui apparaît sur l'étiquette, le QR public et la page certificat client.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {PUBLICATION_GROUPS.map((group) => (
              <div className="rounded-[14px] border border-[#E8E8E5] bg-[#FAFAF8] p-3.5" key={group.title}>
                <p className="font-semibold text-[#1A1916] text-[13px]">{group.title}</p>
                <div className="mt-3 space-y-2">
                  {group.items.map((item) => (
                    <label
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-[10px] bg-white px-3 py-2 text-[12.5px]"
                      key={item.key}
                    >
                      <span className="text-[#1A1916]">{item.label}</span>
                      <input
                        checked={Boolean(settings[item.key])}
                        onChange={(e) => updateSetting(item.key, e.target.checked)}
                        type="checkbox"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <FieldLabel label="Commentaire public">
              <textarea
                className={cn(inputCls, "h-auto py-3")}
                onChange={(e) => updateFile(file.id, { testComment: e.target.value })}
                placeholder="Téléphone contrôlé et prêt à l'usage. Garantie 12 mois boutique."
                rows={3}
                value={file.testComment}
              />
            </FieldLabel>
          </div>
        </Panel>

        <Panel className="p-5">
          <SectionTitle title="Visibilité du diagnostic final" />
          <p className="mt-1 text-[#6B6B6B] text-xs">
            Chaque point peut être affiché ou masqué côté client. Les défauts fonctionnels masqués peuvent créer un
            litige.
          </p>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {certificateData.controls.map((control) => {
              const visible = file.publicTestVisibility?.[control.label] !== false;
              const risky = control.status === "à signaler" && !visible;
              return (
                <div
                  className={cn(
                    "rounded-[12px] border p-3",
                    risky ? "border-[#FFD7B5] bg-[#FFF2E8]" : "border-[#E8E8E5] bg-white",
                  )}
                  key={control.label}
                >
                  <label className="flex cursor-pointer items-center justify-between gap-3">
                    <span>
                      <span className="block font-semibold text-[#1A1916] text-[12.5px]">{control.label}</span>
                      <span className="text-[#6B6B6B] text-[11px]">{control.status}</span>
                    </span>
                    <input
                      checked={visible}
                      onChange={(e) => toggleTestVisibility(control.label, e.target.checked)}
                      type="checkbox"
                    />
                  </label>
                  {risky && (
                    <p className="mt-2 text-[#C05621] text-[11.5px]">
                      Attention : masquer un défaut fonctionnel peut créer un litige. Confirmez votre choix.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <Panel className="p-5">
          <SectionTitle title="Aperçu page client" />
          <div className="mt-4 rounded-[16px] border border-[#E8E8E5] bg-white p-4">
            {settings.showShopName && (
              <p className="font-semibold text-[#1A1916] text-sm">{certificateData.workshopName}</p>
            )}
            <p className="mt-2 font-semibold text-[#1A1916] text-lg">
              {settings.showModel
                ? [file.brand, file.model].filter(Boolean).join(" ") || "Appareil"
                : "Téléphone reconditionné"}
            </p>
            {(settings.showStorage || settings.showColor) && (
              <p className="text-[#6B6B6B] text-sm">
                {[settings.showStorage ? file.storage : "", settings.showColor ? file.color : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            <div className="mt-3 space-y-1 text-[12.5px]">
              {settings.showPrice && (
                <InfoLine
                  label="Prix"
                  value={file.prixVentePrevu > 0 ? formatEuro(file.prixVentePrevu) : "À compléter"}
                />
              )}
              {settings.showGrade && (
                <InfoLine
                  label="Grade"
                  value={
                    file.cosmeticGrade ? `${file.cosmeticGrade} — ${gradeLabel(file.cosmeticGrade)}` : "À compléter"
                  }
                />
              )}
              {settings.showBattery && (
                <InfoLine
                  label="Batterie"
                  value={file.batteryHealth != null ? `${file.batteryHealth} %` : "À compléter"}
                />
              )}
              {settings.showWarranty && <InfoLine label="Garantie" value={`${file.warrantyMonths} mois`} />}
              {settings.showControlPoints && (
                <InfoLine
                  label="Contrôles"
                  value={`${certificateData.validatedPoints} / ${certificateData.protocolPoints}`}
                />
              )}
              {settings.showReference && <InfoLine label="Réf." value={file.number} />}
            </div>
            {settings.showPublicComment && file.testComment && (
              <p className="mt-3 rounded-[12px] bg-[#FAFAF8] p-3 text-[#1A1916] text-sm">{file.testComment}</p>
            )}
          </div>
          {validation.length > 0 && (
            <div className="mt-4 rounded-[12px] border border-[#FFD7B5] bg-[#FFF2E8] p-3">
              <p className="font-semibold text-[#C05621] text-[12px]">À vérifier avant publication :</p>
              <ul className="mt-1 space-y-1 text-[#C05621] text-[11.5px]">
                {validation.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4 grid gap-2">
            <SecondaryButton onClick={() => appendEvent(file.id, "Paramètres de publication client enregistrés")}>
              Enregistrer publication
            </SecondaryButton>
            <PrimaryButton onClick={onGenerateQr}>
              <QrCode className="size-4" /> Générer QR public
            </PrimaryButton>
            <SecondaryButton onClick={onOpenPublic}>Ouvrir page publique</SecondaryButton>
            <SecondaryButton onClick={onPrintLabel}>Imprimer étiquette vente</SecondaryButton>
          </div>
        </Panel>
      </aside>
    </div>
  );
}

/* ═══════════════════════ Onglet Historique ═══════════════════════ */

function HistoryTab({ file }: Readonly<{ file: ReconditioningFile }>) {
  return (
    <Panel className="p-5">
      <SectionTitle title="Historique complet" />
      <EventsTable events={[...file.history].reverse()} />
    </Panel>
  );
}

function EventsTable({ events }: Readonly<{ events: ReconditioningFile["history"] }>) {
  if (!events.length) {
    return <p className="mt-4 text-[#9A9A95] text-[13px]">Aucun événement pour le moment.</p>;
  }
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="border-[#E8E8E5] border-b text-left text-[#6B6B6B] text-xs">
          <tr>
            <th className="px-2 py-2.5 font-semibold">Événement</th>
            <th className="px-2 py-2.5 font-semibold">Date</th>
            <th className="px-2 py-2.5 font-semibold">Par</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr className="border-[#F1F1EF] border-b last:border-0" key={event.id}>
              <td className="px-2 py-2.5 text-[#1A1916]">{event.title}</td>
              <td className="whitespace-nowrap px-2 py-2.5 text-[#6B6B6B]">{fmtDateTime(event.at)}</td>
              <td className="whitespace-nowrap px-2 py-2.5 text-[#6B6B6B]">{event.by || "Atelier"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════ Onglet Documents ═══════════════════════ */

function DocumentsTab({
  file,
  onOpenDoc,
  onPrintInternal,
  onSaleLabel,
  publicUrl,
}: Readonly<{
  file: ReconditioningFile;
  onOpenDoc: (doc: "certificat" | "sortie" | "etiquette" | "achat" | "interne") => void;
  onPrintInternal: () => void;
  onSaleLabel: () => void;
  publicUrl: string;
}>) {
  const internalUrl = publicAbsoluteUrl(
    `/dashboard/reconditionnement?tab=devices&device=${encodeURIComponent(file.id)}&internal=${encodeURIComponent(file.internalQrToken || file.number)}`,
  );
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Panel className="p-5">
        <SectionTitle title="Documents du dossier" />
        <p className="mt-1 text-[#6B6B6B] text-xs">
          Reçu de reprise, registre, étiquettes et certificat — imprimables à tout moment.
        </p>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          <DocCard
            description="Reçu remis au vendeur lors de la reprise."
            label="Reçu de reprise"
            onClick={() => onOpenDoc("achat")}
          />
          <DocCard
            description="Fiche d'entrée registre / livre de police."
            label="Fiche d'entrée registre"
            onClick={() => onOpenDoc("achat")}
          />
          <DocCard
            description={`Étiquette atelier avec QR interne${file.internalLabelPrintedAt ? " — imprimée" : ""}.`}
            label="Étiquette interne"
            onClick={onPrintInternal}
          />
          <DocCard
            description="Fiche technique interne du reconditionnement."
            label="Fiche reconditionnement"
            onClick={() => onOpenDoc("certificat")}
          />
          <DocCard
            description="Certificat de test final (points contrôlés)."
            label="Certificat de test"
            onClick={() => onOpenDoc("sortie")}
          />
          <DocCard
            description="Étiquette client avec prix, grade et QR public."
            label="Étiquette de vente"
            onClick={onSaleLabel}
          />
        </div>
        {file.status !== "Vendu" && (
          <p className="mt-4 text-[#9A9A96] text-[12px]">
            La facture / le reçu de vente sera disponible après la vente (mode comptoir).
          </p>
        )}
      </Panel>

      <div className="space-y-4">
        <Panel className="p-5">
          <SectionTitle title="QR interne" />
          <p className="mt-1 text-[#6B6B6B] text-xs">
            Sur l'étiquette atelier — ouvre la fiche interne, jamais la page client.
          </p>
          <QrBlock label="Fiche interne" url={internalUrl} />
        </Panel>
        <Panel className="p-5">
          <SectionTitle title="QR public client" />
          <p className="mt-1 text-[#6B6B6B] text-xs">
            {file.publicEnabled
              ? "Sur l'étiquette de vente — uniquement le diagnostic final et les infos publiques."
              : "Sera actif après validation du diagnostic final."}
          </p>
          {file.publicEnabled ? (
            <QrBlock label="Page publique" url={publicUrl} />
          ) : (
            <div className="mt-3 grid h-24 place-items-center rounded-[12px] border border-[#E8E8E5] border-dashed text-[#9A9A95] text-[12px]">
              QR non publié
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function DocCard({
  label,
  description,
  onClick,
}: Readonly<{ label: string; description: string; onClick: () => void }>) {
  return (
    <button
      className="flex items-start gap-3 rounded-[14px] border border-[#E8E8E5] bg-white p-3.5 text-left transition hover:border-[#2A9D8F]/45"
      onClick={onClick}
      type="button"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#ECF8F4] text-[#147065]">
        <Printer className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-[#1A1916] text-[13px]">{label}</span>
        <span className="mt-0.5 block text-[#6B6B6B] text-[11.5px]">{description}</span>
      </span>
    </button>
  );
}

function QrBlock({ url, label }: Readonly<{ url: string; label: string }>) {
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let alive = true;
    generateQrCodeDataUrl(url)
      .then((value) => alive && setQr(value))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [url]);
  return (
    <div className="mt-3 flex items-center gap-3 rounded-[12px] bg-[#FAFAF8] p-3">
      {qr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={`QR ${label}`} className="size-16 shrink-0 rounded-[8px] border border-[#E8E8E5] bg-white" src={qr} />
      ) : (
        <div className="size-16 shrink-0 animate-pulse rounded-[8px] border border-[#E8E8E5] bg-white" />
      )}
      <div className="min-w-0">
        <p className="font-semibold text-[#1A1916] text-[12px]">{label}</p>
        <div className="mt-1.5 flex gap-2">
          <button
            className="inline-flex h-7 items-center gap-1 rounded-[7px] border border-[#E8E8E5] bg-white px-2 font-semibold text-[#1A1916] text-[11px]"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              } catch {
                /* presse-papiers indisponible */
              }
            }}
            type="button"
          >
            {copied ? <CheckCircle2 className="size-3 text-[#147065]" /> : <Copy className="size-3" />}
            {copied ? "Copié" : "Copier le lien"}
          </button>
          <a
            className="inline-flex h-7 items-center gap-1 rounded-[7px] border border-[#E8E8E5] bg-white px-2 font-semibold text-[#1A1916] text-[11px]"
            href={url}
            rel="noopener noreferrer"
            target="_blank"
          >
            Ouvrir
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ Onglet Vente ═══════════════════════ */

function VenteTab({
  file,
  margin,
  real,
  checklist,
  publicUrl,
  onValidateFinal,
  onSaleLabel,
  onListed,
  onSold,
  onBlock,
}: Readonly<{
  file: ReconditioningFile;
  margin: ReturnType<typeof computeMargin>;
  real: ReturnType<typeof realMargin>;
  checklist: { label: string; done: boolean }[];
  publicUrl: string;
  onValidateFinal: () => void;
  onSaleLabel: () => void;
  onListed: () => void;
  onSold: () => void;
  onBlock: () => void;
}>) {
  const updateFile = useReconditioningStore((s) => s.updateFile);
  const ready = canPublishPublicCertificate(file);
  const saleStatus =
    file.status === "Vendu"
      ? "Vendu"
      : file.status === "En stock"
        ? "Mis en vente"
        : file.status === "Prêt à vendre"
          ? "Prêt à vendre"
          : "En préparation";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle title="Mise en vente" />
          <span className="inline-flex h-7 items-center rounded-[8px] border border-[#E8E8E5] bg-white px-2.5 font-semibold text-[#1A1916] text-[12px]">
            {saleStatus}
          </span>
        </div>
        <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
          <FieldLabel label="Prix vitrine (€)">
            <input
              className={inputCls}
              min={0}
              onChange={(e) => updateFile(file.id, { prixVentePrevu: Math.max(0, safeNumber(e.target.value)) })}
              type="number"
              value={file.prixVentePrevu || ""}
            />
          </FieldLabel>
          <FieldLabel label="Prix minimum (€)">
            <input
              className={inputCls}
              min={0}
              onChange={(e) => updateFile(file.id, { prixConseille: Math.max(0, safeNumber(e.target.value)) })}
              type="number"
              value={file.prixConseille || ""}
            />
          </FieldLabel>
          <FieldLabel label="Garantie (mois)">
            <input
              className={inputCls}
              min={0}
              onChange={(e) =>
                updateFile(file.id, { warrantyMonths: Math.max(0, Math.round(safeNumber(e.target.value))) })
              }
              type="number"
              value={file.warrantyMonths}
            />
          </FieldLabel>
          <FieldLabel label="Emplacement boutique">
            <input
              className={inputCls}
              onChange={(e) => updateFile(file.id, { saleLocation: e.target.value || undefined })}
              placeholder="Vitrine A, étagère 2…"
              value={file.saleLocation ?? ""}
            />
          </FieldLabel>
        </div>
        <div className="mt-4 grid gap-x-6 gap-y-1 border-[#F1F1EF] border-t pt-4 text-[13px] sm:grid-cols-2">
          <InfoLine
            label="Grade affiché"
            value={
              file.cosmeticGrade ? `Grade ${file.cosmeticGrade} · ${gradeLabel(file.cosmeticGrade)}` : "À compléter"
            }
          />
          <InfoLine
            label="Batterie affichée"
            value={file.batteryHealth != null ? `${file.batteryHealth} %` : "À compléter"}
          />
          <InfoLine label="Coût réel" value={formatEuro(margin.coutTotal)} />
          <InfoLine
            label="Marge estimée"
            value={
              <span
                className={margin.margeBrute >= 0 ? "font-semibold text-[#147065]" : "font-semibold text-[#B4342A]"}
              >
                {file.prixVentePrevu > 0
                  ? `${margin.margeBrute >= 0 ? "+" : ""}${formatEuro(margin.margeBrute)}`
                  : "À compléter"}
              </span>
            }
          />
          <InfoLine label="Étiquette de vente" value={file.saleLabelGeneratedAt ? "Générée" : "À générer"} />
          <InfoLine label="QR public" value={file.publicEnabled ? "Actif" : "Non publié"} />
        </div>
        {file.status === "Vendu" && (
          <p className="mt-4 rounded-[12px] bg-[#ECF8F4] px-3.5 py-2.5 font-semibold text-[#147065] text-[13px]">
            Vendu {formatEuro(file.soldPrice ?? 0)}
            {real ? ` — marge réelle ${real.margeReelle >= 0 ? "+" : ""}${formatEuro(real.margeReelle)}` : ""}
            {file.soldAt ? ` · ${fmtDateTime(file.soldAt)}` : ""}
          </p>
        )}
      </Panel>

      <div className="space-y-4">
        <Panel className="p-5">
          <SectionTitle title="Checklist avant vente" />
          <div className="mt-3 space-y-1.5">
            {checklist.map((item) => (
              <div className="flex items-center gap-2 text-[12.5px]" key={item.label}>
                {item.done ? (
                  <CheckCircle2 className="size-4 shrink-0 text-[#147065]" />
                ) : (
                  <AlertTriangle className="size-4 shrink-0 text-[#C05621]" />
                )}
                <span className={item.done ? "text-[#1A1916]" : "font-semibold text-[#C05621]"}>{item.label}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <SectionTitle title="Actions" />
          <div className="mt-4 space-y-2">
            {WORKING_STATUSES.includes(file.status) && (
              <PrimaryButton
                className="w-full disabled:cursor-not-allowed disabled:opacity-55"
                disabled={!ready}
                onClick={onValidateFinal}
              >
                <ShieldCheck className="size-4" />
                Marquer prêt à vendre
              </PrimaryButton>
            )}
            {file.status === "Prêt à vendre" && (
              <PrimaryButton className="w-full" onClick={onListed}>
                <Package className="size-4" />
                Marquer mis en vente
              </PrimaryButton>
            )}
            {(file.status === "Prêt à vendre" || file.status === "En stock") && (
              <PrimaryButton className="w-full" onClick={onSold}>
                <CheckCircle2 className="size-4" />
                Marquer vendu
              </PrimaryButton>
            )}
            <SecondaryButton className="w-full" onClick={onSaleLabel}>
              <Tag className="size-4" />
              {file.saleLabelGeneratedAt ? "Imprimer l'étiquette de vente" : "Générer l'étiquette de vente"}
            </SecondaryButton>
            <SecondaryButton className="w-full" onClick={() => window.open(publicUrl, "_blank", "noopener")}>
              <QrCode className="size-4" />
              Ouvrir la page publique
            </SecondaryButton>
            <SecondaryButton
              className="w-full"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(publicUrl);
                  toast.success("Lien public copié.");
                } catch {
                  toast.error("Presse-papiers indisponible.");
                }
              }}
            >
              <Copy className="size-4" />
              Copier le lien public
            </SecondaryButton>
            {file.status !== "Vendu" && file.status !== "Bloqué" && (
              <button
                className="w-full rounded-[12px] border border-[#F2D4D1] px-4 py-2.5 font-semibold text-[#B42318] text-sm transition hover:bg-[#FCF4F3]"
                onClick={onBlock}
                type="button"
              >
                Bloquer le dossier
              </button>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ═══════════════════════ Modales ═══════════════════════ */

function ModalShell({
  title,
  onClose,
  children,
}: Readonly<{ title: string; onClose: () => void; children: React.ReactNode }>) {
  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-[#1A1916]/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-[460px] rounded-[20px] border border-[#E8E8E5] bg-white p-6 shadow-[0_24px_60px_rgba(26,25,22,0.25)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-[#1A1916] text-lg">{title}</h3>
          <button
            className="grid size-9 place-items-center rounded-[10px] border border-[#E8E8E5] text-[#6B6B6B] transition hover:text-[#1A1916]"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SoldModal({
  defaultPrice,
  onConfirm,
  onClose,
}: Readonly<{ defaultPrice: number; onConfirm: (price: number) => void; onClose: () => void }>) {
  const [price, setPrice] = useState(String(defaultPrice || ""));
  return (
    <ModalShell onClose={onClose} title="Marquer vendu">
      <FieldLabel label="Prix de vente réel (€)">
        <input
          autoFocus
          className={inputCls}
          min={0}
          onChange={(e) => setPrice(e.target.value)}
          type="number"
          value={price}
        />
      </FieldLabel>
      <PrimaryButton
        className="mt-5 w-full"
        onClick={() => {
          const value = Number(price);
          if (Number.isFinite(value) && value >= 0) onConfirm(value);
        }}
      >
        <CheckCircle2 className="size-4" />
        Confirmer la vente
      </PrimaryButton>
    </ModalShell>
  );
}

function BlockModal({ onConfirm, onClose }: Readonly<{ onConfirm: (reason: string) => void; onClose: () => void }>) {
  const [reason, setReason] = useState("");
  return (
    <ModalShell onClose={onClose} title="Bloquer le dossier">
      <FieldLabel label="Raison du blocage">
        <input
          autoFocus
          className={inputCls}
          onChange={(e) => setReason(e.target.value)}
          placeholder="iCloud actif, carte mère HS, coût trop élevé…"
          value={reason}
        />
      </FieldLabel>
      <PrimaryButton className="mt-5 w-full" onClick={() => onConfirm(reason.trim())}>
        <AlertTriangle className="size-4" />
        Bloquer
      </PrimaryButton>
    </ModalShell>
  );
}

/* ═══════════════════════ Primitives locales ═══════════════════════ */

function SummaryCell({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-[12px] bg-[#FAFAF8] px-3 py-2.5">
      <p className="text-[#6B6B6B] text-[11px]">{label}</p>
      <p className="mt-0.5 truncate font-semibold text-[#1A1916] text-[13px]">{value}</p>
    </div>
  );
}

function SectionTitle({ title }: Readonly<{ title: string }>) {
  return <h3 className="font-semibold text-[#1A1916] text-[15px]">{title}</h3>;
}

function InfoLine({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="flex items-center justify-between gap-3 border-[#F7F7F5] border-b py-1 text-[13px] last:border-0">
      <span className="text-[#6B6B6B]">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-[#1A1916]">{value}</span>
    </div>
  );
}

function FinRow({
  label,
  value,
  tone,
  bold,
}: Readonly<{ label: string; value: string; tone?: "good" | "bad"; bold?: boolean }>) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className={cn("text-[#6B6B6B]", bold && "font-semibold text-[#1A1916]")}>{label}</span>
      <span
        className={cn(
          "font-semibold",
          tone === "good" ? "text-[#147065]" : tone === "bad" ? "text-[#B4342A]" : "text-[#1A1916]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ActionButton({ label, onClick, danger }: Readonly<{ label: string; onClick: () => void; danger?: boolean }>) {
  return (
    <button
      className={cn(
        "flex w-full items-center justify-between rounded-[12px] border px-4 py-2.5 text-left font-semibold text-sm transition",
        danger
          ? "border-[#F2D4D1] text-[#B42318] hover:bg-[#FCF4F3]"
          : "border-[#E8E8E5] text-[#1A1916] hover:border-[#2A9D8F]/45",
      )}
      onClick={onClick}
      type="button"
    >
      {label}
      <ChevronRight className="size-4 text-[#9A9A95]" />
    </button>
  );
}

function InternalInfo({ label, value }: Readonly<{ label: string; value?: string }>) {
  return (
    <div className="rounded-[10px] bg-[#F7F7F5] px-3 py-2">
      <p className="text-[#8A8A85] text-[11px]">{label}</p>
      <p className="mt-0.5 truncate font-semibold text-[#1A1916]">{value || "Non renseigné"}</p>
    </div>
  );
}

function FieldLabel({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <label className="block space-y-1.5">
      <span className="font-medium text-[#1A1916] text-[13px]">{label}</span>
      {children}
    </label>
  );
}

function SegmentedRow({
  label,
  options,
  value,
  onChange,
}: Readonly<{ label: string; options: readonly string[]; value?: string; onChange: (value: string) => void }>) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <span className="truncate text-[#6B6B6B] text-[12.5px]">{label}</span>
      <div className="inline-flex rounded-[9px] border border-[#E8E8E5] bg-white p-0.5">
        {options.map((option) => (
          <button
            className={cn(
              "h-7 whitespace-nowrap rounded-[7px] px-2 font-semibold text-[11px] transition",
              value === option ? "bg-[#2A9D8F] text-white" : "text-[#6B6B6B] hover:bg-[#F7F7F5] hover:text-[#1A1916]",
            )}
            key={option}
            onClick={() => onChange(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
