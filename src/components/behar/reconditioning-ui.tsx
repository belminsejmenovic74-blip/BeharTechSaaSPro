"use client";

// reconditioning-ui — primitives visuelles partagées du module Reconditionnement.
// Design system compact & premium (Behar Tech Pro) : #F9FAFB fond, #FFFFFF cartes,
// #101828 texte, #667085 secondaire, #2A9D8F accent, #E4E7EC bordures.
//
// Échelle unique de hauteurs pour aligner tous les contrôles :
//   - champ / select / bouton standard : h-9  (36px)
//   - champ numérique compact           : h-8  (32px)
//   - badge                              : h-5.5 ≈ 22px
// Radius : contrôles 10px, cartes 16-18px, badges pleins.

import type { ReactNode } from "react";

import type { LucideIcon } from "lucide-react";

import type { ReconditioningGrade } from "@/lib/recond-settings";
import { DEVICE_STATUS_LABEL, type ReconditioningStatus } from "@/lib/reconditioning-store";
import { cn } from "@/lib/utils";

/* ───────────────────────── Contrôles (classes) ───────────────────────── */

export const inputCls =
  "h-9 w-full rounded-[10px] border border-[#E4E7EC] bg-white px-3 text-[#101828] text-[13px] leading-none outline-none transition placeholder:text-[#98A2B3] focus:border-[#2A9D8F] focus:ring-[3px] focus:ring-[#2A9D8F]/12";
export const selectCls = `${inputCls} cursor-pointer appearance-none pr-9`;
/** Champ numérique compact, aligné à droite (montants, pourcentages). */
export const numFieldCls =
  "h-8 rounded-[9px] border border-[#E4E7EC] bg-white px-2.5 text-right text-[#101828] text-[12.5px] tabular-nums outline-none transition placeholder:text-[#98A2B3] focus:border-[#2A9D8F] focus:ring-[3px] focus:ring-[#2A9D8F]/12";

/* ───────────────────────── Statuts ───────────────────────── */

const STATUS_TONE: Record<ReconditioningStatus, string> = {
  "À compléter": "border-transparent bg-[#FFF7E8] text-[#9A6B1B]",
  Brouillon: "border-[#E4E7EC] bg-white text-[#667085]",
  Acheté: "border-[#D7EFEA] bg-[#ECF8F4] text-[#167B70]",
  Évaluation: "border-[#D9E7FF] bg-[#F3F7FF] text-[#2563EB]",
  Reconditionnement: "border-[#D9E7FF] bg-[#F3F7FF] text-[#2563EB]",
  "En attente pièce": "border-[#F0E0BC] bg-[#FFF7E8] text-[#9A6B1B]",
  Tests: "border-[#D9E7FF] bg-[#F3F7FF] text-[#2563EB]",
  "Prêt à vendre": "border-[#CDEBE4] bg-[#ECF8F4] text-[#147065]",
  "En stock": "border-[#CDEBE4] bg-[#ECF8F4] text-[#147065]",
  Vendu: "border-[#E4E7EC] bg-[#F2F4F7] text-[#101828]",
  Refusé: "border-[#E4E7EC] bg-[#F5F7FA] text-[#98A2B3]",
  Bloqué: "border-[#F0D9D6] bg-[#FCF4F3] text-[#B4342A]",
  Abandonné: "border-[#E4E7EC] bg-[#F5F7FA] text-[#98A2B3]",
};

export function StatusBadge({ status, className }: Readonly<{ status: ReconditioningStatus; className?: string }>) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] max-w-full shrink-0 items-center truncate whitespace-nowrap rounded-full border px-2 font-semibold text-[10.5px] leading-none",
        STATUS_TONE[status],
        className,
      )}
    >
      {DEVICE_STATUS_LABEL[status]}
    </span>
  );
}

/* ───────────────────────── Grades ───────────────────────── */

const GRADE_TONE: Record<ReconditioningGrade, string> = {
  "A+": "border-[#CDEBE4] bg-[#ECF8F4] text-[#147065]",
  A: "border-[#CDEBE4] bg-[#ECF8F4] text-[#147065]",
  B: "border-[#F0E0BC] bg-[#FFF7E8] text-[#9A6B1B]",
  C: "border-[#FFD7B5] bg-[#FFF2E8] text-[#C05621]",
  D: "border-[#F0D9D6] bg-[#FCF4F3] text-[#B4342A]",
  HS: "border-[#E4E7EC] bg-[#F2F4F7] text-[#667085]",
};

export function GradeBadge({ grade }: Readonly<{ grade: ReconditioningGrade | "" }>) {
  if (!grade) return <span className="text-[#98A2B3] text-[12px]">—</span>;
  return (
    <span
      className={cn(
        "inline-flex h-[22px] min-w-[24px] shrink-0 items-center justify-center rounded-full border px-2 font-semibold text-[10.5px] leading-none",
        GRADE_TONE[grade as ReconditioningGrade] ?? GRADE_TONE.B,
      )}
    >
      {grade}
    </span>
  );
}

/* ───────────────────────── Cartes & sections ───────────────────────── */

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
}: Readonly<{ title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }>) {
  return (
    <section
      className={cn(
        "rounded-[18px] border border-[#E4E7EC] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        className,
      )}
    >
      {(title || action) && (
        <div className="mb-3.5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="font-semibold text-[#101828] text-[15px] tracking-tight">{title}</h2>}
            {subtitle && <p className="mt-1 max-w-[640px] text-[#667085] text-[12.5px] leading-relaxed">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** En-tête de section réutilisable : titre + sous-titre + action alignés. */
export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: Readonly<{ title: string; subtitle?: string; action?: ReactNode; className?: string }>) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="truncate font-semibold text-[#101828] text-[15px] tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1 max-w-[560px] text-[#667085] text-[12.5px] leading-relaxed">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function KpiTile({
  label,
  value,
  hint,
  tone,
}: Readonly<{ label: string; value: string; hint?: string; tone?: "accent" | "danger" }>) {
  return (
    <div className="rounded-[16px] border border-[#E4E7EC] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <p className="truncate text-[#667085] text-[12px]">{label}</p>
      <p
        className={cn(
          "mt-1.5 font-semibold text-[22px] leading-none tracking-tight tabular-nums",
          tone === "accent" ? "text-[#147065]" : tone === "danger" ? "text-[#B4342A]" : "text-[#101828]",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1.5 truncate text-[#98A2B3] text-[11.5px]">{hint}</p>}
    </div>
  );
}

/** Champ numérique inline compact : label · valeur · suffixe, dans une pilule bordée. */
export function InlineNumberField({
  label,
  value,
  onChange,
  suffix,
  min = 0,
  max,
  width = "w-11",
  className,
}: Readonly<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  width?: string;
  className?: string;
}>) {
  return (
    <label
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-[10px] border border-[#E4E7EC] bg-white px-2.5",
        className,
      )}
    >
      <span className="whitespace-nowrap text-[#667085] text-[11.5px]">{label}</span>
      <input
        className={cn(
          "border-0 bg-transparent p-0 text-right font-semibold text-[#101828] text-[12.5px] leading-none tabular-nums outline-none",
          width,
        )}
        max={max}
        min={min}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange(Number.isFinite(next) ? next : 0);
        }}
        type="number"
        value={value}
      />
      {suffix && <span className="text-[#98A2B3] text-[11.5px]">{suffix}</span>}
    </label>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: Readonly<{ icon: LucideIcon; title: string; description: string; action?: ReactNode }>) {
  return (
    <div className="grid place-items-center rounded-[18px] border border-[#E4E7EC] border-dashed bg-white px-6 py-12 text-center">
      <span className="grid size-10 place-items-center rounded-full border border-[#E4E7EC] bg-[#F9FAFB] text-[#2A9D8F]">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-3 font-semibold text-[#101828] text-[14.5px]">{title}</h3>
      <p className="mt-1 max-w-[360px] text-[#667085] text-[12.5px] leading-relaxed">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ───────────────────────── Boutons ───────────────────────── */

export function AccentButton({
  children,
  onClick,
  className,
  disabled,
}: Readonly<{ children: ReactNode; onClick?: () => void; className?: string; disabled?: boolean }>) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] bg-[#2A9D8F] px-3.5 font-semibold text-[12.5px] text-white shadow-[0_5px_14px_rgba(42,157,143,0.18)] transition hover:bg-[#238579] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  className,
  disabled,
}: Readonly<{ children: ReactNode; onClick?: () => void; className?: string; disabled?: boolean }>) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border border-[#E4E7EC] bg-white px-3 font-semibold text-[#101828] text-[12.5px] transition hover:bg-[#F5F7FA] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

/* ───────────────────────── Divers ───────────────────────── */

export function deviceTitle(file: { brand?: string; model?: string; storage?: string }): string {
  return [file.brand, file.model].filter(Boolean).join(" ").trim() || "Données à compléter";
}

export function FieldLabel({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <label className="block space-y-1.5">
      <span className="font-medium text-[#101828] text-[12.5px]">{label}</span>
      {children}
    </label>
  );
}
