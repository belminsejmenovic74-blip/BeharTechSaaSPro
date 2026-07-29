"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Code2,
  Copy,
  Eye,
  EyeOff,
  Globe2,
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
  Tags,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/behar/page-shell";
import { Panel, PrimaryButton, SecondaryButton } from "@/components/behar/primitives";
import { WidgetIconLibraryEditor } from "@/components/behar/widget-icon-library-editor";
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
import { applyCustomerReceptionPolicy, type CustomerReceptionMode } from "@/lib/widget/reception-policy";
import type { PublicService, WidgetConfig, WidgetFeatureKey, WidgetTextKey } from "@/lib/widget/public-types";
import { cn } from "@/lib/utils";

type EditorTab = "content" | "style" | "offers" | "structure" | "media" | "display";
type PreviewDevice = "desktop" | "tablet" | "mobile";
type Version = { version: number; status: string; created_at: string; published_at: string | null };
type WidgetEditorResponse = {
  widget: {
    id: string;
    publicWidgetId: string;
    publishedVersion: number;
    publishedAt: string | null;
    allowedDomains: string[];
    config: EditableWidgetConfig;
  };
  versions: Version[];
};

const inputClass =
  "h-11 w-full rounded-xl border border-[#DEDFDA] bg-white px-3.5 text-sm text-[#101828] shadow-[0_1px_2px_rgba(16,24,40,.03)] outline-none transition placeholder:text-[#A2A29D] hover:border-[#C8CAC4] focus:border-[#2A9D8F] focus:ring-3 focus:ring-[#2A9D8F]/10";
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
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [tab, setTab] = useState<EditorTab>("content");
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"draft" | "publish" | null>(null);
  const [dirty, setDirty] = useState(false);
  const [draggedBlock, setDraggedBlock] = useState<WidgetBlockKey | null>(null);
  const [draggedField, setDraggedField] = useState<WidgetFieldKey | null>(null);

  const credentials = useMemo(
    () => ({ workshopId: store.cloudSync?.workshopId, licenseKey: store.licenseKey }),
    [store.cloudSync?.workshopId, store.licenseKey],
  );
  const workshopMarket = store.workshopSettings.country === "CH" ? "CH" : "FR";
  const customerReceptionMode: CustomerReceptionMode = store.workshopSettings.customerReceptionMode || "shop";
  const normalizeForWorkshop = useCallback(
    (value: unknown) => {
      const normalized = normalizeEditableWidgetConfig(value);
      return {
        ...normalized,
        general: {
          ...normalized.general,
          locale: workshopMarket === "CH" ? ("fr-CH" as const) : ("fr-FR" as const),
          currency: workshopMarket === "CH" ? ("CHF" as const) : ("EUR" as const),
        },
        features: applyCustomerReceptionPolicy(normalized.features, customerReceptionMode),
      };
    },
    [customerReceptionMode, workshopMarket],
  );

  useEffect(() => {
    if (!(credentials.workshopId && credentials.licenseKey)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    settingsRequest<WidgetEditorResponse>({
      operation: "get",
      ...credentials,
      defaults: {
        commercialName: store.workshopSettings.commercialName || store.workshopSettings.name || "Mon atelier",
        phone: store.workshopSettings.phone || "",
        address: store.workshopSettings.address || "",
        postalCode: store.workshopSettings.postalCode || "",
        city: store.workshopSettings.city || store.workshopSettings.postalCity || "",
        country: workshopMarket,
        locale: store.workshopSettings.country === "CH" ? "fr-CH" : "fr-FR",
        currency: store.workshopSettings.country === "CH" ? "CHF" : "EUR",
        businessHours: store.workshopSettings.businessHours || "",
        customerReceptionMode: store.workshopSettings.customerReceptionMode || "shop",
      },
    })
      .then((result) => {
        setWidget(result.widget);
        setVersions(result.versions);
        setAllowedDomains(result.widget.allowedDomains || []);
        setConfig(normalizeForWorkshop(result.widget.config));
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Chargement impossible.";
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, [credentials, normalizeForWorkshop, store.workshopSettings, workshopMarket]);

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

  const previewServices = useMemo<PublicService[]>(
    () =>
      buildWidgetCatalog(store.priceBookItems, {
        market: config.general.currency === "CHF" ? "CH" : "FR",
        stockMode: config.features.stockAvailability ? "simple" : "hidden",
        priceRules: config.features.priceEstimate ? [{ mode: "exact" }] : [],
      }).map(({ stockItemIds: _stockItemIds, ...service }) => service),
    [config.features.priceEstimate, config.features.stockAvailability, config.general.currency, store.priceBookItems],
  );

  const persist = async (operation: "save_draft" | "publish") => {
    if (!(widget && credentials.workshopId && credentials.licenseKey)) return;
    const marketConfig = normalizeForWorkshop(config);
    const parsed = editableWidgetConfigSchema.safeParse(marketConfig);
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
      await settingsRequest({
        operation,
        ...credentials,
        widgetId: widget.id,
        config: parsed.data,
        catalog,
        allowedDomains,
      });
      setDirty(false);
      if (operation === "publish") {
        const refreshed = await settingsRequest<WidgetEditorResponse>({
          operation: "get",
          ...credentials,
          defaults: {
            commercialName: config.general.commercialName,
            phone: config.general.phone,
            address: config.general.address,
            postalCode: store.workshopSettings.postalCode || "",
            city: store.workshopSettings.city || store.workshopSettings.postalCity || "",
            country: workshopMarket,
            locale: config.general.locale,
            currency: config.general.currency,
            businessHours: store.workshopSettings.businessHours || "",
            customerReceptionMode: store.workshopSettings.customerReceptionMode || "shop",
          },
        });
        setWidget(refreshed.widget);
        setVersions(refreshed.versions);
        setAllowedDomains(refreshed.widget.allowedDomains || []);
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
        postalCode: store.workshopSettings.postalCode || "",
        city: store.workshopSettings.city || store.workshopSettings.postalCity || "",
        country: workshopMarket,
        locale: config.general.locale,
        currency: config.general.currency,
        businessHours: store.workshopSettings.businessHours || "",
        customerReceptionMode: store.workshopSettings.customerReceptionMode || "shop",
      },
    });
    setWidget(refreshed.widget);
    setVersions(refreshed.versions);
    setAllowedDomains(refreshed.widget.allowedDomains || []);
    setConfig(normalizeForWorkshop(refreshed.widget.config));
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

  if (loadError) {
    return (
      <PageShell title="Widget client" subtitle="Éditeur visuel contrôlé.">
        <Panel className="max-w-2xl p-6">
          <h2 className="font-semibold">Widget momentanément indisponible</h2>
          <p className="mt-2 text-sm text-[#667085]">{loadError}</p>
          <SecondaryButton className="mt-4" onClick={() => window.location.reload()}>
            Réessayer
          </SecondaryButton>
        </Panel>
      </PageShell>
    );
  }

  if (!credentials.workshopId || !credentials.licenseKey || !widget) {
    return (
      <PageShell title="Widget client" subtitle="Éditeur visuel contrôlé.">
        <Panel className="max-w-2xl p-6">
          <h2 className="font-semibold">Synchronisation cloud requise</h2>
          <p className="mt-2 text-sm text-[#667085]">
            Activez la licence et la synchronisation de l’atelier avant de configurer le widget.
          </p>
          <Link
            href="/dashboard/parametres"
            className="mt-4 inline-flex text-sm font-semibold text-[#147065] hover:underline"
          >
            Ouvrir les réglages de synchronisation
          </Link>
        </Panel>
      </PageShell>
    );
  }

  return (
    <PageShell title="Widget client" subtitle="Créez, prévisualisez et publiez votre parcours client.">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E3E4DF] bg-white px-4 py-3.5 shadow-[0_8px_28px_rgba(16,24,40,.05)] sm:px-5">
        <Link
          href="/dashboard/parametres"
          className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-[#54544F] transition hover:text-[#147065]"
        >
          <ArrowLeft className="size-4" /> Retour aux paramètres
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "mr-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
              dirty ? "bg-[#FFF6DE] text-[#806000]" : "bg-[#EEF8F5] text-[#27665E]",
            )}
          >
            <span className={cn("size-1.5 rounded-full", dirty ? "bg-[#D69E00]" : "bg-[#2A9D8F]")} />
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

      <div className="grid min-h-[800px] gap-5 xl:grid-cols-[400px_minmax(0,1fr)]">
        <Panel className="min-h-0 overflow-hidden border-[#E3E4DF] bg-[#F8F9F6] p-0 shadow-[0_10px_35px_rgba(16,24,40,.05)]">
          <div className="overflow-x-auto border-b border-[#E3E4DF] bg-white p-2">
            <div className="grid min-w-[372px] grid-cols-6 gap-1">
              {(
                [
                  ["content", "Contenu", PanelLeft],
                  ["style", "Style", LayoutTemplate],
                  ["offers", "Offres", Tags],
                  ["structure", "Blocs", GripVertical],
                  ["media", "Médias", Images],
                  ["display", "Installer", Code2],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-[10px] font-bold transition",
                    tab === key
                      ? "bg-[#EAF7F5] text-[#147065] shadow-[inset_0_0_0_1px_#CFE9E4]"
                      : "text-[#777772] hover:bg-[#F5F6F3] hover:text-[#101828]",
                  )}
                >
                  <Icon className="size-4" /> {label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[735px] overflow-y-auto p-3.5 [scrollbar-gutter:stable]">
            {tab === "content" ? (
              <ContentPanel
                config={config}
                customerReceptionMode={customerReceptionMode}
                updateGeneral={updateGeneral}
                updateText={updateText}
                change={change}
              />
            ) : null}
            {tab === "style" ? <StylePanel config={config} updateVisual={updateVisual} change={change} /> : null}
            {tab === "offers" ? <OffersPanel config={config} change={change} /> : null}
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
                allowedDomains={allowedDomains}
                onAllowedDomainsChange={(domains) => {
                  setAllowedDomains(domains);
                  setDirty(true);
                }}
                publicWidgetId={widget.publicWidgetId}
                publishedVersion={widget.publishedVersion}
              />
            ) : null}
          </div>
        </Panel>

        <Panel className="min-w-0 overflow-hidden border-[#E3E4DF] bg-white p-0 shadow-[0_10px_35px_rgba(16,24,40,.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E4DF] bg-white px-5 py-3.5">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-[#101828]">
                Aperçu en direct
                <span className="rounded-full bg-[#EAF7F5] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#147065]">
                  Live
                </span>
              </p>
              <p className="mt-0.5 text-xs text-[#777772]">Le rendu public réel, mis à jour instantanément.</p>
            </div>
            <div className="flex rounded-xl border border-[#E1E2DD] bg-[#F5F6F3] p-1">
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
                    device === key
                      ? "bg-white text-[#147065] shadow-[0_2px_8px_rgba(16,24,40,.09)]"
                      : "text-[#777772] hover:text-[#101828]",
                  )}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </div>
          <WidgetPreview config={config} device={device} services={previewServices} />
        </Panel>
      </div>
    </PageShell>
  );
}

function ContentPanel({
  config,
  customerReceptionMode,
  updateGeneral,
  updateText,
  change,
}: {
  config: EditableWidgetConfig;
  customerReceptionMode: CustomerReceptionMode;
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
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#D9ECE8] bg-[#F2FAF8] px-3.5 py-3">
          <div>
            <p className="text-xs font-bold text-[#245D56]">Marché de la boutique</p>
            <p className="mt-0.5 text-[11px] text-[#5D746F]">Synchronisé avec les paramètres généraux.</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#147065] shadow-sm ring-1 ring-[#D4EAE6]">
            {config.general.currency === "CHF" ? "Suisse · CHF" : "France · EUR"}
          </span>
        </div>
      </EditorSection>
      <EditorSection title="Titres, sous-titres et boutons">
        {(Object.keys(WIDGET_TEXT_LABELS) as WidgetTextKey[]).map((key) => (
          <EditorField key={key} label={WIDGET_TEXT_LABELS[key]}>
            <input className={inputClass} value={config.texts[key]} onChange={(e) => updateText(key, e.target.value)} />
          </EditorField>
        ))}
      </EditorSection>
      <EditorSection title="Champs et fonctionnalités">
        <p className="mb-3 rounded-xl border border-[#D9ECE8] bg-[#F4FBF9] p-3 text-xs leading-5 text-[#42645F]">
          {customerReceptionMode === "mobile"
            ? `Mode Déplacement uniquement : le widget est verrouillé sur l’intervention à domicile. Le client renseigne obligatoirement une adresse ${config.general.currency === "CHF" ? "suisse" : "française"} et aucun autre mode de prise en charge n’est proposé.`
            : "Activez « Déplacement chez le client » pour afficher le mode à domicile. L’adresse, le code postal et la ville seront alors demandés au client et transmis avec sa demande."}
        </p>
        {(Object.keys(WIDGET_FEATURE_LABELS) as WidgetFeatureKey[]).map((key) => {
          const receptionFeature = ["booking", "walkIn", "homeService", "quoteRequest", "callbackRequest"].includes(
            key,
          );
          return (
            <Toggle
              key={key}
              label={WIDGET_FEATURE_LABELS[key]}
              checked={config.features[key]}
              disabled={customerReceptionMode === "mobile" && receptionFeature}
              onChange={(checked) =>
                change((current) => ({ ...current, features: { ...current.features, [key]: checked } }))
              }
            />
          );
        })}
      </EditorSection>
      <EditorSection title="Demandes hors catalogue">
        <p className="mb-2 text-xs text-[#667085]">
          Le catalogue global affiche toutes les marques, modèles et pannes. Ces options laissent le client envoyer sa
          demande même quand un élément n’est pas encore configuré — recommandé pour capter plus de demandes.
        </p>
        {(
          [
            ["allowOutOfCatalog", "Autoriser les demandes hors catalogue"],
            ["allowUnconfiguredModels", "Autoriser les modèles non configurés"],
            ["allowUnconfiguredIssues", "Autoriser les pannes non configurées"],
            ["allowOutOfCatalogAppointments", "Autoriser les rendez-vous hors catalogue"],
          ] as const
        ).map(([key, label]) => (
          <Toggle
            key={key}
            label={label}
            checked={config.catalogPolicy[key]}
            onChange={(checked) =>
              change((current) => ({ ...current, catalogPolicy: { ...current.catalogPolicy, [key]: checked } }))
            }
          />
        ))}
        <EditorField label="Repli si non configuré">
          <select
            className={inputClass}
            value={config.catalogPolicy.fallbackMode}
            onChange={(event) =>
              change((current) => ({
                ...current,
                catalogPolicy: {
                  ...current.catalogPolicy,
                  fallbackMode: event.target.value as EditableWidgetConfig["catalogPolicy"]["fallbackMode"],
                },
              }))
            }
          >
            <option value="quote">Sur devis</option>
            <option value="callback">Être rappelé</option>
            <option value="manual">Demande manuelle</option>
          </select>
        </EditorField>
      </EditorSection>
    </div>
  );
}

function OffersPanel({
  config,
  change,
}: {
  config: EditableWidgetConfig;
  change: (updater: (current: EditableWidgetConfig) => EditableWidgetConfig) => void;
}) {
  type Offer = EditableWidgetConfig["offers"]["offers"][number];
  const updateSection = <K extends keyof EditableWidgetConfig["offers"]>(
    key: K,
    value: EditableWidgetConfig["offers"][K],
  ) => change((current) => ({ ...current, offers: { ...current.offers, [key]: value } }));
  const updateOffer = (id: string, patch: Partial<Offer>) =>
    change((current) => ({
      ...current,
      offers: {
        ...current.offers,
        offers: current.offers.offers.map((offer) => (offer.id === id ? { ...offer, ...patch } : offer)),
      },
    }));
  const addOffer = () =>
    change((current) => ({
      ...current,
      offers: {
        ...current.offers,
        enabled: true,
        offers: [
          ...current.offers.offers,
          {
            id: `offer_${crypto.randomUUID().replaceAll("-", "")}`,
            title: "Nouvelle offre",
            subtitle: "",
            description: "",
            fullDescription: "",
            displayMode: "text",
            behavior: "selectable",
            imageUrl: "",
            imageAlt: "",
            imagePosition: "cover",
            hideImageOnMobile: false,
            iconName: "",
            iconUrl: "",
            badgeText: "",
            conditionText: "",
            validationRequired: false,
            isPublished: false,
            displayOrder: current.offers.offers.length,
            layoutSize: "standard",
            startDate: "",
            endDate: "",
            appointmentOnly: false,
            desktopVisible: true,
            mobileVisible: true,
            externalUrl: "",
          },
        ],
      },
    }));

  return (
    <div className="space-y-6">
      <EditorSection title="Section des avantages">
        <Toggle
          label="Afficher les offres additionnelles"
          checked={config.offers.enabled}
          onChange={(value) => updateSection("enabled", value)}
        />
        <EditorField label="Titre libre de la section">
          <input
            className={inputClass}
            value={config.offers.title || ""}
            onChange={(event) => updateSection("title", event.target.value)}
            placeholder="Ex : Nos offres du moment"
          />
        </EditorField>
        <EditorField label="Sous-titre">
          <input
            className={inputClass}
            value={config.offers.subtitle || ""}
            onChange={(event) => updateSection("subtitle", event.target.value)}
          />
        </EditorField>
        <EditorField label="Texte d’introduction">
          <textarea
            className={`${inputClass} h-20 py-2`}
            value={config.offers.introduction || ""}
            onChange={(event) => updateSection("introduction", event.target.value)}
          />
        </EditorField>
        <Segment
          label="Disposition"
          value={config.offers.layout}
          options={[
            ["list", "Liste"],
            ["grid", "Grille"],
          ]}
          onChange={(value) => updateSection("layout", value as "list" | "grid")}
        />
        {config.offers.layout === "grid" ? (
          <Segment
            label="Colonnes"
            value={String(config.offers.columns)}
            options={[
              ["1", "Une"],
              ["2", "Deux"],
              ["3", "Trois"],
            ]}
            onChange={(value) => updateSection("columns", Number(value) as 1 | 2 | 3)}
          />
        ) : null}
        <button
          type="button"
          onClick={addOffer}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#2A9D8F]/50 bg-[#F4FBF9] px-3 py-2.5 text-sm font-semibold text-[#167B70]"
        >
          <Plus className="size-4" /> Créer une offre personnalisée
        </button>
        {!config.offers.offers.length ? (
          <p className="text-xs text-[#73736F]">Aucune offre : la section publique sera entièrement masquée.</p>
        ) : null}
      </EditorSection>

      {config.offers.offers.map((offer, index) => (
        <EditorSection key={offer.id} title={offer.title || `Offre ${index + 1}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              <button
                type="button"
                aria-label={`Monter ${offer.title}`}
                disabled={index === 0}
                onClick={() =>
                  updateSection(
                    "offers",
                    reorder(config.offers.offers, index, index - 1).map((item, order) => ({
                      ...item,
                      displayOrder: order,
                    })),
                  )
                }
                className="rounded-lg border border-[#E4E7EC] p-2 disabled:opacity-30"
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Descendre ${offer.title}`}
                disabled={index === config.offers.offers.length - 1}
                onClick={() =>
                  updateSection(
                    "offers",
                    reorder(config.offers.offers, index, index + 1).map((item, order) => ({
                      ...item,
                      displayOrder: order,
                    })),
                  )
                }
                className="rounded-lg border border-[#E4E7EC] p-2 disabled:opacity-30"
              >
                <ArrowDown className="size-3.5" />
              </button>
            </div>
            <button
              type="button"
              aria-label={`Supprimer ${offer.title}`}
              onClick={() =>
                updateSection(
                  "offers",
                  config.offers.offers.filter((item) => item.id !== offer.id),
                )
              }
              className="rounded-lg border border-[#F2D4D1] p-2 text-[#B42318]"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <Toggle
            label="Publiée"
            checked={offer.isPublished}
            onChange={(value) => updateOffer(offer.id, { isPublished: value })}
          />
          <EditorField label="Titre">
            <input
              className={inputClass}
              value={offer.title}
              onChange={(event) => updateOffer(offer.id, { title: event.target.value })}
            />
          </EditorField>
          <EditorField label="Description">
            <textarea
              className={`${inputClass} h-20 py-2`}
              value={offer.description || ""}
              onChange={(event) => updateOffer(offer.id, { description: event.target.value })}
            />
          </EditorField>
          <Segment
            label="Rendu"
            value={offer.displayMode}
            options={[
              ["text", "Texte"],
              ["image", "Image"],
              ["icon", "Icône"],
              ["image_icon", "Image + icône"],
              ["badge", "Badge"],
              ["price", "Prix"],
              ["informative", "Information"],
            ]}
            onChange={(value) => updateOffer(offer.id, { displayMode: value as Offer["displayMode"] })}
          />
          <Segment
            label="Comportement"
            value={offer.behavior}
            options={[
              ["selectable", "Sélectionnable"],
              ["automatic", "Automatique"],
              ["informative", "Informative"],
              ["validation", "Validation boutique"],
              ["link", "Lien externe"],
              ["hidden", "Masquée"],
            ]}
            onChange={(value) => updateOffer(offer.id, { behavior: value as Offer["behavior"] })}
          />
          {["image", "image_icon"].includes(offer.displayMode) ? (
            <>
              <EditorField label="Image (médiathèque ou URL HTTPS)">
                <input
                  className={inputClass}
                  value={offer.imageUrl || ""}
                  onChange={(event) => updateOffer(offer.id, { imageUrl: event.target.value })}
                  placeholder="https://…"
                />
              </EditorField>
              <EditorField label="Texte alternatif">
                <input
                  className={inputClass}
                  value={offer.imageAlt || ""}
                  onChange={(event) => updateOffer(offer.id, { imageAlt: event.target.value })}
                />
              </EditorField>
              <Toggle
                label="Masquer l’image sur mobile"
                checked={offer.hideImageOnMobile === true}
                onChange={(value) => updateOffer(offer.id, { hideImageOnMobile: value })}
              />
            </>
          ) : null}
          {["icon", "image_icon"].includes(offer.displayMode) ? (
            <EditorField label="Icône personnalisée (URL facultative)">
              <input
                className={inputClass}
                value={offer.iconUrl || ""}
                onChange={(event) => updateOffer(offer.id, { iconUrl: event.target.value })}
                placeholder="Sans URL : icône de la bibliothèque"
              />
            </EditorField>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <EditorField label="Ancien prix">
              <input
                className={inputClass}
                type="number"
                min="0"
                value={offer.originalPrice ?? ""}
                onChange={(event) =>
                  updateOffer(offer.id, { originalPrice: event.target.value ? Number(event.target.value) : undefined })
                }
              />
            </EditorField>
            <EditorField label="Nouveau prix">
              <input
                className={inputClass}
                type="number"
                min="0"
                value={offer.promotionalPrice ?? ""}
                onChange={(event) =>
                  updateOffer(offer.id, {
                    promotionalPrice: event.target.value ? Number(event.target.value) : undefined,
                  })
                }
              />
            </EditorField>
          </div>
          <EditorField label="Condition">
            <input
              className={inputClass}
              value={offer.conditionText || ""}
              onChange={(event) => updateOffer(offer.id, { conditionText: event.target.value })}
            />
          </EditorField>
          {offer.behavior === "link" ? (
            <EditorField label="Lien externe">
              <input
                className={inputClass}
                value={offer.externalUrl || ""}
                onChange={(event) => updateOffer(offer.id, { externalUrl: event.target.value })}
              />
            </EditorField>
          ) : null}
          <Toggle
            label="Uniquement avec rendez-vous"
            checked={offer.appointmentOnly === true}
            onChange={(value) => updateOffer(offer.id, { appointmentOnly: value })}
          />
          <Toggle
            label="Visible sur mobile"
            checked={offer.mobileVisible !== false}
            onChange={(value) => updateOffer(offer.id, { mobileVisible: value })}
          />
          <Toggle
            label="Visible sur ordinateur"
            checked={offer.desktopVisible !== false}
            onChange={(value) => updateOffer(offer.id, { desktopVisible: value })}
          />
        </EditorSection>
      ))}
    </div>
  );
}

function StylePanel({
  config,
  updateVisual,
  change,
}: {
  config: EditableWidgetConfig;
  updateVisual: <K extends keyof EditableWidgetConfig["visual"]>(
    key: K,
    value: EditableWidgetConfig["visual"][K],
  ) => void;
  change: (updater: (current: EditableWidgetConfig) => EditableWidgetConfig) => void;
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
      <button
        type="button"
        data-testid="widget-reset-theme"
        onClick={() =>
          change((current) => ({
            ...current,
            visual: { ...DEFAULT_WIDGET_CMS_CONFIG.visual },
          }))
        }
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#DADAD6] bg-white px-3 py-2.5 text-sm font-semibold text-[#147065] transition hover:bg-[#F4FBF9]"
      >
        <RefreshCw className="size-4" /> Réinitialiser le thème
      </button>
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
                    : "border-[#E4E7EC]",
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
  allowedDomains,
  onAllowedDomainsChange,
  publicWidgetId,
  publishedVersion,
}: {
  config: EditableWidgetConfig;
  change: (updater: (current: EditableWidgetConfig) => EditableWidgetConfig) => void;
  versions: Version[];
  onRestore: (version: number) => void;
  busy: boolean;
  canEdit: boolean;
  allowedDomains: string[];
  onAllowedDomainsChange: (domains: string[]) => void;
  publicWidgetId: string;
  publishedVersion: number;
}) {
  const widgetScriptOrigin =
    process.env.NEXT_PUBLIC_WIDGET_SCRIPT_ORIGIN?.replace(/\/$/, "") || "https://behartechpro.fr";
  const integrationCode = `<div data-behar-widget-search></div>\n<script async src="${widgetScriptOrigin}/widget.js" data-widget-id="${publicWidgetId}"></script>`;
  const publicUrl = `${widgetScriptOrigin}/widget/${publicWidgetId}`;
  const iframeCode = `<iframe src="${publicUrl}" title="Prendre rendez-vous" loading="lazy" style="width:100%;min-height:720px;border:0;border-radius:16px" allow="clipboard-write"></iframe>`;
  const aiPrompt = `Intègre le widget public de prise de rendez-vous BEHAR TECH PRO sur mon site.

URL publique : ${publicUrl}
Identifiant public d’intégration : ${publicWidgetId}

Code recommandé :
${integrationCode}

Alternative iframe :
${iframeCode}

Règles : le widget doit occuper 100 % de la largeur disponible, conserver une hauteur minimale de 720 px, ne jamais créer de défilement horizontal et rester lisible sur ordinateur, tablette et mobile. Vérifie le chargement, la sélection du mode de prise en charge et l’envoi du formulaire sur ordinateur et mobile. N’ajoute et n’expose aucune clé secrète.`;
  return (
    <div className="space-y-6">
      <EditorSection
        title="Installer le widget sur votre site"
        description="Ce code est personnalisé pour cet atelier et reste identique après chaque nouvelle publication."
      >
        <div
          className="grid gap-1.5 rounded-xl border border-[#DDEBE8] bg-[#F4FBF9] p-3"
          data-testid="widget-public-integration-id"
        >
          <span className="text-[11px] font-bold uppercase tracking-wide text-[#37635E]">
            Identifiant public lié à votre licence
          </span>
          <code className="break-all text-xs font-semibold text-[#173F39]">{publicWidgetId}</code>
          <p className="text-[11px] leading-4 text-[#52736E]">
            Votre vraie clé de licence reste privée et ne doit jamais être copiée dans le code HTML du site.
          </p>
        </div>
        {!publishedVersion ? (
          <p className="rounded-xl border border-[#F0DCA4] bg-[#FFF9E9] p-3 text-xs leading-5 text-[#6F5411]">
            Vous pouvez déjà copier ce code. Publiez ensuite le widget pour le rendre actif sur votre site.
          </p>
        ) : null}
        <pre
          className="overflow-x-auto rounded-xl bg-[#17211E] p-3 text-[11px] leading-5 text-[#D9EFE9]"
          data-testid="widget-integration-code"
        >
          <code>{integrationCode}</code>
        </pre>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(integrationCode);
            toast.success("Code HTML copié.");
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#DADAD6] bg-white px-3 py-2.5 text-sm font-semibold text-[#147065]"
        >
          <Copy className="size-4" /> Copier le code HTML
        </button>
      </EditorSection>
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
                config.displayMode === value ? "border-[#2A9D8F] bg-[#EAF7F5]" : "border-[#E4E7EC]",
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
      <EditorSection
        title="Sites autorisés"
        description="Le domaine du SaaS est ajouté automatiquement pour l’aperçu. Ajoutez ici les sites du réparateur."
      >
        <div className="rounded-xl border border-[#DDEBE8] bg-[#F4FBF9] p-3 text-xs text-[#37635E]">
          <Globe2 className="mr-2 inline size-4" /> Un domaine par ligne, par exemple monatelier.fr ou *.monreseau.fr.
        </div>
        <textarea
          className={`${inputClass} h-28 py-2 font-mono text-xs`}
          value={allowedDomains.join("\n")}
          onChange={(event) =>
            onAllowedDomainsChange(
              event.target.value
                .split(/[,\n]+/)
                .map((value) => value.trim())
                .filter(Boolean),
            )
          }
          placeholder={"monatelier.fr\n*.monreseau.fr"}
        />
      </EditorSection>
      <EditorSection
        title="URL publique et intégration responsive"
        description="L’identifiant ci-dessous est public et distinct de la clé de licence."
      >
        <div className="grid gap-2 rounded-xl border border-[#DDEBE8] bg-[#F4FBF9] p-3">
          <span className="text-[11px] font-bold uppercase tracking-wide text-[#37635E]">URL publique du widget</span>
          <code className="break-all text-xs text-[#173F39]">{publicUrl}</code>
        </div>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(publicUrl);
            toast.success("URL publique copiée.");
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#DADAD6] bg-white px-3 py-2.5 text-sm font-semibold text-[#147065]"
        >
          <Copy className="size-4" /> Copier l’URL publique
        </button>
        <pre
          data-testid="widget-iframe-code"
          className="overflow-x-auto rounded-xl bg-[#17211E] p-3 text-[11px] leading-5 text-[#D9EFE9]"
        >
          <code>{iframeCode}</code>
        </pre>
      </EditorSection>
      <EditorSection title="Instructions WordPress et autres CMS">
        <div className="space-y-3 text-xs leading-5 text-[#52524F]">
          <div className="rounded-xl border border-[#E4E7EC] bg-white p-3">
            <p className="font-bold text-[#101828]">WordPress</p>
            <p>
              Ajoutez un bloc « HTML personnalisé », collez le script recommandé, puis publiez. Avec un constructeur qui
              filtre les scripts, utilisez l’iframe responsive.
            </p>
            <pre
              className="mt-3 overflow-x-auto rounded-lg bg-[#17211E] p-3 text-[10.5px] leading-5 text-[#D9EFE9]"
              data-testid="widget-wordpress-code"
            >
              <code>{integrationCode}</code>
            </pre>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(integrationCode);
                toast.success("Code WordPress copié.");
              }}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#DADAD6] bg-white px-3 py-2 text-xs font-semibold text-[#147065]"
            >
              <Copy className="size-3.5" /> Copier pour WordPress
            </button>
          </div>
          <div className="rounded-xl border border-[#E4E7EC] bg-white p-3">
            <p className="font-bold text-[#101828]">Shopify, Webflow, Wix et autres CMS</p>
            <p>
              Utilisez un bloc Embed/HTML. Le conteneur doit faire 100 % de largeur et au moins 720 px de hauteur.
              Testez également à 390 px de largeur.
            </p>
          </div>
          <div className="rounded-xl border border-[#F0DCA4] bg-[#FFF9E9] p-3 text-[#6F5411]">
            Pour la sécurité, ajoutez le domaine exact du site dans « Sites autorisés ». N’insérez jamais la clé de
            licence dans le code public.
          </div>
        </div>
      </EditorSection>
      <EditorSection title="Prompt pour une IA de création de site">
        <textarea className={`${inputClass} h-64 py-3 font-mono text-[11px] leading-5`} value={aiPrompt} readOnly />
        <button
          type="button"
          data-testid="widget-copy-ai-prompt"
          onClick={async () => {
            await navigator.clipboard.writeText(aiPrompt);
            toast.success("Prompt IA copié.");
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#DADAD6] bg-white px-3 py-2.5 text-sm font-semibold text-[#147065]"
        >
          <Copy className="size-4" /> Copier le prompt IA
        </button>
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
                config.layout.template === value ? "border-[#2A9D8F] bg-[#EAF7F5]" : "border-[#E4E7EC]",
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
              className="flex items-center justify-between rounded-xl bg-[#F5F7FA] px-3 py-2 text-xs"
            >
              <span>Version {version.version}</span>
              <div className="flex items-center gap-2">
                <span className="text-[#73736F]">{version.status === "published" ? "Publiée" : "Archivée"}</span>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => onRestore(version.version)}
                    disabled={busy}
                    className="rounded-lg border border-[#E4E7EC] bg-white px-2 py-1 font-medium text-[#2A9D8F] disabled:opacity-40"
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

function WidgetPreview({
  config,
  device,
  services,
}: {
  config: EditableWidgetConfig;
  device: PreviewDevice;
  services: PublicService[];
}) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const viewport = device === "desktop" ? 1120 : device === "tablet" ? 760 : 390;
  const frameHeight = 680;
  // L'adresse configurée de la boutique (Paramètres/Boutiques) doit apparaître
  // dans l'aperçu, pas seulement la phrase générique.
  const shopStreet = useBeharStore((s) => s.workshopSettings.address);
  const shopPostalCode = useBeharStore((s) => s.workshopSettings.postalCode);
  const shopCity = useBeharStore((s) => s.workshopSettings.city);
  const shopPostalCity = useBeharStore((s) => s.workshopSettings.postalCity);
  const previewConfig = useMemo<WidgetConfig>(
    () => ({
      id: "demo",
      active: true,
      displayMode: config.displayMode,
      general: config.general,
      visual: config.visual,
      texts: config.texts,
      features: config.features,
      catalogPolicy: config.catalogPolicy,
      layout: config.layout,
      icons: config.icons,
      booking: {
        timezone: "Europe/Paris",
        days: [1, 2, 3, 4, 5, 6],
        start: "09:00",
        end: "18:00",
        intervalMinutes: 30,
        durationMinutes: 45,
        capacity: 1,
      },
      offers: config.offers,
      publishedAt: new Date().toISOString(),
      shops: [
        {
          id: "shop-preview",
          name: config.general.commercialName || "Mon atelier",
          address: {
            address: shopStreet || config.general.address || "",
            postalCode: shopPostalCode || "",
            city: shopCity || shopPostalCity || "",
            country: config.general.currency === "CHF" ? "CH" : "FR",
          },
          timezone: config.general.currency === "CHF" ? "Europe/Zurich" : "Europe/Paris",
        },
      ],
      sessionToken: "cms-preview",
    }),
    [config, shopStreet, shopPostalCode, shopCity, shopPostalCity],
  );
  const sendConfig = useCallback(
    () =>
      frameRef.current?.contentWindow?.postMessage(
        { type: "behar.widget.cms-preview", config: previewConfig, services },
        window.location.origin,
      ),
    [previewConfig, services],
  );
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === "behar.widget.cms-preview-ready") sendConfig();
    };
    window.addEventListener("message", receive);
    sendConfig();
    return () => window.removeEventListener("message", receive);
  }, [sendConfig]);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    const updateScale = () => setPreviewScale(Math.min(1, Math.max(0.35, (stage.clientWidth - 40) / viewport)));
    const observer = new ResizeObserver(updateScale);
    observer.observe(stage);
    updateScale();
    return () => observer.disconnect();
  }, [viewport]);
  return (
    <div
      ref={stageRef}
      data-testid="widget-preview"
      className="h-[735px] overflow-auto bg-[radial-gradient(circle_at_1px_1px,#D7D9D2_1px,transparent_0)] bg-[length:18px_18px] p-5"
    >
      <div
        className="mx-auto transition-[width,height] duration-300"
        style={{ width: viewport * previewScale, height: frameHeight * previewScale }}
      >
        <iframe
          ref={frameRef}
          src="/widget-preview"
          title="Aperçu réel du widget"
          onLoad={sendConfig}
          style={{
            width: viewport,
            height: frameHeight,
            transform: `scale(${previewScale})`,
            transformOrigin: "top left",
          }}
          className="block rounded-[24px] border border-black/10 bg-white shadow-[0_24px_70px_rgba(16,24,40,.18)] transition-transform duration-300"
        />
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
      {config.offers.enabled &&
      config.offers.offers.some((offer) => offer.isPublished && offer.behavior !== "hidden") ? (
        <div className="mt-4 grid gap-2 border-t border-[var(--w-border)] pt-4">
          {config.offers.title ? <p className="text-xs font-bold text-[var(--w-text)]">{config.offers.title}</p> : null}
          {config.offers.offers
            .filter((offer) => offer.isPublished && offer.behavior !== "hidden")
            .slice(0, 4)
            .map((offer) => (
              <div
                key={offer.id}
                className="flex items-center justify-between gap-2 rounded-[var(--w-radius)] border border-[var(--w-border)] p-2 text-[10px]"
              >
                <span className="font-semibold text-[var(--w-text)]">{offer.title}</span>
                {typeof offer.promotionalPrice === "number" ? (
                  <span className="text-[var(--w-primary)]">
                    {offer.promotionalPrice} {config.general.currency}
                  </span>
                ) : null}
              </div>
            ))}
        </div>
      ) : null}
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
    <section className="space-y-3.5 rounded-2xl border border-[#E3E4DF] bg-white p-4 shadow-[0_3px_14px_rgba(16,24,40,.035)]">
      <div className="border-b border-[#EEEFEA] pb-3">
        <h3 className="text-sm font-extrabold tracking-[-0.01em] text-[#101828]">{title}</h3>
        {description ? <p className="mt-1 text-xs leading-relaxed text-[#777772]">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
function EditorField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block space-y-1.5">
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
          aria-label={`${label} — sélecteur`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-9 cursor-pointer rounded-lg border-0 bg-transparent"
        />
        <input
          aria-label={`${label} — code hexadécimal`}
          className="h-9 w-24 rounded-lg border border-[#E4E7EC] px-2 font-mono text-xs"
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
  disabled = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border border-[#ECECE8] px-3 py-2.5",
        disabled ? "cursor-not-allowed bg-[#F6F6F3] text-[#92928D]" : "cursor-pointer",
      )}
    >
      <span className="text-xs font-medium">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
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
              value === key ? "bg-white text-[#101828] shadow-sm" : "text-[#73736F]",
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
      className="flex items-center gap-1 rounded-xl border border-[#E4E7EC] bg-white p-2"
    >
      <GripVertical className="size-4 cursor-grab text-[#98A2B3]" />
      <span
        className={cn("min-w-0 flex-1 truncate text-xs font-semibold", props.hidden && "text-[#98A2B3] line-through")}
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
