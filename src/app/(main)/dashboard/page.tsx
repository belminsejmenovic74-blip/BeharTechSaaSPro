"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Clock,
  Package,
  TrendingUp,
  Wrench,
} from "lucide-react";

import { DashboardPremium } from "@/components/behar/dashboard-premium";
import { PageShell } from "@/components/behar/page-shell";
import { StatusBadge } from "@/components/behar/primitives";
import { formatEuro, useBeharStore } from "@/lib/behar-store";

export default function Page() {
  return (
    <PageShell
      title="Tableau de bord"
      subtitle="Vue d'ensemble de votre activité aujourd'hui."
      actions={
        <div className="hidden md:inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#E7E4DC] bg-white px-3.5 font-medium text-[#1A1916] text-sm">
          <CalendarDays className="size-4 text-[#6B6B6B]" />
          {new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
        </div>
      }
    >
      <div className="md:hidden">
        <MobileDashboard />
      </div>
      <div className="hidden md:block">
        <DashboardPremium />
      </div>
    </PageShell>
  );
}

function useToday() {
  // L'horloge est évaluée côté client uniquement pour éviter le SSR drift.
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    setToday(new Date());
    const id = setInterval(() => setToday(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return today;
}

function MobileDashboard() {
  const store = useBeharStore();
  const today = useToday();

  const repairsInProgress = store.repairs.filter(
    (r) => r.status !== "Prêt" && r.status !== "Restitué" && r.status !== "Annulé",
  );
  const monthRevenue = store.payments
    .filter((p) => p.status === "Payé")
    .reduce((sum, p) => sum + p.amount, 0);

  const todayKey = today ? today.toLocaleDateString("fr-FR") : "";
  const todayIso = today ? toIsoDate(today) : "";
  const todayLabel = today
    ? today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    : "";

  const todaysAppointments = store.appointments
    .filter((a) => a.status !== "annulé")
    .filter((a) => {
      const iso = appointmentToIso(a.date);
      return iso === todayIso || a.date === todayKey || a.date === "Aujourd'hui";
    })
    .sort((a, b) => timeRank(a.time) - timeRank(b.time));

  const lowStock = store.stockItems.filter((item) => item.stock <= (item.threshold ?? 0));

  const todayRevenue = store.payments
    .filter((p) => p.status === "Payé" && (p.date === todayKey || p.date?.startsWith?.("Aujourd'hui")))
    .reduce((sum, p) => sum + p.amount, 0);

  const pipelineConfig = [
    { key: "Reçu", label: "Reçu" },
    { key: "Diagnostic", label: "Diagnostic" },
    { key: "Préparation / Réparation", label: "Réparation" },
    { key: "Prêt", label: "Prêt" },
  ] as const;
  const pipeline = pipelineConfig.map((step) => ({
    ...step,
    value: store.repairs.filter((r) => r.status === step.key).length,
  }));
  const pipelineMax = Math.max(1, ...pipeline.map((p) => p.value));
  const pipelineTotal = pipeline.reduce((sum, p) => sum + p.value, 0);

  const recentActivity = [...store.auditLogs]
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* KPI grid 2x2 — icône pastel + valeur + sous-texte */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          href="/dashboard/reparations"
          icon={<Wrench className="size-[18px]" strokeWidth={2.2} />}
          iconBg="bg-[#EAF6F2]"
          iconColor="text-[#2A9D8F]"
          label="Réparations en cours"
          value={String(repairsInProgress.length)}
          subline={repairsInProgress.length > 0 ? "Pipeline actif" : "Aucune en cours"}
        />
        <KpiCard
          href="/dashboard/rendez-vous"
          icon={<CalendarDays className="size-[18px]" strokeWidth={2.2} />}
          iconBg="bg-[#EAF6F2]"
          iconColor="text-[#2A9D8F]"
          label="RDV du jour"
          value={String(todaysAppointments.length)}
          subline={todayLabel ? `${todayLabel.charAt(0).toUpperCase()}${todayLabel.slice(1)}` : "—"}
        />
        <KpiCard
          href="/dashboard/paiements"
          icon={<TrendingUp className="size-[18px]" strokeWidth={2.2} />}
          iconBg="bg-[#EAF6F2]"
          iconColor="text-[#2A9D8F]"
          label="Chiffre du jour"
          value={formatEuro(todayRevenue)}
          subline={`Total encaissé : ${formatEuro(monthRevenue)}`}
        />
        <KpiCard
          href="/dashboard/stock"
          icon={<Package className="size-[18px]" strokeWidth={2.2} />}
          iconBg={lowStock.length > 0 ? "bg-[#FDECEC]" : "bg-[#EAF6F2]"}
          iconColor={lowStock.length > 0 ? "text-[#B42318]" : "text-[#2A9D8F]"}
          label="Pièces en rupture"
          value={String(lowStock.length)}
          subline={lowStock.length > 0 ? "À réapprovisionner" : "Stock OK"}
        />
      </div>

      {/* Agenda du jour */}
      <SectionCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-[10px] bg-[#EAF6F2] text-[#2A9D8F]">
              <CalendarDays className="size-[16px]" strokeWidth={2.2} />
            </span>
            <div>
              <p className="font-semibold text-[#1A1916] text-[15px] tracking-tight">Agenda du jour</p>
              <p className="mt-0.5 text-[#8A8984] text-[11.5px]">
                {todayLabel ? `${todayLabel.charAt(0).toUpperCase()}${todayLabel.slice(1)}` : "—"}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/rendez-vous"
            prefetch={false}
            className="text-[#2A9D8F] text-[12px] font-semibold tracking-tight"
          >
            Voir tout
          </Link>
        </div>

        {todaysAppointments.length === 0 ? (
          <Link
            href="/dashboard/rendez-vous"
            prefetch={false}
            className="mt-4 flex items-center gap-3 rounded-[14px] bg-[#FAFAF8] px-4 py-3 transition active:scale-[0.99]"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-white text-[#8A8984]">
              <CalendarDays className="size-[15px]" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[#1A1916] text-[13px]">Aucun rendez-vous</p>
              <p className="mt-0.5 text-[#8A8984] text-[11.5px]">Touchez pour planifier la journée.</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-[#CDCBC5]" strokeWidth={2} />
          </Link>
        ) : (
          <ul className="mt-3 divide-y divide-[#F1F1EF]">
            {todaysAppointments.slice(0, 4).map((appt) => {
              const customer = store.customers.find((c) => c.id === appt.customerId);
              const pillTone = appt.status === "venu" || appt.status === "arrivé"
                ? "bg-[#E7F8F0] text-[#0B7A56]"
                : appt.confirmed
                  ? "bg-[#EAF6F2] text-[#167B70]"
                  : "bg-[#FCF1DF] text-[#C2841C]";
              const pillLabel = appt.status === "venu" || appt.status === "arrivé"
                ? "Arrivé"
                : appt.confirmed
                  ? "Confirmé"
                  : "En attente";
              return (
                <li key={appt.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex w-12 shrink-0 flex-col items-center">
                    <span className="size-1.5 rounded-full bg-[#2A9D8F]" aria-hidden />
                    <span className="mt-1 font-semibold text-[#1A1916] text-[13px] tabular-nums">
                      {appt.time || "—"}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[#1A1916] text-[13px]">
                      {appt.device || appt.type}
                    </p>
                    <p className="mt-0.5 truncate text-[#8A8984] text-[11.5px]">
                      {customer?.name || "Client comptoir"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold tracking-tight ${pillTone}`}
                  >
                    {pillLabel}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {/* Pipeline réparations */}
      <SectionCard>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-[#1A1916] text-[15px] tracking-tight">Pipeline réparations</p>
            <p className="mt-0.5 text-[#8A8984] text-[11.5px]">
              {pipelineTotal} dossier{pipelineTotal > 1 ? "s" : ""} actif{pipelineTotal > 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/dashboard/reparations"
            prefetch={false}
            className="text-[#2A9D8F] text-[12px] font-semibold tracking-tight"
          >
            Voir
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2.5">
          {pipeline.map((step) => {
            const ratio = step.value / pipelineMax;
            return (
              <Link
                href={`/dashboard/reparations`}
                prefetch={false}
                key={step.key}
                className="flex flex-col items-center gap-1.5 rounded-[14px] bg-[#FAFAF8] px-1.5 py-3 transition active:scale-[0.96]"
              >
                <span className="grid size-9 place-items-center rounded-full bg-white text-[#2A9D8F] shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
                  <Wrench className="size-[15px]" strokeWidth={2.2} />
                </span>
                <span className="font-bold text-[#1A1916] text-[18px] tabular-nums leading-none">{step.value}</span>
                <span className="text-center text-[#6B6B6B] text-[10.5px] font-medium leading-tight">
                  {step.label}
                </span>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E7E4DC]">
                  <div
                    className="h-full rounded-full bg-[#2A9D8F] transition-all"
                    style={{ width: `${Math.max(8, Math.round(ratio * 100))}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </SectionCard>

      {/* Activité récente */}
      <SectionCard>
        <div className="flex items-center justify-between">
          <p className="font-semibold text-[#1A1916] text-[15px] tracking-tight">Activité récente</p>
          {recentActivity.length > 0 && (
            <span className="text-[#8A8984] text-[11.5px]">{recentActivity.length} événements</span>
          )}
        </div>

        {recentActivity.length === 0 ? (
          <p className="mt-4 rounded-[12px] bg-[#FAFAF8] px-4 py-5 text-center text-[#8A8984] text-[13px]">
            Aucune activité pour l'instant.
          </p>
        ) : (
          <ul className="mt-3 -mx-1">
            {recentActivity.map((log) => (
              <li
                key={log.id}
                className="flex items-center gap-3 rounded-[12px] px-2 py-2.5"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#FAFAF8] text-[#2A9D8F]">
                  <ActivityIcon action={log.action} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[#1A1916] text-[13px] leading-tight">
                    {log.message}
                  </p>
                  <p className="mt-0.5 text-[#8A8984] text-[11px]">{formatRelative(log.createdAt)}</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-[#CDCBC5]" strokeWidth={2} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Réparation en focus */}
      {repairsInProgress[0] && (
        <FocusRepair repair={repairsInProgress[0]} />
      )}
    </div>
  );
}

function KpiCard({
  href,
  icon,
  iconBg,
  iconColor,
  label,
  value,
  subline,
}: Readonly<{
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  subline: string;
}>) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="block rounded-[20px] bg-white p-4 shadow-[0_1px_2px_rgba(26,25,22,0.04)] transition active:scale-[0.98]"
    >
      <span className={`grid size-9 place-items-center rounded-[10px] ${iconBg} ${iconColor}`}>
        {icon}
      </span>
      <p className="mt-3 text-[#8A8984] text-[11.5px] font-medium leading-tight tracking-tight">
        {label}
      </p>
      <p className="mt-1.5 font-bold text-[#1A1916] text-[24px] leading-none tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 truncate text-[#8A8984] text-[10.5px] font-medium leading-tight">
        {subline}
      </p>
    </Link>
  );
}

function SectionCard({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <section className="rounded-[20px] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
      {children}
    </section>
  );
}

function FocusRepair({ repair }: Readonly<{ repair: any }>) {
  const customer = useBeharStore((s) => s.customers.find((c) => c.id === repair.customerId));
  return (
    <SectionCard>
      <div className="flex items-center justify-between">
        <p className="font-semibold text-[#1A1916] text-[15px] tracking-tight">En atelier</p>
        <Link
          href={`/dashboard/reparations?selectedId=${repair.id}`}
          prefetch={false}
          className="text-[#2A9D8F] text-[12px] font-semibold tracking-tight"
        >
          Ouvrir
        </Link>
      </div>
      <div className="mt-4 flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-[#FAFAF8] text-[#1A1916]">
          <Wrench className="size-5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[#1A1916] text-[15px] tracking-tight">
            {customer?.name ?? "Client"}
          </p>
          <p className="mt-0.5 truncate text-[#1A1916] text-[13px]">{repair.device}</p>
          <p className="mt-0.5 truncate text-[#8A8984] text-[12px]">{repair.issue}</p>
        </div>
        <StatusBadge status={repair.status} />
      </div>
    </SectionCard>
  );
}

function ActivityIcon({ action }: Readonly<{ action: string }>) {
  if (action.startsWith("payment") || action.includes("paid"))
    return <TrendingUp className="size-[16px]" strokeWidth={2} />;
  if (action.startsWith("repair"))
    return <Wrench className="size-[16px]" strokeWidth={2} />;
  if (action.startsWith("appointment") || action.startsWith("rendez"))
    return <CalendarDays className="size-[16px]" strokeWidth={2} />;
  if (action.startsWith("stock"))
    return <Package className="size-[16px]" strokeWidth={2} />;
  if (action.startsWith("alert") || action.includes("low"))
    return <AlertTriangle className="size-[16px]" strokeWidth={2} />;
  return <Clock className="size-[16px]" strokeWidth={2} />;
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const MONTH_NAMES_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
] as const;

function appointmentToIso(raw: string | undefined): string {
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parts = raw.split(" ");
  if (parts.length < 3) return "";
  const [day, month, year] = parts;
  const monthIndex = MONTH_NAMES_FR.indexOf(month as (typeof MONTH_NAMES_FR)[number]);
  if (!day || !year || monthIndex < 0) return "";
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(Number(day)).padStart(2, "0")}`;
}

function timeRank(time: string | undefined): number {
  if (!time) return 9_999;
  const [hh = "0", mm = "0"] = time.split(":");
  return Number(hh) * 60 + Number(mm);
}

function formatRelative(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const diffMs = Date.now() - date.getTime();
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `il y a ${d} j`;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
