"use client";

import { type ReactNode, useState } from "react";

import { CalendarClock } from "lucide-react";

import { PrimaryButton } from "@/components/behar/primitives";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const INTEGRATIONS_AVAILABLE_AT = "2026-08-15";

function availableDateLabel(availableAt: string) {
  const date = new Date(`${availableAt}T12:00:00`);
  if (Number.isNaN(date.getTime())) return availableAt;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(date);
}

export function ComingSoonModal({
  name,
  availableAt = INTEGRATIONS_AVAILABLE_AT,
  isOpen,
  onClose,
}: Readonly<{
  name: string;
  availableAt?: string;
  isOpen: boolean;
  onClose: () => void;
}>) {
  const dateLabel = availableDateLabel(availableAt);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md gap-0 rounded-[20px] border border-[#E4E7EC] bg-white p-5 shadow-[0_24px_70px_rgba(16,24,40,0.18)] sm:p-6">
        <div className="space-y-5 text-center sm:text-left">
          <span className="mx-auto grid size-12 place-items-center rounded-[14px] bg-[#EAF6F4] text-[#167B70] sm:mx-0">
            <CalendarClock className="size-5" aria-hidden="true" />
          </span>
          <DialogHeader className="gap-3">
            <DialogTitle className="pr-8 font-semibold text-[#101828] text-[18px] leading-tight">
              {name} · Bientôt disponible
            </DialogTitle>
            <DialogDescription className="text-[#101828] text-[15px] leading-6">
              Cette intégration est en cours de préparation. Elle sera disponible à partir du {dateLabel}.
            </DialogDescription>
            <p className="mt-2 text-[#667085] text-sm leading-6">
              Aucune connexion externe ne sera lancée avant cette date.
            </p>
          </DialogHeader>
          <DialogClose asChild>
            <PrimaryButton className="w-full">Compris</PrimaryButton>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ComingSoonIntegration({
  name,
  availableAt = INTEGRATIONS_AVAILABLE_AT,
  children,
  className,
}: Readonly<{
  name: string;
  availableAt?: string;
  children: ReactNode;
  className?: string;
}>) {
  const [open, setOpen] = useState(false);
  const dateLabel = availableDateLabel(availableAt);

  return (
    <div className={cn("relative min-w-0 overflow-hidden rounded-[18px]", className)}>
      <div aria-hidden="true" className="pointer-events-none select-none blur-[0.7px] saturate-[0.58]" inert>
        {children}
      </div>
      <button
        type="button"
        aria-label={`${name}, bientôt disponible à partir du ${dateLabel}`}
        className="absolute inset-0 z-10 flex min-h-11 cursor-pointer flex-col items-end justify-between bg-white/52 p-3 text-right outline-none transition hover:bg-white/60 focus-visible:ring-3 focus-visible:ring-[#2A9D8F]/35 focus-visible:ring-inset"
        onClick={() => setOpen(true)}
      >
        <span className="rounded-full border border-white/90 bg-white/92 px-2.5 py-1 font-semibold text-[#167B70] text-[11px] shadow-[0_3px_12px_rgba(16,24,40,0.08)]">
          Bientôt disponible
        </span>
        <span className="max-w-[90%] rounded-[10px] bg-white/90 px-2.5 py-1.5 font-medium text-[#101828] text-[11px] shadow-[0_3px_12px_rgba(16,24,40,0.06)]">
          Disponible à partir du {dateLabel}
        </span>
      </button>
      <ComingSoonModal availableAt={availableAt} isOpen={open} name={name} onClose={() => setOpen(false)} />
    </div>
  );
}
