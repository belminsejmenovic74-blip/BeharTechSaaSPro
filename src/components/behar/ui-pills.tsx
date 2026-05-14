"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PillTone = "ok" | "warn" | "info" | "muted" | "danger" | "violet";

const TONE_STYLES: Record<PillTone, string> = {
  ok: "bg-[#E7F5F1] text-[#1d6f65]",
  warn: "bg-[#FCF1DF] text-[#A06A12]",
  info: "bg-[#E6EFFB] text-[#2F6FD0]",
  muted: "bg-[#F1F1EF] text-[#6B6B6B]",
  danger: "bg-[#FCEAEC] text-[#A23A40]",
  violet: "bg-[#EFEAF8] text-[#7B5BC2]",
};

export function StatusPill({
  children,
  tone = "muted",
  className,
}: Readonly<{ children: ReactNode; tone?: PillTone; className?: string }>) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 font-medium text-[11px]",
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
  Restitué: "ok",
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
    <div className="inline-flex h-10 items-center gap-1 rounded-[12px] border border-[#E7E4DC] bg-white p-1">
      {tabs.map((tab) => {
        const active = tab.value === value;
        const count = counts?.[tab.value];
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "h-8 rounded-[9px] px-3 font-medium text-[13px] transition",
              active ? "bg-[#E7F5F1] text-[#1d6f65]" : "text-[#6B6B6B] hover:bg-[#FAFAF8] hover:text-[#1A1916]",
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
