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
  CheckCircle2,
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
  formatIsoToDisplay,
  getNowIso,
  type StoreState,
  toLocalIso,
  useBeharStore,
} from "@/lib/behar-store";
import { cn } from "@/lib/utils";

import { DeviceSelector } from "../DeviceSelector";
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
  mint: "border-[#C7E9DF] bg-[#EAF7F3]",
  blue: "border-[#D5E3F6] bg-[#EFF6FF]",
  purple: "border-[#E7D9F4] bg-[#F7F0FF]",
  sand: "border-[#F0E0C4] bg-[#FFF6E8]",
  selected: "border-[#2A9D8F] bg-[#E4F7F0] shadow-[0_12px_26px_rgba(42,157,143,0.16)]",
};

export function AppointmentsWorkspace() {
  const store = useBeharStore();
  const router = useRouter();
  const [weekOffset, setWeekOffset] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [form, setForm] = useState({
    customerId: store.customers[0]?.id ?? "",
    date: toInputDate(new Date()),
    time: "14:30",
    duration: "30 min",
    device: store.customers[0]?.device ?? "iPhone 13",
    issue: store.customers[0]?.lastRepair ?? "Écran cassé",
    status: "prévu",
    notes: "",
    source: "Client venu sur place",
    technician: "Atelier principal",
  });
  const [filterConfirmed, setFilterConfirmed] = useState(false);
  const [filterTechnician, setFilterTechnician] = useState("Tous les techniciens");

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
  const selectedRepair = selected
    ? (store.repairs.find((repair) => repair.id === selected.repairId) ??
      store.repairs.find((repair) => repair.appointmentId === selected.id) ??
      store.repairs.find(
        (repair) =>
          repair.customerId === selected.customerId &&
          repair.device === selected.device &&
          repair.issue === selected.issue,
      ))
    : undefined;

  return (
    <div className="space-y-5">
      {/* Mobile : KPI + liste verticale RDV */}
      <div className="md:hidden space-y-4">
        {(() => {
          const today = new Date();
          const todayKey = today.toISOString().slice(0, 10);
          const todayAppts = store.appointments.filter(
            (a) => displayToInputDate(a.date) === todayKey || a.date === "Aujourd'hui",
          );
          const weekAppts = visibleAppointments;
          const pending = store.appointments.filter((a) => a.status === "Prévu" || a.status === "Confirmé").length;
          return (
            <>
              <section className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 scrollbar-none">
                <div className="w-[44%] shrink-0 rounded-[18px] bg-white p-4 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
                  <span className="grid size-9 place-items-center rounded-[10px] bg-[#EAF6F2] text-[#2A9D8F]">📅</span>
                  <p className="mt-3 text-[#8A8984] text-[11px] font-medium">Aujourd'hui</p>
                  <p className="mt-1.5 font-bold text-[#1A1916] text-[20px] leading-none tabular-nums">{todayAppts.length}</p>
                </div>
                <div className="w-[44%] shrink-0 rounded-[18px] bg-white p-4 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
                  <span className="grid size-9 place-items-center rounded-[10px] bg-[#EAF6F2] text-[#2A9D8F]">📋</span>
                  <p className="mt-3 text-[#8A8984] text-[11px] font-medium">Cette semaine</p>
                  <p className="mt-1.5 font-bold text-[#1A1916] text-[20px] leading-none tabular-nums">{weekAppts.length}</p>
                </div>
                <div className="w-[44%] shrink-0 rounded-[18px] bg-white p-4 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
                  <span className="grid size-9 place-items-center rounded-[10px] bg-[#FCF1DF] text-[#C2841C]">⏳</span>
                  <p className="mt-3 text-[#8A8984] text-[11px] font-medium">En attente</p>
                  <p className="mt-1.5 font-bold text-[#C2841C] text-[20px] leading-none tabular-nums">{pending}</p>
                </div>
              </section>

              <PrimaryButton
                className="h-11 w-full"
                onClick={() => {
                  const firstDay = weekDays[2] ?? weekDays[0];
                  setForm((current) => ({
                    ...current,
                    customerId: customer?.id ?? store.customers[0]?.id ?? "",
                    date: toInputDate(firstDay.date),
                    device: customer?.device ?? store.customers[0]?.device ?? "iPhone 13",
                    issue: customer?.lastRepair ?? store.customers[0]?.lastRepair ?? "Diagnostic",
                  }));
                  setCreateOpen(true);
                }}
              >
                <Plus className="size-4" />
                Nouveau rendez-vous
              </PrimaryButton>

              <ul className="space-y-2.5">
                {visibleAppointments.length === 0 ? (
                  <li className="rounded-[18px] bg-white p-10 text-center text-[#8A8984] text-sm shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
                    Aucun rendez-vous cette semaine.
                  </li>
                ) : visibleAppointments.map((appt) => {
                  const apptCustomer = store.customers.find((c) => c.id === appt.customerId);
                  return (
                    <li key={appt.id}>
                      <button
                        type="button"
                        onClick={() => store.setSelected("appointment", appt.id)}
                        className="flex w-full items-center gap-3 rounded-[18px] bg-white p-4 text-left shadow-[0_1px_2px_rgba(26,25,22,0.04)] transition active:scale-[0.99]"
                      >
                        <div className="flex w-14 shrink-0 flex-col items-center rounded-[12px] bg-[#FAFAF8] py-2">
                          <span className="font-bold text-[#1A1916] text-[16px] leading-none tabular-nums">
                            {appt.time?.split(":")[0] || "—"}
                          </span>
                          <span className="text-[#8A8984] text-[10px] mt-0.5">
                            {appt.time?.split(":")[1] || ""}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-[#1A1916] text-[14px] tracking-tight">
                            {apptCustomer?.name || "Client"}
                          </p>
                          <p className="mt-0.5 truncate text-[#1A1916] text-[12.5px]">
                            {appt.device || "—"}
                          </p>
                          <p className="mt-0.5 truncate text-[#8A8984] text-[11px]">
                            {appt.issue || appt.type} · {appt.date}
                          </p>
                          <div className="mt-1.5">
                            <span className="inline-flex rounded-full bg-[#FAFAF8] px-2 py-0.5 text-[10.5px] font-semibold text-[#6B6B6B]">
                              {appt.status || "Prévu"}
                            </span>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          );
        })()}
      </div>

      <section className="hidden md:grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="min-w-0 overflow-hidden p-0">
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
          <Panel className="p-5">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-2xl text-[#1A1916]">{customer.name}</h2>
                <div className="mt-5 space-y-3 text-[#6B6B6B] text-sm">
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
                className="text-[#6B6B6B] hover:text-[#1A1916]"
                onClick={() => toast.message("Action bientôt disponible.")}
                type="button"
              >
                <MoreHorizontal className="size-5" />
              </button>
            </div>
            <dl className="border-[#E7E4DC] border-t pt-5">
              <DetailRow label="Appareil" value={selected.device} />
              <DetailRow label="Problème" value={selected.issue} />
              <DetailRow label="Date" value={selected.date} />
              <DetailRow label="Heure" value={selected.time} />
              <DetailRow label="Durée" value={selected.duration} />
              <DetailRow label="Statut" value={selected.status} />
              <DetailRow label="Notes" value={selected.notes || "Aucune note"} />
              <DetailRow label="Canal" value={selected.channel} />
              <DetailRow label="Source" value={selected.source} />
              <DetailRow label="Technicien" value={selected.technician} />
            </dl>

            <div className="mt-7 grid gap-3 border-[#E7E4DC] border-t pt-5">
              <PrimaryButton
                className="h-12 w-full text-base"
                onClick={() => {
                  store.updateAppointment(selected.id, { confirmed: true });
                  store.updateAppointment(selected.id, { confirmed: true, status: "venu" });
                  toast.success("Rendez-vous confirmé");
                }}
              >
                <CheckCircle2 className="size-4" />
                Confirmer
              </PrimaryButton>
              <SecondaryButton
                className="h-12 w-full text-base"
                onClick={() => {
                  setReportingId(selected.id);
                  setForm({
                    customerId: selected.customerId,
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
                Reporter
              </SecondaryButton>
              <SecondaryButton className="h-12 w-full text-base" onClick={() => setPreviewOpen(true)}>
                <Eye className="size-4" />
                Aperçu réparation
              </SecondaryButton>
              <SecondaryButton
                className="h-12 w-full text-base"
                disabled={Boolean(selectedRepair)}
                onClick={() => {
                  const repairId = selectedRepair?.id ?? store.createRepairFromAppointment(selected.id);
                  if (!repairId) {
                    toast.error("Impossible de créer une réparation sans client lié");
                    return;
                  }
                  store.setSelected("repair", repairId);
                  toast.success(selectedRepair ? "Réparation ouverte" : "Fiche réparation créée");
                  router.push("/dashboard/reparations");
                }}
              >
                <CalendarPlus className="size-4" />
                {selectedRepair ? "Réparation déjà créée" : "Créer la fiche réparation"}
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
            const createdCustomer = store.customers.find((entry) => entry.id === form.customerId);
            if (!createdCustomer) {
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
              customerId: createdCustomer.id,
              device: form.device,
              issue: form.issue,
              date,
              time: form.time,
              duration: form.duration,
              status: form.status,
              notes: form.notes,
              confirmed: form.status === "venu",
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
              form.status === "annulé" &&
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
              issue: form.issue,
              status: form.status,
              notes: form.notes,
              confirmed: form.status === "venu",
              source: form.source,
              technician: form.technician,
              dayIndex: dateToDayIndex(date, buildWeekDays(weekOffset)),
              row: timeToCalendarRow(form.time),
            });
            setReportingId(null);
            toast.success("Rendez-vous modifié.");
          }}
          store={store}
          title="Reporter le rendez-vous"
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
              <DetailRow label="Appareil" value={selectedRepair?.device ?? selected.device} />
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
                onClick={() => {
                  const repairId = selectedRepair?.id ?? store.createRepairFromAppointment(selected.id);
                  if (!repairId) {
                    toast.error("Impossible de créer une réparation sans client lié");
                    return;
                  }
                  store.setSelected("repair", repairId);
                  router.push("/dashboard/reparations");
                }}
              >
                Ouvrir la réparation
              </PrimaryButton>
            </div>
          </Panel>
        </div>
      )}

      <section className="hidden md:grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
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
          <label className="grid gap-2 text-[#1A1916] text-sm">
            Client
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
          </label>
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
                onChange={(event) => onChange({ ...form, status: event.target.value })}
                value={form.status}
              >
                <option>prévu</option>
                <option>venu</option>
                <option>absent</option>
                <option>annulé</option>
                <option>terminé</option>
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
                    return (
                      <button
                        className={cn(
                          "absolute inset-x-2 top-2 z-10 rounded-[10px] border p-2 text-left text-[#1A1916] text-xs transition hover:border-[#2A9D8F]/50",
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
                        <p className="truncate text-[#1A1916]/80 leading-tight">{appointment.device}</p>
                        <p className="truncate text-[#6B6B6B] leading-tight">{appointment.issue}</p>
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
  customerId: string;
  date: string;
  time: string;
  duration: string;
  device: string;
  issue: string;
  status: string;
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
