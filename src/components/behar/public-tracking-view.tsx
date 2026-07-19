"use client";

import { useEffect, useMemo, useState } from "react";

import { useSearchParams } from "next/navigation";

import { Check, Copy, Download, FileText, Link2, MessageCircle, Phone, Send, ShieldCheck, Wrench } from "lucide-react";
import { toast } from "sonner";

import { RealDeviceVisual } from "@/components/behar/real-product-visual";
import { useBeharStore } from "@/lib/behar-store";
import { buildTrackingUrl, createShopSlug } from "@/lib/customer-tracking";
import { downloadPdfUrl } from "@/lib/download-file.client";
import type { PublicRepairDto } from "@/lib/public-dtos";
import { generateQrDataUrl } from "@/lib/public-link";
import { buildPublicRepairDtoFromLocalState } from "@/lib/public-repair-dto";
import {
  PUBLIC_REPAIR_TIMELINE_STEPS,
  publicRepairHeadline,
  publicRepairPageTitle,
  publicRepairProgress,
} from "@/lib/repair-status";
import { formatMoney, getDocumentFilename } from "@/lib/workshop-country";

const COLORS = { bg: "#FFFFFF", text: "#101828", sub: "#667085", accent: "#2A9D8F", border: "#E4E7EC" };

function resolveShopName(candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    const value = (candidate ?? "").trim();
    if (
      value &&
      value.toLowerCase() !== "behar tech" &&
      value.toLowerCase() !== "behar tech pro" &&
      value.toLowerCase() !== "behartechpro"
    ) {
      return value;
    }
  }
  return "Votre atelier";
}

function shopInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "AT";
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function formatDayShort(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", timeZone: "Europe/Paris" }).format(date);
}

function formatTimeShort(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(
    date,
  );
}

function formatMessageMoment(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function cleanToken(value?: string | null) {
  const token = (value ?? "").trim();
  return token && token !== "_" ? token : "";
}

function extractTrackingInfoFromUrl() {
  if (typeof window === "undefined") return { shopSlug: "", trackingId: "" };

  const segments = window.location.pathname.split("/").filter(Boolean);
  let shopSlug = "";
  let trackingId = "";

  // Route officielle : /suivi/:shopSlug/:trackingToken
  if (segments[0] === "suivi" || segments[0] === "p") {
    const relevant = segments.slice(1).filter((s) => s !== "index.html" && s !== "_");

    if (relevant.length === 1) {
      trackingId = relevant[0];
    } else if (relevant.length >= 2) {
      shopSlug = relevant[0];
      trackingId = relevant[relevant.length - 1]; // toujours le dernier segment valide
    }
  }

  const queryToken = new URLSearchParams(window.location.search).get("t");
  if (queryToken) trackingId = queryToken;

  return {
    shopSlug: shopSlug ? decodeURIComponent(shopSlug).trim() : "",
    trackingId: trackingId ? decodeURIComponent(trackingId).trim() : "",
  };
}

import { getSupabase } from "@/lib/supabase/client";

async function readPublicRepairFromSupabase(token: string): Promise<PublicRepairDto | null> {
  const supabase = getSupabase();
  if (!supabase) {
    console.error("[public-tracking] Supabase client non configuré.");
    return null;
  }

  // Les tokens de suivi peuvent contenir des underscores (`rp_XXXX`,
  // `repair_1783..._94a6ec`). Il faut donc les conserver, sinon la recherche
  // Supabase ne matche jamais et la page affiche « Suivi introuvable ».
  // On garde uniquement [a-zA-Z0-9_-] : sûr pour le filtre PostgREST `.or()`.
  const safeToken = token.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeToken) return null;

  // On recherche par tracking_id en respectant la casse (originale ou majuscule) ou par numéro de dossier
  const { data, error } = await supabase
    .from("public_tracking_repairs")
    .select("public_data")
    .or(
      `tracking_id.eq.${safeToken},tracking_id.eq.${safeToken.toUpperCase()},repair_number.eq.${safeToken},repair_number.eq.${safeToken.toUpperCase()}`,
    )
    .limit(1);

  if (error) {
    console.error("[public-tracking] Error fetching repair:", error.message);
    return null;
  }

  if (!data || data.length === 0 || !data[0].public_data) {
    console.warn("[public-tracking] Tracking not found for token:", token);
    return null;
  }

  return data[0].public_data as PublicRepairDto;
}

function notFound(shopName?: string) {
  const name = shopName ? shopName.trim() : "";
  const cleanName =
    name &&
    name.toLowerCase() !== "behar-tech" &&
    name.toLowerCase() !== "behar-tech-pro" &&
    name.toLowerCase() !== "behartechpro"
      ? name
      : "votre réparateur";

  let isLocalIp = false;
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    isLocalIp =
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname);
  }

  return (
    <div className="grid min-h-screen place-items-center px-6" style={{ background: COLORS.bg, color: COLORS.text }}>
      <div
        className="w-full max-w-[420px] rounded-[22px] border bg-white p-8 text-center shadow-[0_1px_2px_rgba(16,24,40,0.035)]"
        style={{ borderColor: COLORS.border }}
      >
        <span
          className="mx-auto grid size-12 place-items-center rounded-full"
          style={{ background: "#FFFFFF", color: COLORS.sub }}
        >
          <ShieldCheck className="size-6" />
        </span>
        <p className="mt-4 font-bold text-[19px] tracking-tight">Suivi introuvable</p>
        <p className="mt-2 text-[14px] leading-relaxed" style={{ color: COLORS.sub }}>
          {isLocalIp
            ? "Dossier introuvable en local. Pour tester depuis un téléphone, utilisez Supabase ou créez le dossier depuis le même appareil."
            : `Ce lien n'est plus valide ou a expiré. Veuillez contacter ${cleanName} pour obtenir un nouveau lien de suivi.`}
        </p>
      </div>
    </div>
  );
}

export function PublicTrackingView({
  shopSlug: propShopSlug,
  token: tokenProp,
}: {
  shopSlug?: string;
  token?: string;
}) {
  const searchParams = useSearchParams();
  const [browserToken, setBrowserToken] = useState("");
  const [browserShopSlug, setBrowserShopSlug] = useState("");

  const token = cleanToken(tokenProp) || cleanToken(searchParams.get("t")) || browserToken;
  // biome-ignore lint/nursery/useNullishCoalescing: fallback needed on falsy empty string
  const shopSlug = propShopSlug || browserShopSlug;

  const [data, setData] = useState<PublicRepairDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [downloadingDocument, setDownloadingDocument] = useState("");

  useEffect(() => {
    const info = extractTrackingInfoFromUrl();
    setBrowserToken(info.trackingId);
    setBrowserShopSlug(info.shopSlug);
  }, []);

  useEffect(() => {
    console.log("[tracking-page] token from URL:", token);
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    let isLocalhost = false;
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
    }

    const loadLocalData = async () => {
      await (
        useBeharStore as typeof useBeharStore & { persist?: { rehydrate?: () => Promise<void> | void } }
      ).persist?.rehydrate?.();
      const localState = useBeharStore.getState();
      const localDto = buildPublicRepairDtoFromLocalState(localState, token);
      console.log("[tracking-page] local state found repair:", localDto);
      if (!cancelled) {
        setData(localDto ?? null);
        setLoading(false);
      }
    };

    let interval: number | undefined;
    if (isLocalhost) {
      void loadLocalData();
      interval = window.setInterval(() => {
        void loadLocalData();
      }, 1000);
      return () => {
        cancelled = true;
        if (interval) window.clearInterval(interval);
      };
    }

    readPublicRepairFromSupabase(token)
      .then((fetchedData) => {
        console.log("[tracking-page] found repair:", fetchedData);
        if (fetchedData) {
          if (!cancelled) setData(fetchedData);
        } else {
          if (!cancelled) setData(null);
        }
      })
      .catch((err) => {
        console.log("[tracking-page] error:", err);
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const publicUrl = useMemo(() => {
    if (!data) return "";
    // biome-ignore lint/nursery/useNullishCoalescing: fallback needed on falsy empty string
    const slug = shopSlug || createShopSlug(data.workshop.name || "atelier");
    return token ? buildTrackingUrl({ shopSlug: slug, trackingToken: token }) : "";
  }, [data, shopSlug, token]);

  const documentRows = useMemo(() => {
    if (!data) return [];
    const rows: Array<{
      key: string;
      type: string;
      title: string;
      status: string;
      number?: string;
      previewUrl?: string;
      downloadUrl?: string;
    }> = [
      ...data.documents.map((doc) => ({
        key: `${doc.type}:${doc.number || doc.title}`,
        type: doc.type,
        title: doc.title,
        status: doc.status,
        number: doc.number,
        previewUrl: doc.previewUrl,
        downloadUrl: doc.downloadUrl,
      })),
    ];
    const hasType = (type: string) => rows.some((row) => row.type === type);
    if (!hasType("quote")) {
      rows.push(
        ...data.quoteLinks.map((quote) => ({
          key: `quote:${quote.number}`,
          type: "quote",
          title: `Devis ${quote.number} - ${formatMoney(quote.totalTtc, data.workshop.currency)}`,
          status: quote.status,
          number: quote.number,
          previewUrl: quote.previewUrl,
          downloadUrl: quote.downloadUrl,
        })),
      );
    }
    if (!hasType("invoice")) {
      rows.push(
        ...data.invoiceLinks.map((invoice) => ({
          key: `invoice:${invoice.number}`,
          type: "invoice",
          title: `Facture ${invoice.number} - ${formatMoney(invoice.totalTtc, data.workshop.currency)}`,
          status: invoice.status,
          number: invoice.number,
          previewUrl: invoice.previewUrl,
          downloadUrl: invoice.downloadUrl,
        })),
      );
    }
    if (!hasType("payment") && !hasType("payment_confirmation") && !hasType("payment_receipt")) {
      rows.push(
        ...data.receiptLinks.map((receipt) => ({
          key: `receipt:${receipt.number}`,
          type: "payment_confirmation",
          title: `Confirmation de règlement - ${formatMoney(receipt.amount, data.workshop.currency)}`,
          status: receipt.status,
          number: receipt.number,
          previewUrl: receipt.previewUrl,
          downloadUrl: receipt.downloadUrl,
        })),
      );
    }
    return rows.map((row) => {
      const filenameType =
        row.type === "payment" || row.type === "payment_confirmation" || row.type === "payment_receipt"
          ? "payment"
          : row.type === "repair_intake"
            ? "intake"
            : row.type === "sale_receipt"
              ? "sale-receipt"
              : row.type;
      return {
        ...row,
        localTarget: null, // Plus de ciblage d'impression locale sur la vue publique cloud
        filename: getDocumentFilename(
          filenameType as "intake" | "quote" | "invoice" | "payment" | "sale-receipt",
          row.number || data?.repair.number || "document",
        ),
      };
    });
  }, [data]);

  useEffect(() => {
    if (publicUrl)
      generateQrDataUrl(publicUrl)
        .then(setQr)
        .catch(() => setQr(""));
  }, [publicUrl]);

  const send = async () => {
    // La fonctionnalité d'envoi de message client nécessitera l'utilisation
    // d'une table Supabase dédiée aux messages à l'avenir, car l'API locale n'est pas dispo
    toast("L'envoi de messages est temporairement désactivé.");
    setDraft("");
  };

  const copyLink = async () => {
    if (!publicUrl || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard indisponible — on ignore silencieusement */
    }
  };

  if (loading || (!token && loading)) {
    return (
      <div className="grid min-h-screen place-items-center" style={{ background: COLORS.bg, color: COLORS.sub }}>
        Chargement…
      </div>
    );
  }

  if (!data) return notFound(shopSlug);

  const shopName = resolveShopName([data.workshop.name]);
  // On affiche le numéro de dossier lisible (ex. REP-0009) plutôt que le token
  // technique (ex. repair_1783…_94a6ec) qui sert uniquement à l'URL.
  const trackingCode = data.repair.number || token;
  const initials = shopInitials(shopName);
  const progress = publicRepairProgress(data.repair.status);
  const active = progress.activeStepIndex;
  const [title, body] = publicRepairHeadline(data.repair.status, data.repair.paymentStatus, data.repair.hasPaidPayment);
  const shortLink = publicUrl.replace(/^https?:\/\//, "");
  const contactHref = data.workshop.phone ? `tel:${data.workshop.phone}` : "#messages";

  return (
    <div className="min-h-screen" style={{ background: COLORS.bg, color: COLORS.text }}>
      <div className="mx-auto w-full max-w-[1080px] px-4 py-6 lg:px-8 lg:py-12">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start lg:gap-10">
          {/* Colonne principale — mobile-first, max ~460px */}
          <main className="mx-auto w-full max-w-[460px] pb-10 lg:mx-0 lg:pb-0">
            {/* Header boutique : logo ou initiales + nom, bordure basse fine */}
            <header className="flex items-center gap-3 border-b pb-4" style={{ borderColor: COLORS.border }}>
              {data.workshop.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                // biome-ignore lint/performance/noImgElement: standard image tag is fine for tracking logo
                <img
                  src={data.workshop.logoUrl}
                  alt={shopName}
                  className="h-9 w-auto max-w-[150px] rounded-md object-contain"
                />
              ) : (
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-[11px] font-bold text-[13px] text-white"
                  style={{ background: COLORS.accent }}
                >
                  {initials}
                </span>
              )}
              <span className="truncate font-semibold text-[15px] tracking-tight">{shopName}</span>
            </header>

            <h1 className="mt-6 font-bold text-[26px] leading-tight tracking-tight">
              {publicRepairPageTitle(data.repair.status)}
            </h1>
            <p className="mt-1.5 text-[14px]" style={{ color: COLORS.sub }}>
              {shopName} vous tient informé à chaque étape.
            </p>

            {/* Carte dossier */}
            <section
              className="mt-5 rounded-[20px] border bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.035)]"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold font-mono text-[20px] tracking-tight">{trackingCode}</span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold text-[12px]"
                  style={{ background: "#FFFFFF", color: "#1E7A6E" }}
                >
                  <span className="size-2 rounded-full" style={{ background: COLORS.accent }} />{" "}
                  {data.repair.statusLabel}
                </span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-[104px_1fr] sm:items-center">
                <RealDeviceVisual
                  brand={data.repair.deviceBrand}
                  className="size-[104px] rounded-[18px] border border-[#E4E7EC] bg-[#FFFFFF] p-2 shadow-[0_1px_2px_rgba(16,24,40,0.035)]"
                  model={data.repair.deviceModel}
                  type={data.repair.deviceType}
                />
                <div className="grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-4">
                  <div>
                    <p style={{ color: COLORS.sub }}>Client</p>
                    <p className="font-semibold">{data.client.displayName}</p>
                  </div>
                  <div>
                    <p style={{ color: COLORS.sub }}>Dossier</p>
                    <p className="font-semibold">{data.repair.number}</p>
                  </div>
                  <div>
                    <p style={{ color: COLORS.sub }}>Appareil</p>
                    <p className="font-semibold">
                      {[data.repair.deviceBrand, data.repair.deviceModel].filter(Boolean).join(" ") || "—"}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: COLORS.sub }}>Problème</p>
                    <p className="font-semibold">{data.repair.issueDescription || "—"}</p>
                  </div>
                  <div>
                    <p style={{ color: COLORS.sub }}>Contrôle</p>
                    <p className="font-semibold">{data.repair.finalTestStatus || data.repair.readyLabel || "—"}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Timeline étapes — avec date/heure quand disponible */}
            <section
              className="mt-4 rounded-[20px] border bg-white px-3 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.035)] sm:p-5"
              style={{ borderColor: COLORS.border }}
            >
              <div className="grid grid-cols-5">
                {PUBLIC_REPAIR_TIMELINE_STEPS.map((label, index) => {
                  const done = progress.isFinished ? index <= active : !progress.isCancelled && index < active;
                  const current = !progress.isFinished && !progress.isCancelled && index === active;

                  const timelineEvent = data.timeline.find((t) => t.title === label);
                  const sourceDate = timelineEvent ? timelineEvent.date : undefined;

                  const day = progress.isCancelled
                    ? index === 0
                      ? formatDayShort(sourceDate) || "—"
                      : "Annulé"
                    : timelineEvent
                      ? formatDayShort(sourceDate) || "—"
                      : index > active
                        ? "À venir"
                        : "—";
                  const time = timelineEvent ? formatTimeShort(sourceDate) : "";
                  return (
                    <div key={label} className="relative min-w-0 px-0.5 text-center">
                      {index < PUBLIC_REPAIR_TIMELINE_STEPS.length - 1 ? (
                        <span
                          className="absolute top-3.5 left-1/2 -z-0 h-[2px] w-full"
                          style={{ background: done ? COLORS.accent : "#E2E0DA" }}
                        />
                      ) : null}
                      <span
                        className="relative z-10 mx-auto grid size-7 place-items-center rounded-full border bg-white font-bold text-[12px]"
                        style={
                          done
                            ? { borderColor: COLORS.accent, background: COLORS.accent, color: "#fff" }
                            : current
                              ? { borderColor: COLORS.accent, color: COLORS.accent }
                              : { borderColor: "#D7D5CF", color: "#98A2B3" }
                        }
                      >
                        {done ? <Check className="size-4" /> : index + 1}
                      </span>
                      <p
                        className="mt-2 min-h-[28px] text-balance font-semibold text-[10px] leading-tight sm:text-[12px]"
                        style={current ? { color: COLORS.accent } : undefined}
                      >
                        {label}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-tight" style={{ color: "#98A2B3" }}>
                        {day}
                        {time ? (
                          <>
                            <br />
                            {time}
                          </>
                        ) : null}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Carte statut actuel */}
            <section
              className="mt-4 flex items-start gap-3 rounded-[20px] border p-4"
              style={{ borderColor: "#D7EFEA", background: "#FFFFFF" }}
            >
              <span
                className="grid size-9 shrink-0 place-items-center rounded-full text-white"
                style={{ background: COLORS.accent }}
              >
                <Wrench className="size-5" />
              </span>
              <div>
                <p className="font-semibold" style={{ color: "#1E7A6E" }}>
                  {title}
                </p>
                <p className="mt-0.5 text-[13.5px]" style={{ color: COLORS.sub }}>
                  {body}
                </p>
              </div>
            </section>

            {/* Documents */}
            <section
              className="mt-4 rounded-[20px] border bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.035)]"
              style={{ borderColor: COLORS.border }}
            >
              <h2 className="font-bold text-[15px]">Documents</h2>
              <ul className="mt-3 divide-y" style={{ borderColor: COLORS.border }}>
                {documentRows.length === 0 ? (
                  <li className="py-3 text-[13px]" style={{ color: COLORS.sub }}>
                    Vos documents apparaîtront ici dès qu'ils seront prêts.
                  </li>
                ) : null}
                {documentRows.map((doc) => (
                  <li key={doc.key} className="flex items-center gap-3 py-3">
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-[11px]"
                      style={{ background: "#FFFFFF", color: COLORS.accent }}
                    >
                      <FileText className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[14px]">{doc.title}</p>
                      <p className="text-[12px]" style={{ color: COLORS.sub }}>
                        {doc.previewUrl || doc.downloadUrl ? "Disponible" : "À venir"}
                      </p>
                    </div>
                    {doc.previewUrl || doc.downloadUrl ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        {doc.previewUrl || doc.downloadUrl ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (doc.downloadUrl) {
                                window.open(doc.downloadUrl, "_blank", "noopener,noreferrer");
                                return;
                              }
                              if (doc.previewUrl) {
                                window.open(doc.previewUrl, "_blank", "noopener,noreferrer");
                              }
                            }}
                            className="rounded-full px-3 py-1 font-semibold text-[12.5px]"
                            style={{ background: "#FFFFFF", color: "#1E7A6E" }}
                          >
                            Ouvrir
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={downloadingDocument === doc.key}
                          onClick={() => {
                            if (doc.downloadUrl) {
                              setDownloadingDocument(doc.key);
                              void downloadPdfUrl(doc.downloadUrl, doc.filename)
                                .catch((error) => {
                                  toast.error(
                                    `Document impossible à générer : ${error instanceof Error ? error.message : "raison inconnue"}`,
                                  );
                                })
                                .finally(() => setDownloadingDocument(""));
                              return;
                            }
                            if (doc.previewUrl) window.open(doc.previewUrl, "_blank", "noopener,noreferrer");
                          }}
                          aria-label="Télécharger le document"
                          className="grid size-8 place-items-center rounded-full border disabled:opacity-50"
                          style={{ borderColor: COLORS.border, color: COLORS.sub }}
                        >
                          <Download className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <span
                        className="shrink-0 rounded-full px-3 py-1 font-semibold text-[12.5px]"
                        style={{ background: "#FFFFFF", color: "#98A2B3" }}
                      >
                        À venir
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {/* Messages */}
            <section
              id="messages"
              className="mt-4 rounded-[20px] border bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.035)]"
              style={{ borderColor: COLORS.border }}
            >
              <h2 className="font-bold text-[15px]">Messages</h2>
              <ul className="mt-3 space-y-3.5">
                {data.messages.length === 0 ? (
                  <li className="text-[13px]" style={{ color: COLORS.sub }}>
                    Aucun message pour le moment.
                  </li>
                ) : null}
                {data.messages.map((message, index) => {
                  const isClient = message.authorType === "client";
                  return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: index is acceptable here
                    <li key={`${message.createdAt}-${index}`} className="flex items-start gap-3">
                      <span
                        className="grid size-8 shrink-0 place-items-center rounded-full font-bold text-[12px]"
                        style={
                          isClient
                            ? { background: "#EEF2FF", color: "#4F46E5" }
                            : { background: "#FFFFFF", color: "#1E7A6E" }
                        }
                      >
                        {isClient ? "V" : initials.slice(0, 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="font-semibold text-[13px]">{isClient ? "Vous" : shopName}</p>
                          <p className="shrink-0 text-[11px]" style={{ color: "#98A2B3" }}>
                            {formatMessageMoment(message.createdAt)}
                          </p>
                        </div>
                        <p className="mt-0.5 text-[13.5px]" style={{ color: COLORS.sub }}>
                          {message.body}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void send();
                  }}
                  placeholder="Écrivez-nous un message…"
                  className="h-11 flex-1 rounded-[12px] border bg-white px-4 text-[14px] outline-none focus:border-[#2A9D8F]"
                  style={{ borderColor: COLORS.border }}
                />
                <button
                  type="button"
                  onClick={() => void send()}
                  className="grid size-11 shrink-0 place-items-center rounded-[12px] text-white active:scale-[0.97]"
                  style={{ background: COLORS.accent }}
                  aria-label="Envoyer le message"
                >
                  <Send className="size-5" />
                </button>
              </div>
            </section>

            {/* CTA bas — contacter l'atelier */}
            <a
              href={contactHref}
              className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] font-bold text-[15px] text-white active:scale-[0.99]"
              style={{ background: COLORS.accent }}
            >
              {data.workshop.phone ? <Phone className="size-5" /> : <MessageCircle className="size-5" />}
              Contacter {shopName}
            </a>
            <p className="mt-2 text-center text-[12px]" style={{ color: COLORS.sub }}>
              Réponse selon les horaires de la boutique.
            </p>
          </main>

          {/* Colonne droite (desktop) / bas (mobile) — accès rapide + coordonnées */}
          <aside className="space-y-4 lg:sticky lg:top-12">
            <section
              className="rounded-[22px] border bg-white p-6 text-center shadow-[0_1px_2px_rgba(16,24,40,0.035)]"
              style={{ borderColor: COLORS.border }}
            >
              <span
                className="mx-auto grid size-11 place-items-center rounded-full"
                style={{ background: "#FFFFFF", color: COLORS.accent }}
              >
                <Link2 className="size-5" />
              </span>
              <p className="mt-3 font-bold text-[15px]">Accès rapide à votre dossier</p>
              <p className="mx-auto mt-1 max-w-[230px] text-[12.5px] leading-relaxed" style={{ color: COLORS.sub }}>
                Scannez le QR code ou utilisez le lien pour suivre votre réparation.
              </p>
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                // biome-ignore lint/performance/noImgElement: standard image tag is fine for QR code
                <img
                  src={qr}
                  alt="QR code de suivi"
                  className="mx-auto mt-4 size-[148px] rounded-[12px] border p-1.5"
                  style={{ borderColor: COLORS.border }}
                />
              ) : null}
              {publicUrl ? (
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="mt-4 flex w-full items-center gap-2 rounded-[12px] border px-3 py-2.5 text-left active:scale-[0.99]"
                  style={{ borderColor: COLORS.border }}
                  aria-label="Copier le lien de suivi"
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-[12px]" style={{ color: COLORS.sub }}>
                    {shortLink}
                  </span>
                  {copied ? (
                    <Check className="size-4 shrink-0" style={{ color: COLORS.accent }} />
                  ) : (
                    <Copy className="size-4 shrink-0" style={{ color: COLORS.sub }} />
                  )}
                </button>
              ) : null}
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px]" style={{ color: COLORS.sub }}>
                <ShieldCheck className="size-3.5" style={{ color: COLORS.accent }} /> Lien sécurisé et personnel.
              </p>
            </section>

            {[data.workshop.address, data.workshop.city, data.workshop.phone, data.workshop.email].some(Boolean) ? (
              <section
                className="rounded-[22px] border bg-white p-5 text-[13px] shadow-[0_1px_2px_rgba(16,24,40,0.035)]"
                style={{ borderColor: COLORS.border }}
              >
                <p className="font-bold text-[14px]">{shopName}</p>
                {[data.workshop.address, data.workshop.city].filter(Boolean).length ? (
                  <p className="mt-1" style={{ color: COLORS.sub }}>
                    {[data.workshop.address, data.workshop.city].filter(Boolean).join(", ")}
                  </p>
                ) : null}
                {data.workshop.phone ? <p style={{ color: COLORS.sub }}>{data.workshop.phone}</p> : null}
                {data.workshop.email ? <p style={{ color: COLORS.sub }}>{data.workshop.email}</p> : null}
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
