"use client";

// reconditioning-settings — Paramètres du moteur de reprise, DANS le module
// Reconditionnement. Le catalogue appareils existant sert de base aux règles.

import { useState } from "react";

import { RotateCcw } from "lucide-react";

import { safeNumber } from "@/lib/reconditioning-calc";
import { useReconditioningRules } from "@/lib/reconditioning-pricing";
import { cn } from "@/lib/utils";

import { ReconditioningBatteryRules } from "./reconditioning-battery-rules";
import { ReconditioningBlockingRules } from "./reconditioning-blocking-rules";
import { ReconditioningDefectRules } from "./reconditioning-defect-rules";
import { ReconditioningModelRules } from "./reconditioning-model-rules";
import { ReconditioningPartsRules } from "./reconditioning-parts-rules";
import { GhostButton, InlineNumberField } from "./reconditioning-ui";

type SectionKey = "catalog" | "battery" | "defects" | "parts" | "blocking";

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "catalog", label: "Catalogue de reprise" },
  { key: "battery", label: "Batterie" },
  { key: "defects", label: "Défauts" },
  { key: "parts", label: "Pièces" },
  { key: "blocking", label: "Blocages" },
];

export function ReconditioningSettings() {
  const [section, setSection] = useState<SectionKey>("catalog");
  const rules = useReconditioningRules();

  return (
    <div className="space-y-4">
      {/* Sous-navigation + marges du moteur */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-[12px] border border-[#E4E7EC] bg-white p-1 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          {SECTIONS.map((s) => (
            <button
              className={cn(
                "h-8 whitespace-nowrap rounded-[9px] px-3 font-semibold text-[12px] transition",
                section === s.key
                  ? "bg-[#2A9D8F] text-white shadow-[0_2px_6px_rgba(42,157,143,0.24)]"
                  : "text-[#667085] hover:bg-[#F5F7FA] hover:text-[#101828]",
              )}
              key={s.key}
              onClick={() => setSection(s.key)}
              type="button"
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <InlineNumberField
            label="Marge cible"
            max={90}
            onChange={(value) => rules.setMargins({ targetMarginPct: safeNumber(value) })}
            suffix="%"
            value={rules.targetMarginPct}
            width="w-10"
          />
          <InlineNumberField
            label="Risque"
            max={50}
            onChange={(value) => rules.setMargins({ riskPct: safeNumber(value) })}
            suffix="%"
            value={rules.riskPct}
            width="w-9"
          />
          <GhostButton
            className="h-8 px-3 text-[12px]"
            onClick={() => {
              if (
                window.confirm(
                  "Rétablir toutes les règles de reprise par défaut ? Vos règles personnalisées seront perdues.",
                )
              ) {
                rules.reset();
              }
            }}
          >
            <RotateCcw className="size-3.5 text-[#667085]" />
            Valeurs par défaut
          </GhostButton>
        </div>
      </div>

      {section === "catalog" && <ReconditioningModelRules />}
      {section === "battery" && <ReconditioningBatteryRules />}
      {section === "defects" && <ReconditioningDefectRules />}
      {section === "parts" && <ReconditioningPartsRules />}
      {section === "blocking" && <ReconditioningBlockingRules />}
    </div>
  );
}
