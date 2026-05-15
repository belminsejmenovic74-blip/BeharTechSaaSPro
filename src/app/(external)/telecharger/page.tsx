"use client";

import { ArrowRight, Download, MonitorSmartphone, Apple, HardDrive } from "lucide-react";

const APP_URL = "https://behartechpro.fr/";

const DOWNLOADS = {
  windows: "/telecharger/Behar-Tech-Pro-Setup.exe",
  mac: "/telecharger/Behar-Tech-Pro-Mac.dmg",
  linux: "/telecharger/Behar-Tech-Pro-Linux.deb",
};

export default function DownloadPage() {
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

        <div className="mt-10 grid gap-2.5">
          <a
            href={DOWNLOADS.windows}
            download
            className="group inline-flex h-14 items-center justify-center gap-3 rounded-[14px] bg-[#1A1916] text-[15px] font-semibold text-white shadow-[0_4px_16px_rgba(26,25,22,0.15)] transition hover:bg-[#2A2922] active:scale-[0.98]"
          >
            <MonitorSmartphone className="size-5" strokeWidth={1.8} />
            <span>Télécharger pour Windows</span>
            <Download className="size-4 transition-transform group-hover:translate-y-0.5" strokeWidth={2} />
          </a>

          <a
            href={DOWNLOADS.mac}
            download
            className="group inline-flex h-14 items-center justify-center gap-3 rounded-[14px] border border-[#E7E4DC] bg-white text-[15px] font-semibold text-[#1A1916] transition hover:border-[#1A1916]/30 hover:bg-[#FAFAF8] active:scale-[0.98]"
          >
            <Apple className="size-5" strokeWidth={1.8} />
            <span>Télécharger pour Mac</span>
            <Download className="size-4 transition-transform group-hover:translate-y-0.5" strokeWidth={2} />
          </a>

          <a
            href={DOWNLOADS.linux}
            download
            className="group inline-flex h-14 items-center justify-center gap-3 rounded-[14px] border border-[#E7E4DC] bg-white text-[15px] font-semibold text-[#1A1916] transition hover:border-[#1A1916]/30 hover:bg-[#FAFAF8] active:scale-[0.98]"
          >
            <HardDrive className="size-5" strokeWidth={1.8} />
            <span>Télécharger pour Linux</span>
            <Download className="size-4 transition-transform group-hover:translate-y-0.5" strokeWidth={2} />
          </a>
        </div>

        <div className="mt-8 border-t border-[#F1F1EF] pt-6">
          <a
            href={APP_URL}
            className="inline-flex items-center gap-1.5 text-[13px] text-[#6B6B6B] transition-colors hover:text-[#1A1916]"
          >
            Utiliser dans le navigateur <ArrowRight className="size-3.5" />
          </a>
        </div>

        <p className="mt-6 text-xs text-[#6B6B6B]">
          Version actuelle : 1.0.0
        </p>
      </div>
    </div>
  );
}