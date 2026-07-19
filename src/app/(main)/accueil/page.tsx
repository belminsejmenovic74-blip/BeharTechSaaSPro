"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LayoutTemplate,
  SlidersHorizontal,
  Store,
  Wrench,
} from "lucide-react";

import { PageHeader, PortalCard, PortalPage } from "@/components/behar/accueil-ui";
import { ComingSoonIntegration } from "@/components/behar/coming-soon-integration";
import { ExternalPaymentBrand } from "@/components/behar/external-payment-brand";
import { isTerminalRepairStatus, normalizeAppointmentStatus, useBeharStore } from "@/lib/behar-store";

const MONTH_NAMES_FR = [
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
const WEEKDAYS_FR = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

function parseApptDate(raw?: string): Date | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s.startsWith("aujourd")) return new Date();
  if (s.startsWith("demain")) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const parts = raw.split(/[\s,]+/).filter(Boolean);
  if (parts.length >= 3) {
    const day = Number(parts[0]);
    const monthIndex = MONTH_NAMES_FR.indexOf(parts[1].toLowerCase());
    const year = Number(parts[2]);
    if (day && monthIndex >= 0 && year) return new Date(year, monthIndex, day);
  }
  return null;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function AccueilHome() {
  const store = useBeharStore();
  const workshopName = store.workshopSettings.name || store.workshopInfo.name || "votre atelier";
  const firstName = workshopName.split(" ")[0] || workshopName;

  const activeRepairs = store.repairs.filter((r) => r.status !== "Prêt" && !isTerminalRepairStatus(r.status)).length;
  const readyRepairs = store.repairs.filter((r) => r.status === "Prêt").length;
  const waitingRepairs = store.repairs.filter((r) => r.status === "En attente").length;

  return (
    <PortalPage>
      <PageHeader title={`Bonjour ${firstName}`} subtitle="Que souhaitez-vous gérer aujourd'hui ?" />

      {/* Sélection de l'espace — entre dans le vrai SaaS */}
      <div className="grid gap-4 md:grid-cols-3">
        <ModeCard
          icon={Store}
          title="Mode comptoir"
          description="Accueillez un client, créez une prise en charge, un devis ou une vente."
          href="/comptoir"
        />
        <ModeCard
          icon={Wrench}
          title="Mode atelier"
          description="Suivez les appareils, statuts, pièces, photos et le travail en cours."
          href="/atelier"
          hint={`${activeRepairs} en cours · ${readyRepairs} prêt${readyRepairs > 1 ? "s" : ""}`}
        />
        <ModeCard
          icon={LayoutDashboard}
          title="Tableau de bord détaillé"
          description="Chiffre d'affaires, dépenses, marges et performances de l'atelier."
          href="/dashboard"
        />
      </div>

      {/* Calendrier + accès rapide aux modules du portail */}
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <AppointmentsCalendar />

        <PortalCard>
          <h2 className="font-semibold text-[#101828] text-[17px] tracking-tight">Accès rapide</h2>
          <p className="mt-1 text-[#667085] text-[13.5px]">Gérez votre espace en dehors de la production.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <QuickLink
              icon={LayoutTemplate}
              title="Widgets"
              caption="Personnalisation"
              href="/client?section=widgets"
            />
            <QuickLink
              icon={Activity}
              title="Intégrations"
              caption="Paiements externes"
              href="/client?section=paiements"
            />
            <QuickLink
              icon={SlidersHorizontal}
              title="Configuration"
              caption="Factures, e-mails, SMS"
              href="/client?section=boutiques"
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 border-[#F0F0EE] border-t pt-4">
            <MiniStat value={activeRepairs} label="En cours" />
            <MiniStat value={readyRepairs} label="Prêtes" />
            <MiniStat value={waitingRepairs} label="En attente" />
          </div>
        </PortalCard>
      </div>

      <section className="mt-8" aria-labelledby="integrations-a-venir">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="integrations-a-venir" className="font-semibold text-[#101828] text-[19px] tracking-tight">
              Intégrations à venir
            </h2>
            <p className="mt-1 text-[#667085] text-[13.5px]">
              Vos futurs moyens de paiement restent visibles sans lancer de connexion externe.
            </p>
          </div>
          <Link
            href="/client?section=paiements"
            className="inline-flex min-h-11 items-center text-[#167B70] text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-[#2A9D8F]/25"
          >
            Voir toutes les intégrations
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AccueilIntegrationCard name="Stripe" provider="stripe" />
          <AccueilIntegrationCard name="SumUp" provider="sumup" />
          <AccueilIntegrationCard name="PayPal" provider="paypal" />
          <AccueilIntegrationCard name="Square" provider="square" />
          <AccueilIntegrationCard name="Revolut Business" provider="revolut" />
          <AccueilIntegrationCard name="Mollie" provider="mollie" />
        </div>
      </section>
    </PortalPage>
  );
}

function AccueilIntegrationCard({
  name,
  provider,
}: Readonly<{
  name: string;
  provider: "stripe" | "sumup" | "paypal" | "square" | "revolut" | "mollie";
}>) {
  return (
    <ComingSoonIntegration name={name}>
      <PortalCard className="min-h-[178px]">
        <ExternalPaymentBrand provider={provider} />
        <h3 className="mt-5 font-semibold text-[#101828] text-[16px]">{name}</h3>
        <p className="mt-1.5 text-[#667085] text-[13px] leading-relaxed">
          Connectez votre propre compte marchand depuis Behar Tech Pro.
        </p>
      </PortalCard>
    </ComingSoonIntegration>
  );
}

function ModeCard({
  icon: Icon,
  title,
  description,
  href,
  hint,
}: Readonly<{ icon: LucideIcon; title: string; description: string; href: string; hint?: string }>) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 overflow-hidden rounded-[22px] border border-[#E8EAE7] bg-white p-4 shadow-[0_10px_30px_rgba(22,32,29,0.07),0_1px_2px_rgba(22,32,29,0.04)] transition active:scale-[0.99] md:flex md:min-h-[245px] md:flex-col md:items-stretch md:p-5 md:shadow-[0_1px_2px_rgba(16,24,40,0.04)] md:hover:-translate-y-0.5 md:hover:border-[#2A9D8F]/50 md:hover:shadow-[0_14px_34px_rgba(16,24,40,0.09)]"
    >
      <span className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#F3FBF9] to-transparent opacity-80" />
      <span className="relative grid size-12 shrink-0 place-items-center rounded-[15px] border border-[#DDEBE8] bg-white text-[#168B7D] shadow-[0_6px_18px_rgba(42,157,143,0.12)] md:size-13">
        <Icon className="size-6" strokeWidth={1.8} />
      </span>
      <div className="relative min-w-0 md:flex md:flex-1 md:flex-col">
        <p className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#2A9D8F] md:mt-4">
          Espace de travail
        </p>
        <h3 className="font-semibold text-[#171714] text-[16px] tracking-tight md:text-[17px]">{title}</h3>
        <p className="mt-1 text-[#667085] text-[12px] leading-[1.55] md:mt-1.5 md:flex-1 md:text-[13.5px]">
          {description}
        </p>
        {hint && (
          <p className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#F1F4F3] px-2.5 py-1 font-medium text-[#626763] text-[10.5px] md:mt-3 md:text-[11.5px]">
            {hint}
          </p>
        )}
      </div>
      <span className="relative grid size-9 shrink-0 place-items-center rounded-full border border-[#E2E7E4] bg-white text-[#9A9F9C] shadow-sm transition group-hover:border-[#B9DDD7] group-hover:text-[#168B7D] md:absolute md:right-5 md:top-5">
        <ArrowUpRight className="size-[17px]" />
      </span>
    </Link>
  );
}

function QuickLink({
  icon: Icon,
  title,
  caption,
  href,
}: Readonly<{ icon: LucideIcon; title: string; caption: string; href: string }>) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group rounded-[14px] border border-[#E4E7EC] bg-white p-3.5 transition hover:border-[#2A9D8F]/45 hover:shadow-[0_4px_14px_rgba(16,24,40,0.06)]"
    >
      <span className="grid size-9 place-items-center rounded-[10px] border border-[#E4E7EC] bg-white text-[#2A9D8F]">
        <Icon className="size-[17px]" />
      </span>
      <p className="mt-2.5 font-semibold text-[#101828] text-[13.5px]">{title}</p>
      <p className="mt-0.5 text-[#667085] text-[11.5px]">{caption}</p>
    </Link>
  );
}

function MiniStat({ value, label }: Readonly<{ value: number; label: string }>) {
  return (
    <div className="text-center">
      <p className="font-bold text-[#101828] text-[22px] leading-none tabular-nums">{value}</p>
      <p className="mt-1 text-[#667085] text-[11.5px]">{label}</p>
    </div>
  );
}

function AppointmentsCalendar() {
  const appointments = useBeharStore((s) => s.appointments);
  const [viewDate, setViewDate] = useState<Date | null>(null);
  useEffect(() => setViewDate(new Date()), []);

  const { cells, monthLabel, todayCount } = useMemo(() => {
    if (!viewDate) return { cells: [] as Array<{ date: Date; inMonth: boolean }>, monthLabel: "", todayCount: 0 };
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1);
    const lead = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - lead);
    const out: Array<{ date: Date; inMonth: boolean }> = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      out.push({ date: d, inMonth: d.getMonth() === month });
    }
    const today = new Date();
    const count = appointments.filter((a) => {
      const d = parseApptDate(a.date);
      return d && sameDay(d, today) && normalizeAppointmentStatus(a.status, a.confirmed) !== "Annulé";
    }).length;
    return { cells: out, monthLabel: `${MONTH_NAMES_FR[month]} ${year}`, todayCount: count };
  }, [viewDate, appointments]);

  const apptDays = useMemo(() => {
    const set = new Set<string>();
    if (!viewDate) return set;
    for (const a of appointments) {
      const d = parseApptDate(a.date);
      if (d && d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear()) {
        set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
      }
    }
    return set;
  }, [appointments, viewDate]);

  const today = new Date();

  return (
    <PortalCard>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-[#101828] text-[17px] capitalize tracking-tight">{monthLabel || "…"}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Mois précédent"
            onClick={() => viewDate && setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
            className="grid size-8 place-items-center rounded-[9px] border border-[#E4E7EC] bg-white text-[#667085] transition hover:border-[#2A9D8F]/40 hover:text-[#101828]"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Mois suivant"
            onClick={() => viewDate && setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
            className="grid size-8 place-items-center rounded-[9px] border border-[#E4E7EC] bg-white text-[#667085] transition hover:border-[#2A9D8F]/40 hover:text-[#101828]"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS_FR.map((day) => (
          <span key={day} className="pb-1 font-medium text-[#98A2B3] text-[11px]">
            {day}
          </span>
        ))}
        {cells.map(({ date, inMonth }) => {
          const isToday = sameDay(date, today);
          const hasAppt = apptDays.has(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
          return (
            <div key={date.toISOString()} className="relative flex h-9 items-center justify-center">
              <span
                className={`grid size-8 place-items-center rounded-full text-[13px] ${
                  isToday ? "bg-[#2A9D8F] font-semibold text-white" : inMonth ? "text-[#101828]" : "text-[#C4C4C0]"
                }`}
              >
                {date.getDate()}
              </span>
              {hasAppt && !isToday && (
                <span className="absolute bottom-1 size-1 rounded-full bg-[#2A9D8F]" aria-hidden />
              )}
            </div>
          );
        })}
      </div>

      <Link
        href="/dashboard/rendez-vous"
        prefetch={false}
        className="mt-4 flex items-center justify-between rounded-[12px] border border-[#E4E7EC] bg-white px-3.5 py-3 transition hover:border-[#2A9D8F]/45"
      >
        <span className="flex items-center gap-2 text-[#101828] text-[13.5px]">
          <CalendarDays className="size-4 text-[#2A9D8F]" />
          {todayCount > 0 ? `${todayCount} rendez-vous aujourd'hui` : "Aucun rendez-vous aujourd'hui"}
        </span>
        <ChevronRight className="size-4 text-[#98A2B3]" />
      </Link>
    </PortalCard>
  );
}
