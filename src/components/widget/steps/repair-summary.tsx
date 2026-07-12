"use client";

// Colonne gauche persistante (maquette) — résumé de la demande.
// Image de l'appareil, type/marque/modèle, panne(s), qualité choisie, prix,
// durée, garantie, bonus QualiRépar et avantages sélectionnés. Un bouton
// « Modifier » permet de revenir au choix de l'appareil. Le contenu s'enrichit
// au fil des étapes ; il ne montre que ce qui est déjà connu.

import { ChevronDown, PenLine, Smartphone } from "lucide-react";

import { deviceLabel, type StepContext } from "@/components/widget/widget-state";
import { formatDuration } from "@/components/widget/widget-theme";
import { appliedOffers, computeEstimation, estimationLabel, signedMoney } from "@/lib/widget/widget-pricing";
import { deviceImageFor } from "@/lib/widget/global-catalog";
import type { PublicService } from "@/lib/widget/public-types";

export function RepairSummary({ ctx, onModify }: { ctx: StepContext; onModify?: () => void }) {
  const { draft, config, currency, locale } = ctx;
  const image = deviceImageFor(draft.category, draft.brand);

  const chosen = draft.issues
    .map((issue) => ({ issue, service: draft.services[issue] }))
    .filter((entry): entry is { issue: string; service: PublicService } => Boolean(entry.service));
  const services = chosen.map((entry) => entry.service);
  const offers = appliedOffers(config.offers, draft.selectedOfferIds);
  const estimation = computeEstimation(services, offers, currency);
  const offerLines = estimation.lines.filter((line) => line.kind !== "service");
  const duration = formatDuration(services.find((s) => s.durationMinutes)?.durationMinutes);
  const warranty = services.find((s) => s.warranty)?.warranty;
  const compactQuality = chosen[0]?.service.service || chosen[0]?.service.quality || chosen[0]?.issue;
  const compactPrice = estimation.hasPricedService ? estimationLabel(estimation, locale) : "Sur devis";

  return (
    <>
      <details className="group lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 truncate text-sm font-semibold text-[var(--w-text)]">
            {[draft.model || draft.category, compactQuality, compactPrice].filter(Boolean).join(" · ")}
          </span>
          <ChevronDown className="size-4 shrink-0 text-[var(--w-muted)] transition group-open:rotate-180" />
        </summary>
        <div className="mt-3 grid gap-1 border-t border-[var(--w-border)] pt-3 text-xs text-[var(--w-muted)]">
          {draft.issues.length ? <p>{draft.issues.join(", ")}</p> : null}
          {duration || warranty ? (
            <p>{[duration, warranty ? `Garantie ${warranty}` : ""].filter(Boolean).join(" · ")}</p>
          ) : null}
        </div>
      </details>

      <div className="hidden content-start gap-4 lg:grid">
        {/* Appareil */}
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid h-32 w-full place-items-center">
            {image ? (
              // biome-ignore lint/performance/noImgElement: miniature publique déjà optimisée du catalogue.
              <img src={image} alt="" className="h-32 w-auto max-w-[128px] object-contain" />
            ) : (
              <Smartphone className="size-16 text-[var(--w-muted)]" strokeWidth={1.1} aria-hidden="true" />
            )}
          </span>
          <div>
            <p className="text-base font-semibold tracking-tight text-[var(--w-text)]">
              {deviceLabel(draft) !== "—" ? deviceLabel(draft) : draft.category || "Votre appareil"}
            </p>
            {draft.category ? <p className="text-xs text-[var(--w-muted)]">{draft.category}</p> : null}
          </div>
          {onModify ? (
            <button
              type="button"
              onClick={onModify}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--w-border)] px-3 py-1.5 text-xs font-semibold text-[var(--w-text)] transition hover:border-[var(--w-primary-border)]"
            >
              <PenLine className="size-3.5" /> Modifier
            </button>
          ) : null}
        </div>

        {/* Panne(s) + qualité(s) */}
        {draft.issues.length ? (
          <dl className="grid gap-2.5 pt-2 text-sm">
            <div className="grid gap-0.5">
              <dt className="text-xs font-medium text-[var(--w-muted)]">Panne{draft.issues.length > 1 ? "s" : ""}</dt>
              <dd className="font-medium text-[var(--w-text)]">{draft.issues.join(", ")}</dd>
            </div>
            {chosen.length ? (
              <div className="grid gap-0.5">
                <dt className="text-xs font-medium text-[var(--w-muted)]">Qualité choisie</dt>
                <dd className="font-medium text-[var(--w-text)]">
                  {chosen.map((entry) => entry.service.service || entry.service.issue).join(", ")}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {/* Prix / durée / garantie */}
        {estimation.hasPricedService || offerLines.length ? (
          <div className="grid gap-2 pt-2">
            {offerLines.map((line) => (
              <div key={line.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-[var(--w-muted)]">{line.label}</span>
                <span
                  className={
                    line.amount < 0 ? "font-medium text-[var(--w-success)]" : "font-medium text-[var(--w-text)]"
                  }
                >
                  {signedMoney(line.amount, currency, locale)}
                </span>
              </div>
            ))}
            <div className="flex items-end justify-between gap-2 pt-1">
              <span className="text-xs text-[var(--w-muted)]">Prix estimé</span>
              <span className="text-2xl font-semibold tracking-tight text-[var(--w-text)]">
                {estimationLabel(estimation, locale)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-[var(--w-muted)]">
              {duration ? <span>⏱ {duration}</span> : null}
              {warranty ? <span>· Garantie {warranty}</span> : null}
            </div>
            <p className="text-[11px] leading-relaxed text-[var(--w-muted)]">
              Prix TTC indicatif, confirmé après diagnostic.
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}

// Prix minimal affichable pour une prestation (utilitaire de secours).
export function cheapestServiceAmount(services: PublicService[]): number | null {
  const amounts = services
    .map((service) => (typeof service.price?.amount === "number" ? service.price.amount : null))
    .filter((v): v is number => v != null);
  return amounts.length ? Math.min(...amounts) : null;
}
