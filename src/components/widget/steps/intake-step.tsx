"use client";

// Étape 3 (maquette « Choisissez votre mode de prise en charge ») —
// grandes cartes de mode (rendez-vous / sans rendez-vous / envoyer une demande),
// puis, pour un rendez-vous, le calendrier de créneaux, et le formulaire client.
// Les modes disponibles dépendent des fonctionnalités activées par l'atelier.

import { useEffect, useMemo } from "react";
import { CalendarClock, Check, Footprints, Mail, MapPin } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AppointmentCalendar } from "@/components/widget/steps/appointment-calendar";
import type { RequestType, StepContext } from "@/components/widget/widget-state";
import { cn } from "@/lib/utils";

type ModeCard = { value: RequestType; label: string; description: string; icon: LucideIcon };

export function IntakeStep({ ctx, submitError: _submitError }: { ctx: StepContext; submitError: string | null }) {
  const { draft, patch, features, config } = ctx;

  const modes = useMemo<ModeCard[]>(
    () => [
      ...(features.booking
        ? [
            {
              value: "appointment" as RequestType,
              label: "Prendre rendez-vous",
              description: "Choisissez un créneau disponible dans l’agenda.",
              icon: CalendarClock,
            },
          ]
        : []),
      ...(features.walkIn
        ? [
            {
              value: "request" as RequestType,
              label: "Venir directement",
              description: "Passez en boutique sans réservation préalable.",
              icon: Footprints,
            },
          ]
        : []),
      ...(features.quoteRequest || features.callbackRequest
        ? [
            {
              value: (features.quoteRequest ? "quote" : "callback") as RequestType,
              label: "Envoyer une demande",
              description: "Décrivez votre besoin et laissez l’atelier vous rappeler.",
              icon: Mail,
            },
          ]
        : []),
    ],
    [features.booking, features.callbackRequest, features.quoteRequest, features.walkIn],
  );

  useEffect(() => {
    if (modes.some((mode) => mode.value === draft.requestType)) return;
    const fallback = modes[0]?.value;
    if (fallback) patch({ requestType: fallback, appointmentDate: "", appointmentTime: "" });
  }, [draft.requestType, modes, patch]);

  const isAppointment = draft.requestType === "appointment";
  const isWalkIn = draft.requestType === "request";
  const selectedShop = config.shops.find((shop) => shop.id === draft.shopId) ?? config.shops[0];
  const shopAddress = selectedShop
    ? [selectedShop.address.address, selectedShop.address.postalCode, selectedShop.address.city]
        .filter(Boolean)
        .join(", ")
    : config.general.address;

  return (
    <div className="grid gap-6">
      {modes.length > 1 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {modes.map((mode) => {
            const selected = draft.requestType === mode.value;
            const Icon = mode.icon;
            return (
              <button
                key={mode.value}
                type="button"
                aria-pressed={selected}
                onClick={() => patch({ requestType: mode.value, appointmentDate: "", appointmentTime: "" })}
                className={cn(
                  "relative grid content-start gap-2 rounded-[16px] border bg-[var(--w-surface)] p-4 pr-10 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--w-focus-ring)]",
                  selected
                    ? "border-[var(--w-primary)] bg-[var(--w-primary-soft)]"
                    : "border-[var(--w-border)] hover:border-[var(--w-primary-border)] hover:shadow-sm",
                )}
              >
                <span className="text-[var(--w-primary)]">
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                <span className="text-sm font-semibold text-[var(--w-text)]">{mode.label}</span>
                <span className="text-xs leading-relaxed text-[var(--w-muted)]">{mode.description}</span>
                {selected ? (
                  <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-[var(--w-primary)] text-[var(--w-on-primary)]">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {isAppointment ? (
        <section className="grid gap-2.5">
          <h3 className="text-sm font-semibold text-[var(--w-text)]">Choisissez votre créneau</h3>
          <AppointmentCalendar ctx={ctx} />
        </section>
      ) : null}

      {isWalkIn ? (
        <section className="flex items-start gap-3 rounded-[16px] border border-[var(--w-border)] bg-[#F5F6F3] p-4">
          <MapPin className="mt-0.5 size-5 shrink-0 text-[var(--w-primary)]" />
          <div className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--w-primary)]">
              Sans rendez-vous
            </span>
            {shopAddress ? <p className="text-sm font-medium text-[var(--w-text)]">{shopAddress}</p> : null}
            <p className="text-xs leading-relaxed text-[var(--w-muted)]">
              L’atelier confirmera ses horaires d’accueil avec votre demande.
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
