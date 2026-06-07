import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getInitials = (str: string): string => {
  if (typeof str !== "string" || !str.trim()) return "?";

  return (
    str
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "?"
  );
};

export function formatCurrency(
  amount: number,
  opts?: {
    currency?: string;
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    noDecimals?: boolean;
  },
) {
  const { currency = "USD", locale = "en-US", minimumFractionDigits, maximumFractionDigits, noDecimals } = opts ?? {};

  const formatOptions: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
    minimumFractionDigits: noDecimals ? 0 : minimumFractionDigits,
    maximumFractionDigits: noDecimals ? 0 : maximumFractionDigits,
  };

  return new Intl.NumberFormat(locale, formatOptions).format(amount);
}

const FR_MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

const FR_MONTH_INDEX: Record<string, number> = {
  janvier: 0,
  janv: 0,
  février: 1,
  fevrier: 1,
  févr: 1,
  fevr: 1,
  mars: 2,
  avril: 3,
  avr: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  juil: 6,
  août: 7,
  aout: 7,
  septembre: 8,
  sept: 8,
  octobre: 9,
  oct: 9,
  novembre: 10,
  nov: 10,
  décembre: 11,
  decembre: 11,
  déc: 11,
  dec: 11,
};

function parseDateTimeFrInput(value: string | Date | number | null | undefined) {
  if (value instanceof Date) return { date: value, hasTime: true };
  if (typeof value === "number") return { date: new Date(value), hasTime: true };
  const text = String(value ?? "").trim();
  if (!text) return null;

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
  if (iso) {
    const [, year, month, day, hour, minute] = iso;
    return {
      date: new Date(Number(year), Number(month) - 1, Number(day), Number(hour ?? 0), Number(minute ?? 0), 0, 0),
      hasTime: Boolean(hour && minute),
    };
  }

  const fr = text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .match(/^(\d{1,2})\s+([a-z.]+)\s+(\d{4})(?:\s*(?:a|,)?\s*(\d{1,2})[:h](\d{2}))?/);
  if (fr) {
    const [, day, rawMonth, year, hour, minute] = fr;
    const monthKey = rawMonth.replace(/\.$/, "");
    const month = FR_MONTH_INDEX[monthKey];
    if (month !== undefined) {
      return {
        date: new Date(Number(year), month, Number(day), Number(hour ?? 0), Number(minute ?? 0), 0, 0),
        hasTime: Boolean(hour && minute),
      };
    }
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return { date: parsed, hasTime: /[:T]\d{2}/.test(text) };
  return null;
}

export function formatDateTimeFr(value: string | Date | number | null | undefined, fallback = "Non renseigné") {
  const parsed = parseDateTimeFrInput(value);
  if (!parsed || Number.isNaN(parsed.date.getTime())) return String(value ?? "").trim() || fallback;

  const day = parsed.date.getDate();
  const month = FR_MONTHS[parsed.date.getMonth()] ?? "";
  const year = parsed.date.getFullYear();
  const datePart = `${day} ${month} ${year}`;
  if (!parsed.hasTime) return datePart;

  const hour = String(parsed.date.getHours()).padStart(2, "0");
  const minute = String(parsed.date.getMinutes()).padStart(2, "0");
  return `${datePart} à ${hour}h${minute}`;
}

export function formatIntakeBonNumber(source?: string | null, fallbackSequence?: number) {
  const text = String(source ?? "").trim().toUpperCase();
  if (/^BON-\d{4,}$/.test(text)) return text;

  const match = text.match(/(\d{1,})$/);
  const sequence = match ? Number(match[1]) : Number(fallbackSequence);
  if (Number.isFinite(sequence) && sequence > 0) {
    return `BON-${String(sequence).padStart(4, "0")}`;
  }

  return "BON-0001";
}
