"use client";

// Calendrier de prise de rendez-vous : vue mensuelle (jours disponibles /
// fermés), navigation entre mois, puis créneaux horaires du jour sélectionné.
// Les créneaux proviennent de l'API publique (`/slots`) : rien n'est inventé.

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

import type { Slot } from "@/lib/widget/public-types";
import { useAsyncList } from "@/components/widget/use-catalog";
import { primaryService, type StepContext } from "@/components/widget/widget-state";
import { formatDateFr, formatDuration } from "@/components/widget/widget-theme";
import { Spinner, WidgetNotice } from "@/components/widget/widget-primitives";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function monthLabel(date: Date): string {
  const label = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function isoDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function AppointmentCalendar({ ctx }: { ctx: StepContext }) {
  const { client, token, draft, patch, emit, config } = ctx;
  const service = primaryService(draft);
  const slots = useAsyncList<Slot>(
    (signal) =>
      client
        .getSlots(token, { shop: draft.shopId || undefined, days: "30", servicePublicId: service?.publicId }, signal)
        .then((result) => result.slots),
    [token, draft.shopId, service?.publicId],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const slot of slots.items) {
      const list = map.get(slot.date) ?? [];
      list.push(slot.time);
      map.set(slot.date, list);
    }
    return map;
  }, [slots.items]);

  const firstAvailable = slots.items[0]?.date;
  const [viewMonth, setViewMonth] = useState<Date | null>(null);
  const displayMonth = viewMonth ?? startOfMonth(firstAvailable ? new Date(`${firstAvailable}T12:00:00`) : new Date());

  const durationLabel = formatDuration(service?.durationMinutes ?? config.booking.durationMinutes) ?? null;

  if (slots.loading) {
    return (
      <div className="flex items-center gap-2 rounded-[var(--w-radius)] border border-[var(--w-border)] p-4 text-sm text-[var(--w-muted)]">
        <Spinner className="h-4 w-4" /> Recherche des créneaux disponibles…
      </div>
    );
  }

  if (slots.error || byDate.size === 0) {
    return (
      <WidgetNotice tone="warning">
        Aucun créneau disponible pour le moment. Choisissez « Être rappelé » ci-contre : l’atelier vous proposera un
        rendez-vous.
      </WidgetNotice>
    );
  }

  // Grille du mois affiché (semaine du lundi au dimanche).
  const first = startOfMonth(displayMonth);
  const leadingBlanks = (first.getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: Array<{ day: number; iso: string; available: boolean } | null> = [];
  for (let i = 0; i < leadingBlanks; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = isoDay(new Date(first.getFullYear(), first.getMonth(), day));
    cells.push({ day, iso, available: byDate.has(iso) });
  }

  const selectedTimes = draft.appointmentDate ? (byDate.get(draft.appointmentDate) ?? []) : [];

  return (
    <div className="grid gap-3">
      <div className="rounded-[var(--w-radius)] border border-[var(--w-border)] bg-[var(--w-surface)] p-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            aria-label="Mois précédent"
            onClick={() => setViewMonth(new Date(first.getFullYear(), first.getMonth() - 1, 1))}
            className="grid size-8 place-items-center rounded-full text-[var(--w-muted)] transition hover:bg-[var(--w-primary-soft)] hover:text-[var(--w-text)]"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="text-sm font-semibold text-[var(--w-text)]">{monthLabel(displayMonth)}</p>
          <button
            type="button"
            aria-label="Mois suivant"
            onClick={() => setViewMonth(new Date(first.getFullYear(), first.getMonth() + 1, 1))}
            className="grid size-8 place-items-center rounded-full text-[var(--w-muted)] transition hover:bg-[var(--w-primary-soft)] hover:text-[var(--w-text)]"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((weekday) => (
            <span key={weekday} className="py-1 text-[11px] font-medium text-[var(--w-muted)]">
              {weekday}
            </span>
          ))}
          {cells.map((cell, index) => {
            if (!cell) return <span key={`blank-${index}`} />;
            const selected = draft.appointmentDate === cell.iso;
            return (
              <button
                key={cell.iso}
                type="button"
                disabled={!cell.available}
                aria-pressed={selected}
                onClick={() => patch({ appointmentDate: cell.iso, appointmentTime: "" })}
                className={cn(
                  "mx-auto grid size-9 place-items-center rounded-full text-sm transition",
                  selected
                    ? "bg-[var(--w-primary)] font-semibold text-[var(--w-on-primary)]"
                    : cell.available
                      ? "font-medium text-[var(--w-text)] hover:bg-[var(--w-primary-soft)]"
                      : "cursor-not-allowed text-[var(--w-muted)]/40",
                )}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      </div>

      {draft.appointmentDate ? (
        <div className="grid gap-2">
          <p className="text-sm font-medium capitalize text-[var(--w-text)]">{formatDateFr(draft.appointmentDate)}</p>
          <div className="flex flex-wrap gap-2">
            {selectedTimes.map((time) => {
              const selected = draft.appointmentTime === time;
              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => {
                    patch({ appointmentTime: time });
                    emit("slot_selected");
                  }}
                  className={cn(
                    "rounded-[calc(var(--w-radius)-2px)] border px-3.5 py-2 text-sm font-medium transition",
                    selected
                      ? "border-[var(--w-primary)] bg-[var(--w-primary)] text-[var(--w-on-primary)]"
                      : "border-[var(--w-border)] bg-[var(--w-surface)] text-[var(--w-text)] hover:border-[var(--w-primary)]",
                  )}
                >
                  {time}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--w-muted)]">Sélectionnez une date pour voir les créneaux.</p>
      )}

      {durationLabel ? (
        <p className="flex items-center gap-1.5 text-xs text-[var(--w-muted)]">
          <Clock className="size-3.5" /> Créneau réservé pour {durationLabel}.
        </p>
      ) : null}
    </div>
  );
}
