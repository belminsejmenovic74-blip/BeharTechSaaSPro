"use client";

// Étape 2 (maquette « Choisissez votre réparation ») — sélection de la qualité.
// Pour chaque panne retenue, on affiche les prestations publiées comme des
// cartes comparatives (compatible / premium / original…). Le catalogue peut en
// proposer aucune (« Sur devis »), une seule (auto-sélectionnée) ou plusieurs.
// Choisir une carte fixe draft.services[panne] = prestation, ce qui alimente le
// récapitulatif et l'estimation. Rien n'est codé en dur : tout vient de l'API.

import { useEffect } from "react";
import { Check, Clock, ShieldCheck, Star } from "lucide-react";

import { useAsyncList } from "@/components/widget/use-catalog";
import { OffersSection } from "@/components/widget/steps/offers-section";
import type { StepContext } from "@/components/widget/widget-state";
import { formatDuration, formatPrice } from "@/components/widget/widget-theme";
import type { PublicService } from "@/lib/widget/public-types";
import { cn } from "@/lib/utils";
import { sameIssueLabel } from "@/lib/widget/global-catalog";

export function QualityStep({ ctx }: { ctx: StepContext }) {
  const { client, token, draft, patch, currency, locale, features } = ctx;

  const services = useAsyncList<PublicService>(
    (signal) =>
      draft.category && draft.model
        ? client.getServices(
            token,
            { category: draft.category, brand: draft.brand, model: draft.model, shop: draft.shopId || undefined },
            signal,
          )
        : Promise.resolve([]),
    [token, draft.shopId, draft.category, draft.brand, draft.model],
  );

  // Auto-sélection quand une panne n'a qu'une seule qualité disponible.
  // biome-ignore lint/correctness/useExhaustiveDependencies: piloté par la résolution des prestations.
  useEffect(() => {
    if (services.loading || services.error) return;
    const next = { ...draft.services };
    let changed = false;
    for (const issue of draft.issues) {
      const matches = services.items.filter((service) => sameIssueLabel(service.issue, issue));
      const current = draft.services[issue];
      const stillValid = current ? matches.some((match) => match.publicId === current.publicId) : false;
      if (matches.length === 1 && (!current || !stillValid)) {
        next[issue] = matches[0];
        changed = true;
      } else if (matches.length === 0 && current !== null) {
        next[issue] = null;
        changed = true;
      } else if (current && !stillValid && matches.length > 1) {
        // Prestation devenue invalide (ex. changement de modèle) : on la retire.
        delete next[issue];
        changed = true;
      }
    }
    if (changed) patch({ services: next });
  }, [services.items, services.loading, services.error, draft.issues]);

  const issues = draft.issues.length ? draft.issues : [];

  return (
    <div className="grid gap-6">
      {services.loading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-[var(--w-radius)] bg-[var(--w-tint)]" />
          ))}
        </div>
      ) : (
        issues.map((issue) => {
          const options = services.items.filter((service) => sameIssueLabel(service.issue, issue));
          return (
            <section key={issue} className="grid gap-3">
              {issues.length > 1 ? <h3 className="text-sm font-semibold text-[var(--w-text)]">{issue}</h3> : null}
              {options.length === 0 ? (
                <div className="rounded-[var(--w-radius)] border border-dashed border-[var(--w-border)] p-6 text-center text-sm text-[var(--w-muted)]">
                  Cette réparation est réalisée sur devis. Le prix vous sera confirmé après diagnostic.
                </div>
              ) : (
                <div
                  className={cn("grid auto-rows-fr gap-3", options.length > 1 ? "sm:grid-cols-2 xl:grid-cols-3" : "")}
                >
                  {options.map((service) => (
                    <QualityCard
                      key={service.publicId}
                      service={service}
                      currency={currency}
                      locale={locale}
                      warrantyShown={features.warranty}
                      selected={draft.services[issue]?.publicId === service.publicId}
                      onSelect={() => patch({ services: { ...draft.services, [issue]: service } })}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}

      <OffersSection ctx={ctx} />
    </div>
  );
}

function QualityCard({
  service,
  currency,
  locale,
  warrantyShown,
  selected,
  onSelect,
}: {
  service: PublicService;
  currency: string;
  locale: string;
  warrantyShown: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const price = formatPrice(service.price, currency, locale);
  const duration = formatDuration(service.durationMinutes);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "relative flex h-full min-h-[210px] flex-col gap-2.5 rounded-[16px] border bg-[var(--w-surface)] p-4 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--w-focus-ring)]",
        selected
          ? "border-[var(--w-primary)] bg-[var(--w-primary-soft)] shadow-[0_2px_16px_var(--w-primary-soft)]"
          : "border-[var(--w-border)] hover:border-[var(--w-primary-border)] hover:shadow-sm",
      )}
    >
      <span className="flex items-start justify-between gap-2">
        {service.recommended ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--w-primary)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--w-on-primary)]">
            <Star className="size-3" /> Recommandé
          </span>
        ) : (
          <span />
        )}
        <span
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-full border transition",
            selected
              ? "border-[var(--w-primary)] bg-[var(--w-primary)] text-[var(--w-on-primary)]"
              : "border-[var(--w-border)] text-transparent",
          )}
        >
          <Check className="size-3" strokeWidth={3} />
        </span>
      </span>

      <span>
        <span className="block text-base font-semibold text-[var(--w-text)]">
          {service.quality
            ? `${service.service || service.issue} · ${service.quality}`
            : service.service || service.issue}
        </span>
        {service.description ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-[var(--w-muted)]">{service.description}</span>
        ) : null}
      </span>

      <span className="mt-auto grid gap-1.5 pt-1">
        <span className="text-[22px] font-semibold tracking-tight text-[var(--w-text)]">
          {price.onRequest ? "Sur devis" : price.label}
        </span>
        <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--w-muted)]">
          {duration ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" /> {duration}
            </span>
          ) : null}
          {warrantyShown && service.warranty ? (
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="size-3.5" /> Garantie {service.warranty}
            </span>
          ) : null}
        </span>
        {service.qualireparEligible ? (
          <span className="mt-0.5 inline-flex w-fit items-center gap-1 text-[11px] font-medium text-[var(--w-success)]">
            QualiRépar{service.qualireparBonus ? ` : jusqu’à ${service.qualireparBonus} € déduits` : ""}
          </span>
        ) : null}
      </span>
    </button>
  );
}
