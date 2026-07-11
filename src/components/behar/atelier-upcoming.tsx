"use client";

// Atelier — section « À venir ».
// Rendez-vous issus du widget (pré-fiches), regroupés par statut. Toutes les
// informations consultées par le client sont reprises ; « Commencer la prise en
// charge » convertit la pré-fiche en réparation sans aucune ressaisie.

import { useMemo } from "react";

import { type Appointment, formatEuro, useBeharStore } from "@/lib/behar-store";
import { upcomingStatusKey, WIDGET_UPCOMING_STATUSES, type UpcomingStatusKey } from "@/lib/widget/appointment-sync";

const STATUS_TONE: Record<UpcomingStatusKey, string> = {
  to_confirm: "bg-[#FBF6EA] text-[#8A6D1B] border-[#EBD9B4]",
  confirmed: "bg-[#ECF8F4] text-[#167B70] border-[#BFE7DD]",
  arrived: "bg-[#EAF2FF] text-[#2B5FB3] border-[#C6D9F5]",
  no_show: "bg-[#F7F7F5] text-[#8A8A85] border-[#E8E8E5]",
  cancelled: "bg-[#FBECEC] text-[#B4232A] border-[#F0CBCD]",
  converted: "bg-[#F1EEFB] text-[#5B45A8] border-[#D9CFF2]",
};

const STATUS_LABEL: Record<UpcomingStatusKey, string> = Object.fromEntries(
  WIDGET_UPCOMING_STATUSES.map((entry) => [entry.key, entry.label]),
) as Record<UpcomingStatusKey, string>;

const STATUS_ORDER: UpcomingStatusKey[] = ["to_confirm", "confirmed", "arrived", "no_show", "cancelled", "converted"];

function isWidgetAppointment(appointment: Appointment): boolean {
  return appointment.source === "Widget site internet" || appointment.isPreIntake === true;
}

export function AtelierUpcoming() {
  const appointments = useBeharStore((state) => state.appointments);
  const updateAppointment = useBeharStore((state) => state.updateAppointment);
  const createRepairFromAppointment = useBeharStore((state) => state.createRepairFromAppointment);

  const upcoming = useMemo(
    () =>
      appointments
        .filter(isWidgetAppointment)
        .slice()
        .sort((a, b) => {
          const orderDiff =
            STATUS_ORDER.indexOf(upcomingStatusKey(a.status)) - STATUS_ORDER.indexOf(upcomingStatusKey(b.status));
          if (orderDiff !== 0) return orderDiff;
          return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`, "fr");
        }),
    [appointments],
  );

  if (upcoming.length === 0) return null;

  return (
    <section className="rounded-[18px] border border-[#E8E8E5] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.035)]">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-[#1A1916] text-lg tracking-tight">À venir</h2>
          <p className="text-[#6B6B6B] text-xs">Rendez-vous pris en ligne — à confirmer puis prendre en charge.</p>
        </div>
        <span className="rounded-full bg-[#F1F0EC] px-2.5 py-1 font-medium text-[#6B6B6B] text-xs">
          {upcoming.length} rendez-vous
        </span>
      </header>

      <div className="grid gap-3">
        {upcoming.map((appointment) => (
          <UpcomingCard
            key={appointment.id}
            appointment={appointment}
            onConfirm={() => updateAppointment(appointment.id, { status: "Confirmé", confirmed: true })}
            onArrived={() => updateAppointment(appointment.id, { status: "Arrivé" })}
            onNoShow={() => updateAppointment(appointment.id, { status: "Non venu" })}
            onCancel={() => updateAppointment(appointment.id, { status: "Annulé" })}
            onStart={() => createRepairFromAppointment(appointment.id)}
          />
        ))}
      </div>
    </section>
  );
}

function UpcomingCard({
  appointment,
  onConfirm,
  onArrived,
  onNoShow,
  onCancel,
  onStart,
}: {
  appointment: Appointment;
  onConfirm: () => void;
  onArrived: () => void;
  onNoShow: () => void;
  onCancel: () => void;
  onStart: () => void;
}) {
  const key = upcomingStatusKey(appointment.status);
  const price = typeof appointment.customerPrice === "number" ? formatEuro(appointment.customerPrice) : "Sur devis";

  return (
    <article className="rounded-[14px] border border-[#E8E8E5] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#1A1916] text-sm">
              {appointment.date} · {appointment.time}
            </span>
            <span className="rounded-full border border-[#BFE7DD] bg-[#ECF8F4] px-2 py-0.5 font-medium text-[#167B70] text-[11px]">
              Widget
            </span>
            <span className={`rounded-full border px-2 py-0.5 font-medium text-[11px] ${STATUS_TONE[key]}`}>
              {STATUS_LABEL[key]}
            </span>
          </div>
          <p className="mt-1.5 truncate font-medium text-[#1A1916] text-sm">
            {appointment.clientName || "Client"}
            {appointment.clientPhone ? (
              <span className="text-[#6B6B6B] text-xs"> · {appointment.clientPhone}</span>
            ) : null}
          </p>
          <p className="truncate text-[#6B6B6B] text-xs">
            {appointment.device}
            {appointment.deviceModel && appointment.device !== appointment.deviceModel
              ? ` · ${appointment.deviceModel}`
              : ""}
            {" — "}
            {appointment.issueDescription || appointment.issue}
            {appointment.qualityLabel ? ` (${appointment.qualityLabel})` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-[#1A1916] text-sm">{price}</p>
          {appointment.availabilityLabel ? (
            <p className="text-[#6B6B6B] text-xs">{appointment.availabilityLabel}</p>
          ) : null}
        </div>
      </div>

      {appointment.alerts?.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {appointment.alerts.map((alert) => (
            <span
              key={alert}
              className="rounded-full border border-[#EBD9B4] bg-[#FBF6EA] px-2 py-0.5 font-medium text-[#8A6D1B] text-[11px]"
            >
              {alert}
            </span>
          ))}
        </div>
      ) : null}

      {key !== "converted" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {key === "to_confirm" ? (
            <ActionButton primary onClick={onConfirm}>
              Confirmer
            </ActionButton>
          ) : null}
          {key === "confirmed" ? <ActionButton onClick={onArrived}>Client arrivé</ActionButton> : null}
          {key === "confirmed" || key === "arrived" ? (
            <ActionButton primary onClick={onStart}>
              Commencer la prise en charge
            </ActionButton>
          ) : null}
          {key !== "no_show" && key !== "cancelled" ? <ActionButton onClick={onNoShow}>Absent</ActionButton> : null}
          {key !== "cancelled" ? <ActionButton onClick={onCancel}>Annuler</ActionButton> : null}
          {key === "no_show" || key === "cancelled" ? (
            <ActionButton onClick={onConfirm}>Reprogrammer</ActionButton>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-[#5B45A8] text-xs">Prise en charge créée — dossier transféré à l’atelier.</p>
      )}
    </article>
  );
}

function ActionButton({
  children,
  onClick,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        primary
          ? "rounded-[10px] bg-[#2A9D8F] px-3 py-1.5 font-semibold text-white text-xs transition hover:brightness-95"
          : "rounded-[10px] border border-[#E8E8E5] bg-white px-3 py-1.5 font-medium text-[#1A1916] text-xs transition hover:border-[#2A9D8F]"
      }
    >
      {children}
    </button>
  );
}
