export type WorkshopTimeRange = { start: string; end: string };

export type WorkshopDayHours = {
  enabled: boolean;
  morning: WorkshopTimeRange | null;
  afternoon: WorkshopTimeRange | null;
};

export type WorkshopWeeklyHours = Record<string, WorkshopDayHours>;

export const WORKSHOP_DAYS = [
  { key: "1", short: "Lun", label: "Lundi" },
  { key: "2", short: "Mar", label: "Mardi" },
  { key: "3", short: "Mer", label: "Mercredi" },
  { key: "4", short: "Jeu", label: "Jeudi" },
  { key: "5", short: "Ven", label: "Vendredi" },
  { key: "6", short: "Sam", label: "Samedi" },
  { key: "7", short: "Dim", label: "Dimanche" },
] as const;

export function defaultWorkshopWeeklyHours(): WorkshopWeeklyHours {
  return Object.fromEntries(
    WORKSHOP_DAYS.map(({ key }) => [
      key,
      key === "7"
        ? { enabled: false, morning: null, afternoon: null }
        : key === "6"
          ? { enabled: true, morning: { start: "09:00", end: "13:00" }, afternoon: null }
          : {
              enabled: true,
              morning: { start: "09:00", end: "12:00" },
              afternoon: { start: "13:00", end: "18:00" },
            },
    ]),
  );
}

function validRange(value: unknown): WorkshopTimeRange | null {
  if (!value || typeof value !== "object") return null;
  const range = value as Record<string, unknown>;
  const start = typeof range.start === "string" ? range.start : "";
  const end = typeof range.end === "string" ? range.end : "";
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || start >= end) return null;
  return { start, end };
}

export function normalizeWorkshopWeeklyHours(value: unknown): WorkshopWeeklyHours {
  const defaults = defaultWorkshopWeeklyHours();
  if (!value || typeof value !== "object") return defaults;
  const source = value as Record<string, unknown>;
  return Object.fromEntries(
    WORKSHOP_DAYS.map(({ key }) => {
      const raw = source[key];
      if (!raw || typeof raw !== "object") return [key, defaults[key]];
      const day = raw as Record<string, unknown>;
      const enabled = day.enabled !== false;
      const morning = validRange(day.morning);
      const afternoon = validRange(day.afternoon);
      return [key, { enabled: enabled && Boolean(morning ?? afternoon), morning, afternoon }];
    }),
  );
}

export function weeklyHoursToScheduleConfig(value: unknown) {
  const normalized = normalizeWorkshopWeeklyHours(value);
  const weeklyHours: Record<string, WorkshopTimeRange[]> = {};
  const breaks: Record<string, WorkshopTimeRange[]> = {};
  for (const { key } of WORKSHOP_DAYS) {
    const day = normalized[key];
    if (!day.enabled) {
      weeklyHours[key] = [];
      continue;
    }
    const ranges = [day.morning, day.afternoon].filter((range): range is WorkshopTimeRange => Boolean(range));
    weeklyHours[key] = ranges;
    if (day.morning && day.afternoon && day.morning.end < day.afternoon.start) {
      breaks[key] = [{ start: day.morning.end, end: day.afternoon.start }];
    }
  }
  return { weeklyHours, breaks };
}

export function formatWorkshopWeeklyHours(value: unknown): string {
  const normalized = normalizeWorkshopWeeklyHours(value);
  return WORKSHOP_DAYS.flatMap(({ key, short }) => {
    const day = normalized[key];
    if (!day.enabled) return [`${short} fermé`];
    const ranges = [day.morning, day.afternoon]
      .filter((range): range is WorkshopTimeRange => Boolean(range))
      .map((range) => `${range.start}-${range.end}`);
    return [`${short} ${ranges.join(" / ")}`];
  }).join(" · ");
}
