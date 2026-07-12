"use client";

// Section « ventes additionnelles & offres » (façon WeFix « Nos services » +
// « Nos offres partenaires »). Affichée sous les réparations : options payantes
// (verre trempé, chargeur…) et bonus/remises (QualiRépar, -10 % en ligne…).
// Pilotée par le CMS : si aucune offre publiée n'est visible, rien ne s'affiche.

import { Check, ExternalLink, Gift, PackagePlus, ShieldCheck, Tag } from "lucide-react";

import type { StepContext } from "@/components/widget/widget-state";
import { formatMoney } from "@/components/widget/widget-theme";
import type { WidgetOffer } from "@/lib/widget/public-types";
import { cn } from "@/lib/utils";

export function offersVisibleFor(ctx: StepContext): WidgetOffer[] {
  const { config, draft } = ctx;
  const today = new Date().toISOString().slice(0, 10);
  if (!config.offers.enabled) return [];
  return config.offers.offers.filter(
    (offer) =>
      offer.isPublished &&
      offer.behavior !== "hidden" &&
      (!offer.startDate || offer.startDate <= today) &&
      (!offer.endDate || offer.endDate >= today) &&
      (!offer.appointmentOnly || draft.requestType === "appointment") &&
      (offer.desktopVisible !== false || offer.mobileVisible !== false),
  );
}

export function OffersSection({ ctx }: { ctx: StepContext }) {
  const { config, draft, patch, currency, locale } = ctx;
  const visibleOffers = offersVisibleFor(ctx);
  if (!visibleOffers.length) return null;

  return (
    <section className="grid gap-2.5 border-t border-[var(--w-border)] pt-5">
      <h3 className="text-base font-semibold text-[var(--w-text)]">Personnalisez votre réparation</h3>
      <p className="-mt-1 text-xs text-[var(--w-muted)]">
        {config.offers.subtitle || "Ajoutez une protection ou profitez des offres disponibles."}
      </p>
      <div className={cn("grid gap-2.5", config.offers.layout === "grid" ? "sm:grid-cols-2" : "")}>
        {visibleOffers.map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            currency={currency}
            locale={locale}
            selected={offer.behavior === "automatic" || draft.selectedOfferIds.includes(offer.id)}
            onToggle={() => {
              if (offer.behavior === "link" && offer.externalUrl) {
                window.open(offer.externalUrl, "_blank", "noopener,noreferrer");
                return;
              }
              if (offer.behavior !== "selectable" && offer.behavior !== "validation") return;
              const has = draft.selectedOfferIds.includes(offer.id);
              patch({
                selectedOfferIds: has
                  ? draft.selectedOfferIds.filter((id) => id !== offer.id)
                  : [...draft.selectedOfferIds, offer.id],
              });
            }}
          />
        ))}
      </div>
    </section>
  );
}

function OfferCard({
  offer,
  currency,
  locale,
  selected,
  onToggle,
}: {
  offer: WidgetOffer;
  currency: string;
  locale: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const selectable = offer.behavior === "selectable" || offer.behavior === "validation";
  const interactive = selectable || offer.behavior === "link";
  const money = (value: number) => formatMoney(value, currency, locale);
  const normalizedTitle = offer.title.toLocaleLowerCase("fr-FR");
  const DefaultIcon =
    normalizedTitle.includes("qualirépar") || normalizedTitle.includes("qualirepar")
      ? ShieldCheck
      : normalizedTitle.includes("verre") || normalizedTitle.includes("chargeur") || normalizedTitle.includes("coque")
        ? PackagePlus
        : typeof offer.fixedDiscount === "number" || typeof offer.percentageDiscount === "number"
          ? Tag
          : Gift;

  const priceNode = (() => {
    if (typeof offer.promotionalPrice === "number") {
      return (
        <span className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-sm font-bold text-[var(--w-primary)]">{money(offer.promotionalPrice)}</span>
          {typeof offer.originalPrice === "number" ? (
            <span className="text-xs text-[var(--w-muted)] line-through">{money(offer.originalPrice)}</span>
          ) : null}
        </span>
      );
    }
    if (typeof offer.fixedDiscount === "number") {
      return <span className="text-sm font-bold text-[var(--w-primary)]">−{money(offer.fixedDiscount)}</span>;
    }
    if (typeof offer.percentageDiscount === "number") {
      return <span className="text-sm font-bold text-[var(--w-primary)]">−{offer.percentageDiscount} %</span>;
    }
    return null;
  })();

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!interactive}
      className={cn(
        "flex w-full items-center gap-3 rounded-[var(--w-radius)] border bg-[var(--w-surface)] p-3 text-left transition duration-150",
        selected ? "border-[var(--w-primary)] bg-[var(--w-primary-soft)]" : "border-[var(--w-border)]",
        interactive ? "hover:border-[var(--w-primary-border)]" : "cursor-default",
        offer.mobileVisible === false && offer.desktopVisible !== false ? "hidden sm:flex" : null,
        offer.desktopVisible === false && offer.mobileVisible !== false ? "flex sm:hidden" : null,
      )}
    >
      {offer.imageUrl && ["image", "image_icon"].includes(offer.displayMode) ? (
        // biome-ignore lint/performance/noImgElement: média public configuré par le réparateur.
        <img
          src={offer.imageUrl}
          alt={offer.imageAlt || ""}
          className={cn("size-14 shrink-0 rounded-lg object-cover", offer.hideImageOnMobile ? "hidden sm:block" : null)}
        />
      ) : offer.iconUrl ? (
        // biome-ignore lint/performance/noImgElement: icône personnalisée configurée dans le CMS.
        <img src={offer.iconUrl} alt="" className="size-11 shrink-0 object-contain" />
      ) : offer.displayMode !== "text" ? (
        <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[var(--w-primary-soft)] text-[var(--w-primary)]">
          <DefaultIcon className="size-5" />
        </span>
      ) : null}

      <span className="min-w-0 flex-1">
        {offer.badgeText ? (
          <span className="mb-1 inline-block rounded-full bg-[var(--w-warning-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--w-warning)]">
            {offer.badgeText}
          </span>
        ) : null}
        <span className="flex items-center justify-between gap-2">
          <strong className="truncate text-sm font-semibold text-[var(--w-text)]">{offer.title}</strong>
          {priceNode}
        </span>
        {offer.description ? (
          <span className="mt-0.5 block text-xs text-[var(--w-muted)]">{offer.description}</span>
        ) : null}
        {offer.conditionText ? (
          <span className="mt-1 block text-[11px] text-[var(--w-muted)]">{offer.conditionText}</span>
        ) : null}
      </span>

      {offer.behavior === "link" ? (
        <ExternalLink className="size-4 shrink-0 text-[var(--w-muted)]" />
      ) : selectable ? (
        <span
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-md border transition",
            selected
              ? "border-[var(--w-primary)] bg-[var(--w-primary)] text-[var(--w-on-primary)]"
              : "border-[var(--w-border)] text-transparent",
          )}
        >
          <Check className="size-3" strokeWidth={3} />
        </span>
      ) : null}
    </button>
  );
}
