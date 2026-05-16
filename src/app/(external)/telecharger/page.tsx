"use client";

import { ArrowRight, MonitorSmartphone, Apple, HardDrive } from "lucide-react";

export default function DownloadPage() {
  // Tant qu'aucun vrai installateur signé n'est publié, on ne propose pas de
  // faux téléchargements. Les boutons restent désactivés et un CTA principal
  // dirige vers la version web.
  const desktopReady = false;

  return (
    <div className="min-h-svh bg-[#FAFAF8] flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-[480px] text-center">
        <div className="mb-10 flex items-baseline justify-center gap-1.5">
          <span className="text-[18px] font-bold tracking-[-0.02em] text-[#1A1916]">
            BEHAR
          </span>
          <span className="-mt-px text-[8px] text-[#2A9D8F]">●</span>
          <span className="text-[18px] font-bold tracking-[-0.02em] text-[#1A1916]">
            TECH
          </span>
          <span className="ml-1.5 rounded-full border border-[#2A9D8F]/40 px-1.5 py-0 text-[10px] font-bold text-[#147065]">
            PRO
          </span>
        </div>

        <h1 className="font-bold text-[#1A1916] text-[34px] tracking-[-0.02em] leading-tight">
          Télécharger Behar Tech Pro
        </h1>

        <p className="mt-4 text-[14px] leading-6 text-[#6B6B6B]">
          Application installable pour atelier de réparation.
        </p>

        {/* CTA principal — version navigateur, toujours disponible */}
        <div className="mt-10 grid gap-2.5">
          <a
            href="/dashboard"
            className="group inline-flex h-14 items-center justify-center gap-3 rounded-[14px] bg-[#1A1916] text-[15px] font-semibold text-white shadow-[0_4px_16px_rgba(26,25,22,0.15)] transition hover:bg-[#2A2922] active:scale-[0.98]"
          >
            <span>Ouvrir Behar Tech Pro dans le navigateur</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
          </a>
        </div>

        {/* Boutons desktop — désactivés tant qu'il n'y a pas de vrai installateur */}
        <div className="mt-6 grid gap-2.5">
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Version desktop bientôt disponible"
            className="inline-flex h-14 cursor-not-allowed items-center justify-center gap-3 rounded-[14px] border border-[#E7E4DC] bg-[#F5F4F0] text-[15px] font-semibold text-[#A09F9A] opacity-80"
          >
            <MonitorSmartphone className="size-5" strokeWidth={1.8} />
            <span>Windows — bientôt disponible</span>
          </button>

          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Version desktop bientôt disponible"
            className="inline-flex h-14 cursor-not-allowed items-center justify-center gap-3 rounded-[14px] border border-[#E7E4DC] bg-[#F5F4F0] text-[15px] font-semibold text-[#A09F9A] opacity-80"
          >
            <Apple className="size-5" strokeWidth={1.8} />
            <span>Mac — bientôt disponible</span>
          </button>

          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Version desktop bientôt disponible"
            className="inline-flex h-14 cursor-not-allowed items-center justify-center gap-3 rounded-[14px] border border-[#E7E4DC] bg-[#F5F4F0] text-[15px] font-semibold text-[#A09F9A] opacity-80"
          >
            <HardDrive className="size-5" strokeWidth={1.8} />
            <span>Linux — bientôt disponible</span>
          </button>

          <p className="mt-2 text-[12px] text-[#6B6B6B]">
            Version desktop bientôt disponible — utilisez la version navigateur en attendant.
          </p>
        </div>

        {/* Hint développeur : quand `desktopReady` passera à true et que les vrais
            installateurs signés seront dans /public/downloads/, restaurer les
            <a href="/downloads/Behar-Tech-Pro-Setup.exe" download> etc. */}
        {desktopReady ? null : null}

        <p className="mt-10 text-xs text-[#6B6B6B]">Version actuelle : 1.0.0</p>
      </div>
    </div>
  );
}
