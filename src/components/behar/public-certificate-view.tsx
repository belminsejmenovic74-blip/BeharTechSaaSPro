"use client";

import { useEffect, useMemo, useState } from "react";

import { useSearchParams } from "next/navigation";

import { AlertTriangle, BadgeCheck, CheckCircle2, Minus, ShieldCheck } from "lucide-react";

import {
  buildCertificateData,
  type CertificateData,
  type ControlStatus,
  decodeCertificate,
} from "@/lib/reconditioning-certificate";
import { formatEuro } from "@/lib/behar-store";
import { useReconditioningStore } from "@/lib/reconditioning-store";
import { cn } from "@/lib/utils";

import { BeharLogo } from "./behar-logo";

const STATUS_UI: Record<ControlStatus, { cls: string; icon: typeof CheckCircle2; label: string }> = {
  validé: { cls: "bg-[#EAF6F2] text-[#167B70]", icon: CheckCircle2, label: "Validé" },
  "à signaler": { cls: "bg-[#FBF3E2] text-[#9A6B1B]", icon: AlertTriangle, label: "À signaler" },
  "non testé": { cls: "bg-[#F4F4F2] text-[#8A8A85]", icon: Minus, label: "Non testé" },
};

const dateFr = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(d);
};

/** Lit le payload depuis l'URL (?d= encodé, ou ?id= local) — cible du QR code. */
export function PublicCertificateScreen() {
  const params = useSearchParams();
  return <PublicCertificateView encoded={params.get("d") ?? undefined} id={params.get("id") ?? undefined} />;
}

export function PublicCertificateView({ encoded, id }: Readonly<{ encoded?: string; id?: string }>) {
  const files = useReconditioningStore((s) => s.files);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const data: CertificateData | null = useMemo(() => {
    if (encoded) return decodeCertificate(encoded);
    if (id) {
      const file = files.find((f) => f.id === id);
      return file ? buildCertificateData(file) : null;
    }
    return null;
  }, [encoded, id, files]);

  if (encoded === undefined && id === undefined && !mounted) {
    return <div className="min-h-svh bg-[#FAFAF8]" />;
  }

  if (!data) {
    return (
      <div className="grid min-h-svh place-items-center bg-[#FAFAF8] px-6 text-center">
        <div className="max-w-sm">
          <div className="mx-auto grid size-12 place-items-center rounded-[14px] bg-white text-[#6B6B6B] shadow-[0_1px_3px_rgba(26,25,22,0.06)]">
            <AlertTriangle className="size-6" />
          </div>
          <p className="mt-4 font-semibold text-[#1A1916] text-lg">Certificat introuvable</p>
          <p className="mt-1 text-[#6B6B6B] text-sm">Ce lien de certificat est invalide ou incomplet.</p>
        </div>
      </div>
    );
  }

  const device = [data.brand, data.model].filter(Boolean).join(" ") || "Appareil";
  const detail = [data.storage, data.color].filter(Boolean).join(" · ");

  return (
    <div className="min-h-svh bg-[#FAFAF8] px-4 py-8 text-[#1A1916] sm:py-12">
      <div className="mx-auto w-full max-w-[760px] space-y-5">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <BeharLogo size="md" />
          <span className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-[#CDEBE4] bg-[#EAF6F2] px-3 font-semibold text-[#147065] text-[13px]">
            <BadgeCheck className="size-4" />
            Certificat vérifié
          </span>
        </div>

        {/* Hero */}
        <section className="rounded-[20px] border border-[#E8E8E5] bg-white p-6 shadow-[0_1px_3px_rgba(26,25,22,0.05)] sm:p-7">
          <p className="text-[#6B6B6B] text-[11px] font-semibold uppercase tracking-[0.08em]">Certificat de reconditionnement</p>
          <h1 className="mt-1.5 font-semibold text-[#1A1916] text-[26px] leading-tight tracking-tight sm:text-[30px]">{device}</h1>
          {detail && <p className="mt-1 text-[#6B6B6B] text-sm">{detail}</p>}

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#EAF6F2] px-3 py-1.5 font-semibold text-[#147065] text-sm">
              <ShieldCheck className="size-4" />
              Grade {data.grade} · {data.gradeLabel}
            </span>
            <span className="rounded-[9px] bg-[#FAFAFA] px-3 py-1.5 font-medium text-[#1A1916] text-sm">
              {data.validatedPoints} / {data.protocolPoints} points validés
            </span>
            {data.batteryHealth != null && (
              <span className="rounded-[9px] bg-[#FAFAFA] px-3 py-1.5 font-medium text-[#1A1916] text-sm">Batterie {data.batteryHealth} %</span>
            )}
          </div>
        </section>

        {/* Caractéristiques */}
        <section className="rounded-[20px] border border-[#E8E8E5] bg-white p-6 shadow-[0_1px_3px_rgba(26,25,22,0.05)]">
          <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
            <Row label="IMEI / Série" value={data.imei || "—"} />
            <Row label="Référence certificat" value={data.ref} mono />
            <Row label="Grade / État" value={`${data.grade} · ${data.gradeLabel}`} />
            <Row label="Prix de vente" value={formatEuro(data.price)} />
            <Row label="Garantie" value={`${data.warrantyMonths} mois`} />
            <Row label="Accessoires inclus" value={data.accessories || "Aucun"} />
            <Row label="Batterie" value={data.batteryHealth != null ? `${data.batteryHealth} %` : "—"} />
            <Row label="Date du contrôle" value={dateFr(data.date)} />
          </div>
        </section>

        {/* Résultat global */}
        <section className="rounded-[20px] border border-[#CDEBE4] bg-[#F6FCFA] p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-white text-[#147065] shadow-[0_1px_2px_rgba(26,25,22,0.05)]">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="font-semibold text-[#1A1916]">Appareil reconditionné et contrôlé</p>
              <p className="mt-1 text-[#5C6B66] text-sm leading-relaxed">{data.summary}</p>
            </div>
          </div>
        </section>

        {/* Détail des tests */}
        <section className="rounded-[20px] border border-[#E8E8E5] bg-white p-6 shadow-[0_1px_3px_rgba(26,25,22,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-[#1A1916]">Détail des tests</h2>
            <span className="text-[#6B6B6B] text-xs">{data.controls.length} points de contrôle</span>
          </div>
          <div className="mt-4 grid gap-x-8 sm:grid-cols-2">
            {data.controls.map((c) => {
              const ui = STATUS_UI[c.status];
              const Icon = ui.icon;
              return (
                <div className="flex items-center justify-between gap-3 border-[#F1F1EF] border-b py-2.5" key={c.label}>
                  <span className="text-[#1A1916] text-sm">{c.label}</span>
                  <span className={cn("inline-flex items-center gap-1.5 rounded-[7px] px-2.5 py-1 font-semibold text-[11px]", ui.cls)}>
                    <Icon className="size-3.5" />
                    {ui.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Défauts restants */}
        {data.defects.length > 0 && (
          <section className="rounded-[20px] border border-[#F0E0BC] bg-[#FDFAF2] p-6">
            <h2 className="flex items-center gap-2 font-semibold text-[#1A1916]">
              <AlertTriangle className="size-4 text-[#9A6B1B]" />
              Défauts restants signalés
            </h2>
            <p className="mt-1 text-[#6B6B6B] text-xs">En toute transparence, voici les points cosmétiques ou techniques restants.</p>
            <ul className="mt-3 space-y-2">
              {data.defects.map((d) => (
                <li className="flex items-start gap-2.5 text-[#1A1916] text-sm" key={d}>
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#9A6B1B]" />
                  {d}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Pied */}
        <footer className="pt-2 pb-6 text-center">
          <p className="text-[#6B6B6B] text-xs">
            Certificat n° <span className="font-mono text-[#1A1916]">{data.ref}</span> · Contrôle réalisé par {data.technician}
          </p>
          <p className="mt-1 text-[#9A9A95] text-xs">{data.workshopName} — reconditionnement contrôlé</p>
        </footer>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: Readonly<{ label: string; value: string; mono?: boolean }>) {
  return (
    <div className="flex items-center justify-between gap-3 border-[#F1F1EF] border-b py-3 last:border-0">
      <span className="text-[#6B6B6B] text-sm">{label}</span>
      <span className={cn("text-right font-semibold text-[#1A1916] text-sm", mono && "font-mono text-[13px]")}>{value}</span>
    </div>
  );
}
