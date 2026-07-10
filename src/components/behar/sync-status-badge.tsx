"use client";

import { useEffect, useState } from "react";

import { AlertCircle, Check, CloudOff, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { subscribeWorkshopSyncState, type WorkshopSyncState } from "@/lib/workshop-sync";

function safeSyncError(value?: string) {
  if (!value) return "Synchronisation cloud indisponible. Réessayez dans un instant.";
  if (/fetch|network|réseau|timeout|failed to fetch/i.test(value)) {
    return "Réseau indisponible. Les modifications seront synchronisées automatiquement.";
  }
  if (/pgrst|supabase|schema|table|function|constraint|sql|duplicate key/i.test(value)) {
    return "Synchronisation cloud momentanément indisponible.";
  }
  return value.length > 140 ? "Synchronisation cloud momentanément indisponible." : value;
}

/**
 * Badge de statut sync, style Notion/Drive.
 * S'affiche dans le topbar, très discret.
 */
export function SyncStatusBadge({ className }: Readonly<{ className?: string }>) {
  const [state, setState] = useState<WorkshopSyncState>({ status: "idle" });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const unsubscribe = subscribeWorkshopSyncState(setState);
    // Tick chaque 30 sec pour rafraîchir "il y a X sec"
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  if (state.status === "idle") return null;

  const config = (() => {
    switch (state.status) {
      case "loading":
        return { icon: Loader2, label: "Chargement cloud…", color: "text-[#6B6B6B]", spin: true };
      case "saving":
        return { icon: Loader2, label: "Sauvegarde…", color: "text-[#6B6B6B]", spin: true };
      case "synced": {
        const rel = state.lastSyncedAt ? relativeTime(now - new Date(state.lastSyncedAt).getTime()) : "à l'instant";
        return { icon: Check, label: `Sauvegardé ${rel}`, color: "text-[#2A9D8F]" };
      }
      case "offline":
        return { icon: CloudOff, label: "Hors ligne — sera sauvegardé au retour du réseau", color: "text-[#6B6B6B]" };
      case "error":
        return { icon: AlertCircle, label: safeSyncError(state.lastError), color: "text-[#B42318]" };
      default:
        return { icon: Check, label: "", color: "text-[#6B6B6B]" };
    }
  })();

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "hidden md:inline-flex items-center gap-1.5 text-[11.5px] font-medium tabular-nums",
        config.color,
        className,
      )}
      title={state.status === "error" ? safeSyncError(state.lastError) : config.label}
    >
      <Icon className={cn("size-3", config.spin && "animate-spin")} strokeWidth={2.2} />
      <span className="truncate max-w-[180px]">{config.label}</span>
    </span>
  );
}

function relativeTime(ms: number): string {
  if (ms < 10_000) return "à l'instant";
  if (ms < 60_000) return `il y a ${Math.round(ms / 1000)} s`;
  if (ms < 3_600_000) return `il y a ${Math.round(ms / 60_000)} min`;
  if (ms < 86_400_000) return `il y a ${Math.round(ms / 3_600_000)} h`;
  return `il y a ${Math.round(ms / 86_400_000)} j`;
}
