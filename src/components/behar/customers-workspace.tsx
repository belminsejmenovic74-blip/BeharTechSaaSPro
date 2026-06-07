"use client";

import { useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  FolderOpen,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { useAddressAutocomplete } from "@/hooks/use-address-autocomplete";
import { fetchPostalCodeByCity, usePostalCities } from "@/hooks/use-postal-cities";
import { type Customer, formatEuro, formatIsoToDisplay, getNowIso, toLocalIso, useBeharStore } from "@/lib/behar-store";
import { CALLING_CODES, COUNTRY_NAMES } from "@/lib/countries";
import { displayCustomerName } from "@/lib/customer-display";
import { sendRealSms } from "@/lib/send-sms";
import { cn } from "@/lib/utils";

import { DeviceSelector } from "../DeviceSelector";
import { PageShell } from "./page-shell";
import {
  DetailRow,
  Panel,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  TableShell,
  ToolbarSelect,
  tableClassName,
  tableHeadClassName,
} from "./primitives";

const countryOptions = COUNTRY_NAMES;

function digitsOnly(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function phoneParts(value: unknown): { prefix: string; local: string } {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\+\d{1,4})\s*(.*)$/);
  if (!match) {
    const digits = digitsOnly(raw);
    if (digits.startsWith("0")) return { prefix: "+33", local: digits.slice(1) };
    return { prefix: "+33", local: digits };
  }
  return { prefix: match[1], local: digitsOnly(match[2]) };
}

function formatPhoneLocal(prefix: string, value: unknown): string {
  const digits = digitsOnly(value).slice(0, 15);
  if (prefix === "+33") {
    const isZero = digits.startsWith("0");
    const maxLen = isZero ? 10 : 9;
    const toFormat = digits.slice(0, maxLen);
    if (isZero) {
      return toFormat.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
    }
    return toFormat.replace(/(\d)(?=(?:\d{2})+$)/g, "$1 ").trim();
  }
  return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

export function CustomersWorkspace() {
  const store = useBeharStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [appointmentCustomerId, setAppointmentCustomerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterVip, setFilterVip] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const filteredCustomers = store.customers.filter((customer) => {
    const q = search.toLowerCase();
    const matchesSearch =
      customer.name.toLowerCase().includes(q) ||
      (customer.email ?? "").toLowerCase().includes(q) ||
      (customer.phone ?? "").toLowerCase().includes(q);

    if (filterVip && customer.status !== "Client fidèle") return false;
    return matchesSearch;
  });

  const today = getNowIso().split("T")[0];
  const selectedCustomer =
    filteredCustomers.find((customer) => customer.id === store.selectedCustomerId) ?? filteredCustomers[0];

  type HistoryItem = {
    title: string;
    detail: string;
    time: string;
    icon: any;
    type?: "repair" | "quote" | "invoice" | "payment";
    id?: string;
  };
  const [tab, setTab] = useState<"resume" | "documents" | "historique">("resume");

  // Documents du client regroupés par dossier atelier (le reste dans « Autres »).
  const clientDocGroups = useMemo(() => {
    if (!selectedCustomer) return [] as Array<{ key: string; title: string; subtitle: string; docs: typeof store.documents }>;
    const docs = store.documents.filter((doc) => doc.customerId === selectedCustomer.id);
    const map = new Map<string, { key: string; title: string; subtitle: string; docs: typeof store.documents }>();
    for (const doc of docs) {
      const repair = doc.repairId ? store.repairs.find((entry) => entry.id === doc.repairId) : undefined;
      const key = repair?.id ?? "__other__";
      if (!map.has(key)) {
        map.set(key, {
          key,
          title: repair ? `Dossier ${repair.number}` : "Autres documents",
          subtitle: repair ? repair.deviceModel || repair.device || "" : "Documents hors dossier",
          docs: [] as typeof store.documents,
        });
      }
      map.get(key)?.docs.push(doc);
    }
    return [...map.values()];
  }, [selectedCustomer, store.documents, store.repairs]);
  const clientDocCount = clientDocGroups.reduce((sum, group) => sum + group.docs.length, 0);
  const docLabel: Record<string, string> = {
    intake: "Bon de prise en charge",
    quote: "Devis",
    invoice: "Facture",
    payment: "Reçu / justificatif",
    "sale-receipt": "Reçu de vente",
    "sale-invoice": "Facture de vente",
    internal: "Fiche interne",
    summary: "Résumé dossier",
  };

  const historyItems: HistoryItem[] = selectedCustomer
    ? (
        [
          ...store.repairs
            .filter((repair) => repair.customerId === selectedCustomer.id)
            .map((repair) => ({
              detail: `${repair.device} — ${repair.issue}`,
              icon: Wrench,
              time: repair.droppedAt,
              title: `Dossier ${repair.number}`,
              type: "repair" as const,
              id: repair.id,
            })),
          ...store.appointments
            .filter((appointment) => appointment.customerId === selectedCustomer.id)
            .map((appointment) => ({
              detail: `${appointment.device} — ${appointment.issue}`,
              icon: CalendarDays,
              time: `${appointment.date}T${appointment.time}`,
              title: appointment.confirmed ? "RDV honoré" : "RDV programmé",
              type: undefined,
              id: appointment.id,
            })),
          ...store.quotes
            .filter((quote) => quote.customerId === selectedCustomer.id)
            .map((quote) => ({
              detail: `Devis ${quote.number} — ${formatEuro(quote.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0))}`,
              icon: ReceiptText,
              time: quote.date,
              title: `Devis ${quote.status}`,
              type: "quote" as const,
              id: quote.id,
            })),
          ...store.invoices
            .filter((invoice) => invoice.customerId === selectedCustomer.id)
            .map((invoice) => ({
              detail: `Facture ${invoice.number} — ${invoice.status}`,
              icon: ReceiptText,
              time: invoice.date,
              title: `Facture ${invoice.status}`,
              type: "invoice" as const,
              id: invoice.id,
            })),
          ...store.payments
            .filter((payment) => payment.customerId === selectedCustomer.id)
            .map((payment) => ({
              detail: `${payment.method} — ${formatEuro(payment.amount)}`,
              icon: ReceiptText,
              time: payment.date,
              title: `Règlement indiqué`,
              type: "payment" as const,
              id: payment.id,
            })),
          ...store.messageLogs
            .filter((message) => message.customerId === selectedCustomer.id)
            .map((message) => ({
              detail: message.body.length > 60 ? message.body.slice(0, 60) + "..." : message.body,
              icon: MessageCircle,
              time: message.createdAt,
              title: `Message ${message.channel}`,
              type: undefined,
              id: undefined,
            })),
        ] as HistoryItem[]
      ).sort((a, b) => b.time.localeCompare(a.time))
    : [];

  const actions = (
    <PrimaryButton onClick={() => setOpen(true)}>
      Nouveau client
      <Plus className="size-4" />
    </PrimaryButton>
  );

  const toolbar = (
    <>
      <ToolbarSelect>Tous les statuts</ToolbarSelect>
      <ToolbarSelect>Tous les appareils</ToolbarSelect>
      <ToolbarSelect>Source</ToolbarSelect>
      <SecondaryButton
        className={filterVip ? "border-[#2A9D8F] bg-[#EAF6F2] text-[#1A1916]" : ""}
        onClick={() => setFilterVip(!filterVip)}
      >
        VIP uniquement
      </SecondaryButton>
    </>
  );

  return (
    <PageShell
      actions={actions}
      fitScreen
      searchPlaceholder="Rechercher un client..."
      searchValue={search}
      onSearchChange={setSearch}
      title="Clients"
      subtitle="Suivez vos clients, leurs appareils et leur historique d'interventions."
      toolbar={toolbar}
    >
      {/* Mobile : KPI strip + liste cards */}
      <div className="md:hidden space-y-4">
        {(() => {
          const totalCustomers = filteredCustomers.length;
          const vipCount = filteredCustomers.filter((c) => c.status === "VIP" || (c as any).vip).length;
          const totalSpent = filteredCustomers.reduce((s, c) => s + (c.totalSpent ?? 0), 0);
          return (
            <section className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 scrollbar-none">
              <div className="w-[44%] shrink-0 rounded-[18px] bg-white p-4 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
                <span className="grid size-9 place-items-center text-[#2A9D8F]">
                  <span className="font-bold text-[14px]">{totalCustomers}</span>
                </span>
                <p className="mt-3 text-[#6B6B6B] text-[11px] font-medium">Clients</p>
                <p className="mt-1.5 font-bold text-[#1A1916] text-[20px] leading-none tabular-nums">
                  {totalCustomers}
                </p>
                <p className="mt-1.5 text-[#6B6B6B] text-[10px] font-medium">enregistrés</p>
              </div>
              <div className="w-[44%] shrink-0 rounded-[18px] bg-white p-4 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
                <span className="grid size-9 place-items-center text-[#C99A2E]">
                  <span className="text-[16px]">★</span>
                </span>
                <p className="mt-3 text-[#6B6B6B] text-[11px] font-medium">VIP</p>
                <p className="mt-1.5 font-bold text-[#6B6B6B] text-[20px] leading-none tabular-nums">{vipCount}</p>
                <p className="mt-1.5 text-[#6B6B6B] text-[10px] font-medium">clients prioritaires</p>
              </div>
              <div className="w-[44%] shrink-0 rounded-[18px] bg-white p-4 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
                <span className="grid size-9 place-items-center text-[#2A9D8F]">€</span>
                <p className="mt-3 text-[#6B6B6B] text-[11px] font-medium">CA cumulé</p>
                <p className="mt-1.5 font-bold text-[#1A1916] text-[20px] leading-none tabular-nums">
                  {formatEuro(totalSpent)}
                </p>
                <p className="mt-1.5 text-[#6B6B6B] text-[10px] font-medium">historique</p>
              </div>
            </section>
          );
        })()}

        <ul className="space-y-2.5">
          {filteredCustomers.length === 0 ? (
            <li className="rounded-[18px] bg-white p-10 text-center text-[#6B6B6B] text-sm shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
              Aucun client.
            </li>
          ) : (
            filteredCustomers.map((customer) => (
              <li key={customer.id}>
                <button
                  type="button"
                  onClick={() => {
                    store.setSelected("customer", customer.id);
                    setMobileDetailOpen(true);
                  }}
                  className="flex w-full items-start gap-3 rounded-[18px] bg-white p-4 text-left shadow-[0_1px_2px_rgba(26,25,22,0.04)] transition active:scale-[0.99]"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#EAF6F2] font-semibold text-[#2A9D8F] text-[12px] uppercase">
                    {customer.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate font-semibold text-[#1A1916] text-[14px] tracking-tight">
                        {displayCustomerName(customer)}
                      </p>
                      <p className="shrink-0 font-bold text-[#1A1916] text-[14px] tabular-nums">
                        {formatEuro(customer.totalSpent)}
                      </p>
                    </div>
                    <p className="mt-0.5 truncate text-[#6B6B6B] text-[11.5px]">
                      {customer.device || "—"} · {customer.phone || "—"}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <StatusBadge className="h-6 px-2 text-[10px] font-medium" status={customer.status} />
                      <span className="text-[#6B6B6B] text-[11px]">{formatIsoToDisplay(customer.lastVisit)}</span>
                    </div>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      <section className="hidden md:grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_390px]">
        <TableShell className="min-h-[620px] md:h-full md:min-h-0">
          <table className={tableClassName}>
            <thead className={tableHeadClassName}>
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-[#6B6B6B] text-xs">Nom</th>
                <th className="px-4 py-3 text-left font-semibold text-[#6B6B6B] text-xs">Appareil</th>
                <th className="px-4 py-3 text-left font-semibold text-[#6B6B6B] text-xs">Dernière visite</th>
                <th className="px-4 py-3 text-left font-semibold text-[#6B6B6B] text-xs">Total dépensé</th>
                <th className="px-4 py-3 text-left font-semibold text-[#6B6B6B] text-xs">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr
                  className={`cursor-pointer transition-colors ${customer.id === selectedCustomer?.id ? "bg-[#F1FAF8]" : "hover:bg-[#FAFAFA]"}`}
                  key={customer.id}
                  onClick={() => store.setSelected("customer", customer.id)}
                >
                  <td className="border-[#E8E8E5] border-b px-4 py-3 text-[#1A1916]">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-full bg-[#F7F7F7] font-semibold text-[#1A1916] text-[11px] uppercase">
                        {customer.initials}
                      </span>
                      <span className="font-semibold text-sm">{displayCustomerName(customer)}</span>
                    </div>
                  </td>
                  <td className="border-[#E8E8E5] border-b px-4 py-3 text-[#1A1916] text-sm">{customer.device}</td>
                  <td className="border-[#E8E8E5] border-b px-4 py-3 text-[#1A1916] text-sm">
                    {formatIsoToDisplay(customer.lastVisit)}
                  </td>
                  <td className="border-[#E8E8E5] border-b px-4 py-3 font-semibold text-[#1A1916] text-sm tabular-nums">
                    {formatEuro(customer.totalSpent)}
                  </td>
                  <td className="border-[#E8E8E5] border-b px-4 py-3 text-[#1A1916]">
                    <StatusBadge className="h-6 px-2 text-[10px] font-medium" status={customer.status} />
                  </td>
                  <td className="border-[#E8E8E5] border-b px-4 py-3 text-[#1A1916]">
                    <ChevronRight className="ml-auto size-4 text-[#6B6B6B]" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>

        {selectedCustomer && (
          <Panel
            className={cn(
              mobileDetailOpen ? "fixed inset-0 z-40 overflow-y-auto bg-white p-5 flex flex-col" : "hidden",
              "md:relative md:inset-auto md:z-auto md:flex md:min-h-0 md:flex-col md:overflow-hidden md:rounded-[20px] md:bg-white md:border md:border-[#E8E8E5] md:shadow-[0_1px_3px_rgba(26,25,22,0.04),0_8px_24px_rgba(26,25,22,0.025)] md:p-5 md:h-full",
            )}
          >
            {/* Mobile back button */}
            <div className="md:hidden -mx-5 -mt-5 mb-3 sticky top-0 z-10 flex items-center gap-3 border-b border-[#F7F7F7] bg-white px-4 py-3">
              <button
                type="button"
                onClick={() => setMobileDetailOpen(false)}
                className="grid size-9 place-items-center rounded-[12px] border border-[#E8E8E5] bg-white text-[#1A1916] transition active:scale-90"
                aria-label="Retour"
              >
                <ArrowLeft className="size-4" />
              </button>
              <span className="font-semibold text-[#1A1916] text-[15px] tracking-tight">Détail client</span>
            </div>
            <div className="mb-5 flex shrink-0 items-start gap-4">
              <span className="grid size-14 place-items-center rounded-2xl bg-[#FAFAFA] font-semibold text-[#1A1916] text-xl">
                {selectedCustomer.initials}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-[#1A1916] text-xl tracking-tight leading-tight">
                  {displayCustomerName(selectedCustomer)}
                </h2>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                  <p className="flex items-center gap-1.5 font-medium text-[#6B6B6B] text-[13px]">
                    <MessageCircle className="size-3.5 text-[#2A9D8F]" />
                    {selectedCustomer.phone}
                  </p>
                  <p className="flex items-center gap-1.5 font-medium text-[#6B6B6B] text-[13px]">
                    <Mail className="size-3.5 text-[#2A9D8F]" />
                    {selectedCustomer.email}
                  </p>
                </div>
              </div>
              <button
                aria-label="Options client"
                className="rounded-xl p-2 hover:bg-[#F7F7F7] transition-colors"
                onClick={() => setEditing(selectedCustomer)}
                type="button"
              >
                <MoreHorizontal className="size-5 text-[#6B6B6B]" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="mb-5 flex rounded-xl bg-[#F7F7F7] p-1 shadow-inner">
              <button
                onClick={() => setTab("resume")}
                className={`flex-1 rounded-[10px] py-2 text-center text-xs font-medium transition-all ${
                  tab === "resume" ? "bg-white text-[#2A9D8F] shadow-sm" : "text-[#6B6B6B] hover:text-[#1A1916]"
                }`}
              >
                Résumé
              </button>
              <button
                onClick={() => setTab("documents")}
                className={`flex-1 rounded-[10px] py-2 text-center text-xs font-medium transition-all ${
                  tab === "documents" ? "bg-white text-[#2A9D8F] shadow-sm" : "text-[#6B6B6B] hover:text-[#1A1916]"
                }`}
              >
                Documents ({clientDocCount})
              </button>
              <button
                onClick={() => setTab("historique")}
                className={`flex-1 rounded-[10px] py-2 text-center text-xs font-medium transition-all ${
                  tab === "historique" ? "bg-white text-[#2A9D8F] shadow-sm" : "text-[#6B6B6B] hover:text-[#1A1916]"
                }`}
              >
                Historique ({historyItems.length})
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
              {tab === "resume" && (
                <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
                  <div className="space-y-0.5">
                    <DetailRow
                      className="py-2.5"
                      label="Appareil principal"
                      value={<span className="font-semibold">{selectedCustomer.device}</span>}
                    />
                    <DetailRow className="py-2.5" label="Dernière réparation" value={selectedCustomer.lastRepair} />
                    <DetailRow
                      className="py-2.5"
                      label="Total dépensé"
                      value={
                        <span className="text-lg font-semibold text-[#1A1916] tabular-nums">
                          {formatEuro(selectedCustomer.totalSpent)}
                        </span>
                      }
                    />
                    <DetailRow
                      className="py-2.5"
                      label="Interventions"
                      value={<span className="font-semibold">{selectedCustomer.interventions}</span>}
                    />
                    <DetailRow className="py-2.5" label="Provenance" value={selectedCustomer.source} />
                    <DetailRow
                      className="py-2.5"
                      label="Adresse"
                      value={selectedCustomer.address || "Non renseignée"}
                    />
                    <DetailRow
                      className="py-2.5"
                      label="Statut"
                      value={
                        <StatusBadge
                          className="h-6 px-3 text-[10px] font-medium uppercase tracking-wider"
                          status={selectedCustomer.tags || selectedCustomer.status}
                        />
                      }
                    />
                  </div>
                  <div className="mt-4 rounded-[16px] bg-[#FAFAFA] p-4 border border-[#F7F7F7]">
                    <h3 className="mb-2 font-medium text-[#6B6B6B] text-[12px] uppercase tracking-wider">
                      Notes internes
                    </h3>
                    <p className="text-[#6B6B6B] text-[13px] leading-relaxed italic">
                      {selectedCustomer.notes || "Aucune note particulière pour ce client."}
                    </p>
                  </div>
                </div>
              )}
              {tab === "documents" && (
                <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
                  {clientDocGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <ReceiptText className="size-8 mb-3 text-[#A3A3A3]" />
                      <p className="text-[13px] font-medium text-[#6B6B6B]">Aucun document pour ce client</p>
                      <p className="mt-1 text-[12px] text-[#A3A3A3]">Bons, devis, factures et reçus apparaîtront ici.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {clientDocGroups.map((group) => (
                        <div key={group.key}>
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#1A1916] text-[13px]">{group.title}</p>
                              {group.subtitle ? (
                                <p className="truncate text-[#6B6B6B] text-[11px]">{group.subtitle}</p>
                              ) : null}
                            </div>
                            <span className="shrink-0 rounded-[7px] border border-[#E8E8E5] bg-[#FAFAFA] px-2 py-0.5 text-[#6B6B6B] text-[11px]">
                              {group.docs.length}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {group.docs.map((doc) => (
                              <Link
                                key={doc.id}
                                href={`/print/document/${doc.id}`}
                                className="flex items-center justify-between gap-3 rounded-2xl border border-[#E8E8E5] bg-white p-3 transition hover:border-[#2A9D8F]/40 hover:shadow-md"
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-[#1A1916] text-[13px]">
                                    {docLabel[doc.type] ?? "Document"}
                                  </p>
                                  <p className="truncate text-[#6B6B6B] text-[11px]">{doc.createdAt}</p>
                                </div>
                                <ChevronRight className="size-4 shrink-0 text-[#2A9D8F]" />
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {tab === "historique" && (
                <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
                  <div className="space-y-2">
                    {historyItems.length > 0 ? (
                      historyItems.map(({ title, detail, time, icon: Icon, type, id }, idx) => (
                        <Link
                          href={
                            type
                              ? type === "repair"
                                ? `/dashboard/dossiers/${id}`
                                : `/dashboard/${type === "quote" ? "devis" : type === "invoice" ? "factures" : type === "payment" ? "paiements" : ""}`
                              : "#"
                          }
                          onClick={() => {
                            if (type && id) store.setSelected(type, id);
                          }}
                          className="group flex items-start gap-4 p-3.5 rounded-2xl bg-[#FAFAFA] border border-transparent hover:border-[#2A9D8F]/30 hover:bg-white hover:shadow-md transition-all animate-in fade-in slide-in-from-right-2 duration-300"
                          style={{ animationDelay: `${idx * 40}ms` }}
                          key={`${title}-${detail}-${time}`}
                        >
                          <span className="grid size-10 place-items-center rounded-2xl bg-white border border-[#E8E8E5] text-[#2A9D8F] shadow-sm shrink-0 group-hover:scale-110 transition-transform">
                            <Icon className="size-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-[#1A1916] text-sm leading-tight tracking-tight">
                                {title}
                              </p>
                              <span className="text-[#8A8A8A] text-[9px] font-medium uppercase whitespace-nowrap">
                                {formatIsoToDisplay(time)}
                              </span>
                            </div>
                            <p className="mt-1 text-[#6B6B6B] text-[12px] leading-snug">{detail}</p>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <ReceiptText className="size-8 mb-3 text-[#A3A3A3]" />
                        <p className="text-[13px] font-medium text-[#6B6B6B]">Aucun historique disponible</p>
                        <p className="mt-1 text-[12px] text-[#A3A3A3]">
                          Les dossiers, devis et règlements apparaîtront ici.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 grid shrink-0 gap-2 border-[#E8E8E5] border-t pt-5">
              <PrimaryButton
                className="h-11 w-full"
                onClick={() => {
                  const todayStr = getNowIso().split("T")[0];
                  const repairId = store.addRepair({
                    customerId: selectedCustomer.id,
                    device: selectedCustomer.device || "Appareil à renseigner",
                    issue: selectedCustomer.lastRepair || "Intervention atelier",
                    status: "Reçu",
                    amount: 0,
                    notes: "Dossier créé depuis la fiche client.",
                    droppedAt: todayStr,
                    technician: "Atelier principal",
                    history: ["Prise en charge créée"],
                  });
                  if (!repairId) {
                    toast.error("Impossible de créer le dossier");
                    return;
                  }
                  store.setSelected("repair", repairId);
                  toast.success("Prise en charge créée");
                  router.push(`/dashboard/dossiers/${repairId}`);
                }}
              >
                <Wrench className="size-4" />
                Nouvelle prise en charge
              </PrimaryButton>
              <div className="grid grid-cols-2 gap-2">
                <SecondaryButton
                  className="h-11 w-full font-medium"
                  onClick={() => {
                    const todayStr = getNowIso().split("T")[0];
                    const repairId = store.addRepair({
                      customerId: selectedCustomer.id,
                      device: selectedCustomer.device || "Appareil à renseigner",
                      issue: selectedCustomer.lastRepair || "Diagnostic atelier",
                      status: "Reçu",
                      amount: 0,
                      notes: "Dossier créé depuis la fiche client.",
                      droppedAt: todayStr,
                      technician: "Atelier principal",
                      history: ["Prise en charge créée", "Devis demandé depuis la fiche client"],
                    });
                    if (!repairId) {
                      toast.error("Impossible de créer le dossier");
                      return;
                    }
                    const quoteId = store.addQuote({ customerId: selectedCustomer.id, repairId, status: "Brouillon" });
                    if (!quoteId) {
                      toast.error("Impossible de créer le devis");
                      return;
                    }
                    store.setSelected("quote", quoteId);
                    toast.success("Devis créé");
                  }}
                >
                  <ReceiptText className="size-4" />
                  Créer un devis
                </SecondaryButton>
                <SecondaryButton
                  className="h-11 w-full font-medium"
                  onClick={() => setAppointmentCustomerId(selectedCustomer.id)}
                >
                  <CalendarDays className="size-4" />
                  Rendez-vous
                </SecondaryButton>
                <SecondaryButton asChild className="col-span-2 h-11 w-full font-medium">
                  <Link href="/dashboard/dossiers">
                    <FolderOpen className="size-4" />
                    Voir les dossiers
                  </Link>
                </SecondaryButton>
              </div>
            </div>
          </Panel>
        )}
      </section>

      {open && <CustomerModal onClose={() => setOpen(false)} />}
      {editing && <CustomerModal initial={editing} onClose={() => setEditing(null)} />}
      {appointmentCustomerId && (
        <AppointmentFromCustomerModal
          customerId={appointmentCustomerId}
          onClose={() => setAppointmentCustomerId(null)}
        />
      )}
    </PageShell>
  );
}

function CustomerModal({ onClose, initial }: Readonly<{ onClose: () => void; initial?: Customer }>) {
  const store = useBeharStore();
  const [phone, setPhone] = useState(initial?.phone || "");
  const [country, setCountry] = useState<(typeof countryOptions)[number]>("France");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState(initial?.address || "");
  const [deviceState, setDeviceState] = useState({
    deviceType: "Smartphone",
    brand: "Apple",
    model: "Autre",
    customModel: "",
    deviceLabel: initial?.device || "Apple Autre",
  });

  const inputClass =
    "h-11 w-full rounded-xl border border-[#E8E8E5] bg-white px-3 outline-none transition focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10";
  const { suggestions: addressSuggestions } = useAddressAutocomplete(address, country);
  const phoneInfo = phoneParts(phone);
  const phoneLocal = formatPhoneLocal(phoneInfo.prefix, phoneInfo.local);
  const { cities: postalCities } = usePostalCities(postalCode, country);

  const setInternationalPhone = (prefixValue: string, localValue: string) => {
    const normalizedPrefix = `+${digitsOnly(prefixValue).slice(0, 4) || "33"}`;
    const local = formatPhoneLocal(normalizedPrefix, localValue);
    setPhone(local ? `${normalizedPrefix} ${local}` : normalizedPrefix);
  };
  const setPostal = (value: string) => {
    const maxLength = country === "Suisse" ? 4 : 5;
    const nextPostalCode = digitsOnly(value).slice(0, maxLength);
    setPostalCode(nextPostalCode);
  };
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1A1916]/24 p-0 md:p-4">
      <Panel className="mx-auto my-0 min-h-svh max-w-none overflow-y-auto rounded-none p-5 md:my-8 md:max-h-[calc(100svh-4rem)] md:max-w-xl md:min-h-0 md:rounded-[20px] md:p-6">
        <h2 className="font-semibold text-2xl text-[#1A1916]">{initial ? "Modifier client" : "Nouveau client"}</h2>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const anonymous = data.get("anonymous") === "on";
            const name = anonymous ? "Client comptoir" : String(data.get("name") || "Client comptoir");
            const payload = {
              name,
              initials: name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase(),
              phone: phone.trim() || "Non renseigné",
              email: String(data.get("email") || "Non renseigné"),
              address: [address.trim(), [postalCode, city].filter(Boolean).join(" "), country]
                .filter(Boolean)
                .join(", "),
              device: deviceState.deviceLabel,
              notes: String(data.get("notes") || ""),

              tags: String(data.get("tags") || "Actif"),
              status: String(data.get("tags") || "Actif"),
              source: "Création dashboard",
            };
            if (initial) {
              store.updateCustomer(initial.id, payload);
              toast.success("Client modifié");
            } else {
              store.addCustomer(payload);
              toast.success("Client créé");
            }
            onClose();
          }}
        >
          <label className="flex items-center gap-3 rounded-2xl bg-[#FAFAFA] p-3 text-sm">
            <input name="anonymous" type="checkbox" />
            Le client souhaite rester anonyme
          </label>
          <input className={inputClass} defaultValue={initial?.name} name="name" placeholder="Nom du client" />
          <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[90px_1fr] gap-2">
            <select
              aria-label="Indicatif client"
              className={`min-w-0 ${inputClass} pr-6 appearance-none bg-white bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236B6B6B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:14px_14px] bg-[position:right_8px_center] bg-no-repeat overflow-hidden text-ellipsis`}
              onChange={(e) => setInternationalPhone(e.target.value, phoneInfo.local)}
              value={(CALLING_CODES as readonly string[]).includes(phoneInfo.prefix) ? phoneInfo.prefix : "+33"}
            >
              {CALLING_CODES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <input
              aria-label="Téléphone client"
              className={`min-w-0 ${inputClass}`}
              inputMode="tel"
              onChange={(e) => setInternationalPhone(phoneInfo.prefix, e.target.value)}
              placeholder={phoneInfo.prefix === "+33" ? "6 12 34 56 78" : "Numéro"}
              value={phoneLocal}
            />
          </div>
          <input className={inputClass} defaultValue={initial?.email} name="email" placeholder="Email" />
          <div className="grid gap-2 sm:grid-cols-3">
            <select
              className={`${inputClass} pr-8 appearance-none bg-white bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236B6B6B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[position:right_12px_center] bg-no-repeat`}
              onChange={(e) => {
                setCountry(e.target.value as (typeof countryOptions)[number]);
                if (e.target.value === "Suisse" && phoneInfo.prefix === "+33") {
                  setInternationalPhone("+41", phoneInfo.local);
                }
              }}
              value={country}
            >
              {countryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              className={inputClass}
              inputMode="numeric"
              onChange={(e) => setPostal(e.target.value)}
              placeholder="Code postal"
              value={postalCode}
            />
            <div className="relative">
              <input
                className={inputClass}
                onChange={(e) => setCity(e.target.value)}
                onBlur={() => {
                  if (city && !postalCode && country === "France") {
                    fetchPostalCodeByCity(city, country).then((code) => {
                      if (code) setPostalCode(code);
                    });
                  }
                }}
                placeholder="Ville"
                value={city}
                list="customer-city-suggestions"
              />
              {postalCities.length > 0 && (
                <datalist id="customer-city-suggestions">
                  {postalCities.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              )}
            </div>
          </div>
          <input
            className={inputClass}
            list="customer-address-suggestions"
            onChange={(e) => {
              const val = e.target.value;
              setAddress(val);
              const match = addressSuggestions.find((s) => s.label === val || s.name === val);
              if (match) {
                setAddress(match.name);
                if (match.postcode) setPostalCode(match.postcode);
                if (match.city) setCity(match.city);
              }
            }}
            placeholder="Adresse"
            value={address}
          />
          {addressSuggestions.length > 0 && (
            <datalist id="customer-address-suggestions">
              {addressSuggestions.map((s) => (
                <option key={s.label} value={s.label} />
              ))}
            </datalist>
          )}
          <DeviceSelector
            deviceType={deviceState.deviceType}
            brand={deviceState.brand}
            model={deviceState.model}
            customModel={deviceState.customModel}
            onChange={(updates) => setDeviceState((prev) => ({ ...prev, ...updates }))}
          />

          <input
            className={inputClass}
            defaultValue={initial?.tags ?? initial?.status}
            name="tags"
            placeholder="Tags"
          />
          <textarea
            className="min-h-24 w-full rounded-xl border border-[#E8E8E5] bg-white px-3 py-2 outline-none transition focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10"
            defaultValue={initial?.notes}
            name="notes"
            placeholder="Notes client"
          />
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
            <PrimaryButton type="submit">
              <UserRound className="size-4" />
              {initial ? "Enregistrer" : "Créer"}
            </PrimaryButton>
          </div>
        </form>
      </Panel>
    </div>
  );
}

function AppointmentFromCustomerModal({ customerId, onClose }: Readonly<{ customerId: string; onClose: () => void }>) {
  const store = useBeharStore();
  const customer = store.customers.find((c) => c.id === customerId);
  const now = new Date();
  const [date, setDate] = useState(toLocalIso(now).split("T")[0]);
  const [time, setTime] = useState("14:30");
  const [issue, setIssue] = useState(customer?.lastRepair || "");
  const [error, setError] = useState("");

  const inputClass =
    "h-11 w-full rounded-xl border border-[#E8E8E5] bg-white px-3 outline-none transition focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !issue.trim()) {
      setError("La date, l'heure et le motif sont obligatoires.");
      return;
    }
    const appointmentId = store.addAppointment({
      customerId,
      device: customer?.device || "Non renseigné",
      issue: issue.trim(),
      date: `${date}`,
      time,
    });
    if (!appointmentId) {
      toast.error("Impossible de créer le rendez-vous");
      return;
    }
    toast.success("Rendez-vous créé");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1A1916]/24 p-0 md:p-4">
      <Panel className="mx-auto my-0 min-h-svh max-w-none overflow-y-auto rounded-none p-5 md:my-8 md:max-w-md md:min-h-0 md:rounded-[20px] md:p-6">
        <h2 className="font-semibold text-xl text-[#1A1916]">Nouveau rendez-vous</h2>
        <p className="mt-1 text-sm text-[#6B6B6B]">
          Client : <span className="font-semibold text-[#1A1916]">{displayCustomerName(customer ?? undefined)}</span>
        </p>
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="text-[#6B6B6B] mb-1 block">Date du rendez-vous *</span>
            <input
              className={inputClass}
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setError("");
              }}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-[#6B6B6B] mb-1 block">Heure *</span>
            <input
              className={inputClass}
              type="time"
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                setError("");
              }}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-[#6B6B6B] mb-1 block">Motif du rendez-vous *</span>
            <input
              className={inputClass}
              placeholder="Ex: Diagnostic écran, Devis réparation..."
              value={issue}
              onChange={(e) => {
                setIssue(e.target.value);
                setError("");
              }}
              required
            />
          </label>
          {error && <p className="text-sm text-[#B42318] font-semibold">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
            <PrimaryButton type="submit">
              <CalendarDays className="size-4" />
              Créer le rendez-vous
            </PrimaryButton>
          </div>
        </form>
      </Panel>
    </div>
  );
}
