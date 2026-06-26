"use client";

import { useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  Copy,
  Cpu,
  ExternalLink,
  FileText,
  HelpCircle,
  Package,
  Plus,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Tag,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { getDeviceBrands, getModelsByBrand } from "@/data/deviceCatalog";
import { getMarketData } from "@/data/marketData";
import { formatEuro, useBeharStore } from "@/lib/behar-store";
import { generateQrCodeDataUrl, publicAbsoluteUrl } from "@/lib/public-access";
import { makeRelayToken } from "@/lib/photo-relay";
import { buildCertificateData, certificatePublicPath } from "@/lib/reconditioning-certificate";
import {
  computeMargin,
  computeTestSummary,
  FUNCTIONAL_TESTS,
  type FunctionalTestKey,
  gradeLabel,
  type PhysicalCheckKey,
  PHYSICAL_CHECKS,
  type PhysicalState,
  RECONDITIONING_STEPS,
  type ReconditioningFile,
  type ReconditioningSource,
  type ReconditioningStatus,
  type SaleChannel,
  type TestState,
  useReconditioningStore,
} from "@/lib/reconditioning-store";
import { cn } from "@/lib/utils";

import { BeharLogo } from "./behar-logo";
import { PhonePhotoCapture } from "./phone-photo-capture";
import { PhotoSlot } from "./photo-slot";
import { PrimaryButton, SecondaryButton } from "./primitives";

const STATUS_TONE: Record<ReconditioningStatus, string> = {
  Brouillon: "border-[#E8E8E5] bg-[#FFFFFF] text-[#6B6B6B]",
  Évaluation: "border-[#D7EFEA] bg-[#FFFFFF] text-[#167B70]",
  Tests: "border-[#D7EFEA] bg-[#FFFFFF] text-[#167B70]",
  Reconditionnement: "border-[#D7EFEA] bg-[#FFFFFF] text-[#167B70]",
  "Prêt à vendre": "border-[#CDEBE4] bg-[#FFFFFF] text-[#147065]",
  "En stock": "border-[#1F2937]/12 bg-[#FFFFFF] text-[#1F2937]",
};

function StatusPill({ status }: Readonly<{ status: ReconditioningStatus }>) {
  return (
    <span className={cn("inline-flex h-7 items-center rounded-[8px] border px-2.5 font-semibold text-[12px]", STATUS_TONE[status])}>
      {status}
    </span>
  );
}

function Field({ label, children, hint }: Readonly<{ label: string; children: React.ReactNode; hint?: string }>) {
  return (
    <label className="block space-y-1.5">
      <span className="font-medium text-[#1A1916] text-[13px]">{label}</span>
      {children}
      {hint && <span className="block text-[#6B6B6B] text-[11px]">{hint}</span>}
    </label>
  );
}

const inputCls =
  "h-11 w-full rounded-[12px] border border-[#E8E8E5] bg-white px-3.5 text-[#1A1916] text-sm outline-none transition focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10";
const selectCls = `${inputCls} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22 stroke=%22%236B6B6B%22><path stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%222%22 d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:18px] bg-[right_0.7rem_center] bg-no-repeat pr-9`;

/* ════════════════════════════ Workspace racine ════════════════════════════ */

export function ReconditioningWorkspace() {
  const files = useReconditioningStore((s) => s.files);
  const createFile = useReconditioningStore((s) => s.createFile);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const active = files.find((file) => file.id === activeId);

  if (!mounted) {
    return <div className="h-64 animate-pulse rounded-[18px] border border-[#E8E8E5] bg-white" />;
  }

  if (active) {
    return <ReconditioningWizard file={active} onExit={() => setActiveId(null)} />;
  }

  return (
    <ReconditioningBoard
      files={files}
      onCreate={() => setActiveId(createFile())}
      onOpen={(id) => setActiveId(id)}
    />
  );
}

/* ════════════════════════════ Board ════════════════════════════ */

function ReconditioningBoard({
  files,
  onCreate,
  onOpen,
}: Readonly<{ files: ReconditioningFile[]; onCreate: () => void; onOpen: (id: string) => void }>) {
  const stats = useMemo(() => {
    const enCours = files.filter((f) => !["Prêt à vendre", "En stock"].includes(f.status)).length;
    const prets = files.filter((f) => f.status === "Prêt à vendre").length;
    const stock = files.filter((f) => f.status === "En stock").length;
    const marge = files
      .filter((f) => f.status !== "En stock")
      .reduce((sum, f) => sum + Math.max(0, computeMargin(f).margeBrute), 0);
    return { enCours, prets, stock, marge };
  }, [files]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex h-9 items-center gap-2 self-start rounded-[10px] border border-[#D7EFEA] bg-[#FFFFFF] px-3 font-semibold text-[#167B70] text-[13px]">
          <Sparkles className="size-4" />
          Reconditionnement — flux dédié
        </div>
        <PrimaryButton className="h-11 px-5" onClick={onCreate}>
          <Plus className="size-4" />
          Nouveau dossier
        </PrimaryButton>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile icon={Cpu} label="Dossiers en cours" value={String(stats.enCours)} />
        <KpiTile icon={BadgeCheck} label="Prêts à vendre" value={String(stats.prets)} />
        <KpiTile icon={Package} label="En stock" value={String(stats.stock)} />
        <KpiTile icon={TrendingUp} label="Marge potentielle" value={formatEuro(stats.marge)} />
      </section>

      {files.length === 0 ? (
        <div className="grid place-items-center rounded-[18px] border border-dashed border-[#E8E8E5] bg-white px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-[14px] bg-[#FFFFFF] text-[#2A9D8F]">
            <Sparkles className="size-6" />
          </span>
          <p className="mt-4 font-semibold text-[#1A1916]">Aucun dossier de reconditionnement</p>
          <p className="mt-1 max-w-sm text-[#6B6B6B] text-sm">
            Créez un dossier pour évaluer un appareil racheté, contrôler son état, calculer la marge et générer un certificat.
          </p>
          <PrimaryButton className="mt-5 h-11 px-5" onClick={onCreate}>
            <Plus className="size-4" />
            Nouveau dossier
          </PrimaryButton>
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {files.map((file) => (
            <FileCard file={file} key={file.id} onOpen={() => onOpen(file.id)} />
          ))}
        </section>
      )}
    </div>
  );
}

function KpiTile({ icon: Icon, label, value }: Readonly<{ icon: typeof Cpu; label: string; value: string }>) {
  return (
    <div className="rounded-[16px] border border-[#E8E8E5] bg-white p-4 shadow-[0_1px_2px_rgba(26,25,22,0.035)]">
      <span className="grid size-10 place-items-center text-[#2A9D8F]">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-[#6B6B6B] text-xs">{label}</p>
      <p className="mt-1 font-semibold text-[#1A1916] text-2xl tracking-tight">{value}</p>
    </div>
  );
}

function FileCard({ file, onOpen }: Readonly<{ file: ReconditioningFile; onOpen: () => void }>) {
  const margin = computeMargin(file);
  const device = [file.brand, file.model].filter(Boolean).join(" ") || "Appareil à définir";
  const detail = [file.storage, file.color].filter(Boolean).join(" · ");
  return (
    <button
      className="block rounded-[16px] border border-[#E8E8E5] bg-white p-4 text-left shadow-[0_1px_2px_rgba(26,25,22,0.035)] transition hover:border-[#2A9D8F]/50 hover:shadow-[0_12px_26px_rgba(26,25,22,0.06)]"
      onClick={onOpen}
      type="button"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono font-semibold text-[#167B70] text-xs">{file.number}</p>
          <p className="mt-1 truncate font-semibold text-[#1A1916] text-sm">{device}</p>
          {detail && <p className="truncate text-[#6B6B6B] text-xs">{detail}</p>}
        </div>
        <StatusPill status={file.status} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Mini label="Achat" value={file.prixAchat ? formatEuro(file.prixAchat) : "—"} />
        <Mini label="Vente" value={file.prixVentePrevu ? formatEuro(file.prixVentePrevu) : "—"} />
        <Mini
          label="Marge"
          value={file.prixVentePrevu ? `${margin.margePct.toFixed(0)} %` : "—"}
          tone={margin.margeBrute > 0 ? "good" : "muted"}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-[#FFFFFF] border-t pt-3">
        <StepDots step={file.step} />
        <span className="text-[#6B6B6B] text-[11px]">Étape {Math.min(file.step, 5)}/5</span>
      </div>
    </button>
  );
}

function Mini({ label, value, tone }: Readonly<{ label: string; value: string; tone?: "good" | "muted" }>) {
  return (
    <div className="rounded-[10px] bg-[#FFFFFF] px-2 py-1.5">
      <p className="text-[#6B6B6B] text-[10px]">{label}</p>
      <p className={cn("truncate font-semibold text-xs", tone === "good" ? "text-[#147065]" : "text-[#1A1916]")}>{value}</p>
    </div>
  );
}

function StepDots({ step }: Readonly<{ step: number }>) {
  return (
    <div className="flex items-center gap-1.5">
      {RECONDITIONING_STEPS.map((s) => (
        <span
          key={s.id}
          className={cn("size-2 rounded-full", s.id <= step ? "bg-[#2A9D8F]" : "bg-[#FFFFFF]")}
        />
      ))}
    </div>
  );
}

/* ════════════════════════════ Wizard ════════════════════════════ */

function ReconditioningWizard({ file, onExit }: Readonly<{ file: ReconditioningFile; onExit: () => void }>) {
  const updateFile = useReconditioningStore((s) => s.updateFile);
  const [view, setView] = useState(Math.min(Math.max(file.step, 1), 5));

  const statusForStep = (step: number): ReconditioningStatus => {
    if (file.status === "En stock") return "En stock";
    if (file.status === "Prêt à vendre" && step >= 5) return "Prêt à vendre";
    if (step >= 4) return "Reconditionnement";
    if (step >= 3) return "Tests";
    if (step >= 2) return "Évaluation";
    return "Brouillon";
  };

  const goTo = (step: number) => {
    const clamped = Math.min(Math.max(step, 1), 5);
    setView(clamped);
    updateFile(file.id, { step: Math.max(file.step, clamped), status: statusForStep(clamped) });
  };

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#E8E8E5] bg-white px-3.5 font-medium text-[#1A1916] text-sm transition hover:bg-[#FFFFFF]"
            onClick={onExit}
            type="button"
          >
            <ArrowLeft className="size-4" />
            Atelier
          </button>
          <div>
            <p className="font-mono font-semibold text-[#167B70] text-xs">{file.number}</p>
            <h2 className="font-semibold text-[#1A1916] text-lg leading-tight tracking-tight">Reconditionnement</h2>
          </div>
        </div>
        <StatusPill status={file.status} />
      </div>

      {/* Stepper */}
      <Stepper view={view} onJump={(s) => (s <= file.step ? goTo(s) : null)} maxStep={file.step} />

      {/* Body */}
      {view === 1 && <StepDevice file={file} />}
      {view === 2 && <StepMargin file={file} />}
      {view === 3 && <StepTests file={file} />}
      {view === 4 && <StepM360 file={file} />}
      {view === 5 && <StepCertificate file={file} onExit={onExit} />}

      {/* Footer nav */}
      <div className="flex items-center justify-between gap-3 border-[#FFFFFF] border-t pt-4">
        <SecondaryButton className="h-11 px-5" onClick={() => (view === 1 ? onExit() : goTo(view - 1))}>
          <ArrowLeft className="size-4" />
          Retour
        </SecondaryButton>
        {view < 5 ? (
          <PrimaryButton className="h-11 px-5" onClick={() => goTo(view + 1)}>
            Suivant
            <ArrowRight className="size-4" />
          </PrimaryButton>
        ) : (
          <span className="text-[#6B6B6B] text-xs">Dernière étape — générez le certificat ci-dessus.</span>
        )}
      </div>
    </div>
  );
}

function Stepper({
  view,
  maxStep,
  onJump,
}: Readonly<{ view: number; maxStep: number; onJump: (step: number) => void }>) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-[16px] border border-[#E8E8E5] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(26,25,22,0.035)]">
      {RECONDITIONING_STEPS.map((step, index) => {
        const state = view === step.id ? "active" : step.id < view ? "done" : "todo";
        const reachable = step.id <= maxStep;
        return (
          <div className="flex min-w-0 flex-1 items-center" key={step.id}>
            <button
              className={cn("flex min-w-0 items-center gap-2.5 rounded-[10px] px-2 py-1 text-left transition", reachable && "hover:bg-[#FFFFFF]")}
              disabled={!reachable}
              onClick={() => onJump(step.id)}
              type="button"
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full font-semibold text-xs transition",
                  state === "active" && "bg-[#2A9D8F] text-white",
                  state === "done" && "bg-[#FFFFFF] text-[#147065]",
                  state === "todo" && "bg-[#FFFFFF] text-[#6B6B6B]",
                )}
              >
                {state === "done" ? <CheckCircle2 className="size-4" /> : step.id}
              </span>
              <span className="hidden min-w-0 md:block">
                <span className={cn("block truncate font-semibold text-[13px]", state === "active" ? "text-[#1A1916]" : "text-[#6B6B6B]")}>
                  {step.label}
                </span>
                <span className="block truncate text-[#6B6B6B] text-[11px]">{step.caption}</span>
              </span>
            </button>
            {index < RECONDITIONING_STEPS.length - 1 && <span className="mx-1 h-px flex-1 bg-[#FFFFFF]" />}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────── Layout helpers ─────────── */

function StepLayout({ children, aside }: Readonly<{ children: React.ReactNode; aside: React.ReactNode }>) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="rounded-[18px] border border-[#E8E8E5] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.035)] lg:p-6">{children}</div>
      <aside className="space-y-4">{aside}</aside>
    </div>
  );
}

function AsideCard({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div className="rounded-[18px] border border-[#E8E8E5] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.035)]">
      <h3 className="font-semibold text-[#1A1916]">{title}</h3>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function AsideRow({ icon: Icon, label, value }: Readonly<{ icon: typeof Tag; label: string; value: React.ReactNode }>) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 text-[#6B6B6B] text-[13px]">
        <Icon className="size-4 text-[#9A9A95]" />
        {label}
      </span>
      <span className="text-right font-semibold text-[#1A1916] text-[13px]">{value}</span>
    </div>
  );
}

function StepTitle({ title, subtitle }: Readonly<{ title: string; subtitle: string }>) {
  return (
    <div className="mb-5">
      <h3 className="font-semibold text-[#2A9D8F] text-base">{title}</h3>
      <p className="mt-0.5 text-[#6B6B6B] text-sm">{subtitle}</p>
    </div>
  );
}

/* ════════════════════════════ Étape 1 — Appareil reçu ════════════════════════════ */

const SOURCES: ReconditioningSource[] = ["Achat comptoir", "Rachat client", "Lot fournisseur", "Reprise"];

function StepDevice({ file }: Readonly<{ file: ReconditioningFile }>) {
  const update = useReconditioningStore((s) => s.updateFile);
  const setPhoto = useReconditioningStore((s) => s.setPhoto);
  const set = (patch: Partial<ReconditioningFile>) => update(file.id, patch);
  const brands = getDeviceBrands();
  const models = file.brand ? getModelsByBrand(file.brand) : [];
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureToken, setCaptureToken] = useState("");
  const openCapture = () => {
    setCaptureToken(makeRelayToken());
    setCaptureOpen(true);
  };

  return (
    <StepLayout
      aside={
        <AsideCard title="Dossier reconditionnement">
          <AsideRow icon={Tag} label="N° d'acquisition" value={file.number} />
          <AsideRow icon={Store} label="Source" value={file.source} />
          <AsideRow icon={Calendar} label="Date de réception" value={new Date(file.receivedAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })} />
          <AsideRow icon={Sparkles} label="Statut" value={<StatusPill status={file.status} />} />
          <p className="rounded-[12px] bg-[#FFFFFF] px-3 py-2.5 text-[#6B6B6B] text-xs">
            Le dossier se complète au fil des étapes.
          </p>
        </AsideCard>
      }
    >
      <StepTitle subtitle="Enregistrez les informations de l'appareil à reconditionner." title="Étape 1 — Appareil reçu" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Marque">
          <select className={selectCls} onChange={(e) => set({ brand: e.target.value, model: "" })} value={file.brand}>
            <option value="">Sélectionner une marque</option>
            {brands.map((brand) => (
              <option key={brand.brand} value={brand.brand}>
                {brand.brand}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Modèle">
          <select className={selectCls} disabled={!file.brand} onChange={(e) => set({ model: e.target.value })} value={file.model}>
            <option value="">{file.brand ? "Sélectionner un modèle" : "Choisir une marque d'abord"}</option>
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </Field>
        <Field label="IMEI / Série">
          <input className={inputCls} onChange={(e) => set({ imei: e.target.value })} placeholder="Saisir l'IMEI ou le numéro de série" value={file.imei} />
        </Field>
        <Field label="Capacité">
          <input className={inputCls} onChange={(e) => set({ storage: e.target.value })} placeholder="128 Go, 256 Go…" value={file.storage} />
        </Field>
        <Field label="Couleur">
          <input className={inputCls} onChange={(e) => set({ color: e.target.value })} placeholder="Minuit, Argent…" value={file.color} />
        </Field>
        <Field label="État cosmétique">
          <select className={selectCls} onChange={(e) => set({ cosmeticGrade: e.target.value as ReconditioningFile["cosmeticGrade"] })} value={file.cosmeticGrade}>
            <option value="">Sélectionner l'état</option>
            <option value="A">A — Très bon état</option>
            <option value="B">B — Bon état</option>
            <option value="C">C — État correct</option>
            <option value="D">D — État moyen</option>
          </select>
        </Field>
        <Field label="Source d'acquisition">
          <select className={selectCls} onChange={(e) => set({ source: e.target.value as ReconditioningSource })} value={file.source}>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-6 mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-[#1A1916] text-sm">Photos de l'appareil</p>
        <button
          className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-[#D7EFEA] bg-[#FFFFFF] px-3 font-semibold text-[#167B70] text-xs transition hover:bg-[#FFFFFF]"
          onClick={openCapture}
          type="button"
        >
          <Smartphone className="size-3.5" />
          Prendre avec mon téléphone
        </button>
      </div>
      <p className="mb-2 text-[#6B6B6B] text-[11px]">PC : importer un fichier · ou scanner le QR pour photographier depuis un téléphone.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          ["face", "Face"],
          ["dos", "Dos"],
          ["cote", "Côté"],
          ["defaut", "Défaut / détail"],
        ] as const).map(([key, label]) => (
          <PhotoSlot
            key={key}
            label={label}
            onChange={(dataUrl) => setPhoto(file.id, key, dataUrl)}
            value={file.photos[key]}
          />
        ))}
      </div>

      <div className="mt-6">
        <Field label="Observations visuelles">
          <textarea
            className={cn(inputCls, "h-auto py-3")}
            maxLength={500}
            onChange={(e) => set({ observations: e.target.value })}
            placeholder="Décrivez l'état général, les rayures, impacts, accessoires, etc."
            rows={4}
            value={file.observations}
          />
        </Field>
        <p className="mt-1 text-right text-[#6B6B6B] text-[11px]">{file.observations.length} / 500</p>
      </div>

      {captureOpen && (
        <PhonePhotoCapture
          deviceLabel={[file.brand, file.model].filter(Boolean).join(" ")}
          onClose={() => setCaptureOpen(false)}
          onPhoto={(slot, dataUrl) => setPhoto(file.id, slot as keyof ReconditioningFile["photos"], dataUrl)}
          token={captureToken}
        />
      )}
    </StepLayout>
  );
}

/* ════════════════════════════ Étape 2 — Modèle & marge ════════════════════════════ */

const CHANNELS: SaleChannel[] = ["Boutique physique", "Leboncoin", "Internet / Reconditionné"];

const normStr = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();

function StepMargin({ file }: Readonly<{ file: ReconditioningFile }>) {
  const update = useReconditioningStore((s) => s.updateFile);
  const addPart = useReconditioningStore((s) => s.addPart);
  const updatePart = useReconditioningStore((s) => s.updatePart);
  const removePart = useReconditioningStore((s) => s.removePart);
  const prefill = useReconditioningStore((s) => s.prefillFromMarket);
  const set = (patch: Partial<ReconditioningFile>) => update(file.id, patch);
  const margin = computeMargin(file);
  const market = getMarketData(`${file.brand} ${file.model}`) ?? getMarketData(file.model);

  const stockItems = useBeharStore((s) => s.stockItems);
  const stockParts = useMemo(() => {
    const active = stockItems.filter((item) => item.active !== false);
    const onlyParts = active.filter((item) => item.itemType === "part");
    return (onlyParts.length ? onlyParts : active).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [stockItems]);

  const model = file.model.trim();
  const { compatibleParts, otherParts } = useMemo(() => {
    if (!model) return { compatibleParts: [] as typeof stockParts, otherParts: stockParts };
    const m = normStr(model);
    const compatible = stockParts.filter(
      (item) =>
        normStr(item.name).includes(m) ||
        (item.compatibleModels ?? []).some((cm) => {
          const c = normStr(cm);
          return Boolean(c) && (c.includes(m) || m.includes(c));
        }),
    );
    const others = stockParts.filter((item) => !compatible.includes(item));
    return { compatibleParts: compatible, otherParts: others };
  }, [stockParts, model]);

  const applyStock = (partId: string, stockItemId: string, mode: "achat" | "vente") => {
    const item = stockItems.find((it) => it.id === stockItemId);
    if (!item) {
      updatePart(file.id, partId, { stockItemId: undefined, label: "", cost: 0 });
      return;
    }
    updatePart(file.id, partId, {
      stockItemId: item.id,
      label: item.name,
      cost: mode === "vente" ? item.salePrice : item.purchasePrice,
      priceMode: mode,
    });
  };

  return (
    <StepLayout
      aside={
        <AsideCard title="Calcul de marge">
          <AsideRow icon={Wallet} label="Coût total" value={formatEuro(margin.coutTotal)} />
          <AsideRow icon={Tag} label="Prix de vente prévu" value={formatEuro(file.prixVentePrevu)} />
          <div className="my-1 h-px bg-[#FFFFFF]" />
          <AsideRow icon={TrendingUp} label="Marge brute" value={<span className={margin.margeBrute >= 0 ? "text-[#147065]" : "text-[#C0564D]"}>{formatEuro(margin.margeBrute)}</span>} />
          <AsideRow icon={TrendingUp} label="Marge %" value={`${margin.margePct.toFixed(1)} %`} />
          <AsideRow icon={Calendar} label="Temps estimé de vente" value={file.delaiVenteEstime ? `${file.delaiVenteEstime} jours` : "—"} />
          <div className="pt-1">
            <p className="mb-1.5 text-[#6B6B6B] text-xs">Indicateur de rentabilité</p>
            <div className="h-2 overflow-hidden rounded-full bg-[#FFFFFF]">
              <div
                className={cn("h-full rounded-full transition-all", margin.margePct >= 22 ? "bg-[#2A9D8F]" : margin.margePct >= 12 ? "bg-[#FFFFFF]" : "bg-[#C0564D]")}
                style={{ width: `${Math.round(margin.rentabiliteScore * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-right font-semibold text-[#147065] text-xs">{margin.rentabilite}</p>
          </div>
        </AsideCard>
      }
    >
      <StepTitle subtitle="Références commerciales, prix d'achat, pièces à remplacer et objectifs de revente." title="Étape 2 — Modèle & marge" />

      <p className="mb-3 font-semibold text-[#1A1916] text-sm">Identification produit</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Marque">
          <input className={inputCls} onChange={(e) => set({ brand: e.target.value })} value={file.brand} />
        </Field>
        <Field label="Modèle">
          <input className={inputCls} onChange={(e) => set({ model: e.target.value })} value={file.model} />
        </Field>
        <Field label="Capacité">
          <input className={inputCls} onChange={(e) => set({ storage: e.target.value })} value={file.storage} />
        </Field>
        <Field label="Couleur">
          <input className={inputCls} onChange={(e) => set({ color: e.target.value })} value={file.color} />
        </Field>
        <Field label="Grade">
          <select className={selectCls} onChange={(e) => set({ cosmeticGrade: e.target.value as ReconditioningFile["cosmeticGrade"] })} value={file.cosmeticGrade}>
            <option value="">—</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </Field>
      </div>

      <div className="mt-5 mb-3 flex items-center justify-between gap-3">
        <p className="font-semibold text-[#1A1916] text-sm">Achat & revente</p>
        {market && (
          <button
            className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-[#D7EFEA] bg-[#FFFFFF] px-3 font-semibold text-[#167B70] text-xs transition hover:bg-[#FFFFFF]"
            onClick={() => prefill(file.id)}
            type="button"
          >
            <Sparkles className="size-3.5" />
            Pré-remplir depuis le marché
          </button>
        )}
      </div>
      {market && (
        <p className="mb-3 rounded-[10px] bg-[#FFFFFF] px-3 py-2 text-[#6B6B6B] text-xs">
          Marché {market.source === "reel" ? "(données réelles)" : "(estimé)"} : revente ≈ {formatEuro(market.prixInternet ?? market.prixMoyen)} ·
          délai ≈ {Math.round(market.joursMoyenVente)} j · demande {market.scoreDemande}/100
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Prix d'achat">
          <input className={inputCls} onChange={(e) => set({ prixAchat: Number(e.target.value) || 0 })} type="number" value={file.prixAchat || ""} />
        </Field>
        <Field label="Prix de vente prévu">
          <input className={inputCls} onChange={(e) => set({ prixVentePrevu: Number(e.target.value) || 0 })} type="number" value={file.prixVentePrevu || ""} />
        </Field>
        <Field label="Prix conseillé">
          <input className={inputCls} onChange={(e) => set({ prixConseille: Number(e.target.value) || 0 })} type="number" value={file.prixConseille || ""} />
        </Field>
        <Field label="Canal de vente">
          <select className={selectCls} onChange={(e) => set({ canalVente: e.target.value as SaleChannel })} value={file.canalVente}>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Délai de vente estimé (jours)">
          <input className={inputCls} onChange={(e) => set({ delaiVenteEstime: Number(e.target.value) || 0 })} type="number" value={file.delaiVenteEstime || ""} />
        </Field>
      </div>

      <div className="mt-6 mb-2 flex items-center justify-between">
        <p className="font-semibold text-[#1A1916] text-sm">Pièces & coûts</p>
        <button className="inline-flex items-center gap-1.5 text-[#2A9D8F] text-xs font-semibold hover:underline" onClick={() => addPart(file.id)} type="button">
          <Plus className="size-3.5" />
          Ajouter une pièce
        </button>
      </div>
      {!model && (
        <p className="mb-2 rounded-[10px] bg-[#FFFFFF] px-3 py-2 text-[#9A6B1B] text-xs">
          Renseignez d'abord le modèle ci-dessus pour afficher en priorité les pièces compatibles.
        </p>
      )}
      <div className="overflow-hidden rounded-[12px] border border-[#E8E8E5]">
        <div className="grid grid-cols-[minmax(0,1fr)_104px_60px_84px_32px] gap-2 bg-[#FFFFFF] px-3 py-2 font-semibold text-[#6B6B6B] text-[11px]">
          <span>Pièce (depuis le stock)</span>
          <span className="text-right">Coût</span>
          <span className="text-right">Qté</span>
          <span className="text-right">Total</span>
          <span />
        </div>
        {file.parts.length === 0 ? (
          <p className="px-3 py-4 text-center text-[#6B6B6B] text-xs">
            {stockParts.length
              ? "Aucune pièce. Cliquez « Ajouter une pièce » puis choisissez-la dans le stock."
              : "Aucune pièce en stock. Ajoutez des pièces dans le module Stock pour les sélectionner ici."}
          </p>
        ) : (
          file.parts.map((part) => {
            const mode = part.priceMode ?? "achat";
            const selected = stockItems.find((it) => it.id === part.stockItemId);
            return (
              <div className="grid grid-cols-[minmax(0,1fr)_104px_60px_84px_32px] items-start gap-2 border-[#FFFFFF] border-t px-3 py-2.5" key={part.id}>
                <div className="space-y-1.5">
                  <select
                    className="h-9 w-full rounded-[8px] border border-[#E8E8E5] bg-white px-2 text-sm outline-none focus:border-[#2A9D8F]"
                    onChange={(e) => applyStock(part.id, e.target.value, mode)}
                    value={part.stockItemId ?? ""}
                  >
                    <option value="">Choisir une pièce du stock…</option>
                    {model && compatibleParts.length > 0 && (
                      <optgroup label={`Compatibles ${model}`}>
                        {compatibleParts.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label={model && compatibleParts.length > 0 ? "Autres pièces" : "Toutes les pièces"}>
                      {(model ? otherParts : stockParts).map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  {part.stockItemId && (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex rounded-[7px] border border-[#E8E8E5] p-0.5">
                        {(["achat", "vente"] as const).map((m) => (
                          <button
                            className="h-6 rounded-[5px] px-2 font-semibold text-[#6B6B6B] text-[11px] transition data-[on=true]:bg-[#2A9D8F] data-[on=true]:text-white"
                            data-on={mode === m}
                            key={m}
                            onClick={() => applyStock(part.id, part.stockItemId as string, m)}
                            type="button"
                          >
                            {m === "achat" ? "Prix achat" : "Prix vente"}
                          </button>
                        ))}
                      </div>
                      {selected && (
                        <span className="text-[#9A9A95] text-[11px]">
                          stock {selected.stock} · {formatEuro(mode === "vente" ? selected.salePrice : selected.purchasePrice)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <input className="h-9 rounded-[8px] border border-[#E8E8E5] px-2 text-right text-sm outline-none focus:border-[#2A9D8F]" onChange={(e) => updatePart(file.id, part.id, { cost: Number(e.target.value) || 0 })} type="number" value={part.cost || ""} />
                <input className="h-9 rounded-[8px] border border-[#E8E8E5] px-2 text-right text-sm outline-none focus:border-[#2A9D8F]" onChange={(e) => updatePart(file.id, part.id, { quantity: Number(e.target.value) || 1 })} type="number" value={part.quantity} />
                <span className="flex h-9 items-center justify-end text-right font-semibold text-[#1A1916] text-sm tabular-nums">{formatEuro(part.cost * part.quantity)}</span>
                <span className="flex h-9 items-center justify-end">
                  <button className="grid size-8 place-items-center rounded-[8px] text-[#C0564D] transition hover:bg-[#FFFFFF]" onClick={() => removePart(file.id, part.id)} type="button">
                    <Trash2 className="size-4" />
                  </button>
                </span>
              </div>
            );
          })
        )}
      </div>
    </StepLayout>
  );
}

/* ════════════════════════════ Étape 3 — Tests & état ════════════════════════════ */

const TEST_OPTIONS: { value: TestState; tone: string }[] = [
  { value: "OK", tone: "data-[on=true]:bg-[#FFFFFF] data-[on=true]:text-[#147065] data-[on=true]:border-[#CDEBE4]" },
  { value: "À vérifier", tone: "data-[on=true]:bg-[#FFFFFF] data-[on=true]:text-[#9A6B1B] data-[on=true]:border-[#F0E0BC]" },
  { value: "Défaut", tone: "data-[on=true]:bg-[#FFFFFF] data-[on=true]:text-[#C0564D] data-[on=true]:border-[#F0D2CD]" },
];
const PHYSICAL_OPTIONS: { value: PhysicalState; tone: string }[] = [
  { value: "OK", tone: "data-[on=true]:bg-[#FFFFFF] data-[on=true]:text-[#147065] data-[on=true]:border-[#CDEBE4]" },
  { value: "Léger", tone: "data-[on=true]:bg-[#FFFFFF] data-[on=true]:text-[#9A6B1B] data-[on=true]:border-[#F0E0BC]" },
  { value: "Important", tone: "data-[on=true]:bg-[#FFFFFF] data-[on=true]:text-[#C0564D] data-[on=true]:border-[#F0D2CD]" },
];

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: Readonly<{ options: { value: T; tone: string }[]; value: T | undefined; onChange: (v: T) => void }>) {
  return (
    <div className="flex shrink-0 gap-1">
      {options.map((opt) => (
        <button
          className={cn(
            "h-7 rounded-[7px] border border-[#E8E8E5] bg-white px-2 font-semibold text-[#6B6B6B] text-[11px] transition hover:border-[#2A9D8F]/40",
            opt.tone,
          )}
          data-on={value === opt.value}
          key={opt.value}
          onClick={() => onChange(opt.value)}
          type="button"
        >
          {opt.value}
        </button>
      ))}
    </div>
  );
}

function StepTests({ file }: Readonly<{ file: ReconditioningFile }>) {
  const setTest = useReconditioningStore((s) => s.setTest);
  const setPhysical = useReconditioningStore((s) => s.setPhysical);
  const update = useReconditioningStore((s) => s.updateFile);
  const summary = computeTestSummary(file);

  const half = Math.ceil(FUNCTIONAL_TESTS.length / 2);
  const fnLeft = FUNCTIONAL_TESTS.slice(0, half);
  const fnRight = FUNCTIONAL_TESTS.slice(half);
  const phHalf = Math.ceil(PHYSICAL_CHECKS.length / 2);
  const phLeft = PHYSICAL_CHECKS.slice(0, phHalf);
  const phRight = PHYSICAL_CHECKS.slice(phHalf);

  return (
    <StepLayout
      aside={
        <AsideCard title="Diagnostic visuel & fonctionnel">
          <SummaryStat icon={CheckCircle2} label="Tests validés" tone="good" value={`${summary.okCount} / ${summary.totalTests}`} />
          <SummaryStat icon={AlertTriangle} label="Défauts détectés" tone={summary.defautCount + summary.importantCount > 0 ? "bad" : "muted"} value={String(summary.defautCount + summary.importantCount)} />
          <SummaryStat icon={HelpCircle} label="Points à vérifier" tone="warn" value={String(summary.aVerifierCount)} />
          <div className="rounded-[12px] bg-[#FFFFFF] px-3 py-2.5">
            <p className="text-[#6B6B6B] text-xs">Grade estimé</p>
            <p className="mt-0.5 font-semibold text-[#1A1916]">
              {summary.grade} — {gradeLabel(summary.grade)}
            </p>
          </div>
        </AsideCard>
      }
    >
      <StepTitle subtitle="Vérifiez ce qui fonctionne et ce qui ne fonctionne pas sur l'appareil." title="Étape 3 — Tests & état" />

      <p className="mb-2 font-semibold text-[#1A1916] text-sm">Fonctions principales</p>
      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {[fnLeft, fnRight].map((group, gi) => (
          <div key={gi}>
            {group.map((key) => (
              <div className="flex items-center justify-between gap-2 border-[#E8E8E5] border-b py-2" key={key}>
                <span className="truncate text-[#1A1916] text-[13px]">{key}</span>
                <Segmented<TestState> onChange={(v) => setTest(file.id, key as FunctionalTestKey, v)} options={TEST_OPTIONS} value={file.functionalTests[key as FunctionalTestKey]} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <p className="mt-5 mb-2 font-semibold text-[#1A1916] text-sm">État physique</p>
      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {[phLeft, phRight].map((group, gi) => (
          <div key={gi}>
            {group.map((key) => (
              <div className="flex items-center justify-between gap-2 border-[#E8E8E5] border-b py-2" key={key}>
                <span className="truncate text-[#1A1916] text-[13px]">{key}</span>
                <Segmented<PhysicalState> onChange={(v) => setPhysical(file.id, key as PhysicalCheckKey, v)} options={PHYSICAL_OPTIONS} value={file.physicalChecks[key as PhysicalCheckKey]} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-5">
        <Field label="Commentaires atelier">
          <textarea className={cn(inputCls, "h-auto py-3")} onChange={(e) => update(file.id, { testComment: e.target.value })} placeholder="Observations, remarques ou précisions pour le dossier." rows={3} value={file.testComment} />
        </Field>
      </div>
    </StepLayout>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  tone,
}: Readonly<{ icon: typeof CheckCircle2; label: string; value: string; tone: "good" | "bad" | "warn" | "muted" }>) {
  const toneCls =
    tone === "good" ? "text-[#147065]" : tone === "bad" ? "text-[#C0564D]" : tone === "warn" ? "text-[#9A6B1B]" : "text-[#6B6B6B]";
  return (
    <div className="flex items-center gap-3 rounded-[12px] border border-[#FFFFFF] px-3 py-2.5">
      <Icon className={cn("size-5", toneCls)} />
      <div className="min-w-0 flex-1">
        <p className="text-[#6B6B6B] text-xs">{label}</p>
      </div>
      <p className={cn("font-semibold text-sm tabular-nums", toneCls)}>{value}</p>
    </div>
  );
}

/* ════════════════════════════ Étape 4 — Diagnostic M360 ════════════════════════════ */

function StepM360({ file }: Readonly<{ file: ReconditioningFile }>) {
  const update = useReconditioningStore((s) => s.updateFile);
  const summary = computeTestSummary(file);
  const risks = [
    ...FUNCTIONAL_TESTS.filter((k) => file.functionalTests[k] === "Défaut").map((k) => `${k} : défaut signalé`),
    ...PHYSICAL_CHECKS.filter((k) => file.physicalChecks[k] === "Important").map((k) => `${k} : dommage important`),
  ];

  return (
    <StepLayout
      aside={
        <AsideCard title="Synthèse M360">
          <AsideRow icon={Cpu} label="Santé batterie" value={file.batteryHealth != null ? `${file.batteryHealth} %` : "—"} />
          <AsideRow icon={ShieldCheck} label="Grade" value={`${summary.grade} — ${gradeLabel(summary.grade)}`} />
          <div
            className={cn(
              "flex items-center gap-2 rounded-[12px] border px-3 py-2.5 text-sm font-semibold",
              summary.riskDetected ? "border-[#F0D2CD] bg-[#FFFFFF] text-[#C0564D]" : "border-[#CDEBE4] bg-[#FFFFFF] text-[#147065]",
            )}
          >
            {summary.riskDetected ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />}
            {summary.riskDetected ? `${risks.length} risque(s) détecté(s)` : "Aucun risque détecté"}
          </div>
        </AsideCard>
      }
    >
      <StepTitle subtitle="Diagnostic assisté : synthèse automatique des contrôles et points de vigilance." title="Étape 4 — Diagnostic M360" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field hint="Indiquée par l'outil de diagnostic ou estimée." label="Santé de la batterie (%)">
          <input className={inputCls} max={100} min={0} onChange={(e) => update(file.id, { batteryHealth: e.target.value === "" ? null : Number(e.target.value) })} type="number" value={file.batteryHealth ?? ""} />
        </Field>
        <div className="flex items-end">
          <div className={cn("flex w-full items-center gap-2 rounded-[12px] border px-3 py-3 text-sm font-semibold", summary.riskDetected ? "border-[#F0D2CD] bg-[#FFFFFF] text-[#C0564D]" : "border-[#CDEBE4] bg-[#FFFFFF] text-[#147065]")}>
            {summary.riskDetected ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />}
            {summary.riskDetected ? "Vérifications recommandées avant remise en vente" : "Conforme — aucun risque détecté"}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[14px] border border-[#E8E8E5] bg-[#FFFFFF] p-4">
        <p className="mb-2 font-semibold text-[#1A1916] text-sm">Points de vigilance</p>
        {risks.length === 0 ? (
          <p className="text-[#6B6B6B] text-sm">Aucun défaut bloquant relevé pendant les tests. L'appareil peut suivre le reconditionnement standard.</p>
        ) : (
          <ul className="space-y-1.5">
            {risks.map((risk) => (
              <li className="flex items-center gap-2 text-[#1A1916] text-sm" key={risk}>
                <span className="size-1.5 rounded-full bg-[#C0564D]" />
                {risk}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5">
        <Field label="Notes de diagnostic">
          <textarea className={cn(inputCls, "h-auto py-3")} onChange={(e) => update(file.id, { m360Notes: e.target.value })} placeholder="Conclusion du diagnostic assisté, interventions prévues…" rows={3} value={file.m360Notes} />
        </Field>
      </div>
    </StepLayout>
  );
}

/* ════════════════════════════ Étape 5 — Certificat & sortie ════════════════════════════ */

function StepCertificate({ file, onExit }: Readonly<{ file: ReconditioningFile; onExit: () => void }>) {
  const generate = useReconditioningStore((s) => s.generateCertificate);
  const publish = useReconditioningStore((s) => s.publishToStock);
  const margin = computeMargin(file);
  const summary = computeTestSummary(file);
  const device = [file.brand, file.model, file.storage, file.color].filter(Boolean).join(" ") || "Appareil";

  const certData = useMemo(() => buildCertificateData(file), [file]);
  const clientUrl = useMemo(() => publicAbsoluteUrl(certificatePublicPath(certData)), [certData]);
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    generateQrCodeDataUrl(clientUrl)
      .then((value) => alive && setQr(value))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [clientUrl]);

  const openDoc = (doc: "certificat" | "sortie" | "etiquette") =>
    window.open(`/print/reconditionnement?id=${encodeURIComponent(file.id)}&doc=${doc}`, "_blank", "noopener");

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(clientUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* presse-papiers indisponible */
    }
  };

  return (
    <StepLayout
      aside={
        <AsideCard title="Sortie">
          <div className={cn("flex items-center gap-2 rounded-[12px] border px-3 py-2.5 font-semibold text-sm", file.publishedToStock ? "border-[#1F2937]/12 bg-[#FFFFFF] text-[#1F2937]" : "border-[#CDEBE4] bg-[#FFFFFF] text-[#147065]")}>
            <CheckCircle2 className="size-4" />
            {file.publishedToStock ? "En stock boutique" : "Prêt à vendre"}
          </div>
          <AsideRow icon={Package} label="Destination" value="Stock boutique" />
          <AsideRow icon={Store} label="Boutique" value={file.destinationShop} />
          <AsideRow icon={Tag} label="Prix final" value={formatEuro(file.prixVentePrevu)} />
          <AsideRow icon={Calendar} label="Mise en vente" value={new Date().toLocaleDateString("fr-FR", { dateStyle: "medium" })} />
          <AsideRow icon={ShieldCheck} label="Garantie" value={`${file.warrantyMonths} mois`} />
          <AsideRow icon={Tag} label="Étiquette stock" value={file.number} />
          <div className="rounded-[12px] border border-[#CDEBE4] bg-[#FFFFFF] px-3 py-2.5 text-[#147065] text-xs">
            Dossier complet et conforme. Vous pouvez générer le certificat.
          </div>
          {!file.certificateGenerated ? (
            <PrimaryButton className="w-full" onClick={() => generate(file.id)}>
              <BadgeCheck className="size-4" />
              Générer le certificat
            </PrimaryButton>
          ) : (
            <div className="space-y-2">
              <PrimaryButton className="w-full" disabled={file.publishedToStock} onClick={() => publish(file.id)}>
                <Package className="size-4" />
                {file.publishedToStock ? "Publié en stock" : "Publier en stock"}
              </PrimaryButton>
              <SecondaryButton className="w-full" onClick={onExit}>
                Terminer
              </SecondaryButton>
            </div>
          )}
        </AsideCard>
      }
    >
      <StepTitle subtitle="Vérifiez le récapitulatif du dossier et générez le certificat de reconditionnement." title="Étape 5 — Certificat & sortie" />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Résumé */}
        <div className="rounded-[14px] border border-[#E8E8E5] p-4">
          <p className="mb-3 font-semibold text-[#1A1916] text-sm">Résumé du dossier</p>
          <div className="space-y-2 text-sm">
            <SummaryLine label="Appareil" value={device} />
            <SummaryLine label="IMEI / Série" value={file.imei || "—"} />
            <SummaryLine label="Grade" value={`${summary.grade} — ${gradeLabel(summary.grade)}`} />
            <SummaryLine label="Prix d'achat" value={formatEuro(file.prixAchat)} />
            <SummaryLine label="Prix de vente" value={formatEuro(file.prixVentePrevu)} />
            <SummaryLine label="Marge" value={`${formatEuro(margin.margeBrute)} (${margin.margePct.toFixed(1)} %)`} valueClass={margin.margeBrute >= 0 ? "text-[#147065]" : "text-[#C0564D]"} />
            <SummaryLine label="Tests validés" value={`${summary.okCount} / ${summary.totalTests}`} />
            <SummaryLine label="Défauts restants" value={String(summary.defautCount + summary.importantCount)} />
            <SummaryLine label="Diagnostic M360" value={summary.riskDetected ? "Risques signalés" : "Aucun risque détecté"} valueClass={summary.riskDetected ? "text-[#C0564D]" : "text-[#147065]"} />
            <SummaryLine label="Date" value={new Date().toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })} />
          </div>
        </div>

        {/* Certificat & QR client */}
        <div className="rounded-[14px] border border-[#E8E8E5] bg-white p-4">
          <div className="flex items-start justify-between">
            <BeharLogo size="sm" />
            <span className="text-right text-[#6B6B6B] text-[10px] uppercase tracking-wide">
              Certificat
              <span className="mt-0.5 block font-mono font-semibold text-[#1A1916] text-[11px] tracking-normal normal-case">{file.number}</span>
            </span>
          </div>

          <div className="mt-4 flex items-center gap-4">
            {qr ? (
              <img alt="QR certificat" className="size-24 shrink-0 rounded-[10px] border border-[#E8E8E5]" src={qr} />
            ) : (
              <div className="size-24 shrink-0 animate-pulse rounded-[10px] border border-[#E8E8E5] bg-[#FFFFFF]" />
            )}
            <div className="min-w-0">
              <p className="font-semibold text-[#1A1916] text-sm">Page certificat client</p>
              <p className="mt-0.5 text-[#6B6B6B] text-xs">Le client scanne ce QR pour consulter le détail du contrôle.</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button
                  className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-[#E8E8E5] bg-white px-2.5 font-semibold text-[#1A1916] text-xs transition hover:bg-[#FFFFFF]"
                  onClick={copyLink}
                  type="button"
                >
                  {copied ? <CheckCircle2 className="size-3.5 text-[#147065]" /> : <Copy className="size-3.5" />}
                  {copied ? "Lien copié" : "Copier le lien"}
                </button>
                <a
                  className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-[#E8E8E5] bg-white px-2.5 font-semibold text-[#1A1916] text-xs transition hover:bg-[#FFFFFF]"
                  href={clientUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Ouvrir
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <DocButton icon={FileText} label="Certificat" onClick={() => openDoc("certificat")} />
            <DocButton icon={FileText} label="Bon de sortie" onClick={() => openDoc("sortie")} />
            <DocButton icon={Tag} label="Étiquette" onClick={() => openDoc("etiquette")} />
          </div>

          {file.certificateGenerated && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-[8px] bg-[#FFFFFF] px-2.5 py-1 font-semibold text-[#147065] text-[11px]">
              <CheckCircle2 className="size-3.5" />
              Certificat généré
            </div>
          )}
        </div>
      </div>
    </StepLayout>
  );
}

function SummaryLine({ label, value, valueClass }: Readonly<{ label: string; value: string; valueClass?: string }>) {
  return (
    <div className="flex items-center justify-between gap-3 border-[#E8E8E5] border-b py-1 last:border-0">
      <span className="text-[#6B6B6B]">{label}</span>
      <span className={cn("text-right font-semibold text-[#1A1916]", valueClass)}>{value}</span>
    </div>
  );
}

function DocButton({ icon: Icon, label, onClick }: Readonly<{ icon: typeof FileText; label: string; onClick: () => void }>) {
  return (
    <button
      className="flex flex-col items-center gap-1.5 rounded-[11px] border border-[#E8E8E5] bg-white px-2 py-3 font-semibold text-[#1A1916] text-xs transition hover:border-[#2A9D8F]/45 hover:bg-[#FFFFFF]"
      onClick={onClick}
      type="button"
    >
      <Icon className="size-4 text-[#2A9D8F]" />
      {label}
    </button>
  );
}
