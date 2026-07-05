"use client";

// reconditioning-blocking-rules — Paramètres › Blocages.
// Règles critiques globales (iCloud, IMEI…). Les défauts « Réseau HS », « Face ID HS »…
// se surchargent PAR MODÈLE via l'action de chaque profil défauts.

import { ShieldAlert } from "lucide-react";

import { BLOCKER_LABELS, type BlockerKey, useReconditioningRules } from "@/lib/reconditioning-pricing";
import { cn } from "@/lib/utils";

import { Toggle } from "./reconditioning-model-rules";
import { SectionCard, selectCls } from "./reconditioning-ui";

const BLOCKER_KEYS = Object.keys(BLOCKER_LABELS) as BlockerKey[];

export function ReconditioningBlockingRules() {
  const rules = useReconditioningRules();

  return (
    <SectionCard
      subtitle="Règles appliquées automatiquement pendant la reprise. Pour un blocage propre à un modèle (ex. Réseau HS sur Galaxy S21), changez l'action du défaut dans son profil défauts."
      title="Blocages critiques"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {BLOCKER_KEYS.map((key) => {
          const blocker = rules.blockers.find((b) => b.key === key);
          if (!blocker) return null;
          return (
            <div
              className={cn(
                "flex items-center justify-between gap-3 rounded-[16px] border p-4",
                blocker.active ? "border-[#E8E5DF] bg-white" : "border-[#E8E5DF] bg-[#F7F7F5] opacity-70",
              )}
              key={key}
            >
              <div className="flex min-w-0 items-center gap-3">
                <ShieldAlert
                  className={cn("size-4.5 shrink-0", blocker.action === "block" ? "text-[#B4342A]" : "text-[#9A6B1B]")}
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#1A1916] text-[13px]">{BLOCKER_LABELS[key]}</p>
                  <p className="text-[#9B9B96] text-[11.5px]">
                    {blocker.action === "block" ? "Reprise impossible" : "Validation manuelle requise"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <select
                  className={cn(selectCls, "h-9 w-auto text-[12px]")}
                  disabled={!blocker.active}
                  onChange={(e) => rules.setBlocker(key, { action: e.target.value as "block" | "manual" })}
                  value={blocker.action}
                >
                  <option value="block">Reprise impossible</option>
                  <option value="manual">Validation manuelle</option>
                </select>
                <Toggle on={blocker.active} onToggle={() => rules.setBlocker(key, { active: !blocker.active })} />
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
