"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { endOfMonth, endOfYear, format, startOfMonth, startOfYear, subMonths } from "date-fns";
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Download,
  FileArchive,
  FileSpreadsheet,
  FileText,
  History,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Panel, PrimaryButton, SecondaryButton } from "@/components/behar/primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { downloadBlobFile } from "@/lib/download-file.client";
import type {
  AccountingExportFilters,
  AccountingExportFormat,
  AccountingExportLine,
  AccountingExportSummary,
  AccountingExportWarning,
  AccountingShop,
} from "@/lib/accounting-export/core";
import { useBeharStore } from "@/lib/behar-store";
import { cn } from "@/lib/utils";

type Preview = {
  lines: AccountingExportLine[];
  summary: AccountingExportSummary;
  warnings: AccountingExportWarning[];
  vatRates: number[];
  shops: AccountingShop[];
};

type ExportHistory = {
  id: string;
  shop_name: string;
  period_start: string;
  period_end: string;
  generated_by_name: string;
  file_type: AccountingExportFormat;
  file_name: string;
  file_size_bytes: number;
  invoice_count: number;
  created_at: string;
};

const emptySummary: AccountingExportSummary = {
  invoiceCount: 0,
  creditNoteCount: 0,
  billedRevenueExcludingTax: 0,
  vatAmount: 0,
  billedRevenueIncludingTax: 0,
  creditNotesIncludingTax: 0,
};

const formatOptions: Array<{
  value: AccountingExportFormat;
  title: string;
  description: string;
  icon: typeof FileText;
}> = [
  { value: "csv", title: "CSV Excel", description: "Tableau UTF-8 séparé par point-virgule", icon: FileText },
  { value: "xlsx", title: "Excel XLSX", description: "Classeur avec détail et résumé", icon: FileSpreadsheet },
  { value: "zip", title: "Archive ZIP", description: "CSV et PDF des factures", icon: FileArchive },
];

function dateValue(value: Date) {
  return format(value, "yyyy-MM-dd");
}

function initialFilters(): AccountingExportFilters {
  const now = new Date();
  return {
    startDate: dateValue(startOfMonth(now)),
    endDate: dateValue(endOfMonth(now)),
    shopId: "all",
    vatRate: "all",
  };
}

function frenchDate(value: string) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} Ko`;
  return `${(value / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

function responseFilename(response: Response, fallback: string) {
  const disposition = response.headers.get("content-disposition") || "";
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  if (encoded) return decodeURIComponent(encoded);
  return /filename="([^"]+)"/i.exec(disposition)?.[1] || fallback;
}

async function responseError(response: Response) {
  const body = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
  return body?.message || body?.error || `Erreur ${response.status}`;
}

function Kpi({ label, value, hint }: Readonly<{ label: string; value: string; hint?: string }>) {
  return (
    <div className="rounded-[14px] border border-[#E4E7EC] bg-[#FCFCFD] p-4">
      <p className="text-[#667085] text-xs font-medium">{label}</p>
      <p className="mt-2 font-semibold text-[#101828] text-xl tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-[#98A2B3] text-[11px]">{hint}</p>}
    </div>
  );
}

export function AccountingExportWorkspace() {
  const workshopId = useBeharStore((state) => state.cloudSync?.workshopId || "");
  const licenseKey = useBeharStore((state) => state.licenseKey || "");
  const currentUser = useBeharStore((state) => state.currentUser);
  const currency = useBeharStore((state) => state.workshopSettings.currency || "EUR");
  const canExport = useBeharStore((state) => state.hasPermission("canExportData"));
  const [filters, setFilters] = useState<AccountingExportFilters>(initialFilters);
  const [preview, setPreview] = useState<Preview>({
    lines: [],
    summary: emptySummary,
    warnings: [],
    vatRates: [],
    shops: [],
  });
  const [history, setHistory] = useState<ExportHistory[]>([]);
  const [formatType, setFormatType] = useState<AccountingExportFormat>("xlsx");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pageError, setPageError] = useState("");

  const money = useMemo(
    () => new Intl.NumberFormat(currency === "CHF" ? "fr-CH" : "fr-FR", { style: "currency", currency }),
    [currency],
  );

  const callApi = useCallback(
    (payload: Record<string, unknown>) =>
      fetch("/api/behar/accounting-exports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workshopId, licenseKey, ...payload }),
      }),
    [licenseKey, workshopId],
  );

  const loadPreview = useCallback(async () => {
    if (!(workshopId && licenseKey && canExport)) return;
    setLoadingPreview(true);
    setPageError("");
    try {
      const response = await callApi({ operation: "preview", filters });
      if (!response.ok) throw new Error(await responseError(response));
      setPreview((await response.json()) as Preview);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Aperçu indisponible.");
    } finally {
      setLoadingPreview(false);
    }
  }, [callApi, canExport, filters, licenseKey, workshopId]);

  const loadHistory = useCallback(async () => {
    if (!(workshopId && licenseKey && canExport)) return;
    setLoadingHistory(true);
    try {
      const response = await callApi({ operation: "history" });
      if (!response.ok) throw new Error(await responseError(response));
      const body = (await response.json()) as { exports: ExportHistory[] };
      setHistory(body.exports);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Historique indisponible.");
    } finally {
      setLoadingHistory(false);
    }
  }, [callApi, canExport, licenseKey, workshopId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPreview(), 250);
    return () => window.clearTimeout(timer);
  }, [loadPreview]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  function applyPreset(preset: "current" | "previous" | "year") {
    const now = new Date();
    const target = preset === "previous" ? subMonths(now, 1) : now;
    setFilters((current) => ({
      ...current,
      startDate: dateValue(preset === "year" ? startOfYear(now) : startOfMonth(target)),
      endDate: dateValue(preset === "year" ? endOfYear(now) : endOfMonth(target)),
    }));
  }

  async function generateExport() {
    setGenerating(true);
    try {
      const response = await callApi({
        operation: "generate",
        filters,
        format: formatType,
        actorName: currentUser.name,
      });
      if (!response.ok) throw new Error(await responseError(response));
      const blob = await response.blob();
      downloadBlobFile(blob, responseFilename(response, `factures-pour-comptable.${formatType}`));
      setConfirmOpen(false);
      toast.success("Export des factures généré et archivé.");
      await loadHistory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export impossible.");
    } finally {
      setGenerating(false);
    }
  }

  async function downloadAgain(entry: ExportHistory) {
    try {
      const response = await callApi({ operation: "download", exportId: entry.id });
      if (!response.ok) throw new Error(await responseError(response));
      downloadBlobFile(await response.blob(), responseFilename(response, entry.file_name));
      toast.success("Export téléchargé.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Téléchargement impossible.");
    }
  }

  const missingPdfCount = preview.warnings.filter((warning) => warning.code === "missing_pdf").length;
  const chosenFormat = formatOptions.find((option) => option.value === formatType) || formatOptions[0];

  if (!canExport) {
    return (
      <Panel className="p-6">
        <div className="flex items-start gap-3 text-[#B42318]">
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <div>
            <h2 className="font-semibold">Droits insuffisants</h2>
            <p className="mt-1 text-sm text-[#667085]">Votre rôle ne permet pas d'exporter les données comptables.</p>
          </div>
        </div>
      </Panel>
    );
  }

  if (!(workshopId && licenseKey)) {
    return (
      <Panel className="p-6">
        <div className="flex items-start gap-3 text-[#936100]">
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <div>
            <h2 className="font-semibold">Synchronisation nécessaire</h2>
            <p className="mt-1 text-sm text-[#667085]">
              Reconnectez l'atelier pour charger les données comptables sécurisées.
            </p>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <Panel className="overflow-hidden">
        <div className="border-[#E4E7EC] border-b px-5 py-4 md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold text-[#101828]">Périmètre de l'export</h2>
              <p className="mt-1 text-[#667085] text-sm">
                Uniquement les factures validées ; les devis sont toujours exclus.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="filter-chip" onClick={() => applyPreset("current")} type="button">
                Mois en cours
              </button>
              <button className="filter-chip" onClick={() => applyPreset("previous")} type="button">
                Mois précédent
              </button>
              <button className="filter-chip" onClick={() => applyPreset("year")} type="button">
                Année en cours
              </button>
            </div>
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4 md:p-6">
          <label className="field-label">
            Du
            <input
              className="field-control"
              max={filters.endDate}
              onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
              type="date"
              value={filters.startDate}
            />
          </label>
          <label className="field-label">
            Au
            <input
              className="field-control"
              min={filters.startDate}
              onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
              type="date"
              value={filters.endDate}
            />
          </label>
          <label className="field-label">
            Boutique
            <select
              className="field-control"
              onChange={(event) => setFilters((current) => ({ ...current, shopId: event.target.value }))}
              value={filters.shopId}
            >
              <option value="all">Toutes les boutiques</option>
              {preview.shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Taux de TVA
            <select
              className="field-control"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  vatRate: event.target.value === "all" ? "all" : Number(event.target.value),
                }))
              }
              value={String(filters.vatRate)}
            >
              <option value="all">Tous les taux</option>
              {preview.vatRates.map((rate) => (
                <option key={rate} value={rate}>
                  {rate.toFixed(2)} %
                </option>
              ))}
            </select>
          </label>
        </div>
      </Panel>

      {pageError && (
        <div className="flex items-center gap-3 rounded-[14px] border border-[#F2D4D1] bg-[#FFF9F8] px-4 py-3 text-[#B42318] text-sm">
          <AlertCircle className="size-4 shrink-0" /> {pageError}
          <button className="ml-auto underline" onClick={() => void loadPreview()} type="button">
            Réessayer
          </button>
        </div>
      )}

      <Panel className="p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-[#101828]">Résumé avant export</h2>
            <p className="mt-1 text-[#667085] text-sm">Chiffre d'affaires facturé, net des avoirs.</p>
          </div>
          {loadingPreview && <Loader2 className="size-5 animate-spin text-[#2A9D8F]" />}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Kpi hint="factures et avoirs" label="Documents" value={String(preview.summary.invoiceCount)} />
          <Kpi label="Avoirs" value={String(preview.summary.creditNoteCount)} />
          <Kpi label="CA facturé HT" value={money.format(preview.summary.billedRevenueExcludingTax)} />
          <Kpi label="TVA facturée" value={money.format(preview.summary.vatAmount)} />
          <Kpi label="CA facturé TTC" value={money.format(preview.summary.billedRevenueIncludingTax)} />
          <Kpi label="Total des avoirs" value={money.format(preview.summary.creditNotesIncludingTax)} />
        </div>
        {preview.summary.invoiceCount === 0 && !loadingPreview && (
          <div className="mt-4 rounded-[12px] border border-[#FFE6C7] bg-[#FFFBF5] px-4 py-3 text-[#936100] text-sm">
            Aucune facture validée sur cette période. Modifiez les filtres avant d'exporter.
          </div>
        )}
        {missingPdfCount > 0 && (
          <div className="mt-4 flex items-start gap-3 rounded-[12px] border border-[#FFE6C7] bg-[#FFFBF5] px-4 py-3 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#936100]" />
            <p>
              <strong>
                {missingPdfCount} PDF manquant{missingPdfCount > 1 ? "s" : ""}.
              </strong>{" "}
              Les exports CSV et XLSX restent disponibles ; l'archive ZIP exige tous les PDF.
            </p>
          </div>
        )}
      </Panel>

      <Panel className="p-5 md:p-6">
        <div>
          <div>
            <h2 className="font-semibold text-[#101828]">Format à générer</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {formatOptions.map((option) => {
                const Icon = option.icon;
                const selected = option.value === formatType;
                const disabled = option.value === "zip" && missingPdfCount > 0;
                return (
                  <button
                    aria-pressed={selected}
                    className={cn(
                      "flex min-h-24 items-start gap-3 rounded-[14px] border p-4 text-left transition",
                      selected
                        ? "border-[#2A9D8F] bg-[#F4FBF9]"
                        : "border-[#E4E7EC] bg-white hover:border-[#2A9D8F]/40",
                      disabled && "cursor-not-allowed opacity-50",
                    )}
                    disabled={disabled}
                    key={option.value}
                    onClick={() => setFormatType(option.value)}
                    type="button"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-white text-[#2A9D8F]">
                      <Icon className="size-4" />
                    </span>
                    <span>
                      <strong className="block text-sm">{option.title}</strong>
                      <span className="mt-1 block text-[#667085] text-xs leading-5">{option.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <PrimaryButton
              className="h-12 px-6"
              disabled={
                loadingPreview || preview.summary.invoiceCount === 0 || (formatType === "zip" && missingPdfCount > 0)
              }
              onClick={() => setConfirmOpen(true)}
            >
              <Download className="size-4" /> Exporter les factures pour votre comptable
            </PrimaryButton>
          </div>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between border-[#E4E7EC] border-b px-5 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <History className="size-5 text-[#2A9D8F]" />
            <div>
              <h2 className="font-semibold">Historique des exports</h2>
              <p className="text-[#667085] text-xs">50 dernières générations sécurisées</p>
            </div>
          </div>
          <button
            aria-label="Actualiser l'historique"
            className="grid size-9 place-items-center rounded-[10px] border border-[#E4E7EC]"
            onClick={() => void loadHistory()}
            type="button"
          >
            <RefreshCw className={cn("size-4", loadingHistory && "animate-spin")} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-[#FCFCFD] text-left text-[#667085] text-xs">
              <tr>
                <th className="px-5 py-3 font-medium">Généré le</th>
                <th className="px-4 py-3 font-medium">Période</th>
                <th className="px-4 py-3 font-medium">Utilisateur</th>
                <th className="px-4 py-3 font-medium">Boutique</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Factures</th>
                <th className="px-5 py-3 text-right font-medium">Fichier</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr className="border-[#EFEFEB] border-t" key={entry.id}>
                  <td className="px-5 py-3.5">
                    {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(
                      new Date(entry.created_at),
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {frenchDate(entry.period_start)} – {frenchDate(entry.period_end)}
                  </td>
                  <td className="px-4 py-3.5">{entry.generated_by_name}</td>
                  <td className="px-4 py-3.5">{entry.shop_name}</td>
                  <td className="px-4 py-3.5 font-medium uppercase">{entry.file_type}</td>
                  <td className="px-4 py-3.5">{entry.invoice_count}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      className="inline-flex items-center gap-2 rounded-[9px] border border-[#E4E7EC] px-3 py-2 font-medium text-xs hover:border-[#2A9D8F]/40"
                      onClick={() => void downloadAgain(entry)}
                      type="button"
                    >
                      <Download className="size-3.5" /> Retélécharger · {formatBytes(entry.file_size_bytes)}
                    </button>
                  </td>
                </tr>
              ))}
              {!history.length && !loadingHistory && (
                <tr>
                  <td className="px-5 py-10 text-center text-[#667085]" colSpan={7}>
                    Aucun export généré pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Dialog onOpenChange={setConfirmOpen} open={confirmOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <div className="mb-1 grid size-11 place-items-center rounded-[12px] bg-[#F4FBF9] text-[#2A9D8F]">
              <Archive className="size-5" />
            </div>
            <DialogTitle>Confirmer l'export des factures</DialogTitle>
            <DialogDescription>Vérifiez le périmètre avant de générer et d'archiver le fichier.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-[14px] border border-[#E4E7EC] bg-[#FCFCFD] p-4">
            <div className="flex justify-between gap-4">
              <span className="text-[#667085]">Période</span>
              <strong>
                {frenchDate(filters.startDate)} – {frenchDate(filters.endDate)}
              </strong>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#667085]">Factures</span>
              <strong>{preview.summary.invoiceCount}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#667085]">Format</span>
              <strong>{chosenFormat.title}</strong>
            </div>
            <div className="border-[#E4E7EC] border-t pt-3">
              <p className="text-[#667085] text-xs font-medium uppercase tracking-wide">Fichiers générés</p>
              <p className="mt-2 flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 text-[#2A9D8F]" />
                {formatType === "zip"
                  ? `1 fichier CSV + ${preview.summary.invoiceCount} PDF dans une archive ZIP`
                  : chosenFormat.description}
              </p>
            </div>
          </div>
          <DialogFooter>
            <SecondaryButton disabled={generating} onClick={() => setConfirmOpen(false)}>
              Annuler
            </SecondaryButton>
            <PrimaryButton disabled={generating} onClick={() => void generateExport()}>
              {generating ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {generating ? "Génération…" : "Générer et télécharger"}
            </PrimaryButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        .filter-chip { height: 36px; border: 1px solid #e4e7ec; border-radius: 10px; background: white; padding: 0 12px; font-size: 12px; font-weight: 600; color: #4f4f4b; }
        .filter-chip:hover { border-color: rgba(42, 157, 143, .45); color: #167b70; }
        .field-label { display: flex; flex-direction: column; gap: 7px; color: #667085; font-size: 12px; font-weight: 600; }
        .field-control { height: 42px; width: 100%; min-width: 0; border: 1px solid #e4e7ec; border-radius: 11px; background: white; padding: 0 11px; color: #101828; font-size: 13px; outline: none; }
        .field-control:focus { border-color: rgba(42, 157, 143, .6); box-shadow: 0 0 0 3px rgba(42, 157, 143, .1); }
      `}</style>
    </div>
  );
}
