"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";
import Link from "next/link";

import { LayoutDashboard, LogOut, Sparkles, Store, Wrench } from "lucide-react";

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
  const hasPermission = useBeharStore((s) => s.hasPermission);
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
    <div className="behar-app fixed inset-0 z-50 flex h-svh w-svw flex-col bg-white text-[#101828]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-[#E4E7EC] border-b bg-white px-6 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.035)] lg:px-10">
        <div className="flex items-center gap-5">
          <BeharLogo size="sm" />
          <span className="hidden h-8 items-center gap-2 rounded-[10px] border border-[#D7EFEA] bg-[#FFFFFF] px-3 font-semibold text-[#167B70] text-[13px] md:inline-flex">
            <Wrench className="size-4" />
            Mode atelier
          </span>
        </div>

        <div className="flex items-center gap-3">
          {hasPermission("canViewDashboard") ? (
            <Link
              href="/dashboard"
              className="hidden h-10 items-center gap-2 rounded-[10px] border border-[#E4E7EC] bg-white px-3.5 text-[13px] font-medium text-[#4F4F4B] transition hover:border-[#CFE9E4] hover:text-[#167B70] sm:inline-flex"
            >
              <LayoutDashboard className="size-4" /> Dashboard
            </Link>
          ) : null}
          {hasPermission("canAccessCounter") ? (
            <Link
              href="/comptoir"
              className="hidden h-10 items-center gap-2 rounded-[10px] border border-[#E4E7EC] bg-white px-3.5 text-[13px] font-medium text-[#4F4F4B] transition hover:border-[#CFE9E4] hover:text-[#167B70] md:inline-flex"
            >
              <Store className="size-4" /> Comptoir
            </Link>
          ) : null}
          <span className="hidden h-10 items-center rounded-[10px] border border-[#E4E7EC] bg-white px-4 text-[#667085] text-[13px] sm:inline-flex">
            {currentUser.name} · {currentUser.role}
          </span>
          <span className="min-w-[54px] text-center font-medium tabular-nums text-[14px]">
            {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#E4E7EC] bg-white px-4 font-medium text-[14px] transition active:scale-[0.97]"
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
              <h1 className="font-semibold text-[#101828] text-[28px] leading-tight tracking-tight lg:text-[34px]">
                {mode === "reparations" ? "File d'attente atelier" : "File de reconditionnement atelier"}
              </h1>
              <p className="mt-1 text-[#667085] text-sm">
                {mode === "reparations"
                  ? "Reçu, diagnostic, attente, réparation, test final et prêt."
                  : "Rachat, diagnostic, remise en état, contrôle final et mise en vente."}
              </p>
            </div>
            <div className="inline-flex h-11 items-center self-start rounded-[12px] border border-[#E4E7EC] bg-white p-1 shadow-[0_1px_2px_rgba(16,24,40,0.035)]">
              {(
                [
                  ["reparations", "Réparations", Wrench],
                  ["reconditionnement", "Reconditionnement", Sparkles],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-[9px] px-3.5 font-semibold text-[13px] transition",
                    mode === key
                      ? "bg-[#2A9D8F] text-white shadow-[0_1px_2px_rgba(42,157,143,0.25)]"
                      : "text-[#667085] hover:text-[#101828]",
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

      <footer className="shrink-0 border-[#E4E7EC] border-t bg-white px-6 py-3 text-center text-[#667085] text-[11px] lg:px-10">
        {workshopInfo.name} · Behar Tech Pro
      </footer>
    </div>
  );
}
