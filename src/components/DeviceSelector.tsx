"use client";

import type * as React from "react";

import { cn } from "@/lib/utils";

import { type DeviceCategory, getDeviceBrands, getModelsByBrand } from "../data/deviceCatalog";
import { Input } from "./ui/input";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";

// Mapping between store types and catalog categories
const typeToCategory: Record<string, DeviceCategory> = {
  Smartphone: "smartphone",
  smartphone: "smartphone",
  Tablette: "tablet",
  tablet: "tablet",
  Ordinateur: "computer",
  computer: "computer",
  Console: "console",
  console: "console",
};

const categoryToType: Record<DeviceCategory, string> = {
  smartphone: "Smartphone",
  tablet: "Tablette",
  computer: "Ordinateur",
  console: "Console",
};

interface DeviceSelectorProps {
  deviceType: string;
  brand: string;
  model: string;
  customModel: string;
  onChange: (updates: {
    deviceType: string;
    brand: string;
    model: string;
    customModel: string;
    deviceLabel: string;
  }) => void;
  className?: string;
}

export function DeviceSelector({ deviceType, brand, model, customModel, onChange, className }: DeviceSelectorProps) {
  const category = typeToCategory[deviceType] || "smartphone";
  const brands = getDeviceBrands(category);
  const models = getModelsByBrand(brand, category);

  const calculateLabel = (b: string, m: string, c: string) => {
    const finalModel = m === "Autre" ? c : m;
    return `${b} ${finalModel}`.trim();
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value as DeviceCategory;
    const newType = categoryToType[newCategory];
    const newBrands = getDeviceBrands(newCategory);
    const firstBrand = newBrands[0]?.brand || "";
    const newModels = getModelsByBrand(firstBrand, newCategory);
    const firstModel = newModels[0] || "Autre";

    onChange({
      deviceType: newType,
      brand: firstBrand,
      model: firstModel,
      customModel: "",
      deviceLabel: calculateLabel(firstBrand, firstModel, ""),
    });
  };

  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBrand = e.target.value;
    const newModels = getModelsByBrand(newBrand, category);
    const firstModel = newModels[0] || "Autre";

    onChange({
      deviceType,
      brand: newBrand,
      model: firstModel,
      customModel: "",
      deviceLabel: calculateLabel(newBrand, firstModel, ""),
    });
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    onChange({
      deviceType,
      brand,
      model: newModel,
      customModel: newModel === "Autre" ? customModel : "",
      deviceLabel: calculateLabel(brand, newModel, customModel),
    });
  };

  const handleCustomModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCustom = e.target.value;
    onChange({
      deviceType,
      brand,
      model,
      customModel: newCustom,
      deviceLabel: calculateLabel(brand, model, newCustom),
    });
  };

  return (
    <div className={cn("grid gap-4 w-full", className)}>
      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-[#1A1916]">Type d'appareil</label>
        <NativeSelect className="w-full" value={category} onChange={handleCategoryChange}>
          <NativeSelectOption value="smartphone">Smartphone</NativeSelectOption>
          <NativeSelectOption value="tablet">Tablette</NativeSelectOption>
          <NativeSelectOption value="computer">Ordinateur</NativeSelectOption>
          <NativeSelectOption value="console">Console</NativeSelectOption>
        </NativeSelect>
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-[#1A1916]">Marque</label>
        <NativeSelect className="w-full" value={brand} onChange={handleBrandChange}>
          {brands.map((b) => (
            <NativeSelectOption key={b.brand} value={b.brand}>
              {b.brand}
            </NativeSelectOption>
          ))}
          <NativeSelectOption value="Autre">Autre</NativeSelectOption>
        </NativeSelect>
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-[#1A1916]">Modèle</label>
        <NativeSelect className="w-full" value={model} onChange={handleModelChange}>
          {models.map((m) => (
            <NativeSelectOption key={m} value={m}>
              {m}
            </NativeSelectOption>
          ))}
          {!models.includes("Autre") && <NativeSelectOption value="Autre">Autre</NativeSelectOption>}
        </NativeSelect>
      </div>

      {model === "Autre" && (
        <div className="grid gap-1.5">
          <label className="text-sm font-medium text-[#1A1916]">Modèle personnalisé</label>
          <Input
            className="h-10 rounded-xl border-[#E7E4DC] focus:border-[#2A9D8F]/60 focus:ring-[#2A9D8F]/10"
            value={customModel}
            onChange={handleCustomModelChange}
            placeholder="Ex: iPhone inconnu"
          />
        </div>
      )}

      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-[#1A1916]">Appareil final</label>
        <Input
          className="h-10 rounded-xl border-[#E7E4DC] bg-[#FAFAF8] text-[#6B6B6B]"
          value={calculateLabel(brand, model, customModel)}
          readOnly
          disabled
        />
      </div>
    </div>
  );
}
