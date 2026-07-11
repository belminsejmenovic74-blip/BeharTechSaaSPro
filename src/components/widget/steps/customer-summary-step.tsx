"use client";

// Étape 5 (colonne gauche) — Récapitulatif de la demande.
// Reproduit la carte de synthèse de la maquette : visuel de l'appareil, panne,
// prix / durée / garantie, atelier, date, heure, options & offres, puis
// l'estimation finale (prestations − remises + options). Le formulaire de
// coordonnées occupe la colonne droite (`ContactStep`).

import { Smartphone } from "lucide-react";

import { ContactStep } from "@/components/widget/steps/contact-step";
import { deviceLabel, issuesLabel, primaryService, type StepContext } from "@/components/widget/widget-state";
import { formatDateFr, formatDuration, formatPrice } from "@/components/widget/widget-theme";
import { appliedOffers, computeEstimation, estimationLabel, signedMoney } from "@/lib/widget/widget-pricing";
import { deviceImageFor } from "@/lib/widget/global-catalog";
import type { PublicService } from "@/lib/widget/public-types";

export function CustomerSummaryStep({ ctx, submitError }: { ctx: StepContext; submitError: string | null }) {
  const { draft, config, currency, locale } = ctx;
  const primary = primaryService(draft);
  const price = primary ? formatPrice(primary.price, currency, locale) : null;
  const duration = primary ? formatDuration(primary.durationMinutes) : null;
  const shop = config.shops.find((entry) => entry.id === draft.shopId) ?? config.shops[0];
  const image = deviceImageFor(draft.category, draft.brand);

  const services = draft.issues
    .map((issue) => draft.services[issue])
    .filter((service): service is PublicService => Boolean(service));
  const offers = appliedOffers(config.offers, draft.selectedOfferIds);
  const estimation = computeEstimation(services, offers, currency);
  const offerLines = estimation.lines.filter((line) => line.kind !== "service");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(300px,0.82fr)_minmax(0,1.2fr)]">
      <aside className="lg:sticky lg:top-0 lg:self-start">
        <div className="overflow-hidden rounded-[var(--w-radius)] border border-[var(--w-border)] bg-[var(--w-page-bg)]">
          <p className="border-b border-[var(--w-border)] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--w-muted)]">
            Récapitulatif de votre demande
          </p>
          <div className="grid gap-4 p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-16 shrink-0 place-items-center rounded-[calc(var(--w-radius)-4px)] bg-[var(--w-surface)]">
                {image ? (
                  // biome-ignore lint/performance/noImgElement: miniature publique déjà optimisée du catalogue appareils.
                  <img src={image} alt="" className="h-14 w-auto max-w-[48px] object-contain" />
                ) : (
                  <Smartphone className="size-7 text-[var(--w-muted)]" strokeWidth={1.25} aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-[var(--w-text)]">{deviceLabel(draft)}</p>
                <p className="truncate text-sm text-[var(--w-muted)]">{issuesLabel(draft)}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--w-primary)]">
                  {price && !price.onRequest ? price.label : "Sur devis"}
                  {duration ? <span className="font-normal text-[var(--w-muted)]"> · {duration}</span> : null}
                </p>
                {primary?.warranty ? (
                  <p className="text-xs text-[var(--w-muted)]">Garantie {primary.warranty}</p>
                ) : null}
              </div>
            </div>

            <dl className="grid gap-2 border-t border-[var(--w-border)] pt-3 text-sm">
              {shop ? (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-[var(--w-muted)]">Atelier</dt>
                  <dd className="text-right font-medium text-[var(--w-text)]">{shop.name}</dd>
                </div>
              ) : null}
              {draft.appointmentDate ? (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-[var(--w-muted)]">Date</dt>
                  <dd className="text-right font-medium capitalize text-[var(--w-text)]">
                    {formatDateFr(draft.appointmentDate)}
                  </dd>
                </div>
              ) : null}
              {draft.appointmentTime ? (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-[var(--w-muted)]">Heure</dt>
                  <dd className="text-right font-medium text-[var(--w-text)]">{draft.appointmentTime}</dd>
                </div>
              ) : null}
            </dl>

            {offerLines.length ? (
              <div className="grid gap-1.5 border-t border-[var(--w-border)] pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--w-muted)]">Options & offres</p>
                {offerLines.map((line) => (
                  <div key={line.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-[var(--w-text)]">{line.label}</span>
                    <span
                      className={
                        line.amount < 0 ? "font-medium text-[var(--w-success)]" : "font-medium text-[var(--w-text)]"
                      }
                    >
                      {signedMoney(line.amount, currency, locale)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="border-t border-[var(--w-border)] pt-3">
              <p className="text-xs text-[var(--w-muted)]">Estimation</p>
              <p className="mt-0.5 text-2xl font-semibold tracking-tight text-[var(--w-text)]">
                {estimationLabel(estimation, locale)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--w-muted)]">
                Le prix final sera confirmé après diagnostic.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <ContactStep ctx={ctx} submitError={submitError} />
    </div>
  );
}
