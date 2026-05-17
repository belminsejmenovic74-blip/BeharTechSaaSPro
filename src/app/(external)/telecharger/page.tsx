"use client";

import { Apple, ArrowRight, Download, MonitorSmartphone } from "lucide-react";

const releaseBase =
  "https://github.com/belminsejmenovic74-blip/BeharTechSaaSPro/releases/latest/download";

const desktopDownloads = [
  {
    label: "Télécharger pour Windows",
    detail: "Installateur .exe",
    href: `${releaseBase}/BeharTechPro_1.0.0_x64-setup.exe`,
    icon: MonitorSmartphone,
  },
  {
    label: "Télécharger pour Mac",
    detail: "Image disque .dmg",
    href: `${releaseBase}/BeharTechPro_1.0.0_universal.dmg`,
    icon: Apple,
  },
];

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
          Application installable pour atelier de réparation, avec accès direct à votre espace Behar Tech Pro.
        </p>

        <div className="mt-10 grid gap-2.5">
          {desktopDownloads.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                className="group inline-flex min-h-16 items-center justify-between gap-4 rounded-[14px] bg-[#1A1916] px-5 text-left text-white shadow-[0_4px_16px_rgba(26,25,22,0.15)] transition hover:bg-[#2A2922] active:scale-[0.98]"
              >
                <span className="inline-flex min-w-0 items-center gap-3">
                  <Icon className="size-5 shrink-0" strokeWidth={1.8} />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold leading-5">{item.label}</span>
                    <span className="block text-[12px] leading-5 text-white/68">{item.detail}</span>
                  </span>
                </span>
                <Download className="size-4 shrink-0 transition-transform group-hover:translate-y-0.5" strokeWidth={2} />
              </a>
            );
          })}

          <a
            href="/dashboard"
            className="group inline-flex h-14 items-center justify-center gap-3 rounded-[14px] border border-[#E7E4DC] bg-white text-[15px] font-semibold text-[#1A1916] shadow-[0_4px_16px_rgba(26,25,22,0.06)] transition hover:border-[#D8D3C8] hover:bg-[#F5F4F0] active:scale-[0.98]"
          >
            <span>Ouvrir Behar Tech Pro dans le navigateur</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
          </a>
        </div>

        <p className="mt-6 text-[12px] leading-5 text-[#6B6B6B]">
          Windows peut afficher SmartScreen au premier lancement. Sur Mac, utilisez clic droit puis Ouvrir si macOS demande une confirmation.
        </p>

        <p className="mt-10 text-xs text-[#6B6B6B]">Version desktop : 1.0.0</p>
      </div>
    </div>
  );
}
