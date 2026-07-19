"use client";

import { useState } from "react";

import Link from "next/link";

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderOpen,
  MoreHorizontal,
  Package,
  Plus,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { FinanceOverview } from "@/components/behar/finance-overview";
import { KanbanBoard } from "@/components/behar/kanban";
import { DetailRow, Panel, PrimaryButton, StatusBadge } from "@/components/behar/primitives";
import { RevenueChart } from "@/components/behar/revenue-chart";
import {
  formatEuro,
  formatIsoToDisplay,
  isTerminalRepairStatus,
  normalizeAppointmentStatus,
  type Repair,
  type RepairStatus,
  useBeharStore,
} from "@/lib/behar-store";
import { formatDeviceLabel } from "@/lib/format-device";
import { computeReconditioningKpis, useReconditioningStore } from "@/lib/reconditioning-store";
import type { RepairCard } from "@/mock/repairs";

// Action principale dynamique du panneau détail (même logique que le comptoir).
const DASHBOARD_NEXT_STATUS: Partial<Record<RepairStatus, { next: RepairStatus; label: string }>> = {
  Reçu: { next: "Diagnostic", label: "Passer en diagnostic" },
  Diagnostic: { next: "En attente", label: "Mettre en attente" },
  "En attente": { next: "En réparation", label: "Passer en réparation" },
  "Devis accepté": { next: "En réparation", label: "Passer en réparation" },
  "En réparation": { next: "Test final", label: "Passer en test final" },
  "Test final": { next: "Prêt", label: "Marquer prêt" },
};

const repairActivityTime = (repair: Pick<Repair, "updatedAt" | "droppedAt" | "createdAt">) =>
  Date.parse(repair.updatedAt || repair.droppedAt || repair.createdAt || "") || 0;

export function DashboardWorkspace() {
  const store = useBeharStore();
  const reconditioningFiles = useReconditioningStore((s) => s.files);
  const recondKpis = computeReconditioningKpis(reconditioningFiles);
  const selected = store.repairs.find((repair) => repair.id === store.selectedRepairId) ?? store.repairs[0];
  const customer = selected ? store.customers.find((entry) => entry.id === selected.customerId) : undefined;
  const issuedInvoices = store.invoices.filter((invoice) => !["Brouillon", "Annulée"].includes(invoice.status));
  const billedAmount = issuedInvoices.reduce(
    (total, invoice) => total + invoice.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
    0,
  );
  const today = displayDate(new Date());
  const todayIsoLocal = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const todaysAppointmentRows = store.appointments
    .filter(
      (appointment) =>
        (appointment.date === today || appointment.date === todayIsoLocal) &&
        normalizeAppointmentStatus(appointment.status, appointment.confirmed) !== "Annulé" &&
        normalizeAppointmentStatus(appointment.status, appointment.confirmed) !== "Non venu",
    )
    .sort((a, b) => a.time.localeCompare(b.time));
  const todaysAppointments = todaysAppointmentRows.length;
  const activeRepairs = store.repairs.filter(
    (repair) => repair.status !== "Prêt" && !isTerminalRepairStatus(repair.status),
  );
  const todayRepairs = store.repairs.filter(
    (repair) => (repair.droppedAt || repair.createdAt || "").slice(0, 10) === todayIsoLocal,
  );
  const readyRepairs = store.repairs.filter((repair) => repair.status === "Prêt");
  const todayInvoices = issuedInvoices.filter(
    (invoice) => (invoice.date || invoice.createdAt || "").includes(todayIsoLocal) || invoice.date === today,
  );
  const lowStockItems = store.stockItems.filter((item) => item.stock <= item.threshold);
  const pendingQuotes = store.quotes.filter((quote) => quote.status === "Envoyé" || quote.status === "Brouillon");
  const blockedRepairs = activeRepairs.filter((repair) =>
    isOlderThanDays(repair.updatedAt || repair.droppedAt || repair.createdAt, 3),
  );
  const relatedQuotes = selected ? store.quotes.filter((quote) => quote.repairId === selected.id) : [];
  const canViewAuditLog = store.hasPermission("canViewAuditLog");
  const recentAuditLogs = [...store.auditLogs].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1)).slice(0, 5);
  const relatedInvoices = selected ? store.invoices.filter((invoice) => invoice.repairId === selected.id) : [];
  const selectedQuoteAmount = relatedQuotes[0]
    ? relatedQuotes[0].lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
    : 0;
  const selectedInvoiceAmount = relatedInvoices[0]
    ? relatedInvoices[0].lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
    : 0;
  // Montant affiché dans le panneau détail : tarif du dossier, sinon facture/devis lié.
  const selectedRepairTotal = selected
    ? typeof selected.total === "number"
      ? selected.total
      : (selected.amount ?? 0)
    : 0;
  const selectedMontant = selectedRepairTotal > 0 ? selectedRepairTotal : selectedInvoiceAmount || selectedQuoteAmount;
  // KPI secondaires : une seule ligne, navigation par flèches (les KPI financiers vivent dans FinanceOverview).
  const secondaryKpis: Array<{ label: string; value: string; href: string; icon: LucideIcon }> = [
    {
      label: "Réparations en cours",
      value: String(activeRepairs.length),
      href: "/dashboard/reparations",
      icon: Wrench,
    },
    { label: "Dossiers prêts", value: String(readyRepairs.length), href: "/dashboard/reparations", icon: CheckCheck },
    { label: "Dossiers du jour", value: String(todayRepairs.length), href: "/dashboard/dossiers", icon: FolderOpen },
    { label: "RDV du jour", value: String(todaysAppointments), href: "/dashboard/rendez-vous", icon: CalendarDays },
    {
      label: "Factures émises aujourd'hui",
      value: String(todayInvoices.length),
      href: "/dashboard/factures",
      icon: FileText,
    },
    {
      label: "CA facturé",
      value: formatEuro(billedAmount),
      href: "/dashboard/factures",
      icon: FileText,
    },
    { label: "Devis en attente", value: String(pendingQuotes.length), href: "/dashboard/devis", icon: FileText },
    { label: "Stock faible", value: String(lowStockItems.length), href: "/dashboard/stock", icon: Package },
    {
      label: "Dossiers bloqués",
      value: String(blockedRepairs.length),
      href: "/dashboard/reparations",
      icon: AlertTriangle,
    },
  ];
  const repairFlowStatuses: RepairStatus[] = [
    "Reçu",
    "Diagnostic",
    "Devis accepté",
    "En réparation",
    "Test final",
    "Prêt",
  ];
  // Mini kanban du flux : une colonne par étape, cartes triées par activité récente.
  const repairFlowColumns = repairFlowStatuses.map((status) => {
    const rows = store.repairs
      .filter((repair) => repair.status === status)
      .sort((a, b) => repairActivityTime(b) - repairActivityTime(a));
    return {
      title: status,
      count: rows.length,
      cards: rows.map((repair) => {
        const repairCustomer = store.customers.find((entry) => entry.id === repair.customerId);
        const total = typeof repair.total === "number" ? repair.total : (repair.amount ?? 0);
        return {
          id: repair.id,
          shop_id: repair.shopId,
          number: repair.number,
          device: formatDeviceLabel(repair),
          issue: repair.issue,
          customer: repairCustomer?.name || "Client comptoir",
          time: formatIsoToDisplay(repair.updatedAt || repair.droppedAt || repair.createdAt || ""),
          status: repair.status,
          totalLabel: total > 0 ? formatEuro(total) : undefined,
          showReadyBadge: repair.status === "Prêt",
        } satisfies RepairCard;
      }),
    };
  });

  return (
    <div className="hidden space-y-6 md:block">
      {/* Action rapide — nouvelle prise en charge. */}
      <section className="flex flex-wrap items-center gap-2.5">
        <Link href="/dashboard/reparations?create=1" prefetch={false}>
          <PrimaryButton className="h-11 gap-2 px-4">
            <Plus className="size-4" />
            Nouvelle prise en charge
          </PrimaryButton>
        </Link>
      </section>

      {/* Volet facturation : montants des factures emises, sans resultat de reglement. */}
      <FinanceOverview />

      {/* KPI secondaires : une ligne, flèches pour faire défiler. */}
      <SecondaryKpiStrip items={secondaryKpis} />

      {reconditioningFiles.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-[#101828] text-[17px] tracking-tight">Reconditionnement</h2>
            <Link
              className="text-[#667085] text-[12px] transition-colors hover:text-[#101828]"
              href="/dashboard/reconditionnement"
            >
              Ouvrir le module →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Link
              href="/dashboard/reconditionnement"
              className="flex min-h-[92px] items-center gap-3 rounded-[14px] border border-[#E4E7EC] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.04)] transition hover:border-[#2A9D8F]/40"
            >
              <span className="grid size-8 shrink-0 place-items-center text-[#2A9D8F]">
                <CheckCheck className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <b className="truncate text-[#101828] text-sm">Prêts à vendre</b>
                  <strong className="text-[#101828] text-lg tabular-nums">{recondKpis.prets}</strong>
                </span>
                <span className="mt-1 block truncate text-[#667085] text-xs">téléphones reconditionnés</span>
              </span>
            </Link>
            <Link
              href="/dashboard/reconditionnement"
              className="flex min-h-[92px] items-center gap-3 rounded-[14px] border border-[#E4E7EC] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.04)] transition hover:border-[#2A9D8F]/40"
            >
              <span className="grid size-8 shrink-0 place-items-center text-[#2A9D8F]">
                <Package className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <b className="truncate text-[#101828] text-sm">Valeur stock</b>
                  <strong className="text-[#101828] text-lg tabular-nums">{formatEuro(recondKpis.valeurStock)}</strong>
                </span>
                <span className="mt-1 block truncate text-[#667085] text-xs">potentiel (non vendu)</span>
              </span>
            </Link>
            <Link
              href="/dashboard/reconditionnement"
              className="flex min-h-[92px] items-center gap-3 rounded-[14px] border border-[#E4E7EC] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.04)] transition hover:border-[#2A9D8F]/40"
            >
              <span className="grid size-8 shrink-0 place-items-center text-[#2A9D8F]">
                <TrendingUp className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <b className="truncate text-[#101828] text-sm">Marge potentielle</b>
                  <strong className="text-[#101828] text-lg tabular-nums">
                    {formatEuro(recondKpis.margeEstimeeTotale)}
                  </strong>
                </span>
                <span className="mt-1 block truncate text-[#667085] text-xs">estimée, non vendus</span>
              </span>
            </Link>
            <Link
              href="/dashboard/reconditionnement"
              className="flex min-h-[92px] items-center gap-3 rounded-[14px] border border-[#E4E7EC] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.04)] transition hover:border-[#2A9D8F]/40"
            >
              <span
                className={`grid size-8 shrink-0 place-items-center ${recondKpis.bloques > 0 ? "text-[#B4342A]" : "text-[#2A9D8F]"}`}
              >
                <AlertTriangle className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <b className="truncate text-[#101828] text-sm">Bloqués</b>
                  <strong className="text-[#101828] text-lg tabular-nums">{recondKpis.bloques}</strong>
                </span>
                <span className="mt-1 block truncate text-[#667085] text-xs">à débloquer / décider</span>
              </span>
            </Link>
          </div>
        </section>
      )}

      <Panel className="p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[#101828] text-[17px] tracking-tight">Entrées prévues aujourd'hui</h2>
            <p className="mt-1 text-[#667085] text-[13px]">
              Appareils attendus à l'atelier, séparés des réparations réelles.
            </p>
          </div>
          <Link
            className="inline-flex items-center gap-1.5 text-[#667085] text-[13px] transition-colors hover:text-[#667085]"
            href="/dashboard/rendez-vous"
          >
            Tous les RDV
            <ArrowRight className="size-4" />
          </Link>
        </div>
        {todaysAppointmentRows.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[#E4E7EC] bg-[#FFFFFF] px-4 py-6 text-center text-[#667085] text-sm">
            Aucun appareil prévu aujourd'hui.
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-3">
            {todaysAppointmentRows.slice(0, 6).map((appointment) => {
              const customer = store.customers.find((entry) => entry.id === appointment.customerId);
              const linkedRepair =
                store.repairs.find((repair) => repair.id === appointment.repairId) ??
                store.repairs.find((repair) => repair.appointmentId === appointment.id);
              const status = normalizeAppointmentStatus(
                appointment.status,
                appointment.confirmed,
                Boolean(linkedRepair),
              );
              const canMarkArrived =
                !linkedRepair && status !== "Arrivé" && status !== "Annulé" && status !== "Non venu";
              const canCreateRepair = !linkedRepair && status === "Arrivé";
              return (
                <div className="rounded-[16px] border border-[#E4E7EC] bg-[#FFFFFF] p-4" key={appointment.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono font-semibold text-[#101828] text-sm">{appointment.time || "—"}</p>
                      <p className="mt-1 truncate font-semibold text-[#101828] text-sm">
                        {customer?.name || "Client comptoir"}
                      </p>
                    </div>
                    <AppointmentBadge status={status} />
                  </div>
                  <p className="mt-3 truncate font-medium text-[#101828] text-sm">{appointment.device}</p>
                  <p className="mt-1 truncate text-[#667085] text-[13px]">{appointment.issue}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {linkedRepair ? (
                      <Link
                        className="col-span-2 inline-flex h-9 items-center justify-center gap-2 rounded-[12px] bg-[#2A9D8F] px-3 font-semibold text-white text-xs"
                        href="/dashboard/reparations"
                        onClick={() => store.setSelected("repair", linkedRepair.id)}
                      >
                        <Wrench className="size-3.5" />
                        Ouvrir réparation liée
                      </Link>
                    ) : (
                      <>
                        <button
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-[12px] border border-[#E4E7EC] bg-white px-3 font-medium text-[#101828] text-xs disabled:cursor-not-allowed disabled:opacity-45"
                          disabled={!canMarkArrived}
                          onClick={() => {
                            store.updateAppointment(appointment.id, { confirmed: true, status: "Arrivé" });
                            toast.success("Client marqué comme arrivé");
                          }}
                          type="button"
                        >
                          <CheckCheck className="size-3.5" />
                          Marquer arrivé
                        </button>
                        <button
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-[12px] border border-[#E4E7EC] bg-white px-3 font-medium text-[#101828] text-xs disabled:cursor-not-allowed disabled:opacity-45"
                          disabled={!canCreateRepair}
                          onClick={() => {
                            const repairId = store.createRepairFromAppointment(appointment.id);
                            if (!repairId) {
                              toast.error("Réparation déjà liée ou impossible à créer");
                              return;
                            }
                            store.setSelected("repair", repairId);
                            toast.success("Réparation créée depuis le rendez-vous");
                          }}
                          type="button"
                        >
                          <Wrench className="size-3.5" />
                          Créer réparation
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <section className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel className="flex h-[500px] min-w-0 flex-col p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-[#101828] text-[17px] tracking-tight">Flux des réparations</h2>
            <Link
              className="inline-flex items-center gap-1.5 text-[#667085] text-[13px] hover:text-[#667085] transition-colors"
              href="/dashboard/reparations"
            >
              Voir toutes les réparations
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <KanbanBoard
              compact
              columns={repairFlowColumns}
              onSelect={(id) => store.setSelected("repair", id)}
              selectedId={selected?.id ?? ""}
              onMoveCard={(cardId, _from, toStatus) => {
                if (!repairFlowStatuses.includes(toStatus as RepairStatus)) return;
                store.changeRepairStatus(cardId, toStatus as RepairStatus);
                toast.success(`Statut : ${toStatus}`);
              }}
            />
          </div>
        </Panel>

        {selected && customer && (
          <Panel className="p-5">
            <div className="mb-5 flex items-start justify-between">
              <h2 className="font-semibold text-[#101828] text-[17px] tracking-tight">{selected.device}</h2>
              <Link
                aria-label="Ouvrir le dossier réparation"
                className="rounded-full p-1 text-[#667085] transition hover:bg-[#FFFFFF] hover:text-[#101828]"
                href={`/dashboard/dossiers/_/?id=${selected.id}`}
                onClick={() => store.setSelected("repair", selected.id)}
              >
                <MoreHorizontal className="size-5" />
              </Link>
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
                emphasize
                label="Montant"
                value={selectedMontant > 0 ? formatEuro(selectedMontant) : "À chiffrer"}
              />
            </dl>

            {(() => {
              const nextStep = DASHBOARD_NEXT_STATUS[selected.status];
              return (
                <div className="mt-5 space-y-2">
                  {nextStep ? (
                    <PrimaryButton
                      className="w-full"
                      onClick={() => {
                        store.changeRepairStatus(selected.id, nextStep.next);
                        toast.success(`Dossier passé en « ${nextStep.next} ».`);
                      }}
                    >
                      {nextStep.label}
                    </PrimaryButton>
                  ) : null}
                  <Link
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-[12px] border border-[#E4E7EC] bg-white px-3 font-medium text-[#101828] text-[13px] transition hover:border-[#2A9D8F]/40"
                    href={`/dashboard/dossiers/_/?id=${selected.id}`}
                    onClick={() => store.setSelected("repair", selected.id)}
                  >
                    <FolderOpen className="size-4" />
                    Ouvrir le dossier
                  </Link>
                </div>
              );
            })()}
          </Panel>
        )}
      </section>

      <Panel className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-[#101828] text-[17px] tracking-tight">Factures émises par jour</h2>
          <span className="text-[#667085] text-[13px]">30 derniers jours</span>
        </div>
        <RevenueChart />
      </Panel>

      {canViewAuditLog && (
        <Panel className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-[#101828] text-[17px] tracking-tight">Activité récente</h2>
            <span className="text-[#667085] text-[12px]">{recentAuditLogs.length} actions</span>
          </div>
          {recentAuditLogs.length === 0 ? (
            <p className="rounded-[12px] bg-[#FFFFFF] px-4 py-5 text-center text-[#667085] text-sm">
              Aucune activité tracée pour le moment.
            </p>
          ) : (
            <div className="divide-y divide-[#E4E7EC]">
              {recentAuditLogs.map((entry) => (
                <div className="flex items-start justify-between gap-4 py-3" key={entry.id}>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#101828] text-sm">{entry.message}</p>
                    <p className="mt-1 text-[#667085] text-xs">
                      {entry.actorName} · {entry.action}
                    </p>
                  </div>
                  <span className="shrink-0 text-[#98A2B3] text-xs">{entry.createdAt}</span>
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

function isOlderThanDays(value: string | undefined, days: number) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp > days * 24 * 60 * 60 * 1000;
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

const DASHBOARD_TESTIDS: Record<string, string> = {
  Dossiers: "dashboard-active-repairs-card",
  "Dossiers en cours": "dashboard-active-repairs-card",
  "Réparations prêtes": "dashboard-ready-repairs-card",
  "Devis en attente": "dashboard-pending-quotes-card",
  Devis: "dashboard-pending-quotes-card",
  "CA facturé": "dashboard-billed-revenue-card",
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

function AppointmentBadge({ status }: Readonly<{ status: string }>) {
  const tone =
    status === "Arrivé" || status === "Réparation créée"
      ? "bg-[#FFFFFF] text-[#0B7A56]"
      : status === "Annulé" || status === "Non venu"
        ? "bg-[#FFFFFF] text-[#B42318]"
        : status === "Confirmé"
          ? "bg-[#FFFFFF] text-[#167B70]"
          : "bg-[#FFFFFF] text-[#667085]";
  return <span className={`shrink-0 rounded-full px-2.5 py-1 font-semibold text-[11px] ${tone}`}>{status}</span>;
}

/** Ligne de KPI secondaires : 4 visibles à la fois, flèches gauche/droite pour faire défiler. */
function SecondaryKpiStrip({
  items,
}: Readonly<{ items: Array<{ label: string; value: string; href: string; icon: LucideIcon }> }>) {
  const pageSize = 4;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const [page, setPage] = useState(0);
  const visible = items.slice(page * pageSize, page * pageSize + pageSize);
  const canNavigate = pageCount > 1;

  return (
    <section className="flex items-center gap-2" data-testid="dashboard-secondary-kpis">
      <button
        aria-label="KPI précédents"
        className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-[#E4E7EC] bg-white text-[#667085] transition hover:border-[#2A9D8F]/40 hover:text-[#101828] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!canNavigate}
        onClick={() => setPage((current) => (current - 1 + pageCount) % pageCount)}
        type="button"
      >
        <ChevronLeft className="size-4" />
      </button>
      <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 xl:grid-cols-4">
        {visible.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              className="flex h-11 min-w-0 items-center gap-2.5 rounded-[12px] border border-[#E4E7EC] bg-white px-3.5 transition hover:border-[#2A9D8F]/40"
              data-testid={dashboardTestId(item.label)}
              href={item.href}
              key={item.label}
            >
              <Icon className="size-4 shrink-0 text-[#667085]" />
              <span className="min-w-0 flex-1 truncate text-[#667085] text-[13px]">{item.label}</span>
              <span className="shrink-0 font-semibold text-[#101828] text-sm tabular-nums">{item.value}</span>
            </Link>
          );
        })}
      </div>
      <button
        aria-label="KPI suivants"
        className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-[#E4E7EC] bg-white text-[#667085] transition hover:border-[#2A9D8F]/40 hover:text-[#101828] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!canNavigate}
        onClick={() => setPage((current) => (current + 1) % pageCount)}
        type="button"
      >
        <ChevronRight className="size-4" />
      </button>
    </section>
  );
}
