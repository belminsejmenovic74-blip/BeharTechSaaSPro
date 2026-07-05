"use client";

// reconditioning-devices — onglet Appareils complet, table premium + filtres.

import { useMemo, useState } from "react";

import { Plus, RotateCcw, Search, Smartphone } from "lucide-react";

import { getDeviceLocation } from "@/lib/reconditioning-formatters";
import type { ReconditioningFile } from "@/lib/reconditioning-store";
import { useReconditioningStore } from "@/lib/reconditioning-store";
import { getEffectiveDeviceStatus } from "@/lib/reconditioning-status";
import { getDeviceDisplayName, getDeviceGrade, getDeviceSubtitle } from "@/lib/reconditioning-validation";
import { cn } from "@/lib/utils";

import { ReconditioningDevicesTable } from "./reconditioning-device-table";
import { AccentButton, EmptyState, GhostButton, inputCls, SectionHeader, selectCls } from "./reconditioning-ui";

const norm = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

export function ReconditioningDevices({
  onNewIntake,
  onOpenDevice,
}: Readonly<{ onNewIntake: () => void; onOpenDevice: (id: string) => void }>) {
  const files = useReconditioningStore((state) => state.files);
  const [query, setQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [storageFilter, setStorageFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  const ordered = useMemo(
    () =>
      [...files].sort(
        (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime(),
      ),
    [files],
  );

  const brands = useMemo(() => unique(ordered.map((file) => file.brand).filter(Boolean)), [ordered]);
  const models = useMemo(
    () =>
      unique(
        ordered
          .filter((file) => !brandFilter || file.brand === brandFilter)
          .map((file) => file.model)
          .filter(Boolean),
      ),
    [ordered, brandFilter],
  );
  const storages = useMemo(() => unique(ordered.map((file) => file.storage).filter(Boolean)), [ordered]);
  const statuses = useMemo(() => unique(ordered.map(getEffectiveDeviceStatus)), [ordered]);
  const grades = useMemo(() => unique(ordered.map(getDeviceGrade).filter(Boolean)), [ordered]);
  const locations = useMemo(
    () => unique(ordered.map(getDeviceLocation).filter((location) => location !== "—")),
    [ordered],
  );

  const visible = useMemo(() => {
    const q = norm(query.trim());
    return ordered.filter((file) => {
      if (brandFilter && file.brand !== brandFilter) return false;
      if (modelFilter && file.model !== modelFilter) return false;
      if (storageFilter && file.storage !== storageFilter) return false;
      if (statusFilter && getEffectiveDeviceStatus(file) !== statusFilter) return false;
      if (gradeFilter && getDeviceGrade(file) !== gradeFilter) return false;
      if (locationFilter && getDeviceLocation(file) !== locationFilter) return false;
      if (!q) return true;
      const haystack = norm(
        [
          getDeviceDisplayName(file),
          getDeviceSubtitle(file),
          file.customerName,
          file.supplierName,
          file.source,
          file.imei,
          file.serial,
          file.number,
          getEffectiveDeviceStatus(file),
        ]
          .filter(Boolean)
          .join(" "),
      );
      return haystack.includes(q);
    });
  }, [ordered, query, brandFilter, modelFilter, storageFilter, statusFilter, gradeFilter, locationFilter]);

  const resetFilters = () => {
    setQuery("");
    setBrandFilter("");
    setModelFilter("");
    setStorageFilter("");
    setStatusFilter("");
    setGradeFilter("");
    setLocationFilter("");
  };

  const filtersActive = Boolean(
    query || brandFilter || modelFilter || storageFilter || statusFilter || gradeFilter || locationFilter,
  );

  return (
    <div className="space-y-3.5">
      <SectionHeader
        action={
          <AccentButton onClick={onNewIntake}>
            <Plus className="size-4" />
            Nouvelle reprise
          </AccentButton>
        }
        subtitle="Du diagnostic jusqu'à la vente, avec les fiches à compléter isolées des vrais indicateurs."
        title="Tous les appareils repris"
      />

      <div className="rounded-[18px] border border-[#E8E5DF] bg-white p-3 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-[minmax(240px,1.4fr)_repeat(6,minmax(112px,0.8fr))_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[#9B9B96]" />
            <input
              className={cn(inputCls, "pl-9")}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher appareil, client, IMEI..."
              value={query}
            />
          </label>
          <FilterSelect
            label="Marque"
            onChange={(value) => {
              setBrandFilter(value);
              setModelFilter("");
            }}
            options={brands}
            value={brandFilter}
          />
          <FilterSelect label="Modèle" onChange={setModelFilter} options={models} value={modelFilter} />
          <FilterSelect label="Stockage" onChange={setStorageFilter} options={storages} value={storageFilter} />
          <FilterSelect label="Statut" onChange={setStatusFilter} options={statuses} value={statusFilter} />
          <FilterSelect label="Grade" onChange={setGradeFilter} options={grades} value={gradeFilter} />
          <FilterSelect label="Localisation" onChange={setLocationFilter} options={locations} value={locationFilter} />
          <GhostButton className="px-3 disabled:opacity-40" disabled={!filtersActive} onClick={resetFilters}>
            <RotateCcw className="size-3.5 text-[#2A9D8F]" />
            Réinitialiser
          </GhostButton>
        </div>
      </div>

      {files.length === 0 ? (
        <EmptyState
          action={<AccentButton onClick={onNewIntake}>Nouvelle reprise</AccentButton>}
          description="Les appareils repris apparaîtront ici, du diagnostic jusqu'à la vente."
          icon={Smartphone}
          title="Aucun appareil repris"
        />
      ) : (
        <>
          <p className="text-[#6B6B6B] text-[12.5px]">
            {visible.length} appareil{visible.length > 1 ? "s" : ""} affiché{visible.length > 1 ? "s" : ""}
            {filtersActive ? ` sur ${files.length}` : ""}
          </p>

          <ReconditioningDevicesTable files={visible} mode="full" onOpenDevice={onOpenDevice} />
        </>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: Readonly<{ label: string; value: string; options: string[]; onChange: (value: string) => void }>) {
  return (
    <select
      className={cn(
        selectCls,
        "min-w-0 text-[12.5px]",
        value ? "border-[#2A9D8F]/45 text-[#1A1916]" : "text-[#6B6B6B]",
      )}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function unique(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "fr"));
}
