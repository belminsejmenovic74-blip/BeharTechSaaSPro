"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertCircle,
  Banknote,
  CalendarCheck,
  Check,
  Clock,
  CreditCard,
  Download,
  FileText,
  Landmark,
  Link2,
  MoreHorizontal,
  Plus,
  Printer,
  RotateCcw,
  Search,
  SlidersHorizontal,
  User,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  DetailRow,
  Input,
  Modal,
  Panel,
  PrimaryButton,
  SecondaryButton,
  Select,
  Textarea,
  Timeline,
} from "@/components/behar/primitives";
import { PAYMENT_STATUS_TONE, type PillTone, StatusPill, TabBar } from "@/components/behar/ui-pills";
import { formatEuro, getInvoiceTotal, type PaymentMethod, type PaymentStatus, useBeharStore } from "@/lib/behar-store";
import { displayCustomerName } from "@/lib/customer-display";
import { cn } from "@/lib/utils";

import { useDocument } from "./print-provider";

const statuses: PaymentStatus[] = ["Payé", "Annulé", "Remboursé"];

type MethodFilter = "all" | PaymentMethod;

const METHOD_TABS: ReadonlyArray<{ value: MethodFilter; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "TPE externe", label: "TPE externe" },
  { value: "Espèces hors Behar Tech", label: "Espèces ext." },
  { value: "Virement", label: "Virement" },
  { value: "Lien externe", label: "Lien externe" },
];

type KpiTone = "teal" | "amber" | "blue" | "violet" | "rose";

function formatPaymentMethodLabel(method: PaymentMethod): string {
  if (method === "Carte") return "TPE externe";
  if (method === "Espèces") return "Espèces hors Behar Tech";
  if (method === "En ligne") return "Lien externe";
  return method;
}

const KPI_TONES: Record<KpiTone, { bg: string; text: string }> = {
  teal: { bg: "bg-[#E7F5F1]", text: "text-[#2A9D8F]" },
  amber: { bg: "bg-[#FAFAFA]", text: "text-[#6B6B6B]" },
  blue: { bg: "bg-[#FAFAFA]", text: "text-[#6B6B6B]" },
  violet: { bg: "bg-[#FAFAFA]", text: "text-[#6B6B6B]" },
  rose: { bg: "bg-[#FCEAEC]", text: "text-[#C7494E]" },
};

function KpiCard({
  label,
  value,
  helper,
  tone,
  icon: Icon,
}: Readonly<{
  label: string;
  value: string;
  helper?: string;
  tone: KpiTone;
  icon: typeof Wallet;
}>) {
  const t = KPI_TONES[tone];
  return (
    <div className="rounded-[18px] border border-[#EAE7DF] bg-white p-5 shadow-[0_4px_14px_rgba(26,25,22,0.025)]">
      <div className="flex items-center gap-3">
        <span className={cn("grid size-9 place-items-center rounded-[10px]", t.bg, t.text)}>
          <Icon className="size-[18px]" />
        </span>
        <span className="text-[#6B6B6B] text-sm">{label}</span>
      </div>
      <div className="mt-4 font-semibold text-[#1A1916] text-[24px] leading-none tracking-tight">{value}</div>
      {helper && <div className="mt-2 text-[#6B6B6B] text-xs">{helper}</div>}
    </div>
  );
}

const isToday = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return false;
  const now = new Date();
  return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth() && dt.getDate() === now.getDate();
};

export function PaymentsWorkspace() {
  const router = useRouter();
  const store = useBeharStore();
  const { print, download } = useDocument();
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [filterOverdue, setFilterOverdue] = useState(false);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return store.payments.filter((p) => {
      if (methodFilter !== "all" && p.method !== methodFilter) return false;

      if (filterOverdue) {
        const invoice = store.invoices.find((inv) => inv.id === p.invoiceId);
        // On masque les paiements dont la facture est déjà marquée comme "Payée"
        if (invoice && invoice.status === "Payée") return false;
        // On masque aussi les paiements qui sont déjà réussis
        if (p.status === "Payé") return false;
      }

      if (!q) return true;
      const customer = store.customers.find((c) => c.id === p.customerId);
      const sale = store.sales.find((s) => s.id === p.saleId);
      const haystack = [p.paymentNumber, p.method, customer?.name ?? "", p.reference, p.note ?? "", sale?.number ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [store.payments, store.customers, methodFilter, search, filterOverdue]);

  const selected =
    store.payments.find((payment) => payment.id === store.selectedPaymentId) ??
    filteredPayments[0] ??
    store.payments[0];
  const customer = selected ? store.customers.find((entry) => entry.id === selected.customerId) : undefined;
  const repair = selected ? store.repairs.find((entry) => entry.id === selected.repairId) : undefined;
  const invoice = selected ? store.invoices.find((entry) => entry.id === selected.invoiceId) : undefined;
  const sale = selected ? store.sales.find((entry) => entry.id === selected.saleId) : undefined;
  const paid = store.payments.filter((payment) => payment.status === "Payé");
  const totalEncaisse = paid.reduce((total, payment) => total + payment.amount, 0);
  const todayCount = paid.filter((p) => isToday(p.date)).length;
  const todayAmount = paid.filter((p) => isToday(p.date)).reduce((sum, p) => sum + p.amount, 0);
  const pendingTotal = store.invoices
    .filter((inv) => inv.status !== "Payée" && inv.status !== "Annulée")
    .reduce((sum, inv) => sum + inv.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0), 0);
  const overdueTotal = 0;

  /** Pré-remplissage depuis le contexte Réparations / Factures lorsque le modal s’ouvre. */
  const selectedRepairPreset = store.selectedRepairId;
  const selectedInvoicePreset = store.selectedInvoiceId;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <PrimaryButton onClick={() => setModalOpen(true)}>
          <Plus className="size-4" /> Ajouter un paiement
        </PrimaryButton>
      </div>

      <CreatePaymentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        presetInvoiceId={selectedInvoicePreset}
        presetRepairId={selectedRepairPreset}
      />

      {/* Mobile : strip horizontal de KPI compacts */}
      <section className="grid max-w-full min-w-0 gap-3 pb-1 min-[360px]:flex min-[360px]:overflow-x-auto md:hidden scrollbar-none">
        <MobileKpi label="Règlements ce mois" value={formatEuro(totalEncaisse)} helper="factures réglées" tone="teal" />
        <MobileKpi label="En attente" value={formatEuro(pendingTotal)} helper="à régler" tone="amber" />
        <MobileKpi label="Aujourd'hui" value={formatEuro(todayAmount)} helper={`${todayCount} règlements`} tone="teal" />
      </section>

      <section className="hidden md:grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total réglé"
          value={formatEuro(totalEncaisse)}
          helper="factures réglées"
          tone="teal"
          icon={Wallet}
        />
        <KpiCard
          label="En attente"
          value={formatEuro(pendingTotal)}
          helper="factures non réglées"
          tone="amber"
          icon={Clock}
        />
        <KpiCard
          label="En retard"
          value={formatEuro(overdueTotal)}
          helper="à relancer"
          tone="rose"
          icon={AlertCircle}
        />
        <KpiCard
          label="Paiements du jour"
          value={`${todayCount} · ${formatEuro(todayAmount)}`}
          helper="aujourd'hui"
          tone="blue"
          icon={CalendarCheck}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              <div className="w-full min-w-0 overflow-x-auto pb-1 sm:w-auto sm:pb-0 scrollbar-none">
                <TabBar tabs={METHOD_TABS} value={methodFilter} onChange={setMethodFilter} />
              </div>
              <label className="relative block w-full min-w-0 max-w-[280px]">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#6B6B6B]" />
                <input
                  className="h-10 w-full rounded-[12px] border border-[#E8E8E5] bg-white pr-4 pl-10 text-sm outline-none transition placeholder:text-[#6B6B6B] focus:border-[#2A9D8F]/55 focus:ring-4 focus:ring-[#2A9D8F]/10"
                  placeholder="Rechercher un paiement, client..."
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            </div>
            <SecondaryButton
              className={cn("w-full sm:w-auto", filterOverdue ? "border-[#B42318] bg-[#FFF1F0] text-[#B42318]" : "")}
              onClick={() => setFilterOverdue(!filterOverdue)}
            >
              <SlidersHorizontal className="size-4" />
              {filterOverdue ? "À régler uniquement" : "Tous les règlements"}
            </SecondaryButton>
          </div>

          <div className="overflow-hidden rounded-[18px] border border-[#EAE7DF] bg-white shadow-[0_4px_14px_rgba(26,25,22,0.025)]">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead className="bg-[#FAFAFA] text-[#6B6B6B] text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Référence</th>
                    <th className="px-4 py-3 text-left font-medium">Client</th>
                    <th className="px-4 py-3 text-left font-medium">Facture</th>
                    <th className="px-4 py-3 text-left font-medium">Réparation</th>
                    <th className="px-4 py-3 text-left font-medium">Mode</th>
                    <th className="px-4 py-3 text-right font-medium">Montant</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Statut</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-14 text-center text-[#6B6B6B]">
                        Aucun paiement pour ces critères.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((payment) => {
                      const entryCustomer = store.customers.find((entry) => entry.id === payment.customerId);
                      const entryInvoice = store.invoices.find((entry) => entry.id === payment.invoiceId);
                      const entrySale = store.sales.find((entry) => entry.id === payment.saleId);
                      const entryRepair = payment.repairId
                        ? store.repairs.find((r) => r.id === payment.repairId)
                        : entryInvoice?.repairId
                          ? store.repairs.find((r) => r.id === entryInvoice.repairId)
                          : undefined;
                      const active = payment.id === selected?.id;
                      return (
                        <tr
                          className={cn(
                            "cursor-pointer border-[#E8E8E5] border-t transition hover:bg-[#FAFAFA]",
                            active && "bg-[#E7F5F1]",
                          )}
                          key={payment.id}
                          onClick={() => store.setSelected("payment", payment.id)}
                        >
                          <td className="px-4 py-3 font-mono text-[#2A9D8F] text-[12.5px]">{payment.paymentNumber}</td>
                          <td className="px-4 py-3 text-[#1A1916]">{displayCustomerName(entryCustomer)}</td>
                          <td className="px-4 py-3 text-[#6B6B6B]">
                            {entryInvoice?.number ?? entrySale?.number ?? "—"}
                          </td>
                          <td className="max-w-[200px] truncate px-4 py-3 text-[#6B6B6B]">
                            {entryRepair ? `${entryRepair.number} · ${entryRepair.device}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-[#1A1916]">{formatPaymentMethodLabel(payment.method)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-[#1A1916]">
                            {formatEuro(payment.amount)}
                          </td>
                          <td className="px-4 py-3 text-[#6B6B6B]">{payment.date}</td>
                          <td className="px-4 py-3">
                            <StatusPill tone={PAYMENT_STATUS_TONE[payment.status] as PillTone}>
                              {payment.status}
                            </StatusPill>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              className="grid size-7 place-items-center rounded-md text-[#6B6B6B] hover:bg-[#F7F7F7] hover:text-[#1A1916]"
                              onClick={(event) => event.stopPropagation()}
                              aria-label="Plus d'options"
                            >
                              <MoreHorizontal className="size-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {/* Vue cartes mobile premium */}
            <div className="md:hidden space-y-2.5 bg-[#FAFAFA] p-3">
              {filteredPayments.length === 0 ? (
                <p className="rounded-[16px] bg-white px-4 py-10 text-center text-[#6B6B6B] text-sm shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
                  Aucun paiement.
                </p>
              ) : (
                filteredPayments.map((payment) => {
                  const entryCustomer = store.customers.find((entry) => entry.id === payment.customerId);
                  const entryInvoice = store.invoices.find((entry) => entry.id === payment.invoiceId);
                  const entrySale = store.sales.find((entry) => entry.id === payment.saleId);
                  return (
                    <button
                      key={payment.id}
                      onClick={() => store.setSelected("payment", payment.id)}
                      className="block w-full rounded-[18px] bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(26,25,22,0.04)] transition active:scale-[0.99]"
                      type="button"
                    >
                      <div className="flex items-start gap-3">
                        <PaymentMethodTile method={payment.method} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate font-semibold text-[#1A1916] text-[14px] tracking-tight">
                              {displayCustomerName(entryCustomer)}
                            </p>
                            <p className="shrink-0 font-bold text-[#1A1916] text-[15px] tabular-nums">
                              {formatEuro(payment.amount)}
                            </p>
                          </div>
                          <p className="mt-0.5 font-mono text-[#2A9D8F] text-[11px]">{payment.paymentNumber}</p>
                          <p className="mt-0.5 truncate text-[#6B6B6B] text-[11.5px]">
                            {entryInvoice?.number ?? entrySale?.number ?? "—"} · {payment.date}
                          </p>
                          {payment.status !== "Payé" && (
                            <div className="mt-2">
                              <StatusPill tone={PAYMENT_STATUS_TONE[payment.status] as PillTone}>
                                {payment.status}
                              </StatusPill>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {selected && (
          <Panel className="rounded-[18px] border-[#EAE7DF] p-5 shadow-[0_4px_14px_rgba(26,25,22,0.025)]">
            <div className="mb-5">
              <p className="text-[#6B6B6B] text-xs">Transaction</p>
              <h2 className="mt-1 font-semibold text-[#1A1916] text-xl">{selected.paymentNumber}</h2>
              <div className="mt-3">
                <StatusPill tone={PAYMENT_STATUS_TONE[selected.status] as PillTone}>{selected.status}</StatusPill>
              </div>
            </div>

            <div className="mb-5 rounded-[14px] bg-[#FAFAFA] p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center text-[#2A9D8F]">
                  <CreditCard className="size-5" />
                </span>
                <div>
                  <p className="text-[#6B6B6B] text-xs">Montant réglé</p>
                  <p className="font-semibold text-2xl text-[#1A1916]">{formatEuro(selected.amount)}</p>
                </div>
              </div>
            </div>

            <dl className="divide-y divide-[#E8E8E5]">
              <DetailRow
                label="Client"
                value={
                  <Link
                    href={`/dashboard/clients?id=${customer?.id}`}
                    className="font-semibold text-[#1A1916] hover:text-[#2A9D8F] transition-colors"
                  >
                    {displayCustomerName(customer ?? undefined)}
                  </Link>
                }
              />
              <DetailRow
                label="Facture"
                value={
                  invoice ? (
                    <Link
                      href="/dashboard/factures"
                      onClick={() => store.setSelected("invoice", invoice.id)}
                      className="font-semibold text-[#2A9D8F] hover:underline"
                    >
                      {invoice.number}
                    </Link>
                  ) : sale ? (
                    <Link
                      href="/dashboard/ventes"
                      onClick={() => store.setSelected("sale", sale.id)}
                      className="font-semibold text-[#2A9D8F] hover:underline"
                    >
                      Vente {sale.number}
                    </Link>
                  ) : (
                    "Non liée"
                  )
                }
              />
              <DetailRow
                label="Réparation"
                value={
                  repair ? (
                    <Link
                      href="/dashboard/reparations"
                      onClick={() => store.setSelected("repair", repair.id)}
                      className="font-semibold text-[#1A1916] hover:text-[#2A9D8F] transition-colors"
                    >
                      {repair.device} - {repair.issue}
                    </Link>
                  ) : (
                    "Non liée"
                  )
                }
              />
              <DetailRow label="Méthode" value={formatPaymentMethodLabel(selected.method)} />
              <DetailRow
                label="Statut"
                value={
                  <select
                    className="rounded-[8px] border border-[#E8E8E5] bg-white px-2 py-1 text-sm"
                    onChange={(event) => {
                      store.updatePaymentStatus(selected.id, event.target.value as PaymentStatus);
                      toast.success("Statut paiement mis à jour");
                    }}
                    value={selected.status}
                  >
                    {statuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                }
              />
              <DetailRow label="Date" value={selected.date} />
              {selected.note && <DetailRow label="Note" value={selected.note} />}
            </dl>

            <div className="mt-5 grid gap-2 border-[#E8E8E5] border-t pt-4">
              <PrimaryButton
                className="w-full"
                onClick={() => {
                  if (selected.status === "Payé") {
                    toast.info("Ce paiement est déjà marqué payé");
                    return;
                  }
                  store.updatePaymentStatus(selected.id, "Payé");
                  toast.success("Paiement marqué payé");
                }}
              >
                <Link2 className="size-4" />
                Marquer payé
              </PrimaryButton>
              <SecondaryButton
                className="w-full text-[#B42318]"
                onClick={() => {
                  if (selected.status === "Annulé") {
                    toast.info("Paiement déjà annulé");
                    return;
                  }
                  setConfirmCancelId(selected.id);
                }}
              >
                <RotateCcw className="size-4" />
                Annuler le paiement
              </SecondaryButton>
              {confirmCancelId === selected.id && (
                <div className="rounded-[12px] border border-[#F2C8C3] bg-[#FFF7F6] p-3 text-sm">
                  <p className="font-semibold text-[#7A271A]">Annuler ce paiement ?</p>
                  <p className="mt-1 text-[#7A271A]/75">La facture liée sera recalculée automatiquement.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <SecondaryButton className="h-9" onClick={() => setConfirmCancelId(null)}>
                      Garder
                    </SecondaryButton>
                    <PrimaryButton
                      className="h-9 bg-[#B42318] shadow-none hover:bg-[#9F1F16]"
                      onClick={() => {
                        store.updatePaymentStatus(selected.id, "Annulé");
                        setConfirmCancelId(null);
                        toast.success("Paiement annulé");
                      }}
                    >
                      Confirmer
                    </PrimaryButton>
                  </div>
                </div>
              )}
              <SecondaryButton
                className="w-full"
                onClick={() => {
                  if (selected) download("payment", selected.id);
                }}
              >
                <Download className="size-4" />
                Télécharger reçu PDF
              </SecondaryButton>
              <SecondaryButton
                className="w-full"
                onClick={() => {
                  if (selected) print("payment", selected.id);
                }}
              >
                <Printer className="size-4" />
                Imprimer reçu
              </SecondaryButton>
              {selected.invoiceId && (
                <SecondaryButton
                  className="w-full"
                  onClick={() => {
                    store.setSelected("invoice", selected.invoiceId || "");
                    router.push("/dashboard/factures");
                  }}
                >
                  <FileText className="size-4" />
                  Voir la facture liée
                </SecondaryButton>
              )}
            </div>

            <div className="mt-5 border-[#E8E8E5] border-t pt-4">
              <h3 className="mb-3 font-semibold text-[#1A1916] text-sm">Historique</h3>
              <Timeline
                items={[
                  "Lien envoyé",
                  selected.status === "Payé" ? "Paiement reçu" : `Paiement ${selected.status.toLowerCase()}`,
                  "Confirmation",
                ]}
              />
            </div>
          </Panel>
        )}
      </section>
    </div>
  );
}

function CreatePaymentModal({
  isOpen,
  onClose,
  presetInvoiceId,
  presetRepairId,
}: Readonly<{
  isOpen: boolean;
  onClose: () => void;
  presetInvoiceId: string;
  presetRepairId: string;
}>) {
  const store = useBeharStore();
  const [sourceType, setSourceType] = useState<"invoice" | "repair">("invoice");
  const [selectedId, setSelectedId] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("TPE externe");
  const [note, setNote] = useState("");

  const unpaidInvoices = useMemo(
    () => store.invoices.filter((inv) => inv.status !== "Payée" && inv.status !== "Annulée"),
    [store.invoices],
  );
  const unpaidRepairs = useMemo(
    () =>
      store.repairs.filter((r) => {
        const total = typeof r.total === "number" && Number.isFinite(r.total) ? r.total : r.amount || 0;
        const paid = store.payments
          .filter((p) => p.repairId === r.id && p.status === "Payé")
          .reduce((sum, p) => sum + p.amount, 0);
        return total > 0 && paid < total;
      }),
    [store.repairs, store.payments],
  );

  useEffect(() => {
    if (!isOpen) return;
    const s = useBeharStore.getState();
    const openUnpaidInv = s.invoices.filter((inv) => inv.status !== "Payée" && inv.status !== "Annulée");
    const openUnpaidRep = s.repairs.filter((r) => {
      const total = typeof r.total === "number" && Number.isFinite(r.total) ? r.total : r.amount || 0;
      const paid = s.payments
        .filter((p) => p.repairId === r.id && p.status === "Payé")
        .reduce((sum, p) => sum + p.amount, 0);
      return total > 0 && paid < total;
    });
    if (presetInvoiceId && openUnpaidInv.some((i) => i.id === presetInvoiceId)) {
      setSourceType("invoice");
      setSelectedId(presetInvoiceId);
      return;
    }
    if (presetRepairId && openUnpaidRep.some((r) => r.id === presetRepairId)) {
      setSourceType("repair");
      setSelectedId(presetRepairId);
      return;
    }
    setSelectedId("");
  }, [isOpen, presetInvoiceId, presetRepairId]);

  const handleCreate = () => {
    if (!selectedId) {
      toast.error("Veuillez sélectionner un élément.");
      return;
    }

    let paymentId = "";
    if (sourceType === "invoice") {
      paymentId = store.markInvoicePaid(selectedId, method, note);
    } else {
      paymentId = store.markRepairAsPaid(selectedId, method, note);
    }

    if (paymentId) {
      toast.success("Paiement enregistré");
      store.setSelected("payment", paymentId);
      onClose();
    } else {
      toast.error("Erreur lors de l'enregistrement du paiement.");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajouter un paiement">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <button
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
              sourceType === "invoice" ? "border-[#2A9D8F] bg-[#F1FAF8]" : "border-[#E8E8E5] bg-white",
            )}
            onClick={() => {
              setSourceType("invoice");
              setSelectedId("");
            }}
          >
            <FileText className={cn("size-6", sourceType === "invoice" ? "text-[#2A9D8F]" : "text-[#6B6B6B]")} />
            <span className="text-sm font-semibold">Depuis une facture</span>
          </button>
          <button
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
              sourceType === "repair" ? "border-[#2A9D8F] bg-[#F1FAF8]" : "border-[#E8E8E5] bg-white",
            )}
            onClick={() => {
              setSourceType("repair");
              setSelectedId("");
            }}
          >
            <Wrench className={cn("size-6", sourceType === "repair" ? "text-[#2A9D8F]" : "text-[#6B6B6B]")} />
            <span className="text-sm font-semibold">Depuis une réparation</span>
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#6B6B6B]">Sélectionner l'élément</label>
          <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">-- Choisir --</option>
            {sourceType === "invoice"
              ? unpaidInvoices.map((inv) => {
                  const customer = store.customers.find((c) => c.id === inv.customerId);
                  return (
                    <option key={inv.id} value={inv.id}>
                      {inv.number} — {displayCustomerName(customer)} ({formatEuro(getInvoiceTotal(inv))})
                    </option>
                  );
                })
              : unpaidRepairs.map((r) => {
                  const customer = store.customers.find((c) => c.id === r.customerId);
                  const amt = typeof r.total === "number" ? r.total : r.amount;
                  return (
                    <option key={r.id} value={r.id}>
                      {r.number} — {displayCustomerName(customer)} ({r.device} — reste estimé{" "}
                      {formatEuro(
                        Math.max(
                          0,
                          amt -
                            store.payments
                              .filter((p) => p.repairId === r.id && p.status === "Payé")
                              .reduce((s, x) => s + x.amount, 0),
                        ),
                      )}
                      )
                    </option>
                  );
                })}
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#6B6B6B]">Mode de paiement</label>
          <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {(["TPE externe", "Espèces hors Behar Tech", "Virement", "Lien externe", "Autre"] as const).map((m) => (
              <option key={m} value={m}>
                {formatPaymentMethodLabel(m)}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#6B6B6B]">Note (facultatif)</label>
          <Textarea
            placeholder="Ex: Terminal 1, Chèque n°..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <SecondaryButton className="flex-1" onClick={onClose}>
            Annuler
          </SecondaryButton>
          <PrimaryButton className="flex-1" onClick={handleCreate}>
            Enregistrer le paiement
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

function MobileKpi({
  label,
  value,
  helper,
  tone,
}: Readonly<{ label: string; value: string; helper?: string; tone: "teal" | "amber" }>) {
  const t =
    tone === "teal" ? { bg: "bg-[#EAF6F2]", text: "text-[#2A9D8F]" } : { bg: "bg-[#FAFAFA]", text: "text-[#6B6B6B]" };
  return (
    <div className="w-full shrink-0 rounded-[18px] bg-white p-4 shadow-[0_1px_2px_rgba(26,25,22,0.04)] min-[360px]:w-[44%]">
      <span className={cn("grid size-9 place-items-center rounded-[10px]", t.bg, t.text)}>
        <Wallet className="size-[18px]" strokeWidth={2} />
      </span>
      <p className="mt-3 text-[#6B6B6B] text-[11px] font-medium leading-tight tracking-tight">{label}</p>
      <p className={cn("mt-1.5 font-bold text-[20px] leading-none tracking-tight tabular-nums", t.text)}>{value}</p>
      {helper && <p className="mt-1.5 truncate text-[#6B6B6B] text-[10px] font-medium">{helper}</p>}
    </div>
  );
}

function PaymentMethodTile({ method }: Readonly<{ method: PaymentMethod }>) {
  const config = (() => {
    if (method === "Carte" || method === "TPE externe") return { Icon: CreditCard, bg: "bg-[#EAF6F2]", color: "text-[#2A9D8F]", label: "TPE externe" };
    if (method === "Espèces" || method === "Espèces hors Behar Tech") return { Icon: Banknote, bg: "bg-[#FAFAFA]", color: "text-[#6B6B6B]", label: "Espèces ext." };
    if (method === "Virement")
      return { Icon: Landmark, bg: "bg-[#FAFAFA]", color: "text-[#6B6B6B]", label: "Virement" };
    return { Icon: Link2, bg: "bg-[#FAFAFA]", color: "text-[#6B6B6B]", label: "Lien externe" };
  })();
  const { Icon, bg, color, label } = config;
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <span className={cn("grid size-12 place-items-center rounded-[14px]", bg, color)}>
        <Icon className="size-[20px]" strokeWidth={2} />
      </span>
      <span className={cn("text-[10px] font-semibold tracking-tight", color)}>{label}</span>
    </div>
  );
}
