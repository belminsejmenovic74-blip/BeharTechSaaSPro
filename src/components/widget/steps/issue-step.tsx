"use client";

// Étape 2 — Problème.
// Sélection de la panne / prestation depuis le catalogue publié, saisie « autre
// problème » libre et description complémentaire. Le mono ou multi-choix dépend
// de l'autorisation du réparateur (`features.multiIssue`).

import { useState } from "react";

import { CatalogPicker } from "@/components/widget/catalog-picker";
import { useAsyncList } from "@/components/widget/use-catalog";
import type { StepContext } from "@/components/widget/widget-state";
import { StepShell, WidgetChip, WidgetField, WidgetInput, WidgetTextarea } from "@/components/widget/widget-primitives";

export function IssueStep({ ctx }: { ctx: StepContext }) {
  const { client, token, draft, patch, features, texts } = ctx;
  const [customIssue, setCustomIssue] = useState("");

  const issues = useAsyncList(
    (signal) =>
      draft.category && draft.model
        ? client.getIssues(
            token,
            { category: draft.category, brand: draft.brand, model: draft.model, shop: draft.shopId || undefined },
            signal,
          )
        : Promise.resolve([]),
    [token, draft.shopId, draft.category, draft.brand, draft.model],
  );

  const customIssues = draft.issues.filter((issue) => !issues.items.includes(issue));

  function toggle(issue: string) {
    const has = draft.issues.includes(issue);
    const next = features.multiIssue
      ? has
        ? draft.issues.filter((entry) => entry !== issue)
        : [...draft.issues, issue]
      : has
        ? []
        : [issue];
    patch({ issues: next, services: {} });
  }

  function addCustom() {
    const value = customIssue.trim();
    if (!value || draft.issues.includes(value)) {
      setCustomIssue("");
      return;
    }
    toggle(value);
    setCustomIssue("");
  }

  const subtitle = features.multiIssue
    ? "Sélectionnez un ou plusieurs problèmes, ou décrivez-en un autre."
    : "Sélectionnez le problème rencontré, ou décrivez-en un autre.";

  return (
    <StepShell title={texts.issueTitle} subtitle={subtitle}>
      <WidgetField label={features.multiIssue ? "Problèmes" : "Problème"} required>
        {issues.loading ? (
          <CatalogPicker
            items={[]}
            loading
            error={null}
            onReload={issues.reload}
            value=""
            isCustom={false}
            onSelect={() => undefined}
            onSelectOther={() => undefined}
            onEnterOther={() => undefined}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {issues.items.map((issue) => (
              <WidgetChip key={issue} selected={draft.issues.includes(issue)} onClick={() => toggle(issue)}>
                {issue}
              </WidgetChip>
            ))}
            {customIssues.map((issue) => (
              <WidgetChip key={issue} selected onClick={() => toggle(issue)}>
                {issue}&nbsp;×
              </WidgetChip>
            ))}
            {issues.items.length === 0 && customIssues.length === 0 ? (
              <p className="text-sm text-[var(--w-muted)]">
                Aucun problème prédéfini pour cet appareil — décrivez-le ci-dessous.
              </p>
            ) : null}
          </div>
        )}
      </WidgetField>

      <WidgetField label="Autre problème" hint="Ajoutez un problème absent de la liste.">
        <div className="flex gap-2">
          <WidgetInput
            value={customIssue}
            onChange={(event) => setCustomIssue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustom();
              }
            }}
            placeholder="Ex : le bouton ne répond plus"
          />
          <WidgetChip selected={false} onClick={addCustom} disabled={!customIssue.trim()}>
            Ajouter
          </WidgetChip>
        </div>
      </WidgetField>

      <WidgetField label="Description complémentaire" hint="Facultatif — précisez le contexte, l’urgence, etc.">
        <WidgetTextarea
          value={draft.issueDescription}
          onChange={(event) => patch({ issueDescription: event.target.value })}
          placeholder="Décrivez le problème avec vos mots…"
          maxLength={1200}
        />
      </WidgetField>
    </StepShell>
  );
}
