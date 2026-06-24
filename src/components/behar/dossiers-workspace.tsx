"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  CalendarDays,
  FileText,
  FolderOpen,
  Plus,
  Receipt,
  Search,
  Wrench,
} from "lucide-react";

import {
  formatCurrency,
  formatIsoToDisplay,
  getInvoiceTotal,
  getQuoteTotal,
  isTerminalRepairStatus,
  type Repair,
  type RepairStatus,
  type Customer,
  useBeharStore,
} from "@/lib/behar-store";
import { displayCustomerName } from "@/lib/customer-display";
import { formatDeviceLabel } from "@/lib/format-device";
import { cn } from "@/lib/utils";

import { PrimaryButton, StatusBadge } from "./primitives";
import { RealDeviceVisual } from "./real-product-visual";

const dossierStatuses: RepairStatus[] = [
  "Reçu",
  "Diagnostic",
  "En attente",
  "Devis envoyé",
  "Devis accepté",
  "En réparation",
  "Test final",
  "Prêt",
  "Rendu",
  "Irréparable",
  "SAV",
  "Clôturé",
];

function lastActivityValue(repair: Repair) {
  const candidates = [repair.updatedAt, repair.closedAt, repair.createdAt, repair.droppedAt, repair.history.at(-1)].filter(
    Boolean,
  ) as string[];
  for (const value of candidates) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export function DossiersWorkspace() {
  const store = useBeharStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<RepairStatus | "all">("all");
  const [view, setView] = useState<"list" | "kanban">("kanban");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.repairs
      .map((repair) => {
        const customer = store.customers.find((entry) => entry.id === repair.customerId);
        const quotes = store.quotes.filter((quote) => quote.repairId === repair.id);
        const invoices = store.invoices.filter((invoice) => invoice.repairId === repair.id);
        const quote = quotes[0];
        const invoice = invoices[0];
        const amount = invoice ? getInvoiceTotal(invoice) : quote ? getQuoteTotal(quote) : repair.total || repair.amount || 0;
        const haystack = [
          repair.number,
          customer?.name,
          customer?.phone,
          customer?.email,
          repair.device,
          repair.deviceModel,
          repair.brandName,
          repair.model,
          repair.imei,
          repair.issue,
          repair.notes,
          quote?.number,
          invoice?.number,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return { repair, customer, quote, invoice, amount, haystack, lastActivity: lastActivityValue(repair) };
      })
      .filter((row) => (status === "all" ? true : row.repair.status === status))
      .filter((row) => (q ? row.haystack.includes(q) : true))
      .sort((a, b) => b.lastActivity - a.lastActivity);
  }, [store.repairs, store.customers, store.quotes, store.invoices, query, status]);

  const counts = useMemo(() => {
    const map = new Map<RepairStatus, number>();
    for (const entry of dossierStatuses) map.set(entry, 0);
    for (const repair of store.repairs) {
      if (dossierStatuses.includes(repair.status)) map.set(repair.status, (map.get(repair.status) ?? 0) + 1);
    }
    return map;
  }, [store.repairs]);

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-[12px] border border-[#E8E8E5] bg-white p-1">
        {([
          { key: "list", label: "Liste" },
          { key: "kanban", label: "Kanban atelier" },
        ] as const).map((entry) => (
          <button
            className={cn(
              "h-9 rounded-[9px] px-4 text-sm font-semibold transition",
              view === entry.key ? "bg-[#2A9D8F] text-white" : "text-[#6B6B6B] hover:text-[#1A1916]",
            )}
            key={entry.key}
            onClick={() => setView(entry.key)}
            type="button"
          >
            {entry.label}
          </button>
        ))}
      </div>

      <section className="rounded-[16px] border border-[#E8E8E5] bg-white p-4 shadow-[0_1px_2px_rgba(26,25,22,0.035)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px] lg:min-w-[560px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#6B6B6B]" />
              <input
                className="h-11 w-full rounded-[14px] border border-[#E8E8E5] bg-[#FAFAFA] pr-3 pl-10 text-sm outline-none transition placeholder:text-[#6B6B6B] focus:border-[#2A9D8F]/55 focus:ring-4 focus:ring-[#2A9D8F]/10"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher dossier, client, appareil, téléphone..."
                type="search"
                value={query}
              />
            </label>
            <select
              className="h-11 rounded-[14px] border border-[#E8E8E5] bg-white px-3 text-sm outline-none transition focus:border-[#2A9D8F]"
              onChange={(event) => setStatus(event.target.value as RepairStatus | "all")}
              value={status}
            >
              <option value="all">Tous les statuts</option>
              {dossierStatuses.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </div>
          <PrimaryButton asChild className="h-11 px-5">
            <Link href="/dashboard/reparations?create=1">
              <Plus className="size-4" />
              Nouvelle prise en charge
            </Link>
          </PrimaryButton>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <button
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 rounded-[10px] border px-3.5 text-xs font-semibold",
              status === "all" ? "border-[#2A9D8F] bg-[#2A9D8F] text-white" : "border-[#E8E8E5] bg-white text-[#1A1916]",
            )}
            onClick={() => setStatus("all")}
            type="button"
          >
            Tous
            <span className="rounded-[6px] bg-white/25 px-1.5 py-px text-[10px]">{store.repairs.length}</span>
          </button>
          {dossierStatuses.map((entry) => (
            <button
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-[10px] border px-3.5 text-xs font-semibold",
                status === entry ? "border-[#2A9D8F] bg-[#2A9D8F] text-white" : "border-[#E8E8E5] bg-white text-[#1A1916]",
              )}
              key={entry}
              onClick={() => setStatus(entry)}
              type="button"
            >
              {entry}
              <span className={cn("rounded-[6px] px-1.5 py-px text-[10px]", status === entry ? "bg-white/25" : "bg-[#F7F7F7] text-[#6B6B6B]")}>
                {counts.get(entry) ?? 0}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <SummaryTile icon={FolderOpen} label="Dossiers actifs" value={String(store.repairs.filter((repair) => repair.status !== "Prêt" && !isTerminalRepairStatus(repair.status)).length)} />
        <SummaryTile icon={Wrench} label="En réparation" value={String(counts.get("En réparation") ?? 0)} />
        <SummaryTile icon={FileText} label="Devis liés" value={String(store.quotes.filter((quote) => quote.repairId).length)} />
        <SummaryTile icon={Receipt} label="Factures liées" value={String(store.invoices.filter((invoice) => invoice.repairId).length)} />
      </section>

      {view === "kanban" ? (
        <section className="grid gap-4 xl:grid-cols-7">
          {dossierStatuses.map((entry) => {
            const columnRows = rows.filter((row) => row.repair.status === entry);
            return (
              <div className="min-w-0 rounded-[16px] border border-[#E8E8E5] bg-white p-3 shadow-[0_1px_2px_rgba(26,25,22,0.035)]" key={entry}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="truncate font-semibold text-[#1A1916] text-sm">{entry}</h2>
                  <span className="rounded-[7px] border border-[#E8E8E5] bg-[#FAFAFA] px-2 py-0.5 text-[#6B6B6B] text-xs">{columnRows.length}</span>
                </div>
                <div className="space-y-2">
                  {columnRows.length === 0 ? (
                    <div className="rounded-[14px] border border-dashed border-[#E8E8E5] bg-[#FAFAFA] px-3 py-6 text-center text-[#6B6B6B] text-xs">
                      Aucun dossier.
                    </div>
                  ) : (
                    columnRows.map((row) => <DossierCard key={row.repair.id} row={row} />)
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <section className="overflow-hidden rounded-[18px] border border-[#E8E8E5] bg-white shadow-[0_8px_24px_rgba(26,25,22,0.035)]">
          {rows.length === 0 ? (
            <div className="px-4 py-12 text-center text-[#6B6B6B] text-sm">Aucun dossier ne correspond à la recherche.</div>
          ) : (
            <ul className="divide-y divide-[#F7F7F7]">
              {rows.map((row) => (
                <DossierRow key={row.repair.id} row={row} />
              ))}
            </ul>
          )}
        </section>
      )}

      <p className="flex items-center justify-center gap-1.5 text-center text-[#6B6B6B] text-xs">
        <FolderOpen className="size-3.5" />
        Chaque carte correspond à un dossier.
      </p>
    </div>
  );
}

function DossierRow({
  row,
}: Readonly<{
  row: {
    repair: Repair;
    customer?: Pick<Customer, "name" | "phone" | "type">;
    quote?: { number: string; status: string };
    invoice?: { number: string; status: string };
    amount: number;
    lastActivity: number;
  };
}>) {
  const { repair, customer, quote, invoice, amount } = row;
  return (
    <li>
      <Link
        className="flex items-center gap-4 px-4 py-3 transition hover:bg-[#FAFAFA]"
        href={`/dashboard/dossiers/_/?id=${repair.id}`}
      >
        <span className="w-[88px] shrink-0 font-mono font-semibold text-[#167B70] text-xs">#{repair.number}</span>
        <RealDeviceVisual
          brand={repair.brandName}
          className="size-12 rounded-[12px] border border-[#E8E8E5] bg-[#FAFAF8] p-1 shadow-[0_6px_14px_rgba(26,25,22,0.04)]"
          model={repair.deviceModel || repair.model || repair.device}
          type={repair.deviceType}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-[#1A1916] text-sm">{displayCustomerName(customer) || "Client"}</span>
          <span className="block truncate text-[#6B6B6B] text-xs">
            {formatDeviceLabel(repair, repair.device)} · {repair.issue || "Intervention à préciser"}
          </span>
        </span>
        <span className="hidden w-[140px] shrink-0 text-[#6B6B6B] text-xs sm:block">
          {quote ? `Devis ${quote.number}` : "Aucun devis"}
          {invoice ? ` · Fac. ${invoice.number}` : ""}
        </span>
        <span className="w-[88px] shrink-0 text-right font-semibold text-[#1A1916] text-sm">
          {formatCurrency(amount, repair.currency)}
        </span>
        <span className="w-[120px] shrink-0 text-right">
          <StatusBadge status={repair.status} />
        </span>
      </Link>
    </li>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
}: Readonly<{ icon: typeof FolderOpen; label: string; value: string }>) {
  return (
    <div className="rounded-[18px] border border-[#E8E8E5] bg-white p-4 shadow-[0_8px_24px_rgba(26,25,22,0.035)]">
      <span className="grid size-10 place-items-center text-[#2A9D8F]">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-[#6B6B6B] text-xs">{label}</p>
      <p className="mt-1 font-semibold text-[#1A1916] text-2xl">{value}</p>
    </div>
  );
}

function DossierCard({
  row,
}: Readonly<{
  row: {
    repair: Repair;
    customer?: Pick<Customer, "name" | "phone" | "type">;
    quote?: { number: string; status: string };
    invoice?: { number: string; status: string };
    amount: number;
    lastActivity: number;
  };
}>) {
  const { repair, customer, quote, invoice, amount, lastActivity } = row;
  return (
    <Link
      className="block rounded-[16px] border border-[#E8E8E5] bg-white p-3 text-left shadow-[0_4px_14px_rgba(26,25,22,0.035)] transition hover:border-[#2A9D8F]/50 hover:shadow-[0_12px_26px_rgba(26,25,22,0.06)]"
      href={`/dashboard/dossiers/_/?id=${repair.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono font-semibold text-[#167B70] text-xs">#{repair.number}</p>
          <p className="mt-1 truncate font-semibold text-[#1A1916] text-sm">
            {displayCustomerName(customer) || "Client"}
          </p>
        </div>
        <StatusBadge status={repair.status} />
      </div>
      <div className="mt-3 flex items-start gap-2">
        <RealDeviceVisual
          brand={repair.brandName}
          className="size-10 rounded-[12px] border border-[#E8E8E5] bg-[#FAFAF8] p-1 shadow-[0_4px_12px_rgba(26,25,22,0.035)]"
          model={repair.deviceModel || repair.model || repair.device}
          type={repair.deviceType}
        />
        <div className="min-w-0">
          <p className="truncate font-medium text-[#1A1916] text-xs">{formatDeviceLabel(repair, repair.device)}</p>
          <p className="mt-0.5 line-clamp-2 text-[#6B6B6B] text-xs">{repair.issue || "Intervention à préciser"}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <MiniRef label="Devis" value={quote ? `${quote.number} · ${quote.status}` : "Aucun"} />
        <MiniRef label="Facture" value={invoice ? `${invoice.number} · ${invoice.status}` : "Aucune"} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-[#F7F7F7] border-t pt-3 text-xs">
        <span className="font-semibold text-[#1A1916]">{formatCurrency(amount, repair.currency)}</span>
        <span className="inline-flex items-center gap-1 text-[#6B6B6B]">
          <CalendarDays className="size-3.5" />
          {lastActivity ? formatIsoToDisplay(new Date(lastActivity).toISOString()) : formatIsoToDisplay(repair.droppedAt)}
        </span>
      </div>
    </Link>
  );
}

function MiniRef({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-0 rounded-[10px] bg-[#FAFAFA] px-2 py-1.5">
      <p className="text-[#6B6B6B]">{label}</p>
      <p className="truncate font-medium text-[#1A1916]">{value}</p>
    </div>
  );
}
