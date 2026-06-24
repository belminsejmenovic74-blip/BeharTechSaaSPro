"use client";

import { useEffect, useMemo, useState } from "react";

import { useSearchParams } from "next/navigation";

import { Check, Copy, Download, FileText, Link2, MessageCircle, Phone, Send, ShieldCheck, Wrench } from "lucide-react";

import { getPrintableTarget } from "@/components/behar/local-printable-document";
import { useDocument } from "@/components/behar/print-provider";
import { RealDeviceVisual } from "@/components/behar/real-product-visual";
import { getPublicDocumentUrl } from "@/lib/documents/document-actions";
import { downloadPdfUrl } from "@/lib/download-file.client";
import type { PublicRepairDto } from "@/lib/public-dtos";
import { generateQrDataUrl, publicAbsoluteUrl } from "@/lib/public-link";
import { getBillingWorkshopInfo, type WorkshopInfo, useBeharStore } from "@/lib/behar-store";
import { getSupabase } from "@/lib/supabase/client";
import { formatMoney, getDocumentFilename, getWorkshopCountryConfig } from "@/lib/workshop-country";

// Page publique client : fond BLANC PUR, jamais de crème. Branding = boutique.
const COLORS = { bg: "#FFFFFF", text: "#1A1916", sub: "#6B6B6B", accent: "#2A9D8F", border: "#E8E8E5" };
const STEP_LABELS = ["Reçu", "Diagnostic", "Réparation", "Test final", "Prêt"];

function resolveShopName(candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    const value = (candidate ?? "").trim();
    if (value) return value;
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
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(date);
}

function formatTimeShort(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date);
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

function statusStep(status: string) {
  switch (status) {
    case "diagnosis":
    case "Diagnostic":
      return 1;
    case "repair":
    case "En réparation":
    case "Devis accepté":
      return 2;
    case "final_test":
    case "Test final":
      return 3;
    case "ready":
    case "delivered":
    case "Prêt":
    case "Clôturé":
      return 4;
    default:
      return 0;
  }
}

function headline(status: string) {
  switch (status) {
    case "diagnosis":
    case "Diagnostic":
      return ["Diagnostic en cours", "Nos techniciens analysent votre appareil avant intervention."];
    case "repair":
    case "En réparation":
    case "Devis accepté":
      return ["Réparation en cours", "Nos techniciens travaillent sur votre appareil."];
    case "final_test":
    case "Test final":
      return ["Tests finaux", "La réparation est terminée, nous vérifions le bon fonctionnement."];
    case "ready":
    case "Prêt":
      return ["Appareil prêt", "Votre appareil est prêt à être récupéré à l'atelier."];
    case "delivered":
    case "Clôturé":
      return ["Dossier clôturé", "Le dossier atelier est clôturé. Merci de votre confiance."];
    default:
      return ["Appareil reçu", "Votre appareil est bien arrivé à l'atelier. Le diagnostic va démarrer."];
  }
}

function cleanToken(value?: string | null) {
  const token = (value ?? "").trim();
  return token && token !== "_" ? token : "";
}

function tokenFromBrowserUrl() {
  if (typeof window === "undefined") return "";
  const queryToken = cleanToken(new URLSearchParams(window.location.search).get("t"));
  if (queryToken) return queryToken;
  const [, rawToken] = window.location.pathname.match(/\/(?:p|suivi)\/([^/?#]+)/) ?? [];
  return cleanToken(rawToken ? decodeURIComponent(rawToken) : "");
}

async function readPublicRepairFromApi(token: string): Promise<PublicRepairDto | null> {
  const response = await fetch(`/api/public/repairs/${encodeURIComponent(token)}`, { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  return response.json().catch(() => null);
}

function snapshotToPublicRepair(state: any, token: string, fallbackWorkshopName?: string): PublicRepairDto | null {
  const repairs = Array.isArray(state?.repairs) ? state.repairs : [];
  const repair = repairs.find((entry: any) => entry?.publicAccess?.token === token && entry.publicAccess.active !== false);
  if (!repair) return null;

  const customers = Array.isArray(state?.customers) ? state.customers : [];
  const documents = Array.isArray(state?.documents) ? state.documents : [];
  const quotes = Array.isArray(state?.quotes) ? state.quotes : [];
  const invoices = Array.isArray(state?.invoices) ? state.invoices : [];
  const payments = Array.isArray(state?.payments) ? state.payments : [];
  const ws = state?.workshopSettings ?? state?.workshopInfo ?? {};
  const billingWorkshop = getBillingWorkshopInfo(
    ws as WorkshopInfo,
    repair.billingCountry ?? ws.country ?? "FR",
  );
  const countryConfig = getWorkshopCountryConfig(billingWorkshop.country);
  const customer = customers.find((entry: any) => entry?.id === repair.customerId);
  const shopName = resolveShopName([
    billingWorkshop.commercialName,
    billingWorkshop.name,
    billingWorkshop.brand,
    fallbackWorkshopName,
  ]);

  return {
    workshop: {
      name: shopName,
      logoUrl: billingWorkshop.showLogo ? billingWorkshop.logoUrl : undefined,
      phone: billingWorkshop.phone || undefined,
      email: billingWorkshop.email || undefined,
      address: billingWorkshop.address || undefined,
      postalCode: billingWorkshop.postalCode || undefined,
      city: billingWorkshop.postalCity || billingWorkshop.city || undefined,
      country: countryConfig.country,
      currency: countryConfig.currency,
      locale: countryConfig.locale,
      canton: countryConfig.country === "CH" ? billingWorkshop.swissCanton || undefined : undefined,
      businessId:
        countryConfig.country === "CH" ? billingWorkshop.swissUid || undefined : billingWorkshop.siret || undefined,
      vatNumber:
        countryConfig.country === "CH"
          ? billingWorkshop.swissVatNumber || undefined
          : billingWorkshop.tvaNumber || undefined,
      vatApplicable: Boolean(billingWorkshop.vatApplicable),
      vatMention: billingWorkshop.tvaMention || undefined,
    },
    repair: {
      number: repair.number,
      status: repair.status,
      statusLabel: repair.status,
      deviceBrand: repair.brandName,
      deviceModel: repair.deviceModel || repair.device,
      deviceType: repair.deviceType,
      issueDescription: repair.issue,
      createdAt: repair.droppedAt,
      updatedAt: repair.updatedAt || repair.droppedAt,
    },
    client: { displayName: customer?.name || "Client" },
    timeline: (repair.history ?? []).map((title: string) => ({
      title,
      date: repair.updatedAt || repair.droppedAt,
      visibility: "client" as const,
    })),
    documents: documents
      .filter((doc: any) => doc.repairId === repair.id && doc.type !== "internal")
      .map((doc: any) => ({
        type: doc.type,
        title: doc.title,
        number:
          quotes.find((quote: any) => quote.id === doc.quoteId)?.number ||
          invoices.find((invoice: any) => invoice.id === doc.invoiceId)?.number ||
          payments.find((payment: any) => payment.id === doc.paymentId)?.paymentNumber ||
          (doc.type === "intake" ? repair.number : undefined),
        status: "ready",
        previewUrl: getPublicDocumentUrl(doc),
        downloadUrl: doc.fileUrl || undefined,
      })),
    messages: (repair.messages ?? [])
      .filter((message: any) => message.visibility === "client")
      .map((message: any) => ({
        authorType: message.authorType,
        authorName: message.authorName,
        body: message.body,
        createdAt: message.createdAt,
      })),
    quoteLinks: quotes
      .filter((quote: any) => quote.repairId === repair.id)
      .map((quote: any) => ({
        number: quote.number,
        status: quote.status,
        totalTtc: quote.totalTtc ?? quote.totalAmount ?? 0,
        previewUrl: quote.publicUrl || "",
        downloadUrl: documents.find((d: any) => d.quoteId === quote.id && d.type === "quote")?.fileUrl || undefined,
      })),
    invoiceLinks: invoices
      .filter((invoice: any) => invoice.repairId === repair.id)
      .map((invoice: any) => ({
        number: invoice.number,
        status: invoice.status,
        totalTtc: (invoice.lines ?? []).reduce((sum: number, line: any) => sum + (line.total ?? 0), 0),
        previewUrl: invoice.publicUrl || "",
        downloadUrl:
          documents.find((d: any) => d.invoiceId === invoice.id && d.type === "invoice")?.fileUrl || undefined,
      })),
    receiptLinks: payments
      .filter((payment: any) => payment.repairId === repair.id && payment.status === "Payé")
      .map((payment: any) => ({
        number: payment.paymentNumber,
        status: payment.status,
        amount: payment.amount,
        previewUrl: payment.publicUrl || "",
        downloadUrl:
          documents.find((d: any) => d.paymentId === payment.id && d.type === "payment")?.fileUrl || undefined,
      })),
  };
}

async function readPublicRepairFromSnapshots(token: string): Promise<PublicRepairDto | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const filtered = await supabase
    .from("workshop_snapshots")
    .select("workshop_name,state,updated_at")
    .contains("state", { repairs: [{ publicAccess: { token } }] })
    .order("updated_at", { ascending: false })
    .limit(5);

  const rows =
    filtered.data && filtered.data.length
      ? filtered.data
      : (
          await supabase
            .from("workshop_snapshots")
            .select("workshop_name,state,updated_at")
            .order("updated_at", { ascending: false })
            .limit(50)
        ).data;

  for (const row of rows ?? []) {
    const data = snapshotToPublicRepair((row as any).state, token, (row as any).workshop_name);
    if (data) return data;
  }
  return null;
}

function notFound(shopName?: string) {
  const name = resolveShopName([shopName]);
  return (
    <div className="grid min-h-screen place-items-center px-6" style={{ background: COLORS.bg, color: COLORS.text }}>
      <div
        className="w-full max-w-[420px] rounded-[22px] border bg-white p-8 text-center shadow-[0_18px_50px_rgba(26,25,22,0.06)]"
        style={{ borderColor: COLORS.border }}
      >
        <span
          className="mx-auto grid size-12 place-items-center rounded-full"
          style={{ background: "#F7F7F7", color: COLORS.sub }}
        >
          <ShieldCheck className="size-6" />
        </span>
        <p className="mt-4 font-bold text-[19px] tracking-tight">Lien de suivi indisponible</p>
        <p className="mt-2 text-[14px] leading-relaxed" style={{ color: COLORS.sub }}>
          Ce lien n'est plus valide ou a expiré. Veuillez contacter {name} pour obtenir un nouveau lien de suivi.
        </p>
        <p className="mt-5 font-semibold text-[14px]">{name}</p>
      </div>
    </div>
  );
}

export function PublicTrackingView({ token: tokenProp }: { token?: string }) {
  const { download, preview } = useDocument();
  const searchParams = useSearchParams();
  const [browserToken, setBrowserToken] = useState("");
  const token = cleanToken(tokenProp) || cleanToken(searchParams.get("t")) || browserToken;
  const [remote, setRemote] = useState<PublicRepairDto | null>(null);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [draft, setDraft] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [downloadingDocument, setDownloadingDocument] = useState("");

  const hydrated = useBeharStore((s) => s._hasHydrated);
  const repairs = useBeharStore((s) => s.repairs);
  const customers = useBeharStore((s) => s.customers);
  const documents = useBeharStore((s) => s.documents);
  const quotes = useBeharStore((s) => s.quotes);
  const invoices = useBeharStore((s) => s.invoices);
  const payments = useBeharStore((s) => s.payments);
  const ws = useBeharStore((s) => s.workshopSettings ?? s.workshopInfo);
  const addRepairMessage = useBeharStore((s) => s.addRepairMessage);
  const markRepairMessagesRead = useBeharStore((s) => s.markRepairMessagesRead);

  useEffect(() => {
    setBrowserToken(tokenFromBrowserUrl());
  }, [searchParams]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoadingRemote(true);
    readPublicRepairFromApi(token)
      .then((apiData) => apiData ?? readPublicRepairFromSnapshots(token))
      .then((data) => {
        if (!cancelled) setRemote(data ?? null);
      })
      .catch(() => {
        if (!cancelled) setRemote(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingRemote(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const localRepair = useMemo(
    () => repairs.find((repair) => repair.publicAccess?.token === token && repair.publicAccess?.active !== false),
    [repairs, token],
  );

  useEffect(() => {
    if (localRepair) markRepairMessagesRead(localRepair.id, "client");
  }, [localRepair, markRepairMessagesRead]);

  const data = useMemo(() => {
    // Si le dossier est présent dans le store local (poste de l'atelier), on l'utilise en priorité :
    // c'est toujours la source la plus fraîche (messages/documents qui viennent d'être créés).
    // Pour un client sur un autre appareil, il n'y a pas de localRepair → on retombe sur le remote (Supabase).
    if (!localRepair) return remote ?? null;
    const customer = customers.find((entry) => entry.id === localRepair.customerId);
    const billingWorkshop = getBillingWorkshopInfo(ws, localRepair.billingCountry);
    const shopName = resolveShopName([
      billingWorkshop.commercialName,
      billingWorkshop.name,
      billingWorkshop.brand,
    ]);
    const countryConfig = getWorkshopCountryConfig(billingWorkshop.country);
    return {
      workshop: {
        name: shopName,
        logoUrl: billingWorkshop.showLogo ? billingWorkshop.logoUrl : undefined,
        phone: billingWorkshop.phone || undefined,
        email: billingWorkshop.email || undefined,
        address: billingWorkshop.address || undefined,
        postalCode: billingWorkshop.postalCode || undefined,
        city: billingWorkshop.postalCity || billingWorkshop.city || undefined,
        country: countryConfig.country,
        currency: countryConfig.currency,
        locale: countryConfig.locale,
        canton: countryConfig.country === "CH" ? billingWorkshop.swissCanton || undefined : undefined,
        businessId:
          countryConfig.country === "CH"
            ? billingWorkshop.swissUid || undefined
            : billingWorkshop.siret || undefined,
        vatNumber:
          countryConfig.country === "CH"
            ? billingWorkshop.swissVatNumber || undefined
            : billingWorkshop.tvaNumber || undefined,
        vatApplicable: Boolean(billingWorkshop.vatApplicable),
        vatMention: billingWorkshop.tvaMention || undefined,
      },
      repair: {
        number: localRepair.number,
        status: localRepair.status,
        statusLabel: localRepair.status,
        deviceBrand: localRepair.brandName,
        deviceModel: localRepair.deviceModel || localRepair.device,
        deviceType: localRepair.deviceType,
        issueDescription: localRepair.issue,
        createdAt: localRepair.droppedAt,
        updatedAt: localRepair.updatedAt || localRepair.droppedAt,
      },
      client: { displayName: customer?.name || "Client" },
      timeline: localRepair.history.map((title) => ({
        title,
        date: localRepair.updatedAt || localRepair.droppedAt,
        visibility: "client" as const,
      })),
      documents: documents
        .filter((doc) => doc.repairId === localRepair.id && doc.type !== "internal")
        .map((doc) => ({
          type: doc.type,
          title: doc.title,
          number:
            quotes.find((quote) => quote.id === doc.quoteId)?.number ||
            invoices.find((invoice) => invoice.id === doc.invoiceId)?.number ||
            payments.find((payment) => payment.id === doc.paymentId)?.paymentNumber ||
            (doc.type === "intake" ? localRepair.number : undefined),
          status: "ready",
          previewUrl: getPublicDocumentUrl(doc),
          downloadUrl: doc.fileUrl || undefined,
        })),
      messages: (localRepair.messages ?? [])
        .filter((message) => message.visibility === "client")
        .map((message) => ({
          authorType: message.authorType,
          authorName: message.authorName,
          body: message.body,
          createdAt: message.createdAt,
        })),
      quoteLinks: quotes
        .filter((quote) => quote.repairId === localRepair.id)
        .map((quote) => {
          const document = documents.find((doc) => doc.quoteId === quote.id && doc.type === "quote");
          return {
            number: quote.number,
            status: quote.status,
            totalTtc: quote.totalTtc ?? quote.totalAmount ?? 0,
            previewUrl: document ? getPublicDocumentUrl(document) : "",
            downloadUrl: document?.fileUrl || undefined,
          };
        }),
      invoiceLinks: invoices
        .filter((invoice) => invoice.repairId === localRepair.id)
        .map((invoice) => {
          const document = documents.find((doc) => doc.invoiceId === invoice.id && doc.type === "invoice");
          return {
            number: invoice.number,
            status: invoice.status,
            totalTtc: invoice.lines.reduce((sum, line) => sum + line.total, 0),
            previewUrl: document ? getPublicDocumentUrl(document) : "",
            downloadUrl: document?.fileUrl || undefined,
          };
        }),
      receiptLinks: payments
        .filter((payment) => payment.repairId === localRepair.id && payment.status === "Payé")
        .map((payment) => {
          const document = documents.find((doc) => doc.paymentId === payment.id && doc.type === "payment");
          return {
            number: payment.paymentNumber,
            status: payment.status,
            amount: payment.amount,
            previewUrl: document ? getPublicDocumentUrl(document) : "",
            downloadUrl: document?.fileUrl || undefined,
          };
        }),
    } satisfies PublicRepairDto;
  }, [customers, documents, invoices, localRepair, payments, quotes, remote, ws]);

  const publicUrl = useMemo(() => {
    if (localRepair?.publicAccess?.url) return publicAbsoluteUrl(localRepair.publicAccess.url);
    return token ? publicAbsoluteUrl(`/p/${token}`) : "";
  }, [localRepair, token]);

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
    if (!hasType("payment_receipt")) {
      rows.push(
        ...data.receiptLinks.map((receipt) => ({
          key: `receipt:${receipt.number}`,
          type: "payment_receipt",
          title: `Reçu ${receipt.number} - ${formatMoney(receipt.amount, data.workshop.currency)}`,
          status: receipt.status,
          number: receipt.number,
          previewUrl: receipt.previewUrl,
          downloadUrl: receipt.downloadUrl,
        })),
      );
    }
    return rows.map((row) => {
      const linkedQuote = row.type === "quote" ? quotes.find((quote) => quote.number === row.number) : undefined;
      const linkedInvoice =
        row.type === "invoice" ? invoices.find((invoice) => invoice.number === row.number) : undefined;
      const linkedPayment =
        row.type === "payment_receipt"
          ? payments.find((payment) => payment.paymentNumber === row.number)
          : undefined;
      const localDocument = localRepair
        ? documents.find((document) => {
            if (document.repairId !== localRepair.id) return false;
            if (linkedQuote) return document.quoteId === linkedQuote.id;
            if (linkedInvoice) return document.invoiceId === linkedInvoice.id;
            if (linkedPayment) return document.paymentId === linkedPayment.id;
            if (row.type === "payment_receipt") return document.type === "payment";
            return document.type === row.type;
          })
        : undefined;
      const localTarget = localDocument ? getPrintableTarget(localDocument) : null;
      const filenameType =
        row.type === "payment_receipt"
          ? "payment"
          : row.type === "repair_intake"
            ? "intake"
            : row.type === "sale_receipt"
              ? "sale-receipt"
              : row.type;
      return {
        ...row,
        localTarget,
        filename: getDocumentFilename(
          filenameType as "intake" | "quote" | "invoice" | "payment" | "sale-receipt",
          row.number || localRepair?.number || "document",
        ),
      };
    });
  }, [data, documents, invoices, localRepair, payments, quotes]);

  useEffect(() => {
    if (publicUrl) generateQrDataUrl(publicUrl).then(setQr).catch(() => setQr(""));
  }, [publicUrl]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !data) return;
    // Dossier dans le store local (poste atelier) → on écrit directement, c'est instantané et persisté.
    if (localRepair) {
      addRepairMessage(localRepair.id, { body, visibility: "client", authorType: "client", authorName: data.client.displayName });
    } else if (remote) {
      const response = await fetch(`/api/public/repairs/${encodeURIComponent(token)}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, authorName: data.client.displayName }),
      }).catch(() => null);
      if (response?.ok) {
        const fresh = await fetch(`/api/public/repairs/${encodeURIComponent(token)}`, { cache: "no-store" }).then((r) =>
          r.ok ? r.json() : null,
        );
        if (fresh) setRemote(fresh);
      }
    }
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

  if ((loadingRemote && !hydrated) || (!token && !hydrated)) {
    return (
      <div
        className="grid min-h-screen place-items-center"
        style={{ background: COLORS.bg, color: COLORS.sub }}
      >
        Chargement…
      </div>
    );
  }

  if (!data) return notFound(resolveShopName([ws.commercialName, ws.name]));

  const shopName = resolveShopName([data.workshop.name]);
  const initials = shopInitials(shopName);
  const active = statusStep(data.repair.status);
  const [title, body] = headline(data.repair.status);
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

            <h1 className="mt-6 font-bold text-[26px] leading-tight tracking-tight">Suivi de votre réparation</h1>
            <p className="mt-1.5 text-[14px]" style={{ color: COLORS.sub }}>
              {shopName} vous tient informé à chaque étape.
            </p>

            {/* Carte dossier */}
            <section
              className="mt-5 rounded-[20px] border bg-white p-5 shadow-[0_10px_30px_rgba(26,25,22,0.04)]"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-[20px] tracking-tight">{data.repair.number}</span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold text-[12px]"
                  style={{ background: "#E6F4F1", color: "#1E7A6E" }}
                >
                  <span className="size-2 rounded-full" style={{ background: COLORS.accent }} /> {data.repair.statusLabel}
                </span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-[104px_1fr] sm:items-center">
                <RealDeviceVisual
                  brand={data.repair.deviceBrand}
                  className="size-[104px] rounded-[18px] border border-[#E8E8E5] bg-[#FAFAF8] p-2 shadow-[0_10px_24px_rgba(26,25,22,0.045)]"
                  model={data.repair.deviceModel}
                  type={data.repair.deviceType}
                />
                <div className="grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-3">
                  <div>
                    <p style={{ color: COLORS.sub }}>Client</p>
                    <p className="font-semibold">{data.client.displayName}</p>
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
                </div>
              </div>
            </section>

            {/* Timeline étapes — avec date/heure quand disponible */}
            <section
              className="mt-4 rounded-[20px] border bg-white p-5 shadow-[0_10px_30px_rgba(26,25,22,0.04)]"
              style={{ borderColor: COLORS.border }}
            >
              <div className="grid grid-cols-5">
                {STEP_LABELS.map((label, index) => {
                  const done = index < active;
                  const current = index === active;
                  const sourceDate =
                    index === 0 ? data.repair.createdAt : current ? data.repair.updatedAt : undefined;
                  const day = done && index !== 0 ? "—" : index > active ? "À venir" : formatDayShort(sourceDate) || "—";
                  const time = index === 0 || current ? formatTimeShort(sourceDate) : "";
                  return (
                    <div key={label} className="relative px-0.5 text-center">
                      {index < STEP_LABELS.length - 1 ? (
                        <span
                          className="absolute right-0 left-1/2 top-3.5 h-px"
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
                              : { borderColor: "#D7D5CF", color: "#8A8A8A" }
                        }
                      >
                        {done ? <Check className="size-4" /> : index + 1}
                      </span>
                      <p
                        className="mt-2 font-semibold text-[11px] sm:text-[12px]"
                        style={current ? { color: COLORS.accent } : undefined}
                      >
                        {label}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-tight" style={{ color: "#8A8A8A" }}>
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
              style={{ borderColor: "#D7EFEA", background: "#F0FAF7" }}
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
              className="mt-4 rounded-[20px] border bg-white p-5 shadow-[0_10px_30px_rgba(26,25,22,0.04)]"
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
                      style={{ background: "#F7F7F7", color: COLORS.accent }}
                    >
                      <FileText className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[14px]">{doc.title}</p>
                      <p className="text-[12px]" style={{ color: COLORS.sub }}>
                        {doc.previewUrl || doc.downloadUrl || doc.localTarget ? "Disponible" : "À venir"}
                      </p>
                    </div>
                    {doc.previewUrl || doc.downloadUrl || doc.localTarget ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        {doc.previewUrl || doc.downloadUrl || doc.localTarget ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (doc.localTarget) {
                                preview(doc.localTarget.type, doc.localTarget.id);
                                return;
                              }
                              if (doc.downloadUrl) {
                                window.open(doc.downloadUrl, "_blank", "noopener,noreferrer");
                                return;
                              }
                              if (doc.previewUrl) {
                                window.open(doc.previewUrl, "_blank", "noopener,noreferrer");
                              }
                            }}
                            className="rounded-full px-3 py-1 font-semibold text-[12.5px]"
                            style={{ background: "#E6F4F1", color: "#1E7A6E" }}
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
                              void downloadPdfUrl(doc.downloadUrl, doc.filename).finally(() =>
                                setDownloadingDocument(""),
                              );
                              return;
                            }
                            if (doc.localTarget) {
                              download(doc.localTarget.type, doc.localTarget.id);
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
                        style={{ background: "#F7F7F7", color: "#8A8A8A" }}
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
              className="mt-4 rounded-[20px] border bg-white p-5 shadow-[0_10px_30px_rgba(26,25,22,0.04)]"
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
                    <li key={`${message.createdAt}-${index}`} className="flex items-start gap-3">
                      <span
                        className="grid size-8 shrink-0 place-items-center rounded-full font-bold text-[12px]"
                        style={isClient ? { background: "#EEF2FF", color: "#4F46E5" } : { background: "#E6F4F1", color: "#1E7A6E" }}
                      >
                        {isClient ? "V" : initials.slice(0, 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="font-semibold text-[13px]">{isClient ? "Vous" : shopName}</p>
                          <p className="shrink-0 text-[11px]" style={{ color: "#8A8A8A" }}>
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
              className="rounded-[22px] border bg-white p-6 text-center shadow-[0_14px_40px_rgba(26,25,22,0.06)]"
              style={{ borderColor: COLORS.border }}
            >
              <span
                className="mx-auto grid size-11 place-items-center rounded-full"
                style={{ background: "#EAF6F2", color: COLORS.accent }}
              >
                <Link2 className="size-5" />
              </span>
              <p className="mt-3 font-bold text-[15px]">Accès rapide à votre dossier</p>
              <p className="mx-auto mt-1 max-w-[230px] text-[12.5px] leading-relaxed" style={{ color: COLORS.sub }}>
                Scannez le QR code ou utilisez le lien pour suivre votre réparation.
              </p>
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
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
              <p
                className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px]"
                style={{ color: COLORS.sub }}
              >
                <ShieldCheck className="size-3.5" style={{ color: COLORS.accent }} /> Lien sécurisé et personnel.
              </p>
            </section>

            {[data.workshop.address, data.workshop.city, data.workshop.phone, data.workshop.email].some(Boolean) ? (
              <section
                className="rounded-[22px] border bg-white p-5 text-[13px] shadow-[0_10px_30px_rgba(26,25,22,0.04)]"
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
