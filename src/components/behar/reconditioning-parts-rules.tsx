"use client";

// reconditioning-parts-rules — Paramètres › Pièces.
// Coûts de pièces PAR DÉFAUT : appliqués uniquement aux modèles sans règle
// spécifique. Les coûts par modèle (reliés au stock réel) se règlent dans
// Catalogue de reprise → Configurer. Un prix vide = « À renseigner »,
// jamais 0 € par défaut.

import { Wrench } from "lucide-react";

import { formatMoney } from "@/lib/reconditioning-calc";
import { isPriceKnown, PART_LABELS, type PartKey, useReconditioningRules } from "@/lib/reconditioning-pricing";
import { cn } from "@/lib/utils";

import { Toggle } from "./reconditioning-model-rules";
import { inputCls, SectionCard } from "./reconditioning-ui";

const PART_KEYS = Object.keys(PART_LABELS) as PartKey[];

const parseMoney = (raw: string): number | null => {
  const value = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null;
};

export function ReconditioningPartsRules() {
  const rules = useReconditioningRules();
  const modelCount = rules.modelRules.filter((r) => r.active && r.parts).length;

  return (
    <SectionCard
      subtitle="Appliqués quand un modèle n'a pas de règle spécifique. Les coûts par modèle, reliés au stock, se règlent dans Catalogue de reprise → Configurer."
      title="Coûts de pièces par défaut"
    >
      <div className="max-w-[620px] rounded-[16px] border border-[#E4E7EC] p-3.5">
        <div className="flex items-center gap-2.5">
          <Wrench className="size-4.5 shrink-0 text-[#2A9D8F]" />
          <span className="font-semibold text-[#101828] text-[14px]">Coût pièce + main-d'œuvre</span>
        </div>

        <div className="mt-3 space-y-1">
          {PART_KEYS.map((key) => {
            const entry = rules.defaultParts[key];
            const total = isPriceKnown(entry.piece) ? entry.piece + Math.max(0, entry.labor ?? 0) : null;
            return (
              <div
                className={cn(
                  "flex flex-wrap items-center gap-2 rounded-[10px] px-2 py-1.5",
                  !entry.active && "opacity-45",
                )}
                key={key}
              >
                <span className="min-w-[120px] flex-1 text-[#101828] text-[12.5px]">{PART_LABELS[key]}</span>
                <label className="flex items-center gap-1 text-[#667085] text-[11.5px]">
                  Pièce
                  <input
                    className={cn(
                      inputCls,
                      "h-8 w-[76px] text-right text-[12px]",
                      entry.piece == null && "border-[#F0D9D6]",
                    )}
                    inputMode="decimal"
                    onChange={(e) => rules.setDefaultPartCost(key, { piece: parseMoney(e.target.value) })}
                    placeholder="—"
                    value={entry.piece ?? ""}
                  />
                </label>
                <label className="flex items-center gap-1 text-[#667085] text-[11.5px]">
                  MO
                  <input
                    className={cn(inputCls, "h-8 w-[68px] text-right text-[12px]")}
                    inputMode="decimal"
                    onChange={(e) =>
                      rules.setDefaultPartCost(key, {
                        labor: parseMoney(e.target.value) ?? (e.target.value.trim() === "0" ? 0 : null),
                      })
                    }
                    placeholder="—"
                    value={entry.labor ?? ""}
                  />
                </label>
                <span
                  className={cn(
                    "w-[86px] text-right font-semibold text-[12.5px]",
                    total != null ? "text-[#101828]" : "text-[#B4342A]",
                  )}
                >
                  {total != null ? formatMoney(total) : "À renseigner"}
                </span>
                <Toggle on={entry.active} onToggle={() => rules.setDefaultPartCost(key, { active: !entry.active })} />
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-[#98A2B3] text-[11.5px]">
          {modelCount > 0
            ? `${modelCount} modèle${modelCount > 1 ? "s ont" : " a"} des coûts pièces spécifiques (reliés au stock).`
            : "Aucun modèle n'a encore de coûts pièces spécifiques."}
        </p>
      </div>
    </SectionCard>
  );
}
