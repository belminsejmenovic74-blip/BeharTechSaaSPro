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
  Download,
  FileText,
  GripVertical,
  Layers,
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
  formatCurrency,
  formatEuro,
  formatIsoToDisplay,
  getBillingWorkshopInfo,
  getInvoiceTotal,
  getVatSummary,
  type InvoiceStatus,
  linesForInvoiceFromQuote,
  type QuoteLine,
  type WorkshopCountry,
  type WorkshopCurrency,
  useBeharStore,
} from "@/lib/behar-store";
import { displayCustomerName, isCounterCustomer } from "@/lib/customer-display";
import { cn } from "@/lib/utils";
import { getAllowedCurrencies, normalizeAllowedMarkets } from "@/lib/workshop-country";

import { useDocument } from "./print-provider";

const invoiceStatuses: InvoiceStatus[] = ["Brouillon", "Envoyée", "Annulée"];

function displayedInvoiceStatus(status: string): string {
  // Les anciennes valeurs sont conservees en base mais ne sont plus exposees
  // comme resultat financier dans l'interface.
  return status === "Payée" ? "Envoyée" : status;
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

export function InvoicesWorkspace() {
  const router = useRouter();
  const store = useBeharStore();
  const { print, download } = useDocument();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [linesEditing, setLinesEditing] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceFilterTab, setInvoiceFilterTab] = useState<"all" | "month" | "cancelled" | "counter">("all");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Métadonnées enrichies par facture : dossier / devis liés + index de recherche.
  const invoiceMeta = useMemo(() => {
    const map = new Map<
      string,
      {
        repairNumber?: string;
        quoteNumber?: string;
        deviceLabel: string;
        refs: string[];
        haystack: string;
      }
    >();
    for (const invoice of store.invoices) {
      const entryCustomer = store.customers.find((entry) => entry.id === invoice.customerId);
      const repair = invoice.repairId ? store.repairs.find((entry) => entry.id === invoice.repairId) : undefined;
      const quote = invoice.quoteId ? store.quotes.find((entry) => entry.id === invoice.quoteId) : undefined;
      const deviceLabel = repair ? repair.deviceModel || repair.device || "" : "";
      const dossierNumber = repair?.number ?? invoice.sourceNumber;
      const refs = [
        dossierNumber ? `Dossier ${dossierNumber}` : "",
        quote?.number ? `Devis ${quote.number}` : "",
      ].filter(Boolean);
      const haystack =
        `${invoice.number} ${displayCustomerName(entryCustomer)} ${entryCustomer?.phone ?? ""} ${invoice.sourceNumber ?? ""} ${repair?.number ?? ""} ${deviceLabel} ${quote?.number ?? ""}`.toLowerCase();
      map.set(invoice.id, {
        repairNumber: dossierNumber,
        quoteNumber: quote?.number,
        deviceLabel,
        refs,
        haystack,
      });
    }
    return map;
  }, [store.invoices, store.customers, store.repairs, store.quotes]);

  const visibleInvoices = useMemo(() => {
    const q = invoiceSearch.trim().toLowerCase();
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return store.invoices.filter((invoice) => {
      const entryCustomer = store.customers.find((entry) => entry.id === invoice.customerId);

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

  const invoiceGrandTotal = selected ? getInvoiceTotal(selected) : 0;
  const selectedCurrency = selected?.currency ?? store.workshopInfo.currency;
  const documentLocked = Boolean(selected && (selected.lockedAt || selected.status !== "Brouillon"));
  const lineInputsLocked = documentLocked || !linesEditing;

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
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#98A2B3]" />
            <input
              className="h-11 w-full rounded-[14px] border border-[#E4E7EC] bg-white pr-4 pl-10 text-sm outline-none transition placeholder:text-[#98A2B3] focus:border-[#2A9D8F]/55 focus:ring-4 focus:ring-[#2A9D8F]/10"
              placeholder="Rechercher une facture..."
              type="search"
              value={invoiceSearch}
              onChange={(e) => setInvoiceSearch(e.target.value)}
            />
          </label>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              className="hidden md:block h-11 cursor-pointer rounded-[14px] border border-[#E4E7EC] bg-white px-3 text-sm outline-none transition focus:border-[#2A9D8F]"
              onChange={(e) => setInvoiceFilterTab(e.target.value as typeof invoiceFilterTab)}
              value={invoiceFilterTab}
            >
              <option value="all">Toutes</option>
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
            const billed = allInvoices
              .filter(
                (i) =>
                  i.status !== "Brouillon" &&
                  i.status !== "Annulée" &&
                  (i.currency ?? store.workshopInfo.currency) === store.workshopInfo.currency,
              )
              .reduce((s, i) => s + getInvoiceTotal(i), 0);
            const issued = allInvoices.filter((i) => i.status !== "Brouillon" && i.status !== "Annulée").length;
            const count = allInvoices.length;
            return (
              <section className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 scrollbar-none">
                <div className="w-[44%] shrink-0 rounded-[18px] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                  <span className="grid size-9 place-items-center text-[#2A9D8F]">
                    <Receipt className="size-[18px]" />
                  </span>
                  <p className="mt-3 text-[#667085] text-[11px] font-medium">Total factures</p>
                  <p className="mt-1.5 font-bold text-[#101828] text-[20px] leading-none tabular-nums">{count}</p>
                </div>
                <div className="w-[44%] shrink-0 rounded-[18px] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                  <span className="grid size-9 place-items-center text-[#2A9D8F]">
                    <Receipt className="size-[18px]" />
                  </span>
                  <p className="mt-3 text-[#667085] text-[11px] font-medium">CA facturé</p>
                  <p className="mt-1.5 font-bold text-[#2A9D8F] text-[20px] leading-none tabular-nums">
                    {formatEuro(billed)}
                  </p>
                </div>
                <div className="w-[44%] shrink-0 rounded-[18px] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                  <span className="grid size-9 place-items-center rounded-[10px] bg-[#FFFFFF] text-[#667085]">
                    <Receipt className="size-[18px]" />
                  </span>
                  <p className="mt-3 text-[#667085] text-[11px] font-medium">Factures émises</p>
                  <p className="mt-1.5 font-bold text-[#667085] text-[20px] leading-none tabular-nums">{issued}</p>
                </div>
              </section>
            );
          })()}

          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#667085]" />
            <input
              className="h-12 w-full rounded-[14px] border border-[#E4E7EC] bg-white pr-4 pl-10 text-sm outline-none focus:border-[#2A9D8F] placeholder:text-[#667085]"
              placeholder="Rechercher une facture…"
              type="search"
              value={invoiceSearch}
              onChange={(e) => setInvoiceSearch(e.target.value)}
            />
          </div>

          <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
            {(["all", "month", "cancelled"] as const).map((tab) => {
              const labels: Record<string, string> = {
                all: "Toutes",
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
                    active ? "border-[#2A9D8F] bg-[#2A9D8F] text-white" : "border-[#E4E7EC] bg-white text-[#101828]"
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          <ul className="space-y-2.5">
            {visibleInvoices.length === 0 ? (
              <li className="rounded-[18px] bg-white p-10 text-center text-[#667085] text-sm shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
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
                      className="flex w-full items-start gap-3 rounded-[18px] bg-white p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition active:scale-[0.99]"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#FFFFFF] text-[#101828]">
                        <Receipt className="size-[18px]" strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate font-semibold text-[#101828] text-[14px] tracking-tight">
                            {displayCustomerName(entryCustomer)}
                          </p>
                          <p className="shrink-0 font-bold text-[#101828] text-[15px] tabular-nums">
                            {formatCurrency(getInvoiceTotal(invoice), invoice.currency ?? store.workshopInfo.currency)}
                          </p>
                        </div>
                        <p className="mt-0.5 font-mono text-[#2A9D8F] text-[11px]">{invoice.number}</p>
                        <p className="mt-0.5 truncate text-[#667085] text-[11.5px]">
                          {formatIsoToDisplay(invoice.date)}
                          {meta?.deviceLabel ? ` · ${meta.deviceLabel}` : ""}
                        </p>
                        {meta && meta.refs.length > 0 ? (
                          <p className="mt-0.5 truncate text-[#167B70] text-[11px]">{meta.refs.join(" · ")}</p>
                        ) : (
                          <p className="mt-0.5 truncate text-[#667085] text-[11px]">Vente directe</p>
                        )}
                        <div className="mt-2">
                          <StatusBadge status={displayedInvoiceStatus(invoice.status)} />
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
                    className={`cursor-pointer transition hover:bg-[#FFFFFF] ${
                      active ? "border-[#2A9D8F]/30 border-y bg-[#FFFFFF] text-[#167B70]" : ""
                    }`}
                    key={invoice.id}
                    onClick={() => store.setSelected("invoice", invoice.id)}
                  >
                    <td className="border-[#E4E7EC] border-b px-5 py-4 font-bold">{invoice.number}</td>
                    <td className="border-[#E4E7EC] border-b px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#101828]">{displayCustomerName(entryCustomer)}</span>
                        <span className="text-[11px] text-[#667085]">{meta?.deviceLabel || "Vente directe"}</span>
                      </div>
                    </td>
                    <td className="border-[#E4E7EC] border-b px-5 py-4">
                      {meta && meta.refs.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {meta.refs.map((ref) => (
                            <span className="font-mono text-[11px] text-[#167B70]" key={ref}>
                              {ref}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#98A2B3]">—</span>
                      )}
                    </td>
                    <td className="border-[#E4E7EC] border-b px-5 py-4">{formatIsoToDisplay(invoice.date)}</td>
                    <td className="border-[#E4E7EC] border-b px-5 py-4">
                      <StatusBadge status={displayedInvoiceStatus(invoice.status)} />
                    </td>
                    <td className="border-[#E4E7EC] border-b px-5 py-4 font-black tabular-nums">
                      {formatCurrency(getInvoiceTotal(invoice), invoice.currency ?? store.workshopInfo.currency)}
                    </td>
                    <td className="border-[#E4E7EC] border-b px-5 py-4 text-right">
                      <ChevronRight className="ml-auto size-4 text-[#98A2B3]" />
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
            "md:relative md:inset-auto md:z-auto md:flex md:h-full md:min-h-0 md:flex-col md:overflow-hidden md:rounded-[20px] md:border md:border-[#E4E7EC] md:bg-white md:p-5 md:shadow-[0_12px_40px_rgba(16,24,40,0.045)]",
          )}
        >
          {/* Mobile back button */}
          <div className="md:hidden -mx-5 -mt-5 mb-3 sticky top-0 z-10 flex items-center gap-3 border-b border-[#FFFFFF] bg-white px-4 py-3">
            <button
              type="button"
              onClick={() => setMobileDetailOpen(false)}
              className="grid size-9 place-items-center rounded-[12px] border border-[#E4E7EC] bg-white text-[#101828] transition active:scale-90"
              aria-label="Retour"
            >
              <ArrowLeft className="size-4" />
            </button>
            <span className="font-semibold text-[#101828] text-[15px] tracking-tight">Détail facture</span>
          </div>
          <div className="mb-6 shrink-0 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-bold text-[#101828] text-xl tracking-tight">Facture {selected.number}</h2>
              <p className="mt-1 text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider">
                {formatIsoToDisplay(selected.date)}
              </p>
            </div>
            <StatusBadge
              className="h-6 px-2.5 text-[10px] font-bold uppercase tracking-wider"
              status={displayedInvoiceStatus(selected.status)}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-6">
            <div className="rounded-xl border border-[#FFFFFF] p-4">
              <p className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider mb-2">Destinataire</p>
              <p className="font-bold text-[#101828]">{displayCustomerName(customer)}</p>
              <div className="mt-2 space-y-1 text-xs text-[#667085]">
                <p>{customer?.phone}</p>
                <p>{customer?.email || "Pas d'email"}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#FFFFFF] pb-2">
                <p className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider">Détails de facturation</p>
                {!documentLocked && (
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
                    className="flex flex-col gap-2 rounded-xl border border-[#FFFFFF] bg-white p-3 transition-shadow hover:shadow-sm"
                  >
                    <div className="flex justify-between gap-3">
                      {linesEditing ? (
                        <textarea
                          className="flex-1 resize-none bg-transparent font-medium text-[#101828] text-sm outline-none border-b border-dashed border-[#2A9D8F]/20 focus:border-[#2A9D8F]"
                          rows={1}
                          value={line.description}
                          onChange={(e) => updateInvoiceLine(line.id, { description: e.target.value })}
                        />
                      ) : (
                        <p className="flex-1 font-medium text-[#101828] text-sm">{line.description}</p>
                      )}
                      <p className="font-bold text-[#101828] text-sm">
                        {formatCurrency(line.quantity * line.unitPrice, selectedCurrency)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {linesEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            className="w-10 h-7 rounded-lg border border-[#E4E7EC] text-center text-xs outline-none focus:border-[#2A9D8F]"
                            value={line.quantity}
                            onChange={(e) => updateInvoiceLine(line.id, { quantity: Number(e.target.value) })}
                          />
                          <span className="text-[10px] text-[#98A2B3]">x</span>
                          <input
                            type="number"
                            className="w-20 h-7 rounded-lg border border-[#E4E7EC] text-center text-xs outline-none focus:border-[#2A9D8F]"
                            value={line.unitPrice}
                            onChange={(e) => updateInvoiceLine(line.id, { unitPrice: Number(e.target.value) })}
                          />
                        </div>
                      ) : (
                        <p className="text-[10px] text-[#667085]">
                          {line.quantity} x {formatCurrency(line.unitPrice, selectedCurrency)}
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
                    className="w-full py-2.5 rounded-xl border border-dashed border-[#E4E7EC] text-[#98A2B3] text-[11px] font-bold hover:border-[#101828] hover:text-[#101828] transition-all"
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
                    <div className="flex justify-between text-xs text-[#667085]">
                      <span>Sous-total HT</span>
                      <span className="font-medium">
                        {formatCurrency(getVatSummary(selected.lines, store.workshopInfo).ht, selectedCurrency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-[#667085]">
                      <span>
                        TVA ({Math.round(getVatSummary(selected.lines, store.workshopInfo).rate * 1000) / 10}%)
                      </span>
                      <span className="font-medium">
                        {formatCurrency(getVatSummary(selected.lines, store.workshopInfo).tva, selectedCurrency)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-xs text-[#667085]">
                    <span>Sous-total HT</span>
                    <span className="font-medium">{formatCurrency(invoiceGrandTotal, selectedCurrency)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#FFFFFF]">
                <span className="font-bold text-[#101828] text-sm uppercase">
                  {store.workshopInfo.vatApplicable ? "Total TTC" : "Total Net"}
                </span>
                <span className="font-bold text-[#101828] text-2xl tracking-tight">
                  {formatCurrency(
                    store.workshopInfo.vatApplicable
                      ? getVatSummary(selected.lines, store.workshopInfo).ttc
                      : invoiceGrandTotal,
                    selectedCurrency,
                  )}
                </span>
              </div>

              <p className="text-center text-[9px] text-[#98A2B3] uppercase tracking-widest pt-4">
                {store.workshopInfo.vatApplicable ? "TVA incluse au taux légal" : store.workshopInfo.tvaMention}
              </p>
            </div>

            <p className="rounded-[14px] border border-[#D7EFEA] bg-[#F0FAF8] p-4 text-[#47706B] text-xs leading-relaxed">
              Le paiement est réalisé et conservé hors de BEHAR TECH PRO par votre prestataire de paiement.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-[#FFFFFF] space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => download("invoice", selected.id)}
                className="h-10 rounded-xl border border-[#E4E7EC] bg-white text-[#101828] font-bold text-xs hover:bg-[#FFFFFF] transition-all flex items-center justify-center gap-2"
              >
                <Download className="size-3.5" />
                PDF
              </button>
              <button
                onClick={() => print("invoice", selected.id)}
                className="h-10 rounded-xl border border-[#E4E7EC] bg-white text-[#101828] font-bold text-xs hover:bg-[#FFFFFF] transition-all flex items-center justify-center gap-2"
              >
                <Printer className="size-3.5" />
                Imprimer
              </button>
            </div>
          </div>
        </Panel>
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
  const [billingCountry, setBillingCountry] = useState<WorkshopCountry>(store.workshopInfo.country);
  const [docCurrency, setDocCurrency] = useState<WorkshopCurrency>(store.workshopInfo.country === "CH" ? "CHF" : "EUR");
  const allowedMarkets = useMemo(
    () => normalizeAllowedMarkets(store.workshopSettings.allowedMarkets, store.workshopInfo.country),
    [store.workshopInfo.country, store.workshopSettings.allowedMarkets],
  );
  const allowedCurrencies = useMemo(
    () => getAllowedCurrencies(allowedMarkets, store.workshopInfo.country),
    [allowedMarkets, store.workshopInfo.country],
  );

  const availableQuotes = store.quotes.filter((q) => q.status === "Accepté" && !q.invoiceId);
  const availableRepairs = store.repairs.filter((r) => !r.invoiceId);

  useEffect(() => {
    if (allowedMarkets.length !== 1) return;
    setBillingCountry(allowedMarkets[0]);
    setDocCurrency(allowedCurrencies[0]);
  }, [allowedCurrencies, allowedMarkets]);

  // Synchronisation des données selon la source
  useEffect(() => {
    if (sourceType === "quote" && selectedId) {
      const q = store.quotes.find((item) => item.id === selectedId);
      const c = store.customers.find((item) => item.id === q?.customerId);
      const r = q?.repairId ? store.repairs.find((item) => item.id === q.repairId) : undefined;
      if (q && c) {
        setBillingCountry(q.billingCountry);
        setDocCurrency(q.currency ?? (q.billingCountry === "CH" ? "CHF" : "EUR"));
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
        setBillingCountry(r.billingCountry);
        setDocCurrency(r.currency ?? (r.billingCountry === "CH" ? "CHF" : "EUR"));
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
  const billingWorkshop = getBillingWorkshopInfo(store.workshopInfo, billingCountry);
  const invoiceCurrency = docCurrency;
  const isMicro = billingWorkshop.isMicroEnterprise === true;
  const tva = isMicro ? 0 : subtotal * ((billingWorkshop.vatRate ?? 0) / 100);
  const total = subtotal + tva;

  const { download } = useDocument();

  const handleCreate = (status: InvoiceStatus, shouldDownload = false) => {
    if (!customerInfo.name) {
      toast.error("Veuillez renseigner le nom du client avant de créer une facture");
      return;
    }

    if (total <= 0 && status !== "Brouillon") {
      const confirmZero = window.confirm(`Cette facture est à 0 ${invoiceCurrency}. Voulez-vous vraiment la créer ?`);
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
        billingCountry,
        currency: invoiceCurrency,
        locale: billingCountry === "CH" ? "fr-CH" : "fr-FR",
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
      billingCountry,
      currency: invoiceCurrency,
      locale: billingCountry === "CH" ? "fr-CH" : "fr-FR",
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
      <div className="relative flex min-h-svh w-full max-w-none flex-col overflow-hidden rounded-none border border-[#E4E7EC] bg-white shadow-2xl animate-in fade-in zoom-in duration-200 md:h-[90vh] md:min-h-0 md:max-w-[1200px] md:rounded-[16px]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#FFFFFF] bg-white md:px-8 md:py-6">
          <div>
            <h2 className="text-[18px] font-bold text-[#101828] md:text-[22px]">Nouvelle facture</h2>
            <p className="mt-0.5 text-[12.5px] text-[#667085] md:mt-1 md:text-sm">Facturation rapide</p>
          </div>
          <button
            onClick={onClose}
            className="grid size-9 place-items-center rounded-[12px] border border-[#E4E7EC] bg-white text-[#101828] transition hover:bg-[#FFFFFF] md:size-auto md:bg-transparent md:p-0"
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
              <label className="text-[13px] font-bold text-[#101828] md:text-sm">Origine de la facture</label>
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
                        ? "border-[#2A9D8F] bg-[#FFFFFF] shadow-sm"
                        : "border-[#E4E7EC] bg-white hover:border-[#2A9D8F]/30"
                    }`}
                  >
                    <div className={`${sourceType === opt.id ? "text-[#2A9D8F]" : "text-[#667085]"}`}>
                      {cloneElement(opt.icon as React.ReactElement<{ className?: string }>, { className: "size-6" })}
                    </div>
                    <p
                      className={`text-xs font-semibold text-center px-2 ${sourceType === opt.id ? "text-[#167B70]" : "text-[#101828]"}`}
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

            <div className="mt-5 rounded-[14px] border border-[#DDEFEA] bg-[#FFFFFF] p-4">
              <p className="text-xs font-semibold text-[#101828]">Pays de facturation du dossier</p>
              {allowedMarkets.length > 1 ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {allowedMarkets.map((country) => (
                    <button
                      key={country}
                      type="button"
                      disabled={(sourceType === "quote" || sourceType === "repair") && Boolean(selectedId)}
                      onClick={() => {
                        setBillingCountry(country);
                        setDocCurrency(country === "CH" ? "CHF" : "EUR");
                      }}
                      className={`h-10 rounded-[10px] border text-xs font-semibold ${
                        billingCountry === country
                          ? "border-[#2A9D8F] bg-white text-[#167B70]"
                          : "border-[#E4E7EC] bg-white text-[#667085]"
                      } disabled:cursor-not-allowed disabled:opacity-70`}
                    >
                      {country === "CH" ? "Suisse · CHF" : "France · EUR"}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 rounded-[10px] bg-white px-3 py-2 text-xs font-bold text-[#167B70]">
                  {allowedMarkets[0] === "CH" ? "Suisse · CHF" : "France · EUR"}
                </p>
              )}
            </div>

            {allowedCurrencies.length > 1 ? (
              <div className="mt-4">
                <p className="text-xs font-semibold text-[#101828]">Devise du document</p>
                <div className="mt-2 flex gap-2">
                  {allowedCurrencies.map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => setDocCurrency(curr)}
                      className={`h-9 px-4 rounded-[10px] border text-xs font-semibold transition ${
                        docCurrency === curr
                          ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#1E7A6E]"
                          : "border-[#E4E7EC] bg-white text-[#667085] hover:border-[#D0D5DD]"
                      }`}
                    >
                      {curr === "EUR" ? "EUR (€)" : "CHF (CHF)"}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* 2. Informations */}
            <div className="mt-10 space-y-4">
              <label className="text-sm font-bold text-[#101828]">Informations principales</label>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#667085]">Client</p>
                  {sourceType === "manual" ? (
                    <input
                      className="h-11 w-full rounded-[10px] border border-[#E4E7EC] bg-white px-4 text-sm outline-none focus:border-[#2A9D8F] transition-all"
                      placeholder="Nom du client..."
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    />
                  ) : (
                    <div className="relative">
                      <select
                        className="h-11 w-full appearance-none rounded-[10px] border border-[#E4E7EC] bg-white px-4 text-sm outline-none focus:border-[#2A9D8F] transition-all"
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
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#98A2B3]" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#667085]">Email client</p>
                  <input
                    className="h-11 w-full rounded-[10px] border border-[#E4E7EC] bg-white px-4 text-sm outline-none focus:border-[#2A9D8F] transition-all"
                    placeholder="Email (optionnel)..."
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#667085]">Téléphone</p>
                  <input
                    className="h-11 w-full rounded-[10px] border border-[#E4E7EC] bg-white px-4 text-sm outline-none focus:border-[#2A9D8F] transition-all"
                    placeholder="Numéro de téléphone..."
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#667085]">Date de facture</p>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#98A2B3]" />
                    <input
                      type="date"
                      className="h-11 w-full rounded-[10px] border border-[#E4E7EC] bg-white pl-10 pr-4 text-sm outline-none focus:border-[#2A9D8F]"
                      value={dates.invoice}
                      onChange={(e) => setDates({ ...dates, invoice: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#667085]">Date d'échéance</p>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#98A2B3]" />
                    <input
                      type="date"
                      className="h-11 w-full rounded-[10px] border border-[#E4E7EC] bg-white pl-10 pr-4 text-sm outline-none focus:border-[#2A9D8F]"
                      value={dates.due}
                      onChange={(e) => setDates({ ...dates, due: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#667085]">Appareil</p>
                  <input
                    className="h-11 w-full rounded-[10px] border border-[#E4E7EC] bg-white px-4 text-sm outline-none focus:border-[#2A9D8F] transition-all"
                    placeholder="Ex. iPhone 14 Pro Max"
                    value={customerInfo.device}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, device: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#667085]">Panne / description</p>
                  <input
                    className="h-11 w-full rounded-[10px] border border-[#E4E7EC] bg-white px-4 text-sm outline-none focus:border-[#2A9D8F] transition-all"
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
                <label className="text-sm font-bold text-[#101828]">Lignes de facture</label>
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
              <div className="rounded-[12px] border border-[#E4E7EC] overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FFFFFF] text-[#667085] border-b border-[#E4E7EC] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 w-16 text-center">Qté</th>
                      <th className="px-4 py-3 w-28 text-right">Prix U. HT</th>
                      <th className="px-4 py-3 w-20 text-center">TVA</th>
                      <th className="px-4 py-3 w-28 text-right">Total HT</th>
                      <th className="px-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E7EC]">
                    {lines.map((line, idx) => (
                      <tr key={line.id} className="hover:bg-[#FFFFFF] transition-colors">
                        <td className="p-2">
                          <input
                            className="w-full h-9 px-2 rounded-lg border border-transparent focus:border-[#E4E7EC] bg-transparent outline-none text-[#101828]"
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
                            className="w-full h-9 text-center rounded-lg border border-transparent focus:border-[#E4E7EC] bg-transparent outline-none text-[#101828]"
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
                            className="w-full h-9 text-right pr-2 rounded-lg border border-transparent focus:border-[#E4E7EC] bg-transparent outline-none text-[#101828]"
                            value={line.unitPrice}
                            onChange={(e) => {
                              const newLines = [...lines];
                              newLines[idx].unitPrice = Number(e.target.value);
                              setLines(newLines);
                            }}
                          />
                        </td>
                        <td className="p-2 text-center text-[#667085]">
                          {isMicro ? "N/A" : `${billingWorkshop.vatRate ?? 0} %`}
                        </td>
                        <td className="p-2 text-right font-semibold text-[#101828]">
                          {formatCurrency(line.quantity * line.unitPrice, invoiceCurrency)}
                        </td>
                        <td className="p-2">
                          <button
                            onClick={() => setLines(lines.filter((l) => l.id !== line.id))}
                            className="text-[#98A2B3] hover:text-[#B42318] transition-colors p-2"
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
              <label className="text-sm font-bold text-[#101828]">Commentaires internes</label>
              <textarea
                className="w-full min-h-[120px] p-4 rounded-[12px] border border-[#E4E7EC] bg-white text-sm outline-none focus:border-[#2A9D8F] transition-all resize-none"
                placeholder="Notes visibles uniquement par l'équipe (correction documentaire, historique...)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          {/* Right Column (Aperçu) — hidden on mobile */}
          <div className="hidden lg:flex w-[440px] border-l border-[#FFFFFF] bg-white p-0 flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[#FFFFFF]">
              <h3 className="text-sm font-bold text-[#101828]">Aperçu en direct</h3>
              <div className="flex items-center gap-2 rounded-[7px] border border-[#E4E7EC] bg-[#FFFFFF] px-3 py-1 text-[10px] font-bold text-[#667085]">
                <div className="size-1.5 rounded-full bg-[#667085]" />
                BROUILLON
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-[#FFFFFF]">
              {/* Document Simulé */}
              <div className="bg-white shadow-sm border border-[#E4E7EC] rounded-xl p-8 min-h-[500px] flex flex-col">
                {/* Header Atelier */}
                <div className="flex items-center gap-4 border-b border-[#FFFFFF] pb-8 mb-8">
                  <div />
                  <div>
                    <h4 className="font-bold text-[#101828] text-sm">{store.workshopInfo?.name || "Atelier"}</h4>
                    <p className="text-[10px] text-[#667085]">Facture professionnelle</p>
                  </div>
                </div>

                {isFormValid ? (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-2 gap-8 text-[11px]">
                      <div className="space-y-4">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#98A2B3] mb-1">
                            FACTURER À
                          </p>
                          <p className="font-bold text-[#101828]">{customerInfo.name}</p>
                          <p className="text-[#667085]">{customerInfo.phone}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#98A2B3] mb-1">APPAREIL</p>
                          <p className="font-bold text-[#101828]">{customerInfo.device || "—"}</p>
                          <p className="text-[#667085] italic">{customerInfo.issue || "Intervention atelier"}</p>
                        </div>
                      </div>
                      <div className="space-y-4 text-right">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#98A2B3] mb-1">DATE</p>
                          <p className="font-bold text-[#101828]">
                            {new Date(dates.invoice).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#98A2B3] mb-1">ÉCHÉANCE</p>
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
                      <div className="flex items-center justify-between border-b border-[#FFFFFF] pb-2 text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider">
                        <span>Description</span>
                        <span>Total</span>
                      </div>
                      {lines
                        .filter((l) => l.description.trim() !== "")
                        .map((l) => (
                          <div key={l.id} className="flex justify-between items-start text-[11px] gap-4">
                            <div className="flex-1">
                              <p className="font-semibold text-[#101828]">{l.description}</p>
                              <p className="text-[10px] text-[#667085]">
                                Qté : {l.quantity} x {formatCurrency(l.unitPrice, invoiceCurrency)}
                              </p>
                            </div>
                            <p className="font-bold text-[#101828]">
                              {formatCurrency(l.quantity * l.unitPrice, invoiceCurrency)}
                            </p>
                          </div>
                        ))}
                    </div>

                    <div className="mt-auto pt-8 border-t border-[#FFFFFF] space-y-2">
                      <div className="flex justify-between text-[11px] text-[#667085]">
                        <span>Total HT</span>
                        <span className="font-bold text-[#101828]">{formatCurrency(subtotal, invoiceCurrency)}</span>
                      </div>
                      {!isMicro && (
                        <div className="flex justify-between text-[11px] text-[#667085]">
                          <span>TVA (20 %)</span>
                          <span className="font-bold text-[#101828]">{formatCurrency(tva, invoiceCurrency)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-end pt-2">
                        <span className="text-xs font-bold text-[#101828]">TOTAL TTC</span>
                        <span className="text-xl font-bold text-[#2A9D8F]">
                          {formatCurrency(total, invoiceCurrency)}
                        </span>
                      </div>
                      {isMicro && (
                        <p className="text-[9px] text-center text-[#98A2B3] pt-4 italic">
                          {billingWorkshop.tvaMention || "TVA non applicable"}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                    <div className="size-12 rounded-[12px] border border-[#E4E7EC] bg-[#FFFFFF] flex items-center justify-center mb-4">
                      <FileText className="size-6 text-[#98A2B3]" />
                    </div>
                    <p className="text-sm font-bold text-[#101828] mb-1">Facture en cours de saisie</p>
                    <p className="text-xs text-[#667085]">Les informations de la facture s'afficheront ici.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Sticky */}
          <div className="absolute bottom-0 left-0 right-0 border-t border-[#FFFFFF] bg-white px-8 py-5 flex items-center justify-between z-20">
            <div className="flex items-center gap-6">
              <button
                onClick={onClose}
                className="text-sm font-bold text-[#667085] hover:text-[#101828] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleCreate("Brouillon")}
                className="flex items-center gap-2 text-sm font-bold text-[#667085] hover:text-[#101828] transition-colors"
              >
                <Save className="size-4" />
                Enregistrer en brouillon
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleCreate("Envoyée", false)}
                disabled={!isFormValid}
                className="h-11 px-8 rounded-[12px] bg-[#FFFFFF] text-sm font-bold text-[#167B70] border border-[#2A9D8F]/20 hover:bg-[#FFFFFF] transition-all disabled:opacity-50 active:scale-[0.98]"
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
      className="group flex flex-col items-start gap-4 rounded-xl border border-[#E4E7EC] bg-white p-6 text-left transition-all hover:bg-[#FFFFFF] hover:border-[#2A9D8F]/40"
      onClick={onClick}
    >
      <div className="rounded-xl bg-[#FFFFFF] p-4 shadow-sm transition-colors group-hover:bg-[#FFFFFF]">{icon}</div>
      <div>
        <h3 className="font-bold text-[#101828] tracking-tight">{title}</h3>
        {subtitle && (
          <div className="mt-1 inline-flex items-center rounded-full bg-[#FFFFFF] px-2 py-0.5 text-[#167B70] text-[10px] font-bold uppercase">
            {subtitle}
          </div>
        )}
        <p className="mt-3 text-[#667085] text-xs leading-relaxed opacity-80">{description}</p>
      </div>
    </button>
  );
}

function EmptyState({ message }: Readonly<{ message: string }>) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <AlertCircle className="mb-3 size-10 text-[#98A2B3]" />
      <p className="text-[#667085] text-sm">{message}</p>
    </div>
  );
}

function PreviewTotal({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-[#667085]">{label}</span>
      <span className="font-medium text-[#101828]">{value}</span>
    </div>
  );
}
