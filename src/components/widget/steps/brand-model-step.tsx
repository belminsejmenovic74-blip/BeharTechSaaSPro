"use client";

// Étape 2 — Marque & modèle.
// Disposition en trois zones fidèle à la maquette : liste des marques (gauche),
// liste des modèles (centre), carte d'aperçu du modèle sélectionné (droite).
// Le catalogue mondial reste toujours navigable ; un modèle non configuré par
// l'atelier ne bloque jamais le parcours (« Continuer quand même »).

import { useState } from "react";
import { Gamepad2, Headphones, Laptop, Monitor, Plus, ShieldCheck, Smartphone, Tablet, Watch } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useAsyncList } from "@/components/widget/use-catalog";
import type { StepContext } from "@/components/widget/widget-state";
import { CatalogList, WidgetButton, WidgetInput } from "@/components/widget/widget-primitives";
import { formatDuration, formatMoney } from "@/components/widget/widget-theme";
import { brandsForType, deviceImageFor, fold, modelsForBrand } from "@/lib/widget/global-catalog";
import type { PublicService } from "@/lib/widget/public-types";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  smartphone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  desktop: Monitor,
  console: Gamepad2,
  watch: Watch,
  audio: Headphones,
};

function categoryIcon(category: string): LucideIcon {
  const key = Object.keys(CATEGORY_ICONS).find((id) => fold(category).includes(id));
  return key ? CATEGORY_ICONS[key] : Smartphone;
}

function mergeUnique(global: string[], shop: string[]): string[] {
  const seen = new Set(global.map(fold));
  return [...global, ...shop.filter((item) => item && !seen.has(fold(item)))];
}

function cheapestFrom(services: PublicService[]): number | null {
  const amounts = services
    .map((service) => {
      const price = service.price;
      if (!price) return null;
      if (price.mode === "exact" || price.mode === "from")
        return typeof price.amount === "number" ? price.amount : null;
      if (price.mode === "range") return typeof price.min === "number" ? price.min : null;
      return null;
    })
    .filter((value): value is number => typeof value === "number");
  return amounts.length ? Math.min(...amounts) : null;
}

export function BrandModelStep({ ctx, onContinue }: { ctx: StepContext; onContinue: () => void }) {
  const { client, token, draft, patch, features, config, currency, locale } = ctx;
  const [customBrand, setCustomBrand] = useState(false);
  const [customModel, setCustomModel] = useState(false);

  const brands = useAsyncList(
    (signal) => client.getBrands(token, { category: draft.category, shop: draft.shopId || undefined }, signal),
    [token, draft.category, draft.shopId],
  );
  const brandItems = mergeUnique(brandsForType(draft.category), brands.items);

  const models = useAsyncList(
    (signal) =>
      draft.brand && !customBrand
        ? client.getModels(
            token,
            { category: draft.category, brand: draft.brand, shop: draft.shopId || undefined },
            signal,
          )
        : Promise.resolve([]),
    [token, draft.category, draft.brand, draft.shopId, customBrand],
  );
  const modelItems = mergeUnique(modelsForBrand(draft.category, draft.brand), models.items);

  const services = useAsyncList<PublicService>(
    (signal) =>
      draft.category && draft.model && !customModel
        ? client.getServices(
            token,
            { category: draft.category, brand: draft.brand, model: draft.model, shop: draft.shopId || undefined },
            signal,
          )
        : Promise.resolve([]),
    [token, draft.category, draft.brand, draft.model, draft.shopId, customModel],
  );

  const configured = !customModel && services.items.length > 0;
  const minPrice = cheapestFrom(services.items);
  const warranty = services.items.find((service) => service.warranty)?.warranty;
  const duration = formatDuration(services.items.find((service) => service.durationMinutes)?.durationMinutes);
  const image = deviceImageFor(draft.category, draft.brand);
  const FallbackIcon = categoryIcon(draft.category);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(240px,0.86fr)]">
      {/* Zone gauche — marques */}
      <section className="flex min-h-0 flex-col gap-2.5">
        <h3 className="text-sm font-semibold text-[var(--w-text)]">Choisissez une marque</h3>
        <CatalogList
          items={brandItems}
          value={customBrand ? "" : draft.brand}
          loading={brands.loading}
          searchable={features.deviceSearch}
          searchPlaceholder="Rechercher une marque"
          ariaLabel="Rechercher une marque"
          emptyHint="Aucune marque — utilisez « Autre marque »."
          onSelect={(brand) => {
            setCustomBrand(false);
            setCustomModel(false);
            patch({ brand, model: "", issues: [], services: {} });
          }}
          renderLeading={(item, selected) => (
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-md text-[11px] font-bold uppercase transition",
                selected
                  ? "bg-[var(--w-primary)] text-[var(--w-on-primary)]"
                  : "bg-[var(--w-tint)] text-[var(--w-muted)]",
              )}
            >
              {item.slice(0, 1)}
            </span>
          )}
          footer={
            config.catalogPolicy.allowOutOfCatalog ? (
              <OtherAffordance
                active={customBrand}
                label="Autre marque"
                placeholder="Saisissez la marque"
                value={customBrand ? draft.brand : ""}
                onEnter={() => {
                  setCustomBrand(true);
                  setCustomModel(true);
                  patch({ brand: "", model: "", issues: [], services: {} });
                }}
                onChange={(brand) => patch({ brand, model: "", issues: [], services: {} })}
              />
            ) : null
          }
        />
      </section>

      {/* Zone centrale — modèles */}
      <section className="flex min-h-0 flex-col gap-2.5">
        <h3 className="text-sm font-semibold text-[var(--w-text)]">Choisissez votre modèle</h3>
        {!draft.brand && !customBrand ? (
          <div className="grid flex-1 place-items-center rounded-[var(--w-radius)] border border-dashed border-[var(--w-border)] p-6 text-center text-sm text-[var(--w-muted)]">
            Sélectionnez d’abord une marque.
          </div>
        ) : (
          <CatalogList
            items={modelItems}
            value={customModel ? "" : draft.model}
            loading={models.loading}
            searchable={features.deviceSearch}
            searchPlaceholder="Rechercher un modèle"
            ariaLabel="Rechercher un modèle"
            emptyHint="Aucun modèle listé — utilisez « Autre modèle »."
            onSelect={(model) => {
              setCustomModel(false);
              patch({ model, issues: [], services: {} });
            }}
            footer={
              config.catalogPolicy.allowUnconfiguredModels ? (
                <OtherAffordance
                  active={customModel}
                  label="Autre modèle"
                  placeholder="Saisissez le modèle"
                  value={customModel ? draft.model : ""}
                  onEnter={() => {
                    setCustomModel(true);
                    patch({ model: "", issues: [], services: {} });
                  }}
                  onChange={(model) => patch({ model, issues: [], services: {} })}
                />
              ) : null
            }
          />
        )}
      </section>

      {/* Zone droite — aperçu */}
      <aside className="lg:sticky lg:top-0 lg:self-start">
        <div className="flex flex-col items-center gap-3 rounded-[var(--w-radius)] border border-[var(--w-border)] bg-[var(--w-page-bg)] p-5 text-center">
          <div className="grid h-32 w-full place-items-center">
            {image ? (
              // biome-ignore lint/performance/noImgElement: miniature publique déjà optimisée du catalogue appareils.
              <img src={image} alt="" className="h-32 w-auto max-w-[120px] object-contain" />
            ) : (
              <FallbackIcon className="size-16 text-[var(--w-muted)]" strokeWidth={1.25} aria-hidden="true" />
            )}
          </div>
          {draft.model ? (
            <>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--w-muted)]">
                  {draft.brand || draft.category}
                </p>
                <p className="mt-0.5 text-lg font-semibold tracking-tight text-[var(--w-text)]">{draft.model}</p>
              </div>
              {configured ? (
                <div className="grid w-full gap-2">
                  <span className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-[var(--w-success-soft)] px-3 py-1 text-xs font-semibold text-[var(--w-success)]">
                    <ShieldCheck className="size-3.5" /> Configuré par l’atelier
                  </span>
                  <dl className="grid gap-1.5 rounded-[calc(var(--w-radius)-4px)] bg-[var(--w-surface)] p-3 text-left text-xs">
                    {minPrice != null ? (
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-[var(--w-muted)]">À partir de</dt>
                        <dd className="font-semibold text-[var(--w-primary)]">
                          {formatMoney(minPrice, currency, locale)}
                        </dd>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-[var(--w-muted)]">Prestations</dt>
                      <dd className="font-medium text-[var(--w-text)]">{services.items.length}</dd>
                    </div>
                    {duration ? (
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-[var(--w-muted)]">Durée</dt>
                        <dd className="font-medium text-[var(--w-text)]">{duration}</dd>
                      </div>
                    ) : null}
                    {warranty ? (
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-[var(--w-muted)]">Garantie</dt>
                        <dd className="font-medium text-[var(--w-text)]">{warranty}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              ) : (
                <div className="grid w-full gap-2">
                  <span className="mx-auto inline-flex items-center rounded-full bg-[var(--w-warning-soft)] px-3 py-1 text-xs font-semibold text-[var(--w-warning)]">
                    Modèle non configuré
                  </span>
                  <p className="text-xs leading-relaxed text-[var(--w-muted)]">
                    Ce modèle n’est pas encore configuré par cet atelier. Vous pouvez tout de même continuer et recevoir
                    une estimation personnalisée.
                  </p>
                  <WidgetButton variant="secondary" onClick={onContinue} className="h-10 w-full text-sm">
                    Continuer quand même
                  </WidgetButton>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-[var(--w-muted)]">
              Sélectionnez un modèle pour voir les tarifs et prestations disponibles.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

// Affordance « Autre marque / Autre modèle » : bouton, puis champ libre.
function OtherAffordance({
  active,
  label,
  placeholder,
  value,
  onEnter,
  onChange,
}: {
  active: boolean;
  label: string;
  placeholder: string;
  value: string;
  onEnter: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-1 border-t border-[var(--w-border)] pt-2">
      {active ? (
        <WidgetInput
          autoFocus
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <button
          type="button"
          onClick={onEnter}
          className="flex w-full items-center gap-2 rounded-[calc(var(--w-radius)-2px)] px-3 py-2.5 text-left text-sm font-medium text-[var(--w-primary)] transition hover:bg-[var(--w-primary-soft)]"
        >
          <Plus className="size-4" /> {label}
        </button>
      )}
    </div>
  );
}
