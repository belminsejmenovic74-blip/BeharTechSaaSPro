"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useSearchParams } from "next/navigation";

import { AlertTriangle, Camera, Check, Loader2, Wifi, WifiOff } from "lucide-react";

import { fileToCompressedDataUrl } from "@/lib/image-capture";
import { openSenderRelay, type SenderRelay } from "@/lib/photo-relay";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { BeharLogo } from "./behar-logo";

const SLOTS: { key: string; label: string }[] = [
  { key: "face", label: "Face avant" },
  { key: "dos", label: "Dos" },
  { key: "cote", label: "Côté / tranche" },
  { key: "defaut", label: "Défaut / détail" },
];

export function PhoneCaptureScreen() {
  const params = useSearchParams();
  return <PhoneCaptureView token={params.get("t") ?? ""} />;
}

export function PhoneCaptureView({ token }: Readonly<{ token: string }>) {
  const configured = useMemo(() => isSupabaseConfigured(), []);
  const relayRef = useRef<SenderRelay | null>(null);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token || !configured) return;
    const relay = openSenderRelay(token, { onConnected: () => setConnected(true) });
    relayRef.current = relay;
    return () => {
      relay?.close();
      relayRef.current = null;
    };
  }, [token, configured]);

  const onFile = async (slot: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(slot);
    try {
      const dataUrl = await fileToCompressedDataUrl(file, 900, 0.6);
      await relayRef.current?.send({ slot, dataUrl });
      setSent((prev) => ({ ...prev, [slot]: dataUrl }));
    } catch {
      /* envoi impossible */
    } finally {
      setBusy(null);
    }
  };

  if (!token) {
    return <CenterMessage icon={AlertTriangle} text="Lien de capture invalide. Rescannez le QR code depuis l'ordinateur." title="Lien invalide" />;
  }
  if (!configured) {
    return <CenterMessage icon={WifiOff} text="Le relais photo n'est pas disponible (connexion serveur non configurée)." title="Indisponible" />;
  }

  return (
    <div className="min-h-svh bg-[#FAFAF8] px-4 py-6 text-[#1A1916]">
      <div className="mx-auto w-full max-w-[460px]">
        <div className="flex items-center justify-between">
          <BeharLogo size="sm" />
          <span
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-[8px] px-2.5 font-semibold text-[12px]",
              connected ? "bg-[#EAF6F2] text-[#147065]" : "bg-[#FBF3E2] text-[#9A6B1B]",
            )}
          >
            {connected ? <Wifi className="size-3.5" /> : <Loader2 className="size-3.5 animate-spin" />}
            {connected ? "Connecté à l'atelier" : "Connexion…"}
          </span>
        </div>

        <h1 className="mt-5 font-semibold text-[22px] leading-tight tracking-tight">Photos de l'appareil</h1>
        <p className="mt-1 text-[#6B6B6B] text-sm">Prenez les photos : elles s'ajoutent automatiquement sur l'ordinateur.</p>

        <div className="mt-5 space-y-3">
          {SLOTS.map((slot) => {
            const thumb = sent[slot.key];
            const isBusy = busy === slot.key;
            return (
              <label
                className={cn(
                  "flex items-center gap-3 rounded-[16px] border bg-white p-3 transition active:scale-[0.99]",
                  thumb ? "border-[#CDEBE4]" : "border-[#E8E8E5]",
                )}
                key={slot.key}
              >
                <input accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(slot.key, e)} type="file" />
                <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-[12px] border border-[#E8E8E5] bg-[#FAFAFA]">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={slot.label} className="size-full object-cover" src={thumb} />
                  ) : isBusy ? (
                    <Loader2 className="size-5 animate-spin text-[#2A9D8F]" />
                  ) : (
                    <Camera className="size-5 text-[#6B6B6B]" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-[#1A1916] text-sm">{slot.label}</span>
                  <span className="block text-[#6B6B6B] text-xs">{thumb ? "Envoyée — touchez pour reprendre" : isBusy ? "Envoi…" : "Toucher pour photographier"}</span>
                </span>
                {thumb && (
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#EAF6F2] text-[#147065]">
                    <Check className="size-4" />
                  </span>
                )}
              </label>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[#9A9A95] text-xs">
          Gardez cette page ouverte pendant la prise de photos. Behar Tech Pro.
        </p>
      </div>
    </div>
  );
}

function CenterMessage({ icon: Icon, title, text }: Readonly<{ icon: typeof AlertTriangle; title: string; text: string }>) {
  return (
    <div className="grid min-h-svh place-items-center bg-[#FAFAF8] px-6 text-center">
      <div className="max-w-xs">
        <div className="mx-auto grid size-12 place-items-center rounded-[14px] bg-white text-[#6B6B6B] shadow-[0_1px_3px_rgba(26,25,22,0.06)]">
          <Icon className="size-6" />
        </div>
        <p className="mt-4 font-semibold text-[#1A1916] text-lg">{title}</p>
        <p className="mt-1 text-[#6B6B6B] text-sm">{text}</p>
      </div>
    </div>
  );
}
