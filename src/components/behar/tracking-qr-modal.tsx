"use client";

import { useEffect, useState } from "react";
import { Copy, Eye, Check } from "lucide-react";
import { toast } from "sonner";

import { useBeharStore, type Repair } from "@/lib/behar-store";
import { Modal } from "./primitives";
import { generateQrDataUrl, publicAbsoluteUrl } from "@/lib/public-access";

interface TrackingQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  repairId: string;
}

export function TrackingQrModal({ isOpen, onClose, repairId }: TrackingQrModalProps) {
  const store = useBeharStore();
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);

  const repair = store.repairs.find((r) => r.id === repairId);
  const customer = repair ? store.customers.find((c) => c.id === repair.customerId) : undefined;

  useEffect(() => {
    if (!isOpen || !repairId) return;

    // Ensure the repair has public access token & url
    const access = store.ensureRepairPublicAccess(repairId);
    if (access?.url) {
      const trackingUrl = publicAbsoluteUrl(access.url);
      generateQrDataUrl(trackingUrl)
        .then(setQr)
        .catch((err) => {
          console.error("Failed to generate QR Code", err);
          setQr("");
        });
    }
  }, [isOpen, repairId, store]);

  if (!repair) return null;

  const access = store.ensureRepairPublicAccess(repairId);
  const trackingUrl = access?.url ? publicAbsoluteUrl(access.url) : "";

  const copyLink = async () => {
    if (!trackingUrl) return;
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Lien de suivi copié");
    } catch (err) {
      toast.error("Copie impossible");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Suivi client (QR Code)" maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qr}
            alt="QR Code Suivi Client"
            className="size-48 rounded-[16px] border border-[#E8E8E5] p-3 shadow-md bg-white"
          />
        ) : (
          <div className="size-48 rounded-[16px] border border-dashed border-[#E8E8E5] bg-[#FAFAF8] flex items-center justify-center text-[#6B6B6B]">
            Génération du QR...
          </div>
        )}

        <div className="mt-6 w-full space-y-4 text-left border-t border-[#F7F7F7] pt-4">
          <div className="flex justify-between py-1.5 border-b border-[#F7F7F7]/60">
            <span className="text-xs text-[#6B6B6B] font-medium">Numéro de dossier</span>
            <span className="font-bold text-[#1A1916] text-sm">#{repair.number}</span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-[#F7F7F7]/60">
            <span className="text-xs text-[#6B6B6B] font-medium">Client</span>
            <span className="font-semibold text-[#1A1916] text-sm">{customer?.name ?? "Client de passage"}</span>
          </div>

          <div className="flex justify-between py-1.5">
            <span className="text-xs text-[#6B6B6B] font-medium">Appareil</span>
            <span className="font-semibold text-[#1A1916] text-sm">
              {[repair.brandName, repair.deviceModel || repair.model || repair.device].filter(Boolean).join(" ")}
            </span>
          </div>
        </div>

        <div className="mt-8 flex w-full gap-3">
          <button
            type="button"
            onClick={copyLink}
            className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white font-semibold text-[#1A1916] text-sm transition hover:bg-[#FAFAFA]"
          >
            {copied ? <Check className="size-4 text-[#2A9D8F]" /> : <Copy className="size-4" />}
            <span>{copied ? "Copié !" : "Copier le lien"}</span>
          </button>
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#2A9D8F] font-semibold text-white text-sm transition hover:bg-[#238579]"
          >
            <Eye className="size-4" />
            <span>Suivre en ligne</span>
          </a>
        </div>
      </div>
    </Modal>
  );
}
