"use client";

// Étape 1 — Appareil.
// Catégorie, marque et modèle depuis le catalogue publié, filtrés pour la
// boutique concernée, avec recherche textuelle, suggestions, saisies « autre
// marque » / « autre modèle ». Pour un widget multi-boutiques, le choix de la
// boutique précède et conditionne le catalogue.

import { useState } from "react";

import { CatalogPicker } from "@/components/widget/catalog-picker";
import { iconTargetForDevice, WidgetIcon } from "@/components/widget/widget-icon";
import { useAsyncList } from "@/components/widget/use-catalog";
import { deviceLabel, type StepContext, type WidgetDraft } from "@/components/widget/widget-state";
import { OptionCard, StepShell, WidgetField, WidgetInput, WidgetNotice } from "@/components/widget/widget-primitives";
import { brandsForType, deviceTypeLabels, fold, modelsForBrand } from "@/lib/widget/global-catalog";

// Fusion catalogue GLOBAL (large, capte la demande) ∪ éléments boutique (config),
// dédupliqués : on affiche tout, la boutique ne fait qu'enrichir.
function mergeUnique(global: string[], shop: string[]): string[] {
  const out = [...global];
  const seen = new Set(global.map(fold));
  for (const item of shop) {
    if (item && !seen.has(fold(item))) {
      seen.add(fold(item));
      out.push(item);
    }
  }
  return out;
}

export function DeviceStep({ ctx }: { ctx: StepContext }) {
  const { client, token, draft, patch, features, texts, config } = ctx;
  const [categoryOtherLocal, setCategoryOtherLocal] = useState(false);
  const [brandOtherLocal, setBrandOtherLocal] = useState(false);
  const [modelOtherLocal, setModelOtherLocal] = useState(false);

  const chooseShop = features.shopChoice && config.shops.length > 1;
  const shop = draft.shopId || undefined;
  const shopReady = !chooseShop || Boolean(draft.shopId);

  const categories = useAsyncList(
    (signal) => (shopReady ? client.getCategories(token, { shop }, signal) : Promise.resolve([])),
    [token, shop, shopReady],
  );
  const brands = useAsyncList(
    (signal) =>
      shopReady && draft.category
        ? client.getBrands(token, { category: draft.category, shop }, signal)
        : Promise.resolve([]),
    [token, shop, draft.category, shopReady],
  );

  // Listes affichées = catalogue global ∪ configuration boutique.
  const categoryItems = mergeUnique(deviceTypeLabels(), categories.items);
  const brandItems = draft.category ? mergeUnique(brandsForType(draft.category), brands.items) : [];

  const categoryOther = categoryOtherLocal || (!!draft.category && !categoryItems.includes(draft.category));
  const brandOther = brandOtherLocal || (!!draft.brand && !brandItems.includes(draft.brand));
  const noBrandCategory = brandItems.length === 0;

  const models = useAsyncList(
    (signal) =>
      shopReady && draft.category && !brandOther && (draft.brand || noBrandCategory)
        ? client.getModels(token, { category: draft.category, brand: draft.brand || undefined, shop }, signal)
        : Promise.resolve([]),
    [token, shop, draft.category, draft.brand, brandOther, noBrandCategory, shopReady],
  );
  const modelItems =
    draft.category && draft.brand
      ? mergeUnique(modelsForBrand(draft.category, draft.brand), models.items)
      : models.items;
  const modelOther = modelOtherLocal || (!!draft.model && !brandOther && !modelItems.includes(draft.model));

  const resetDevice: Partial<WidgetDraft> = {
    category: "",
    brand: "",
    model: "",
    issues: [],
    services: {},
    issueDescription: "",
  };
  const resetDownstream: Partial<WidgetDraft> = { model: "", issues: [], services: {}, issueDescription: "" };

  return (
    <StepShell title={texts.deviceTitle} subtitle="Indiquez la catégorie, la marque et le modèle concernés.">
      {chooseShop ? (
        <WidgetField label="Boutique" required>
          <div className="grid gap-2">
            {config.shops.map((entry) => (
              <OptionCard
                key={entry.id}
                selected={draft.shopId === entry.id}
                title={entry.name}
                subtitle={[entry.address.postalCode, entry.address.city].filter(Boolean).join(" ") || undefined}
                onClick={() => {
                  setBrandOtherLocal(false);
                  setModelOtherLocal(false);
                  patch({ shopId: entry.id, ...resetDevice });
                }}
              />
            ))}
          </div>
        </WidgetField>
      ) : null}

      {!shopReady ? (
        <WidgetNotice>Choisissez votre boutique pour découvrir les appareils et prestations disponibles.</WidgetNotice>
      ) : (
        <>
          <WidgetField label="Catégorie" required>
            <CatalogPicker
              items={categoryItems}
              loading={categoryItems.length === 0 && categories.loading}
              error={categories.error}
              onReload={categories.reload}
              searchable={features.deviceSearch}
              searchPlaceholder="Rechercher un type d’appareil"
              value={draft.category}
              isCustom={categoryOther}
              allowOther={config.catalogPolicy.allowOutOfCatalog}
              otherLabel="Autre appareil"
              otherPlaceholder="Type d’appareil (ex : montre connectée)"
              emptyHint="Aucun appareil publié pour cette boutique."
              onSelect={(value) => {
                setCategoryOtherLocal(false);
                setBrandOtherLocal(false);
                setModelOtherLocal(false);
                patch({ category: value, brand: "", ...resetDownstream });
              }}
              onSelectOther={(value) => {
                setBrandOtherLocal(false);
                setModelOtherLocal(false);
                patch({ category: value, brand: "", ...resetDownstream });
              }}
              onEnterOther={() => {
                setCategoryOtherLocal(true);
                setBrandOtherLocal(false);
                setModelOtherLocal(false);
                patch({ category: "", brand: "", ...resetDownstream });
              }}
              renderItemIcon={(item) => {
                const target = iconTargetForDevice(item);
                return target ? <WidgetIcon choice={config.icons[target]} /> : null;
              }}
            />
          </WidgetField>

          {draft.category ? (
            <WidgetField label="Marque" hint={noBrandCategory ? "Marque facultative pour cette catégorie." : undefined}>
              <CatalogPicker
                items={brandItems}
                loading={brandItems.length === 0 && brands.loading}
                error={brands.error}
                onReload={brands.reload}
                searchable={features.deviceSearch}
                searchPlaceholder="Rechercher une marque"
                value={draft.brand}
                isCustom={brandOther}
                allowOther={config.catalogPolicy.allowOutOfCatalog}
                otherLabel="Autre marque"
                otherPlaceholder="Saisissez la marque"
                onSelect={(value) => {
                  setBrandOtherLocal(false);
                  setModelOtherLocal(false);
                  patch({ brand: value, ...resetDownstream });
                }}
                onSelectOther={(value) => {
                  setModelOtherLocal(false);
                  patch({ brand: value, ...resetDownstream });
                }}
                onEnterOther={() => {
                  setBrandOtherLocal(true);
                  setModelOtherLocal(false);
                  patch({ brand: "", ...resetDownstream });
                }}
              />
            </WidgetField>
          ) : null}

          {draft.category && (draft.brand || brandOther || noBrandCategory) ? (
            <WidgetField label="Modèle" required>
              {brandOther ? (
                <WidgetInput
                  value={draft.model}
                  onChange={(event) =>
                    patch({ model: event.target.value, issues: [], services: {}, issueDescription: "" })
                  }
                  placeholder="Saisissez le modèle"
                />
              ) : (
                <CatalogPicker
                  items={modelItems}
                  loading={modelItems.length === 0 && models.loading}
                  error={models.error}
                  onReload={models.reload}
                  searchable={features.deviceSearch}
                  searchPlaceholder="Rechercher un modèle"
                  value={draft.model}
                  isCustom={modelOther}
                  allowOther={config.catalogPolicy.allowUnconfiguredModels}
                  otherLabel="Autre modèle"
                  otherPlaceholder="Saisissez le modèle"
                  onSelect={(value) => {
                    setModelOtherLocal(false);
                    patch({ model: value, issues: [], services: {}, issueDescription: "" });
                  }}
                  onSelectOther={(value) => patch({ model: value, issues: [], services: {}, issueDescription: "" })}
                  onEnterOther={() => {
                    setModelOtherLocal(true);
                    patch({ model: "", issues: [], services: {}, issueDescription: "" });
                  }}
                />
              )}
            </WidgetField>
          ) : null}

          {draft.model.trim() ? (
            <p className="text-sm text-[var(--w-muted)]">
              Appareil sélectionné : <span className="font-medium text-[var(--w-text)]">{deviceLabel(draft)}</span>
            </p>
          ) : null}
        </>
      )}
    </StepShell>
  );
}
