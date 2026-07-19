"use client";

// reconditioning-dashboard — Vue d'ensemble premium du module Reconditionnement.
// KPI propres, pipeline 5 colonnes et table des appareils récents.

import { useMemo } from "react";

import { AlertTriangle, CheckCircle2, Plus, ShoppingBag, Smartphone, Tag, TrendingUp, Wrench } from "lucide-react";

import {
  calculateEstimatedMargin,
  calculateRepairCost,
  calculateTotalEstimatedMargin,
} from "@/lib/reconditioning-calculations";
import { safeMoney } from "@/lib/reconditioning-formatters";
import { realDeviceImage } from "@/lib/real-product-images";
import {
  PIPELINE_STAGES,
  type PipelineStage,
  type ReconditioningFile,
  useReconditioningStore,
} from "@/lib/reconditioning-store";
import { getDevicePipelineStage } from "@/lib/reconditioning-status";
import {
  getDeviceDisplayName,
  getDeviceGrade,
  getDeviceSubtitle,
  isDeviceComplete,
} from "@/lib/reconditioning-validation";
import { cn } from "@/lib/utils";

import { ReconditioningDevicesTable } from "./reconditioning-device-table";
import { AccentButton, EmptyState, GradeBadge, SectionHeader } from "./reconditioning-ui";

const todayKey = () => new Date().toISOString().slice(0, 10);

export function ReconditioningDashboard({
  onNewIntake,
  onOpenDevice,
  onShowDevices,
}: Readonly<{ onNewIntake: () => void; onOpenDevice: (id: string) => void; onShowDevices: () => void }>) {
  const files = useReconditioningStore((state) => state.files);
  const today = todayKey();

  const rows = useMemo(
    () =>
      [...files].sort(
        (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime(),
      ),
    [files],
  );
  const completeFiles = useMemo(() => rows.filter(isDeviceComplete), [rows]);
  const incompleteFiles = useMemo(() => rows.filter((file) => !isDeviceComplete(file)), [rows]);
  const margin = useMemo(() => calculateTotalEstimatedMargin(completeFiles), [completeFiles]);

  const byStage = useMemo(() => {
    const map = new Map<PipelineStage, ReconditioningFile[]>();
    for (const stage of PIPELINE_STAGES) map.set(stage.key, []);
    for (const file of rows) {
      const stage = getDevicePipelineStage(file);
      if (stage) map.get(stage)?.push(file);
    }
    return map;
  }, [rows]);

  const bought = completeFiles.filter((file) => !["Brouillon", "Refusé", "Bloqué", "Abandonné"].includes(file.status));
  const inWorkshop = completeFiles.filter((file) =>
    ["Évaluation", "Reconditionnement", "En attente pièce", "Tests"].includes(file.status),
  );
  const ready = completeFiles.filter((file) => file.status === "Prêt à vendre" || file.status === "En stock");
  const sold = completeFiles.filter((file) => file.status === "Vendu");
  const atRisk = incompleteFiles.length + rows.filter((file) => file.status === "Bloqué").length;

  const boughtToday = bought.filter((file) => (file.receivedAt || file.createdAt).slice(0, 10) === today).length;
  const soldToday = sold.filter((file) => file.soldAt?.slice(0, 10) === today).length;

  const hasDevices = rows.length > 0;

  return (
    <div className="space-y-4">
      <ReconditioningKpiCards
        atRisk={atRisk}
        bought={bought.length}
        boughtToday={boughtToday}
        inWorkshop={inWorkshop.length}
        marginAmount={margin.amount}
        marginCount={margin.count}
        ready={ready.length}
        sold={sold.length}
        soldToday={soldToday}
      />

      {hasDevices ? (
        <>
          <ReconditioningPipeline byStage={byStage} onOpenDevice={onOpenDevice} onShowDevices={onShowDevices} />
          <section className="space-y-3">
            <SectionHeader
              action={
                <button
                  className="font-semibold text-[#2A9D8F] text-[12.5px] transition hover:text-[#147065]"
                  onClick={onShowDevices}
                  type="button"
                >
                  Voir tous les appareils
                </button>
              }
              title="Appareils récents"
            />
            <ReconditioningDevicesTable files={rows.slice(0, 4)} mode="recent" onOpenDevice={onOpenDevice} />
          </section>
        </>
      ) : (
        <EmptyState
          action={
            <AccentButton onClick={onNewIntake}>
              <Plus className="size-4" />
              Nouvelle reprise
            </AccentButton>
          }
          description="Les reprises et leurs marges apparaîtront ici dès qu'un téléphone sera acheté ou ajouté depuis l'atelier."
          icon={ShoppingBag}
          title="Ajoutez votre première reprise"
        />
      )}
    </div>
  );
}

function ReconditioningKpiCards({
  bought,
  boughtToday,
  inWorkshop,
  ready,
  sold,
  soldToday,
  marginAmount,
  marginCount,
  atRisk,
}: Readonly<{
  bought: number;
  boughtToday: number;
  inWorkshop: number;
  ready: number;
  sold: number;
  soldToday: number;
  marginAmount: number;
  marginCount: number;
  atRisk: number;
}>) {
  const cards = [
    {
      label: "Achetés",
      value: String(bought),
      hint: boughtToday > 0 ? `+${boughtToday} aujourd'hui` : "Aucun aujourd'hui",
      icon: ShoppingBag,
      tone: "teal",
    },
    {
      label: "En atelier",
      value: String(inWorkshop),
      hint: inWorkshop > 0 ? "Diagnostic et remise en état" : "File atelier vide",
      icon: Wrench,
      tone: "blue",
    },
    {
      label: "Prêts à vendre",
      value: String(ready),
      hint: ready > 0 ? "En stock ou vitrine" : "Aucun prêt",
      icon: Tag,
      tone: "purple",
    },
    {
      label: "Vendus",
      value: String(sold),
      hint: soldToday > 0 ? `+${soldToday} aujourd'hui` : "Historique ventes",
      icon: CheckCircle2,
      tone: "green",
    },
    {
      label: "Marge estimée",
      value: safeMoney(marginAmount),
      hint: marginCount > 0 ? `Sur ${marginCount} appareil${marginCount > 1 ? "s" : ""}` : "À compléter",
      icon: TrendingUp,
      tone: "amber",
    },
    {
      label: "À compléter / À risque",
      value: String(atRisk),
      hint: atRisk > 0 ? "À traiter" : "Données propres",
      icon: AlertTriangle,
      tone: "red",
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div
          className="min-h-[104px] rounded-[16px] border border-[#E4E7EC] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
          key={card.label}
        >
          <div className="flex items-center gap-2">
            <card.icon className={cn("size-4 shrink-0", kpiIconTone(card.tone))} />
            <p className="truncate text-[#667085] text-[12px]">{card.label}</p>
          </div>
          <p className="mt-2 font-semibold text-[#101828] text-[21px] leading-none tracking-tight tabular-nums">
            {card.value}
          </p>
          <p
            className={cn(
              "mt-1.5 truncate text-[11.5px]",
              card.tone === "red" && atRisk > 0 ? "text-[#B4342A]" : "text-[#98A2B3]",
            )}
          >
            {card.hint}
          </p>
        </div>
      ))}
    </div>
  );
}

function ReconditioningPipeline({
  byStage,
  onOpenDevice,
  onShowDevices,
}: Readonly<{
  byStage: Map<PipelineStage, ReconditioningFile[]>;
  onOpenDevice: (id: string) => void;
  onShowDevices: () => void;
}>) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {PIPELINE_STAGES.map((stage) => (
        <ReconditioningPipelineColumn
          files={byStage.get(stage.key) ?? []}
          key={stage.key}
          onOpenDevice={onOpenDevice}
          onShowDevices={onShowDevices}
          title={stage.label}
        />
      ))}
    </div>
  );
}

function ReconditioningPipelineColumn({
  title,
  files,
  onOpenDevice,
  onShowDevices,
}: Readonly<{
  title: string;
  files: ReconditioningFile[];
  onOpenDevice: (id: string) => void;
  onShowDevices: () => void;
}>) {
  return (
    <section className="flex min-h-[194px] flex-col rounded-[16px] border border-[#E4E7EC] bg-white p-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-2.5 flex items-center justify-between gap-2 px-1.5 pt-0.5">
        <h2 className="truncate font-semibold text-[#101828] text-[12.5px]">{title}</h2>
        <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[#F2F4F7] px-1.5 font-semibold text-[#667085] text-[11px] tabular-nums">
          {files.length}
        </span>
      </div>
      <div className="space-y-2">
        {files.length === 0 ? (
          <div className="grid min-h-[84px] place-items-center rounded-[12px] border border-[#E4E7EC] border-dashed bg-[#F9FAFB] px-3 text-center text-[#98A2B3] text-[12px]">
            Aucun appareil
          </div>
        ) : (
          files
            .slice(0, 2)
            .map((file) => <ReconditioningPipelineCard file={file} key={file.id} onOpenDevice={onOpenDevice} />)
        )}
      </div>
      {files.length > 0 && (
        <button
          className="mt-2 h-8 w-full rounded-[10px] font-semibold text-[#667085] text-[11.5px] transition hover:bg-[#ECF8F4] hover:text-[#147065]"
          onClick={onShowDevices}
          type="button"
        >
          Voir les {files.length} appareil{files.length > 1 ? "s" : ""}
        </button>
      )}
    </section>
  );
}

function ReconditioningPipelineCard({
  file,
  onOpenDevice,
}: Readonly<{ file: ReconditioningFile; onOpenDevice: (id: string) => void }>) {
  const complete = isDeviceComplete(file);
  const image = complete ? realDeviceImage(file.brand, file.model, "smartphone") : "";
  const repairCost = calculateRepairCost(file);
  const margin = calculateEstimatedMargin(file);
  const primaryLabel = !complete
    ? ""
    : file.status === "Vendu"
      ? "Vendu"
      : file.status === "Prêt à vendre" || file.status === "En stock"
        ? "Marge est."
        : "Reprise";
  const primaryValue = !complete
    ? "À compléter"
    : file.status === "Prêt à vendre" || file.status === "En stock"
      ? safeMoney(margin)
      : safeMoney(file.prixAchat);

  return (
    <article
      className="cursor-pointer rounded-[12px] border border-[#E4E7EC] bg-[#FCFCFD] p-2.5 transition hover:border-[#2A9D8F]/40 hover:bg-white"
      onClick={() => onOpenDevice(file.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpenDevice(file.id);
      }}
      role="button"
      tabIndex={0}
    >
      <div className="grid grid-cols-[36px_minmax(0,1fr)] items-center gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-[10px] border border-[#E4E7EC] bg-white">
          {image ? (
            <img alt="" className="h-full w-full object-contain p-1" src={image} />
          ) : (
            <Smartphone className="size-4.5 text-[#2A9D8F]" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[#101828] text-[12.5px] leading-tight">
            {getDeviceDisplayName(file)}
          </p>
          <p className="mt-0.5 truncate text-[#98A2B3] text-[11px]">{getDeviceSubtitle(file)}</p>
        </div>
      </div>
      <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 overflow-hidden">
          {complete ? (
            <GradeBadge grade={getDeviceGrade(file) as never} />
          ) : (
            <span className="inline-flex h-[22px] max-w-[96px] items-center truncate whitespace-nowrap rounded-full border border-[#FFD7B5] bg-[#FFF2E8] px-2 font-semibold text-[#C05621] text-[10.5px] leading-none">
              À compléter
            </span>
          )}
          {repairCost > 0 && <span className="truncate text-[#98A2B3] text-[11px]">Rép. {safeMoney(repairCost)}</span>}
        </span>
        <span className="flex max-w-[96px] shrink-0 items-baseline justify-end gap-1 leading-tight">
          {primaryLabel && <span className="truncate text-[#98A2B3] text-[10px]">{primaryLabel}</span>}
          <span
            className={cn(
              "font-semibold text-[12.5px] tabular-nums",
              margin != null && margin >= 0 ? "text-[#147065]" : "text-[#101828]",
            )}
          >
            {primaryValue}
          </span>
        </span>
      </div>
    </article>
  );
}

function kpiIconTone(tone: "teal" | "blue" | "purple" | "green" | "amber" | "red") {
  const tones = {
    teal: "text-[#2A9D8F]",
    blue: "text-[#2563EB]",
    purple: "text-[#8B5CF6]",
    green: "text-[#147065]",
    amber: "text-[#C98112]",
    red: "text-[#B4342A]",
  };
  return tones[tone];
}
