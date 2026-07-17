"use client";

import { Clock3, Coffee } from "lucide-react";

import {
  defaultWorkshopWeeklyHours,
  normalizeWorkshopWeeklyHours,
  WORKSHOP_DAYS,
  type WorkshopDayHours,
  type WorkshopWeeklyHours,
} from "@/lib/workshop-hours";
import { cn } from "@/lib/utils";

type Props = {
  value?: WorkshopWeeklyHours;
  onChange: (value: WorkshopWeeklyHours) => void;
  compact?: boolean;
};

const timeClass =
  "h-10 min-w-0 rounded-[12px] border border-[#E8E8E5] bg-white px-2.5 text-sm text-[#1A1916] outline-none focus:border-[#2A9D8F] focus:ring-4 focus:ring-[#2A9D8F]/10";

export function BusinessHoursEditor({ value, onChange, compact = false }: Props) {
  const hours = value ? normalizeWorkshopWeeklyHours(value) : defaultWorkshopWeeklyHours();

  const updateDay = (key: string, patch: Partial<WorkshopDayHours>) => {
    onChange({ ...hours, [key]: { ...hours[key], ...patch } });
  };

  const updateTime = (key: string, period: "morning" | "afternoon", side: "start" | "end", next: string) => {
    const fallback = period === "morning" ? { start: "09:00", end: "12:00" } : { start: "13:00", end: "18:00" };
    updateDay(key, { [period]: { ...(hours[key][period] || fallback), [side]: next } });
  };

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#E8E8E5] bg-white">
      <div className="flex items-start gap-3 border-b border-[#EFEFEB] bg-[#FBFBF9] px-4 py-3.5">
        <div className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-[#E9F7F4] text-[#238579]">
          <Clock3 className="size-[18px]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1A1916]">Horaires et pauses</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[#6B6B6B]">
            Les créneaux du site suivent exactement ces plages. La coupure entre matin et après-midi est indisponible.
          </p>
        </div>
      </div>

      <div className="divide-y divide-[#EFEFEB]">
        {WORKSHOP_DAYS.map(({ key, label }) => {
          const day = hours[key];
          return (
            <div
              key={key}
              className={cn(
                "grid items-center gap-3 px-4 py-3",
                compact ? "grid-cols-1 md:grid-cols-[110px_1fr]" : "grid-cols-1 xl:grid-cols-[130px_1fr]",
                !day.enabled && "bg-[#FCFCFB]",
              )}
            >
              <label className="flex items-center gap-2.5 text-sm font-medium text-[#1A1916]">
                <input
                  type="checkbox"
                  className="size-4 accent-[#2A9D8F]"
                  checked={day.enabled}
                  onChange={(event) =>
                    updateDay(key, {
                      enabled: event.target.checked,
                      morning: event.target.checked ? day.morning || { start: "09:00", end: "12:00" } : day.morning,
                    })
                  }
                />
                {label}
              </label>

              {day.enabled ? (
                <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <TimeRange
                    label="Matin"
                    value={day.morning}
                    onToggle={() => updateDay(key, { morning: day.morning ? null : { start: "09:00", end: "12:00" } })}
                    onChange={(side, next) => updateTime(key, "morning", side, next)}
                  />
                  <span className="hidden items-center gap-1 text-[11px] font-medium text-[#8A8A8A] sm:flex">
                    <Coffee className="size-3.5" /> Pause
                  </span>
                  <TimeRange
                    label="Après-midi"
                    value={day.afternoon}
                    onToggle={() =>
                      updateDay(key, { afternoon: day.afternoon ? null : { start: "13:00", end: "18:00" } })
                    }
                    onChange={(side, next) => updateTime(key, "afternoon", side, next)}
                  />
                </div>
              ) : (
                <span className="text-sm text-[#8A8A8A]">Fermé</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimeRange({
  label,
  value,
  onToggle,
  onChange,
}: {
  label: string;
  value: WorkshopDayHours["morning"];
  onToggle: () => void;
  onChange: (side: "start" | "end", value: string) => void;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "h-8 rounded-full border px-2.5 text-[11px] font-semibold transition",
          value ? "border-[#9BD8CF] bg-[#E9F7F4] text-[#1E7A6E]" : "border-[#E8E8E5] bg-white text-[#8A8A8A]",
        )}
      >
        {label}
      </button>
      <input
        aria-label={`${label} ouverture`}
        type="time"
        className={timeClass}
        disabled={!value}
        value={value?.start || ""}
        onChange={(event) => onChange("start", event.target.value)}
      />
      <span className="text-xs text-[#8A8A8A]">à</span>
      <input
        aria-label={`${label} fermeture`}
        type="time"
        className={timeClass}
        disabled={!value}
        value={value?.end || ""}
        onChange={(event) => onChange("end", event.target.value)}
      />
    </div>
  );
}
