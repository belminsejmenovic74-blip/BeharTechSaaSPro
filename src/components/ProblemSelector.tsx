"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import { getDefaultInterventionsByDeviceType, type InterventionDeviceType } from "../lib/repair-intervention";
import { Input } from "./ui/input";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";

const CUSTOM_VALUE = "__custom__";

const VALID_TYPES: InterventionDeviceType[] = ["Smartphone", "Tablette", "Ordinateur", "Console", "Autre"];

function normalizeType(type: string): InterventionDeviceType {
  return (VALID_TYPES.includes(type as InterventionDeviceType) ? type : "Smartphone") as InterventionDeviceType;
}

interface ProblemSelectorProps {
  deviceType: string;
  value: string;
  onChange: (problem: string) => void;
  className?: string;
  label?: string;
}

export function ProblemSelector({ deviceType, value, onChange, className, label = "Problème" }: ProblemSelectorProps) {
  const options = getDefaultInterventionsByDeviceType(normalizeType(deviceType));
  const inList = value.trim() !== "" && options.includes(value);
  const [customMode, setCustomMode] = useState(value.trim() !== "" && !inList);

  const showCustom = customMode || (value.trim() !== "" && !inList);
  const selectValue = showCustom ? CUSTOM_VALUE : inList ? value : "";

  const handleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    if (next === CUSTOM_VALUE) {
      setCustomMode(true);
      return;
    }
    setCustomMode(false);
    onChange(next);
  };

  return (
    <div className={cn("grid gap-1.5 w-full", className)}>
      {label ? <label className="text-sm font-medium text-[#101828]">{label}</label> : null}
      <NativeSelect className="w-full" value={selectValue} onChange={handleSelect}>
        <NativeSelectOption value="">— Choisir un problème —</NativeSelectOption>
        {options.map((option) => (
          <NativeSelectOption key={option} value={option}>
            {option}
          </NativeSelectOption>
        ))}
        <NativeSelectOption value={CUSTOM_VALUE}>Autre (préciser)</NativeSelectOption>
      </NativeSelect>

      {showCustom && (
        <Input
          className="h-10 rounded-xl border-[#E4E7EC] focus:border-[#2A9D8F]/60 focus:ring-[#2A9D8F]/10"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Décrire le problème…"
        />
      )}
    </div>
  );
}
