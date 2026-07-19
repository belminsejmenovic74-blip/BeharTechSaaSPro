"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import {
  CalendarPlus,
  CheckCircle2,
  Clock3,
  FileText,
  FolderPlus,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Panel, PrimaryButton } from "@/components/behar/primitives";
import { useBeharStore } from "@/lib/behar-store";
import {
  defaultLeadSms,
  leadCustomerName,
  leadDeviceLabel,
  leadEmailHref,
  leadHistoryLabel,
  leadPhoneHref,
  leadTagLabel,
  LEAD_STATUS_LABELS,
  LEAD_TYPE_LABELS,
  type DashboardWidgetLead,
  type WidgetLeadDashboardData,
  type WidgetLeadStatus,
  widgetLeadDashboardRequest,
} from "@/lib/widget/dashboard-leads";
import {
  findExistingCustomerId,
  leadToAppointmentInput,
  leadToCustomerInput,
  leadToQuoteInput,
  leadToRepairInput,
} from "@/lib/widget/lead-conversion";
import { cn } from "@/lib/utils";

const ACTIVE_STATUSES: WidgetLeadStatus[] = ["new", "to_contact", "contacted", "in_progress", "waiting_customer"];
const ALL_STATUSES = Object.keys(LEAD_STATUS_LABELS) as WidgetLeadStatus[];
const PAGE_SIZE = 20;
type LeadSort = "recent" | "oldest" | "name";

function isoDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function leadServiceDetails(lead: DashboardWidgetLead) {
  const mode = typeof lead.submission_payload?.serviceMode === "string" ? lead.submission_payload.serviceMode : "";
  const rawAddress = lead.submission_payload?.serviceAddress;
  const address = rawAddress && typeof rawAddress === "object" ? (rawAddress as Record<string, unknown>) : null;
  return {
    isHomeService: mode === "home_service",
    modeLabel:
      mode === "home_service"
        ? "Déplacement à domicile"
        : mode === "walk_in"
          ? "Sans rendez-vous"
          : mode === "appointment"
            ? "Rendez-vous"
            : "Demande à distance",
    address: address
      ? [address.address, address.postalCode, address.city]
          .filter((value) => typeof value === "string" && value.trim())
          .join(", ")
      : "",
  };
}

function formatDisplayedPrice(lead: DashboardWidgetLead, fallbackCurrency: "EUR" | "CHF") {
  if (lead.displayed_price == null) return "Non affiché";
  const snapshotCurrency = lead.displayed_price_snapshot?.currency;
  const currency = snapshotCurrency === "CHF" || snapshotCurrency === "EUR" ? snapshotCurrency : fallbackCurrency;
  return new Intl.NumberFormat(currency === "CHF" ? "fr-CH" : "fr-FR", {
    style: "currency",
    currency,
    currencyDisplay: currency === "CHF" ? "code" : "symbol",
  }).format(lead.displayed_price);
}

export function WidgetLeadsWorkspace() {
  const router = useRouter();
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
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<WidgetLeadStatus | "all">("all");
  const [type, setType] = useState<DashboardWidgetLead["lead_type"] | "all">("all");
  const [assignee, setAssignee] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [appointmentLead, setAppointmentLead] = useState<DashboardWidgetLead | null>(null);
  const [appointmentDate, setAppointmentDate] = useState(tomorrow());
  const [appointmentTime, setAppointmentTime] = useState("09:00");
  const [sort, setSort] = useState<LeadSort>("recent");
  const [page, setPage] = useState(1);
  const [note, setNote] = useState("");

  const authBody = useMemo(() => ({ workshopId, licenseKey }), [workshopId, licenseKey]);

  const load = useCallback(async () => {
    if (!(workshopId && licenseKey)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await widgetLeadDashboardRequest<WidgetLeadDashboardData>({
        ...authBody,
        operation: "list",
      });
      setData(result);
      setSelectedId((current) =>
        result.leads.some((lead) => lead.id === current) ? current : result.leads[0]?.id || "",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [authBody, workshopId, licenseKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return data.leads.filter((lead) => {
      if (status !== "all" && lead.status !== status) return false;
      if (type !== "all" && lead.lead_type !== type) return false;
      if (assignee === "unassigned" && lead.assigned_to) return false;
      if (assignee !== "all" && assignee !== "unassigned" && lead.assigned_to !== assignee) return false;
      if (!needle) return true;
      return `${leadCustomerName(lead)} ${lead.phone || ""} ${lead.email || ""} ${leadDeviceLabel(lead)} ${lead.issue}`
        .toLowerCase()
        .includes(needle);
    });
  }, [data.leads, search, status, type, assignee]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sort === "name") copy.sort((a, b) => leadCustomerName(a).localeCompare(leadCustomerName(b), "fr"));
    else copy.sort((a, b) => (sort === "oldest" ? 1 : -1) * b.created_at.localeCompare(a.created_at));
    return copy;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Revenir à la première page quand la recherche, les filtres ou le tri changent.
  // biome-ignore lint/correctness/useExhaustiveDependencies: réinitialisation volontaire
  useEffect(() => setPage(1), [search, status, type, assignee, sort]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: efface la note à chaque changement de demande
  useEffect(() => setNote(""), [selectedId]);

  const assigneeName = useCallback(
    (id: string | null) => (id ? data.assignees.find((member) => member.id === id)?.name || "—" : "Non assignée"),
    [data.assignees],
  );

  const selected = data.leads.find((lead) => lead.id === selectedId) || sorted[0];
  const selectedHistory = selected ? data.history.filter((entry) => entry.lead_id === selected.id) : [];

  async function updateLead(
    lead: DashboardWidgetLead,
    patch: {
      status?: WidgetLeadStatus;
      assignedTo?: string | null;
      conversionReference?: string | null;
      note?: string;
    },
  ) {
    await widgetLeadDashboardRequest({
      ...authBody,
      operation: "update",
      leadId: lead.id,
      actorId: actor.id,
      actorName: actor.name,
      ...patch,
    });
    await load();
  }

  async function recordActivity(
    lead: DashboardWidgetLead,
    action: "called" | "sms_sent" | "email_opened" | "quote_created" | "appointment_proposed" | "repair_created",
    note: string,
    metadata?: Record<string, string | number | boolean | null>,
  ) {
    await widgetLeadDashboardRequest({
      ...authBody,
      operation: "activity",
      leadId: lead.id,
      action,
      actorId: actor.id,
      actorName: actor.name,
      note,
      metadata,
    });
  }

  function ensureCustomer(lead: DashboardWidgetLead) {
    return findExistingCustomerId(store.customers, lead) ?? store.addCustomer(leadToCustomerInput(lead));
  }

  async function sendSms(lead: DashboardWidgetLead) {
    const number = lead.phone_normalized || lead.phone;
    if (!number) return toast.error("Aucun numéro disponible.");
    const message = defaultLeadSms(lead, store.workshopSettings.name || store.workshopInfo.name);
    const response = await fetch("/api/send-sms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ number, message, licenseKey }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) return toast.error(result.error || "SMS non envoyé.");
    const customerId = ensureCustomer(lead);
    if (customerId) store.sendMessage({ customerId, channel: "SMS", subject: "Demande du site", body: message });
    await recordActivity(lead, "sms_sent", "SMS envoyé au client");
    await load();
    toast.success("SMS envoyé.");
  }

  async function openEmail(lead: DashboardWidgetLead) {
    const href = leadEmailHref(lead);
    if (!href) return toast.error("Aucune adresse e-mail disponible.");
    const customerId = ensureCustomer(lead);
    if (customerId) {
      store.sendMessage({
        customerId,
        channel: "Email",
        subject: `Votre demande ${lead.model}`,
        body: `Nous revenons vers vous concernant : ${lead.issue}.`,
      });
    }
    await recordActivity(lead, "email_opened", "E-mail préparé pour le client");
    window.location.href = href;
  }

  async function createQuote(lead: DashboardWidgetLead) {
    const customerId = ensureCustomer(lead);
    if (!customerId) return toast.error("Création du client impossible.");
    const quoteId = store.addQuote(leadToQuoteInput(lead, customerId));
    if (!quoteId) return toast.error("Création du devis impossible.");
    await recordActivity(lead, "quote_created", "Devis brouillon créé", { quoteId });
    await updateLead(lead, { status: "converted_quote", conversionReference: quoteId });
    store.setSelected("quote", quoteId);
    toast.success("Devis brouillon créé.");
    router.push("/dashboard/devis");
  }

  async function createRepair(lead: DashboardWidgetLead) {
    const customerId = ensureCustomer(lead);
    if (!customerId) return toast.error("Création du client impossible.");
    const repairId = store.addRepair(leadToRepairInput(lead, customerId));
    if (!repairId) return toast.error("Création du dossier impossible.");
    await recordActivity(lead, "repair_created", "Dossier atelier créé", { repairId });
    await updateLead(lead, { status: "converted_repair", conversionReference: repairId });
    store.setSelected("repair", repairId);
    toast.success("Dossier créé.");
    router.push("/dashboard/reparations");
  }

  async function createAppointment() {
    const lead = appointmentLead;
    if (!lead) return;
    const customerId = ensureCustomer(lead);
    if (!customerId) return toast.error("Création du client impossible.");
    const appointmentId = store.addAppointment(
      leadToAppointmentInput(lead, customerId, { date: appointmentDate, time: appointmentTime }),
    );
    if (!appointmentId) return toast.error("Création du rendez-vous impossible.");
    await recordActivity(lead, "appointment_proposed", "Rendez-vous proposé", {
      appointmentId,
      date: appointmentDate,
      time: appointmentTime,
    });
    await updateLead(lead, { status: "converted_appointment", conversionReference: appointmentId });
    setAppointmentLead(null);
    toast.success("Rendez-vous ajouté.");
  }

  async function addInternalNote(lead: DashboardWidgetLead) {
    const text = note.trim();
    if (!text) return;
    await updateLead(lead, { note: text });
    setNote("");
    toast.success("Note interne ajoutée.");
  }

  if (!(workshopId && licenseKey)) {
    return (
      <Panel className="p-8 text-center text-[#667085]">
        Activez la synchronisation atelier pour relever les demandes du site.
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Nouvelles" value={data.leads.filter((lead) => lead.status === "new").length} />
        <Stat label="À traiter" value={data.leads.filter((lead) => ACTIVE_STATUSES.includes(lead.status)).length} />
        <Stat label="Converties" value={data.leads.filter((lead) => lead.status.startsWith("converted_")).length} />
        <Stat label="Notifications" value={data.notifications.length} />
      </div>

      <Panel className="p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(200px,1fr)_160px_150px_160px_150px_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#98A2B3]" />
            <input
              className="h-11 w-full rounded-xl border border-[#E4E7EC] pl-10 pr-3 text-sm outline-none focus:border-[#2A9D8F]"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Client, téléphone, appareil…"
            />
          </label>
          <FilterSelect value={status} onChange={(value) => setStatus(value as WidgetLeadStatus | "all")}>
            <option value="all">Tous les statuts</option>
            {ALL_STATUSES.map((entry) => (
              <option key={entry} value={entry}>
                {LEAD_STATUS_LABELS[entry]}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect value={type} onChange={(value) => setType(value as DashboardWidgetLead["lead_type"] | "all")}>
            <option value="all">Tous les types</option>
            {Object.entries(LEAD_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect value={assignee} onChange={setAssignee}>
            <option value="all">Tous les responsables</option>
            <option value="unassigned">Non assignées</option>
            {data.assignees.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect value={sort} onChange={(value) => setSort(value as LeadSort)}>
            <option value="recent">Plus récentes</option>
            <option value="oldest">Plus anciennes</option>
            <option value="name">Nom client</option>
          </FilterSelect>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#E4E7EC] px-4 text-sm font-semibold"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Actualiser
          </button>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <Panel className="overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-sm text-[#667085]">Chargement…</div>
          ) : sorted.length === 0 ? (
            <div className="p-12 text-center text-sm text-[#667085]">Aucune demande.</div>
          ) : (
            <>
              <div className="divide-y divide-[#E4E7EC]">
                {paged.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => setSelectedId(lead.id)}
                    className={cn(
                      "grid w-full gap-3 p-4 text-left transition md:grid-cols-[1.1fr_1fr_1.2fr_150px] md:items-center",
                      selected?.id === lead.id ? "bg-[#F1FAF8]" : "hover:bg-[#F9FAFB]",
                    )}
                  >
                    <div>
                      <p className="font-semibold text-sm text-[#101828]">{leadCustomerName(lead)}</p>
                      <p className="mt-1 text-xs text-[#667085]">{lead.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{leadDeviceLabel(lead)}</p>
                      <p className="mt-1 text-xs text-[#667085]">{lead.issue}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{LEAD_TYPE_LABELS[lead.lead_type]}</Badge>
                      <StatusBadge status={lead.status} />
                      {lead.photos.length ? (
                        <Badge>
                          {lead.photos.length} photo{lead.photos.length > 1 ? "s" : ""}
                        </Badge>
                      ) : null}
                      {leadServiceDetails(lead).isHomeService ? (
                        <Badge>
                          <MapPin className="mr-1 inline size-3" /> Déplacement
                        </Badge>
                      ) : null}
                    </div>
                    <div className="md:text-right">
                      <p className="text-xs text-[#667085]">{isoDate(lead.created_at)}</p>
                      <p className="mt-1 truncate text-[11px] text-[#98A2B3]">{assigneeName(lead.assigned_to)}</p>
                    </div>
                  </button>
                ))}
              </div>
              {totalPages > 1 ? (
                <div className="flex items-center justify-between gap-3 border-t border-[#E4E7EC] px-4 py-3 text-sm">
                  <span className="text-[#667085] text-xs">
                    {sorted.length} demande{sorted.length > 1 ? "s" : ""} · page {currentPage}/{totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                      className="rounded-lg border border-[#E4E7EC] px-3 py-1.5 font-medium text-xs disabled:opacity-40"
                    >
                      Précédent
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                      className="rounded-lg border border-[#E4E7EC] px-3 py-1.5 font-medium text-xs disabled:opacity-40"
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              ) : null}
            </>
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
              <StatusBadge status={selected.status} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              {(() => {
                const service = leadServiceDetails(selected);
                return (
                  <>
                    <Info label="Prise en charge" value={service.modeLabel} />
                    {service.isHomeService ? (
                      <Info label="Adresse d’intervention" value={service.address || "—"} />
                    ) : null}
                  </>
                );
              })()}
              <Info label="Téléphone" value={selected.phone || "—"} />
              <Info label="E-mail" value={selected.email || "—"} />
              <Info label="Modèle" value={leadDeviceLabel(selected)} />
              <Info label="Prestation" value={selected.service_label || "—"} />
              <Info
                label="Prix affiché"
                value={formatDisplayedPrice(selected, store.workshopSettings.country === "CH" ? "CHF" : "EUR")}
              />
              <Info label="Disponibilité affichée" value={selected.displayed_stock || "À confirmer"} />
              <Info
                label="Durée affichée"
                value={selected.displayed_duration_minutes ? `${selected.displayed_duration_minutes} min` : "—"}
              />
              <Info label="Garantie" value={selected.displayed_warranty || "—"} />
              <Info label="Qualité" value={selected.quality_label || "—"} />
              <Info label="Photos" value={selected.photos.length ? String(selected.photos.length) : "Aucune"} />
              <Info label="Origine" value={selected.source_url || "Site internet"} />
            </div>

            {(selected.issue_description || selected.comment) && (
              <div className="mt-4 rounded-xl bg-[#F9FAFB] p-3 text-sm leading-relaxed">
                <p className="font-semibold">Précisions</p>
                <p className="mt-1 text-[#667085]">
                  {[selected.issue_description, selected.comment].filter(Boolean).join(" — ")}
                </p>
              </div>
            )}

            {selected.tags?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {selected.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[#EBD9B4] bg-[#FBF6EA] px-2.5 py-1 text-[11px] font-semibold text-[#8A6D1B]"
                  >
                    {leadTagLabel(tag)}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <a
                href={leadPhoneHref(selected)}
                data-lead-action="call"
                onClick={() => void recordActivity(selected, "called", "Appel lancé").then(load)}
                className="action-button"
              >
                <Phone className="size-4" />
                Appeler
              </a>
              <button
                data-lead-action="sms"
                type="button"
                onClick={() => void sendSms(selected)}
                className="action-button"
              >
                <MessageSquare className="size-4" />
                Envoyer un SMS
              </button>
              <button
                data-lead-action="email"
                type="button"
                onClick={() => void openEmail(selected)}
                className="action-button"
              >
                <Mail className="size-4" />
                Envoyer un email
              </button>
              <button
                data-lead-action="quote"
                type="button"
                onClick={() => void createQuote(selected)}
                className="action-button"
              >
                <FileText className="size-4" />
                Créer un devis
              </button>
              <button
                data-lead-action="appointment"
                type="button"
                onClick={() => {
                  setAppointmentDate(tomorrow());
                  setAppointmentTime("09:00");
                  setAppointmentLead(selected);
                }}
                className="action-button"
              >
                <CalendarPlus className="size-4" />
                Proposer un rendez-vous
              </button>
              <button
                data-lead-action="repair"
                type="button"
                onClick={() => void createRepair(selected)}
                className="action-button"
              >
                <FolderPlus className="size-4" />
                Convertir en dossier
              </button>
              <button
                data-lead-action="close"
                type="button"
                onClick={() => void updateLead(selected, { status: "closed", note: "Demande clôturée" })}
                className="action-button"
              >
                <CheckCircle2 className="size-4" />
                Clôturer
              </button>
              <button
                data-lead-action="spam"
                type="button"
                onClick={() =>
                  void updateLead(selected, { status: "spam", note: "Demande signalée comme indésirable" })
                }
                className="action-button text-[#B42318]"
              >
                <ShieldAlert className="size-4" />
                Indésirable
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="text-xs font-semibold text-[#667085]">
                <span>Statut</span>
                <FilterSelect
                  value={selected.status}
                  onChange={(value) => void updateLead(selected, { status: value as WidgetLeadStatus })}
                >
                  {ALL_STATUSES.map((entry) => (
                    <option key={entry} value={entry}>
                      {LEAD_STATUS_LABELS[entry]}
                    </option>
                  ))}
                </FilterSelect>
              </div>
              <div className="text-xs font-semibold text-[#667085]">
                <span>Responsable</span>
                <FilterSelect
                  value={selected.assigned_to || ""}
                  onChange={(value) => void updateLead(selected, { assignedTo: value || null })}
                >
                  <option value="">Non assignée</option>
                  {data.assignees.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </FilterSelect>
              </div>
            </div>

            <div className="mt-5">
              <span className="text-xs font-semibold text-[#667085]">Note interne</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                placeholder="Ajouter une note visible par l'équipe…"
                className="mt-1 w-full rounded-xl border border-[#E4E7EC] p-3 text-sm outline-none focus:border-[#2A9D8F]"
              />
              <button
                type="button"
                disabled={!note.trim()}
                onClick={() => void addInternalNote(selected)}
                className="mt-2 rounded-xl border border-[#E4E7EC] px-3 py-2 text-xs font-semibold disabled:opacity-40"
              >
                Ajouter la note
              </button>
            </div>

            <div className="mt-6 border-t border-[#E4E7EC] pt-5">
              <h3 className="flex items-center gap-2 font-semibold text-sm">
                <Clock3 className="size-4" />
                Historique
              </h3>
              <div className="mt-3 max-h-64 space-y-3 overflow-y-auto">
                {selectedHistory.length ? (
                  selectedHistory.map((entry) => (
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

      {appointmentLead ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
          <Panel className="w-full max-w-md p-5">
            <h2 className="font-semibold text-xl">Proposer un rendez-vous</h2>
            <p className="mt-1 text-sm text-[#667085]">
              {leadCustomerName(appointmentLead)} · {leadDeviceLabel(appointmentLead)}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <label className="text-sm font-medium">
                Date
                <input
                  type="date"
                  value={appointmentDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setAppointmentDate(event.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-[#E4E7EC] px-3"
                />
              </label>
              <label className="text-sm font-medium">
                Heure
                <input
                  type="time"
                  value={appointmentTime}
                  onChange={(event) => setAppointmentTime(event.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-[#E4E7EC] px-3"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="h-11 rounded-xl border border-[#E4E7EC] px-4 font-semibold text-sm"
                onClick={() => setAppointmentLead(null)}
              >
                Annuler
              </button>
              <PrimaryButton onClick={() => void createAppointment()}>
                <CalendarPlus className="size-4" />
                Créer le rendez-vous
              </PrimaryButton>
            </div>
          </Panel>
        </div>
      ) : null}

      <style
        jsx
        global
      >{`.action-button{display:inline-flex;min-height:42px;align-items:center;justify-content:center;gap:.5rem;border:1px solid #e4e7ec;border-radius:.75rem;background:#fff;padding:.6rem .75rem;font-size:.78rem;font-weight:650;transition:.15s}.action-button:hover{border-color:rgba(42,157,143,.45);background:#f7fcfb}`}</style>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Panel className="p-4">
      <p className="text-xs font-medium text-[#667085]">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </Panel>
  );
}
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#F1F1EE] px-2.5 py-1 text-[11px] font-semibold text-[#555]">{children}</span>
  );
}
function StatusBadge({ status }: { status: WidgetLeadStatus }) {
  const hot = status === "new" || status === "to_contact";
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
        hot
          ? "bg-[#FFF2D8] text-[#8A5A00]"
          : status === "spam"
            ? "bg-[#FDE8E6] text-[#B42318]"
            : "bg-[#EAF7F4] text-[#167B70]",
      )}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#98A2B3]">{label}</p>
      <p className="mt-1 truncate text-sm font-medium" title={value}>
        {value}
      </p>
    </div>
  );
}
function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      className="h-11 w-full rounded-xl border border-[#E4E7EC] bg-white px-3 text-sm outline-none focus:border-[#2A9D8F]"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </select>
  );
}
