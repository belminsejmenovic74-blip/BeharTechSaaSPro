"use client";

// reconditioning-workspace — mode Atelier, « File de reconditionnement atelier ».
// Même logique que la file de réparation : recherche + filtres avec compteurs +
// cartes appareil + fiche à onglets (ReconditioningAtelierFile).
// Statuts terrain : À diagnostiquer → À reconditionner → En attente pièce → En test final
// → Prêt à vendre → Mis en vente. Les pièces ajoutées sont retirées du stock automatiquement.

import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  LayoutGrid,
  List,
  Package,
  Search,
  ShieldCheck,
  Smartphone,
  Tag,
  Truck,
  Wrench,
  X,
} from "lucide-react";

import {
  initialProblemLabel,
  ReconditioningAtelierFile,
  RecondStatusPill,
  sourceLabel,
} from "@/components/behar/reconditioning-atelier-file";
import { PrimaryButton, SecondaryButton } from "@/components/behar/primitives";
import { getDeviceBrands, getModelsByBrand } from "@/data/deviceCatalog";
import { formatEuro, useBeharStore } from "@/lib/behar-store";
import { useRecondSettings } from "@/lib/recond-settings";
import { resolveReconditioningDeviceImage } from "@/lib/reconditioning-certificate";
import {
  computeMargin,
  type CosmeticGrade,
  realMargin,
  type ReconditioningFile,
  type ReconditioningStatus,
  useReconditioningStore,
} from "@/lib/reconditioning-store";
import { cn } from "@/lib/utils";

/* ─────────── Style tokens ─────────── */

const inputCls =
  "h-11 w-full rounded-[12px] border border-[#E8E8E5] bg-white px-3.5 text-[#1A1916] text-sm outline-none transition focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10";
const selectCls = `${inputCls} appearance-none pr-9`;

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <label className="block space-y-1.5">
      <span className="font-medium text-[#1A1916] text-[13px]">{label}</span>
      {children}
    </label>
  );
}

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

const fmtDateTime = (iso?: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return `${d.toLocaleDateString("fr-FR")} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
};

/* ════════════════════════════ Racine ════════════════════════════ */

export function ReconditioningWorkspace() {
  const files = useReconditioningStore((s) => s.files);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const active = files.find((file) => file.id === activeId);

  if (!mounted) {
    return <div className="h-64 animate-pulse rounded-[18px] border border-[#E8E8E5] bg-white" />;
  }

  if (active) {
    return <ReconditioningAtelierFile fileId={active.id} onBack={() => setActiveId(null)} />;
  }

  return (
    <>
      <Board files={files} onAddSupplier={() => setSupplierOpen(true)} onOpen={setActiveId} />
      {supplierOpen && <SupplierModal onClose={() => setSupplierOpen(false)} onOpenFile={setActiveId} />}
    </>
  );
}

/* ════════════════════════════ File des appareils ════════════════════════════ */

type BoardFilter = "encours" | ReconditioningStatus | "termines";
type BoardSort = "recent" | "ancien" | "marge" | "achat";
type BoardLayout = "grid" | "list";

const FILTERS: { key: BoardFilter; label: string }[] = [
  { key: "encours", label: "En cours" },
  { key: "Évaluation", label: "À diagnostiquer" },
  { key: "Reconditionnement", label: "À reconditionner" },
  { key: "En attente pièce", label: "En attente pièce" },
  { key: "Tests", label: "En test final" },
  { key: "Prêt à vendre", label: "Prêt à vendre" },
  { key: "En stock", label: "Mis en vente" },
  { key: "termines", label: "Terminés" },
];

const ACTIVE_STATUSES: ReconditioningStatus[] = [
  "Brouillon",
  "Acheté",
  "Évaluation",
  "Reconditionnement",
  "En attente pièce",
  "Tests",
  "Prêt à vendre",
  "En stock",
];

const SORTS: { key: BoardSort; label: string }[] = [
  { key: "recent", label: "Date d'achat (récent)" },
  { key: "ancien", label: "Date d'achat (ancien)" },
  { key: "marge", label: "Marge estimée" },
  { key: "achat", label: "Prix d'achat" },
];

function Board({
  files,
  onOpen,
  onAddSupplier,
}: Readonly<{ files: ReconditioningFile[]; onOpen: (id: string) => void; onAddSupplier: () => void }>) {
  const [filter, setFilter] = useState<BoardFilter>("encours");
  const [sort, setSort] = useState<BoardSort>("recent");
  const [layout, setLayout] = useState<BoardLayout>("grid");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    let list = files;
    if (filter === "encours") list = files.filter((f) => ACTIVE_STATUSES.includes(f.status));
    else if (filter === "termines") list = files.filter((f) => !ACTIVE_STATUSES.includes(f.status));
    else if (filter === "Évaluation")
      list = files.filter((f) => f.status === "Évaluation" || f.status === "Brouillon" || f.status === "Acheté");
    else list = files.filter((f) => f.status === filter);
    const q = norm(query);
    if (q) {
      list = list.filter((f) =>
        norm(
          `${f.brand} ${f.model} ${f.number} ${f.imei} ${f.serial} ${f.customerName ?? ""} ${f.supplierName ?? ""} ${f.source}`,
        ).includes(q),
      );
    }
    const byDate = (f: ReconditioningFile) => new Date(f.receivedAt || f.createdAt).getTime() || 0;
    return [...list].sort((a, b) => {
      switch (sort) {
        case "ancien":
          return byDate(a) - byDate(b);
        case "marge":
          return computeMargin(b).margeBrute - computeMargin(a).margeBrute;
        case "achat":
          return (b.prixAchat || 0) - (a.prixAchat || 0);
        default:
          return byDate(b) - byDate(a);
      }
    });
  }, [files, filter, query, sort]);

  const countFor = (key: BoardFilter) => {
    if (key === "encours") return files.filter((f) => ACTIVE_STATUSES.includes(f.status)).length;
    if (key === "termines") return files.filter((f) => !ACTIVE_STATUSES.includes(f.status)).length;
    if (key === "Évaluation")
      return files.filter((f) => f.status === "Évaluation" || f.status === "Brouillon" || f.status === "Acheté").length;
    return files.filter((f) => f.status === key).length;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-[380px]">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#9A9A95]" />
          <input
            className={cn(inputCls, "pl-10")}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher (référence, modèle, IMEI, source…)"
            value={query}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 text-[#6B6B6B] text-[12px] sm:inline-flex">
            <Smartphone className="size-3.5" />
            Achat client : mode Comptoir → « Acheter un téléphone »
          </span>
          <PrimaryButton className="h-11 px-4" onClick={onAddSupplier}>
            <Truck className="size-4" />
            Téléphone fournisseur
          </PrimaryButton>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const count = countFor(f.key);
          return (
            <button
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-[10px] border px-3 font-semibold text-[13px] transition",
                filter === f.key
                  ? "border-[#2A9D8F] bg-[#ECF8F4] text-[#147065]"
                  : "border-[#E8E8E5] bg-white text-[#6B6B6B] hover:text-[#1A1916]",
              )}
              key={f.key}
              onClick={() => setFilter(f.key)}
              type="button"
            >
              {f.label}
              <span
                className={cn(
                  "rounded-[6px] px-1.5 text-[11px]",
                  filter === f.key ? "bg-white text-[#147065]" : "bg-[#F7F7F5] text-[#8A8A85]",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-[#1A1916] text-[14px]">
          {visible.length} appareil{visible.length > 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          <select
            className="h-10 cursor-pointer appearance-none rounded-[10px] border border-[#E8E8E5] bg-white px-3 pr-8 font-medium text-[#1A1916] text-[13px] outline-none focus:border-[#2A9D8F]/60"
            onChange={(e) => setSort(e.target.value as BoardSort)}
            value={sort}
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                Trier par : {s.label}
              </option>
            ))}
          </select>
          <div className="inline-flex h-10 items-center rounded-[10px] border border-[#E8E8E5] bg-white p-1">
            {(
              [
                ["grid", LayoutGrid],
                ["list", List],
              ] as const
            ).map(([key, Icon]) => (
              <button
                className={cn(
                  "grid h-8 w-9 place-items-center rounded-[7px] transition",
                  layout === key ? "bg-[#ECF8F4] text-[#147065]" : "text-[#6B6B6B] hover:text-[#1A1916]",
                )}
                key={key}
                onClick={() => setLayout(key)}
                title={key === "grid" ? "Vue grille" : "Vue liste"}
                type="button"
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="grid place-items-center rounded-[18px] border border-dashed border-[#E8E8E5] bg-white px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-[14px] bg-[#ECF8F4] text-[#2A9D8F]">
            <Smartphone className="size-6" />
          </span>
          <p className="mt-4 font-semibold text-[#1A1916]">Aucun téléphone ici</p>
          <p className="mt-1 max-w-md text-[#6B6B6B] text-sm">
            Achetez un téléphone au comptoir (« Acheter un téléphone ») ou ajoutez un téléphone fournisseur : il
            apparaîtra ici pour être reconditionné.
          </p>
        </div>
      ) : layout === "grid" ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((file) => (
            <PhoneCard file={file} key={file.id} onOpen={() => onOpen(file.id)} />
          ))}
        </section>
      ) : (
        <PhoneTable files={visible} onOpen={onOpen} />
      )}

      {visible.length > 0 && (
        <p className="text-[#8A8A85] text-[12.5px]">
          Affichage 1 à {visible.length} sur {visible.length}
        </p>
      )}
    </div>
  );
}

/* ════════════════════════════ Carte appareil ════════════════════════════ */

function PhoneCard({ file, onOpen }: Readonly<{ file: ReconditioningFile; onOpen: () => void }>) {
  const margin = computeMargin(file);
  const real = realMargin(file);
  const device = [file.brand, file.model].filter(Boolean).join(" ") || "Appareil à définir";
  const detail = [file.storage, file.color, sourceLabel(file)].filter(Boolean).join(" · ");
  const image = resolveReconditioningDeviceImage(file);
  const marginValue = real ? real.margeReelle : margin.margeBrute;
  const hasMargin = real != null || file.prixVentePrevu > 0;

  return (
    <article className="flex flex-col rounded-[16px] border border-[#E8E8E5] bg-white p-4 shadow-[0_1px_2px_rgba(26,25,22,0.035)] transition hover:border-[#2A9D8F]/50 hover:shadow-[0_12px_26px_rgba(26,25,22,0.06)]">
      <div className="flex items-start gap-3">
        <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-[12px] border border-[#E8E8E5] bg-[#FAFAF8] text-[#6B6B6B]">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={device} className="size-full object-contain p-1" src={image} />
          ) : (
            <Package className="size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold text-[#1A1916] text-[15px]">{file.number}</p>
            <RecondStatusPill status={file.status} />
          </div>
          <p className="mt-0.5 truncate font-semibold text-[#1A1916] text-[16px]">{device}</p>
          <p className="truncate text-[#6B6B6B] text-[12.5px]">{detail || "Stockage / couleur à compléter"}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 border-[#F1F1EF] border-t pt-3 text-[12.5px]">
        <div>
          <p className="text-[#6B6B6B] text-[11.5px]">Date d'achat</p>
          <p className="mt-0.5 font-semibold text-[#1A1916]">{fmtDateTime(file.receivedAt || file.createdAt)}</p>
        </div>
        <div>
          <p className="text-[#6B6B6B] text-[11.5px]">Technicien</p>
          <p className="mt-0.5 truncate font-semibold text-[#1A1916]">{file.technician || "Atelier principal"}</p>
        </div>
      </div>

      <div className="mt-3 border-[#F1F1EF] border-t pt-3 text-[12.5px]">
        <p className="text-[#6B6B6B] text-[11.5px]">Diagnostic initial</p>
        <p className="mt-0.5 truncate font-semibold text-[#1A1916]">{initialProblemLabel(file)}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 border-[#F1F1EF] border-t pt-3 text-[12.5px]">
        <div>
          <p className="text-[#6B6B6B] text-[11.5px]">Achat</p>
          <p className="mt-0.5 font-semibold text-[#1A1916]">
            {file.prixAchat > 0 ? formatEuro(file.prixAchat) : "À compléter"}
          </p>
        </div>
        <div>
          <p className="text-[#6B6B6B] text-[11.5px]">{real ? "Marge réelle" : "Marge estimée"}</p>
          <p className={cn("mt-0.5 font-semibold", marginValue >= 0 ? "text-[#147065]" : "text-[#B4342A]")}>
            {hasMargin ? `${marginValue >= 0 ? "+" : ""}${formatEuro(marginValue)}` : "À compléter"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-[#F1F1EF] border-t pt-3">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px]">
          <Tag className={cn("size-3.5 shrink-0", file.internalLabelPrintedAt ? "text-[#147065]" : "text-[#9A9A95]")} />
          <span className={cn("truncate", file.internalLabelPrintedAt ? "text-[#147065]" : "text-[#6B6B6B]")}>
            {file.internalLabelPrintedAt
              ? "Étiquette interne imprimée"
              : file.internalLabelGeneratedAt
                ? "Étiquette interne générée"
                : "Étiquette interne à générer"}
          </span>
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              file.internalLabelPrintedAt ? "bg-[#147065]" : "bg-[#D8B44A]",
            )}
          />
        </span>
        <SecondaryButton className="h-9 shrink-0 px-3.5 text-[12.5px]" onClick={onOpen}>
          Ouvrir
          <ChevronRight className="size-3.5" />
        </SecondaryButton>
      </div>
    </article>
  );
}

/* ════════════════════════════ Vue liste ════════════════════════════ */

function PhoneTable({ files, onOpen }: Readonly<{ files: ReconditioningFile[]; onOpen: (id: string) => void }>) {
  return (
    <div className="overflow-x-auto rounded-[16px] border border-[#E8E8E5] bg-white shadow-[0_1px_2px_rgba(26,25,22,0.035)]">
      <table className="w-full min-w-[960px] text-sm">
        <thead className="border-[#E8E8E5] border-b text-left text-[#6B6B6B] text-xs">
          <tr>
            <th className="px-4 py-3 font-semibold">Référence</th>
            <th className="px-4 py-3 font-semibold">Appareil</th>
            <th className="px-4 py-3 font-semibold">Source</th>
            <th className="px-4 py-3 font-semibold">Date d'achat</th>
            <th className="px-4 py-3 font-semibold">Diagnostic initial</th>
            <th className="px-4 py-3 font-semibold">Statut</th>
            <th className="px-4 py-3 text-right font-semibold">Achat</th>
            <th className="px-4 py-3 text-right font-semibold">Marge</th>
            <th className="px-2 py-3" />
          </tr>
        </thead>
        <tbody>
          {files.map((file) => {
            const margin = computeMargin(file);
            const real = realMargin(file);
            const marginValue = real ? real.margeReelle : margin.margeBrute;
            const hasMargin = real != null || file.prixVentePrevu > 0;
            return (
              <tr className="border-[#F1F1EF] border-b transition last:border-0 hover:bg-[#FAFAF8]" key={file.id}>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#1A1916]">{file.number}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-[#1A1916]">
                    {[file.brand, file.model].filter(Boolean).join(" ") || "Appareil à définir"}
                  </p>
                  <p className="text-[#9A9A95] text-[11.5px]">
                    {[file.storage, file.color].filter(Boolean).join(" · ")}
                  </p>
                </td>
                <td className="px-4 py-3 text-[#6B6B6B]">{sourceLabel(file)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-[#6B6B6B]">
                  {fmtDateTime(file.receivedAt || file.createdAt)}
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-[#6B6B6B]">{initialProblemLabel(file)}</td>
                <td className="px-4 py-3">
                  <RecondStatusPill status={file.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[#1A1916] tabular-nums">
                  {file.prixAchat > 0 ? formatEuro(file.prixAchat) : "—"}
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums",
                    marginValue >= 0 ? "text-[#147065]" : "text-[#B4342A]",
                  )}
                >
                  {hasMargin ? `${marginValue >= 0 ? "+" : ""}${formatEuro(marginValue)}` : "—"}
                </td>
                <td className="px-2 py-3">
                  <SecondaryButton className="h-8 px-3 text-[12px]" onClick={() => onOpen(file.id)}>
                    Ouvrir
                  </SecondaryButton>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ════════════════════════════ Modales ════════════════════════════ */

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
        className="w-full max-w-[520px] rounded-[20px] border border-[#E8E8E5] bg-white p-6 shadow-[0_24px_60px_rgba(26,25,22,0.25)]"
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

/* ════════════════════════════ Téléphone fournisseur ════════════════════════════ */

function SupplierModal({ onClose, onOpenFile }: Readonly<{ onClose: () => void; onOpenFile: (id: string) => void }>) {
  const settings = useRecondSettings((s) => s.settings);
  const createFile = useReconditioningStore((s) => s.createFile);
  const updateFile = useReconditioningStore((s) => s.updateFile);
  const appendEvent = useReconditioningStore((s) => s.appendEvent);
  const addPurchase = useBeharStore((s) => s.addPurchase);
  const activeGrades = settings.grades.filter((g) => g.active);

  const brands = getDeviceBrands();
  const [mode, setMode] = useState<"ready" | "work" | null>(null);
  const [form, setForm] = useState({
    brand: "",
    model: "",
    storage: "",
    color: "",
    imei: "",
    buyPrice: "",
    salePrice: "",
    grade: "A" as CosmeticGrade,
    battery: "",
    warranty: String(settings.defaultWarrantyMonths),
    supplier: "",
    invoice: "",
    workNote: "",
  });
  const [doneId, setDoneId] = useState<string | null>(null);
  const patch = (p: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...p }));
  const models = form.brand ? getModelsByBrand(form.brand) : [];

  const submit = () => {
    if (!form.model.trim()) {
      window.alert("Indiquez au minimum le modèle.");
      return;
    }
    const id = createFile();
    const buyPrice = Math.max(0, Number(form.buyPrice) || 0);
    const label = [form.brand, form.model, form.storage].filter(Boolean).join(" ") || "Téléphone fournisseur";
    updateFile(id, {
      brand: form.brand,
      model: form.model,
      storage: form.storage,
      color: form.color,
      imei: form.imei,
      source: "Lot fournisseur",
      supplierName: form.supplier.trim() || undefined,
      supplierInvoice: form.invoice.trim() || undefined,
      prixAchat: buyPrice,
      prixVentePrevu: Math.max(0, Number(form.salePrice) || 0),
      warrantyMonths: Math.max(0, Number(form.warranty) || 0),
      observations: form.workNote.trim(),
      step: 5,
      purchaseLogged: true,
    });
    addPurchase({
      kind: "telephone",
      source: "Reconditionnement",
      label,
      reference: form.imei.trim() || undefined,
      supplier: form.supplier.trim() || "Fournisseur non renseigné",
      invoiceNumber: form.invoice.trim() || undefined,
      quantity: 1,
      unitCost: buyPrice,
      reconditioningFileId: id,
    });
    if (mode === "ready") {
      updateFile(id, {
        cosmeticGrade: form.grade,
        batteryHealth: form.battery === "" ? null : Math.max(0, Math.min(100, Number(form.battery) || 0)),
        prixVentePrevu: Math.max(0, Number(form.salePrice) || 0),
        status: "Tests",
      });
      appendEvent(
        id,
        `Ajouté depuis fournisseur${form.supplier.trim() ? ` ${form.supplier.trim()}` : ""} — contrôle final requis`,
      );
    } else {
      updateFile(id, { status: "Reconditionnement" });
      appendEvent(
        id,
        `Ajouté depuis fournisseur${form.supplier.trim() ? ` ${form.supplier.trim()}` : ""} — à reconditionner`,
      );
    }
    setDoneId(id);
  };

  if (doneId) {
    return (
      <ModalShell onClose={onClose} title="Téléphone ajouté">
        <div className="text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#ECF8F4] text-[#147065]">
            <CheckCircle2 className="size-6" />
          </span>
          <p className="mt-3 text-[#6B6B6B] text-sm">
            {mode === "ready"
              ? "Le téléphone est en test final — le contrôle qualité débloquera l'étiquette et le QR."
              : "Le téléphone est dans la liste « À reconditionner »."}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {mode === "ready" ? (
              <SecondaryButton
                className="w-full"
                onClick={() => {
                  onClose();
                  onOpenFile(doneId);
                }}
              >
                <ShieldCheck className="size-4" />
                Contrôle final
              </SecondaryButton>
            ) : (
              <SecondaryButton
                className="w-full"
                onClick={() => {
                  onClose();
                  onOpenFile(doneId);
                }}
              >
                <Wrench className="size-4" />
                Ouvrir la fiche
              </SecondaryButton>
            )}
            <PrimaryButton className="w-full" onClick={onClose}>
              Terminer
            </PrimaryButton>
          </div>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} title="Ajouter un téléphone fournisseur">
      {mode === null ? (
        <div className="space-y-3">
          <button
            className="flex w-full items-start gap-3 rounded-[14px] border border-[#E8E8E5] bg-white p-4 text-left transition hover:border-[#2A9D8F]/50"
            onClick={() => setMode("ready")}
            type="button"
          >
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#147065]" />
            <span>
              <span className="block font-semibold text-[#1A1916] text-sm">Déjà reconditionné / prêt à vendre</span>
              <span className="mt-0.5 block text-[#6B6B6B] text-[12px]">
                Données publiques préremplies, contrôle qualité obligatoire avant QR.
              </span>
            </span>
          </button>
          <button
            className="flex w-full items-start gap-3 rounded-[14px] border border-[#E8E8E5] bg-white p-4 text-left transition hover:border-[#2A9D8F]/50"
            onClick={() => setMode("work")}
            type="button"
          >
            <Wrench className="mt-0.5 size-5 shrink-0 text-[#9A6B1B]" />
            <span>
              <span className="block font-semibold text-[#1A1916] text-sm">À reconditionner</span>
              <span className="mt-0.5 block text-[#6B6B6B] text-[12px]">
                Le téléphone part dans l'atelier, section « À reconditionner ».
              </span>
            </span>
          </button>
        </div>
      ) : (
        <div className="max-h-[65svh] overflow-y-auto pr-1">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Marque">
              <select
                className={selectCls}
                onChange={(e) => patch({ brand: e.target.value, model: "" })}
                value={form.brand}
              >
                <option value="">Sélectionner</option>
                {brands.map((b) => (
                  <option key={b.brand} value={b.brand}>
                    {b.brand}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Modèle">
              {models.length ? (
                <select className={selectCls} onChange={(e) => patch({ model: e.target.value })} value={form.model}>
                  <option value="">Sélectionner</option>
                  {models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <input className={inputCls} onChange={(e) => patch({ model: e.target.value })} value={form.model} />
              )}
            </Field>
            <Field label="Capacité">
              <input
                className={inputCls}
                onChange={(e) => patch({ storage: e.target.value })}
                placeholder="128 Go"
                value={form.storage}
              />
            </Field>
            <Field label="Couleur">
              <input className={inputCls} onChange={(e) => patch({ color: e.target.value })} value={form.color} />
            </Field>
            <Field label="IMEI / Série">
              <input className={inputCls} onChange={(e) => patch({ imei: e.target.value })} value={form.imei} />
            </Field>
            <Field label="Prix d'achat">
              <input
                className={inputCls}
                min={0}
                onChange={(e) => patch({ buyPrice: e.target.value })}
                type="number"
                value={form.buyPrice}
              />
            </Field>
            <Field label="Prix de vente prévu">
              <input
                className={inputCls}
                min={0}
                onChange={(e) => patch({ salePrice: e.target.value })}
                type="number"
                value={form.salePrice}
              />
            </Field>
            {mode === "ready" && (
              <>
                <Field label="Grade">
                  <select
                    className={selectCls}
                    onChange={(e) => patch({ grade: e.target.value as CosmeticGrade })}
                    value={form.grade}
                  >
                    {activeGrades.map((g) => (
                      <option key={g.grade} value={g.grade}>
                        Grade {g.grade}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Batterie (%)">
                  <input
                    className={inputCls}
                    max={100}
                    min={0}
                    onChange={(e) => patch({ battery: e.target.value })}
                    type="number"
                    value={form.battery}
                  />
                </Field>
                <Field label="Garantie (mois)">
                  <input
                    className={inputCls}
                    min={0}
                    onChange={(e) => patch({ warranty: e.target.value })}
                    type="number"
                    value={form.warranty}
                  />
                </Field>
              </>
            )}
            <Field label="Fournisseur">
              <input
                className={inputCls}
                onChange={(e) => patch({ supplier: e.target.value })}
                placeholder="Nom du fournisseur"
                value={form.supplier}
              />
            </Field>
            <Field label="Facture fournisseur (optionnel)">
              <input
                className={inputCls}
                onChange={(e) => patch({ invoice: e.target.value })}
                placeholder="N° de facture"
                value={form.invoice}
              />
            </Field>
            {mode === "work" && (
              <div className="sm:col-span-2">
                <Field label="Travaux prévus / remarques">
                  <input
                    className={inputCls}
                    onChange={(e) => patch({ workNote: e.target.value })}
                    placeholder="Écran à remplacer…"
                    value={form.workNote}
                  />
                </Field>
              </div>
            )}
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <SecondaryButton onClick={() => setMode(null)}>
              <ArrowLeft className="size-4" />
              Retour
            </SecondaryButton>
            <PrimaryButton onClick={submit}>
              {mode === "ready" ? <Package className="size-4" /> : <Wrench className="size-4" />}
              {mode === "ready" ? "Ajouter au stock vente" : "Envoyer en reconditionnement"}
            </PrimaryButton>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
