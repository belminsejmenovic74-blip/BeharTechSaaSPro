"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Eye, Printer, X } from "lucide-react";
import { toast } from "sonner";

import { useBeharStore } from "@/lib/behar-store";
import { Modal } from "./primitives";
import { getCustomerTrackingUrl, getTrackingCode } from "@/lib/customer-tracking";
import { generateQrDataUrl } from "@/lib/public-access";
import { printRepairQr } from "@/lib/documents/document-actions";

interface TrackingQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  repairId: string;
}

export function TrackingQrModal({ isOpen, onClose, repairId }: TrackingQrModalProps) {
  const store = useBeharStore();
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<"A4" | "80mm" | "58mm">("80mm");

  const repair = store.repairs.find((r) => r.id === repairId);
  const customer = repair ? store.customers.find((c) => c.id === repair.customerId) : undefined;
  const workshop = store.workshopSettings ?? store.workshopInfo;
  const trackingUrl = repair ? getCustomerTrackingUrl(repair, workshop) : "";

  useEffect(() => {
    if (!isOpen || !repairId) return;

    const access = store.ensureRepairPublicAccess(repairId);
    const current = store.repairs.find((r) => r.id === repairId);
    const url =
      current && access
        ? getCustomerTrackingUrl({ ...current, publicAccess: access }, store.workshopSettings ?? store.workshopInfo)
        : "";
    if (!url) return;
    generateQrDataUrl(url)
      .then(setQr)
      .catch((err) => {
        console.error("Failed to generate QR Code", err);
        setQr("");
      });
  }, [isOpen, repairId, store]);

  if (!repair) return null;
  const shopName = workshop.commercialName || workshop.name || "Behar Tech";
  const trackingCode = getTrackingCode(repair);

  const copyLink = async () => {
    if (!trackingUrl) {
      toast.error("Lien de suivi indisponible.");
      return;
    }
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Lien de suivi copié");
    } catch (err) {
      toast.error("Copie impossible");
    }
  };

  const printQr = () => {
    if (printRepairQr(repair.id, { format })) toast.success("Impression du QR lancée.");
    else toast.error("QR de suivi indisponible.");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Suivi client" maxWidth="max-w-[520px]">
      <div className="flex flex-col items-center text-center">
        <div className="mb-5 flex w-full items-start justify-between gap-4 text-left">
          <div>
            <p className="font-semibold text-[#101828] text-[18px]">QR Code de suivi</p>
            <p className="mt-1 text-[#667085] text-sm">Scannez pour suivre votre réparation.</p>
          </div>
          <button
            aria-label="Fermer"
            className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-[#E4E7EC] bg-white text-[#667085]"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qr}
            alt="QR Code Suivi Client"
            className="size-64 rounded-[18px] border border-[#E4E7EC] bg-white p-4 shadow-[0_16px_48px_rgba(16,24,40,0.08)]"
          />
        ) : (
          <div className="flex size-64 items-center justify-center rounded-[18px] border border-dashed border-[#E4E7EC] bg-[#FFFFFF] text-[#667085]">
            Génération du QR...
          </div>
        )}

        <div className="mt-6 w-full space-y-3 rounded-[16px] border border-[#E4E7EC] bg-[#F9FAFB] p-4 text-left">
          <div className="flex justify-between gap-4">
            <span className="font-medium text-[#667085] text-xs">Boutique</span>
            <span className="text-right font-bold text-[#101828] text-sm">{shopName}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="font-medium text-[#667085] text-xs">Code de suivi</span>
            <span className="font-mono font-bold text-[#101828] text-sm">{trackingCode}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="font-medium text-[#667085] text-xs">Dossier</span>
            <span className="text-right font-semibold text-[#101828] text-sm">{repair.number}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="font-medium text-[#667085] text-xs">Client</span>
            <span className="text-right font-semibold text-[#101828] text-sm">
              {customer?.name ?? "Client de passage"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="font-medium text-[#667085] text-xs">Appareil</span>
            <span className="text-right font-semibold text-[#101828] text-sm">
              {[repair.brandName, repair.deviceModel || repair.model || repair.device].filter(Boolean).join(" ")}
            </span>
          </div>
        </div>

        {trackingUrl ? (
          <a
            className="mt-4 w-full break-all rounded-[12px] border border-[#E4E7EC] bg-white px-3 py-2.5 text-left font-mono text-[#1E7A6E] text-xs hover:underline"
            href={trackingUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {trackingUrl}
          </a>
        ) : null}

        <div className="mt-5 grid w-full gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-[#E4E7EC] bg-white font-semibold text-[#101828] text-sm transition hover:bg-[#FFFFFF]"
          >
            {copied ? <Check className="size-4 text-[#2A9D8F]" /> : <Copy className="size-4" />}
            <span>{copied ? "Copié !" : "Copier le lien"}</span>
          </button>
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#2A9D8F] font-semibold text-white text-sm transition hover:bg-[#238579] ${trackingUrl ? "" : "pointer-events-none opacity-50"}`}
          >
            <Eye className="size-4" />
            <span>Ouvrir le suivi</span>
          </a>
        </div>
        <div className="mt-3 grid w-full grid-cols-[1fr_auto] gap-2">
          <select
            className="h-11 rounded-[12px] border border-[#E4E7EC] bg-white px-3 text-sm font-semibold outline-none focus:border-[#2A9D8F]"
            onChange={(event) => setFormat(event.target.value as "A4" | "80mm" | "58mm")}
            value={format}
          >
            <option value="A4">A4</option>
            <option value="80mm">Format 80 mm</option>
            <option value="58mm">Format 58 mm</option>
          </select>
          <button
            type="button"
            onClick={printQr}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-[#E4E7EC] bg-white px-4 font-semibold text-[#101828] text-sm transition hover:bg-[#FFFFFF] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer className="size-4" />
            <span>Imprimer QR</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
