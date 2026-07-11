"use client";

// Écran final — confirmation.
// Coche animée + confettis (≈2 s, couleurs du réparateur, respecte
// prefers-reduced-motion), référence publique, récapitulatif à icônes, message
// SMS/e-mail et actions. Affiché après une soumission acceptée par l'API.

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { CalendarDays, CalendarPlus, Check, MapPin, Receipt, Smartphone } from "lucide-react";
import type { SubmissionResult } from "@/lib/widget/public-types";
import { deviceLabel, issuesLabel, primaryService, type StepContext } from "@/components/widget/widget-state";
import { formatDateTimeFr } from "@/components/widget/widget-theme";
import { appliedOffers, computeEstimation, estimationLabel } from "@/lib/widget/widget-pricing";
import { WidgetIcon } from "@/components/widget/widget-icon";
import type { PublicService } from "@/lib/widget/public-types";

export function ConfirmationStep({ ctx, result }: { ctx: StepContext; result: SubmissionResult | null }) {
  const { draft, config, currency, locale } = ctx;
  const shop = config.shops.find((entry) => entry.id === draft.shopId) ?? config.shops[0];

  const isAppointment = draft.requestType === "appointment";
  const appointmentDate = result?.date ?? draft.appointmentDate;
  const appointmentTime = result?.time ?? draft.appointmentTime;

  const services = draft.issues
    .map((issue) => draft.services[issue])
    .filter((service): service is PublicService => Boolean(service));
  const estimation = computeEstimation(services, appliedOffers(config.offers, draft.selectedOfferIds), currency);
  const address = shop
    ? [shop.address.address, shop.address.postalCode, shop.address.city].filter(Boolean).join(", ")
    : "";

  useEffect(() => {
    if (!result?.accepted || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const end = Date.now() + 1800;
    const colors = [ctx.theme.primary, ctx.theme.text, "#F4B740", "#E76F51"];
    const timer = window.setInterval(() => {
      if (Date.now() >= end) {
        window.clearInterval(timer);
        return;
      }
      confetti({
        particleCount: 7,
        spread: 70,
        startVelocity: 24,
        ticks: 90,
        origin: { x: Math.random(), y: 0.15 },
        colors,
        disableForReducedMotion: true,
      });
    }, 160);
    return () => window.clearInterval(timer);
  }, [ctx.theme.primary, ctx.theme.text, result?.accepted]);

  const calendarUrl = (() => {
    if (!(isAppointment && appointmentDate && appointmentTime)) return null;
    const start = new Date(`${appointmentDate}T${appointmentTime}:00`);
    const end = new Date(
      start.getTime() + (result?.durationMinutes || primaryService(draft)?.durationMinutes || 30) * 60_000,
    );
    const stamp = (date: Date) =>
      date
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `Rendez-vous ${shop?.name || "atelier"}`,
      dates: `${stamp(start)}/${stamp(end)}`,
      details: [result?.reference ? `Référence ${result.reference}` : "", deviceLabel(draft), issuesLabel(draft)]
        .filter(Boolean)
        .join(" · "),
      location: address,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  })();

  const rows: Array<{ icon: typeof CalendarDays; value: string; sub?: string }> = [];
  if (isAppointment && appointmentDate && appointmentTime) {
    rows.push({ icon: CalendarDays, value: formatDateTimeFr(appointmentDate, appointmentTime) });
  }
  if (shop) rows.push({ icon: MapPin, value: shop.name, sub: address || undefined });
  rows.push({ icon: Smartphone, value: deviceLabel(draft), sub: issuesLabel(draft) });
  if (estimation.hasPricedService)
    rows.push({ icon: Receipt, value: `Estimation : ${estimationLabel(estimation, locale)}` });

  return (
    <div className="mx-auto grid max-w-lg gap-6 py-2 text-center">
      <div className="grid gap-3">
        <span className="mx-auto grid size-20 animate-[widget-success_.45s_ease-out_both] place-items-center rounded-full bg-[var(--w-primary)] text-[var(--w-on-primary)] shadow-[0_16px_40px_var(--w-primary-soft)]">
          {config.icons.confirmation.mode !== "none" ? (
            <WidgetIcon choice={config.icons.confirmation} />
          ) : (
            <Check className="size-10" strokeWidth={2.5} />
          )}
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--w-text)]">Votre demande est confirmée !</h2>
        {result?.reference ? (
          <p className="text-sm font-medium text-[var(--w-muted)]">
            Référence : <span className="font-semibold text-[var(--w-primary)]">{result.reference}</span>
          </p>
        ) : null}
      </div>

      <div className="grid gap-1 rounded-[var(--w-radius)] border border-[var(--w-border)] bg-[var(--w-surface)] p-5 text-left">
        {rows.map((row, index) => {
          const Icon = row.icon;
          return (
            <div
              key={`${row.value}-${index}`}
              className="flex items-start gap-3 border-b border-[var(--w-border)] py-3 last:border-b-0"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--w-primary-soft)] text-[var(--w-primary)]">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium capitalize text-[var(--w-text)]">{row.value}</span>
                {row.sub ? <span className="block text-xs text-[var(--w-muted)]">{row.sub}</span> : null}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-sm leading-relaxed text-[var(--w-muted)]">
        Vous allez recevoir une confirmation par SMS et par e-mail avec tous les détails de votre demande.
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        {calendarUrl ? (
          <a
            href={calendarUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-[var(--w-radius)] bg-[var(--w-primary)] px-5 text-sm font-semibold text-[var(--w-on-primary)] shadow-sm transition hover:brightness-95"
          >
            <CalendarPlus className="size-4" /> Ajouter au calendrier
          </a>
        ) : null}
        <button
          type="button"
          onClick={() =>
            window.parent.postMessage(
              { source: "behar-widget", widgetPublicId: config.id, type: "behar.widget.close" },
              "*",
            )
          }
          className="inline-flex h-11 items-center gap-2 rounded-[var(--w-radius)] border border-[var(--w-border)] px-5 text-sm font-semibold text-[var(--w-text)] transition hover:border-[var(--w-primary)]"
        >
          Retourner sur le site
        </button>
      </div>

      {config.general.phone ? (
        <p className="text-sm text-[var(--w-muted)]">
          Une question ? Appelez l’atelier au{" "}
          <a href={`tel:${config.general.phone}`} className="font-medium text-[var(--w-primary)]">
            {config.general.phone}
          </a>
          .
        </p>
      ) : null}
      <style>{`@keyframes widget-success{from{opacity:0;transform:scale(.72)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}
