"use client";

// Mode Comptoir — « Rechercher une demande ».
// Recherche intelligente (téléphone / nom / email / n° de demande) sur les
// demandes du site, aperçu complet + timeline, puis « Transformer en prise en
// charge » ou « Créer un rendez-vous » — toutes les informations déjà saisies
// par le client sont reprises sans ressaisie.

import { useCallback, useEffect, useMemo, useState } from "react";

import { ArrowLeft, CalendarPlus, Clock3, FolderPlus, Mail, Phone, Search } from "lucide-react";
import { toast } from "sonner";

import { Panel, PrimaryButton } from "@/components/behar/primitives";
import { useBeharStore } from "@/lib/behar-store";
import { cn } from "@/lib/utils";
import {
  LEAD_STATUS_LABELS,
  LEAD_TYPE_LABELS,
  leadCustomerName,
  leadDeviceLabel,
  leadHistoryLabel,
  leadPhoneHref,
  type DashboardWidgetLead,
  type WidgetLeadDashboardData,
  type WidgetLeadStatus,
  widgetLeadDashboardRequest,
} from "@/lib/widget/dashboard-leads";
import {
  findExistingCustomerId,
  leadToAppointmentInput,
  leadToCustomerInput,
  leadToRepairInput,
  matchesLeadSearch,
} from "@/lib/widget/lead-conversion";

function isoDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function CounterLeadSearch({
  onClose,
  onOpenRepairDetail,
}: {
  onClose: () => void;
  onOpenRepairDetail: (repairId: string) => void;
}) {
  const store = useBeharStore();
  const workshopId = store.cloudSync?.workshopId || "";
  const licenseKey = store.licenseKey || "";
  const actor = store.currentUser;

  const [data, setData] = useState<WidgetLeadDashboardData>({
    leads: [],
    history: [],
    assignees: [],
    notifications: [],
  });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [rdvOpen, setRdvOpen] = useState(false);
  const [rdvDate, setRdvDate] = useState(tomorrow());
  const [rdvTime, setRdvTime] = useState("09:00");
  const [rdvTechnician, setRdvTechnician] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!(workshopId && licenseKey)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await widgetLeadDashboardRequest<WidgetLeadDashboardData>({
        workshopId,
        licenseKey,
        operation: "list",
      });
      setData(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [workshopId, licenseKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const results = useMemo(() => {
    const needle = query.trim();
    if (!needle) return data.leads.slice(0, 20);
    return data.leads.filter((lead) => matchesLeadSearch(lead, needle));
  }, [data.leads, query]);

  const selected = data.leads.find((lead) => lead.id === selectedId) || results[0];
  const history = selected ? data.history.filter((entry) => entry.lead_id === selected.id) : [];

  const ensureCustomer = (lead: DashboardWidgetLead) =>
    findExistingCustomerId(store.customers, lead) ?? store.addCustomer(leadToCustomerInput(lead));

  const recordActivity = (lead: DashboardWidgetLead, action: string, note: string, metadata?: Record<string, string>) =>
    widgetLeadDashboardRequest({
      workshopId,
      licenseKey,
      operation: "activity",
      leadId: lead.id,
      action,
      actorId: actor.id,
      actorName: actor.name,
      note,
      metadata,
    });

  const updateStatus = (lead: DashboardWidgetLead, status: WidgetLeadStatus, conversionReference: string) =>
    widgetLeadDashboardRequest({
      workshopId,
      licenseKey,
      operation: "update",
      leadId: lead.id,
      status,
      conversionReference,
      actorId: actor.id,
      actorName: actor.name,
    });

  async function transform(lead: DashboardWidgetLead) {
    if (busy) return;
    setBusy(true);
    try {
      const customerId = ensureCustomer(lead);
      if (!customerId) return toast.error("Création du client impossible.");
      const repairId = store.addRepair(leadToRepairInput(lead, customerId));
      if (!repairId) return toast.error("Création du dossier impossible.");
      await recordActivity(lead, "repair_created", "Prise en charge créée au comptoir", { repairId });
      await updateStatus(lead, "converted_repair", repairId);
      store.setSelected("repair", repairId);
      await load();
      toast.success("Prise en charge créée — aucune ressaisie.");
      onOpenRepairDetail(repairId);
    } finally {
      setBusy(false);
    }
  }

  async function createAppointment(lead: DashboardWidgetLead) {
    if (busy) return;
    setBusy(true);
    try {
      const customerId = ensureCustomer(lead);
      if (!customerId) return toast.error("Création du client impossible.");
      const technician = data.assignees.find((member) => member.id === rdvTechnician)?.name;
      const appointmentId = store.addAppointment(
        leadToAppointmentInput(lead, customerId, { date: rdvDate, time: rdvTime, technician }),
      );
      if (!appointmentId) return toast.error("Création du rendez-vous impossible.");
      await recordActivity(lead, "appointment_proposed", "Rendez-vous créé au comptoir", {
        appointmentId,
        date: rdvDate,
        time: rdvTime,
      });
      await updateStatus(lead, "converted_appointment", appointmentId);
      setRdvOpen(false);
      await load();
      toast.success("Rendez-vous créé.");
    } finally {
      setBusy(false);
    }
  }

  if (!(workshopId && licenseKey)) {
    return (
      <Panel className="p-8 text-center text-[#667085]">
        Activez la synchronisation atelier pour rechercher les demandes du site.
      </Panel>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="grid size-10 place-items-center rounded-[12px] border border-[#E4E7EC] bg-white"
          aria-label="Retour"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h1 className="font-black text-[24px] tracking-tight">Rechercher une demande</h1>
          <p className="text-[#667085] text-sm">Téléphone, nom, e-mail ou numéro de demande.</p>
        </div>
      </div>

      <Panel className="p-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-[#98A2B3]" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex : 0612345678, Sarah, sarah@mail.fr…"
            className="h-12 w-full rounded-xl border border-[#E4E7EC] pr-3 pl-11 text-[15px] outline-none focus:border-[#2A9D8F]"
          />
        </label>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
        <Panel className="overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-sm text-[#667085]">Chargement…</div>
          ) : results.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#667085]">
              {query ? "Aucune demande trouvée." : "Aucune demande pour le moment."}
            </div>
          ) : (
            <div className="divide-y divide-[#E4E7EC]">
              {results.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => setSelectedId(lead.id)}
                  className={cn(
                    "grid w-full grid-cols-[1fr_auto] items-center gap-3 p-4 text-left transition",
                    selected?.id === lead.id ? "bg-[#F1FAF8]" : "hover:bg-[#F9FAFB]",
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{leadCustomerName(lead)}</p>
                    <p className="text-xs text-[#667085]">
                      {lead.phone || lead.email || "—"} · {leadDeviceLabel(lead)}
                    </p>
                    <p className="truncate text-xs text-[#667085]">{lead.issue}</p>
                  </div>
                  <span className="rounded-full bg-[#EAF7F4] px-2.5 py-1 font-semibold text-[#167B70] text-[11px]">
                    {LEAD_STATUS_LABELS[lead.status]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Panel>

        {selected ? (
          <Panel className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-xl">{leadCustomerName(selected)}</h2>
                <p className="mt-1 text-sm text-[#667085]">
                  {leadDeviceLabel(selected)} · {selected.issue}
                </p>
              </div>
              <span className="rounded-full bg-[#F1F1EE] px-2.5 py-1 font-semibold text-[#555] text-[11px]">
                {LEAD_TYPE_LABELS[selected.lead_type]}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Info label="Téléphone" value={selected.phone || "—"} />
              <Info label="E-mail" value={selected.email || "—"} />
              <Info label="Modèle" value={leadDeviceLabel(selected)} />
              <Info label="Prestation" value={selected.service_label || "—"} />
              <Info
                label="Prix consulté"
                value={selected.displayed_price != null ? `${selected.displayed_price} €` : "Non affiché"}
              />
              <Info label="Disponibilité" value={selected.displayed_stock || "À confirmer"} />
              <Info
                label="Durée"
                value={selected.displayed_duration_minutes ? `${selected.displayed_duration_minutes} min` : "—"}
              />
              <Info label="Garantie" value={selected.displayed_warranty || "—"} />
              <Info label="Qualité" value={selected.quality_label || "—"} />
              <Info label="Photos" value={selected.photos.length ? String(selected.photos.length) : "Aucune"} />
            </div>

            {(selected.issue_description || selected.comment) && (
              <div className="mt-4 rounded-xl bg-[#F9FAFB] p-3 text-sm leading-relaxed">
                {[selected.issue_description, selected.comment].filter(Boolean).join(" — ")}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <a
                href={leadPhoneHref(selected)}
                onClick={() => void recordActivity(selected, "called", "Appel lancé depuis le comptoir").then(load)}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#E4E7EC] bg-white px-3 font-semibold text-sm"
              >
                <Phone className="size-4" /> Appeler
              </a>
              {selected.email ? (
                <a
                  href={`mailto:${selected.email}`}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#E4E7EC] bg-white px-3 font-semibold text-sm"
                >
                  <Mail className="size-4" /> E-mail
                </a>
              ) : null}
            </div>

            <div className="mt-3 grid gap-2">
              <PrimaryButton className="h-12 w-full" disabled={busy} onClick={() => void transform(selected)}>
                <FolderPlus className="size-4" /> Transformer en prise en charge
              </PrimaryButton>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setRdvDate(tomorrow());
                  setRdvTime("09:00");
                  setRdvOpen(true);
                }}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#E4E7EC] bg-white font-semibold text-sm disabled:opacity-50"
              >
                <CalendarPlus className="size-4" /> Créer un rendez-vous
              </button>
            </div>

            <div className="mt-5 border-t border-[#E4E7EC] pt-4">
              <h3 className="flex items-center gap-2 font-semibold text-sm">
                <Clock3 className="size-4" /> Timeline
              </h3>
              <div className="mt-3 max-h-56 space-y-3 overflow-y-auto">
                {history.length ? (
                  history.map((entry) => (
                    <div key={entry.id} className="border-l-2 border-[#D7EFEA] pl-3">
                      <p className="text-sm font-medium">{leadHistoryLabel(entry.action, entry.to_status)}</p>
                      <p className="text-xs text-[#667085]">
                        {entry.note || entry.actor_name} · {isoDate(entry.created_at)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#667085]">Aucun événement.</p>
                )}
              </div>
            </div>
          </Panel>
        ) : null}
      </div>

      {rdvOpen && selected ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
          <Panel className="w-full max-w-md p-5">
            <h2 className="font-semibold text-xl">Créer un rendez-vous</h2>
            <p className="mt-1 text-sm text-[#667085]">
              {leadCustomerName(selected)} · {leadDeviceLabel(selected)}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <label className="text-sm font-medium">
                Date
                <input
                  type="date"
                  value={rdvDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setRdvDate(event.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-[#E4E7EC] px-3"
                />
              </label>
              <label className="text-sm font-medium">
                Heure
                <input
                  type="time"
                  value={rdvTime}
                  onChange={(event) => setRdvTime(event.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-[#E4E7EC] px-3"
                />
              </label>
            </div>
            <label className="mt-3 block text-sm font-medium">
              Technicien
              <select
                value={rdvTechnician}
                onChange={(event) => setRdvTechnician(event.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-[#E4E7EC] bg-white px-3"
              >
                <option value="">À assigner</option>
                {data.assignees.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="h-11 rounded-xl border border-[#E4E7EC] px-4 font-semibold text-sm"
                onClick={() => setRdvOpen(false)}
              >
                Annuler
              </button>
              <PrimaryButton disabled={busy} onClick={() => void createAppointment(selected)}>
                <CalendarPlus className="size-4" /> Créer le rendez-vous
              </PrimaryButton>
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="font-bold text-[10px] text-[#98A2B3] uppercase tracking-wide">{label}</p>
      <p className="mt-1 truncate font-medium text-sm" title={value}>
        {value}
      </p>
    </div>
  );
}
