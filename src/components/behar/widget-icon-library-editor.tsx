"use client";

import { useEffect, useRef, useState } from "react";
import { CircleOff, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { WidgetIcon, WIDGET_LIBRARY_ICONS, type WidgetLibraryIcon } from "@/components/widget/widget-icon";
import { WIDGET_ICON_LABELS, WIDGET_ICON_TARGETS, type EditableWidgetConfig } from "@/lib/widget/cms-config";
import { optimizeWidgetImage, validateWidgetImageSelection } from "@/lib/widget/image-optimizer";
import type { WidgetIconTarget } from "@/lib/widget/public-types";
import { cn } from "@/lib/utils";

type Asset = {
  id: string;
  target_key: WidgetIconTarget;
  public_url: string;
  original_name: string;
  mime_type: string;
  byte_size: number;
  width: number;
  height: number;
};

const DEFAULT_LIBRARY: Record<WidgetIconTarget, WidgetLibraryIcon> = {
  phone: "smartphone",
  tablet: "tablet",
  computer: "laptop",
  console: "gamepad",
  battery: "battery",
  screen: "screen",
  charging: "charging",
  appointment: "calendar",
  confirmation: "confirmation",
};

async function jsonRequest<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/behar/widget-assets", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Opération impossible.");
  return data as T;
}

export function WidgetIconLibraryEditor({
  config,
  onChange,
  widgetId,
  workshopId,
  licenseKey,
}: {
  config: EditableWidgetConfig;
  onChange: (updater: (current: EditableWidgetConfig) => EditableWidgetConfig) => void;
  widgetId: string;
  workshopId: string;
  licenseKey: string;
}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeTarget, setActiveTarget] = useState<WidgetIconTarget>("phone");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void jsonRequest<{ assets: Asset[] }>({ operation: "list", workshopId, licenseKey, widgetId })
      .then((result) => setAssets(result.assets))
      .catch(() => {
        // La personnalisation par icônes proposées reste disponible hors ligne.
      });
  }, [widgetId, workshopId, licenseKey]);

  const setChoice = (target: WidgetIconTarget, patch: Partial<EditableWidgetConfig["icons"][WidgetIconTarget]>) =>
    onChange((current) => ({
      ...current,
      icons: { ...current.icons, [target]: { ...current.icons[target], ...patch } },
    }));

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const selected = validateWidgetImageSelection(file);
    if (!selected.ok) {
      toast.error(
        selected.code === "too_large"
          ? "Image trop lourde : maximum 2 Mo."
          : "Format refusé : PNG, JPEG ou WebP uniquement.",
      );
      return;
    }
    setBusy(true);
    try {
      const optimized = await optimizeWidgetImage(file);
      const form = new FormData();
      form.set("workshopId", workshopId);
      form.set("licenseKey", licenseKey);
      form.set("widgetId", widgetId);
      form.set("target", activeTarget);
      form.set("width", String(optimized.width));
      form.set("height", String(optimized.height));
      form.set("file", optimized.file);
      const response = await fetch("/api/behar/widget-assets", { method: "POST", body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Import impossible.");
      const asset = result.asset as Asset;
      setAssets((current) => [asset, ...current]);
      setChoice(activeTarget, { mode: "custom", assetUrl: asset.public_url, alt: WIDGET_ICON_LABELS[activeTarget] });
      toast.success("Image optimisée et importée.");
    } catch (error) {
      toast.error(
        error instanceof Error && error.message === "optimization_failed"
          ? "Cette image ne peut pas être optimisée."
          : error instanceof Error
            ? error.message
            : "Import impossible.",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (asset: Asset) => {
    setBusy(true);
    try {
      await jsonRequest({ operation: "delete", workshopId, licenseKey, widgetId, assetId: asset.id });
      setAssets((current) => current.filter((entry) => entry.id !== asset.id));
      for (const target of WIDGET_ICON_TARGETS) {
        if (config.icons[target].assetUrl === asset.public_url) setChoice(target, { mode: "none", assetUrl: "" });
      }
      toast.success("Image supprimée.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  };

  const choice = config.icons[activeTarget];
  const targetAssets = assets.filter((asset) => asset.target_key === activeTarget);
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-bold">Icônes et petites images</h3>
        <p className="text-xs text-[#73736F]">Aucune icône décorative n’est affichée tant que vous ne l’activez pas.</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {WIDGET_ICON_TARGETS.map((target) => (
          <button
            key={target}
            type="button"
            onClick={() => setActiveTarget(target)}
            className={cn(
              "flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-[10px] font-semibold",
              activeTarget === target ? "border-[#2A9D8F] bg-[#EAF7F5]" : "border-[#E4E7EC]",
            )}
          >
            <WidgetIcon choice={config.icons[target]} className="text-[#2A9D8F]" />
            {WIDGET_ICON_LABELS[target]}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-[#E4E7EC] p-3">
        <p className="mb-3 text-sm font-bold">{WIDGET_ICON_LABELS[activeTarget]}</p>
        <div className="grid grid-cols-3 gap-2">
          <ModeButton
            active={choice.mode === "none"}
            label="Aucune"
            icon={<CircleOff className="size-4" />}
            onClick={() => setChoice(activeTarget, { mode: "none", libraryIcon: "", assetUrl: "" })}
          />
          <ModeButton
            active={choice.mode === "library"}
            label="Proposée"
            icon={<WidgetIcon choice={{ mode: "library", libraryIcon: DEFAULT_LIBRARY[activeTarget], size: 18 }} />}
            onClick={() =>
              setChoice(activeTarget, {
                mode: "library",
                libraryIcon: choice.libraryIcon || DEFAULT_LIBRARY[activeTarget],
                assetUrl: "",
              })
            }
          />
          <ModeButton
            active={choice.mode === "custom"}
            label="Importée"
            icon={<ImagePlus className="size-4" />}
            onClick={() => inputRef.current?.click()}
          />
        </div>

        {choice.mode === "library" ? (
          <div className="mt-3 grid grid-cols-6 gap-2">
            {(Object.keys(WIDGET_LIBRARY_ICONS) as WidgetLibraryIcon[]).map((name) => (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => setChoice(activeTarget, { libraryIcon: name })}
                className={cn(
                  "grid aspect-square place-items-center rounded-xl border",
                  choice.libraryIcon === name ? "border-[#2A9D8F] bg-[#EAF7F5] text-[#17766B]" : "border-[#E4E7EC]",
                )}
              >
                <WidgetIcon choice={{ mode: "library", libraryIcon: name, size: 20 }} />
              </button>
            ))}
          </div>
        ) : null}

        <label className="mt-4 block text-xs font-semibold">
          Taille — {choice.size}px
          <input
            type="range"
            min="12"
            max="64"
            step="2"
            value={choice.size}
            onChange={(event) => setChoice(activeTarget, { size: Number(event.target.value) })}
            className="mt-2 w-full accent-[#2A9D8F]"
          />
        </label>
        <input
          ref={inputRef}
          data-testid="widget-icon-upload"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(event) => void upload(event.target.files?.[0])}
        />
      </div>

      {targetAssets.length ? (
        <div>
          <p className="mb-2 text-xs font-bold">Images importées</p>
          <div className="grid grid-cols-3 gap-2">
            {targetAssets.map((asset) => (
              <div key={asset.id} className="relative rounded-xl border border-[#E4E7EC] p-2">
                <button
                  type="button"
                  onClick={() =>
                    setChoice(activeTarget, {
                      mode: "custom",
                      assetUrl: asset.public_url,
                      alt: WIDGET_ICON_LABELS[activeTarget],
                    })
                  }
                  className="grid h-16 w-full place-items-center"
                >
                  <WidgetIcon choice={{ mode: "custom", assetUrl: asset.public_url, size: 46, alt: "" }} />
                </button>
                <button
                  type="button"
                  aria-label={`Supprimer ${asset.original_name}`}
                  disabled={busy}
                  onClick={() => void remove(asset)}
                  className="absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-white text-[#B4232A] shadow"
                >
                  <Trash2 className="size-3.5" />
                </button>
                <p className="truncate text-[9px] text-[#73736F]">
                  {Math.ceil(asset.byte_size / 1024)} Ko · {asset.width}×{asset.height}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {busy ? (
        <div className="flex items-center gap-2 text-xs text-[#73736F]">
          <Loader2 className="size-3.5 animate-spin" /> Optimisation du média…
        </div>
      ) : null}
      <label className="flex items-center justify-between gap-3 rounded-xl border border-[#E4E7EC] p-3 text-xs font-semibold">
        Mention « Propulsé par Behar Tech Pro »
        <input
          type="checkbox"
          checked={config.icons.poweredBy}
          onChange={(event) =>
            onChange((current) => ({ ...current, icons: { ...current.icons, poweredBy: event.target.checked } }))
          }
          className="size-4 accent-[#2A9D8F]"
        />
      </label>
    </div>
  );
}

function ModeButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-16 flex-col items-center justify-center gap-1 rounded-xl border text-[10px] font-semibold",
        active ? "border-[#2A9D8F] bg-[#EAF7F5]" : "border-[#E4E7EC]",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
