"use client";

import Link from "next/link";

import type { LucideIcon } from "lucide-react";
import { ArrowRight, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { DetailRow, Panel, PrimaryButton, StatusBadge } from "@/components/behar/primitives";
import { RevenueChart } from "@/components/behar/revenue-chart";
import { formatEuro, formatIsoToDisplay, useBeharStore } from "@/lib/behar-store";
import type { RepairCard } from "@/mock/repairs";

export function DashboardWorkspace() {
  const store = useBeharStore();
  const selected = store.repairs.find((repair) => repair.id === store.selectedRepairId) ?? store.repairs[0];
  const customer = selected ? store.customers.find((entry) => entry.id === selected.customerId) : undefined;
  const paidPayments = store.payments.filter((payment) => payment.status === "Payé");
  const monthlyPayments = paidPayments.filter((payment) => isCurrentMonthLabel(payment.date));
  const monthRevenue = monthlyPayments.reduce((total, payment) => total + payment.amount, 0);
  const averageTicket = paidPayments.length
    ? paidPayments.reduce((total, payment) => total + payment.amount, 0) / paidPayments.length
    : 0;
  const unpaidInvoices = store.invoices.filter((invoice) => invoice.status !== "Payée");
  const amountToCollect = unpaidInvoices.reduce(
    (total, invoice) => total + invoice.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
    0,
  );
  const todaysAppointments = store.appointments.filter((appointment) => appointment.date === new Date().toISOString().slice(0, 10)).length;
  const today = displayDate(new Date());
  const selectedPaid = selected
    ? store.payments.some((payment) => payment.repairId === selected.id && payment.status === "Payé")
    : false;
  const relatedQuotes = selected ? store.quotes.filter((quote) => quote.repairId === selected.id) : [];
  const canViewAuditLog = store.hasPermission("canViewAuditLog");
  const recentAuditLogs = store.auditLogs.slice(0, 5);
  const relatedInvoices = selected ? store.invoices.filter((invoice) => invoice.repairId === selected.id) : [];
  const selectedQuoteAmount = relatedQuotes[0]
    ? relatedQuotes[0].lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
    : 0;
  const selectedInvoiceAmount = relatedInvoices[0]
    ? relatedInvoices[0].lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
    : 0;
  const selectedPaidAmount = selected
    ? store.payments
        .filter((payment) => payment.repairId === selected.id && payment.status === "Payé")
        .reduce((sum, payment) => sum + payment.amount, 0)
    : 0;
  const selectedPartsAmount = selected
    ? selected.parts.reduce((sum, part) => sum + part.salePrice * part.quantity, 0)
    : 0;
  const dynamicKpis = [
    {
      label: "CA encaissé",
      value: formatEuro(monthRevenue),
      trend: "",
      helper: "paiements du mois en cours",
      icon: ArrowRight,
      href: "/dashboard/paiements",
    },
    {
      label: "Factures payées",
      value: String(store.invoices.filter((invoice) => invoice.status === "Payée").length),
      trend: "",
      helper: "factures réglées",
      icon: ArrowRight,
      href: "/dashboard/factures?status=paid",
    },
    {
      label: "Réparations en cours",
      value: String(store.repairs.filter((repair) => repair.status !== "Prêt").length),
      trend: "",
      helper: "hors réparations prêtes",
      icon: ArrowRight,
      href: "/dashboard/reparations",
    },
    {
      label: "Devis",
      value: String(store.quotes.length),
      trend: "",
      helper: "devis créés",
      icon: ArrowRight,
      href: "/dashboard/devis",
    },
    {
      label: "RDV du jour",
      value: String(todaysAppointments),
      trend: "",
      helper: "rendez-vous planifiés",
      icon: ArrowRight,
      href: "/dashboard/rendez-vous",
    },
    {
      label: "Montant à encaisser",
      value: formatEuro(amountToCollect),
      trend: "",
      helper: "factures impayées",
      icon: ArrowRight,
      href: "/dashboard/factures?status=unpaid",
    },
  ];
  const columns = ["Reçu", "Diagnostic", "En réparation", "Prêt"].map((status) => ({
    title: status === "En réparation" ? "Réparation" : status,
    count: store.repairs.filter((repair) => repair.status === status).length,
    cards: store.repairs
      .filter((repair) => repair.status === status)
      .map((repair) => ({
        id: repair.id,
        shop_id: repair.shopId,
        device: repair.device,
        issue: repair.issue,
        customer: store.customers.find((entry) => entry.id === repair.customerId)?.name || "Client comptoir",
        time: formatIsoToDisplay(repair.droppedAt),
        status: repair.status,
      })) as RepairCard[],
  }));

  const totalQuotes = store.quotes.length;
  const acceptedQuotes = store.quotes.filter((q) => q.status === "Accepté" || q.status === "Facturé").length;
  const conversionRate = totalQuotes > 0 ? ((acceptedQuotes / totalQuotes) * 100).toFixed(1) : "0";
  const computedStats = [
    {
      label: "Réparations",
      value: String(store.repairs.length),
      trend: "",
      helper: "total dans le système",
      icon: ArrowRight,
      href: "/dashboard/reparations",
    },
    {
      label: "Devis en attente",
      value: String(store.quotes.filter((q) => q.status === "Envoyé" || q.status === "Brouillon").length),
      trend: "",
      helper: "brouillons + envoyés",
      icon: ArrowRight,
      href: "/dashboard/devis",
    },
    {
      label: "Factures payées",
      value: String(store.invoices.filter((i) => i.status === "Payée").length),
      trend: "",
      helper: "factures réglées",
      icon: ArrowRight,
      href: "/dashboard/factures?status=paid",
    },
    {
      label: "Factures impayées",
      value: String(store.invoices.filter((i) => i.status !== "Payée").length),
      trend: "",
      helper: "factures non réglées",
      icon: ArrowRight,
      href: "/dashboard/factures?status=unpaid",
    },
    {
      label: "Paiements récents",
      value: String(store.payments.slice(0, 5).length),
      trend: "",
      helper: `${conversionRate}% conversion devis`,
      icon: ArrowRight,
      href: "/dashboard/paiements",
    },
  ];

  return (
    <div className="hidden space-y-6 md:block">
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {dynamicKpis.map((kpi) => (
          <DashboardMetricCard {...kpi} key={kpi.label} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel className="min-w-0 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-[#1A1916] text-[17px] tracking-tight">Flux des réparations</h2>
            <Link className="inline-flex items-center gap-1.5 text-[#8A8984] text-[13px] hover:text-[#6B6B6B] transition-colors" href="/dashboard/reparations">
              Voir toutes les réparations
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <DashboardKanban
            columns={columns}
            onSelect={(id) => store.setSelected("repair", id)}
            selectedId={selected?.id ?? ""}
          />
        </Panel>

        {selected && customer && (
          <Panel className="p-5">
            <div className="mb-5 flex items-start justify-between">
              <h2 className="font-semibold text-[#1A1916] text-[17px] tracking-tight">{selected.device}</h2>
              <button
                aria-label="Options"
                className="text-[#6B6B6B] hover:text-[#1A1916]"
                onClick={() => toast.message("Action bientôt disponible.")}
                type="button"
              >
                <MoreHorizontal className="size-5" />
              </button>
            </div>

            <dl className="space-y-0.5">
              <DetailRow label="Client" value={customer.name} />
              <DetailRow label="Appareil" value={selected.device} />
              <DetailRow label="Problème" value={selected.issue} />
              <DetailRow
                label="Statut"
                value={<StatusBadge status={selected.status === "Test final" ? "Test" : selected.status} />}
              />
              <DetailRow
                label="Devis"
                value={selectedQuoteAmount > 0 ? formatEuro(selectedQuoteAmount) : "À chiffrer"}
              />
              <DetailRow
                label="Facture"
                value={selectedInvoiceAmount > 0 ? formatEuro(selectedInvoiceAmount) : "À chiffrer"}
              />
              <DetailRow label="Payé" value={selectedPaidAmount > 0 ? formatEuro(selectedPaidAmount) : "0,00 €"} />
              <DetailRow
                emphasize
                label="Pièces utilisées"
                value={selectedPartsAmount > 0 ? formatEuro(selectedPartsAmount) : "0,00 €"}
              />
            </dl>

            <PrimaryButton
              className="mt-5 w-full"
              disabled={selectedPaid}
              onClick={() => {
                const existingInvoice = store.invoices.find((invoice) => invoice.repairId === selected.id);
                if (!existingInvoice) {
                  toast.info("Créez d'abord une facture depuis le module Factures.");
                  return;
                }
                store.setSelected("invoice", existingInvoice.id);
                toast.info("Passez par la facture pour encaisser le paiement.");
              }}
            >
              {selectedPaid ? "Déjà encaissé" : "Encaisser"}
            </PrimaryButton>
          </Panel>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
        <Panel className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-[#1A1916] text-[17px] tracking-tight">Chiffre d'affaires</h2>
            <span className="text-[#8A8984] text-[13px]">30 derniers jours</span>
          </div>
          <RevenueChart />
        </Panel>

        <div className="grid gap-4 md:grid-cols-2">
          {computedStats.map((stat) => (
            <DashboardStatCard {...stat} key={stat.label} />
          ))}
          {store.stockItems
            .filter((item) => item.stock <= item.threshold)
            .slice(0, 2)
            .map((item) => (
              <Panel className="h-[112px] p-4" key={item.id}>
                <p className="text-[#6B6B6B] text-sm">{item.stock === 0 ? "Rupture stock" : "Stock faible"}</p>
                <p className="mt-2 truncate font-semibold text-[#1A1916] text-xl">{item.part}</p>
                <p className="mt-3 text-[#B42318] text-xs">
                  {item.stock} disponible · seuil {item.threshold}
                </p>
              </Panel>
            ))}
        </div>
      </section>

      {canViewAuditLog && (
        <Panel className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-[#1A1916] text-[17px] tracking-tight">Activité récente</h2>
            <span className="text-[#8A8984] text-[12px]">{recentAuditLogs.length} actions</span>
          </div>
          {recentAuditLogs.length === 0 ? (
            <p className="rounded-[12px] bg-[#FAFAF8] px-4 py-5 text-center text-[#6B6B6B] text-sm">
              Aucune activité tracée pour le moment.
            </p>
          ) : (
            <div className="divide-y divide-[#EFEDE6]">
              {recentAuditLogs.map((entry) => (
                <div className="flex items-start justify-between gap-4 py-3" key={entry.id}>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#1A1916] text-sm">{entry.message}</p>
                    <p className="mt-1 text-[#8A8984] text-xs">
                      {entry.actorName} · {entry.action}
                    </p>
                  </div>
                  <span className="shrink-0 text-[#B0AEA8] text-xs">{entry.createdAt}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

function displayDate(date: Date) {
  return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function isCurrentMonthLabel(value: string) {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = monthNames[now.getMonth()];
  const short = shortMonthNames[now.getMonth()];
  return value.includes(year) && (value.includes(month) || value.includes(short));
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

const shortMonthNames = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

const DASHBOARD_TESTIDS: Record<string, string> = {
  "CA encaissé": "dashboard-revenue-card",
  "Réparations en cours": "dashboard-active-repairs-card",
  "Réparations prêtes": "dashboard-ready-repairs-card",
  "Devis en attente": "dashboard-pending-quotes-card",
  Devis: "dashboard-pending-quotes-card",
  "Factures impayées": "dashboard-unpaid-invoices-card",
  "Montant à encaisser": "dashboard-unpaid-invoices-card",
  "RDV du jour": "dashboard-today-appointments-card",
  "Stock bas": "dashboard-low-stock-card",
};

function dashboardTestId(label: string): string {
  return (
    DASHBOARD_TESTIDS[label] ??
    `dashboard-kpi-${label
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`
  );
}

function DashboardMetricCard({
  label,
  value,
  trend,
  helper,
  icon: Icon,
  href,
}: Readonly<{ label: string; value: string; trend: string; helper: string; icon: LucideIcon; href?: string }>) {
  const testId = dashboardTestId(label);
  const content = (
    <div className="flex h-full flex-col justify-center gap-1">
      <p className="text-[#8A8984] text-[13px]">{label}</p>
      <p className="font-semibold text-[28px] text-[#1A1916] leading-none tracking-tight">{value}</p>
      {trend ? <p className="mt-1 font-medium text-[#2A9D8F] text-[13px]">{trend}</p> : null}
      <p className="mt-0.5 text-[#B0AEA8] text-[12px]">{helper}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-transform duration-200 hover:scale-[1.015]" data-testid={testId}>
        <Panel className="h-[116px] p-5">{content}</Panel>
      </Link>
    );
  }

  return (
    <Panel className="h-[116px] p-5" data-testid={testId}>
      {content}
    </Panel>
  );
}

function DashboardStatCard({
  label,
  value,
  trend,
  helper,
  icon: Icon,
  href,
}: Readonly<{ label: string; value: string; trend: string; helper: string; icon: LucideIcon; href?: string }>) {
  const testId = dashboardTestId(label);
  const content = (
    <div className="flex h-full items-center justify-between gap-4">
      <div>
        <p className="text-[#8A8984] text-[13px]">{label}</p>
        <p className="mt-2 font-semibold text-[24px] text-[#1A1916] leading-none tracking-tight">{value}</p>
        <p className="mt-3 text-[12px]">
          {trend ? <span className="font-medium text-[#2A9D8F]">{trend} </span> : null}
          <span className="text-[#B0AEA8]">{helper}</span>
        </p>
      </div>
      <div className="grid size-11 place-items-center rounded-full bg-[#E8F7F3] text-[#2A9D8F]">
        <Icon className="size-5" />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-transform duration-200 hover:scale-[1.015]" data-testid={testId}>
        <Panel className="h-[116px] p-5">{content}</Panel>
      </Link>
    );
  }

  return <Panel className="h-[116px] p-5" data-testid={testId}>{content}</Panel>;
}

function DashboardKanban({
  columns,
  selectedId,
  onSelect,
}: Readonly<{
  columns: Array<{ title: string; count: number; cards: RepairCard[] }>;
  selectedId: string;
  onSelect: (id: string) => void;
}>) {
  return (
    <div className="grid h-[360px] grid-cols-[repeat(4,minmax(150px,1fr))] gap-2.5 overflow-hidden">
      {columns.map((column) => (
        <div className="flex min-h-0 flex-col rounded-[14px] border border-[#E7E4DC] bg-[#FAFAF8]/60 p-3" key={column.title}>
          <div className="mb-3 flex shrink-0 items-center gap-2">
            <h3 className="font-medium text-[#1A1916] text-[13px]">{column.title}</h3>
            <span className="rounded-full bg-[#F1F1EF] px-2 py-0.5 text-[#8A8984] text-[11px] font-medium">{column.count}</span>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">
            {column.cards.map((card) => (
              <button
                className={`w-full rounded-[12px] border p-3 text-left transition ${
                  card.id === selectedId
                    ? "border-[#2A9D8F] bg-[#F8FFFC] shadow-[0_8px_20px_rgba(42,157,143,0.10)]"
                    : "border-[#E7E4DC] bg-white hover:border-[#2A9D8F]/40"
                }`}
                key={card.id}
                onClick={() => onSelect(card.id)}
                type="button"
              >
                <p className="truncate font-semibold text-[#1A1916] text-sm">{card.device}</p>
                <p className="mt-1 truncate text-[#6B6B6B] text-xs">{card.issue}</p>
                <p className="mt-2 truncate font-medium text-[#1A1916] text-xs">{card.customer}</p>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <span className="truncate text-[#6B6B6B] text-xs" suppressHydrationWarning>
                    {card.time}
                  </span>
                  <StatusBadge status={card.status} />
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
