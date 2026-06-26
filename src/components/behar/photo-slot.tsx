"use client";

import { useRef, useState } from "react";

import { Camera, Loader2, RotateCcw, X } from "lucide-react";

import { fileToCompressedDataUrl } from "@/lib/image-capture";
import { cn } from "@/lib/utils";

/**
 * Tuile photo réutilisable (atelier PC = fichier, comptoir tablette/mobile = appareil photo
 * via `capture`). `value` = data URL ou undefined. Réutilisable par le mode comptoir.
 */
export function PhotoSlot({
  label,
  value,
  onChange,
  className,
}: Readonly<{
  label: string;
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  className?: string;
}>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = () => inputRef.current?.click();

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // autorise re-sélection du même fichier
    if (!file) return;
    setBusy(true);
    try {
      onChange(await fileToCompressedDataUrl(file));
    } catch {
      /* lecture impossible */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("relative aspect-square", className)}>
      <input accept="image/*" capture="environment" className="hidden" onChange={onFile} ref={inputRef} type="file" />

      {value ? (
        <div className="group relative size-full overflow-hidden rounded-[14px] border border-[#E8E8E5]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={label} className="size-full object-cover" src={value} />
          <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1 rounded-[10px] border border-[#E8E8E5] bg-white px-2 py-1.5">
            <span className="truncate font-medium text-[#1A1916] text-[11px]">{label}</span>
            <button
              className="inline-flex items-center gap-1 rounded-[6px] bg-[#FFFFFF] px-1.5 py-0.5 font-semibold text-[#1A1916] text-[10px] transition hover:bg-[#FFFFFF]"
              onClick={pick}
              type="button"
            >
              <RotateCcw className="size-3" />
              Reprendre
            </button>
          </div>
          <button
            aria-label="Supprimer la photo"
            className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-white text-[#C0564D] shadow-sm transition hover:bg-white"
            onClick={() => onChange(undefined)}
            type="button"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          className="flex size-full flex-col items-center justify-center gap-2 rounded-[14px] border border-[#E8E8E5] border-dashed bg-[#FFFFFF] text-center transition hover:border-[#2A9D8F]/45 disabled:opacity-70"
          disabled={busy}
          onClick={pick}
          type="button"
        >
          {busy ? (
            <Loader2 className="size-5 animate-spin text-[#2A9D8F]" />
          ) : (
            <Camera className="size-5 text-[#6B6B6B]" />
          )}
          <span className="font-medium text-[#1A1916] text-xs">{label}</span>
          <span className="text-[#6B6B6B] text-[11px]">{busy ? "Traitement…" : "Ajouter une photo"}</span>
        </button>
      )}
    </div>
  );
}
