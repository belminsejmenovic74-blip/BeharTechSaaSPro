"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { TrendingDown, TrendingUp } from "lucide-react";

import { formatEuro, getInvoiceTotal, getVatSummary, useBeharStore } from "@/lib/behar-store";
import { cn } from "@/lib/utils";

type PeriodKey = "day" | "week" | "month";

const PERIODS: { key: PeriodKey; label: string; days: number; compare: string }[] = [
  { key: "day", label: "Jour", days: 1, compare: "vs hier" },
  { key: "week", label: "Semaine", days: 7, compare: "vs semaine préc." },
  { key: "month", label: "Mois", days: 30, compare: "vs mois préc." },
];

const isoDaysAgo = (n: number) => {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function documentDateToIso(value?: string): string | null {
  const source = String(value ?? "").trim();
  if (!source) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(source)) return source.slice(0, 10);
  const french = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(source);
  if (french) return `${french[3]}-${french[2].padStart(2, "0")}-${french[1].padStart(2, "0")}`;
  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

const delta = (current: number, previous: number): number | null =>
  previous !== 0 ? Math.round(((current - previous) / Math.abs(previous)) * 100) : null;

function Sparkline({ values }: Readonly<{ values: number[] }>) {
  const max = Math.max(...values.map(Math.abs), 1);
  const step = values.length > 1 ? 120 / (values.length - 1) : 120;
  const points = values
    .map((value, index) => `${Math.round(index * step)},${Math.round(26 - (value / max) * 22)}`)
    .join(" ");
  return (
    <svg aria-hidden="true" height="28" preserveAspectRatio="none" viewBox="0 0 120 28" width="100%">
      <polyline fill="none" points={points} stroke="#1D9E75" strokeWidth="2" />
    </svg>
  );
}

function DeltaBadge({ value, compare }: Readonly<{ value: number | null; compare: string }>) {
  if (value === null) return <span className="text-[#8A8A8A] text-[13px]">— {compare}</span>;
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn("inline-flex items-center gap-1 font-medium text-[13px]", up ? "text-[#167B70]" : "text-[#B42318]")}
    >
      <Icon className="size-3.5" />
      {up ? "+" : ""}
      {value} % {compare}
    </span>
  );
}

/** Indicateurs calculés uniquement depuis les factures émises et les avoirs. */
export function FinanceOverview() {
  const invoices = useBeharStore((state) => state.invoices);
  const workshopInfo = useBeharStore((state) => state.workshopInfo);
  const [period, setPeriod] = useState<PeriodKey>("week");
  const config = PERIODS.find((entry) => entry.key === period) ?? PERIODS[1];

  const stats = useMemo(() => {
    const start = isoDaysAgo(config.days - 1);
    const previousStart = isoDaysAgo(config.days * 2 - 1);
    const issued = invoices.filter((invoice) => !["Brouillon", "Annulée"].includes(invoice.status));
    const inWindow = (iso: string | null, from: string, to?: string) =>
      Boolean(iso && iso >= from && (!to || iso < to));
    const sparkDays = Math.min(config.days === 1 ? 7 : config.days, 30);
    const daily = new Array<number>(sparkDays).fill(0);
    const sparkStart = isoDaysAgo(sparkDays - 1);
    let billed = 0;
    let previousBilled = 0;
    let vat = 0;
    let invoiceCount = 0;
    let creditNoteCount = 0;

    for (const invoice of issued) {
      const iso = documentDateToIso(invoice.date || invoice.createdAt || invoice.snapshot?.generatedAt);
      const direction = invoice.documentType === "credit_note" ? -1 : 1;
      const total = direction * getInvoiceTotal(invoice);
      const invoiceVat = direction * getVatSummary(invoice.lines, workshopInfo).tva;
      if (inWindow(iso, start)) {
        billed += total;
        vat += invoiceVat;
        invoiceCount += 1;
        if (direction < 0) creditNoteCount += 1;
      } else if (inWindow(iso, previousStart, start)) {
        previousBilled += total;
      }
      if (iso && iso >= sparkStart) {
        const index =
          sparkDays - 1 - Math.max(0, Math.round((Date.parse(isoDaysAgo(0)) - Date.parse(iso)) / 86_400_000));
        if (index >= 0 && index < sparkDays) daily[index] += total;
      }
    }
    return { billed, previousBilled, vat, invoiceCount, creditNoteCount, daily };
  }, [config.days, invoices, workshopInfo]);

  return (
    <section className="space-y-4" data-testid="dashboard-finance-overview">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[#6B6B6B] text-[13px]">
            CA facturé ·{" "}
            {config.label === "Jour"
              ? "aujourd'hui"
              : config.label === "Semaine"
                ? "7 derniers jours"
                : "30 derniers jours"}
          </p>
          <div className="mt-0.5 flex items-baseline gap-3">
            <span className="font-semibold text-[#1A1916] text-[32px] leading-none tracking-tight tabular-nums">
              {formatEuro(stats.billed)}
            </span>
            <DeltaBadge compare={config.compare} value={delta(stats.billed, stats.previousBilled)} />
          </div>
        </div>
        <div className="flex gap-1 rounded-[10px] border border-[#E8E8E5] bg-white p-1">
          {PERIODS.map((entry) => (
            <button
              className={cn(
                "h-8 rounded-[7px] px-3 font-medium text-[13px] transition",
                period === entry.key ? "bg-[#1A1916] text-white" : "text-[#6B6B6B] hover:text-[#1A1916]",
              )}
              key={entry.key}
              onClick={() => setPeriod(entry.key)}
              type="button"
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceCard
          helper="net des avoirs"
          label="CA facturé TTC"
          value={formatEuro(stats.billed)}
          href="/dashboard/factures"
        />
        <FinanceCard
          helper="sur la période"
          label="Factures et avoirs"
          value={String(stats.invoiceCount)}
          href="/dashboard/factures"
        />
        <FinanceCard
          helper="calculée sur les factures"
          label="TVA facturée"
          value={formatEuro(stats.vat)}
          href="/dashboard/factures"
        />
        <FinanceCard
          helper="documents correctifs"
          label="Avoirs émis"
          value={String(stats.creditNoteCount)}
          href="/dashboard/factures"
        />
      </div>

      {stats.daily.some((value) => value !== 0) ? (
        <div className="rounded-[14px] border border-[#E8E8E5] bg-white p-4">
          <p className="mb-2 font-semibold text-[#1A1916] text-[13px]">Facturation de la période</p>
          <Sparkline values={stats.daily} />
        </div>
      ) : null}
    </section>
  );
}

function FinanceCard({
  label,
  value,
  helper,
  href,
}: Readonly<{ label: string; value: string; helper: string; href: string }>) {
  return (
    <Link
      className="block rounded-[14px] border border-[#E8E8E5] bg-white p-4 transition hover:border-[#2A9D8F]/40"
      href={href}
    >
      <p className="text-[#6B6B6B] text-[12px]">{label}</p>
      <p className="mt-1 font-semibold text-[#1A1916] text-[22px] leading-none tracking-tight tabular-nums">{value}</p>
      <p className="mt-9 text-[#6B6B6B] text-[11.5px]">{helper}</p>
    </Link>
  );
}
