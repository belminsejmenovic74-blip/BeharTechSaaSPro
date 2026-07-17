"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { TrendingDown, TrendingUp } from "lucide-react";

import { formatEuro, useBeharStore } from "@/lib/behar-store";
import { paymentDateToIso } from "@/lib/payment-date";
import { realMargin, useReconditioningStore } from "@/lib/reconditioning-store";
import { cn } from "@/lib/utils";

type PeriodKey = "day" | "week" | "month";

const PERIODS: { key: PeriodKey; label: string; days: number; compare: string }[] = [
  { key: "day", label: "Jour", days: 1, compare: "vs hier" },
  { key: "week", label: "Semaine", days: 7, compare: "vs semaine préc." },
  { key: "month", label: "Mois", days: 30, compare: "vs mois préc." },
];

const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Variation en % vs période précédente — null si pas de base de comparaison (jamais de faux 0 %). */
const delta = (current: number, previous: number): number | null =>
  previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

function Sparkline({ values, color }: Readonly<{ values: number[]; color: string }>) {
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? 120 / (values.length - 1) : 120;
  const points = values.map((v, i) => `${Math.round(i * step)},${Math.round(26 - (v / max) * 22)}`).join(" ");
  return (
    <svg aria-hidden="true" height="28" viewBox="0 0 120 28" width="100%" preserveAspectRatio="none">
      <polyline fill="none" points={points} stroke={color} strokeWidth="2" />
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

/**
 * Volet finance du tableau de bord — tout est calculé depuis les vraies données :
 * paiements « Payé » (datés), achats du ledger, ventes recond réelles (soldAt/soldPrice).
 * Les variations n'apparaissent que si la période précédente a des données.
 */
export function FinanceOverview() {
  const payments = useBeharStore((s) => s.payments);
  const purchases = useBeharStore((s) => s.purchases);
  const repairs = useBeharStore((s) => s.repairs);
  const customers = useBeharStore((s) => s.customers);
  const files = useReconditioningStore((s) => s.files);
  const [period, setPeriod] = useState<PeriodKey>("week");
  const config = PERIODS.find((p) => p.key === period) ?? PERIODS[1];

  const stats = useMemo(() => {
    const start = isoDaysAgo(config.days - 1);
    const prevStart = isoDaysAgo(config.days * 2 - 1);
    const paid = payments.filter((p) => p.status === "Payé");
    const inWindow = (iso: string | null, from: string, to?: string) =>
      Boolean(iso && iso >= from && (!to || iso < to));

    let ca = 0;
    let caPrev = 0;
    let caRepairs = 0;
    let caSales = 0;
    let caOther = 0;
    const sparkDays = Math.min(config.days === 1 ? 7 : config.days, 30);
    const daily = new Array<number>(sparkDays).fill(0);
    const sparkStart = isoDaysAgo(sparkDays - 1);
    for (const p of paid) {
      const iso = paymentDateToIso(p.date) ?? paymentDateToIso(p.createdAt);
      if (!iso) continue;
      if (inWindow(iso, start)) {
        ca += p.amount || 0;
        if (p.repairId) caRepairs += p.amount || 0;
        else if (p.saleId) caSales += p.amount || 0;
        else caOther += p.amount || 0;
      } else if (inWindow(iso, prevStart, start)) caPrev += p.amount || 0;
      if (iso >= sparkStart) {
        const idx = sparkDays - 1 - Math.max(0, Math.round((Date.parse(isoDaysAgo(0)) - Date.parse(iso)) / 86_400_000));
        if (idx >= 0 && idx < sparkDays) daily[idx] += p.amount || 0;
      }
    }

    const buys = purchases.filter((entry) => inWindow((entry.date || "").slice(0, 10), start));
    const buysTotal = buys.reduce((s, entry) => s + (entry.total || 0), 0);
    const buysPrev = purchases
      .filter((entry) => inWindow((entry.date || "").slice(0, 10), prevStart, start))
      .reduce((s, entry) => s + (entry.total || 0), 0);

    const sold = files.filter((f) => f.status === "Vendu" && inWindow((f.soldAt || "").slice(0, 10), start));
    const recondMargin = sold.reduce((s, f) => s + (realMargin(f)?.margeReelle ?? 0), 0);

    // CA en attente : dossiers rendus/clôturés dont le règlement n'est pas indiqué (état courant).
    const paidFor = (repairId: string) => paid.filter((p) => p.repairId === repairId).reduce((s, p) => s + p.amount, 0);
    const pending = repairs
      .filter((r) => {
        if (r.status !== "Rendu" && r.status !== "Clôturé") return false;
        if (r.paymentStatus === "Réglée") return false;
        const total = r.total ?? r.amount ?? 0;
        return total > 0 && paidFor(r.id) < total;
      })
      .map((r) => ({ repair: r, reste: Math.max(0, (r.total ?? r.amount ?? 0) - paidFor(r.id)) }))
      .sort((a, b) => b.reste - a.reste);
    const caPending = pending.reduce((s, entry) => s + entry.reste, 0);

    const repairCount = new Set(
      paid
        .filter((p) => p.repairId && inWindow(paymentDateToIso(p.date) ?? paymentDateToIso(p.createdAt), start))
        .map((p) => p.repairId),
    ).size;
    return {
      ca,
      caPrev,
      caRepairs,
      caSales,
      caOther,
      daily,
      buysTotal,
      buysPrev,
      sold: sold.length,
      recondMargin,
      pending,
      caPending,
      repairCount,
    };
  }, [payments, purchases, files, repairs, config.days]);

  const breakdown = [
    { label: "Réparations", value: stats.caRepairs, color: "#1D9E75" },
    { label: "Ventes comptoir", value: stats.caSales, color: "#5DCAA5" },
    { label: "Autres", value: stats.caOther, color: "#9FE1CB" },
  ].filter((s) => s.value > 0);

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
              {formatEuro(stats.ca)}
            </span>
            <DeltaBadge compare={config.compare} value={delta(stats.ca, stats.caPrev)} />
          </div>
        </div>
        <div className="flex gap-1 rounded-[10px] border border-[#E8E8E5] bg-white p-1">
          {PERIODS.map((p) => (
            <button
              className={cn(
                "h-8 rounded-[7px] px-3 font-medium text-[13px] transition",
                period === p.key ? "bg-[#1A1916] text-white" : "text-[#6B6B6B] hover:text-[#1A1916]",
              )}
              key={p.key}
              onClick={() => setPeriod(p.key)}
              type="button"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceCard
          color="#1D9E75"
          helper={`${stats.repairCount} dossier(s) réglé(s)`}
          label="Réparations encaissées"
          spark={stats.daily}
          value={formatEuro(stats.caRepairs)}
          href="/dashboard/paiements"
        />
        <FinanceCard
          color="#1D9E75"
          helper={`${stats.sold} appareil(s) vendu(s)`}
          label="Marge recond réelle"
          value={formatEuro(stats.recondMargin)}
          href="/dashboard/reconditionnement"
        />
        <FinanceCard
          color="#888780"
          delta={delta(stats.buysTotal, stats.buysPrev)}
          helper="pièces + rachats"
          label="Achats de la période"
          value={formatEuro(stats.buysTotal)}
          href="/dashboard/achats"
        />
        <FinanceCard
          color="#BA7517"
          helper={`${stats.pending.length} dossier(s) rendus non réglés`}
          label="CA en attente"
          value={formatEuro(stats.caPending)}
          warn={stats.pending.length > 0}
          href="/dashboard/reparations"
        />
      </div>

      {stats.ca > 0 && breakdown.length > 0 && (
        <div className="rounded-[14px] border border-[#E8E8E5] bg-white p-4">
          <p className="mb-2.5 font-semibold text-[#1A1916] text-[13px]">D'où vient le CA</p>
          <div className="flex h-3.5 overflow-hidden rounded-full">
            {breakdown.map((s) => (
              <div
                key={s.label}
                style={{ width: `${Math.max(2, (s.value / stats.ca) * 100)}%`, background: s.color }}
              />
            ))}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1">
            {breakdown.map((s) => (
              <span className="text-[#6B6B6B] text-[12px]" key={s.label}>
                <span className="mr-1.5 inline-block size-2 rounded-[3px]" style={{ background: s.color }} />
                {s.label} · {formatEuro(s.value)} ({Math.round((s.value / stats.ca) * 100)} %)
              </span>
            ))}
          </div>
        </div>
      )}

      {stats.pending.length > 0 && (
        <div className="rounded-[14px] border border-[#E8E8E5] bg-white p-4">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="font-semibold text-[#1A1916] text-[13px]">À encaisser</p>
            <span className="text-[#6B6B6B] text-[12px]">{formatEuro(stats.caPending)} au total</span>
          </div>
          <ul className="divide-y divide-[#F2F1EE]">
            {stats.pending.slice(0, 3).map(({ repair, reste }) => (
              <li key={repair.id}>
                <Link
                  className="flex items-center justify-between gap-3 py-2 text-[13px] transition hover:bg-[#FAFAF8]"
                  href={`/dashboard/dossiers/_/?id=${repair.id}`}
                >
                  <span className="min-w-0 truncate text-[#1A1916]">
                    {repair.number} · {customers.find((c) => c.id === repair.customerId)?.name || "Client comptoir"}
                  </span>
                  <span className="shrink-0 font-semibold text-[#1A1916] tabular-nums">{formatEuro(reste)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function FinanceCard({
  label,
  value,
  helper,
  color,
  spark,
  delta: deltaValue,
  warn,
  href,
}: Readonly<{
  label: string;
  value: string;
  helper: string;
  color: string;
  spark?: number[];
  delta?: number | null;
  warn?: boolean;
  href: string;
}>) {
  return (
    <Link
      className="block rounded-[14px] border border-[#E8E8E5] bg-white p-4 transition hover:border-[#2A9D8F]/40"
      href={href}
    >
      <p className="text-[#6B6B6B] text-[12px]">{label}</p>
      <p className="mt-1 font-semibold text-[#1A1916] text-[22px] leading-none tracking-tight tabular-nums">{value}</p>
      <div className="mt-2 h-[28px]">
        {spark && spark.some((v) => v > 0) ? <Sparkline color={color} values={spark} /> : null}
      </div>
      <p className={cn("mt-1 text-[11.5px]", warn ? "text-[#B45309]" : "text-[#6B6B6B]")}>
        {typeof deltaValue === "number" ? `${deltaValue >= 0 ? "+" : ""}${deltaValue} % · ` : ""}
        {helper}
      </p>
    </Link>
  );
}
