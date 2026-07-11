"use client";

// Étape 4 — Rendez-vous & offres.
// Disposition en colonnes fidèle à la maquette : atelier (si plusieurs), calendrier
// mensuel, puis offres/bonus du réparateur. Tout est piloté par le CMS : si le
// calendrier est désactivé ou s'il n'y a aucune offre, la section disparaît et la
// mise en page se réorganise (jamais de bloc vide).

import { Check, ExternalLink, Gift, MapPin, Phone } from "lucide-react";

import { AppointmentCalendar } from "@/components/widget/steps/appointment-calendar";
import type { RequestType, StepContext } from "@/components/widget/widget-state";
import { WidgetNotice } from "@/components/widget/widget-primitives";
import { formatMoney } from "@/components/widget/widget-theme";
import type { WidgetOffer } from "@/lib/widget/public-types";
import { cn } from "@/lib/utils";

const ALT_REQUESTS: Array<{ value: RequestType; label: string }> = [
  { value: "quote", label: "Recevoir un devis" },
  { value: "callback", label: "Être rappelé" },
];

export function AppointmentOffersStep({ ctx }: { ctx: StepContext }) {
  const { config, draft, patch, features, currency, locale } = ctx;
  const today = new Date().toISOString().slice(0, 10);

  const visibleOffers = config.offers.enabled
    ? config.offers.offers.filter(
        (offer) =>
          offer.isPublished &&
          offer.behavior !== "hidden" &&
          (!offer.startDate || offer.startDate <= today) &&
          (!offer.endDate || offer.endDate >= today) &&
          (!offer.appointmentOnly || draft.requestType === "appointment") &&
          (offer.desktopVisible !== false || offer.mobileVisible !== false),
      )
    : [];

  const showBooking = features.booking && draft.requestType === "appointment";
  const showShops = showBooking && config.shops.length > 1;
  const alternatives = ALT_REQUESTS.filter((request) =>
    request.value === "quote" ? features.quoteRequest : features.callbackRequest,
  );

  // Sans calendrier, on laisse le client choisir explicitement le type de demande.
  const requestChoices: Array<{ value: RequestType; label: string }> = [
    ...(features.quoteRequest ? [{ value: "quote" as RequestType, label: "Recevoir un devis" }] : []),
    ...(features.callbackRequest ? [{ value: "callback" as RequestType, label: "Être rappelé" }] : []),
    { value: "request" as RequestType, label: "Déposer sans rendez-vous" },
  ];
  const showRequestChoice = !features.booking && requestChoices.length > 1;

  const columns = [showShops, showBooking, visibleOffers.length > 0].filter(Boolean).length;
  const gridClass = columns >= 3 ? "lg:grid-cols-3" : columns === 2 ? "lg:grid-cols-2" : "grid-cols-1";

  return (
    <div className="grid gap-5">
      {showRequestChoice ? (
        <section className="grid gap-2.5">
          <h3 className="text-sm font-semibold text-[var(--w-text)]">Votre demande</h3>
          <div className="flex flex-wrap gap-2">
            {requestChoices.map((choice) => {
              const selected = draft.requestType === choice.value;
              return (
                <button
                  key={choice.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => patch({ requestType: choice.value })}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition",
                    selected
                      ? "border-[var(--w-primary)] bg-[var(--w-primary)] text-[var(--w-on-primary)]"
                      : "border-[var(--w-border)] bg-[var(--w-surface)] text-[var(--w-text)] hover:border-[var(--w-primary)]",
                  )}
                >
                  {choice.label}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
      <div className={cn("grid gap-5", gridClass)}>
        {showShops ? (
          <section className="grid content-start gap-2.5">
            <h3 className="text-sm font-semibold text-[var(--w-text)]">Choisissez votre atelier</h3>
            <div className="grid gap-2">
              {config.shops.map((shop) => {
                const selected = draft.shopId === shop.id;
                const address = [shop.address.address, shop.address.postalCode, shop.address.city]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <button
                    key={shop.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => patch({ shopId: shop.id, appointmentDate: "", appointmentTime: "" })}
                    className={cn(
                      "flex items-start gap-3 rounded-[var(--w-radius)] border p-3.5 text-left transition",
                      selected
                        ? "border-[var(--w-primary)] bg-[var(--w-primary-soft)]"
                        : "border-[var(--w-border)] hover:border-[var(--w-primary-border)]",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition",
                        selected
                          ? "border-[var(--w-primary)] bg-[var(--w-primary)] text-[var(--w-on-primary)]"
                          : "border-[var(--w-border)] text-transparent",
                      )}
                    >
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[var(--w-text)]">{shop.name}</span>
                      <span className="mt-0.5 flex items-start gap-1 text-xs text-[var(--w-muted)]">
                        <MapPin className="mt-0.5 size-3 shrink-0" />{" "}
                        {address || "Adresse communiquée à la confirmation"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {showBooking ? (
          <section className="grid content-start gap-2.5">
            <h3 className="text-sm font-semibold text-[var(--w-text)]">Choisissez votre créneau</h3>
            <AppointmentCalendar ctx={ctx} />
            <p className="text-xs text-[var(--w-muted)]">
              Modification ou annulation gratuite jusqu’à 2 h avant le rendez-vous.
            </p>
          </section>
        ) : null}

        {visibleOffers.length ? (
          <section className="grid content-start gap-2.5">
            <h3 className="text-sm font-semibold text-[var(--w-text)]">
              {config.offers.title || "Ajoutez des options ou profitez de nos offres"}
            </h3>
            {config.offers.subtitle ? (
              <p className="-mt-1 text-xs text-[var(--w-muted)]">{config.offers.subtitle}</p>
            ) : null}
            <div className="grid gap-2.5">
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
        ) : null}
      </div>

      {!showBooking && !visibleOffers.length ? (
        <WidgetNotice>
          Votre demande peut être envoyée directement. L’atelier vous recontactera pour organiser la suite.
        </WidgetNotice>
      ) : null}

      {features.booking && alternatives.length ? (
        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-[var(--w-border)] pt-4 text-sm">
          <span className="text-[var(--w-muted)]">
            {draft.requestType === "appointment" ? "Vous préférez" : "Revenir au"} :
          </span>
          {draft.requestType !== "appointment" ? (
            <button
              type="button"
              onClick={() => patch({ requestType: "appointment" })}
              className="inline-flex items-center gap-1.5 font-medium text-[var(--w-primary)] hover:underline"
            >
              Prendre rendez-vous
            </button>
          ) : (
            alternatives.map((request) => (
              <button
                key={request.value}
                type="button"
                onClick={() => patch({ requestType: request.value, appointmentDate: "", appointmentTime: "" })}
                className="inline-flex items-center gap-1.5 font-medium text-[var(--w-primary)] hover:underline"
              >
                <Phone className="size-3.5" /> {request.label}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
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
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[var(--w-primary-soft)] text-[var(--w-primary)]">
          <Gift className="size-5" />
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
