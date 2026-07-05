"use client";

// reconditioning-defect-rules — Paramètres › Défauts.
// Barème défauts PAR DÉFAUT : appliqué uniquement aux modèles sans règle
// spécifique. Chaque modèle configuré embarque son propre barème dans
// Catalogue de reprise → Configurer.

import { ShieldAlert } from "lucide-react";

import { safeNumber } from "@/lib/reconditioning-calc";
import { type DefectAction, type DefectKey, DEFECT_LABELS, useReconditioningRules } from "@/lib/reconditioning-pricing";
import { cn } from "@/lib/utils";

import { Toggle } from "./reconditioning-model-rules";
import { inputCls, SectionCard, selectCls } from "./reconditioning-ui";

const DEFECT_KEYS = Object.keys(DEFECT_LABELS) as DefectKey[];

const ACTION_LABELS: Record<DefectAction, string> = {
  decote: "Décote",
  manual: "Validation manuelle",
  block: "Reprise impossible",
};

export function ReconditioningDefectRules() {
  const rules = useReconditioningRules();
  const modelCount = rules.modelRules.filter((r) => r.active && r.defects).length;

  return (
    <SectionCard
      subtitle="Appliqué quand un modèle n'a pas de règle spécifique. Les barèmes par modèle se règlent dans Catalogue de reprise → Configurer."
      title="Barème défauts par défaut"
    >
      <div className="max-w-[620px] rounded-[16px] border border-[#E8E5DF] p-3.5">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="size-4.5 shrink-0 text-[#2A9D8F]" />
          <span className="font-semibold text-[#1A1916] text-[14px]">Montant, action et activation par défaut</span>
        </div>

        <div className="mt-3 space-y-1">
          {DEFECT_KEYS.map((key) => {
            const entry = rules.defaultDefects[key];
            return (
              <div
                className={cn(
                  "flex flex-wrap items-center gap-2 rounded-[10px] px-2 py-1.5 transition",
                  entry.active ? "" : "opacity-45",
                )}
                key={key}
              >
                <span className="min-w-[150px] flex-1 text-[#1A1916] text-[12.5px]">{DEFECT_LABELS[key]}</span>
                {entry.action === "decote" && (
                  <div className="flex items-center gap-1">
                    <span className="text-[#B4342A] text-[12px]">−</span>
                    <input
                      className={cn(inputCls, "h-8 w-[72px] text-right text-[12px]")}
                      min={0}
                      onChange={(e) => rules.setDefaultDefectRule(key, { amount: safeNumber(e.target.value) })}
                      type="number"
                      value={entry.amount}
                    />
                    <span className="text-[#6B6B6B] text-[11.5px]">€</span>
                  </div>
                )}
                <select
                  className={cn(selectCls, "h-8 w-auto text-[11.5px]")}
                  onChange={(e) => rules.setDefaultDefectRule(key, { action: e.target.value as DefectAction })}
                  value={entry.action}
                >
                  {(Object.keys(ACTION_LABELS) as DefectAction[]).map((action) => (
                    <option key={action} value={action}>
                      {ACTION_LABELS[action]}
                    </option>
                  ))}
                </select>
                <Toggle on={entry.active} onToggle={() => rules.setDefaultDefectRule(key, { active: !entry.active })} />
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-[#9B9B96] text-[11.5px]">
          {modelCount > 0
            ? `${modelCount} modèle${modelCount > 1 ? "s ont" : " a"} un barème défauts spécifique.`
            : "Aucun modèle n'a encore de barème défauts spécifique."}
        </p>
      </div>
    </SectionCard>
  );
}
