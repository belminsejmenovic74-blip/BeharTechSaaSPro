"use client";

import { useMemo, useState } from "react";

import { brandsForType, deviceTypeLabels, modelsForBrand } from "@/lib/widget/global-catalog";

export function WidgetSelectorPreview() {
  const [device, setDevice] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const brands = useMemo(() => (device ? brandsForType(device) : []), [device]);
  const models = useMemo(() => (device && brand ? modelsForBrand(device, brand) : []), [device, brand]);
  const ready = Boolean(device && brand && model);

  return (
    <form className="grid w-full max-w-[1380px] overflow-hidden rounded-[22px] border border-[#E2E2DF] bg-white shadow-[0_16px_44px_rgba(20,24,28,.08)] lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(280px,.92fr)]">
      <SelectorField label="Quel appareil ?">
        <select
          aria-label="Quel appareil ?"
          value={device}
          onChange={(event) => {
            setDevice(event.target.value);
            setBrand("");
            setModel("");
          }}
        >
          <option value="">Choisissez un appareil</option>
          {deviceTypeLabels().map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
      </SelectorField>
      <SelectorField label="Quelle marque ?">
        <select
          aria-label="Quelle marque ?"
          value={brand}
          disabled={!device}
          onChange={(event) => {
            setBrand(event.target.value);
            setModel("");
          }}
        >
          <option value="">{device ? "Choisissez une marque" : "Choisissez d’abord un appareil"}</option>
          {brands.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
      </SelectorField>
      <SelectorField label="Quel modèle ?">
        <select
          aria-label="Quel modèle ?"
          value={model}
          disabled={!brand}
          onChange={(event) => setModel(event.target.value)}
        >
          <option value="">{brand ? "Choisissez un modèle" : "Choisissez d’abord une marque"}</option>
          {models.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
      </SelectorField>
      <button
        type="button"
        disabled={!ready}
        className="m-2.5 min-h-16 rounded-2xl border border-[#2A9D8F] bg-[#2A9D8F] px-6 text-base font-bold leading-tight text-white transition hover:bg-[#238579] disabled:cursor-not-allowed disabled:border-[#D8D8D4] disabled:bg-[#F4F4F2] disabled:text-[#999] lg:min-h-0"
      >
        Voir les réparations et les prix
      </button>
    </form>
  );
}

function SelectorField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid min-w-0 gap-1.5 border-b border-[#E8E8E5] bg-white px-6 py-5 text-[13px] font-semibold text-[#858D98] lg:border-r lg:border-b-0">
      {label}
      <span className="min-w-0 [&_select]:min-h-9 [&_select]:w-full [&_select]:cursor-pointer [&_select]:rounded-[10px] [&_select]:border [&_select]:border-transparent [&_select]:bg-white [&_select]:text-base [&_select]:font-bold [&_select]:text-[#152231] [&_select]:outline-none [&_select]:disabled:cursor-not-allowed [&_select]:disabled:text-[#B1B7BE] [&_select]:focus:border-[#2A9D8F] [&_select]:focus:ring-2 [&_select]:focus:ring-[#2A9D8F]/15">
        {children}
      </span>
    </label>
  );
}
