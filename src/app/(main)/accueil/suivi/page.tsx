"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Mail, MessageSquareText, Search, Wrench } from "lucide-react";

import { PageHeader, PortalCard, PortalPage, StatusPill } from "@/components/behar/accueil-ui";
import { useBeharStore } from "@/lib/behar-store";

type Kind = "all" | "repairs" | "appointments" | "messages";

export default function PortalTrackingPage() {
  const repairs = useBeharStore((state) => state.repairs);
  const appointments = useBeharStore((state) => state.appointments);
  const messages = useBeharStore((state) => state.messageLogs);
  const customers = useBeharStore((state) => state.customers);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [status, setStatus] = useState("all");

  const customerName = (id: string) => customers.find((customer) => customer.id === id)?.name || "Client";
  const normalized = query.trim().toLocaleLowerCase("fr");
  const repairRows = useMemo(
    () =>
      repairs.filter((repair) => {
        if (status !== "all" && repair.status !== status) return false;
        return (
          !normalized ||
          `${repair.number} ${repair.device} ${repair.issue} ${customerName(repair.customerId)}`
            .toLocaleLowerCase("fr")
            .includes(normalized)
        );
      }),
    [repairs, status, normalized, customers],
  );
  const appointmentRows = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          !normalized ||
          `${appointment.appointmentNumber || ""} ${appointment.clientName || customerName(appointment.customerId)} ${appointment.device} ${appointment.issue}`
            .toLocaleLowerCase("fr")
            .includes(normalized),
      ),
    [appointments, normalized, customers],
  );
  const messageRows = useMemo(
    () =>
      messages.filter(
        (message) =>
          !normalized ||
          `${message.subject} ${message.body} ${customerName(message.customerId)}`
            .toLocaleLowerCase("fr")
            .includes(normalized),
      ),
    [messages, normalized, customers],
  );

  const statuses = Array.from(new Set(repairs.map((repair) => repair.status)));
  return (
    <PortalPage>
      <PageHeader title="Mon suivi" subtitle="Les memes dossiers, rendez-vous et envois que dans le SaaS." />
      <PortalCard>
        <div className="grid gap-3 md:grid-cols-[1fr_190px_190px]">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-[#E8E8E5] bg-white px-3">
            <Search className="size-4 text-[#8A8A8A]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              placeholder="Client, telephone, reference, dossier…"
            />
          </label>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as Kind)}
            className="h-11 rounded-xl border border-[#E8E8E5] bg-white px-3 text-sm"
          >
            <option value="all">Tous les types</option>
            <option value="repairs">Reparations</option>
            <option value="appointments">Rendez-vous</option>
            <option value="messages">SMS et e-mails</option>
          </select>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-11 rounded-xl border border-[#E8E8E5] bg-white px-3 text-sm"
            disabled={kind !== "all" && kind !== "repairs"}
          >
            <option value="all">Tous les statuts</option>
            {statuses.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
      </PortalCard>

      <div className="mt-4 space-y-4">
        {(kind === "all" || kind === "repairs") && (
          <TrackingSection title="Reparations" icon={Wrench} empty="Aucune reparation ne correspond aux filtres.">
            {repairRows.slice(0, 30).map((repair) => (
              <Link
                key={repair.id}
                href="/dashboard/reparations"
                className="flex items-center gap-3 border-[#F0F0EE] border-t py-3 first:border-0"
              >
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">
                    {repair.number} · {customerName(repair.customerId)}
                  </strong>
                  <small className="block truncate text-[#6B6B6B]">
                    {repair.device} · {repair.issue}
                  </small>
                </span>
                <StatusPill tone={repair.status === "Prêt" ? "ok" : "warn"}>{repair.status}</StatusPill>
              </Link>
            ))}
          </TrackingSection>
        )}
        {(kind === "all" || kind === "appointments") && (
          <TrackingSection title="Rendez-vous" icon={CalendarDays} empty="Aucun rendez-vous ne correspond aux filtres.">
            {appointmentRows.slice(0, 20).map((appointment) => (
              <Link
                key={appointment.id}
                href="/dashboard/rendez-vous"
                className="flex items-center gap-3 border-[#F0F0EE] border-t py-3 first:border-0"
              >
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">
                    {appointment.clientName || customerName(appointment.customerId)} · {appointment.date}{" "}
                    {appointment.time}
                  </strong>
                  <small className="block truncate text-[#6B6B6B]">
                    {appointment.device} · {appointment.issue}
                  </small>
                </span>
                <StatusPill tone={appointment.status === "Confirmé" ? "ok" : "warn"}>{appointment.status}</StatusPill>
              </Link>
            ))}
          </TrackingSection>
        )}
        {(kind === "all" || kind === "messages") && (
          <TrackingSection
            title="Communications"
            icon={MessageSquareText}
            empty="Aucun SMS ou e-mail ne correspond aux filtres."
          >
            {messageRows.slice(0, 30).map((message) => (
              <div key={message.id} className="flex items-center gap-3 border-[#F0F0EE] border-t py-3 first:border-0">
                {message.channel === "SMS" ? (
                  <MessageSquareText className="size-4 text-[#2A9D8F]" />
                ) : (
                  <Mail className="size-4 text-[#2A9D8F]" />
                )}
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">
                    {message.subject || message.channel} · {customerName(message.customerId)}
                  </strong>
                  <small className="block truncate text-[#6B6B6B]">{message.body}</small>
                </span>
                <small className="text-[#8A8A8A]">{message.createdAt}</small>
              </div>
            ))}
          </TrackingSection>
        )}
      </div>
    </PortalPage>
  );
}

function TrackingSection({
  title,
  icon: Icon,
  empty,
  children,
}: {
  title: string;
  icon: typeof Wrench;
  empty: string;
  children: React.ReactNode;
}) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <PortalCard>
      <h2 className="flex items-center gap-2 font-semibold text-[16px]">
        <Icon className="size-4 text-[#2A9D8F]" />
        {title}
      </h2>
      <div className="mt-3">
        {hasItems ? (
          children
        ) : (
          <p className="rounded-xl bg-[#F6F7F9] px-4 py-6 text-center text-[#6B6B6B] text-sm">{empty}</p>
        )}
      </div>
    </PortalCard>
  );
}
