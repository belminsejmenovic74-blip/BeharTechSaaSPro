"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Eye,
  EyeOff,
  GripVertical,
  Images,
  LayoutTemplate,
  Loader2,
  Monitor,
  PanelLeft,
  Save,
  Send,
  Smartphone,
  Tablet,
} from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/behar/page-shell";
import { Panel, PrimaryButton, SecondaryButton } from "@/components/behar/primitives";
import { WidgetIconLibraryEditor } from "@/components/behar/widget-icon-library-editor";
import { buildTheme } from "@/components/widget/widget-theme";
import { useBeharStore } from "@/lib/behar-store";
import { buildWidgetCatalog } from "@/lib/widget/catalog-projection";
import {
  DEFAULT_WIDGET_CMS_CONFIG,
  editableWidgetConfigSchema,
  normalizeEditableWidgetConfig,
  WIDGET_FEATURE_LABELS,
  WIDGET_TEXT_LABELS,
  type EditableWidgetConfig,
  type WidgetBlockKey,
  type WidgetFieldKey,
} from "@/lib/widget/cms-config";
import type { WidgetFeatureKey, WidgetTextKey } from "@/lib/widget/public-types";
import { cn } from "@/lib/utils";

type EditorTab = "content" | "style" | "structure" | "media" | "display";
type PreviewDevice = "desktop" | "tablet" | "mobile";
type Version = { version: number; status: string; created_at: string; published_at: string | null };
type WidgetEditorResponse = {
  widget: {
    id: string;
    publicWidgetId: string;
    publishedVersion: number;
    publishedAt: string | null;
    config: EditableWidgetConfig;
  };
  versions: Version[];
};

const inputClass =
  "h-10 w-full rounded-xl border border-[#E8E8E5] bg-white px-3 text-sm outline-none transition focus:border-[#2A9D8F] focus:ring-2 focus:ring-[#2A9D8F]/10";
const labelClass = "mb-1.5 block text-xs font-semibold text-[#52524F]";

const BLOCK_LABELS: Record<WidgetBlockKey, string> = {
  header: "En-tête et logo",
  progress: "Progression",
  content: "Contenu de l’étape",
  actions: "Boutons de navigation",
};

const FIELD_LABELS: Record<WidgetFieldKey, string> = {
  identity: "Prénom et nom",
  contact: "Téléphone et e-mail",
  preference: "Préférence de contact",
  comment: "Commentaire",
  photos: "Photos",
  request: "Type de demande",
  booking: "Créneau de rendez-vous",
  consent: "Consentement",
};

async function settingsRequest<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/behar/widget-settings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Opération impossible.");
  return data as T;
}

function reorder<T>(items: T[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function WidgetSettingsPage() {
  const store = useBeharStore();
  const [config, setConfig] = useState<EditableWidgetConfig>(DEFAULT_WIDGET_CMS_CONFIG);
  const [widget, setWidget] = useState<WidgetEditorResponse["widget"] | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [tab, setTab] = useState<EditorTab>("content");
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"draft" | "publish" | null>(null);
  const [dirty, setDirty] = useState(false);
  const [draggedBlock, setDraggedBlock] = useState<WidgetBlockKey | null>(null);
  const [draggedField, setDraggedField] = useState<WidgetFieldKey | null>(null);

  const credentials = useMemo(
    () => ({ workshopId: store.cloudSync?.workshopId, licenseKey: store.licenseKey }),
    [store.cloudSync?.workshopId, store.licenseKey],
  );

  useEffect(() => {
    if (!(credentials.workshopId && credentials.licenseKey)) {
      setLoading(false);
      return;
    }
    settingsRequest<WidgetEditorResponse>({
      operation: "get",
      ...credentials,
      defaults: {
        commercialName: store.workshopSettings.commercialName || store.workshopSettings.name || "Mon atelier",
        phone: store.workshopSettings.phone || "",
        address: [store.workshopSettings.address, store.workshopSettings.postalCity].filter(Boolean).join(", "),
        locale: store.workshopSettings.country === "CH" ? "fr-CH" : "fr-FR",
        currency: store.workshopSettings.country === "CH" ? "CHF" : "EUR",
      },
    })
      .then((result) => {
        setWidget(result.widget);
        setVersions(result.versions);
        setConfig(normalizeEditableWidgetConfig(result.widget.config));
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Chargement impossible."))
      .finally(() => setLoading(false));
  }, [credentials, store.workshopSettings]);

  const change = (updater: (current: EditableWidgetConfig) => EditableWidgetConfig) => {
    setConfig(updater);
    setDirty(true);
  };

  const updateGeneral = <K extends keyof EditableWidgetConfig["general"]>(
    key: K,
    value: EditableWidgetConfig["general"][K],
  ) => change((current) => ({ ...current, general: { ...current.general, [key]: value } }));
  const updateVisual = <K extends keyof EditableWidgetConfig["visual"]>(
    key: K,
    value: EditableWidgetConfig["visual"][K],
  ) => change((current) => ({ ...current, visual: { ...current.visual, [key]: value } }));
  const updateText = (key: WidgetTextKey, value: string) =>
    change((current) => ({ ...current, texts: { ...current.texts, [key]: value } }));

  const persist = async (operation: "save_draft" | "publish") => {
    if (!(widget && credentials.workshopId && credentials.licenseKey)) return;
    const parsed = editableWidgetConfigSchema.safeParse(config);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Configuration invalide.");
      return;
    }
    setBusy(operation === "publish" ? "publish" : "draft");
    try {
      // Catalogue public projeté depuis le VRAI PriceBook de l'atelier (jamais
      // codé en dur) : actifs uniquement, dédoublonné, prix explicite selon le
      // réglage. Le serveur le re-filtre par liste blanche avant publication.
      const catalog = buildWidgetCatalog(store.priceBookItems, {
        market: parsed.data.general.currency === "CHF" ? "CH" : "FR",
        stockMode: parsed.data.features.stockAvailability ? "simple" : "hidden",
        priceRules: parsed.data.features.priceEstimate ? [{ mode: "exact" }] : [],
      });
      await settingsRequest({ operation, ...credentials, widgetId: widget.id, config: parsed.data, catalog });
      setDirty(false);
      if (operation === "publish") {
        const refreshed = await settingsRequest<WidgetEditorResponse>({
          operation: "get",
          ...credentials,
          defaults: {
            commercialName: config.general.commercialName,
            phone: config.general.phone,
            address: config.general.address,
            locale: config.general.locale,
            currency: config.general.currency,
          },
        });
        setWidget(refreshed.widget);
        setVersions(refreshed.versions);
        toast.success("Widget publié. Le code d’intégration ne change pas.");
      } else {
        toast.success("Brouillon enregistré.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setBusy(null);
    }
  };

  const reload = async () => {
    const refreshed = await settingsRequest<WidgetEditorResponse>({
      operation: "get",
      ...credentials,
      defaults: {
        commercialName: config.general.commercialName,
        phone: config.general.phone,
        address: config.general.address,
        locale: config.general.locale,
        currency: config.general.currency,
      },
    });
    setWidget(refreshed.widget);
    setVersions(refreshed.versions);
    setConfig(normalizeEditableWidgetConfig(refreshed.widget.config));
    setDirty(false);
  };

  // Annuler les modifications : le brouillon repart de la version publiée.
  const discardDraft = async () => {
    if (!(widget && credentials.workshopId && credentials.licenseKey)) return;
    setBusy("draft");
    try {
      await settingsRequest({ operation: "discard_draft", ...credentials, widgetId: widget.id });
      await reload();
      toast.success("Modifications annulées.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Annulation impossible.");
    } finally {
      setBusy(null);
    }
  };

  // Restaurer une ancienne version → republiée comme nouvelle version.
  const restoreVersion = async (version: number) => {
    if (!(widget && credentials.workshopId && credentials.licenseKey)) return;
    setBusy("publish");
    try {
      await settingsRequest({ operation: "restore_version", ...credentials, widgetId: widget.id, version });
      await reload();
      toast.success(`Version ${version} restaurée et publiée.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Restauration impossible.");
    } finally {
      setBusy(null);
    }
  };

  if (!store.hasPermission("canViewSettings")) {
    return (
      <PageShell title="Widget client" subtitle="Accès réservé au gérant/admin.">
        <Panel className="p-6">Vous n’avez pas accès aux paramètres du widget.</Panel>
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell title="Widget client" subtitle="Chargement de l’éditeur visuel…">
        <div className="grid min-h-[420px] place-items-center">
          <Loader2 className="size-6 animate-spin text-[#2A9D8F]" />
        </div>
      </PageShell>
    );
  }

  if (!credentials.workshopId || !credentials.licenseKey || !widget) {
    return (
      <PageShell title="Widget client" subtitle="Éditeur visuel contrôlé.">
        <Panel className="max-w-2xl p-6">
          <h2 className="font-semibold">Synchronisation cloud requise</h2>
          <p className="mt-2 text-sm text-[#6B6B6B]">
            Activez la licence et la synchronisation de l’atelier avant de configurer le widget.
          </p>
        </Panel>
      </PageShell>
    );
  }

  return (
    <PageShell title="Widget client" subtitle="Personnalisez le parcours sans compromettre son responsive.">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/parametres"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#6B6B6B] hover:text-[#1A1916]"
        >
          <ArrowLeft className="size-4" /> Retour aux paramètres
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs text-[#6B6B6B]">
            {dirty
              ? "Modifications non enregistrées"
              : widget.publishedVersion
                ? `Version publiée ${widget.publishedVersion}`
                : "Brouillon non publié"}
          </span>
          {dirty ? (
            <SecondaryButton
              disabled={!store.hasPermission("canEditSettings") || busy !== null}
              onClick={() => void discardDraft()}
              className="gap-2"
            >
              Annuler
            </SecondaryButton>
          ) : null}
          <SecondaryButton
            disabled={!store.hasPermission("canEditSettings") || busy !== null}
            onClick={() => void persist("save_draft")}
            className="gap-2"
          >
            {busy === "draft" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Brouillon
          </SecondaryButton>
          <PrimaryButton
            disabled={!store.hasPermission("canEditSettings") || busy !== null}
            onClick={() => void persist("publish")}
            className="gap-2"
          >
            {busy === "publish" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Publier
          </PrimaryButton>
        </div>
      </div>

      <div className="grid min-h-[760px] gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
        <Panel className="min-h-0 overflow-hidden p-0">
          <div className="grid grid-cols-5 border-b border-[#E8E8E5] bg-[#FAFAF8] p-1.5">
            {(
              [
                ["content", "Contenu", PanelLeft],
                ["style", "Style", LayoutTemplate],
                ["structure", "Blocs", GripVertical],
                ["media", "Médias", Images],
                ["display", "Affichage", Monitor],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-semibold transition",
                  tab === key ? "bg-white text-[#1A1916] shadow-sm" : "text-[#73736F] hover:text-[#1A1916]",
                )}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
          <div className="h-[700px] overflow-y-auto p-4">
            {tab === "content" ? (
              <ContentPanel config={config} updateGeneral={updateGeneral} updateText={updateText} change={change} />
            ) : null}
            {tab === "style" ? <StylePanel config={config} updateVisual={updateVisual} /> : null}
            {tab === "structure" ? (
              <StructurePanel
                config={config}
                change={change}
                draggedBlock={draggedBlock}
                setDraggedBlock={setDraggedBlock}
                draggedField={draggedField}
                setDraggedField={setDraggedField}
              />
            ) : null}
            {tab === "media" ? (
              <WidgetIconLibraryEditor
                config={config}
                onChange={change}
                widgetId={widget.id}
                workshopId={credentials.workshopId}
                licenseKey={credentials.licenseKey}
              />
            ) : null}
            {tab === "display" ? (
              <DisplayPanel
                config={config}
                change={change}
                versions={versions}
                onRestore={(version) => void restoreVersion(version)}
                busy={busy !== null}
                canEdit={store.hasPermission("canEditSettings")}
              />
            ) : null}
          </div>
        </Panel>

        <Panel className="min-w-0 overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E8E5] bg-white px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Aperçu en direct</p>
              <p className="text-xs text-[#73736F]">Chaque réglage est appliqué immédiatement.</p>
            </div>
            <div className="flex rounded-xl border border-[#E8E8E5] bg-[#F7F7F4] p-1">
              {(
                [
                  ["desktop", Monitor, "Ordinateur"],
                  ["tablet", Tablet, "Tablette"],
                  ["mobile", Smartphone, "Mobile"],
                ] as const
              ).map(([key, Icon, label]) => (
                <button
                  key={key}
                  type="button"
                  title={label}
                  onClick={() => setDevice(key)}
                  className={cn(
                    "grid size-9 place-items-center rounded-lg transition",
                    device === key ? "bg-white text-[#2A9D8F] shadow-sm" : "text-[#73736F]",
                  )}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </div>
          <WidgetPreview config={config} device={device} />
        </Panel>
      </div>
    </PageShell>
  );
}

function ContentPanel({
  config,
  updateGeneral,
  updateText,
  change,
}: {
  config: EditableWidgetConfig;
  updateGeneral: <K extends keyof EditableWidgetConfig["general"]>(
    key: K,
    value: EditableWidgetConfig["general"][K],
  ) => void;
  updateText: (key: WidgetTextKey, value: string) => void;
  change: (updater: (current: EditableWidgetConfig) => EditableWidgetConfig) => void;
}) {
  return (
    <div className="space-y-6">
      <EditorSection title="Identité">
        <EditorField label="Nom interne">
          <input
            className={inputClass}
            value={config.internalName}
            onChange={(e) => change((current) => ({ ...current, internalName: e.target.value }))}
          />
        </EditorField>
        <EditorField label="Nom de la boutique">
          <input
            className={inputClass}
            data-testid="widget-shop-name"
            value={config.general.commercialName}
            onChange={(e) => updateGeneral("commercialName", e.target.value)}
          />
        </EditorField>
        <EditorField label="Logo (URL HTTPS)">
          <input
            className={inputClass}
            value={config.visual.logoUrl}
            onChange={(e) =>
              change((current) => ({ ...current, visual: { ...current.visual, logoUrl: e.target.value } }))
            }
            placeholder="https://…/logo.png"
          />
        </EditorField>
      </EditorSection>
      <EditorSection title="Titres, sous-titres et boutons">
        {(Object.keys(WIDGET_TEXT_LABELS) as WidgetTextKey[]).map((key) => (
          <EditorField key={key} label={WIDGET_TEXT_LABELS[key]}>
            <input className={inputClass} value={config.texts[key]} onChange={(e) => updateText(key, e.target.value)} />
          </EditorField>
        ))}
      </EditorSection>
      <EditorSection title="Champs et fonctionnalités">
        {(Object.keys(WIDGET_FEATURE_LABELS) as WidgetFeatureKey[]).map((key) => (
          <Toggle
            key={key}
            label={WIDGET_FEATURE_LABELS[key]}
            checked={config.features[key]}
            onChange={(checked) =>
              change((current) => ({ ...current, features: { ...current.features, [key]: checked } }))
            }
          />
        ))}
      </EditorSection>
    </div>
  );
}

function StylePanel({
  config,
  updateVisual,
}: {
  config: EditableWidgetConfig;
  updateVisual: <K extends keyof EditableWidgetConfig["visual"]>(
    key: K,
    value: EditableWidgetConfig["visual"][K],
  ) => void;
}) {
  return (
    <div className="space-y-6">
      <EditorSection title="Couleurs">
        {(["primaryColor", "buttonColor", "buttonTextColor", "textColor", "backgroundColor"] as const).map((key) => (
          <ColorField
            key={key}
            label={
              {
                primaryColor: "Couleur principale",
                buttonColor: "Boutons",
                buttonTextColor: "Texte des boutons",
                textColor: "Texte",
                backgroundColor: "Fond",
              }[key]
            }
            value={config.visual[key]}
            onChange={(value) => updateVisual(key, value)}
          />
        ))}
      </EditorSection>
      <EditorSection title="Formes et fond">
        <EditorField label={`Arrondis — ${config.visual.radius}px`}>
          <input
            type="range"
            min="0"
            max="28"
            step="2"
            className="w-full accent-[#2A9D8F]"
            value={config.visual.radius}
            onChange={(e) => updateVisual("radius", Number(e.target.value))}
          />
        </EditorField>
        <Segment
          label="Style du fond"
          value={config.visual.backgroundStyle}
          options={[
            ["plain", "Uni"],
            ["tinted", "Teinté"],
            ["gradient", "Dégradé"],
          ]}
          onChange={(value) =>
            updateVisual("backgroundStyle", value as EditableWidgetConfig["visual"]["backgroundStyle"])
          }
        />
        <Segment
          label="Style des boutons"
          value={config.visual.buttonStyle}
          options={[
            ["solid", "Plein"],
            ["soft", "Doux"],
            ["outline", "Contour"],
          ]}
          onChange={(value) => updateVisual("buttonStyle", value as EditableWidgetConfig["visual"]["buttonStyle"])}
        />
        <Segment
          label="Taille des titres"
          value={config.visual.headingSize}
          options={[
            ["small", "Petit"],
            ["medium", "Moyen"],
            ["large", "Grand"],
          ]}
          onChange={(value) => updateVisual("headingSize", value as EditableWidgetConfig["visual"]["headingSize"])}
        />
        <Segment
          label="Taille du texte"
          value={config.visual.textSize}
          options={[
            ["small", "Petit"],
            ["medium", "Moyen"],
            ["large", "Grand"],
          ]}
          onChange={(value) => updateVisual("textSize", value as EditableWidgetConfig["visual"]["textSize"])}
        />
      </EditorSection>
    </div>
  );
}

function StructurePanel({
  config,
  change,
  draggedBlock,
  setDraggedBlock,
  draggedField,
  setDraggedField,
}: {
  config: EditableWidgetConfig;
  change: (updater: (current: EditableWidgetConfig) => EditableWidgetConfig) => void;
  draggedBlock: WidgetBlockKey | null;
  setDraggedBlock: (value: WidgetBlockKey | null) => void;
  draggedField: WidgetFieldKey | null;
  setDraggedField: (value: WidgetFieldKey | null) => void;
}) {
  const moveBlock = (from: number, to: number) =>
    change((current) => ({
      ...current,
      layout: { ...current.layout, blockOrder: reorder(current.layout.blockOrder, from, to) },
    }));
  const moveField = (from: number, to: number) =>
    change((current) => ({
      ...current,
      layout: { ...current.layout, fieldOrder: reorder(current.layout.fieldOrder, from, to) },
    }));
  return (
    <div className="space-y-6">
      <EditorSection title="Ordre des blocs" description="Glissez verticalement ou utilisez les flèches.">
        {config.layout.blockOrder.map((block, index) => (
          <OrderRow
            key={block}
            label={BLOCK_LABELS[block]}
            hidden={config.layout.hiddenBlocks.includes(block)}
            required={block === "content" || block === "actions"}
            onUp={() => moveBlock(index, index - 1)}
            onDown={() => moveBlock(index, index + 1)}
            onToggle={() =>
              change((current) => ({
                ...current,
                layout: {
                  ...current.layout,
                  hiddenBlocks: current.layout.hiddenBlocks.includes(block)
                    ? current.layout.hiddenBlocks.filter((entry) => entry !== block)
                    : [...current.layout.hiddenBlocks, block],
                },
              }))
            }
            draggable
            onDragStart={() => setDraggedBlock(block)}
            onDragEnd={() => setDraggedBlock(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (draggedBlock) moveBlock(config.layout.blockOrder.indexOf(draggedBlock), index);
              setDraggedBlock(null);
            }}
          />
        ))}
      </EditorSection>
      <EditorSection title="Ordre des champs" description="Les coordonnées et le consentement restent obligatoires.">
        {config.layout.fieldOrder.map((field, index) => (
          <OrderRow
            key={field}
            label={FIELD_LABELS[field]}
            hidden={config.layout.hiddenFields.includes(field)}
            required={field === "contact" || field === "consent"}
            onUp={() => moveField(index, index - 1)}
            onDown={() => moveField(index, index + 1)}
            onToggle={() =>
              change((current) => ({
                ...current,
                layout: {
                  ...current.layout,
                  hiddenFields: current.layout.hiddenFields.includes(field)
                    ? current.layout.hiddenFields.filter((entry) => entry !== field)
                    : [...current.layout.hiddenFields, field],
                },
              }))
            }
            draggable
            onDragStart={() => setDraggedField(field)}
            onDragEnd={() => setDraggedField(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (draggedField) moveField(config.layout.fieldOrder.indexOf(draggedField), index);
              setDraggedField(null);
            }}
          />
        ))}
      </EditorSection>
      <EditorSection title="Disposition">
        <Segment
          label="Colonnes"
          value={String(config.layout.columns)}
          options={[
            ["1", "Une colonne"],
            ["2", "Deux colonnes"],
          ]}
          onChange={(value) =>
            change((current) => ({ ...current, layout: { ...current.layout, columns: Number(value) as 1 | 2 } }))
          }
        />
        <div>
          <span className={labelClass}>Alignement</span>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["left", AlignLeft, "Gauche"],
                ["center", AlignCenter, "Centré"],
                ["right", AlignRight, "Droite"],
              ] as const
            ).map(([value, Icon, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => change((current) => ({ ...current, layout: { ...current.layout, alignment: value } }))}
                className={cn(
                  "flex h-10 items-center justify-center gap-1 rounded-xl border text-xs font-semibold",
                  config.layout.alignment === value
                    ? "border-[#2A9D8F] bg-[#EAF7F5] text-[#17766B]"
                    : "border-[#E8E8E5]",
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </EditorSection>
    </div>
  );
}

function DisplayPanel({
  config,
  change,
  versions,
  onRestore,
  busy,
  canEdit,
}: {
  config: EditableWidgetConfig;
  change: (updater: (current: EditableWidgetConfig) => EditableWidgetConfig) => void;
  versions: Version[];
  onRestore: (version: number) => void;
  busy: boolean;
  canEdit: boolean;
}) {
  return (
    <div className="space-y-6">
      <EditorSection title="Mode d’intégration">
        <div className="grid gap-2">
          {(
            [
              ["inline", "Bloc intégré", "Dans le contenu de la page"],
              ["modal", "Fenêtre modale", "Ouverture au-dessus du site"],
              ["floating", "Bouton flottant", "Bouton fixe en bas de page"],
            ] as const
          ).map(([value, label, description]) => (
            <button
              key={value}
              type="button"
              onClick={() => change((current) => ({ ...current, displayMode: value }))}
              className={cn(
                "rounded-xl border p-3 text-left transition",
                config.displayMode === value ? "border-[#2A9D8F] bg-[#EAF7F5]" : "border-[#E8E8E5]",
              )}
            >
              <span className="block text-sm font-semibold">{label}</span>
              <span className="text-xs text-[#73736F]">{description}</span>
            </button>
          ))}
        </div>
        <Toggle
          label="Widget actif après publication"
          checked={config.active}
          onChange={(active) => change((current) => ({ ...current, active }))}
        />
      </EditorSection>
      <EditorSection title="Modèle de disposition">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["classic", "Classique"],
              ["compact", "Compact"],
              ["showcase", "Aéré"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => change((current) => ({ ...current, layout: { ...current.layout, template: value } }))}
              className={cn(
                "rounded-xl border px-2 py-3 text-xs font-semibold",
                config.layout.template === value ? "border-[#2A9D8F] bg-[#EAF7F5]" : "border-[#E8E8E5]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Segment
          label="Largeur"
          value={config.visual.contentWidth}
          options={[
            ["compact", "Compacte"],
            ["standard", "Standard"],
            ["wide", "Large"],
          ]}
          onChange={(value) =>
            change((current) => ({
              ...current,
              visual: { ...current.visual, contentWidth: value as EditableWidgetConfig["visual"]["contentWidth"] },
            }))
          }
        />
      </EditorSection>
      <EditorSection title="Dernières publications">
        {versions.length ? (
          versions.slice(0, 5).map((version) => (
            <div
              key={version.version}
              className="flex items-center justify-between rounded-xl bg-[#F7F7F4] px-3 py-2 text-xs"
            >
              <span>Version {version.version}</span>
              <div className="flex items-center gap-2">
                <span className="text-[#73736F]">{version.status === "published" ? "Publiée" : "Archivée"}</span>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => onRestore(version.version)}
                    disabled={busy}
                    className="rounded-lg border border-[#E8E8E5] bg-white px-2 py-1 font-medium text-[#2A9D8F] disabled:opacity-40"
                  >
                    Restaurer
                  </button>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-[#73736F]">Aucune version publiée.</p>
        )}
      </EditorSection>
    </div>
  );
}

function WidgetPreview({ config, device }: { config: EditableWidgetConfig; device: PreviewDevice }) {
  const theme = buildTheme(config.visual);
  const viewport = device === "desktop" ? 1120 : device === "tablet" ? 760 : 390;
  const width = config.visual.contentWidth === "compact" ? 480 : config.visual.contentWidth === "wide" ? 720 : 560;
  const align = config.layout.alignment;
  const content = (
    <div
      style={{ ...theme.style, width: Math.min(width, viewport - 32), borderRadius: config.visual.radius }}
      className={cn(
        "mx-auto border border-black/5 bg-[var(--w-surface)] p-5 shadow-[0_18px_60px_rgba(20,30,25,.12)]",
        config.layout.template === "compact"
          ? "space-y-3"
          : config.layout.template === "showcase"
            ? "space-y-7"
            : "space-y-5",
        align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left",
      )}
    >
      {config.layout.blockOrder.map((block) =>
        config.layout.hiddenBlocks.includes(block) ? null : <PreviewBlock key={block} block={block} config={config} />,
      )}
    </div>
  );
  return (
    <div data-testid="widget-preview" className="h-[700px] overflow-auto bg-[#EFEFEB] p-5">
      <div
        style={{ width: viewport, minHeight: 650, ...theme.style, background: "var(--w-page-bg, var(--w-bg))" }}
        className="relative mx-auto overflow-hidden rounded-2xl border border-black/10 p-4 transition-all duration-300"
      >
        {config.displayMode === "inline" ? content : null}
        {config.displayMode === "modal" ? (
          <div className="absolute inset-0 grid place-items-center bg-black/30 p-4">{content}</div>
        ) : null}
        {config.displayMode === "floating" ? (
          <>
            <div className="absolute inset-0 bg-white/70" />{" "}
            <div className="absolute right-5 bottom-5">
              <button
                type="button"
                className="rounded-full bg-[var(--w-button-bg)] px-5 py-3 text-sm font-semibold text-[var(--w-button-fg)] shadow-xl"
              >
                {config.texts.bookingLabel}
              </button>
            </div>
            <div className="absolute inset-x-4 top-5">{content}</div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function PreviewBlock({ block, config }: { block: WidgetBlockKey; config: EditableWidgetConfig }) {
  if (block === "header")
    return (
      <div className="flex items-center gap-3">
        {config.visual.logoUrl ? (
          // biome-ignore lint/performance/noImgElement: aperçu d'une URL de logo externe choisie par le réparateur.
          <img src={config.visual.logoUrl} alt="" className="h-9 max-w-36 object-contain" />
        ) : (
          <div className="grid size-9 place-items-center rounded-xl bg-[var(--w-tint)] font-bold text-[var(--w-primary)]">
            {config.general.commercialName.slice(0, 1) || "B"}
          </div>
        )}
        <div>
          <p className="text-sm font-bold text-[var(--w-text)]">{config.general.commercialName}</p>
          <p className="text-[11px] text-[var(--w-muted)]">Réparation & rendez-vous</p>
        </div>
      </div>
    );
  if (block === "progress")
    return (
      <div>
        <div className="mb-2 flex justify-between text-[10px] font-semibold text-[var(--w-muted)]">
          <span>Étape 4 sur 5</span>
          <span>Contact</span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {[0, 1, 2, 3, 4].map((index) => (
            <span
              key={index}
              className={cn("h-1.5 rounded-full", index < 4 ? "bg-[var(--w-primary)]" : "bg-[var(--w-border)]")}
            />
          ))}
        </div>
      </div>
    );
  if (block === "actions")
    return (
      <div className="flex items-center justify-between border-t border-[var(--w-border)] pt-4">
        <button type="button" className="px-3 py-2 text-xs text-[var(--w-muted)]">
          Précédent
        </button>
        <button
          type="button"
          className="rounded-[var(--w-radius)] border border-[var(--w-button-border)] bg-[var(--w-button-bg)] px-4 py-2.5 text-xs font-bold text-[var(--w-button-fg)]"
        >
          {config.texts.bookingLabel}
        </button>
      </div>
    );
  return (
    <div>
      <h2 className="text-[calc(1.2rem*var(--w-heading-scale))] font-bold text-[var(--w-text)]">
        {config.texts.contactTitle}
      </h2>
      <p className="mt-1 text-[calc(.78rem*var(--w-text-scale))] text-[var(--w-muted)]">{config.texts.introduction}</p>
      <div className="mt-4 grid gap-3">
        {config.layout.fieldOrder.map((field) =>
          config.layout.hiddenFields.includes(field) ? null : (
            <PreviewField key={field} field={field} config={config} />
          ),
        )}
      </div>
    </div>
  );
}

function PreviewField({ field, config }: { field: WidgetFieldKey; config: EditableWidgetConfig }) {
  if (field === "identity" || field === "contact")
    return (
      <div className={cn("grid gap-2", config.layout.columns === 2 ? "grid-cols-2" : "grid-cols-1")}>
        {(field === "identity"
          ? [config.texts.firstNameLabel, config.texts.lastNameLabel]
          : [config.texts.phoneLabel, config.texts.emailLabel]
        ).map((label) => (
          <div key={label} className="text-[10px] font-semibold text-[var(--w-text)]">
            {label}
            <span className="mt-1 block h-9 rounded-[var(--w-radius)] border border-[var(--w-border)] bg-white" />
          </div>
        ))}
      </div>
    );
  if (field === "preference")
    return (
      <div>
        <p className="text-[10px] font-semibold">{config.texts.contactPreferenceLabel}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {["Téléphone", "SMS", "E-mail"].map((item) => (
            <span key={item} className="rounded-full border border-[var(--w-border)] px-2 py-1 text-[9px]">
              {item}
            </span>
          ))}
        </div>
      </div>
    );
  if (field === "comment" && config.features.comment)
    return (
      <div className="text-[10px] font-semibold">
        {config.texts.commentLabel}
        <span className="mt-1 block h-14 rounded-[var(--w-radius)] border border-[var(--w-border)] bg-white" />
      </div>
    );
  if (field === "photos" && config.features.photos)
    return (
      <div className="rounded-[var(--w-radius)] border border-dashed border-[var(--w-border)] p-3 text-center text-[10px] text-[var(--w-muted)]">
        {config.texts.photoLabel}
      </div>
    );
  if (field === "request")
    return (
      <div className="grid gap-1.5">
        {[config.texts.bookingLabel, config.texts.callbackLabel].map((item, index) => (
          <div
            key={item}
            className={cn(
              "rounded-[var(--w-radius)] border p-2 text-[10px]",
              index === 0 ? "border-[var(--w-primary)] bg-[var(--w-tint)]" : "border-[var(--w-border)]",
            )}
          >
            {item}
          </div>
        ))}
      </div>
    );
  if (field === "booking" && config.features.booking)
    return (
      <div className="grid grid-cols-3 gap-1.5">
        {["09:00", "09:30", "10:00"].map((time) => (
          <span key={time} className="rounded-lg border border-[var(--w-border)] p-2 text-center text-[9px]">
            {time}
          </span>
        ))}
      </div>
    );
  if (field === "consent")
    return (
      <div className="flex gap-2 rounded-[var(--w-radius)] border border-[var(--w-border)] p-2 text-[9px]">
        <span className="size-3 rounded border border-[var(--w-primary)]" /> {config.texts.consentLabel}
      </div>
    );
  return null;
}

function EditorSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        {description ? <p className="text-xs text-[#73736F]">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
function EditorField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </div>
  );
}
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-9 cursor-pointer rounded-lg border-0 bg-transparent"
        />
        <input
          className="h-9 w-24 rounded-lg border border-[#E8E8E5] px-2 font-mono text-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
    </label>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#ECECE8] px-3 py-2.5">
      <span className="text-xs font-medium">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[#2A9D8F]"
      />
    </label>
  );
}
function Segment({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly (readonly [string, string])[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#F2F2EF] p-1">
        {options.map(([key, text]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={cn(
              "rounded-lg px-2 py-2 text-[11px] font-semibold",
              value === key ? "bg-white text-[#1A1916] shadow-sm" : "text-[#73736F]",
            )}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
function OrderRow(props: {
  label: string;
  hidden: boolean;
  required: boolean;
  onUp: () => void;
  onDown: () => void;
  onToggle: () => void;
  draggable: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: () => void;
}) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: conteneur draggable natif complété par des boutons clavier haut/bas.
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: conteneur draggable natif complété par des boutons clavier haut/bas.
    <div
      draggable={props.draggable}
      onDragStart={props.onDragStart}
      onDragEnd={props.onDragEnd}
      onDragOver={props.onDragOver}
      onDrop={props.onDrop}
      className="flex items-center gap-1 rounded-xl border border-[#E8E8E5] bg-white p-2"
    >
      <GripVertical className="size-4 cursor-grab text-[#A3A3A0]" />
      <span
        className={cn("min-w-0 flex-1 truncate text-xs font-semibold", props.hidden && "text-[#A3A3A0] line-through")}
      >
        {props.label}
      </span>
      <button
        type="button"
        aria-label={`Monter ${props.label}`}
        onClick={props.onUp}
        className="grid size-7 place-items-center rounded-lg hover:bg-[#F3F3F0]"
      >
        <ArrowUp className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label={`Descendre ${props.label}`}
        onClick={props.onDown}
        className="grid size-7 place-items-center rounded-lg hover:bg-[#F3F3F0]"
      >
        <ArrowDown className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label={`${props.hidden ? "Afficher" : "Masquer"} ${props.label}`}
        disabled={props.required}
        onClick={props.onToggle}
        className="grid size-7 place-items-center rounded-lg hover:bg-[#F3F3F0] disabled:opacity-30"
      >
        {props.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
    </div>
  );
}
