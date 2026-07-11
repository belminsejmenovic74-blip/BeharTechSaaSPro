"use client";

// Étape 5 — Confirmation.
// Résumé de la demande : boutique, appareil, problème, type de demande, date du
// rendez-vous éventuel, et message de confirmation. Affichée après une
// soumission acceptée par l'API.

import type { SubmissionResult } from "@/lib/widget/public-types";
import {
  deviceLabel,
  issuesLabel,
  primaryService,
  type RequestType,
  type StepContext,
} from "@/components/widget/widget-state";
import { formatDateTimeFr, formatPrice } from "@/components/widget/widget-theme";
import { SummaryRow } from "@/components/widget/widget-primitives";
import { WidgetIcon } from "@/components/widget/widget-icon";

const REQUEST_LABELS: Record<RequestType, string> = {
  appointment: "Rendez-vous",
  callback: "Demande de rappel",
  quote: "Demande de devis",
  price_request: "Demande de prix",
  request: "Demande générale",
};

export function ConfirmationStep({ ctx, result }: { ctx: StepContext; result: SubmissionResult | null }) {
  const { draft, config, currency, locale } = ctx;
  const shop = config.shops.find((entry) => entry.id === draft.shopId) ?? config.shops[0];
  const service = primaryService(draft);
  const price = service ? formatPrice(service.price, currency, locale) : null;

  const isAppointment = draft.requestType === "appointment";
  const appointmentDate = result?.date ?? draft.appointmentDate;
  const appointmentTime = result?.time ?? draft.appointmentTime;

  const headline = isAppointment ? "Votre rendez-vous est enregistré" : "Votre demande est envoyée";
  const message = isAppointment
    ? "L’atelier confirme votre créneau très prochainement. Vous recevrez un message de rappel."
    : "L’atelier a bien reçu votre demande et vous recontacte au plus vite.";

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 text-center">
        {config.icons.confirmation.mode !== "none" ? (
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--w-tint)] text-[var(--w-primary)]">
            <WidgetIcon choice={config.icons.confirmation} />
          </span>
        ) : null}
        <h2 className="text-xl font-semibold tracking-tight text-[var(--w-text)]">{headline}</h2>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-[var(--w-muted)]">{message}</p>
      </div>

      <div className="rounded-[var(--w-radius)] border border-[var(--w-border)] bg-[var(--w-surface)] p-5">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--w-muted)]">Résumé</p>
        <div className="divide-y divide-[var(--w-border)]">
          {shop ? <SummaryRow label="Boutique" value={shop.name} /> : null}
          <SummaryRow label="Appareil" value={deviceLabel(draft)} />
          <SummaryRow label={draft.issues.length > 1 ? "Problèmes" : "Problème"} value={issuesLabel(draft)} />
          {service ? <SummaryRow label="Prestation" value={service.service} /> : null}
          {price && !price.onRequest ? <SummaryRow label="Estimation" value={price.label ?? ""} /> : null}
          <SummaryRow label="Type de demande" value={REQUEST_LABELS[draft.requestType]} />
          {isAppointment && appointmentDate && appointmentTime ? (
            <SummaryRow
              label="Rendez-vous"
              value={<span className="capitalize">{formatDateTimeFr(appointmentDate, appointmentTime)}</span>}
            />
          ) : null}
        </div>
      </div>

      {config.general.phone ? (
        <p className="text-center text-sm text-[var(--w-muted)]">
          Une question ? Appelez l’atelier au{" "}
          <a href={`tel:${config.general.phone}`} className="font-medium text-[var(--w-primary)]">
            {config.general.phone}
          </a>
          .
        </p>
      ) : null}
    </div>
  );
}
