"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CalendarPlus,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Clock3,
  Eye,
  Filter,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  RotateCw,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import {
  type Appointment,
  appointmentStatuses,
  type AppointmentStatus,
  formatIsoToDisplay,
  getNowIso,
  normalizeAppointmentStatus,
  type Repair,
  type StoreState,
  toLocalIso,
  useBeharStore,
} from "@/lib/behar-store";
import { cn } from "@/lib/utils";

import { DeviceSelector } from "../DeviceSelector";
import { RepairModal } from "./repair-create-modal";
import {
  DetailRow,
  Panel,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  ToolbarSelect,
} from "./primitives";

const dayLabels = ["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."];
const hours = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
const demoWeekStart = getMonday(new Date());

const eventStyles: Record<string, string> = {
  mint: "border-[#E8E8E5] bg-white",
  blue: "border-[#E8E8E5] bg-white",
  purple: "border-[#E8E8E5] bg-white",
  sand: "border-[#E8E8E5] bg-white",
  selected: "border-[#2A9D8F] bg-white shadow-[0_12px_26px_rgba(42,157,143,0.16)]",
};

function cleanDeviceLabel(value: string) {
  return value.replace(/^(\S+)\s+\1\s+/i, "$1 ").replace(/\s+/g, " ").trim();
}

function findLinkedRepair(appointment: Appointment | undefined, repairs: Repair[]) {
  if (!appointment) return undefined;
  return repairs.find((repair) => repair.id === appointment.repairId)
    ?? repairs.find((repair) => repair.appointmentId === appointment.id);
}

export function AppointmentsWorkspace() {
  const store = useBeharStore();
  const router = useRouter();
  const [weekOffset, setWeekOffset] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [form, setForm] = useState({
    customerType: "existing" as "existing" | "new" | "counter",
    customerId: store.customers[0]?.id ?? "",
    newCustomerName: "",
    newCustomerPhone: "",
    newCustomerEmail: "",
    date: toInputDate(new Date()),
    time: "14:30",
    duration: "30 min",
    device: store.customers[0]?.device ?? "iPhone 13",
    issue: store.customers[0]?.lastRepair ?? "Écran cassé",
    status: "En attente" as AppointmentStatus,
    notes: "",
    source: "Client venu sur place",
    technician: "Atelier principal",
  });
  const [filterConfirmed, setFilterConfirmed] = useState(false);
  const [filterTechnician, setFilterTechnician] = useState("Tous les techniciens");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [repairPrefillAppointmentId, setRepairPrefillAppointmentId] = useState<string | null>(null);
  const [mobileSelectedDay, setMobileSelectedDay] = useState<string>(() => toInputDate(new Date()));
  const [mobileWeekOffset, setMobileWeekOffset] = useState(0);

  const weekDays = buildWeekDays(weekOffset);

  const visibleAppointments = store.appointments.filter((appointment) => {
    const inWeek = isAppointmentInWeek(appointment, weekDays, weekOffset);
    if (!inWeek) return false;

    if (filterConfirmed && !appointment.confirmed) return false;
    if (filterTechnician !== "Tous les techniciens" && appointment.technician !== filterTechnician) return false;

    return true;
  });

  const selected =
    visibleAppointments.find((appointment) => appointment.id === store.selectedAppointmentId) ?? visibleAppointments[0];
  const customer = selected ? store.customers.find((entry) => entry.id === selected.customerId) : undefined;
  const selectedRepair = findLinkedRepair(selected, store.repairs);
  const repairPrefillAppointment = repairPrefillAppointmentId
    ? store.appointments.find((appointment) => appointment.id === repairPrefillAppointmentId)
    : undefined;
  const openRepairFlow = (appointment: Appointment, linkedRepair?: Repair) => {
    if (linkedRepair) {
      store.setSelected("repair", linkedRepair.id);
      router.push("/dashboard/reparations");
      return;
    }
    setRepairPrefillAppointmentId(appointment.id);
  };

  // ─── Mobile RDV state ─────────────────────────────────────────────────────
  const todayIso = toInputDate(new Date());
  const mobileWeekStart = addDays(getMonday(new Date()), mobileWeekOffset * 7);
  const mobileWeekDays = Array.from({ length: 7 }).map((_, i) => addDays(mobileWeekStart, i));
  const monthLabel = capitalize(
    new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" })
      .format(mobileWeekDays[3] ?? new Date()),
  );

  const appointmentMatchesIso = (appt: Appointment, iso: string) =>
    toAppointmentInput(appt) === iso;

  const appointmentsForSelectedDay = store.appointments
    .filter((appt) => appointmentMatchesIso(appt, mobileSelectedDay) && normalizeAppointmentStatus(appt.status) !== "Annulé")
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  const dayBucket = (iso: string) =>
    store.appointments.filter((appt) => appointmentMatchesIso(appt, iso) && normalizeAppointmentStatus(appt.status) !== "Annulé");

  const mobileKpis = (() => {
    const list = appointmentsForSelectedDay;
    const arrived = list.filter((a) => normalizeAppointmentStatus(a.status) === "Arrivé").length;
    const confirmed = list.filter((a) => normalizeAppointmentStatus(a.status, a.confirmed) === "Confirmé").length;
    const pending = list.filter(
      (a) => normalizeAppointmentStatus(a.status, a.confirmed) === "En attente",
    ).length;
    return { confirmed, pending, arrived };
  })();

  const goToToday = () => {
    setMobileSelectedDay(todayIso);
    setMobileWeekOffset(0);
  };

  return (
    <div className="space-y-5">
      {/* Mobile : mini calendrier + KPI jour + agenda + CTA */}
      <section className="md:hidden space-y-4">
        {/* Mini calendrier — mois + nav semaine + 7 jours cliquables */}
        <div className="rounded-[20px] border border-[#E8E8E5] bg-white p-4 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMobileWeekOffset((o) => o - 1)}
              className="grid size-9 place-items-center rounded-full bg-[#FAFAF8] text-[#1A1916] transition active:scale-90"
              aria-label="Semaine précédente"
            >
              <ChevronLeft className="size-4" strokeWidth={2.2} />
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="font-semibold text-[#1A1916] text-[15px] tracking-tight"
            >
              {monthLabel}
            </button>
            <button
              type="button"
              onClick={() => setMobileWeekOffset((o) => o + 1)}
              className="grid size-9 place-items-center rounded-full bg-[#FAFAF8] text-[#1A1916] transition active:scale-90"
              aria-label="Semaine suivante"
            >
              <ChevronRight className="size-4" strokeWidth={2.2} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {mobileWeekDays.map((date, idx) => {
              const iso = toInputDate(date);
              const isSelected = iso === mobileSelectedDay;
              const isToday = iso === todayIso;
              const hasEvents = dayBucket(iso).length > 0;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setMobileSelectedDay(iso)}
                  className="flex flex-col items-center gap-1 py-1.5"
                >
                  <span className="text-[#8A8984] text-[10.5px] font-semibold uppercase tracking-wide">
                    {dayLabels[idx]?.replace(".", "")}
                  </span>
                  <span
                    className={cn(
                      "grid size-9 place-items-center rounded-full font-semibold text-[14px] tabular-nums transition",
                      isSelected
                        ? "bg-[#2A9D8F] text-white shadow-[0_4px_12px_rgba(42,157,143,0.3)]"
                        : isToday
                          ? "bg-[#EAF6F2] text-[#2A9D8F]"
                          : "text-[#1A1916] hover:bg-[#FAFAF8]",
                    )}
                  >
                    {date.getDate()}
                  </span>
                  <span
                    className={cn(
                      "size-1 rounded-full",
                      hasEvents ? (isSelected ? "bg-white" : "bg-[#2A9D8F]") : "bg-transparent",
                    )}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* 3 KPI jour : Confirmés / En attente / Arrivés */}
        <div className="grid grid-cols-3 gap-2.5">
          <MobileKpiTile
            icon={CheckCircle2}
            label="Confirmés"
            value={mobileKpis.confirmed}
            tone="teal"
          />
          <MobileKpiTile
            icon={Clock}
            label="En attente"
            value={mobileKpis.pending}
            tone="amber"
          />
          <MobileKpiTile
            icon={CheckCheck}
            label="Arrivés"
            value={mobileKpis.arrived}
            tone="success"
          />
        </div>

        {/* Agenda du jour */}
        <div className="rounded-[20px] border border-[#E8E8E5] bg-white p-4 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              <h3 className="font-semibold text-[#1A1916] text-[15px] tracking-tight">
                Agenda du jour
              </h3>
              <p className="mt-0.5 text-[#8A8984] text-[11.5px]">
                {capitalize(formatLongDate(mobileSelectedDay))}
              </p>
            </div>
            {mobileSelectedDay !== todayIso && (
              <button
                type="button"
                onClick={goToToday}
                className="text-[#2A9D8F] text-[12px] font-semibold"
              >
                Aujourd'hui
              </button>
            )}
          </div>

          {appointmentsForSelectedDay.length === 0 ? (
            <div className="flex items-center gap-3 rounded-[14px] bg-[#FAFAF8] px-4 py-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-white text-[#8A8984]">
                <CalendarDays className="size-[16px]" strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[#1A1916] text-[13px]">Aucun rendez-vous</p>
                <p className="mt-0.5 text-[#8A8984] text-[11.5px]">Touchez "+" pour en ajouter un.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setForm((current) => ({
                    ...current,
                    customerType: "existing",
                    customerId: customer?.id ?? store.customers[0]?.id ?? "",
                    date: mobileSelectedDay,
                    device: customer?.device ?? store.customers[0]?.device ?? "iPhone 13",
                    issue: customer?.lastRepair ?? store.customers[0]?.lastRepair ?? "Diagnostic",
                  }));
                  setCreateOpen(true);
                }}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-[#2A9D8F] text-white transition active:scale-90"
                aria-label="Ajouter un rendez-vous"
              >
                <Plus className="size-4" strokeWidth={2.4} />
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#F1F1EF]">
              {appointmentsForSelectedDay.map((appt) => {
                const apptCustomer = store.customers.find((c) => c.id === appt.customerId);
                const linked = findLinkedRepair(appt, store.repairs);
                const tone = appointmentTone(appt);
                return (
                  <li key={appt.id}>
                    <button
                      type="button"
                      onClick={() => {
                        store.setSelected("appointment", appt.id);
                        setMobileDetailOpen(true);
                      }}
                      className="flex w-full items-center gap-3 py-3 text-left transition active:scale-[0.99]"
                    >
                      <span className="flex w-12 shrink-0 flex-col items-center">
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            tone === "teal" ? "bg-[#2A9D8F]" : tone === "amber" ? "bg-[#C2841C]" : "bg-[#10B981]",
                          )}
                          aria-hidden
                        />
                        <span className="mt-1.5 font-semibold text-[#1A1916] text-[13px] tabular-nums">
                          {appt.time}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[#1A1916] text-[13.5px]">
                          {cleanDeviceLabel(appt.device)}{appt.issue ? ` · ${appt.issue}` : ""}
                        </p>
                        <p className="mt-0.5 truncate text-[#6B6B6B] text-[12px]">
                          {apptCustomer?.name || "Client comptoir"}
                          {linked ? " · Réparation liée" : ""}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <AppointmentStatusPill status={appt.status} confirmed={appt.confirmed} />
                        <ChevronRight className="size-4 text-[#CDCBC5]" strokeWidth={2} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* CTA Nouveau RDV — toujours visible en bas */}
        <PrimaryButton
          className="h-12 w-full gap-2 shadow-[0_8px_24px_rgba(42,157,143,0.18)]"
          onClick={() => {
            setForm((current) => ({
              ...current,
              customerType: "existing",
              customerId: customer?.id ?? store.customers[0]?.id ?? "",
              date: mobileSelectedDay,
              device: customer?.device ?? store.customers[0]?.device ?? "iPhone 13",
              issue: customer?.lastRepair ?? store.customers[0]?.lastRepair ?? "Diagnostic",
            }));
            setCreateOpen(true);
          }}
        >
          <Plus className="size-4" /> Nouveau rendez-vous
        </PrimaryButton>
      </section>

      <section className="grid gap-5 md:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="hidden md:block min-w-0 overflow-hidden p-0">
          <div className="flex h-[72px] items-center justify-between gap-3 overflow-hidden border-[#E7E4DC] border-b px-5">
            <div className="flex min-w-0 shrink-0 items-center gap-2">
              <SecondaryButton className="h-10 px-3" onClick={() => setWeekOffset((value) => value - 1)}>
                <ArrowLeft className="size-4" />
              </SecondaryButton>
              <SecondaryButton className="h-10 px-3" onClick={() => setWeekOffset((value) => value + 1)}>
                <ArrowRight className="size-4" />
              </SecondaryButton>
              <span className="inline-flex h-10 items-center gap-2 whitespace-nowrap px-2 font-semibold text-[#1A1916] text-sm">
                {formatWeekRange(weekDays)}
                <ArrowRight className="size-4 text-[#6B6B6B]" />
              </span>
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              <PrimaryButton
                className="h-10 shrink-0 px-4"
                onClick={() => {
                  const firstDay = weekDays[2] ?? weekDays[0];
                  setForm((current) => ({
                    ...current,
                    customerType: "existing",
                    customerId: customer?.id ?? store.customers[0]?.id ?? "",
                    date: toInputDate(firstDay.date),
                    device: customer?.device ?? store.customers[0]?.device ?? "iPhone 13",
                    issue: customer?.lastRepair ?? store.customers[0]?.lastRepair ?? "Diagnostic",
                  }));
                  setCreateOpen(true);
                }}
              >
                <Plus className="size-4" />
                <span className="hidden 2xl:inline">Nouveau rendez-vous</span>
                <span className="2xl:hidden">Nouveau RDV</span>
              </PrimaryButton>
            </div>
          </div>
          <CalendarGrid
            appointments={visibleAppointments}
            selectedId={selected?.id ?? ""}
            weekDays={weekDays}
            weekOffset={weekOffset}
          />
        </Panel>

        {selected && customer && (
          <Panel className={cn(
            mobileDetailOpen
              ? "fixed inset-x-0 bottom-0 z-40 max-h-[94svh] overflow-y-auto rounded-t-[28px] border border-[#E8E8E5] bg-white p-5 shadow-[0_-24px_70px_rgba(26,25,22,0.18)] flex flex-col"
              : "hidden",
            "md:relative md:inset-auto md:z-auto md:block md:rounded-[22px] md:border-[#E8E8E5] md:bg-white md:p-5 md:shadow-[0_18px_45px_rgba(26,25,22,0.07)] md:overflow-visible",
          )}>
            <div className="md:hidden -mx-5 -mt-5 mb-3 sticky top-0 z-10 flex items-center gap-3 border-b border-[#F1F1EF] bg-white/95 backdrop-blur-xl px-4 py-3">
              <span className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-[#D1CFCA]" aria-hidden />
              <button
                type="button"
                onClick={() => setMobileDetailOpen(false)}
                className="grid size-9 place-items-center rounded-full bg-[#F1F1EF] text-[#1A1916] transition active:scale-90"
                aria-label="Retour"
              >
                <ArrowLeft className="size-4" />
              </button>
              <span className="font-semibold text-[#1A1916] text-[15px] tracking-tight">Détail rendez-vous</span>
            </div>
            <div className="mb-5 rounded-[20px] border border-[#E8E8E5] bg-[#FAFAF8] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
                    {selected.date} · {selected.time}
                  </p>
                  <h2 className="mt-2 font-semibold text-2xl text-[#1A1916] tracking-tight">{customer.name}</h2>
                  <p className="mt-1 text-sm font-medium text-[#6B6B6B]">
                    {cleanDeviceLabel(selected.device)} · {selected.issue}
                  </p>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              {selectedRepair ? (
                <div className="mt-4 inline-flex rounded-full bg-[#EAF6F2] px-3 py-1 text-[12px] font-semibold text-[#167B70]">
                  Réparation liée · {selectedRepair.number}
                </div>
              ) : null}
            </div>

            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-[15px] text-[#1A1916]">Infos client</h3>
                <div className="mt-3 space-y-3 text-[#6B6B6B] text-sm">
                  <p className="flex items-center gap-3">
                    <Phone className="size-4" />
                    {customer.phone}
                  </p>
                  <p className="flex items-center gap-3">
                    <Mail className="size-4" />
                    {customer.email}
                  </p>
                </div>
              </div>
              <button
                aria-label="Options"
                className="cursor-not-allowed text-[#B0AEA8]"
                disabled
                title="Options avancées bientôt disponibles"
                type="button"
              >
                <MoreHorizontal className="size-5" />
              </button>
            </div>
            <dl className="border-[#E7E4DC] border-t pt-5">
              <DetailRow label="Appareil" value={cleanDeviceLabel(selected.device)} />
              <DetailRow label="Intervention" value={selected.issue} />
              <DetailRow label="Date" value={selected.date} />
              <DetailRow label="Heure" value={selected.time} />
              <DetailRow label="Durée" value={selected.duration} />
              <DetailRow label="Statut" value={selected.status} />
              <DetailRow label="Notes" value={selected.notes || "Aucune note"} />
              <DetailRow label="Canal" value={selected.channel} />
              <DetailRow label="Source" value={selected.source} />
              <DetailRow label="Technicien" value={selected.technician} />
              {selectedRepair && (
                <DetailRow
                  label="Réparation liée"
                  value={
                    <button
                      type="button"
                      onClick={() => {
                        store.setSelected("repair", selectedRepair.id);
                        router.push("/dashboard/reparations");
                      }}
                      className="font-semibold text-[#2A9D8F] underline-offset-2 hover:underline"
                    >
                      {selectedRepair.number}
                    </button>
                  }
                />
              )}
            </dl>

            <div className="mt-7 grid gap-3 border-[#E7E4DC] border-t pt-5">
              <PrimaryButton
                className="h-12 w-full text-base"
                onClick={() => {
                  store.updateAppointment(selected.id, { confirmed: true, status: "Confirmé" });
                  toast.success("Rendez-vous confirmé");
                }}
              >
                <CheckCircle2 className="size-4" />
                Confirmer
              </PrimaryButton>
              {!selectedRepair && normalizeAppointmentStatus(selected.status) !== "Arrivé" && (
                <PrimaryButton
                  className="h-12 w-full bg-[#1A1916] text-base hover:bg-[#2A2925]"
                  onClick={() => {
                    store.updateAppointment(selected.id, { confirmed: true, status: "Arrivé" });
                    toast.success("Client marqué comme arrivé");
                  }}
                >
                  <CheckCheck className="size-4" />
                  Marquer arrivé
                </PrimaryButton>
              )}
              <SecondaryButton
                className="h-12 w-full text-base"
                onClick={() => {
                  setReportingId(selected.id);
                  setForm({
                    customerType: "existing",
                    customerId: selected.customerId,
                    newCustomerName: "",
                    newCustomerPhone: "",
                    newCustomerEmail: "",
                    date: displayToInputDate(selected.date),
                    time: selected.time,
                    duration: selected.duration,
                    status: selected.status,
                    notes: selected.notes,
                    device: selected.device,
                    issue: selected.issue,
                    source: selected.source,
                    technician: selected.technician,
                  });
                }}
              >
                <RotateCw className="size-4" />
                Modifier
              </SecondaryButton>
              <SecondaryButton className="h-12 w-full text-base" onClick={() => setPreviewOpen(true)}>
                <Eye className="size-4" />
                Aperçu réparation
              </SecondaryButton>
              <SecondaryButton
                className="h-12 w-full text-base"
                disabled={!selectedRepair && normalizeAppointmentStatus(selected.status) !== "Arrivé"}
                onClick={() => {
                  if (!selected.customerId) {
                    toast.error("Impossible de créer une réparation sans client lié");
                    return;
                  }
                  if (!selectedRepair && normalizeAppointmentStatus(selected.status) !== "Arrivé") {
                    toast.info("Marquez d'abord le client comme arrivé.");
                    return;
                  }
                  openRepairFlow(selected, selectedRepair);
                }}
              >
                <CalendarPlus className="size-4" />
                {selectedRepair ? "Ouvrir réparation liée" : "Créer réparation"}
              </SecondaryButton>
              <SecondaryButton
                className="h-12 w-full text-[#B42318] text-base"
                onClick={() => {
                  const deleteLinked =
                    selectedRepair &&
                    window.confirm("Ce rendez-vous est lié à une réparation. Supprimer aussi la réparation liée ?");
                  if (!selectedRepair || deleteLinked !== undefined) {
                    store.deleteAppointment(selected.id, Boolean(deleteLinked));
                    toast.success("Rendez-vous supprimé.");
                  }
                }}
              >
                <Trash2 className="size-4" />
                Supprimer
              </SecondaryButton>
            </div>
          </Panel>
        )}
      </section>

      {createOpen && (
        <AppointmentModal
          form={form}
          onChange={setForm}
          onClose={() => setCreateOpen(false)}
          onSubmit={() => {
            let customerId = form.customerId;
            if (form.customerType === "counter") {
              customerId = store.addCustomer({
                name: "Client comptoir",
                type: "counter",
                phone: "Non renseigné",
                email: "Non renseigné",
                device: cleanDeviceLabel(form.device),
                lastRepair: form.issue,
                source: "Rendez-vous comptoir",
              });
            } else if (form.customerType === "new") {
              if (!form.newCustomerName.trim()) {
                toast.error("Ajoutez le nom du nouveau client.");
                return;
              }
              customerId = store.addCustomer({
                name: form.newCustomerName.trim(),
                phone: form.newCustomerPhone.trim() || "Non renseigné",
                email: form.newCustomerEmail.trim() || "Non renseigné",
                device: cleanDeviceLabel(form.device),
                lastRepair: form.issue,
                source: "Rendez-vous",
              });
            }
            const createdCustomer = store.customers.find((entry) => entry.id === customerId);
            if (!customerId || (form.customerType === "existing" && !createdCustomer)) {
              toast.error("Sélectionnez un client.");
              return;
            }
            if (!form.date) {
              toast.error("Choisissez une date.");
              return;
            }
            if (!form.time) {
              toast.error("Choisissez une heure.");
              return;
            }
            if (!form.issue.trim()) {
              toast.error("Ajoutez un motif.");
              return;
            }
            const date = inputToDisplayDate(form.date);
            const id = store.addAppointment({
              customerId,
              device: cleanDeviceLabel(form.device),
              issue: form.issue,
              date,
              time: form.time,
              duration: form.duration,
              status: form.status,
              notes: form.notes,
              confirmed: ["Confirmé", "Arrivé", "Réparation créée"].includes(normalizeAppointmentStatus(form.status)),
              channel: "Atelier",
              source: form.source,
              technician: form.technician,
              dayIndex: dateToDayIndex(date, buildWeekDays(weekOffset)),
              row: timeToCalendarRow(form.time),
            });
            if (!id) {
              toast.error("Impossible de créer un rendez-vous sans client lié");
              return;
            }
            store.setSelected("appointment", id);
            setCreateOpen(false);
            toast.success("Rendez-vous créé.");
          }}
          store={store}
          title="Nouveau rendez-vous"
        />
      )}

      {reportingId && selected && customer && (
        <AppointmentModal
          form={form}
          onChange={setForm}
          onClose={() => setReportingId(null)}
          onSubmit={() => {
            if (!form.date) {
              toast.error("Choisissez une date.");
              return;
            }
            if (!form.time) {
              toast.error("Choisissez une heure.");
              return;
            }
            if (!form.issue.trim()) {
              toast.error("Ajoutez un motif.");
              return;
            }
            if (
              normalizeAppointmentStatus(form.status) === "Annulé" &&
              selectedRepair &&
              !window.confirm("Ce rendez-vous est lié à une réparation. Confirmer l'annulation ?")
            ) {
              return;
            }
            const date = inputToDisplayDate(form.date);
            store.updateAppointment(reportingId, {
              date,
              time: form.time,
              duration: form.duration,
              device: cleanDeviceLabel(form.device),
              issue: form.issue,
              status: form.status,
              notes: form.notes,
              confirmed: ["Confirmé", "Arrivé", "Réparation créée"].includes(normalizeAppointmentStatus(form.status)),
              source: form.source,
              technician: form.technician,
              dayIndex: dateToDayIndex(date, buildWeekDays(weekOffset)),
              row: timeToCalendarRow(form.time),
            });
            setReportingId(null);
            toast.success("Rendez-vous modifié.");
          }}
          store={store}
          title="Modifier le rendez-vous"
        />
      )}

      {previewOpen && selected && customer && (
        <div className="fixed inset-0 z-50 grid place-items-stretch bg-[#1A1916]/20 p-0 backdrop-blur-sm md:place-items-center md:p-6">
          <Panel className="w-full max-w-none min-h-svh rounded-none p-5 md:max-w-[480px] md:min-h-0 md:rounded-[20px] md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-2xl text-[#1A1916]">Aperçu réparation</h2>
                <p className="mt-1 text-[#6B6B6B] text-sm">Vue rapide liée au rendez-vous sélectionné.</p>
              </div>
              {selectedRepair && <StatusBadge status={selectedRepair.status} />}
            </div>
            <dl className="mt-6 border-[#E7E4DC] border-t pt-4">
              <DetailRow label="Client" value={customer.name} />
              <DetailRow label="Appareil" value={cleanDeviceLabel(selectedRepair?.device ?? selected.device)} />
              <DetailRow label="Problème" value={selectedRepair?.issue ?? selected.issue} />
              <DetailRow label="Technicien" value={selectedRepair?.technician ?? selected.technician} />
              <DetailRow
                label="Montant estimé"
                value={selectedRepair ? `${selectedRepair.amount.toFixed(2)} €` : "À définir"}
              />
              <DetailRow label="Notes" value={selectedRepair?.notes || selected.notes || "Aucune note"} />
            </dl>
            <div className="mt-6 flex justify-end gap-3">
              <SecondaryButton onClick={() => setPreviewOpen(false)}>Fermer</SecondaryButton>
              <PrimaryButton
                disabled={!selectedRepair && normalizeAppointmentStatus(selected.status) !== "Arrivé"}
                onClick={() => {
                  if (!selected.customerId) {
                    toast.error("Impossible de créer une réparation sans client lié");
                    return;
                  }
                  if (!selectedRepair && normalizeAppointmentStatus(selected.status) !== "Arrivé") {
                    toast.info("Marquez d'abord le client comme arrivé.");
                    return;
                  }
                  setPreviewOpen(false);
                  openRepairFlow(selected, selectedRepair);
                }}
              >
                {selectedRepair ? "Ouvrir réparation liée" : "Créer réparation"}
              </PrimaryButton>
            </div>
          </Panel>
        </div>
      )}

      {repairPrefillAppointment && (
        <RepairModal
          initialStatus="Reçu"
          onClose={() => setRepairPrefillAppointmentId(null)}
          prefill={{
            appointmentId: repairPrefillAppointment.id,
            customerId: repairPrefillAppointment.customerId,
            device: cleanDeviceLabel(repairPrefillAppointment.device),
            issue: repairPrefillAppointment.issue,
            notes: [
              repairPrefillAppointment.notes,
              `Rendez-vous du ${repairPrefillAppointment.date} à ${repairPrefillAppointment.time}`,
            ].filter(Boolean).join("\n"),
            droppedAt: `${repairPrefillAppointment.date}, ${repairPrefillAppointment.time}`,
            technician: repairPrefillAppointment.technician,
          }}
        />
      )}

      <section className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        <AppointmentStat
          helper="rendez-vous planifiés"
          icon={CalendarDays}
          label="Rendez-vous cette semaine"
          value={String(visibleAppointments.length)}
        />
        <AppointmentStat helper="bientôt disponible" icon={BarChart3} label="Taux d'occupation" value="—" />
        <AppointmentStat helper="bientôt disponible" icon={Clock3} label="Temps moyen par rendez-vous" value="—" />
      </section>
    </div>
  );
}

function AppointmentModal({
  title,
  form,
  store,
  onChange,
  onClose,
  onSubmit,
}: Readonly<{
  title: string;
  form: AppointmentForm;
  store: StoreState;
  onChange: (form: AppointmentForm) => void;
  onClose: () => void;
  onSubmit: () => void;
}>) {
  const [deviceState, setDeviceState] = useState({
    deviceType: "Smartphone",
    brand: "Apple",
    model: "Autre",
    customModel: "",
    deviceLabel: form.device || "Apple Autre",
  });

  // Effect to sync deviceLabel back to form.device
  useEffect(() => {
    onChange({ ...form, device: deviceState.deviceLabel });
  }, [deviceState.deviceLabel]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-stretch overflow-y-auto bg-[#1A1916]/20 p-0 backdrop-blur-sm md:place-items-center md:p-4">
      <Panel className="w-full max-w-none min-h-svh overflow-y-auto rounded-none p-5 md:max-h-[calc(100svh-2rem)] md:max-w-[520px] md:min-h-0 md:rounded-[20px] md:p-6">
        <h2 className="font-semibold text-2xl text-[#1A1916]">{title}</h2>
        <p className="mt-2 text-[#6B6B6B] text-sm">Le client reçoit un email simulé après validation.</p>
        <div className="mt-6 grid gap-4">
          <div className="grid gap-3 text-[#1A1916] text-sm">
            <span>Client</span>
            <div className="flex flex-wrap gap-3">
              {[
                ["existing", "Client existant"],
                ["new", "Nouveau client"],
                ["counter", "Client comptoir"],
              ].map(([value, label]) => (
                <label className="flex cursor-pointer items-center gap-2" key={value}>
                  <input
                    checked={form.customerType === value}
                    className="accent-[#167B70]"
                    name="appointmentCustomerType"
                    onChange={() => onChange({ ...form, customerType: value as AppointmentForm["customerType"] })}
                    type="radio"
                  />
                  {label}
                </label>
              ))}
            </div>
            {form.customerType === "existing" ? (
              <select
                className="h-11 rounded-[13px] border border-[#E7E4DC] bg-white px-4 outline-none focus:border-[#2A9D8F]"
                onChange={(event) => {
                  const customer = store.customers.find((entry) => entry.id === event.target.value);
                  onChange({
                    ...form,
                    customerId: event.target.value,
                    device: customer?.device ?? form.device,
                    issue: customer?.lastRepair ?? form.issue,
                  });
                }}
                value={form.customerId}
              >
                {store.customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            ) : null}
            {form.customerType === "new" ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  className="h-11 rounded-[13px] border border-[#E7E4DC] bg-white px-4 outline-none focus:border-[#2A9D8F]"
                  onChange={(event) => onChange({ ...form, newCustomerName: event.target.value })}
                  placeholder="Nom du client"
                  value={form.newCustomerName}
                />
                <input
                  className="h-11 rounded-[13px] border border-[#E7E4DC] bg-white px-4 outline-none focus:border-[#2A9D8F]"
                  inputMode="tel"
                  onChange={(event) => onChange({ ...form, newCustomerPhone: event.target.value })}
                  placeholder="Téléphone"
                  value={form.newCustomerPhone}
                />
                <input
                  className="h-11 rounded-[13px] border border-[#E7E4DC] bg-white px-4 outline-none focus:border-[#2A9D8F]"
                  onChange={(event) => onChange({ ...form, newCustomerEmail: event.target.value })}
                  placeholder="Email"
                  type="email"
                  value={form.newCustomerEmail}
                />
              </div>
            ) : null}
            {form.customerType === "counter" ? (
              <p className="rounded-[13px] border border-[#E7E4DC] bg-[#FAFAF8] px-4 py-3 text-[#6B6B6B]">
                Un client comptoir séparé sera créé pour ce rendez-vous.
              </p>
            ) : null}
          </div>
          <div className="rounded-2xl bg-[#F1F1EF]/50 p-4 border border-[#E7E4DC]/50 shadow-sm">
            <div className="mb-4 text-[#1A1916] font-semibold text-sm">Détails du créneau</div>
            <div className="grid gap-4">
              <label className="grid gap-2 text-[#1A1916] text-sm">
                <span className="text-[#6B6B6B] mb-1">Délai rapide</span>
                <select
                  className="h-11 rounded-[13px] border border-[#E7E4DC] bg-white px-4 outline-none focus:border-[#2A9D8F]"
                  onChange={(event) => {
                    const durationValue = event.target.value;
                    if (durationValue === "custom") return;
                    const now = new Date();
                    const target = new Date(now);
                    if (durationValue === "30min") target.setMinutes(now.getMinutes() + 30);
                    else if (durationValue === "1h") target.setHours(now.getHours() + 1);
                    else if (durationValue === "2h") target.setHours(now.getHours() + 2);
                    else if (durationValue === "4h") target.setHours(now.getHours() + 4);
                    else if (durationValue === "tomorrow") {
                      target.setDate(now.getDate() + 1);
                      target.setHours(14, 0, 0, 0);
                    }
                    const dateAndTime = toLocalIso(target).split("T");
                    const date = dateAndTime[0];
                    const time = dateAndTime[1];
                    onChange({ ...form, date, time });
                  }}
                  defaultValue="custom"
                >
                  <option value="custom">Sélection manuelle</option>
                  <option value="30min">Dans 30 minutes</option>
                  <option value="1h">Dans 1 heure</option>
                  <option value="2h">Dans 2 heures</option>
                  <option value="4h">Dans 4 heures</option>
                  <option value="tomorrow">Demain (14h)</option>
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-[#1A1916] text-sm">
                  <span className="text-[#6B6B6B] mb-1">Date</span>
                  <input
                    className="h-11 rounded-[13px] border border-[#E7E4DC] bg-white px-4 outline-none focus:border-[#2A9D8F] font-bold text-[#1A1916]"
                    onChange={(event) => onChange({ ...form, date: event.target.value })}
                    type="date"
                    value={form.date}
                  />
                </label>
                <label className="grid gap-2 text-[#1A1916] text-sm">
                  <span className="text-[#6B6B6B] mb-1">Heure</span>
                  <input
                    className="h-11 rounded-[13px] border border-[#E7E4DC] bg-white px-4 outline-none focus:border-[#2A9D8F] font-bold text-[#1A1916]"
                    onChange={(event) => onChange({ ...form, time: event.target.value })}
                    type="time"
                    value={form.time}
                  />
                </label>
              </div>
            </div>
          </div>
          <label className="grid gap-2 text-[#1A1916] text-sm">
            Durée
            <select
              className="h-11 rounded-[13px] border border-[#E7E4DC] bg-white px-4 outline-none focus:border-[#2A9D8F]"
              onChange={(event) => onChange({ ...form, duration: event.target.value })}
              value={form.duration}
            >
              <option>15 min</option>
              <option>30 min</option>
              <option>45 min</option>
              <option>60 min</option>
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="md:col-span-2">
              <DeviceSelector
                deviceType={deviceState.deviceType}
                brand={deviceState.brand}
                model={deviceState.model}
                customModel={deviceState.customModel}
                onChange={(updates) => setDeviceState((prev) => ({ ...prev, ...updates }))}
              />
            </div>

            <label className="grid gap-2 text-[#1A1916] text-sm">
              Problème
              <input
                className="h-11 rounded-[13px] border border-[#E7E4DC] bg-white px-4 outline-none focus:border-[#2A9D8F]"
                onChange={(event) => onChange({ ...form, issue: event.target.value })}
                value={form.issue}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-[#1A1916] text-sm">
              Source
              <select
                className="h-11 rounded-[13px] border border-[#E7E4DC] bg-white px-4 outline-none focus:border-[#2A9D8F]"
                onChange={(event) => onChange({ ...form, source: event.target.value })}
                value={form.source}
              >
                <option>Client venu sur place</option>
                <option>Widget site internet</option>
                <option>Téléphone</option>
                <option>Instagram</option>
              </select>
            </label>
            <label className="grid gap-2 text-[#1A1916] text-sm">
              Statut
              <select
                className="h-11 rounded-[13px] border border-[#E7E4DC] bg-white px-4 outline-none focus:border-[#2A9D8F]"
                onChange={(event) => onChange({ ...form, status: event.target.value as AppointmentStatus })}
                value={form.status}
              >
                {appointmentStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-[#1A1916] text-sm">
              Technicien
              <select
                className="h-11 rounded-[13px] border border-[#E7E4DC] bg-white px-4 outline-none focus:border-[#2A9D8F]"
                onChange={(event) => onChange({ ...form, technician: event.target.value })}
                value={form.technician}
              >
                <option>Atelier principal</option>
                <option>Ahmed K.</option>
                <option>Sophie L.</option>
                <option>Belmin</option>
              </select>
            </label>
          </div>
          <label className="grid gap-2 text-[#1A1916] text-sm">
            Notes
            <textarea
              className="min-h-20 rounded-[13px] border border-[#E7E4DC] bg-white px-4 py-3 outline-none focus:border-[#2A9D8F]"
              onChange={(event) => onChange({ ...form, notes: event.target.value })}
              value={form.notes}
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
          <PrimaryButton onClick={onSubmit}>Valider</PrimaryButton>
        </div>
      </Panel>
    </div>
  );
}

function CalendarGrid({
  appointments,
  selectedId,
  weekDays,
  weekOffset,
}: Readonly<{ appointments: Appointment[]; selectedId: string; weekDays: CalendarDay[]; weekOffset: number }>) {
  const store = useBeharStore();
  const nowLineTop = getCurrentTimeLineTop(weekDays);

  return (
    <div className="overflow-x-auto bg-white">
      <div
        className="relative grid min-w-[880px]"
        style={{ gridTemplateColumns: "76px repeat(7, minmax(106px, 1fr))" }}
      >
        {nowLineTop !== null && (
          <div className="pointer-events-none absolute right-0 left-0 z-20" style={{ top: nowLineTop }}>
            <span className="absolute left-0 size-2.5 -translate-y-1/2 rounded-full bg-[#E95E5E]" />
            <span className="block h-px bg-[#E95E5E]/55" />
          </div>
        )}
        <div className="border-[#E7E4DC] border-r border-b bg-white" />
        {weekDays.map((day) => (
          <div
            className="flex h-[86px] flex-col items-center justify-center border-[#E7E4DC] border-r border-b last:border-r-0"
            key={day.input}
          >
            <span className="text-[#6B6B6B] text-xs">{day.label}</span>
            <span
              className={cn(
                "mt-1 grid size-10 place-items-center rounded-full font-semibold text-[#1A1916] text-lg",
                day.active && "bg-[#2A9D8F] text-white",
              )}
            >
              {day.day}
            </span>
            <span className="text-[#6B6B6B] text-xs">{day.month}</span>
          </div>
        ))}

        <div className="h-[58px] border-[#E7E4DC] border-r border-b px-3 pt-4 text-[#6B6B6B] text-xs">
          Toute la journée
        </div>
        {weekDays.map((day) => (
          <div
            className="relative h-[58px] border-[#E7E4DC] border-r border-b last:border-r-0"
            key={`all-${day.input}`}
          />
        ))}

        {hours.map((hour, hourIndex) => (
          <div className="contents" key={hour}>
            <div className="relative h-[60px] border-[#E7E4DC] border-r border-b px-3 pt-3 text-[#6B6B6B] text-xs">
              {hour}
            </div>
            {weekDays.map((day, dayIndex) => (
              <div
                className="relative h-[60px] border-[#E7E4DC] border-r border-b last:border-r-0"
                key={`${hour}-${day.input}`}
              >
                {appointments
                  .filter(
                    (appointment) =>
                      appointmentDayIndex(appointment, weekDays, weekOffset) === dayIndex &&
                      timeToCalendarRow(appointment.time) === hourIndex + 3,
                  )
                  .map((appointment) => {
                    const customer = store.customers.find((entry) => entry.id === appointment.customerId);
                    const linkedRepair = findLinkedRepair(appointment, store.repairs);
                    return (
                      <button
                        className={cn(
                          "absolute inset-x-2 top-2 z-10 rounded-[14px] border border-[#E8E8E5] bg-white p-2.5 text-left text-[#1A1916] text-xs shadow-[0_10px_24px_rgba(26,25,22,0.07)] transition hover:-translate-y-0.5 hover:border-[#2A9D8F]/45",
                          eventStyles[appointment.id === selectedId ? "selected" : appointment.color],
                        )}
                        key={appointment.id}
                        onClick={() => store.setSelected("appointment", appointment.id)}
                        type="button"
                      >
                        <p className="font-semibold leading-tight">{appointment.time}</p>
                        <p className="mt-1 truncate font-semibold leading-tight">
                          {customer?.name ?? "Client à renseigner"}
                        </p>
                        <p className="truncate text-[#1A1916]/80 leading-tight">{cleanDeviceLabel(appointment.device)}</p>
                        <p className="truncate text-[#6B6B6B] leading-tight">{appointment.issue}</p>
                        {linkedRepair ? (
                          <p className="mt-1 text-[10px] font-semibold text-[#167B70]">Réparation liée</p>
                        ) : null}
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function AppointmentStat({
  label,
  value,
  helper,
  icon: Icon,
}: Readonly<{ label: string; value: string; helper: string; icon: LucideIcon }>) {
  return (
    <Panel className="h-[100px] p-5">
      <div className="flex h-full items-center justify-between gap-5">
        <div>
          <p className="text-[#6B6B6B] text-sm">{label}</p>
          <p className="mt-1 font-semibold text-3xl text-[#1A1916] leading-none tracking-normal">{value}</p>
          <p className="mt-2 text-[#6B6B6B] text-xs">{helper}</p>
        </div>
        <div className="grid size-12 place-items-center rounded-full bg-[#E8F7F3] text-[#2A9D8F]">
          <Icon className="size-5" />
        </div>
      </div>
    </Panel>
  );
}

type AppointmentForm = {
  customerType: "existing" | "new" | "counter";
  customerId: string;
  newCustomerName: string;
  newCustomerPhone: string;
  newCustomerEmail: string;
  date: string;
  time: string;
  duration: string;
  device: string;
  issue: string;
  status: AppointmentStatus;
  notes: string;
  source: string;
  technician: string;
};

type CalendarDay = {
  label: string;
  day: string;
  month: string;
  date: Date;
  input: string;
  display: string;
  active: boolean;
};

function buildWeekDays(weekOffset: number): CalendarDay[] {
  const todayInput = toInputDate(new Date());
  return dayLabels.map((label, index) => {
    const date = addDays(demoWeekStart, weekOffset * 7 + index);
    return {
      label,
      day: String(date.getDate()),
      month: monthName(date),
      date,
      input: toInputDate(date),
      display: inputToDisplayDate(toInputDate(date)),
      active: toInputDate(date) === todayInput,
    };
  });
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getMonday(date: Date) {
  const monday = new Date(date);
  const day = monday.getDay();
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekOffsetForDate(date: Date) {
  return Math.floor(daysBetween(demoWeekStart, date) / 7);
}

function daysBetween(start: Date, end: Date) {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUtc - startUtc) / 86_400_000);
}

function isAppointmentInWeek(appointment: Appointment, weekDays: CalendarDay[], _weekOffset: number) {
  return weekDays.some((day) => day.display === appointment.date || day.input === displayToInputDate(appointment.date));
}

function appointmentDayIndex(appointment: Appointment, weekDays: CalendarDay[], _weekOffset: number) {
  const fromDate = weekDays.findIndex(
    (day) => day.display === appointment.date || day.input === displayToInputDate(appointment.date),
  );
  return fromDate >= 0 ? fromDate : appointment.dayIndex;
}

function formatWeekRange(weekDays: CalendarDay[]) {
  const first = weekDays[0];
  const last = weekDays[6];
  if (!first || !last) return "";
  return `${first.day} - ${last.day} ${last.month} ${last.date.getFullYear()}`;
}

function getCurrentTimeLineTop(weekDays: CalendarDay[]) {
  const now = new Date();
  const todayInput = toInputDate(now);
  if (!weekDays.some((day) => day.input === todayInput)) return null;
  const decimalHour = now.getHours() + now.getMinutes() / 60;
  if (decimalHour < 9 || decimalHour > 18) return null;
  return 86 + 58 + (decimalHour - 9) * 60;
}

function timeToCalendarRow(time: string) {
  const [hour = "14"] = time.split(":");
  return Math.min(12, Math.max(3, Number(hour) - 6));
}

function dateToDayIndex(date: string, weekDays: CalendarDay[]) {
  const index = weekDays.findIndex((day) => day.display === date || day.input === displayToInputDate(date));
  return index >= 0 ? index : 2;
}

function inputToDisplayDate(input: string) {
  const [year, month, day] = input.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return `${date.getDate()} ${monthName(date)} ${date.getFullYear()}`;
}

function displayToInputDate(display: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(display)) return display;
  const [day, month, year] = display.split(" ");
  const monthIndex = monthNames.indexOf(month);
  if (!day || !year || monthIndex < 0) return toInputDate(new Date());
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(Number(day)).padStart(2, "0")}`;
}

function toInputDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function timeToMinutes(time: string): number {
  const [hh = "0", mm = "0"] = time.split(":");
  const h = Number(hh);
  const m = Number(mm);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

function groupAppointmentsForMobile(appointments: Appointment[]) {
  const todayIso = toInputDate(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = toInputDate(tomorrow);
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndIso = toInputDate(weekEnd);

  const buckets: { today: Appointment[]; tomorrow: Appointment[]; week: Appointment[] } = {
    today: [],
    tomorrow: [],
    week: [],
  };

  for (const appointment of appointments) {
    if (normalizeAppointmentStatus(appointment.status) === "Annulé") continue;
    const iso = displayToInputDate(appointment.date);
    if (!iso) continue;
    if (iso === todayIso) buckets.today.push(appointment);
    else if (iso === tomorrowIso) buckets.tomorrow.push(appointment);
    else if (iso > todayIso && iso <= weekEndIso) buckets.week.push(appointment);
  }

  const sortByTime = (a: Appointment, b: Appointment) => {
    const isoA = displayToInputDate(a.date);
    const isoB = displayToInputDate(b.date);
    if (isoA !== isoB) return isoA < isoB ? -1 : 1;
    return timeToMinutes(a.time) - timeToMinutes(b.time);
  };
  buckets.today.sort(sortByTime);
  buckets.tomorrow.sort(sortByTime);
  buckets.week.sort(sortByTime);
  return buckets;
}

function monthName(date: Date) {
  return monthNames[date.getMonth()] ?? "mai";
}

const monthNames = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

// ─── Helpers mobile UI ─────────────────────────────────────────────────────

function toAppointmentInput(appt: Appointment): string {
  if (!appt.date) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(appt.date)) return appt.date;
  return displayToInputDate(appt.date);
}

function formatLongDate(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(y, m - 1, d));
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function appointmentTone(appt: Appointment): "teal" | "amber" | "success" {
  const status = normalizeAppointmentStatus(appt.status, appt.confirmed);
  if (status === "Arrivé" || status === "Réparation créée") return "success";
  if (status === "Confirmé") return "teal";
  return "amber";
}

function MobileKpiTile({
  icon: Icon,
  label,
  value,
  tone,
}: Readonly<{
  icon: LucideIcon;
  label: string;
  value: number;
  tone: "teal" | "amber" | "success";
}>) {
  const palette = {
    teal: { bg: "bg-[#EAF6F2]", text: "text-[#2A9D8F]" },
    amber: { bg: "bg-[#FCF1DF]", text: "text-[#C2841C]" },
    success: { bg: "bg-[#E7F8F0]", text: "text-[#0B7A56]" },
  }[tone];
  return (
    <div className="rounded-[16px] border border-[#E8E8E5] bg-white p-3 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
      <span className={cn("grid size-8 place-items-center rounded-[10px]", palette.bg, palette.text)}>
        <Icon className="size-[15px]" strokeWidth={2.2} />
      </span>
      <p className="mt-2.5 text-[#8A8984] text-[10.5px] font-medium leading-tight tracking-tight">{label}</p>
      <p className={cn("mt-1 font-bold text-[20px] leading-none tabular-nums", palette.text)}>
        {value}
      </p>
    </div>
  );
}

function AppointmentStatusPill({
  status,
  confirmed,
}: Readonly<{ status: string; confirmed?: boolean }>) {
  const label = normalizeAppointmentStatus(status, confirmed);
  const tone = (() => {
    if (label === "Arrivé" || label === "Réparation créée") return "bg-[#E7F8F0] text-[#0B7A56]";
    if (label === "Annulé" || label === "Non venu") return "bg-[#FDECEC] text-[#B42318]";
    if (label === "Confirmé") return "bg-[#EAF6F2] text-[#167B70]";
    return "bg-[#FCF1DF] text-[#C2841C]";
  })();
  return (
    <span className={cn("inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold tracking-tight", tone)}>
      {label}
    </span>
  );
}
