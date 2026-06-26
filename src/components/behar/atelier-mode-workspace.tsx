"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { LogOut, Sparkles, Wrench } from "lucide-react";

import { AtelierWorkspace } from "@/components/behar/atelier-workspace";
import { BeharLogo } from "@/components/behar/behar-logo";
import { ReconditioningWorkspace } from "@/components/behar/reconditioning-workspace";
import { useBeharStore } from "@/lib/behar-store";
import { cn } from "@/lib/utils";

export function AtelierModeWorkspace() {
  const router = useRouter();
  const currentUser = useBeharStore((s) => s.currentUser);
  const workshopInfo = useBeharStore((s) => s.workshopInfo);
  const logout = useBeharStore((s) => s.logout);
  const addAuditLog = useBeharStore((s) => s.addAuditLog);
  const [now, setNow] = useState(() => new Date());
  const [mode, setMode] = useState<"reparations" | "reconditionnement">("reparations");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    addAuditLog({
      action: "atelier.opened",
      targetType: "atelier",
      targetId: "workshop-station",
      message: "a ouvert le mode Atelier",
    });
  }, [addAuditLog]);

  return (
    <div className="fixed inset-0 z-50 flex h-svh w-svw flex-col bg-white text-[#1A1916]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-[#E8E8E5] border-b bg-white px-6 py-4 shadow-[0_1px_2px_rgba(26,25,22,0.035)] backdrop-blur lg:px-10">
        <div className="flex items-center gap-5">
          <BeharLogo size="sm" />
          <span className="hidden h-8 items-center gap-2 rounded-[10px] border border-[#D7EFEA] bg-[#FFFFFF] px-3 font-semibold text-[#167B70] text-[13px] md:inline-flex">
            <Wrench className="size-4" />
            Mode atelier
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden h-10 items-center rounded-[10px] border border-[#E8E8E5] bg-white px-4 text-[#6B6B6B] text-[13px] sm:inline-flex">
            {currentUser.name} · {currentUser.role}
          </span>
          <span className="min-w-[54px] text-center font-medium tabular-nums text-[14px]">
            {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#E8E8E5] bg-white px-4 font-medium text-[14px] transition active:scale-[0.97]"
            onClick={() => {
              logout();
              router.push("/atelier");
            }}
            title="Quitter le mode atelier"
            type="button"
          >
            <LogOut className="size-4" />
            Quitter
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6 lg:px-8 lg:py-7">
        <div className="mx-auto w-full max-w-[1680px]">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-semibold text-[#1A1916] text-[28px] leading-tight tracking-tight lg:text-[34px]">
                {mode === "reparations" ? "File d'attente atelier" : "Reconditionnement"}
              </h1>
              <p className="mt-1 text-[#6B6B6B] text-sm">
                {mode === "reparations"
                  ? "Reçu, diagnostic, attente, réparation, test final et prêt."
                  : "Rachat, remise en état, contrôle qualité et certificat de reconditionnement."}
              </p>
            </div>
            <div className="inline-flex h-11 items-center self-start rounded-[12px] border border-[#E8E8E5] bg-white p-1 shadow-[0_1px_2px_rgba(26,25,22,0.035)]">
              {(
                [
                  ["reparations", "Réparations", Wrench],
                  ["reconditionnement", "Reconditionnement", Sparkles],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-[9px] px-3.5 font-semibold text-[13px] transition",
                    mode === key ? "bg-[#2A9D8F] text-white shadow-[0_1px_2px_rgba(42,157,143,0.25)]" : "text-[#6B6B6B] hover:text-[#1A1916]",
                  )}
                  key={key}
                  onClick={() => setMode(key)}
                  type="button"
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {mode === "reparations" ? <AtelierWorkspace /> : <ReconditioningWorkspace />}
        </div>
      </main>

      <footer className="shrink-0 border-[#E8E8E5] border-t bg-white px-6 py-3 text-center text-[#6B6B6B] text-[11px] backdrop-blur lg:px-10">
        {workshopInfo.name} · Behar Tech Pro
      </footer>
    </div>
  );
}
