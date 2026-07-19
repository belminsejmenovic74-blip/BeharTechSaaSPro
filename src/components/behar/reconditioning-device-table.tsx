"use client";

import { Copy, Smartphone } from "lucide-react";

import { safeMoney, getDeviceLocation, getDeviceOrigin, getDeviceReference } from "@/lib/reconditioning-formatters";
import { calculateEstimatedMargin, calculateRepairCost } from "@/lib/reconditioning-calculations";
import { realDeviceImage } from "@/lib/real-product-images";
import type { ReconditioningFile, ReconditioningStatus } from "@/lib/reconditioning-store";
import { useReconditioningStore } from "@/lib/reconditioning-store";
import { getNextAvailableActions, type ReconditioningDeviceAction } from "@/lib/reconditioning-status";
import {
  canMarkSold,
  getDeviceDisplayName,
  getDeviceGrade,
  getDeviceSubtitle,
  isDeviceComplete,
} from "@/lib/reconditioning-validation";
import { cn } from "@/lib/utils";

import { GradeBadge, StatusBadge } from "./reconditioning-ui";

type TableMode = "recent" | "full";

export function ReconditioningDevicesTable({
  files,
  onOpenDevice,
  mode = "full",
}: Readonly<{ files: ReconditioningFile[]; onOpenDevice: (id: string) => void; mode?: TableMode }>) {
  const sendToWorkshop = useReconditioningStore((state) => state.sendToWorkshop);
  const generateCertificate = useReconditioningStore((state) => state.generateCertificate);
  const markSold = useReconditioningStore((state) => state.markSold);
  const addPart = useReconditioningStore((state) => state.addPart);

  const runAction = (file: ReconditioningFile, action: ReconditioningDeviceAction) => {
    if (action.id === "complete" || action.id === "open" || action.id === "view_sale" || action.id === "view_block") {
      onOpenDevice(file.id);
      return;
    }
    if (action.id === "send_to_workshop") {
      sendToWorkshop(file.id);
      return;
    }
    if (action.id === "add_part") {
      addPart(file.id);
      onOpenDevice(file.id);
      return;
    }
    if (action.id === "mark_ready") {
      generateCertificate(file.id);
      return;
    }
    if (action.id === "mark_sold") {
      if (!canMarkSold(file)) {
        window.alert("Complétez la fiche avant de vendre cet appareil");
        return;
      }
      const suggested = file.prixVentePrevu > 0 ? String(file.prixVentePrevu) : "";
      const answer = window.prompt("Prix de vente final (€)", suggested);
      if (answer == null) return;
      const price = Number(answer);
      if (Number.isFinite(price) && price >= 0) markSold(file.id, price);
    }
  };

  if (files.length === 0) {
    return (
      <div className="rounded-[18px] border border-[#E4E7EC] border-dashed bg-white px-6 py-12 text-center">
        <div className="mx-auto grid size-11 place-items-center rounded-full border border-[#E4E7EC] bg-[#F9FAFB] text-[#2A9D8F]">
          <Smartphone className="size-5" />
        </div>
        <p className="mt-3.5 font-semibold text-[#101828] text-[15px]">Aucun appareil</p>
        <p className="mt-1 text-[#667085] text-[13px]">Les reprises apparaîtront ici dès qu'une fiche sera créée.</p>
      </div>
    );
  }

  return (
    <>
      <div
        className="hidden overflow-hidden rounded-[18px] border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] xl:block"
        data-mode={mode}
      >
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="border-[#F2F4F7] border-b bg-[#FCFCFD] text-[#98A2B3] text-[10px] uppercase tracking-[0.06em]">
              <th className="w-[20%] px-4 py-2.5 font-semibold">Appareil</th>
              <th className="w-[11%] px-3 py-2.5 font-semibold">Client / Fourn.</th>
              <th className="w-[11%] px-3 py-2.5 font-semibold">IMEI / Réf.</th>
              <th className="w-[10%] px-3 py-2.5 font-semibold">Statut</th>
              <th className="w-[5%] px-2 py-2.5 font-semibold">Grade</th>
              <th className="w-[7%] px-2 py-2.5 text-right font-semibold">Reprise</th>
              <th className="w-[7%] px-2 py-2.5 text-right font-semibold">Répar.</th>
              <th className="w-[7%] px-2 py-2.5 text-right font-semibold">Revente</th>
              <th className="w-[7%] px-2 py-2.5 text-right font-semibold">Marge</th>
              <th className="w-[7%] px-3 py-2.5 font-semibold">Lieu</th>
              <th className="w-[8%] px-4 py-2.5 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <ReconditioningDeviceRow file={file} key={file.id} onOpenDevice={onOpenDevice} onRunAction={runAction} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 xl:hidden">
        {files.map((file) => (
          <DeviceMobileCard file={file} key={file.id} onOpenDevice={onOpenDevice} onRunAction={runAction} />
        ))}
      </div>
    </>
  );
}

export function ReconditioningDeviceRow({
  file,
  onOpenDevice,
  onRunAction,
}: Readonly<{
  file: ReconditioningFile;
  onOpenDevice: (id: string) => void;
  onRunAction: (file: ReconditioningFile, action: ReconditioningDeviceAction) => void;
}>) {
  const complete = isDeviceComplete(file);
  const displayStatus = (complete ? file.status : "À compléter") as ReconditioningStatus;
  const margin = calculateEstimatedMargin(file);
  const repairCost = calculateRepairCost(file);
  const action = getNextAvailableActions(file)[0];

  return (
    <tr className="border-[#F2F4F7] border-b align-middle transition last:border-0 hover:bg-[#FCFCFD]">
      <td className="px-4 py-2">
        <DeviceIdentity file={file} onOpenDevice={onOpenDevice} />
      </td>
      <td className="px-3 py-2">
        <p className="truncate font-medium text-[#101828] text-[12.5px]">{getDeviceOrigin(file)}</p>
        <p className="truncate text-[#98A2B3] text-[11px]">
          {file.provenance === "fournisseur" ? "Fournisseur" : "Client comptoir"}
        </p>
      </td>
      <td className="px-3 py-2">
        <ReferenceCell file={file} />
      </td>
      <td className="px-3 py-2">
        <StatusBadge status={displayStatus} />
      </td>
      <td className="px-2 py-2">
        <GradeBadge grade={(complete ? getDeviceGrade(file) : "") as never} />
      </td>
      <td className="px-2 py-2 text-right text-[#101828] text-[12.5px] tabular-nums">
        {complete ? safeMoney(file.prixAchat) : "—"}
      </td>
      <td className="px-2 py-2 text-right text-[#101828] text-[12.5px] tabular-nums">
        {repairCost > 0 ? safeMoney(repairCost) : "—"}
      </td>
      <td className="px-2 py-2 text-right text-[#101828] text-[12.5px] tabular-nums">
        {complete ? safeMoney(file.prixVentePrevu) : "—"}
      </td>
      <td
        className={cn(
          "px-2 py-2 text-right font-semibold text-[12.5px] tabular-nums",
          margin == null ? "text-[#98A2B3]" : margin >= 0 ? "text-[#147065]" : "text-[#B4342A]",
        )}
      >
        {margin == null ? "—" : safeMoney(margin)}
      </td>
      <td className="px-3 py-2">
        <span className="block truncate text-[#101828] text-[12.5px]">{complete ? getDeviceLocation(file) : "—"}</span>
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center justify-end">
          <ActionButton action={action} file={file} onOpenDevice={onOpenDevice} onRunAction={onRunAction} />
        </div>
      </td>
    </tr>
  );
}

function DeviceMobileCard({
  file,
  onOpenDevice,
  onRunAction,
}: Readonly<{
  file: ReconditioningFile;
  onOpenDevice: (id: string) => void;
  onRunAction: (file: ReconditioningFile, action: ReconditioningDeviceAction) => void;
}>) {
  const complete = isDeviceComplete(file);
  const action = getNextAvailableActions(file)[0];
  const margin = calculateEstimatedMargin(file);
  return (
    <article className="rounded-[16px] border border-[#E4E7EC] bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <DeviceIdentity file={file} onOpenDevice={onOpenDevice} />
        <StatusBadge status={(complete ? file.status : "À compléter") as ReconditioningStatus} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
        <Metric label="Reprise" value={complete ? safeMoney(file.prixAchat) : "—"} />
        <Metric label="Revente" value={complete ? safeMoney(file.prixVentePrevu) : "—"} />
        <Metric label="Réparation" value={safeMoney(calculateRepairCost(file))} />
        <Metric
          tone={margin == null ? undefined : margin >= 0 ? "good" : "bad"}
          label="Marge"
          value={margin == null ? "—" : safeMoney(margin)}
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <GradeBadge grade={(complete ? getDeviceGrade(file) : "") as never} />
        <ActionButton action={action} file={file} onOpenDevice={onOpenDevice} onRunAction={onRunAction} />
      </div>
    </article>
  );
}

function DeviceIdentity({
  file,
  onOpenDevice,
}: Readonly<{ file: ReconditioningFile; onOpenDevice: (id: string) => void }>) {
  const complete = isDeviceComplete(file);
  const image = complete ? realDeviceImage(file.brand, file.model, "smartphone") : "";
  return (
    <button
      className="grid min-w-0 grid-cols-[38px_minmax(0,1fr)] items-center gap-2.5 text-left"
      onClick={() => onOpenDevice(file.id)}
      type="button"
    >
      <span className="grid size-[38px] shrink-0 place-items-center overflow-hidden rounded-[10px] border border-[#E4E7EC] bg-[#F9FAFB]">
        {image ? (
          <img alt="" className="h-full w-full object-contain p-1" src={image} />
        ) : (
          <Smartphone className={cn("size-5", complete ? "text-[#2A9D8F]" : "text-[#98A2B3]")} />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold text-[#101828] text-[12.5px] leading-tight hover:text-[#147065]">
          {getDeviceDisplayName(file)}
        </span>
        <span className="block truncate text-[#667085] text-[11px] leading-snug">{getDeviceSubtitle(file)}</span>
        <span className="block truncate text-[#98A2B3] text-[10.5px] leading-snug">{getDeviceReference(file)}</span>
      </span>
    </button>
  );
}

function ReferenceCell({ file }: Readonly<{ file: ReconditioningFile }>) {
  const value = file.imei || file.serial || "—";
  return (
    <div className="min-w-0">
      <p className="truncate font-mono text-[#101828] text-[11.5px]">{value}</p>
      <p className="flex items-center gap-1 truncate text-[#98A2B3] text-[10.5px]">
        {getDeviceReference(file)}
        {value !== "—" && <Copy className="size-3" />}
      </p>
    </div>
  );
}

function ActionButton({
  file,
  action,
  onRunAction,
  onOpenDevice,
}: Readonly<{
  file: ReconditioningFile;
  action?: ReconditioningDeviceAction;
  onRunAction: (file: ReconditioningFile, action: ReconditioningDeviceAction) => void;
  onOpenDevice?: (id: string) => void;
}>) {
  if (!action) {
    if (!onOpenDevice) return null;
    return (
      <button
        className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-[10px] border border-[#E4E7EC] bg-white px-3 font-semibold text-[#667085] text-[12px] transition hover:bg-[#F5F7FA] hover:text-[#101828]"
        onClick={() => onOpenDevice(file.id)}
        type="button"
      >
        Ouvrir
      </button>
    );
  }
  const isPrimary = action.id === "complete" || action.id === "mark_sold";
  return (
    <button
      className={cn(
        "inline-flex h-8 max-w-[132px] items-center justify-center whitespace-nowrap rounded-[9px] border px-2.5 font-semibold text-[11.5px] transition",
        isPrimary
          ? "border-[#D7EFEA] bg-[#ECF8F4] text-[#147065] hover:bg-[#DFF3ED]"
          : "border-[#E4E7EC] bg-white text-[#147065] hover:bg-[#F5F7FA]",
      )}
      onClick={() => onRunAction(file, action)}
      type="button"
    >
      <span className="truncate">{action.label}</span>
    </button>
  );
}

function Metric({ label, value, tone }: Readonly<{ label: string; value: string; tone?: "good" | "bad" }>) {
  return (
    <div className="rounded-[12px] bg-[#F9FAFB] px-3 py-2">
      <p className="text-[#667085] text-[11px]">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-semibold text-[12.5px]",
          tone === "good" ? "text-[#147065]" : tone === "bad" ? "text-[#B4342A]" : "text-[#101828]",
        )}
      >
        {value}
      </p>
    </div>
  );
}
