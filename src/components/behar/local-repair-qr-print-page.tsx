"use client";

import { useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import { getCustomerTrackingUrl, getTrackingCode } from "@/lib/customer-tracking";
import { generateQrDataUrl } from "@/lib/public-link";
import { useBeharStore } from "@/lib/behar-store";

type QrFormat = "A4" | "A6" | "80mm" | "58mm";

const FORMAT_CLASS: Record<QrFormat, string> = {
  A4: "w-[210mm] min-h-[297mm] px-[28mm] py-[34mm]",
  A6: "w-[105mm] min-h-[148mm] px-[10mm] py-[12mm]",
  "80mm": "w-[80mm] min-h-[120mm] px-[5mm] py-[6mm]",
  "58mm": "w-[58mm] min-h-[96mm] px-[3mm] py-[4mm]",
};

const QR_SIZE_CLASS: Record<QrFormat, string> = {
  A4: "size-[72mm]",
  A6: "size-[56mm]",
  "80mm": "size-[48mm]",
  "58mm": "size-[40mm]",
};

function normalizeFormat(value: string | null): QrFormat {
  return value === "A4" || value === "A6" || value === "58mm" || value === "80mm" ? value : "80mm";
}

export function LocalRepairQrPrintPage({
  repairId,
}: Readonly<{ repairId: string }>) {
  const store = useBeharStore();
  const hydrated = useBeharStore((state) => state._hasHydrated);
  const [query, setQuery] = useState<{ repairId: string; autoPrint: boolean; format: QrFormat }>({
    repairId,
    autoPrint: false,
    format: "80mm",
  });
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryRepairId = params.get("repair");
    setQuery({
      repairId: queryRepairId && queryRepairId !== "_" ? queryRepairId : repairId,
      autoPrint: params.get("print") === "1",
      format: normalizeFormat(params.get("format")),
    });
  }, [repairId]);

  const repair = useMemo(
    () => store.repairs.find((entry) => entry.id === query.repairId),
    [query.repairId, store.repairs],
  );
  const customer = useMemo(
    () => store.customers.find((entry) => entry.id === repair?.customerId),
    [repair?.customerId, store.customers],
  );

  useEffect(() => {
    if (!hydrated || !repair) return;
    const access = repair.publicAccess ?? store.ensureRepairPublicAccess(repair.id);
    if (!access?.url) {
      toast.error("Lien de suivi indisponible.");
      return;
    }
    let cancelled = false;
    generateQrDataUrl(getCustomerTrackingUrl({ ...repair, publicAccess: access }, store.workshopSettings ?? store.workshopInfo))
      .then((value) => {
        if (!cancelled) setQrDataUrl(value);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) toast.error("Impossible de générer le QR Code.");
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, repair, store]);

  useEffect(() => {
    if (!hydrated || !query.autoPrint || !repair || !qrDataUrl) return;
    const timer = window.setTimeout(() => window.print(), 450);
    return () => window.clearTimeout(timer);
  }, [hydrated, query.autoPrint, qrDataUrl, repair]);

  if (!hydrated) {
    return <main className="grid min-h-screen place-items-center bg-white text-[#6B6B6B]">Chargement du QR Code...</main>;
  }

  if (!repair) {
    return (
      <main className="grid min-h-screen place-items-center bg-white p-8 text-center text-[#1A1916]">
        <div>
          <h1 className="font-bold text-xl">Dossier introuvable</h1>
          <p className="mt-2 text-[#6B6B6B]">Impossible d'imprimer le QR Code de suivi.</p>
        </div>
      </main>
    );
  }

  const shop = store.workshopSettings ?? store.workshopInfo;
  const shopName = shop.commercialName || shop.name || "Behar Tech";
  const customerName = customer?.name || "Client";
  const repairNumber = repair.number || repair.id.slice(-8).toUpperCase();
  const trackingUrl = getCustomerTrackingUrl(repair, shop);
  const shortLink = trackingUrl.replace(/^https?:\/\//, "");
  const deviceLabel = [repair.brandName, repair.deviceModel || repair.model || repair.device].filter(Boolean).join(" ");

  return (
    <main className="min-h-screen bg-white text-[#111111]">
      <style>{`
        @page {
          size: ${query.format === "A4" || query.format === "A6" ? query.format : `${query.format} auto`};
          margin: 0;
        }
        @media print {
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden !important;
          }
          .qr-print-page, .qr-print-page * {
            visibility: visible !important;
          }
          .qr-print-page {
            box-shadow: none !important;
            border: 0 !important;
          }
        }
      `}</style>
      <section
        className={`qr-print-page mx-auto flex flex-col items-center justify-start bg-white text-center ${FORMAT_CLASS[query.format]}`}
      >
        <p className="w-full break-words font-bold text-[15px] leading-tight text-[#111111]">{shopName}</p>
        <p className="mt-2 w-full break-words text-[12px] leading-tight text-[#111111]">
          Scannez pour suivre votre réparation
        </p>
        <p className="mt-2 w-full break-words font-mono font-bold text-[13px] leading-tight text-[#111111]">
          Code {getTrackingCode(repair) || repairNumber}
        </p>
        <p className="mt-1 w-full break-words text-[10px] leading-tight text-[#111111]">
          {customerName} · {deviceLabel}
        </p>
        <div className="mt-6 flex w-full justify-center">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR Code de suivi client"
              className={`${QR_SIZE_CLASS[query.format]} object-contain`}
            />
          ) : (
            <div className={`${QR_SIZE_CLASS[query.format]} bg-white`} />
          )}
        </div>
        {shortLink ? <p className="mt-3 w-full break-all text-[9px] leading-tight text-[#111111]">{shortLink}</p> : null}
      </section>
    </main>
  );
}
