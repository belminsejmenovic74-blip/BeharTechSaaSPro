"use client";

import { useEffect, useMemo, useState } from "react";

import { useParams, useSearchParams } from "next/navigation";

import { AlertTriangle, BadgeCheck, CheckCircle2, Minus, ShieldCheck } from "lucide-react";

import {
  buildSafePublicImageUrl,
  buildCertificateData,
  type CertificateData,
  type ControlStatus,
  decodeCertificate,
  maskImeiForPublic,
} from "@/lib/reconditioning-certificate";
import { formatEuro } from "@/lib/behar-store";
import { useReconditioningStore } from "@/lib/reconditioning-store";
import { cn } from "@/lib/utils";

const STATUS_UI: Record<ControlStatus, { cls: string; icon: typeof CheckCircle2; label: string }> = {
  validé: { cls: "bg-[#ECF8F4] text-[#167B70]", icon: CheckCircle2, label: "Validé" },
  "à signaler": { cls: "bg-[#FFF7E8] text-[#9A6B1B]", icon: AlertTriangle, label: "À signaler" },
  "non testé": { cls: "bg-[#F7F7F5] text-[#8A8A85]", icon: Minus, label: "Non testé" },
  "non applicable": { cls: "bg-[#F7F7F5] text-[#6B6B6B]", icon: Minus, label: "Non applicable" },
};

const dateFr = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(d);
};

/** Lit le payload depuis l'URL (?d= encodé, ou ?id= local) — cible du QR code. */
export function PublicCertificateScreen() {
  const params = useSearchParams();
  const routeParams = useParams<{ token?: string }>();
  return (
    <PublicCertificateView
      encoded={params.get("d") ?? undefined}
      id={params.get("id") ?? undefined}
      publicToken={routeParams?.token}
    />
  );
}

export function PublicCertificateView({
  encoded,
  id,
  publicToken,
}: Readonly<{ encoded?: string; id?: string; publicToken?: string }>) {
  const files = useReconditioningStore((s) => s.files);
  const [mounted, setMounted] = useState(false);
  const [remoteData, setRemoteData] = useState<CertificateData | null>(null);
  const [remoteLoaded, setRemoteLoaded] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!publicToken || encoded) {
      setRemoteLoaded(true);
      return;
    }
    let cancelled = false;
    setRemoteLoaded(false);
    fetch(`/api/public/reconditioned/${encodeURIComponent(publicToken)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (cancelled) return;
        const certificate = payload?.certificate;
        setRemoteData(certificate && typeof certificate === "object" ? (certificate as CertificateData) : null);
      })
      .catch(() => {
        if (!cancelled) setRemoteData(null);
      })
      .finally(() => {
        if (!cancelled) setRemoteLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [encoded, publicToken]);

  const data: CertificateData | null = useMemo(() => {
    if (remoteData) return remoteData;
    if (encoded) return decodeCertificate(encoded);
    if (id) {
      const file = files.find((f) => f.id === id);
      return file ? buildCertificateData(file) : null;
    }
    if (publicToken) {
      const file = files.find((f) => f.publicToken === publicToken);
      return file ? buildCertificateData(file) : null;
    }
    return null;
  }, [encoded, id, publicToken, remoteData, files]);

  if (encoded === undefined && id === undefined && !mounted) {
    return <div className="min-h-svh bg-[#FFFFFF]" />;
  }

  if (publicToken && !encoded && !remoteLoaded && !data) {
    return <div className="min-h-svh bg-[#FAFAF8]" />;
  }

  if (!data) {
    return (
      <div className="grid min-h-svh place-items-center bg-[#FAFAF8] px-6 text-center">
        <div className="max-w-sm">
          <div className="mx-auto grid size-12 place-items-center rounded-[14px] bg-white text-[#6B6B6B] shadow-[0_1px_3px_rgba(26,25,22,0.06)]">
            <AlertTriangle className="size-6" />
          </div>
          <p className="mt-4 font-semibold text-[#1A1916] text-lg">Ce certificat n'est pas encore disponible.</p>
          <p className="mt-1 text-[#6B6B6B] text-sm">La boutique doit encore publier ou mettre à jour cette fiche.</p>
        </div>
      </div>
    );
  }

  const settings = data.publicSettings;
  const device = [data.brand, data.model].filter(Boolean).join(" ") || "Appareil";
  const detail = [settings.showStorage ? data.storage : "", settings.showColor ? data.color : ""]
    .filter(Boolean)
    .join(" · ");
  const heroImage = settings.showPublicPhotos ? buildSafePublicImageUrl(data.imageUrl || data.publicPhotos[0]) : "";
  const gallery = settings.showPublicPhotos ? data.publicPhotos.map(buildSafePublicImageUrl).filter(Boolean) : [];
  const showQualityPills = settings.showGrade || settings.showBattery || settings.showControlPoints;
  const rows = [
    settings.showMaskedImei ? { label: "IMEI", value: maskImeiForPublic(data.imei), mono: false } : null,
    settings.showReference ? { label: "Référence stock", value: data.ref, mono: true } : null,
    settings.showGrade ? { label: "Grade / État", value: `${data.grade} · ${data.gradeLabel}`, mono: false } : null,
    settings.showPrice ? { label: "Prix de vente", value: formatEuro(data.price), mono: false } : null,
    settings.showWarranty ? { label: "Garantie", value: `${data.warrantyMonths} mois`, mono: false } : null,
    settings.showBattery && data.batteryHealth != null
      ? { label: "Batterie", value: `${data.batteryHealth} %`, mono: false }
      : null,
    settings.showControlPoints
      ? {
          label: "Tests effectués",
          value: `${data.validatedPoints} / ${data.protocolPoints} points contrôlés`,
          mono: false,
        }
      : null,
    settings.showReconditionedDate ? { label: "Reconditionné le", value: dateFr(data.date), mono: false } : null,
  ].filter((row): row is { label: string; value: string; mono: boolean } => Boolean(row));
  const diagnosticRows = settings.showFinalDiagnostic
    ? [
        { label: "Écran", value: data.screenStatus },
        { label: "Face arrière", value: data.backStatus },
        { label: "Face ID / Touch ID", value: data.biometricStatus },
        { label: "Réseau", value: data.networkStatus },
        { label: "Caméra", value: data.cameraStatus },
        { label: "Oxydation", value: data.oxidationStatus },
        { label: "IMEI", value: data.imeiStatus },
      ].filter((row) => row.value && row.value !== "Non renseigné")
    : [];

  return (
    <div className="min-h-svh bg-[#FAFAF8] px-4 py-8 text-[#1A1916] sm:py-12">
      <div className="mx-auto w-full max-w-[760px] space-y-5">
        {/* En-tête */}
        {(settings.showShopName || settings.showShopLogo) && (
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {settings.showShopLogo && data.shopLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="size-9 rounded-[10px] border border-[#E8E5DF] bg-white object-contain p-1"
                  src={data.shopLogoUrl}
                />
              ) : settings.showShopLogo ? (
                <span className="grid size-9 place-items-center rounded-[10px] bg-[#ECF8F4] font-semibold text-[#147065] text-xs">
                  {data.workshopName.slice(0, 2).toUpperCase()}
                </span>
              ) : null}
              {settings.showShopName && (
                <p className="min-w-0 truncate font-semibold text-[#1A1916] text-sm">
                  {data.workshopName || "Boutique"}
                </p>
              )}
            </div>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-[#CDEBE4] bg-white px-3 font-semibold text-[#147065] text-[13px]">
              <BadgeCheck className="size-4" />
              Certificat vérifié
            </span>
          </div>
        )}

        {/* Hero */}
        <section className="rounded-[22px] border border-[#E8E5DF] bg-white p-5 shadow-[0_16px_45px_rgba(26,25,22,0.06)] sm:p-7">
          <div className="grid gap-5 sm:grid-cols-[128px_1fr] sm:items-center">
            <div className="grid aspect-square place-items-center overflow-hidden rounded-[18px] border border-[#E8E5DF] bg-[#FAFAF8]">
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" className="h-full w-full object-contain p-2" src={heroImage} />
              ) : (
                <ShieldCheck className="size-10 text-[#2A9D8F]" />
              )}
            </div>
            <div>
              <p className="text-[#6B6B6B] text-[11px] font-semibold uppercase tracking-[0.08em]">
                Certificat de reconditionnement
              </p>
              <h1 className="mt-1.5 font-semibold text-[#1A1916] text-[26px] leading-tight tracking-tight sm:text-[30px]">
                {settings.showModel ? device : "Téléphone reconditionné"}
              </h1>
              {detail && <p className="mt-1 text-[#6B6B6B] text-sm">{detail}</p>}

              {showQualityPills && (
                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  {settings.showGrade && (
                    <span className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#ECF8F4] px-3 py-1.5 font-semibold text-[#147065] text-sm">
                      <ShieldCheck className="size-4" />
                      Grade {data.grade} · {data.gradeLabel}
                    </span>
                  )}
                  {settings.showControlPoints && (
                    <span className="rounded-[9px] bg-[#F7F7F5] px-3 py-1.5 font-medium text-[#1A1916] text-sm">
                      {data.validatedPoints} / {data.protocolPoints} points contrôlés
                    </span>
                  )}
                  {settings.showBattery && data.batteryHealth != null && (
                    <span className="rounded-[9px] bg-[#F7F7F5] px-3 py-1.5 font-medium text-[#1A1916] text-sm">
                      Batterie {data.batteryHealth} %
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Caractéristiques */}
        {rows.length > 0 && (
          <section className="rounded-[20px] border border-[#E8E5DF] bg-white p-6 shadow-[0_1px_3px_rgba(26,25,22,0.05)]">
            <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
              {rows.map((row) => (
                <Row key={row.label} label={row.label} value={row.value} mono={row.mono} />
              ))}
            </div>
          </section>
        )}

        {/* Diagnostic public */}
        {diagnosticRows.length > 0 && (
          <section className="rounded-[20px] border border-[#E8E5DF] bg-white p-6 shadow-[0_1px_3px_rgba(26,25,22,0.05)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-[#1A1916]">Diagnostic</h2>
              <span className="rounded-full bg-[#ECF8F4] px-2.5 py-1 font-semibold text-[#147065] text-xs">
                Diagnostic final
              </span>
            </div>
            <div className="grid gap-x-8 sm:grid-cols-2">
              {diagnosticRows.map((row) => (
                <Row key={row.label} label={row.label} value={row.value} />
              ))}
            </div>
          </section>
        )}

        {/* Détail des tests */}
        {settings.showControlPoints && data.controls.length > 0 && (
          <section className="rounded-[20px] border border-[#E8E5DF] bg-white p-6 shadow-[0_1px_3px_rgba(26,25,22,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-[#1A1916]">Détail des tests</h2>
              <span className="text-[#6B6B6B] text-xs">{data.controls.length} points de contrôle</span>
            </div>
            <div className="mt-4 grid gap-x-8 sm:grid-cols-2">
              {data.controls.map((c) => {
                const ui = STATUS_UI[c.status];
                const Icon = ui.icon;
                return (
                  <div
                    className="flex items-center justify-between gap-3 border-[#F1F1EF] border-b py-2.5"
                    key={c.label}
                  >
                    <span className="text-[#1A1916] text-sm">{c.label}</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-[7px] px-2.5 py-1 font-semibold text-[11px]",
                        ui.cls,
                      )}
                    >
                      <Icon className="size-3.5" />
                      {ui.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {gallery.length > 1 && (
          <section className="rounded-[20px] border border-[#E8E5DF] bg-white p-6 shadow-[0_1px_3px_rgba(26,25,22,0.05)]">
            <h2 className="font-semibold text-[#1A1916]">Photos publiques</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gallery.map((src, index) => (
                <div
                  className="aspect-square overflow-hidden rounded-[14px] border border-[#E8E5DF] bg-[#FAFAF8]"
                  key={`${src}-${index}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="" className="size-full object-cover" src={src} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Défauts restants */}
        {settings.showPublicComment && (data.publicComment || data.defects.length > 0) && (
          <section className="rounded-[20px] border border-[#F0E0BC] bg-[#FFFFFF] p-6">
            <h2 className="flex items-center gap-2 font-semibold text-[#1A1916]">
              <AlertTriangle className="size-4 text-[#9A6B1B]" />
              Commentaire public
            </h2>
            {data.publicComment && <p className="mt-2 text-[#1A1916] text-sm leading-relaxed">{data.publicComment}</p>}
            {data.defects.length > 0 && (
              <ul className="mt-3 space-y-2">
                {data.defects.slice(0, 4).map((d) => (
                  <li className="flex items-start gap-2.5 text-[#1A1916] text-sm" key={d}>
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#9A6B1B]" />
                    {d}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Pied */}
        <footer className="pt-2 pb-6 text-center">
          {settings.showReference && (
            <p className="text-[#6B6B6B] text-xs">
              Certificat n° <span className="font-mono text-[#1A1916]">{data.ref}</span> · Contrôle réalisé par{" "}
              {data.technician}
            </p>
          )}
          {settings.showPoweredBy && (
            <p className="mt-1 text-[#9A9A95] text-xs">Certificat généré avec Behar Tech Pro</p>
          )}
        </footer>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: Readonly<{ label: string; value: string; mono?: boolean }>) {
  return (
    <div className="flex items-center justify-between gap-3 border-[#F1F1EF] border-b py-3 last:border-0">
      <span className="text-[#6B6B6B] text-sm">{label}</span>
      <span className={cn("text-right font-semibold text-[#1A1916] text-sm", mono && "font-mono text-[13px]")}>
        {value}
      </span>
    </div>
  );
}
