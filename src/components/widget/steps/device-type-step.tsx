"use client";

import { Check, Headphones, HelpCircle, Monitor, Watch } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { StepContext } from "@/components/widget/widget-state";
import { DEVICE_TYPE_IMAGES, GLOBAL_DEVICE_TYPES } from "@/lib/widget/global-catalog";
import { cn } from "@/lib/utils";

// Icônes fines et cohérentes pour les types sans miniature dédiée.
const DEVICE_ICONS: Record<string, LucideIcon> = {
  desktop: Monitor,
  watch: Watch,
  audio: Headphones,
  other: HelpCircle,
};

export function DeviceTypeStep({ ctx }: { ctx: StepContext }) {
  const { draft, patch } = ctx;
  return (
    <div className="grid gap-5">
      <header className="grid gap-1.5 text-center">
        <h2 className="text-[calc(1.35rem*var(--w-heading-scale,1))] font-semibold tracking-tight text-[var(--w-text)]">
          Quel type d’appareil souhaitez-vous réparer ?
        </h2>
        <p className="text-sm text-[var(--w-muted)]">Sélectionnez votre appareil, nous vous guiderons ensuite.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {GLOBAL_DEVICE_TYPES.map((device) => {
          const selected = draft.category === device.label;
          const image = DEVICE_TYPE_IMAGES[device.id];
          const Icon = DEVICE_ICONS[device.id];
          return (
            <button
              key={device.id}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                patch({
                  category: device.label,
                  brand: "",
                  model: "",
                  issues: [],
                  services: {},
                  issueDescription: "",
                })
              }
              className={cn(
                "group relative grid min-h-[144px] place-items-center gap-2 rounded-[var(--w-radius)] border bg-[var(--w-surface)] p-3 text-center transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--w-focus-ring)]",
                selected
                  ? "border-[var(--w-primary)] bg-[var(--w-primary-soft)] shadow-[0_8px_24px_var(--w-primary-soft)]"
                  : "border-[var(--w-border)] hover:-translate-y-0.5 hover:border-[var(--w-primary-border)] hover:shadow-md",
              )}
            >
              {selected ? (
                <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-[var(--w-primary)] text-[var(--w-on-primary)]">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              ) : null}
              <span className="grid h-20 w-full place-items-center">
                {image ? (
                  // biome-ignore lint/performance/noImgElement: miniatures publiques déjà optimisées du catalogue appareils.
                  <img
                    src={image}
                    alt=""
                    className="h-20 w-auto max-w-[88px] object-contain transition duration-150 group-hover:scale-[1.04]"
                  />
                ) : Icon ? (
                  <span className="grid size-16 place-items-center rounded-2xl bg-[var(--w-tint)] text-[var(--w-primary)] transition duration-150 group-hover:scale-[1.04]">
                    <Icon className="size-8" strokeWidth={1.5} aria-hidden="true" />
                  </span>
                ) : null}
              </span>
              <span className="text-xs font-semibold text-[var(--w-text)] sm:text-sm">{device.label}</span>
            </button>
          );
        })}
      </div>

      <p className="rounded-[var(--w-radius)] border border-[var(--w-border)] bg-[var(--w-page-bg)] px-4 py-3 text-center text-xs text-[var(--w-muted)] sm:text-left">
        <strong className="text-[var(--w-text)]">Votre appareil n’apparaît pas ?</strong> Vous pourrez le préciser plus
        tard.
      </p>
    </div>
  );
}
