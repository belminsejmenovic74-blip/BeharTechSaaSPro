"use client";

import { Apple, ArrowRight, Download, MonitorSmartphone, ShieldAlert, Smartphone } from "lucide-react";

import { BeharLogo } from "@/components/behar/behar-logo";

// Les binaires sont hébergés directement dans /public/downloads/ et donc
// servis statiquement par IONOS / Vercel à l'URL /downloads/...
// Pour mettre à jour : dépose les nouveaux fichiers dans public/downloads/
// (ou via FileZilla dans htdocs/downloads/ sur IONOS) puis change la
// version ci-dessous.
const APP_VERSION = "1.0.21";

const downloads = [
  {
    platform: "windows" as const,
    label: "Télécharger pour Windows",
    detail: "Installateur .exe — Windows 10/11",
    href: `/downloads/BeharTechPro-${APP_VERSION}-windows.exe`,
    icon: MonitorSmartphone,
  },
  {
    platform: "mac" as const,
    label: "Télécharger pour Mac",
    detail: "Image disque .dmg — macOS 10.15+",
    href: `/downloads/BeharTechPro-${APP_VERSION}-mac.dmg`,
    icon: Apple,
  },
  {
    platform: "android" as const,
    label: "Télécharger pour Android",
    detail: "Fichier APK — Android 8.0+",
    href: `/downloads/BeharTechPro-${APP_VERSION}-android.apk`,
    icon: Smartphone,
  },
];

export default function DownloadPage() {
  return (
    <div className="min-h-svh bg-white flex flex-col items-center px-5 py-10">
      <div className="w-full max-w-[520px]">
        {/* Logo */}
        <div className="mb-10 flex justify-center">
          <BeharLogo size="md" />
        </div>

        <div className="text-center">
          <h1 className="font-bold text-[#1A1916] text-[34px] tracking-[-0.02em] leading-tight">
            Télécharger Behar Tech Pro
          </h1>
          <p className="mt-4 text-[14px] leading-6 text-[#6B6B6B]">
            Logiciel d'atelier de réparation avec installation rapide, postes dédiés et synchronisation cloud.
          </p>
        </div>

        {/* Boutons de téléchargement */}
        <div className="mt-10 grid gap-2.5">
          {downloads.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                className="group inline-flex min-h-16 items-center justify-between gap-4 rounded-[14px] bg-[#1A1916] px-5 text-left text-white shadow-[0_4px_16px_rgba(26,25,22,0.15)] transition hover:bg-[#2A2922] active:scale-[0.98]"
                download
              >
                <span className="inline-flex min-w-0 items-center gap-3">
                  <Icon className="size-5 shrink-0" strokeWidth={1.8} />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold leading-5">{item.label}</span>
                    <span className="block text-[12px] leading-5 text-white/68">{item.detail}</span>
                  </span>
                </span>
                <Download
                  className="size-4 shrink-0 transition-transform group-hover:translate-y-0.5"
                  strokeWidth={2}
                />
              </a>
            );
          })}

          <a
            href="/dashboard"
            className="group inline-flex h-14 items-center justify-center gap-3 rounded-[14px] border border-[#E8E8E5] bg-white text-[15px] font-semibold text-[#1A1916] shadow-[0_4px_16px_rgba(26,25,22,0.06)] transition hover:border-[#DADADA] hover:bg-[#FAFAFA] active:scale-[0.98]"
          >
            <span>Ouvrir Behar Tech Pro dans le navigateur</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
          </a>
        </div>

        {/* Instructions d'installation */}
        <div className="mt-10 space-y-4">
          <InstallCard
            title="Windows — Premier lancement"
            warning="Windows affichera « Windows a protégé votre ordinateur » au premier lancement."
            steps={[
              "Double-cliquez sur le fichier .exe téléchargé",
              "Cliquez sur « Plus d'infos » dans la fenêtre SmartScreen",
              "Cliquez sur « Exécuter quand même »",
              "Suivez l'assistant d'installation",
            ]}
          />
          <InstallCard
            title="Mac — Premier lancement"
            warning="macOS affichera « Apple n'a pas pu confirmer que BeharTechPro ne contenait pas de logiciel malveillant »."
            steps={[
              "Glissez Behar Tech Pro dans le dossier Applications",
              "Ouvrez Terminal (Cmd+Espace puis tapez « Terminal »)",
              "Copiez et collez la commande ci-dessous, validez avec Entrée",
            ]}
            command="sudo xattr -dr com.apple.quarantine /Applications/BeharTechPro.app"
            commandHint="Saisissez votre mot de passe Mac quand demandé. L'app s'ouvrira ensuite directement par double-clic."
          />
          <InstallCard
            title="Android — Installation et premier lancement"
            warning="Android affichera un message concernant l'installation d'applications de sources inconnues."
            steps={[
              "Téléchargez le fichier .apk sur votre smartphone ou tablette Android",
              "Ouvrez le fichier téléchargé (.apk) depuis les notifications ou votre dossier de Téléchargements",
              "Si demandé, autorisez votre navigateur ou gestionnaire de fichiers à installer des applications",
              "Appuyez sur « Installer » puis ouvrez l'application",
            ]}
          />
        </div>

        <p className="mt-10 text-center text-xs text-[#6B6B6B]">Version application : {APP_VERSION}</p>
      </div>
    </div>
  );
}

function InstallCard({
  title,
  warning,
  steps,
  command,
  commandHint,
}: Readonly<{
  title: string;
  warning?: string;
  steps: string[];
  command?: string;
  commandHint?: string;
}>) {
  return (
    <section className="rounded-[16px] border border-[#E8E8E5] bg-white p-5 shadow-[0_2px_10px_rgba(26,25,22,0.04)]">
      <h2 className="font-semibold text-[#1A1916] text-[15px] tracking-tight">{title}</h2>
      {warning && (
        <div className="mt-3 flex items-start gap-2 rounded-[10px] bg-[#FAFAFA] px-3 py-2">
          <ShieldAlert className="size-4 shrink-0 text-[#6B6B6B] mt-0.5" strokeWidth={2} />
          <p className="text-[12px] leading-5 text-[#8C5B0E]">{warning}</p>
        </div>
      )}
      <ol className="mt-3 space-y-1.5 text-[12.5px] text-[#1A1916]">
        {steps.map((step, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#EAF6F2] text-[10px] font-bold text-[#167B70]">
              {idx + 1}
            </span>
            <span className="leading-5">{step}</span>
          </li>
        ))}
      </ol>
      {command && (
        <div className="mt-3 overflow-x-auto rounded-[10px] bg-[#1A1916] px-3 py-2.5">
          <code className="block whitespace-nowrap font-mono text-[11.5px] text-[#EAF6F2]">{command}</code>
        </div>
      )}
      {commandHint && <p className="mt-2 text-[11.5px] leading-5 text-[#6B6B6B]">{commandHint}</p>}
    </section>
  );
}
