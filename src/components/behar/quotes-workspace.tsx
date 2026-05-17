"use client";

import { cloneElement, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  Download,
  FileText,
  MoreHorizontal,
  Plus,
  Save,
  Search,
  Smartphone,
  Trash2,
  User,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { 
  formatEuro,
  formatIsoToDisplay,
  getQuoteTotal,
  getVatSummary,
  Quote, 
  type QuoteStatus, 
  useBeharStore 
} from "@/lib/behar-store";
import { displayCustomerName } from "@/lib/customer-display";
import { formatDeviceLabel } from "@/lib/format-device";
import { cn } from "@/lib/utils";
import { useDocument } from "./print-provider";
import {
  Panel,
  PrimaryButton,
  StatusBadge,
  TableShell,
  tableClassName,
  tableHeadClassName,
} from "./primitives";

// --- Types ---
type QuoteOrigin = "repair" | "client" | "manual";

interface QuoteLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface QuoteFormValues {
  origin: QuoteOrigin;
  customerId: string;
  repairId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  device: string;
  issue: string;
  lines: QuoteLine[];
  notes: string;
  validityDays: number;
}

// --- Main Workspace Component ---
export function QuotesWorkspace() {
  const router = useRouter();
  const store = useBeharStore();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [quoteSearch, setQuoteSearch] = useState("");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const { download } = useDocument();

  const visibleQuotes = useMemo(() => {
    const q = quoteSearch.trim().toLowerCase();
    return store.quotes.filter((quote) => {
      const entryCustomer = store.customers.find((c) => c.id === quote.customerId);
      if (!q) return true;
      const needle = `${quote.number} ${displayCustomerName(entryCustomer)}`.toLowerCase();
      return needle.includes(q);
    });
  }, [store.quotes, store.customers, quoteSearch]);

  const selected = store.quotes.find((q) => q.id === store.selectedQuoteId) ?? store.quotes[0];
  const customer = selected ? store.customers.find((c) => c.id === selected.customerId) : undefined;

  const acceptedCount = store.quotes.filter((q) => q.status === "Accepté").length;
  const sentCount = store.quotes.filter((q) => q.status === "Envoyé").length;
  const totalPending = store.quotes
    .filter((q) => q.status !== "Refusé" && q.status !== "Facturé")
    .reduce((sum, q) => sum + getQuoteTotal(q), 0);

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="min-w-0">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <label className="hidden md:block relative w-full max-w-[360px] min-w-[200px]">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#6B6B6B]" />
            <input
              className="h-11 w-full rounded-[14px] border border-[#E7E4DC] bg-white pr-4 pl-10 text-sm outline-none transition placeholder:text-[#8A8984] focus:border-[#2A9D8F]/55 focus:ring-4 focus:ring-[#2A9D8F]/10"
              placeholder="Rechercher un devis..."
              type="search"
              value={quoteSearch}
              onChange={(e) => setQuoteSearch(e.target.value)}
            />
          </label>
          <PrimaryButton className="h-11 px-5 w-full md:w-auto" onClick={() => setCreateModalOpen(true)}>
            <Plus className="size-4" />
            Nouveau devis
          </PrimaryButton>
        </div>

        {createModalOpen && (
          <CreateQuoteModal
            isOpen={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
          />
        )}

        {/* Mobile : KPI strip + recherche + cards */}
        <div className="md:hidden space-y-4">
          <section className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 scrollbar-none">
            <div className="w-[44%] shrink-0 rounded-[18px] bg-white p-4 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
              <span className="grid size-9 place-items-center rounded-[10px] bg-[#EAF6F2] text-[#2A9D8F]"><FileText className="size-[18px]" /></span>
              <p className="mt-3 text-[#8A8984] text-[11px] font-medium leading-tight">Devis envoyés</p>
              <p className="mt-1.5 font-bold text-[#1A1916] text-[20px] leading-none tabular-nums">{sentCount}</p>
              <p className="mt-1.5 text-[#8A8984] text-[10px] font-medium">en attente</p>
            </div>
            <div className="w-[44%] shrink-0 rounded-[18px] bg-white p-4 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
              <span className="grid size-9 place-items-center rounded-[10px] bg-[#EAF6F2] text-[#2A9D8F]"><FileText className="size-[18px]" /></span>
              <p className="mt-3 text-[#8A8984] text-[11px] font-medium leading-tight">Acceptés</p>
              <p className="mt-1.5 font-bold text-[#2A9D8F] text-[20px] leading-none tabular-nums">{acceptedCount}</p>
              <p className="mt-1.5 text-[#8A8984] text-[10px] font-medium">prêts à facturer</p>
            </div>
            <div className="w-[44%] shrink-0 rounded-[18px] bg-white p-4 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
              <span className="grid size-9 place-items-center rounded-[10px] bg-[#FCF1DF] text-[#C2841C]"><FileText className="size-[18px]" /></span>
              <p className="mt-3 text-[#8A8984] text-[11px] font-medium leading-tight">Montant en cours</p>
              <p className="mt-1.5 font-bold text-[#1A1916] text-[20px] leading-none tabular-nums">{formatEuro(totalPending)}</p>
              <p className="mt-1.5 text-[#8A8984] text-[10px] font-medium">non facturés</p>
            </div>
          </section>

          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#8A8984]" />
            <input
              className="h-12 w-full rounded-[14px] border border-[#E7E4DC] bg-white pr-4 pl-10 text-sm outline-none focus:border-[#2A9D8F] placeholder:text-[#8A8984]"
              placeholder="Rechercher un devis…"
              type="search"
              value={quoteSearch}
              onChange={(e) => setQuoteSearch(e.target.value)}
            />
          </div>

          <ul className="space-y-2.5">
            {visibleQuotes.length === 0 ? (
              <li className="rounded-[18px] bg-white p-10 text-center text-[#8A8984] text-sm shadow-[0_1px_2px_rgba(26,25,22,0.04)]">Aucun devis.</li>
            ) : visibleQuotes.map((quote) => {
              const entryCustomer = store.customers.find((c) => c.id === quote.customerId);
              return (
                <li key={quote.id}>
                  <button
                    type="button"
                    onClick={() => {
                      store.setSelected("quote", quote.id);
                      setMobileDetailOpen(true);
                    }}
                    className="flex w-full items-start gap-3 rounded-[18px] bg-white p-4 text-left shadow-[0_1px_2px_rgba(26,25,22,0.04)] transition active:scale-[0.99]"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#FAFAF8] text-[#1A1916]">
                      <FileText className="size-[18px]" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate font-semibold text-[#1A1916] text-[14px] tracking-tight">
                          {displayCustomerName(entryCustomer)}
                        </p>
                        <p className="shrink-0 font-bold text-[#1A1916] text-[15px] tabular-nums">
                          {formatEuro(getQuoteTotal(quote))}
                        </p>
                      </div>
                      <p className="mt-0.5 font-mono text-[#2A9D8F] text-[11px]">{quote.number}</p>
                      <p className="mt-0.5 truncate text-[#8A8984] text-[11.5px]">
                        {formatIsoToDisplay(quote.date)}
                      </p>
                      <div className="mt-2"><StatusBadge status={quote.status} /></div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <TableShell className="hidden md:block min-h-[650px]">
          <table className={tableClassName}>
            <thead className={tableHeadClassName}>
              <tr>
                <th className="px-5 py-3">N°</th>
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3">Montant</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {visibleQuotes.map((quote) => {
                const entryCustomer = store.customers.find((c) => c.id === quote.customerId);
                const active = quote.id === selected?.id;
                return (
                  <tr
                    className={`cursor-pointer transition hover:bg-[#FAFAF8] ${
                      active ? "border-[#2A9D8F]/30 border-y bg-[#E7F5F1] text-[#167B70]" : ""
                    }`}
                    key={quote.id}
                    onClick={() => store.setSelected("quote", quote.id)}
                  >
                    <td className="border-[#E7E4DC] border-b px-5 py-4 font-medium">{quote.number}</td>
                    <td className="border-[#E7E4DC] border-b px-5 py-4">
                      {displayCustomerName(entryCustomer)}
                    </td>
                    <td className="border-[#E7E4DC] border-b px-5 py-4">{formatIsoToDisplay(quote.date)}</td>
                    <td className="border-[#E7E4DC] border-b px-5 py-4">
                      <StatusBadge status={quote.status} />
                    </td>
                    <td className="border-[#E7E4DC] border-b px-5 py-4 font-semibold">
                      {formatEuro(getQuoteTotal(quote))}
                    </td>
                    <td className="border-[#E7E4DC] border-b px-5 py-4 text-right">
                      <MoreHorizontal className="size-4 text-[#B0AEA8]" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableShell>
      </div>

      {selected && (
        <Panel className={cn(
          // Mobile: full-screen overlay when open, else hidden
          mobileDetailOpen
            ? "fixed inset-0 z-40 overflow-y-auto bg-white p-5 flex flex-col"
            : "hidden",
          // Desktop: normal panel
          "md:relative md:inset-auto md:z-auto md:bg-white md:flex md:p-5 md:overflow-visible md:flex-col md:min-h-0",
        )}>
          {/* Mobile back button */}
          <div className="md:hidden -mx-5 -mt-5 mb-3 sticky top-0 z-10 flex items-center gap-3 border-b border-[#F1F1EF] bg-white/95 backdrop-blur-xl px-4 py-3">
            <button
              type="button"
              onClick={() => setMobileDetailOpen(false)}
              className="grid size-9 place-items-center rounded-full bg-[#F1F1EF] text-[#1A1916] transition active:scale-90"
              aria-label="Retour"
            >
              <ArrowLeft className="size-4" />
            </button>
            <span className="font-semibold text-[#1A1916] text-[15px] tracking-tight">Détail devis</span>
          </div>
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="font-semibold text-[#1A1916] text-xl">Devis #{selected.number}</h2>
              <p className="text-xs text-[#6B6B6B] mt-1">Créé le {formatIsoToDisplay(selected.date)}</p>
            </div>
            <StatusBadge status={selected.status} />
          </div>

          <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
            <div>
              <p className="text-[10px] font-bold text-[#B0AEA8] uppercase tracking-wider mb-2">Client</p>
              <p className="font-bold text-[#1A1916]">{displayCustomerName(customer)}</p>
              <p className="text-sm text-[#6B6B6B]">{customer?.phone}</p>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-bold text-[#B0AEA8] uppercase tracking-wider">Lignes du devis</p>
              {selected.lines.map((line) => (
                <div key={line.id} className="flex justify-between items-start text-sm border-b border-[#F1F1EF] pb-2">
                  <div className="flex-1">
                    <p className="font-medium text-[#1A1916]">{line.description}</p>
                    <p className="text-xs text-[#6B6B6B]">{line.quantity} x {formatEuro(line.unitPrice)}</p>
                  </div>
                  <p className="font-bold text-[#1A1916]">{formatEuro(line.quantity * line.unitPrice)}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 space-y-1">
              {store.workshopInfo.vatApplicable ? (
                <>
                  <div className="flex justify-between text-xs text-[#6B6B6B]">
                    <span>Total HT</span>
                    <span className="font-medium">{formatEuro(getVatSummary(selected.lines, store.workshopInfo).ht)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#6B6B6B]">
                    <span>TVA (20%)</span>
                    <span className="font-medium">{formatEuro(getVatSummary(selected.lines, store.workshopInfo).tva)}</span>
                  </div>
                  <div className="flex justify-between items-end pt-2">
                    <span className="text-sm font-bold text-[#1A1916]">TOTAL TTC</span>
                    <span className="text-2xl font-bold text-[#2A9D8F]">{formatEuro(getVatSummary(selected.lines, store.workshopInfo).ttc)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-end pt-2">
                  <span className="text-sm font-bold text-[#1A1916]">TOTAL</span>
                  <span className="text-2xl font-bold text-[#2A9D8F]">{formatEuro(getQuoteTotal(selected))}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#F1F1EF] space-y-3">
            {selected.status === "Accepté" ? (
              <button
                onClick={() => {
                  const invId = store.addInvoice({ 
                    quoteId: selected.id, 
                    customerId: selected.customerId,
                    lines: selected.lines,
                    status: "Brouillon" 
                  });
                  if (invId) {
                    store.setSelected("invoice", invId);
                    router.push("/dashboard/factures");
                    toast.success("Facture générée depuis le devis");
                  }
                }}
                className="w-full h-11 rounded-xl bg-[#2A9D8F] text-white font-bold text-sm shadow-lg shadow-[#2A9D8F]/20 hover:bg-[#238b7e] transition-all flex items-center justify-center gap-2"
              >
                <FileText className="size-4" />
                Générer la facture
              </button>
            ) : selected.status !== "Facturé" ? (
              <button
                onClick={() => {
                  store.updateQuote(selected.id, { status: "Accepté" });
                  const invId = store.addInvoice({ 
                    quoteId: selected.id, 
                    customerId: selected.customerId,
                    lines: selected.lines,
                    status: "Brouillon" 
                  });
                  if (invId) {
                    toast.success("Devis accepté et facture créée");
                  } else {
                    toast.success("Devis marqué comme accepté");
                  }
                }}
                className="w-full h-11 rounded-xl bg-[#2A9D8F] text-white font-bold text-sm shadow-lg shadow-[#2A9D8F]/20 hover:bg-[#238b7e] transition-all flex items-center justify-center gap-2"
              >
                <Check className="size-4" />
                Marquer comme accepté
              </button>
            ) : (
              <div className="bg-[#E7F5F1] text-[#167B70] p-3 rounded-xl text-center text-xs font-bold">
                Ce devis a déjà été facturé
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {selected.status !== "Facturé" && selected.status !== "Refusé" && (
                <button
                  className="h-11 rounded-xl border border-[#E7E4DC] bg-white text-[#1A1916] font-bold text-sm hover:bg-[#FAFAF8] transition-all flex items-center justify-center gap-2"
                  onClick={() => {
                    store.updateQuote(selected.id, { status: "Refusé" });
                    toast.success("Devis marqué comme refusé");
                  }}
                  type="button"
                >
                  Refuser
                </button>
              )}
              <button
                onClick={() => download("quote", selected.id)}
                className="h-11 rounded-xl border border-[#E7E4DC] bg-white text-[#1A1916] font-bold text-sm hover:bg-[#FAFAF8] transition-all flex items-center justify-center gap-2"
              >
                <Download className="size-4" />
                PDF
              </button>
              <button
                onClick={() => store.deleteQuote(selected.id)}
                className="h-11 rounded-xl border border-[#E7E4DC] bg-white text-[#B42318] font-bold text-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="size-4" />
                Supprimer
              </button>
            </div>
          </div>
        </Panel>
      )}
    </section>
  );
}

// --- Creation Modal Component ---
export function CreateQuoteModal({
  isOpen,
  onClose,
  prefill,
}: {
  isOpen: boolean;
  onClose: () => void;
  prefill?: any | null;
}) {
  const store = useBeharStore();
  const { customers, repairs, addQuote, workshopInfo } = store;
  const { download } = useDocument();

  const [form, setForm] = useState<QuoteFormValues>({
    origin: "manual",
    customerId: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    device: "",
    issue: "",
    lines: [{ id: "1", description: "", quantity: 1, unitPrice: 0, total: 0 }],
    notes: "",
    validityDays: 30,
  });

  // Sync prefill or selection
  useEffect(() => {
    if (!isOpen) return;
    
    if (prefill) {
      const r = prefill.repairId ? repairs.find(rep => rep.id === prefill.repairId) : null;
      const c = prefill.customerId ? customers.find(cust => cust.id === prefill.customerId) : null;
      
      setForm({
        origin: prefill.origin || "manual",
        customerId: prefill.customerId || "",
        repairId: prefill.repairId || "",
        customerName: c?.name || "",
        customerPhone: c?.phone || "",
        customerEmail: c?.email || "",
        device: r?.device || r?.deviceModel || "",
        issue: r?.issue || "",
        lines: prefill.lines?.map((l: any) => ({ ...l, total: l.total ?? (l.quantity * l.unitPrice) })) || [{ id: "1", description: "", quantity: 1, unitPrice: 0, total: 0 }],
        notes: prefill.notes || "",
        validityDays: 30,
      });
    }
  }, [isOpen, prefill, repairs, customers]);

  // Sync data when choosing repair/client
  useEffect(() => {
    if (form.origin === "repair" && form.repairId) {
      const r = repairs.find(rep => rep.id === form.repairId);
      const c = r ? customers.find(cust => cust.id === r.customerId) : null;
      if (r) {
        setForm(f => ({
          ...f,
          customerId: r.customerId,
          customerName: c?.name || "",
          customerPhone: c?.phone || "",
          customerEmail: c?.email || "",
          device: r.device || r.deviceModel || "",
          issue: r.issue,
          lines: f.lines[0].description === "" ? [{
            id: "1",
            description: `${r.issue} — ${formatDeviceLabel(r, "")}`.trim(),
            quantity: 1,
            unitPrice: r.amount ?? 0,
            total: r.amount ?? 0
          }] : f.lines
        }));
      }
    } else if (form.origin === "client" && form.customerId) {
      const c = customers.find(cust => cust.id === form.customerId);
      if (c) {
        setForm(f => ({
          ...f,
          customerName: c.name,
          customerPhone: c.phone,
          customerEmail: c.email || "",
          device: c.device || "",
        }));
      }
    }
  }, [form.origin, form.repairId, form.customerId, repairs, customers]);

  if (!isOpen) return null;

  const subtotal = form.lines.reduce((acc, line) => acc + line.quantity * line.unitPrice, 0);
  const isFormValid = form.customerName.trim() !== "" && form.lines.some(l => l.description.trim() !== "");

  const handleAddLine = () => {
    setForm((f) => ({
      ...f,
      lines: [...f.lines, { id: Math.random().toString(36).substr(2, 9), description: "", quantity: 1, unitPrice: 0, total: 0 }],
    }));
  };

  const handleRemoveLine = (id: string) => {
    if (form.lines.length === 1) {
      setForm(f => ({ ...f, lines: [{ id: "1", description: "", quantity: 1, unitPrice: 0, total: 0 }] }));
      return;
    }
    setForm((f) => ({
      ...f,
      lines: f.lines.filter((l) => l.id !== id),
    }));
  };

  const handleLineChange = (id: string, field: keyof QuoteLine, value: any) => {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((l) => {
        if (l.id === id) {
          const next = { ...l, [field]: value };
          next.total = next.quantity * next.unitPrice;
          return next;
        }
        return l;
      }),
    }));
  };

  const handleCreate = (status: QuoteStatus = "Envoyé", shouldDownload = false) => {
    if (!isFormValid) {
      toast.error("Veuillez renseigner au moins un client et une prestation.");
      return;
    }

    let finalCustomerId = form.customerId;
    if (form.origin === "manual" || !finalCustomerId) {
      const existing = customers.find(c => c.name.toLowerCase() === form.customerName.toLowerCase());
      if (existing) finalCustomerId = existing.id;
      else {
        finalCustomerId = store.addCustomer({
          name: form.customerName,
          phone: form.customerPhone,
          email: form.customerEmail,
        });
      }
    }

    const quoteId = addQuote({
      customerId: finalCustomerId,
      repairId: form.repairId,
      status,
      lines: form.lines.filter(l => l.description.trim() !== ""),
      notes: form.notes,
    });

    if (!quoteId) {
      toast.error("Erreur lors de la création du devis.");
      return;
    }

    toast.success(status === "Brouillon" ? "Devis enregistré en brouillon" : "Devis créé avec succès");
    
    if (shouldDownload) {
      setTimeout(() => download("quote", quoteId), 500);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-stretch bg-black/40 backdrop-blur-sm p-0 md:items-center md:justify-center md:p-4">
      <div className="relative flex min-h-svh w-full max-w-none flex-col overflow-hidden rounded-none border border-[#E7E4DC] bg-[#FAFAF8] shadow-2xl animate-in fade-in zoom-in duration-200 md:h-[90vh] md:min-h-0 md:max-w-[1200px] md:rounded-[16px]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F1EF] bg-white md:px-8 md:py-6">
          <div>
            <h2 className="text-[18px] font-bold text-[#1A1916] md:text-[22px]">Nouveau devis</h2>
            <p className="mt-0.5 text-[12.5px] text-[#6B6B6B] md:mt-1 md:text-sm">Proposition commerciale</p>
          </div>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-[#F1F1EF] text-[#1A1916] transition hover:bg-[#E7E4DC] md:size-auto md:bg-transparent md:p-0" aria-label="Fermer">
            <X className="size-5 md:size-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden relative">

          {/* Left Column - Configuration */}
          <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar pb-32 md:px-8 md:py-8">
            
            {/* 1. Origine */}
            <div className="space-y-3 md:space-y-4">
              <label className="text-[13px] font-bold text-[#1A1916] md:text-sm">Origine du devis</label>
              <div className="grid grid-cols-3 gap-2 md:gap-4">
                {[
                  { id: "repair", label: "Depuis une réparation", icon: <Wrench /> },
                  { id: "client", label: "Client existant", icon: <User /> },
                  { id: "manual", label: "Devis libre", icon: <Plus /> },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setForm(f => ({ ...f, origin: opt.id as QuoteOrigin, customerId: "", repairId: "" }));
                    }}
                    className={`relative flex flex-col items-center justify-center gap-2 rounded-[12px] border h-[86px] transition-all md:gap-3 md:h-[110px] ${
                      form.origin === opt.id
                        ? "border-[#2A9D8F] bg-[#F1FAF8] shadow-sm"
                        : "border-[#E7E4DC] bg-white hover:border-[#2A9D8F]/30"
                    }`}
                  >
                    <div className={`${form.origin === opt.id ? "text-[#2A9D8F]" : "text-[#6B6B6B]"}`}>
                      {cloneElement(opt.icon as any, { className: "size-5 md:size-6" })}
                    </div>
                    <p className={`text-[11px] font-semibold text-center px-1 leading-tight md:text-xs md:px-2 ${form.origin === opt.id ? "text-[#167B70]" : "text-[#1A1916]"}`}>
                      {opt.label}
                    </p>
                    {form.origin === opt.id && (
                      <div className="absolute top-2 right-2 size-5 rounded-full bg-[#2A9D8F] flex items-center justify-center">
                        <Check className="size-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Context Selection (Conditional) */}
            {form.origin !== "manual" && (
              <div className="mt-8 p-4 rounded-xl bg-white border border-[#E7E4DC] space-y-4 animate-in slide-in-from-top-2 duration-300">
                {form.origin === "repair" ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#6B6B6B]">Sélectionner la réparation</p>
                    <div className="relative">
                      <select
                        className="h-11 w-full appearance-none rounded-[10px] border border-[#E7E4DC] bg-white px-4 text-sm outline-none focus:border-[#2A9D8F] transition-all"
                        value={form.repairId}
                        onChange={(e) => setForm(f => ({ ...f, repairId: e.target.value }))}
                      >
                        <option value="">-- Choisir une réparation --</option>
                        {repairs.filter(r => r.status !== "Restitué").map(r => (
                          <option key={r.id} value={r.id}>
                            {r.number} — {customers.find(c => c.id === r.customerId)?.name} ({r.deviceModel})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#B0AEA8]" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#6B6B6B]">Sélectionner le client</p>
                    <div className="relative">
                      <select
                        className="h-11 w-full appearance-none rounded-[10px] border border-[#E7E4DC] bg-white px-4 text-sm outline-none focus:border-[#2A9D8F] transition-all"
                        value={form.customerId}
                        onChange={(e) => setForm(f => ({ ...f, customerId: e.target.value }))}
                      >
                        <option value="">-- Choisir un client --</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#B0AEA8]" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. Informations */}
            <div className="mt-10 space-y-4">
              <label className="text-sm font-bold text-[#1A1916]">Informations principales</label>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#6B6B6B]">Client</p>
                  <input
                    className="h-11 w-full rounded-[10px] border border-[#E7E4DC] bg-white px-4 text-sm outline-none focus:border-[#2A9D8F] transition-all"
                    placeholder="Nom du client..."
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#6B6B6B]">Email client</p>
                  <input
                    className="h-11 w-full rounded-[10px] border border-[#E7E4DC] bg-white px-4 text-sm outline-none focus:border-[#2A9D8F] transition-all"
                    placeholder="Email (optionnel)..."
                    value={form.customerEmail}
                    onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#6B6B6B]">Téléphone</p>
                  <input
                    className="h-11 w-full rounded-[10px] border border-[#E7E4DC] bg-white px-4 text-sm outline-none focus:border-[#2A9D8F] transition-all"
                    placeholder="Numéro de téléphone..."
                    value={form.customerPhone}
                    onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#6B6B6B]">Validité (jours)</p>
                  <input
                    type="number"
                    className="h-11 w-full rounded-[10px] border border-[#E7E4DC] bg-white px-4 text-sm outline-none focus:border-[#2A9D8F]"
                    value={form.validityDays}
                    onChange={(e) => setForm({ ...form, validityDays: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#6B6B6B]">Appareil</p>
                  <input
                    className="h-11 w-full rounded-[10px] border border-[#E7E4DC] bg-white px-4 text-sm outline-none focus:border-[#2A9D8F] transition-all"
                    placeholder="Ex. iPhone 14 Pro Max"
                    value={form.device}
                    onChange={(e) => setForm({ ...form, device: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#6B6B6B]">Panne / description</p>
                  <input
                    className="h-11 w-full rounded-[10px] border border-[#E7E4DC] bg-white px-4 text-sm outline-none focus:border-[#2A9D8F] transition-all"
                    placeholder="Écran, Batterie..."
                    value={form.issue}
                    onChange={(e) => setForm({ ...form, issue: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* 3. Lignes */}
            <div className="mt-10 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-[#1A1916]">Lignes de devis</label>
                <button
                  onClick={handleAddLine}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#2A9D8F] hover:text-[#238b7e] transition-colors"
                >
                  <Plus className="size-3.5" />
                  Ajouter une ligne
                </button>
              </div>

              <div className="space-y-3">
                {form.lines.map((line, idx) => (
                  <div key={line.id} className="group relative flex gap-3 animate-in fade-in slide-in-from-left-2 duration-200">
                    <div className="flex-1">
                      <input
                        className="h-11 w-full rounded-[10px] border border-[#E7E4DC] bg-white px-4 text-sm outline-none focus:border-[#2A9D8F]"
                        placeholder="Description de la prestation..."
                        value={line.description}
                        onChange={(e) => handleLineChange(line.id, "description", e.target.value)}
                      />
                    </div>
                    <div className="w-20">
                      <input
                        type="number"
                        className="h-11 w-full rounded-[10px] border border-[#E7E4DC] bg-white px-3 text-center text-sm outline-none focus:border-[#2A9D8F]"
                        placeholder="Qté"
                        value={line.quantity}
                        onChange={(e) => handleLineChange(line.id, "quantity", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="w-28">
                      <input
                        type="number"
                        className="h-11 w-full rounded-[10px] border border-[#E7E4DC] bg-white px-3 text-right text-sm outline-none focus:border-[#2A9D8F]"
                        placeholder="Prix Unit."
                        value={line.unitPrice}
                        onChange={(e) => handleLineChange(line.id, "unitPrice", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveLine(line.id)}
                      className="flex size-11 items-center justify-center rounded-[10px] text-[#B0AEA8] transition hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Notes */}
            <div className="mt-10 space-y-4">
              <label className="text-sm font-bold text-[#1A1916]">Notes & Conditions</label>
              <textarea
                className="min-h-[100px] w-full rounded-[12px] border border-[#E7E4DC] bg-white p-4 text-sm outline-none focus:border-[#2A9D8F] transition-all"
                placeholder="Notes à l'attention du client ou conditions particulières..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          {/* Right Column - Preview (hidden on mobile) */}
          <div className="hidden lg:flex w-[440px] border-l border-[#F1F1EF] bg-[#F6F6F4]/30 flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F1EF] bg-white/50 backdrop-blur-sm">
              <span className="text-[10px] font-bold text-[#B0AEA8] uppercase tracking-widest">Aperçu en direct</span>
              <div className="flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-[#E7E4DC]" />
                <div className="size-1.5 rounded-full bg-[#E7E4DC]" />
                <div className="px-2 py-0.5 rounded-full bg-[#FFF4E5] text-[9px] font-bold text-[#D97706] uppercase">Brouillon</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {/* Document Simulé */}
              <div className="bg-white shadow-sm border border-[#E7E4DC] rounded-xl p-8 min-h-[500px] flex flex-col">
                
                {/* Header Atelier */}
                <div className="flex items-center gap-4 border-b border-[#F1F1EF] pb-8 mb-8">
                  <div />
                  <div>
                    <h4 className="font-bold text-[#1A1916] text-sm">{workshopInfo?.name || "Atelier"}</h4>
                    <p className="text-[10px] text-[#6B6B6B]">Proposition commerciale</p>
                  </div>
                </div>

                {isFormValid ? (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-2 gap-8 text-[11px]">
                      <div className="space-y-4">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#B0AEA8] mb-1">DEVIS POUR</p>
                          <p className="font-bold text-[#1A1916]">{form.customerName}</p>
                          <p className="text-[#6B6B6B]">{form.customerPhone || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#B0AEA8] mb-1">APPAREIL</p>
                          <p className="font-bold text-[#1A1916]">{form.device || "—"}</p>
                          <p className="text-[#6B6B6B] italic">{form.issue || "—"}</p>
                        </div>
                      </div>
                      <div className="space-y-4 text-right">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#B0AEA8] mb-1">DATE</p>
                          <p className="font-bold text-[#1A1916]">{new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#B0AEA8] mb-1">VALIDITÉ</p>
                          <p className="font-bold text-[#2A9D8F]">{form.validityDays} jours</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-[#F1F1EF] pb-2 text-[10px] font-bold text-[#B0AEA8] uppercase tracking-wider">
                        <span>Description</span>
                        <span>Total</span>
                      </div>
                      {form.lines
                        .filter(l => l.description.trim() !== "")
                        .map(l => (
                          <div key={l.id} className="flex justify-between items-start text-[11px] gap-4">
                            <div className="flex-1">
                              <p className="font-semibold text-[#1A1916]">{l.description}</p>
                              <p className="text-[10px] text-[#6B6B6B]">Qté : {l.quantity} x {formatEuro(l.unitPrice)}</p>
                            </div>
                            <p className="font-bold text-[#1A1916]">{formatEuro(l.quantity * l.unitPrice)}</p>
                          </div>
                        ))}
                    </div>

                    <div className="mt-auto pt-8 border-t border-[#F1F1EF] space-y-2">
                      {store.workshopInfo.vatApplicable ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-[#6B6B6B]">
                            <span>Total HT</span>
                            <span className="font-medium">{formatEuro(subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-[#6B6B6B]">
                            <span>TVA (20%)</span>
                            <span className="font-medium">{formatEuro(subtotal * 0.2)}</span>
                          </div>
                          <div className="flex justify-between items-end pt-2">
                            <span className="text-xs font-bold text-[#1A1916]">TOTAL TTC</span>
                            <span className="text-xl font-bold text-[#2A9D8F]">{formatEuro(subtotal * 1.2)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-end pt-2">
                          <span className="text-xs font-bold text-[#1A1916]">TOTAL ESTIMÉ</span>
                          <span className="text-xl font-bold text-[#2A9D8F]">{formatEuro(subtotal)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                    <div className="size-12 rounded-full bg-[#FAFAF8] flex items-center justify-center mb-4">
                      <FileText className="size-6 text-[#B0AEA8]" />
                    </div>
                    <p className="text-sm font-bold text-[#1A1916] mb-1">Devis en cours de saisie</p>
                    <p className="text-xs text-[#6B6B6B]">Les informations du devis s'afficheront ici.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Sticky */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-[#F1F1EF] bg-white px-8 py-5 flex items-center justify-between z-20">
          <div className="flex items-center gap-6">
            <button onClick={onClose} className="text-sm font-bold text-[#6B6B6B] hover:text-[#1A1916] transition-colors">
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
              onClick={() => handleCreate("Envoyé", false)}
              disabled={!isFormValid}
              className="h-11 px-8 rounded-[12px] bg-[#E7F5F1] text-sm font-bold text-[#167B70] border border-[#2A9D8F]/20 hover:bg-[#D8EDE7] transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              Créer le devis
            </button>
            <button
              onClick={() => handleCreate("Envoyé", true)}
              disabled={!isFormValid}
              className="h-11 px-8 rounded-[12px] bg-[#2A9D8F] text-sm font-bold text-white shadow-lg shadow-[#2A9D8F]/20 hover:bg-[#238b7e] transition-all disabled:opacity-50 active:scale-[0.98] flex items-center gap-2"
            >
              <Download className="size-4" />
              Créer et télécharger le PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
