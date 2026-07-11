"use client";

import {
  Battery,
  CalendarDays,
  CheckCircle2,
  Gamepad2,
  Laptop,
  MonitorSmartphone,
  PlugZap,
  Smartphone,
  Tablet,
  Wrench,
  Zap,
} from "lucide-react";

import type { WidgetIconChoice, WidgetIconTarget } from "@/lib/widget/public-types";

export const WIDGET_LIBRARY_ICONS = {
  smartphone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  gamepad: Gamepad2,
  battery: Battery,
  screen: MonitorSmartphone,
  charging: PlugZap,
  calendar: CalendarDays,
  confirmation: CheckCircle2,
  repair: Wrench,
  lightning: Zap,
} as const;

export type WidgetLibraryIcon = keyof typeof WIDGET_LIBRARY_ICONS;

function normalized(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function iconTargetForDevice(value: string): WidgetIconTarget | null {
  const source = normalized(value);
  if (source.includes("tablet")) return "tablet";
  if (source.includes("ordinateur") || source.includes("computer") || source.includes("mac") || source.includes("pc"))
    return "computer";
  if (source.includes("console") || source.includes("playstation") || source.includes("xbox")) return "console";
  if (source.includes("telephone") || source.includes("smartphone") || source.includes("iphone")) return "phone";
  return null;
}

export function iconTargetForIssue(value: string): WidgetIconTarget | null {
  const source = normalized(value);
  if (source.includes("batter")) return "battery";
  if (source.includes("ecran") || source.includes("vitre") || source.includes("affichage")) return "screen";
  if (source.includes("charge") || source.includes("connecteur") || source.includes("port")) return "charging";
  return null;
}

export function WidgetIcon({
  choice,
  className = "shrink-0",
}: {
  choice: WidgetIconChoice | undefined;
  className?: string;
}) {
  if (!choice || choice.mode === "none") return null;
  const size = Math.min(64, Math.max(12, choice.size || 24));
  if (choice.mode === "custom" && choice.assetUrl) {
    return (
      // biome-ignore lint/performance/noImgElement: média public optimisé et versionné dans Supabase Storage.
      <img
        src={choice.assetUrl}
        alt={choice.alt || ""}
        width={size}
        height={size}
        className={`${className} object-contain`}
      />
    );
  }
  const Icon = WIDGET_LIBRARY_ICONS[choice.libraryIcon as WidgetLibraryIcon];
  return Icon ? <Icon aria-hidden="true" width={size} height={size} className={className} /> : null;
}
