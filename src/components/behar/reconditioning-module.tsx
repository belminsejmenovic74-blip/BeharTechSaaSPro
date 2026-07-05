"use client";

// reconditioning-module — shell du module Reconditionnement.
// 4 espaces seulement : Vue d'ensemble · Appareils · Nouvelle reprise · Paramètres,
// plus la fiche appareil en surimpression de l'espace Appareils.

import { useEffect, useState } from "react";

import { Plus, Settings } from "lucide-react";

import { PageShell } from "@/components/behar/page-shell";
import { cn } from "@/lib/utils";

import { ReconditioningDashboard } from "./reconditioning-dashboard";
import { ReconditioningDeviceDetail } from "./reconditioning-device-detail";
import { ReconditioningDevices } from "./reconditioning-devices";
import { NewReconditioningIntakeWizard } from "./reconditioning-intake-wizard";
import { ReconditioningSettings } from "./reconditioning-settings";
import { ReconditioningWorkspace } from "./reconditioning-workspace";
import { AccentButton, GhostButton } from "./reconditioning-ui";

export type ReconditioningTab = "overview" | "devices" | "workshop" | "intake" | "settings";

const TABS: { key: ReconditioningTab; label: string }[] = [
  { key: "overview", label: "Vue d'ensemble" },
  { key: "devices", label: "Appareils" },
  { key: "workshop", label: "Atelier" },
  { key: "intake", label: "Nouvelle reprise" },
  { key: "settings", label: "Paramètres" },
];

export function ReconditioningModule({
  initialTab = "overview",
  initialDeviceId = null,
}: Readonly<{ initialTab?: ReconditioningTab; initialDeviceId?: string | null }>) {
  const [tab, setTab] = useState<ReconditioningTab>(initialTab);
  const [deviceId, setDeviceId] = useState<string | null>(initialDeviceId);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const openDevice = (id: string) => {
    setDeviceId(id);
    setTab("devices");
  };

  const subtitle =
    tab === "settings"
      ? "Mode de calcul, marges, grades et blocages — ces réglages pilotent le prix proposé."
      : "Suivez vos reprises, vos appareils en atelier et vos marges.";

  return (
    <PageShell
      actions={
        tab !== "intake" ? (
          <>
            <GhostButton onClick={() => setTab("settings")}>
              <Settings className="size-4" />
              Paramètres
            </GhostButton>
            <AccentButton
              onClick={() => {
                setDeviceId(null);
                setTab("intake");
              }}
            >
              <Plus className="size-4" />
              Nouvelle reprise
            </AccentButton>
          </>
        ) : undefined
      }
      subtitle={subtitle}
      title="Reconditionnement"
    >
      {/* Navigation des 4 espaces */}
      <div className="mb-4 flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-[13px] border border-[#E8E5DF] bg-white p-1 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
        {TABS.map((t) => (
          <button
            className={cn(
              "h-8 whitespace-nowrap rounded-[9px] px-3 font-semibold text-[12.5px] transition",
              tab === t.key
                ? "border border-[#D7EFEA] bg-[#ECF8F4] text-[#147065]"
                : "border border-transparent text-[#6B6B6B] hover:bg-[#F7F7F5] hover:text-[#1A1916]",
            )}
            key={t.key}
            onClick={() => {
              setTab(t.key);
              if (t.key !== "devices") setDeviceId(null);
            }}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      {!mounted ? (
        <div className="h-[480px] animate-pulse rounded-[20px] border border-[#E8E5DF] bg-white" />
      ) : (
        <>
          {tab === "overview" && (
            <ReconditioningDashboard
              onNewIntake={() => setTab("intake")}
              onOpenDevice={openDevice}
              onShowDevices={() => {
                setDeviceId(null);
                setTab("devices");
              }}
            />
          )}
          {tab === "devices" &&
            (deviceId ? (
              <ReconditioningDeviceDetail fileId={deviceId} onBack={() => setDeviceId(null)} />
            ) : (
              <ReconditioningDevices onNewIntake={() => setTab("intake")} onOpenDevice={openDevice} />
            ))}
          {tab === "workshop" && <ReconditioningWorkspace />}
          {tab === "intake" && (
            <NewReconditioningIntakeWizard onClose={() => setTab("overview")} onOpenDevice={openDevice} />
          )}
          {tab === "settings" && <ReconditioningSettings />}
        </>
      )}
    </PageShell>
  );
}
