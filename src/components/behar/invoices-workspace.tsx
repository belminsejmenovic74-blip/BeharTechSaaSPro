"use client";

import { cloneElement, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Download,
  FileText,
  GripVertical,
  Layers,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Printer,
  Receipt,
  Save,
  Search,
  Trash2,
  User,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  Panel,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  TableShell,
  tableClassName,
  tableHeadClassName,
} from "@/components/behar/primitives";
import {
  buildInvoiceLinesFromRepair,
  formatEuro,
  formatIsoToDisplay,
  getInvoiceTotal,
  getVatSummary,
  type InvoiceStatus,
  linesForInvoiceFromQuote,
  type PaymentMethod,
  type QuoteLine,
  useBeharStore,
} from "@/lib/behar-store";
import { displayCustomerName, isCounterCustomer } from "@/lib/customer-display";
import { cn } from "@/lib/utils";

import { useDocument } from "./print-provider";

const invoiceStatuses: InvoiceStatus[] = ["Brouillon", "Envoyée", "Payée", "Annulée"];
const paymentMethods: PaymentMethod[] = ["TPE externe", "Espèces hors Behar Tech", "Virement", "Lien externe", "Autre"];

function invoicePaymentBadge(invoice: { status: string }): string {
  if (invoice.status === "Payée") return "Payée";
  if (invoice.status === "Annulée") return "Annulée";
  return "Non payée";
}

function getNowIso() {
  return new Date().toISOString();
}

function safeLineEuro(quantity: number, unitPrice: number, total?: number) {
  if (typeof total === "number" && Number.isFinite(total)) return total;
  const q = Number.isFinite(quantity) ? quantity : 0;
  const u = Number.isFinite(unitPrice) ? unitPrice : 0;
  return q * u;
}

// Une facture est « en retard » si elle n'est ni payée ni annulée et qu'elle a
// plus de 30 jours. invoice.date est stocké en ISO court (YYYY-MM-DD).
const OVERDUE_DAYS = 30;
function isInvoiceOverdue(invoice: { status: string; date: string }) {
  if (invoice.status === "Payée" || invoice.status === "Annulée") return false;
  const parsed = Date.parse(invoice.date);
  if (!Number.isFinite(parsed)) return false;
  return Date.now() - parsed > OVERDUE_DAYS * 24 * 60 * 60 * 1000;
}

export function InvoicesWorkspace() {
  const router = useRouter();
  const store = useBeharStore();
  const { print, download } = useDocument();

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("TPE externe");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [linesEditing, setLinesEditing] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceFilterTab, setInvoiceFilterTab] = useState<
    "all" | "unpaid" | "paid" | "overdue" | "month" | "cancelled" | "counter"
  >("all");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Métadonnées enrichies par facture : dossier / devis / reçu liés + index de
  // recherche puissant (n°, client, téléphone, appareil, REP, DEV, REC).
  const invoiceMeta = useMemo(() => {
    const map = new Map<
      string,
      { repairNumber?: string; quoteNumber?: string; receiptNumber?: string; deviceLabel: string; refs: string[]; haystack: string }
    >();
    for (const invoice of store.invoices) {
      const entryCustomer = store.customers.find((entry) => entry.id === invoice.customerId);
      const repair = invoice.repairId ? store.repairs.find((entry) => entry.id === invoice.repairId) : undefined;
      const quote = invoice.quoteId ? store.quotes.find((entry) => entry.id === invoice.quoteId) : undefined;
      const receipt = store.payments.find((p) => p.invoiceId === invoice.id && p.status === "Payé");
      const deviceLabel = repair ? repair.deviceModel || repair.device || "" : "";
      const dossierNumber = repair?.number ?? invoice.sourceNumber;
      const refs = [
        dossierNumber ? `Dossier ${dossierNumber}` : "",
        quote?.number ? `Devis ${quote.number}` : "",
        receipt?.paymentNumber ? `Reçu ${receipt.paymentNumber}` : "",
      ].filter(Boolean);
      const haystack = `${invoice.number} ${displayCustomerName(entryCustomer)} ${entryCustomer?.phone ?? ""} ${invoice.sourceNumber ?? ""} ${repair?.number ?? ""} ${deviceLabel} ${quote?.number ?? ""} ${receipt?.paymentNumber ?? ""}`.toLowerCase();
      map.set(invoice.id, {
        repairNumber: dossierNumber,
        quoteNumber: quote?.number,
        receiptNumber: receipt?.paymentNumber,
        deviceLabel,
        refs,
        haystack,
      });
    }
    return map;
  }, [store.invoices, store.customers, store.repairs, store.quotes, store.payments]);

  const visibleInvoices = useMemo(() => {
    const q = invoiceSearch.trim().toLowerCase();
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return store.invoices.filter((invoice) => {
      const entryCustomer = store.customers.find((entry) => entry.id === invoice.customerId);

      if (invoiceFilterTab === "unpaid" && (invoice.status === "Payée" || invoice.status === "Annulée")) return false;
      if (invoiceFilterTab === "paid" && invoice.status !== "Payée") return false;
      if (invoiceFilterTab === "overdue" && !isInvoiceOverdue(invoice)) return false;
      if (invoiceFilterTab === "cancelled" && invoice.status !== "Annulée") return false;
      if (invoiceFilterTab === "counter" && !isCounterCustomer(entryCustomer)) return false;
      if (invoiceFilterTab === "month") {
        const head = invoice.date.replace(/\//g, "-").slice(0, 7);
        if (head !== monthPrefix) return false;
      }

      if (!q) return true;
      return (invoiceMeta.get(invoice.id)?.haystack ?? "").includes(q);
    });
  }, [store.invoices, store.customers, invoiceMeta, invoiceFilterTab, invoiceSearch]);

  const selected = store.invoices.find((invoice) => invoice.id === store.selectedInvoiceId) ?? visibleInvoices[0];
  const customer = selected ? store.customers.find((entry) => entry.id === selected.customerId) : undefined;
  const repair = selected ? store.repairs.find((entry) => entry.id === selected.repairId) : undefined;

  const invoicePayments = selected ? store.payments.filter((payment) => payment.invoiceId === selected.id) : [];
  const activePayments = invoicePayments.filter((payment) => payment.status === "Payé");
  const invoiceGrandTotal = selected ? getInvoiceTotal(selected) : 0;
  const paidAmount =
    selected && selected.status === "Payée"
      ? invoiceGrandTotal
      : activePayments.reduce((total, p) => total + p.amount, 0);
  const remainingAmount = Math.max(0, invoiceGrandTotal - paidAmount);

  const paidLocked = selected?.status === "Payée";
  const lineInputsLocked = paidLocked || !linesEditing;

  const updateInvoiceLine = (lineId: string, patch: Partial<QuoteLine>) => {
    if (!selected || lineInputsLocked) return;
    store.updateInvoice(selected.id, {
      lines: selected.lines.map((line) => (line.id === lineId ? { ...line, ...patch } : line)),
    });
  };

  return (
    <section className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_390px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex min-w-0 flex-col">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="hidden md:block relative w-full max-w-[360px]">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#8A8A8A]" />
            <input
              className="h-11 w-full rounded-[14px] border border-[#E8E8E5] bg-white pr-4 pl-10 text-sm outline-none transition placeholder:text-[#8A8A8A] focus:border-[#2A9D8F]/55 focus:ring-4 focus:ring-[#2A9D8F]/10"
              placeholder="Rechercher une facture..."
              type="search"
              value={invoiceSearch}
              onChange={(e) => setInvoiceSearch(e.target.value)}
            />
          </label>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              className="hidden md:block h-11 cursor-pointer rounded-[14px] border border-[#E8E8E5] bg-white px-3 text-sm outline-none transition focus:border-[#2A9D8F]"
              onChange={(e) => setInvoiceFilterTab(e.target.value as typeof invoiceFilterTab)}
              value={invoiceFilterTab}
            >
              <option value="all">Toutes</option>
              <option value="unpaid">À régler</option>
              <option value="overdue">En retard</option>
              <option value="paid">Payées</option>
              <option value="month">Ce mois</option>
              <option value="cancelled">Annulées</option>
              <option value="counter">Comptoir</option>
            </select>
            <PrimaryButton className="h-11 w-full md:w-auto md:px-5" onClick={() => setCreateModalOpen(true)}>
              <Plus className="size-4" />
              Nouvelle facture
            </PrimaryButton>
          </div>
        </div>

        {createModalOpen && <CreateInvoiceModal onClose={() => setCreateModalOpen(false)} />}

        {/* Mobile : KPI + chips statut + cards */}
        <div className="md:hidden space-y-4">
          {(() => {
            const allInvoices = store.invoices;
            const paid = allInvoices.filter((i) => i.status === "Payée").reduce((s, i) => s + getInvoiceTotal(i), 0);
            const pending = allInvoices
              .filter((i) => i.status !== "Payée" && i.status !== "Annulée")
              .reduce((s, i) => s + getInvoiceTotal(i), 0);
            const count = allInvoices.length;
            return (
              <section className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 scrollbar-none">
                <div className="w-[44%] shrink-0 rounded-[18px] bg-white p-4 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
                  <span className="grid size-9 place-items-center text-[#2A9D8F]">
                    <Receipt className="size-[18px]" />
                  </span>
                  <p className="mt-3 text-[#6B6B6B] text-[11px] font-medium">Total factures</p>
                  <p className="mt-1.5 font-bold text-[#1A1916] text-[20px] leading-none tabular-nums">{count}</p>
                </div>
                <div className="w-[44%] shrink-0 rounded-[18px] bg-white p-4 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
                  <span className="grid size-9 place-items-center text-[#2A9D8F]">
                    <Receipt className="size-[18px]" />
                  </span>
                  <p className="mt-3 text-[#6B6B6B] text-[11px] font-medium">Encaissé</p>
                  <p className="mt-1.5 font-bold text-[#2A9D8F] text-[20px] leading-none tabular-nums">
                    {formatEuro(paid)}
                  </p>
                </div>
                <div className="w-[44%] shrink-0 rounded-[18px] bg-white p-4 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
                  <span className="grid size-9 place-items-center rounded-[10px] bg-[#FAFAFA] text-[#6B6B6B]">
                    <Receipt className="size-[18px]" />
                  </span>
                  <p className="mt-3 text-[#6B6B6B] text-[11px] font-medium">En attente</p>
                  <p className="mt-1.5 font-bold text-[#6B6B6B] text-[20px] leading-none tabular-nums">
                    {formatEuro(pending)}
                  </p>
                </div>
              </section>
            );
          })()}

          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#6B6B6B]" />
            <input
              className="h-12 w-full rounded-[14px] border border-[#E8E8E5] bg-white pr-4 pl-10 text-sm outline-none focus:border-[#2A9D8F] placeholder:text-[#6B6B6B]"
              placeholder="Rechercher une facture…"
              type="search"
              value={invoiceSearch}
              onChange={(e) => setInvoiceSearch(e.target.value)}
            />
          </div>

          <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
            {(["all", "unpaid", "overdue", "paid", "month", "cancelled"] as const).map((tab) => {
              const labels: Record<string, string> = {
                all: "Toutes",
                unpaid: "À régler",
                overdue: "En retard",
                paid: "Payées",
                month: "Ce mois",
                cancelled: "Annulées",
              };
              const active = invoiceFilterTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setInvoiceFilterTab(tab)}
                  className={`inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[12.5px] font-semibold transition active:scale-95 ${
                    active ? "border-[#2A9D8F] bg-[#2A9D8F] text-white" : "border-[#E8E8E5] bg-white text-[#1A1916]"
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          <ul className="space-y-2.5">
            {visibleInvoices.length === 0 ? (
              <li className="rounded-[18px] bg-white p-10 text-center text-[#6B6B6B] text-sm shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
                Aucune facture.
              </li>
            ) : (
              visibleInvoices.map((invoice) => {
                const entryCustomer = store.customers.find((entry) => entry.id === invoice.customerId);
                const meta = invoiceMeta.get(invoice.id);
                return (
                  <li key={invoice.id}>
                    <button
                      type="button"
                      onClick={() => {
                        store.setSelected("invoice", invoice.id);
                        setMobileDetailOpen(true);
                      }}
                      className="flex w-full items-start gap-3 rounded-[18px] bg-white p-4 text-left shadow-[0_1px_2px_rgba(26,25,22,0.04)] transition active:scale-[0.99]"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#FAFAFA] text-[#1A1916]">
                        <Receipt className="size-[18px]" strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate font-semibold text-[#1A1916] text-[14px] tracking-tight">
                            {displayCustomerName(entryCustomer)}
                          </p>
                          <p className="shrink-0 font-bold text-[#1A1916] text-[15px] tabular-nums">
                            {formatEuro(getInvoiceTotal(invoice))}
                          </p>
                        </div>
                        <p className="mt-0.5 font-mono text-[#2A9D8F] text-[11px]">{invoice.number}</p>
                        <p className="mt-0.5 truncate text-[#6B6B6B] text-[11.5px]">
                          {formatIsoToDisplay(invoice.date)}
                          {meta?.deviceLabel ? ` · ${meta.deviceLabel}` : ""}
                        </p>
                        {meta && meta.refs.length > 0 ? (
                          <p className="mt-0.5 truncate text-[#167B70] text-[11px]">{meta.refs.join(" · ")}</p>
                        ) : (
                          <p className="mt-0.5 truncate text-[#6B6B6B] text-[11px]">Vente directe</p>
                        )}
                        <div className="mt-2">
                          <StatusBadge status={isInvoiceOverdue(invoice) ? "En retard" : invoice.status} />
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <TableShell className="hidden md:block min-h-[650px] flex-1">
          <table className={tableClassName}>
            <thead className={tableHeadClassName}>
              <tr>
                <th className="px-5 py-3">N°</th>
                <th className="px-5 py-3">Client / Appareil</th>
                <th className="px-5 py-3">Lié à</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3">Montant</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {visibleInvoices.map((invoice) => {
                const entryCustomer = store.customers.find((entry) => entry.id === invoice.customerId);
                const meta = invoiceMeta.get(invoice.id);
                const active = invoice.id === selected?.id;
                return (
                  <tr
                    className={`cursor-pointer transition hover:bg-[#FAFAFA] ${
                      active ? "border-[#2A9D8F]/30 border-y bg-[#E7F5F1] text-[#167B70]" : ""
                    }`}
                    key={invoice.id}
                    onClick={() => store.setSelected("invoice", invoice.id)}
                  >
                    <td className="border-[#E8E8E5] border-b px-5 py-4 font-bold">{invoice.number}</td>
                    <td className="border-[#E8E8E5] border-b px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#1A1916]">{displayCustomerName(entryCustomer)}</span>
                        <span className="text-[11px] text-[#6B6B6B]">{meta?.deviceLabel || "Vente directe"}</span>
                      </div>
                    </td>
                    <td className="border-[#E8E8E5] border-b px-5 py-4">
                      {meta && meta.refs.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {meta.refs.map((ref) => (
                            <span className="font-mono text-[11px] text-[#167B70]" key={ref}>
                              {ref}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#8A8A8A]">—</span>
                      )}
                    </td>
                    <td className="border-[#E8E8E5] border-b px-5 py-4">{formatIsoToDisplay(invoice.date)}</td>
                    <td className="border-[#E8E8E5] border-b px-5 py-4">
                      <StatusBadge status={isInvoiceOverdue(invoice) ? "En retard" : invoice.status} />
                    </td>
                    <td className="border-[#E8E8E5] border-b px-5 py-4 font-black tabular-nums">
                      {formatEuro(getInvoiceTotal(invoice))}
                    </td>
                    <td className="border-[#E8E8E5] border-b px-5 py-4 text-right">
                      <ChevronRight className="ml-auto size-4 text-[#8A8A8A]" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableShell>
      </div>

      {selected && (
        <Panel
          className={cn(
            mobileDetailOpen ? "fixed inset-0 z-40 overflow-y-auto bg-white p-5 flex flex-col" : "hidden",
            "md:relative md:inset-auto md:z-auto md:flex md:h-full md:min-h-0 md:flex-col md:overflow-hidden md:rounded-[20px] md:border md:border-[#E8E8E5] md:bg-white md:p-5 md:shadow-[0_12px_40px_rgba(26,25,22,0.045)]",
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
            <span className="font-semibold text-[#1A1916] text-[15px] tracking-tight">Détail facture</span>
          </div>
          <div className="mb-6 shrink-0 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-bold text-[#1A1916] text-xl tracking-tight">Facture {selected.number}</h2>
              <p className="mt-1 text-[10px] font-bold text-[#8A8A8A] uppercase tracking-wider">
                {formatIsoToDisplay(selected.date)}
              </p>
            </div>
            <StatusBadge
              className="h-6 px-2.5 text-[10px] font-bold uppercase tracking-wider"
              status={selected.status}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-6">
            <div className="rounded-xl border border-[#F7F7F7] p-4">
              <p className="text-[10px] font-bold text-[#8A8A8A] uppercase tracking-wider mb-2">Destinataire</p>
              <p className="font-bold text-[#1A1916]">{displayCustomerName(customer)}</p>
              <div className="mt-2 space-y-1 text-xs text-[#6B6B6B]">
                <p>{customer?.phone}</p>
                <p>{customer?.email || "Pas d'email"}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#F7F7F7] pb-2">
                <p className="text-[10px] font-bold text-[#8A8A8A] uppercase tracking-wider">Détails de facturation</p>
                {!paidLocked && (
                  <button
                    onClick={() => setLinesEditing(!linesEditing)}
                    className="text-[10px] font-bold text-[#2A9D8F] uppercase tracking-wider hover:underline"
                  >
                    {linesEditing ? "Terminer" : "Modifier"}
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {selected.lines.map((line) => (
                  <div
                    key={line.id}
                    className="flex flex-col gap-2 rounded-xl border border-[#F7F7F7] bg-white p-3 transition-shadow hover:shadow-sm"
                  >
                    <div className="flex justify-between gap-3">
                      {linesEditing ? (
                        <textarea
                          className="flex-1 resize-none bg-transparent font-medium text-[#1A1916] text-sm outline-none border-b border-dashed border-[#2A9D8F]/20 focus:border-[#2A9D8F]"
                          rows={1}
                          value={line.description}
                          onChange={(e) => updateInvoiceLine(line.id, { description: e.target.value })}
                        />
                      ) : (
                        <p className="flex-1 font-medium text-[#1A1916] text-sm">{line.description}</p>
                      )}
                      <p className="font-bold text-[#1A1916] text-sm">{formatEuro(line.quantity * line.unitPrice)}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {linesEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            className="w-10 h-7 rounded-lg border border-[#E8E8E5] text-center text-xs outline-none focus:border-[#2A9D8F]"
                            value={line.quantity}
                            onChange={(e) => updateInvoiceLine(line.id, { quantity: Number(e.target.value) })}
                          />
                          <span className="text-[10px] text-[#8A8A8A]">x</span>
                          <input
                            type="number"
                            className="w-20 h-7 rounded-lg border border-[#E8E8E5] text-center text-xs outline-none focus:border-[#2A9D8F]"
                            value={line.unitPrice}
                            onChange={(e) => updateInvoiceLine(line.id, { unitPrice: Number(e.target.value) })}
                          />
                        </div>
                      ) : (
                        <p className="text-[10px] text-[#6B6B6B]">
                          {line.quantity} x {formatEuro(line.unitPrice)}
                        </p>
                      )}

                      {linesEditing && selected.lines.length > 1 && (
                        <button
                          onClick={() =>
                            store.updateInvoice(selected.id, { lines: selected.lines.filter((l) => l.id !== line.id) })
                          }
                          className="ml-auto text-[#B42318] p-1 rounded-md hover:bg-red-50"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {linesEditing && (
                  <button
                    onClick={() =>
                      store.updateInvoice(selected.id, {
                        lines: [
                          ...selected.lines,
                          { id: `L-${Date.now()}`, description: "", quantity: 1, unitPrice: 0, total: 0 },
                        ],
                      })
                    }
                    className="w-full py-2.5 rounded-xl border border-dashed border-[#E8E8E5] text-[#8A8A8A] text-[11px] font-bold hover:border-[#1A1916] hover:text-[#1A1916] transition-all"
                  >
                    + Ajouter une ligne
                  </button>
                )}
              </div>
            </div>

            {/* Totaux */}
            <div className="pt-5 space-y-3">
              <div className="space-y-1.5">
                {store.workshopInfo.vatApplicable ? (
                  <>
                    <div className="flex justify-between text-xs text-[#6B6B6B]">
                      <span>Sous-total HT</span>
                      <span className="font-medium">
                        {formatEuro(getVatSummary(selected.lines, store.workshopInfo).ht)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-[#6B6B6B]">
                      <span>TVA ({Math.round(getVatSummary(selected.lines, store.workshopInfo).rate * 1000) / 10}%)</span>
                      <span className="font-medium">
                        {formatEuro(getVatSummary(selected.lines, store.workshopInfo).tva)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-xs text-[#6B6B6B]">
                    <span>Sous-total HT</span>
                    <span className="font-medium">{formatEuro(invoiceGrandTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-[#6B6B6B]">
                  <span>Total Réglé</span>
                  <span className="font-medium">{formatEuro(paidAmount)}</span>
                </div>
                {remainingAmount > 0 && (
                  <div className="flex justify-between text-xs text-[#1A1916] font-bold">
                    <span>Reste à payer</span>
                    <span>{formatEuro(remainingAmount)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#F7F7F7]">
                <span className="font-bold text-[#1A1916] text-sm uppercase">
                  {store.workshopInfo.vatApplicable ? "Total TTC" : "Total Net"}
                </span>
                <span className="font-bold text-[#1A1916] text-2xl tracking-tight">
                  {formatEuro(
                    store.workshopInfo.vatApplicable
                      ? getVatSummary(selected.lines, store.workshopInfo).ttc
                      : invoiceGrandTotal,
                  )}
                </span>
              </div>

              <p className="text-center text-[9px] text-[#8A8A8A] uppercase tracking-widest pt-4">
                {store.workshopInfo.vatApplicable
                  ? "TVA incluse au taux légal"
                  : "TVA non applicable — article 293 B du CGI"}
              </p>
            </div>

            {invoicePayments.length > 0 && (
              <div className="space-y-3 pt-4">
                <p className="text-[10px] font-bold text-[#8A8A8A] uppercase tracking-wider">Paiements enregistrés</p>
                <div className="space-y-2">
                  {invoicePayments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-[#F7F7F7] text-sm"
                    >
                      <div>
                        <p className="font-semibold text-[#1A1916]">{p.method}</p>
                        <p className="text-[10px] text-[#8A8A8A] font-bold">{formatIsoToDisplay(p.date)}</p>
                      </div>
                      <span className="font-bold text-[#1A1916]">{formatEuro(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-[#F7F7F7] space-y-3">
            {remainingAmount > 0 ? (
              <button
                onClick={() => setPaymentOpen(true)}
                className="w-full h-11 rounded-xl bg-[#1A1916] text-white font-bold text-sm hover:bg-black transition-all flex items-center justify-center gap-2"
              >
                <CreditCard className="size-4" />
                Enregistrer un paiement
              </button>
            ) : (
              <div className="w-full py-2.5 rounded-xl border border-[#F7F7F7] text-[#6B6B6B] text-xs font-bold text-center">
                Facture soldée
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => download("invoice", selected.id)}
                className="h-10 rounded-xl border border-[#E8E8E5] bg-white text-[#1A1916] font-bold text-xs hover:bg-[#FAFAFA] transition-all flex items-center justify-center gap-2"
              >
                <Download className="size-3.5" />
                PDF
              </button>
              <button
                onClick={() => print("invoice", selected.id)}
                className="h-10 rounded-xl border border-[#E8E8E5] bg-white text-[#1A1916] font-bold text-xs hover:bg-[#FAFAFA] transition-all flex items-center justify-center gap-2"
              >
                <Printer className="size-3.5" />
                Imprimer
              </button>
            </div>

            <button
              onClick={() => {
                const body = `Bonjour ${displayCustomerName(customer)}, votre facture ${selected.number} (${formatEuro(invoiceGrandTotal)}) est disponible. Merci de votre confiance.`;
                if (window.confirm(`Envoyer le lien de la facture par SMS au ${customer?.phone} ?`)) {
                  toast.success("SMS envoyé");
                }
              }}
              className="w-full h-10 rounded-xl border border-[#F7F7F7] text-[#8A8A8A] font-bold text-xs hover:text-[#6B6B6B] transition-all flex items-center justify-center gap-2"
            >
              <Mail className="size-3.5" />
              Notifier par SMS
            </button>
          </div>
        </Panel>
      )}

      {paymentOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-stretch bg-black/40 p-0 md:items-center md:justify-center md:p-4">
          <Panel className="w-full min-h-svh max-w-none rounded-none p-5 animate-in zoom-in-95 duration-200 md:max-w-sm md:min-h-0 md:rounded-[20px] md:p-6">
            <h3 className="text-lg font-bold text-[#1A1916] mb-6">Nouveau paiement</h3>

            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-[#8A8A8A] uppercase tracking-wider block mb-2">
                  Montant du règlement
                </label>
                <div className="relative">
                  <input
                    className="h-12 w-full rounded-xl border border-[#E8E8E5] bg-white px-4 text-xl font-bold text-[#1A1916] outline-none focus:border-[#1A1916] transition-all"
                    type="number"
                    defaultValue={remainingAmount}
                    id="payment-amount"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-lg text-[#8A8A8A]">€</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8A8A8A] uppercase tracking-wider block mb-2">
                  Mode de règlement
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethods.map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`h-10 rounded-xl border font-bold text-xs transition-all ${
                        paymentMethod === m
                          ? "border-[#1A1916] bg-[#F7F7F7] text-[#1A1916]"
                          : "border-[#E8E8E5] text-[#6B6B6B] hover:border-[#8A8A8A]"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <SecondaryButton className="flex-1 h-11" onClick={() => setPaymentOpen(false)}>
                Annuler
              </SecondaryButton>
              <PrimaryButton
                className="flex-1 h-11 bg-[#1A1916]"
                onClick={() => {
                  const amtInput = document.getElementById("payment-amount") as HTMLInputElement;
                  const amt = Number(amtInput.value);
                  if (amt <= 0) return toast.error("Montant invalide");

                  store.addPayment({
                    invoiceId: selected.id,
                    customerId: selected.customerId,
                    amount: amt,
                    method: paymentMethod,
                    status: "Payé",
                    date: new Date().toISOString().split("T")[0],
                    reference: `PAY-${Date.now()}`,
                  });

                  if (amt >= remainingAmount) {
                    store.updateInvoice(selected.id, { status: "Payée" });
                  }

                  setPaymentOpen(false);
                  toast.success("Paiement enregistré");
                }}
              >
                Confirmer
              </PrimaryButton>
            </div>
          </Panel>
        </div>
      )}
    </section>
  );
}

function CreateInvoiceModal({ onClose }: Readonly<{ onClose: () => void }>) {
  const store = useBeharStore();
  const [sourceType, setSourceType] = useState<"quote" | "repair" | "client" | "manual">("manual");
  const [selectedId, setSelectedId] = useState<string>("");
  const [lines, setLines] = useState<
    { id: string; description: string; quantity: number; unitPrice: number; total: number }[]
  >([{ id: `line_${Date.now()}`, description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  const [note, setNote] = useState("");
  const [dates, setDates] = useState({
    invoice: new Date().toISOString().split("T")[0],
    due: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
  });
  const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "", email: "", device: "", issue: "" });

  const availableQuotes = store.quotes.filter((q) => q.status === "Accepté" && !q.invoiceId);
  const availableRepairs = store.repairs.filter((r) => !r.invoiceId);

  // Synchronisation des données selon la source
  useEffect(() => {
    if (sourceType === "quote" && selectedId) {
      const q = store.quotes.find((item) => item.id === selectedId);
      const c = store.customers.find((item) => item.id === q?.customerId);
      const r = q?.repairId ? store.repairs.find((item) => item.id === q.repairId) : undefined;
      if (q && c) {
        setLines(q.lines.map((l) => ({ ...l })));
        setCustomerInfo({
          name: c.name,
          phone: c.phone,
          email: c.email || "Non renseigné",
          device: r?.device || "",
          issue: r?.issue || "",
        });
      }
    } else if (sourceType === "repair" && selectedId) {
      const r = store.repairs.find((item) => item.id === selectedId);
      const c = store.customers.find((item) => item.id === r?.customerId);
      if (r && c) {
        const built = buildInvoiceLinesFromRepair(r);
        if (built.ok) {
          setLines(built.lines.map((l) => ({ ...l, total: l.quantity * l.unitPrice })));
        } else {
          setLines([{ id: `line_${Date.now()}`, description: "", quantity: 1, unitPrice: 0, total: 0 }]);
        }
        setCustomerInfo({
          name: c.name,
          phone: c.phone,
          email: c.email || "Non renseigné",
          device: r.device,
          issue: r.issue,
        });
      }
    } else if (sourceType === "client" && selectedId) {
      const c = store.customers.find((item) => item.id === selectedId);
      if (c) {
        setCustomerInfo({
          name: c.name,
          phone: c.phone,
          email: c.email || "Non renseigné",
          device: "",
          issue: "",
        });
        setLines([{ id: `line_${Date.now()}`, description: "", quantity: 1, unitPrice: 0, total: 0 }]);
      }
    } else if (sourceType === "manual") {
      setCustomerInfo({ name: "", phone: "", email: "", device: "", issue: "" });
      setLines([{ id: `line_${Date.now()}`, description: "", quantity: 1, unitPrice: 0, total: 0 }]);
      setSelectedId("");
    }
  }, [sourceType, selectedId, store.quotes, store.repairs, store.customers]);

  const subtotal = lines.reduce((acc, line) => acc + line.quantity * line.unitPrice, 0);
  const isMicro = store.workshopInfo?.isMicroEnterprise === true;
  const tva = isMicro ? 0 : subtotal * 0.2;
  const total = subtotal + tva;

  const { download } = useDocument();

  const handleCreate = (status: InvoiceStatus, shouldDownload = false) => {
    if (!customerInfo.name) {
      toast.error("Veuillez renseigner le nom du client avant de créer une facture");
      return;
    }

    if (total <= 0 && status !== "Brouillon") {
      const confirmZero = window.confirm("Cette facture est à 0 €. Voulez-vous vraiment la créer ?");
      if (!confirmZero) return;
    }

    let finalCustomerId = "";
    if (sourceType !== "manual" && selectedId) {
      if (sourceType === "client") finalCustomerId = selectedId;
      else {
        const item =
          sourceType === "quote"
            ? store.quotes.find((q) => q.id === selectedId)
            : store.repairs.find((r) => r.id === selectedId);
        finalCustomerId = item?.customerId || "";
      }
    } else {
      const existing = store.customers.find((c) => c.name.toLowerCase() === customerInfo.name.toLowerCase());
      if (existing) finalCustomerId = existing.id;
      else {
        finalCustomerId = store.addCustomer({
          name: customerInfo.name,
          phone: customerInfo.phone,
          email: customerInfo.email,
        });
      }
    }

    const filteredLines =
      sourceType === "quote" && selectedId
        ? linesForInvoiceFromQuote(lines)
        : lines.filter((l) => l.description.trim() !== "");

    let repairIdForInvoice =
      sourceType === "repair"
        ? selectedId
        : sourceType === "quote"
          ? store.quotes.find((q) => q.id === selectedId)?.repairId
          : undefined;

    if (!repairIdForInvoice) {
      repairIdForInvoice = store.addRepair({
        customerId: finalCustomerId,
        device: customerInfo.device || "Appareil à renseigner",
        model: customerInfo.device || "Appareil à renseigner",
        deviceModel: customerInfo.device || "",
        issue: customerInfo.issue || filteredLines[0]?.description || "Facturation dossier",
        status: "Reçu",
        amount: total,
        total,
        laborPrice: total,
        notes: "Dossier créé automatiquement depuis une facture.",
        droppedAt: new Date().toISOString(),
        technician: "Atelier principal",
        history: ["Prise en charge créée", "Facture créée depuis la page Factures"],
      });
      if (!repairIdForInvoice) {
        toast.error("Impossible de créer le dossier lié à la facture.");
        return;
      }
    }

    const id = store.addInvoice({
      customerId: finalCustomerId,
      repairId: repairIdForInvoice,
      quoteId: sourceType === "quote" ? selectedId : undefined,
      lines: filteredLines,
      sourceType,
      sourceNumber:
        sourceType === "quote"
          ? store.quotes.find((q) => q.id === selectedId)?.number
          : sourceType === "repair"
            ? store.repairs.find((r) => r.id === selectedId)?.number
            : undefined,
      status,
    });

    if (!id) {
      toast.error("Création impossible : vérifiez les lignes, le montant (> 0) et les informations client.");
      return;
    }

    store.setSelected("invoice", id);
    toast.success(status === "Brouillon" ? "Brouillon enregistré" : "Facture créée");

    if (shouldDownload) {
      toast.info("Génération du PDF...");
      setTimeout(() => download("invoice", id), 800);
    }
    onClose();
  };

  const isFormValid = customerInfo.name && lines.length > 0 && lines.some((l) => l.description.trim() !== "");

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-stretch bg-black/40 p-0 md:items-center md:justify-center md:p-4">
      <div className="relative flex min-h-svh w-full max-w-none flex-col overflow-hidden rounded-none border border-[#E8E8E5] bg-white shadow-2xl animate-in fade-in zoom-in duration-200 md:h-[90vh] md:min-h-0 md:max-w-[1200px] md:rounded-[16px]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F7F7F7] bg-white md:px-8 md:py-6">
          <div>
            <h2 className="text-[18px] font-bold text-[#1A1916] md:text-[22px]">Nouvelle facture</h2>
            <p className="mt-0.5 text-[12.5px] text-[#6B6B6B] md:mt-1 md:text-sm">Facturation rapide</p>
          </div>
          <button
            onClick={onClose}
            className="grid size-9 place-items-center rounded-[12px] border border-[#E8E8E5] bg-white text-[#1A1916] transition hover:bg-[#E8E8E5] md:size-auto md:bg-transparent md:p-0"
            aria-label="Fermer"
          >
            <X className="size-5 md:size-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden relative">
          {/* Left Column - Configuration */}
          <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar pb-32 md:px-8 md:py-8">
            {/* 1. Origine */}
            <div className="space-y-3 md:space-y-4">
              <label className="text-[13px] font-bold text-[#1A1916] md:text-sm">Origine de la facture</label>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
                {[
                  { id: "quote", label: "Depuis un devis accepté", icon: <FileText /> },
                  { id: "repair", label: "Depuis un dossier", icon: <Wrench /> },
                  { id: "client", label: "Client existant", icon: <User /> },
                  { id: "manual", label: "Nouveau dossier", icon: <Plus /> },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSourceType(opt.id as any);
                      setSelectedId("");
                    }}
                    className={`relative flex flex-col items-center justify-center gap-3 rounded-[12px] border h-[110px] transition-all ${
                      sourceType === opt.id
                        ? "border-[#2A9D8F] bg-[#F1FAF8] shadow-sm"
                        : "border-[#E8E8E5] bg-white hover:border-[#2A9D8F]/30"
                    }`}
                  >
                    <div className={`${sourceType === opt.id ? "text-[#2A9D8F]" : "text-[#6B6B6B]"}`}>
                      {cloneElement(opt.icon as React.ReactElement<{ className?: string }>, { className: "size-6" })}
                    </div>
                    <p
                      className={`text-xs font-semibold text-center px-2 ${sourceType === opt.id ? "text-[#167B70]" : "text-[#1A1916]"}`}
                    >
                      {opt.label}
                    </p>
                    {sourceType === opt.id && (
                      <div className="absolute top-2 right-2 size-5 rounded-full bg-[#2A9D8F] flex items-center justify-center">
                        <Check className="size-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Informations */}
            <div className="mt-10 space-y-4">
              <label className="text-sm font-bold text-[#1A1916]">Informations principales</label>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#6B6B6B]">Client</p>
                  {sourceType === "manual" ? (
                    <input
                      className="h-11 w-full rounded-[10px] border border-[#E8E8E5] bg-white px-4 text-sm outline-none focus:border-[#2A9D8F] transition-all"
                      placeholder="Nom du client..."
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    />
                  ) : (
                    <div className="relative">
                      <select
                        className="h-11 w-full appearance-none rounded-[10px] border border-[#E8E8E5] bg-white px-4 text-sm outline-none focus:border-[#2A9D8F] transition-all"
                        value={selectedId}
                        onChange={(e) => setSelectedId(e.target.value)}
                      >
                        <option value="">-- Sélectionner --</option>
                        {sourceType === "quote" &&
                          availableQuotes.map((q) => (
                            <option key={q.id} value={q.id}>
                              {q.number} — {store.customers.find((c) => c.id === q.customerId)?.name}
                            </option>
                          ))}
                        {sourceType === "repair" &&
                          availableRepairs.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.number} — {store.customers.find((c) => c.id === r.customerId)?.name} ({r.device})
                            </option>
                          ))}
                        {sourceType === "client" &&
                          store.customers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#8A8A8A]" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#6B6B6B]">Email client</p>
                  <input
                    className="h-11 w-full rounded-[10px] border border-[#E8E8E5] bg-white px-4 text-sm outline-none focus:border-[#2A9D8F] transition-all"
                    placeholder="Email (optionnel)..."
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#6B6B6B]">Téléphone</p>
                  <input
                    className="h-11 w-full rounded-[10px] border border-[#E8E8E5] bg-white px-4 text-sm outline-none focus:border-[#2A9D8F] transition-all"
                    placeholder="Numéro de téléphone..."
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#6B6B6B]">Date de facture</p>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8A8A8A]" />
                    <input
                      type="date"
                      className="h-11 w-full rounded-[10px] border border-[#E8E8E5] bg-white pl-10 pr-4 text-sm outline-none focus:border-[#2A9D8F]"
                      value={dates.invoice}
                      onChange={(e) => setDates({ ...dates, invoice: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#6B6B6B]">Date d'échéance</p>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8A8A8A]" />
                    <input
                      type="date"
                      className="h-11 w-full rounded-[10px] border border-[#E8E8E5] bg-white pl-10 pr-4 text-sm outline-none focus:border-[#2A9D8F]"
                      value={dates.due}
                      onChange={(e) => setDates({ ...dates, due: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#6B6B6B]">Appareil</p>
                  <input
                    className="h-11 w-full rounded-[10px] border border-[#E8E8E5] bg-white px-4 text-sm outline-none focus:border-[#2A9D8F] transition-all"
                    placeholder="Ex. iPhone 14 Pro Max"
                    value={customerInfo.device}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, device: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#6B6B6B]">Panne / description</p>
                  <input
                    className="h-11 w-full rounded-[10px] border border-[#E8E8E5] bg-white px-4 text-sm outline-none focus:border-[#2A9D8F] transition-all"
                    placeholder="Écran, Batterie..."
                    value={customerInfo.issue}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, issue: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* 3. Lignes */}
            <div className="mt-10 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-[#1A1916]">Lignes de facture</label>
                <button
                  onClick={() =>
                    setLines([
                      ...lines,
                      { id: `line_${Date.now()}`, description: "", quantity: 1, unitPrice: 0, total: 0 },
                    ])
                  }
                  className="flex items-center gap-2 text-xs font-bold text-[#2A9D8F] hover:underline"
                >
                  <Plus className="size-4" />
                  Ajouter une ligne
                </button>
              </div>
              <div className="rounded-[12px] border border-[#E8E8E5] overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFAFA] text-[#6B6B6B] border-b border-[#E8E8E5] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 w-16 text-center">Qté</th>
                      <th className="px-4 py-3 w-28 text-right">Prix U. HT</th>
                      <th className="px-4 py-3 w-20 text-center">TVA</th>
                      <th className="px-4 py-3 w-28 text-right">Total HT</th>
                      <th className="px-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E8E5]">
                    {lines.map((line, idx) => (
                      <tr key={line.id} className="hover:bg-[#FAFAFA]/50 transition-colors">
                        <td className="p-2">
                          <input
                            className="w-full h-9 px-2 rounded-lg border border-transparent focus:border-[#E8E8E5] bg-transparent outline-none text-[#1A1916]"
                            value={line.description}
                            onChange={(e) => {
                              const newLines = [...lines];
                              newLines[idx].description = e.target.value;
                              setLines(newLines);
                            }}
                            placeholder="Prestation ou article..."
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            className="w-full h-9 text-center rounded-lg border border-transparent focus:border-[#E8E8E5] bg-transparent outline-none text-[#1A1916]"
                            value={line.quantity}
                            onChange={(e) => {
                              const newLines = [...lines];
                              newLines[idx].quantity = Number(e.target.value);
                              setLines(newLines);
                            }}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            className="w-full h-9 text-right pr-2 rounded-lg border border-transparent focus:border-[#E8E8E5] bg-transparent outline-none text-[#1A1916]"
                            value={line.unitPrice}
                            onChange={(e) => {
                              const newLines = [...lines];
                              newLines[idx].unitPrice = Number(e.target.value);
                              setLines(newLines);
                            }}
                          />
                        </td>
                        <td className="p-2 text-center text-[#6B6B6B]">{isMicro ? "N/A" : "20 %"}</td>
                        <td className="p-2 text-right font-semibold text-[#1A1916]">
                          {formatEuro(line.quantity * line.unitPrice)}
                        </td>
                        <td className="p-2">
                          <button
                            onClick={() => setLines(lines.filter((l) => l.id !== line.id))}
                            className="text-[#8A8A8A] hover:text-[#B42318] transition-colors p-2"
                            disabled={lines.length <= 1}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Commentaires */}
            <div className="mt-10 space-y-4 pb-10">
              <label className="text-sm font-bold text-[#1A1916]">Commentaires internes</label>
              <textarea
                className="w-full min-h-[120px] p-4 rounded-[12px] border border-[#E8E8E5] bg-white text-sm outline-none focus:border-[#2A9D8F] transition-all resize-none"
                placeholder="Notes visibles uniquement par l'équipe (réf paiement, historique...)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          {/* Right Column (Aperçu) — hidden on mobile */}
          <div className="hidden lg:flex w-[440px] border-l border-[#F7F7F7] bg-white p-0 flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[#F7F7F7]">
              <h3 className="text-sm font-bold text-[#1A1916]">Aperçu en direct</h3>
              <div className="flex items-center gap-2 rounded-[7px] border border-[#E8E8E5] bg-[#FAFAFA] px-3 py-1 text-[10px] font-bold text-[#6B6B6B]">
                <div className="size-1.5 rounded-full bg-[#6B6B6B]" />
                BROUILLON
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-[#FAFAFA]/30">
              {/* Document Simulé */}
              <div className="bg-white shadow-sm border border-[#E8E8E5] rounded-xl p-8 min-h-[500px] flex flex-col">
                {/* Header Atelier */}
                <div className="flex items-center gap-4 border-b border-[#F7F7F7] pb-8 mb-8">
                  <div />
                  <div>
                    <h4 className="font-bold text-[#1A1916] text-sm">{store.workshopInfo?.name || "Atelier"}</h4>
                    <p className="text-[10px] text-[#6B6B6B]">Facture professionnelle</p>
                  </div>
                </div>

                {isFormValid ? (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-2 gap-8 text-[11px]">
                      <div className="space-y-4">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#8A8A8A] mb-1">
                            FACTURER À
                          </p>
                          <p className="font-bold text-[#1A1916]">{customerInfo.name}</p>
                          <p className="text-[#6B6B6B]">{customerInfo.phone}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#8A8A8A] mb-1">APPAREIL</p>
                          <p className="font-bold text-[#1A1916]">{customerInfo.device || "—"}</p>
                          <p className="text-[#6B6B6B] italic">{customerInfo.issue || "Intervention atelier"}</p>
                        </div>
                      </div>
                      <div className="space-y-4 text-right">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#8A8A8A] mb-1">DATE</p>
                          <p className="font-bold text-[#1A1916]">
                            {new Date(dates.invoice).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#8A8A8A] mb-1">ÉCHÉANCE</p>
                          <p className="font-bold text-[#2A9D8F]">
                            {new Date(dates.due).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-[#F7F7F7] pb-2 text-[10px] font-bold text-[#8A8A8A] uppercase tracking-wider">
                        <span>Description</span>
                        <span>Total</span>
                      </div>
                      {lines
                        .filter((l) => l.description.trim() !== "")
                        .map((l) => (
                          <div key={l.id} className="flex justify-between items-start text-[11px] gap-4">
                            <div className="flex-1">
                              <p className="font-semibold text-[#1A1916]">{l.description}</p>
                              <p className="text-[10px] text-[#6B6B6B]">
                                Qté : {l.quantity} x {formatEuro(l.unitPrice)}
                              </p>
                            </div>
                            <p className="font-bold text-[#1A1916]">{formatEuro(l.quantity * l.unitPrice)}</p>
                          </div>
                        ))}
                    </div>

                    <div className="mt-auto pt-8 border-t border-[#F7F7F7] space-y-2">
                      <div className="flex justify-between text-[11px] text-[#6B6B6B]">
                        <span>Total HT</span>
                        <span className="font-bold text-[#1A1916]">{formatEuro(subtotal)}</span>
                      </div>
                      {!isMicro && (
                        <div className="flex justify-between text-[11px] text-[#6B6B6B]">
                          <span>TVA (20 %)</span>
                          <span className="font-bold text-[#1A1916]">{formatEuro(tva)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-end pt-2">
                        <span className="text-xs font-bold text-[#1A1916]">TOTAL TTC</span>
                        <span className="text-xl font-bold text-[#2A9D8F]">{formatEuro(total)}</span>
                      </div>
                      {isMicro && (
                        <p className="text-[9px] text-center text-[#8A8A8A] pt-4 italic">
                          TVA non applicable — art. 293 B du CGI
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                    <div className="size-12 rounded-[12px] border border-[#E8E8E5] bg-[#FAFAFA] flex items-center justify-center mb-4">
                      <FileText className="size-6 text-[#8A8A8A]" />
                    </div>
                    <p className="text-sm font-bold text-[#1A1916] mb-1">Facture en cours de saisie</p>
                    <p className="text-xs text-[#6B6B6B]">Les informations de la facture s'afficheront ici.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Sticky */}
          <div className="absolute bottom-0 left-0 right-0 border-t border-[#F7F7F7] bg-white px-8 py-5 flex items-center justify-between z-20">
            <div className="flex items-center gap-6">
              <button
                onClick={onClose}
                className="text-sm font-bold text-[#6B6B6B] hover:text-[#1A1916] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleCreate("Brouillon")}
                className="flex items-center gap-2 text-sm font-bold text-[#6B6B6B] hover:text-[#1A1916] transition-colors"
              >
                <Save className="size-4" />
                Enregistrer en brouillon
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleCreate("Envoyée", false)}
                disabled={!isFormValid}
                className="h-11 px-8 rounded-[12px] bg-[#E7F5F1] text-sm font-bold text-[#167B70] border border-[#2A9D8F]/20 hover:bg-[#D8EDE7] transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                Créer la facture
              </button>
              <button
                onClick={() => handleCreate("Envoyée", true)}
                disabled={!isFormValid}
                className="h-11 px-8 rounded-[12px] bg-[#2A9D8F] text-sm font-bold text-white hover:bg-[#238b7e] transition-all disabled:opacity-50 active:scale-[0.98] flex items-center gap-2"
              >
                <Download className="size-4" />
                Créer et télécharger le PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChoiceCard({
  title,
  subtitle,
  description,
  icon,
  onClick,
}: Readonly<{ title: string; subtitle?: string; description: string; icon: React.ReactNode; onClick: () => void }>) {
  return (
    <button
      className="group flex flex-col items-start gap-4 rounded-xl border border-[#E8E8E5] bg-white p-6 text-left transition-all hover:bg-[#F1FAF8] hover:border-[#2A9D8F]/40"
      onClick={onClick}
    >
      <div className="rounded-xl bg-[#F1FAF8] p-4 transition-all group-hover:scale-110 group-hover:rotate-3 shadow-sm">
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-[#1A1916] tracking-tight">{title}</h3>
        {subtitle && (
          <div className="mt-1 inline-flex items-center rounded-full bg-[#E7F5F1] px-2 py-0.5 text-[#167B70] text-[10px] font-bold uppercase">
            {subtitle}
          </div>
        )}
        <p className="mt-3 text-[#6B6B6B] text-xs leading-relaxed opacity-80">{description}</p>
      </div>
    </button>
  );
}

function EmptyState({ message }: Readonly<{ message: string }>) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <AlertCircle className="mb-3 size-10 text-[#8A8A8A]" />
      <p className="text-[#6B6B6B] text-sm">{message}</p>
    </div>
  );
}

function PreviewTotal({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-[#6B6B6B]">{label}</span>
      <span className="font-medium text-[#1A1916]">{value}</span>
    </div>
  );
}
