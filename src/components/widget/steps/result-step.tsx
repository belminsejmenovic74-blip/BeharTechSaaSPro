"use client";

// Étape 3 — Résultat.
// N'affiche que les données publiées : prestation, prix, qualité, disponibilité,
// durée, garantie. Sans prix publié → demande de contact. Sans stock configuré →
// « Disponibilité à confirmer ». Les prix/stock ne sont jamais recalculés côté
// client : on lit la projection publique renvoyée par l'API.

import { useEffect, useRef } from "react";

import type { PublicService } from "@/lib/widget/public-types";
import { useAsyncList } from "@/components/widget/use-catalog";
import type { StepContext } from "@/components/widget/widget-state";
import { formatAvailability, formatDuration, formatPrice } from "@/components/widget/widget-theme";
import { StepShell, WidgetChip, WidgetNotice } from "@/components/widget/widget-primitives";

function sameIssue(a: string, b: string): boolean {
  return a.localeCompare(b, "fr", { sensitivity: "base" }) === 0;
}

export function ResultStep({ ctx }: { ctx: StepContext }) {
  const { client, token, draft, patch, features, texts, currency, locale, emit } = ctx;

  const services = useAsyncList(
    (signal) =>
      draft.category && draft.model
        ? client.getServices(
            token,
            { category: draft.category, brand: draft.brand, model: draft.model, shop: draft.shopId || undefined },
            signal,
          )
        : Promise.resolve<PublicService[]>([]),
    [token, draft.shopId, draft.category, draft.brand, draft.model],
  );

  const matchesFor = (issue: string) => services.items.filter((service) => sameIssue(service.issue, issue));

  // Résolution : associe à chaque problème sa prestation publiée (défaut = 1re
  // correspondance). Ne réécrit le brouillon que si la sélection devient invalide.
  useEffect(() => {
    if (services.loading || services.error) return;
    const next = { ...draft.services };
    let changed = false;
    for (const issue of draft.issues) {
      const matches = matchesFor(issue);
      const current = draft.services[issue];
      const stillValid = current ? matches.some((match) => match.publicId === current.publicId) : false;
      if (matches.length === 0) {
        if (current !== null) {
          next[issue] = null;
          changed = true;
        }
      } else if (!stillValid) {
        next[issue] = matches[0];
        changed = true;
      }
    }
    for (const key of Object.keys(next)) {
      if (!draft.issues.includes(key)) {
        delete next[key];
        changed = true;
      }
    }
    if (changed) patch({ services: next });
    // matchesFor dérive de services.items ; dépendances explicites ci-dessous.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services.items, services.loading, services.error, draft.issues]);

  // Analytique : une émission prix/stock par résolution.
  const emittedRef = useRef<string>("");
  useEffect(() => {
    if (services.loading || services.error) return;
    if (draft.issues.some((issue) => draft.services[issue] === undefined)) return; // résolution en cours
    const primary = draft.issues.map((issue) => draft.services[issue]?.publicId ?? "").join("|");
    if (emittedRef.current === primary) return;
    emittedRef.current = primary;
    const anyPriced = draft.issues.some((issue) => {
      const service = draft.services[issue];
      return service ? !formatPrice(service.price, currency, locale).onRequest : false;
    });
    emit(anyPriced ? "price_displayed" : "price_unavailable");
    const anyStock = draft.issues.some((issue) => draft.services[issue]?.stock);
    emit(anyStock ? "stock_displayed" : "stock_unavailable");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services.loading, services.error, draft.services]);

  const anyOnRequest = draft.issues.some((issue) => {
    const service = draft.services[issue];
    return !service || formatPrice(service.price, currency, locale).onRequest;
  });

  return (
    <StepShell title={texts.resultTitle} subtitle="Estimation d’après les prestations publiées par l’atelier.">
      {services.loading ? (
        <div className="h-40 animate-pulse rounded-[var(--w-radius)] border border-[var(--w-border)] bg-[var(--w-tint)]" />
      ) : (
        <div className="grid gap-4">
          {draft.issues.map((issue) => (
            <ResultCard
              key={issue}
              issue={issue}
              matches={matchesFor(issue)}
              chosen={draft.services[issue] ?? null}
              onChoose={(service) => patch({ services: { ...draft.services, [issue]: service } })}
              ctx={ctx}
            />
          ))}
        </div>
      )}

      {anyOnRequest ? (
        <WidgetNotice>
          Certaines prestations n’ont pas de tarif en ligne. Laissez vos coordonnées à l’étape suivante : l’atelier vous
          communique un devis personnalisé.
        </WidgetNotice>
      ) : null}
    </StepShell>
  );
}

function ResultCard({
  issue,
  matches,
  chosen,
  onChoose,
  ctx,
}: {
  issue: string;
  matches: PublicService[];
  chosen: PublicService | null;
  onChoose: (service: PublicService) => void;
  ctx: StepContext;
}) {
  const { features, currency, locale } = ctx;
  const price = chosen ? formatPrice(chosen.price, currency, locale) : { label: null, onRequest: true };
  const duration = chosen ? formatDuration(chosen.durationMinutes) : null;
  const availability = formatAvailability(chosen?.stock);

  const meta: Array<{ label: string; value: string }> = [];
  if (chosen?.quality) meta.push({ label: "Qualité", value: chosen.quality });
  if (features.stockAvailability) meta.push({ label: "Disponibilité", value: availability });
  if (features.duration && duration) meta.push({ label: "Durée estimée", value: duration });
  if (features.warranty && chosen?.warranty) meta.push({ label: "Garantie", value: chosen.warranty });

  return (
    <article className="rounded-[var(--w-radius)] border border-[var(--w-border)] bg-[var(--w-surface)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--w-muted)]">{issue}</p>
          <h3 className="mt-1 text-base font-semibold text-[var(--w-text)]">
            {chosen ? chosen.service : "Prestation sur devis"}
          </h3>
        </div>
        {features.priceEstimate ? (
          <div className="shrink-0 text-right">
            {price.onRequest ? (
              <span className="text-sm font-semibold text-[var(--w-text)]">Sur devis</span>
            ) : (
              <span className="text-lg font-semibold text-[var(--w-primary)]">{price.label}</span>
            )}
          </div>
        ) : null}
      </div>

      {features.qualityChoice && matches.length > 1 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {matches.map((service) => (
            <WidgetChip
              key={service.publicId}
              selected={chosen?.publicId === service.publicId}
              onClick={() => onChoose(service)}
            >
              {service.quality || service.service}
            </WidgetChip>
          ))}
        </div>
      ) : null}

      {meta.length ? (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          {meta.map((entry) => (
            <div key={entry.label} className="min-w-0">
              <dt className="text-xs text-[var(--w-muted)]">{entry.label}</dt>
              <dd className="truncate text-sm font-medium text-[var(--w-text)]">{entry.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {!chosen ? (
        <p className="mt-3 text-sm text-[var(--w-muted)]">
          Aucun tarif en ligne pour ce problème — l’atelier vous recontacte après votre demande.
        </p>
      ) : null}
    </article>
  );
}
