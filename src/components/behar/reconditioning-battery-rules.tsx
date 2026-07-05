"use client";

// reconditioning-battery-rules — Paramètres › Batterie.
// Barème batterie PAR DÉFAUT : appliqué uniquement aux modèles sans règle
// spécifique. Chaque modèle configuré embarque son propre barème dans
// Catalogue de reprise → Configurer.

import { Battery } from "lucide-react";

import { safeNumber } from "@/lib/reconditioning-calc";
import { BATTERY_TIER_LABELS, useReconditioningRules } from "@/lib/reconditioning-pricing";
import { cn } from "@/lib/utils";

import { Toggle } from "./reconditioning-model-rules";
import { inputCls, SectionCard } from "./reconditioning-ui";

export function ReconditioningBatteryRules() {
  const rules = useReconditioningRules();
  const config = rules.defaultBattery;
  const modelCount = rules.modelRules.filter((r) => r.active && r.battery).length;

  return (
    <SectionCard
      subtitle="Appliqué quand un modèle n'a pas de règle spécifique. Les barèmes par modèle se règlent dans Catalogue de reprise → Configurer."
      title="Barème batterie par défaut"
    >
      <div className="max-w-[540px] rounded-[16px] border border-[#E8E5DF] p-3.5">
        <div className="flex items-center gap-2.5">
          <Battery className="size-4.5 shrink-0 text-[#2A9D8F]" />
          <span className="font-semibold text-[#1A1916] text-[14px]">Décote par tranche de santé</span>
        </div>

        <div className="mt-3 space-y-1.5">
          {BATTERY_TIER_LABELS.map((tier) => (
            <div className="flex items-center justify-between gap-3" key={tier.key}>
              <span className="text-[#1A1916] text-[12.5px]">{tier.label}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[#B4342A] text-[12px]">−</span>
                <input
                  className={cn(inputCls, "h-8 w-[76px] text-right text-[12px]")}
                  min={0}
                  onChange={(e) => rules.setDefaultBatteryTier(tier.key, safeNumber(e.target.value))}
                  type="number"
                  value={config.tiers[tier.key]}
                />
                <span className="text-[#6B6B6B] text-[12px]">€</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-2 border-[#F1F1EF] border-t pt-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#1A1916] text-[12.5px]">Remplacement batterie conseillé</span>
            <Toggle
              on={config.replacementAdvisedBelow > 0}
              onToggle={() =>
                rules.setDefaultBattery({ replacementAdvisedBelow: config.replacementAdvisedBelow > 0 ? 0 : 85 })
              }
            />
          </div>
          {config.replacementAdvisedBelow > 0 && (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#6B6B6B] text-[12.5px]">Conseillé sous</span>
                <div className="flex items-center gap-1.5">
                  <input
                    className={cn(inputCls, "h-8 w-[76px] text-right text-[12px]")}
                    max={100}
                    min={1}
                    onChange={(e) =>
                      rules.setDefaultBattery({
                        replacementAdvisedBelow: Math.max(1, Math.min(100, safeNumber(e.target.value))),
                      })
                    }
                    type="number"
                    value={config.replacementAdvisedBelow}
                  />
                  <span className="text-[#6B6B6B] text-[12px]">%</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#6B6B6B] text-[12.5px]">Décote supplémentaire remplacement</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#B4342A] text-[12px]">−</span>
                  <input
                    className={cn(inputCls, "h-8 w-[76px] text-right text-[12px]")}
                    min={0}
                    onChange={(e) =>
                      rules.setDefaultBattery({ replacementExtraDeduction: Math.max(0, safeNumber(e.target.value)) })
                    }
                    type="number"
                    value={config.replacementExtraDeduction}
                  />
                  <span className="text-[#6B6B6B] text-[12px]">€</span>
                </div>
              </div>
            </>
          )}
        </div>

        <p className="mt-3 text-[#9B9B96] text-[11.5px]">
          {modelCount > 0
            ? `${modelCount} modèle${modelCount > 1 ? "s ont" : " a"} un barème batterie spécifique.`
            : "Aucun modèle n'a encore de barème batterie spécifique."}
        </p>
      </div>
    </SectionCard>
  );
}
