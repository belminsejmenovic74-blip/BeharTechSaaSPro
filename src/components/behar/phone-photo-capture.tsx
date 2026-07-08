"use client";

import { useEffect, useRef, useState } from "react";

import { Check, Smartphone, Wifi, WifiOff, X } from "lucide-react";

import { openReceiverRelay } from "@/lib/photo-relay";
import { generateQrCodeDataUrl, publicAbsoluteUrl } from "@/lib/public-access";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { BeharLogo } from "./behar-logo";

const SLOT_LABELS: Record<string, string> = { face: "Face", dos: "Dos", cote: "Côté", defaut: "Défaut" };

/**
 * Modal PC : affiche un QR code à scanner avec le téléphone. Les photos prises sur le
 * téléphone arrivent en direct (Supabase Realtime) et remplissent les slots via `onPhoto`.
 */
export function PhonePhotoCapture({
  token,
  deviceLabel,
  onPhoto,
  onClose,
}: Readonly<{
  token: string;
  deviceLabel: string;
  onPhoto: (slot: string, dataUrl: string) => void;
  onClose: () => void;
}>) {
  const configured = isSupabaseConfigured();
  const [qr, setQr] = useState("");
  const [url, setUrl] = useState("");
  const [connected, setConnected] = useState(false);
  const [received, setReceived] = useState<string[]>([]);
  const onPhotoRef = useRef(onPhoto);
  onPhotoRef.current = onPhoto;

  useEffect(() => {
    const target = publicAbsoluteUrl(`/capture?t=${token}`);
    setUrl(target);
    generateQrCodeDataUrl(target)
      .then(setQr)
      .catch(() => undefined);
  }, [token]);

  useEffect(() => {
    if (!configured) return;
    const close = openReceiverRelay(token, {
      onPeer: () => setConnected(true),
      onPhoto: ({ slot, dataUrl }) => {
        onPhotoRef.current(slot, dataUrl);
        setConnected(true);
        setReceived((prev) => (prev.includes(slot) ? prev : [...prev, slot]));
      },
    });
    return () => close?.();
  }, [token, configured]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1A1916]/35" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[420px] rounded-[20px] border border-[#E8E8E5] bg-white p-6 shadow-[0_24px_60px_rgba(26,25,22,0.18)]">
        <div className="flex items-start justify-between">
          <BeharLogo size="sm" />
          <button
            aria-label="Fermer"
            className="grid size-8 place-items-center rounded-[9px] bg-[#FFFFFF] text-[#6B6B6B] transition hover:bg-[#FFFFFF] hover:text-[#1A1916]"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <h2 className="mt-4 font-semibold text-[#1A1916] text-lg tracking-tight">Photographier avec le téléphone</h2>
        <p className="mt-1 text-[#6B6B6B] text-sm">
          Scannez ce QR code avec votre téléphone, prenez les photos de {deviceLabel || "l'appareil"} : elles s'ajoutent
          ici automatiquement.
        </p>

        {configured ? (
          <>
            <div className="mt-5 flex flex-col items-center">
              <div className="rounded-[16px] border border-[#E8E8E5] bg-white p-3">
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="QR capture" className="size-44" src={qr} />
                ) : (
                  <div className="size-44 animate-pulse rounded-[8px] bg-[#FFFFFF]" />
                )}
              </div>
              <span
                className={cn(
                  "mt-3 inline-flex h-7 items-center gap-1.5 rounded-[8px] px-2.5 font-semibold text-[12px]",
                  connected ? "bg-[#FFFFFF] text-[#147065]" : "bg-[#FFFFFF] text-[#9A6B1B]",
                )}
              >
                {connected ? <Wifi className="size-3.5" /> : <Smartphone className="size-3.5" />}
                {connected ? "Téléphone connecté" : "En attente du téléphone…"}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2">
              {(["face", "dos", "cote", "defaut"] as const).map((slot) => {
                const done = received.includes(slot);
                return (
                  <div
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-[12px] border px-1 py-2.5 text-center",
                      done ? "border-[#CDEBE4] bg-[#FFFFFF]" : "border-[#E8E8E5] bg-[#FFFFFF]",
                    )}
                    key={slot}
                  >
                    <span
                      className={cn(
                        "grid size-6 place-items-center rounded-full",
                        done ? "bg-[#2A9D8F] text-white" : "bg-white text-[#9A9A95]",
                      )}
                    >
                      {done ? <Check className="size-3.5" /> : <Smartphone className="size-3.5" />}
                    </span>
                    <span className="text-[#1A1916] text-[11px] font-medium">{SLOT_LABELS[slot]}</span>
                  </div>
                );
              })}
            </div>

            <p className="mt-4 break-all rounded-[10px] bg-[#FFFFFF] px-3 py-2 text-center text-[#6B6B6B] text-[11px]">
              {url}
            </p>
          </>
        ) : (
          <div className="mt-5 flex items-start gap-3 rounded-[14px] border border-[#F0D2CD] bg-[#FFFFFF] p-4 text-[#C0564D]">
            <WifiOff className="mt-0.5 size-5 shrink-0" />
            <p className="text-sm">
              Le relais photo n'est pas disponible sur ce poste. Importez les photos directement depuis l'ordinateur.
            </p>
          </div>
        )}

        <button
          className="mt-5 h-11 w-full rounded-[12px] bg-[#2A9D8F] font-semibold text-sm text-white transition hover:bg-[#238579]"
          onClick={onClose}
          type="button"
        >
          Terminer
        </button>
      </div>
    </div>
  );
}
