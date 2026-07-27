"use client";

// Étape 3 (maquette « Choisissez votre mode de prise en charge ») —
// grandes cartes de mode (rendez-vous / sans rendez-vous / envoyer une demande),
// puis, pour un rendez-vous, le calendrier de créneaux, et le formulaire client.
// Les modes disponibles dépendent des fonctionnalités activées par l'atelier.

import { useEffect, useMemo } from "react";
import { CalendarClock, Check, Footprints, House, Mail, MapPin } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AppointmentCalendar } from "@/components/widget/steps/appointment-calendar";
import { WidgetField, WidgetInput } from "@/components/widget/widget-primitives";
import type { RequestType, ServiceMode, StepContext } from "@/components/widget/widget-state";
import { cn } from "@/lib/utils";

type ModeCard = {
  value: ServiceMode;
  requestType: RequestType;
  label: string;
  description: string;
  icon: LucideIcon;
};

export function IntakeStep({ ctx, submitError: _submitError }: { ctx: StepContext; submitError: string | null }) {
  const { draft, patch, features, config } = ctx;

  const modes = useMemo<ModeCard[]>(
    () => [
      ...(features.booking
        ? [
            {
              value: "appointment" as ServiceMode,
              requestType: "appointment" as RequestType,
              label: "Rendez-vous en boutique",
              description: "Choisissez un créneau et rendez-vous à l’adresse de la boutique.",
              icon: CalendarClock,
            },
          ]
        : []),
      ...(features.walkIn
        ? [
            {
              value: "walk_in" as ServiceMode,
              requestType: "request" as RequestType,
              label: "Venir directement",
              description: "Passez en boutique sans réservation préalable.",
              icon: Footprints,
            },
          ]
        : []),
      ...(features.homeService
        ? [
            {
              value: "home_service" as ServiceMode,
              requestType: "request" as RequestType,
              label: "Intervention à domicile",
              description: "L’atelier intervient à l’adresse indiquée.",
              icon: House,
            },
          ]
        : []),
      ...(features.quoteRequest || features.callbackRequest
        ? [
            {
              value: "request" as ServiceMode,
              requestType: (features.quoteRequest ? "quote" : "callback") as RequestType,
              label: "Envoyer une demande",
              description: "Décrivez votre besoin et laissez l’atelier vous rappeler.",
              icon: Mail,
            },
          ]
        : []),
    ],
    [features.booking, features.callbackRequest, features.homeService, features.quoteRequest, features.walkIn],
  );

  useEffect(() => {
    if (modes.some((mode) => mode.value === draft.serviceMode)) return;
    const fallback = modes[0];
    if (fallback)
      patch({
        serviceMode: fallback.value,
        requestType: fallback.requestType,
        appointmentDate: "",
        appointmentTime: "",
      });
  }, [draft.serviceMode, modes, patch]);

  const isAppointment = draft.serviceMode === "appointment";
  const isWalkIn = draft.serviceMode === "walk_in";
  const isHomeService = draft.serviceMode === "home_service";
  const selectedShop = config.shops.find((shop) => shop.id === draft.shopId) ?? config.shops[0];
  const shopAddress = selectedShop
    ? [selectedShop.address.address, selectedShop.address.postalCode, selectedShop.address.city]
        .filter(Boolean)
        .join(", ")
    : config.general.address;

  return (
    <div className="grid gap-6">
      {modes.length > 1 ? (
        <div className={cn("grid gap-3 sm:grid-cols-2", modes.length > 2 && "xl:grid-cols-4")}>
          {modes.map((mode) => {
            const selected = draft.serviceMode === mode.value;
            const Icon = mode.icon;
            return (
              <button
                key={mode.value}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  patch({
                    serviceMode: mode.value,
                    requestType: mode.requestType,
                    appointmentDate: "",
                    appointmentTime: "",
                  })
                }
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
        <>
          <section className="flex items-start gap-3 rounded-[16px] border border-[var(--w-border)] bg-[#F5F6F3] p-4">
            <MapPin className="mt-0.5 size-5 shrink-0 text-[var(--w-primary)]" />
            <div className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--w-primary)]">
                Adresse de la boutique
              </span>
              {shopAddress ? <p className="text-sm font-medium text-[var(--w-text)]">{shopAddress}</p> : null}
              <p className="text-xs leading-relaxed text-[var(--w-muted)]">
                Ce rendez-vous aura lieu dans la boutique sélectionnée.
              </p>
            </div>
          </section>
          <section className="grid gap-2.5">
            <h3 className="text-sm font-semibold text-[var(--w-text)]">Choisissez votre créneau</h3>
            <AppointmentCalendar ctx={ctx} />
          </section>
        </>
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

      {isHomeService ? (
        <section className="grid gap-4 rounded-[18px] border border-[var(--w-primary-border)] bg-[var(--w-primary-soft)] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--w-surface)] text-[var(--w-primary)] shadow-sm">
              <MapPin className="size-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-[var(--w-text)]">Adresse de l’intervention</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--w-muted)]">
                Elle sera transmise uniquement à l’atelier pour organiser le déplacement.
              </p>
            </div>
            <span className="ml-auto rounded-full border border-[var(--w-primary-border)] bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--w-primary)]">
              {draft.serviceCountry === "CH" ? "Suisse" : "France"}
            </span>
          </div>
          <WidgetField label="Adresse" htmlFor="w-service-address" required>
            <WidgetInput
              id="w-service-address"
              value={draft.serviceAddress}
              autoComplete="street-address"
              placeholder="Numéro et nom de rue"
              onChange={(event) => patch({ serviceAddress: event.target.value })}
            />
          </WidgetField>
          <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
            <WidgetField
              label={draft.serviceCountry === "CH" ? "NPA" : "Code postal"}
              htmlFor="w-service-postal-code"
              required
            >
              <WidgetInput
                id="w-service-postal-code"
                value={draft.servicePostalCode}
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder={draft.serviceCountry === "CH" ? "1201" : "75001"}
                maxLength={draft.serviceCountry === "CH" ? 4 : 5}
                onChange={(event) =>
                  patch({
                    servicePostalCode: event.target.value
                      .replace(/\D/g, "")
                      .slice(0, draft.serviceCountry === "CH" ? 4 : 5),
                  })
                }
              />
            </WidgetField>
            <WidgetField label="Ville" htmlFor="w-service-city" required>
              <WidgetInput
                id="w-service-city"
                value={draft.serviceCity}
                autoComplete="address-level2"
                placeholder={draft.serviceCountry === "CH" ? "Genève" : "Paris"}
                onChange={(event) => patch({ serviceCity: event.target.value })}
              />
            </WidgetField>
          </div>
        </section>
      ) : null}
    </div>
  );
}
