"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PillTone = "ok" | "warn" | "info" | "muted" | "danger" | "violet";

const TONE_STYLES: Record<PillTone, string> = {
  ok: "border-[#D7EFEA] bg-[#FFFFFF] text-[#1d6f65]",
  warn: "border-[#E4E7EC] bg-[#FFFFFF] text-[#667085]",
  info: "border-[#E4E7EC] bg-[#FFFFFF] text-[#667085]",
  muted: "border-[#E4E7EC] bg-[#FFFFFF] text-[#667085]",
  danger: "border-[#F2D4D1] bg-[#FFFFFF] text-[#A23A40]",
  violet: "border-[#E4E7EC] bg-[#FFFFFF] text-[#667085]",
};

export function StatusPill({
  children,
  tone = "muted",
  className,
}: Readonly<{ children: ReactNode; tone?: PillTone; className?: string }>) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-[7px] border px-2 py-0.5 font-semibold text-[11px] leading-none",
        TONE_STYLES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const QUOTE_STATUS_TONE: Record<string, PillTone> = {
  Brouillon: "muted",
  Envoyé: "warn",
  Accepté: "ok",
  Refusé: "danger",
  Facturé: "info",
};

export const INVOICE_STATUS_TONE: Record<string, PillTone> = {
  Brouillon: "muted",
  Envoyée: "info",
  Payée: "ok",
  Annulée: "danger",
};

export const PAYMENT_STATUS_TONE: Record<string, PillTone> = {
  Payé: "ok",
  Annulé: "danger",
  Remboursé: "muted",
};

export const REPAIR_STATUS_TONE: Record<string, PillTone> = {
  Reçu: "muted",
  Diagnostic: "info",
  "Devis envoyé": "warn",
  "Devis accepté": "info",
  "En réparation": "info",
  "Test final": "info",
  Prêt: "ok",
  Rendu: "ok",
  Irréparable: "danger",
  SAV: "warn",
  Clôturé: "ok",
  Annulé: "danger",
};

export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  counts,
}: Readonly<{
  tabs: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  counts?: Partial<Record<T, number>>;
}>) {
  return (
    <div className="flex h-10 max-w-full items-center gap-1 overflow-x-auto rounded-[12px] border border-[#E4E7EC] bg-white p-1 scrollbar-none">
      {tabs.map((tab) => {
        const active = tab.value === value;
        const count = counts?.[tab.value];
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "h-8 shrink-0 rounded-[9px] px-3 font-medium text-[13px] transition",
              active ? "bg-[#FFFFFF] text-[#1d6f65]" : "text-[#667085] hover:bg-[#FFFFFF] hover:text-[#101828]",
            )}
          >
            {tab.label}
            {typeof count === "number" && count > 0 && <span className="ml-1.5 text-[11px] opacity-70">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
