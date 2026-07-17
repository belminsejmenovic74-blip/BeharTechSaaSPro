"use client";

// Étape 1 — Appareil.
// Catégorie, marque et modèle depuis le catalogue publié, filtrés pour la
// boutique concernée, avec recherche textuelle, suggestions, saisies « autre
// marque » / « autre modèle ». Pour un widget multi-boutiques, le choix de la
// boutique précède et conditionne le catalogue.

import { useState } from "react";

import { useAsyncList } from "@/components/widget/use-catalog";
import { deviceLabel, type StepContext, type WidgetDraft } from "@/components/widget/widget-state";
import {
  OptionCard,
  StepShell,
  WidgetField,
  WidgetInput,
  WidgetNotice,
  WidgetSelect,
} from "@/components/widget/widget-primitives";
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
          <div className="grid gap-3 rounded-[calc(var(--w-radius)+4px)] border border-[var(--w-border)] bg-white p-3 shadow-[0_8px_28px_rgba(17,17,17,.04)] lg:grid-cols-3">
            <WidgetField label="Quel appareil ?" required>
              <WidgetSelect
                aria-label="Quel appareil ?"
                value={categoryOther ? "__other__" : draft.category}
                onChange={(event) => {
                  const value = event.target.value;
                  const other = value === "__other__";
                  setCategoryOtherLocal(other);
                  setBrandOtherLocal(false);
                  setModelOtherLocal(false);
                  patch({ category: other ? "" : value, brand: "", ...resetDownstream });
                }}
              >
                <option value="">Choisissez un appareil</option>
                {categoryItems.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
                {config.catalogPolicy.allowOutOfCatalog ? <option value="__other__">Autre appareil</option> : null}
              </WidgetSelect>
              {categoryOther ? (
                <WidgetInput
                  value={draft.category}
                  onChange={(event) => patch({ category: event.target.value, brand: "", ...resetDownstream })}
                  placeholder="Type d’appareil"
                />
              ) : null}
            </WidgetField>

            <WidgetField label="Quelle marque ?">
              <WidgetSelect
                aria-label="Quelle marque ?"
                disabled={!draft.category}
                value={brandOther ? "__other__" : draft.brand}
                onChange={(event) => {
                  const value = event.target.value;
                  const other = value === "__other__";
                  setBrandOtherLocal(other);
                  setModelOtherLocal(false);
                  patch({ brand: other ? "" : value, ...resetDownstream });
                }}
              >
                <option value="">{draft.category ? "Choisissez une marque" : "Choisissez d’abord un appareil"}</option>
                {brandItems.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
                {config.catalogPolicy.allowOutOfCatalog ? <option value="__other__">Autre marque</option> : null}
              </WidgetSelect>
              {brandOther ? (
                <WidgetInput
                  value={draft.brand}
                  onChange={(event) => patch({ brand: event.target.value, ...resetDownstream })}
                  placeholder="Saisissez la marque"
                />
              ) : null}
            </WidgetField>

            <WidgetField label="Quel modèle ?" required>
              <WidgetSelect
                aria-label="Quel modèle ?"
                disabled={!draft.category || (!draft.brand && !brandOther && !noBrandCategory)}
                value={modelOther ? "__other__" : draft.model}
                onChange={(event) => {
                  const value = event.target.value;
                  const other = value === "__other__";
                  setModelOtherLocal(other);
                  patch({ model: other ? "" : value, issues: [], services: {}, issueDescription: "" });
                }}
              >
                <option value="">
                  {draft.brand || brandOther || noBrandCategory
                    ? "Choisissez un modèle"
                    : "Choisissez d’abord une marque"}
                </option>
                {modelItems.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
                {config.catalogPolicy.allowUnconfiguredModels ? <option value="__other__">Autre modèle</option> : null}
              </WidgetSelect>
              {modelOther ? (
                <WidgetInput
                  value={draft.model}
                  onChange={(event) =>
                    patch({ model: event.target.value, issues: [], services: {}, issueDescription: "" })
                  }
                  placeholder="Saisissez le modèle"
                />
              ) : null}
            </WidgetField>
          </div>

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
