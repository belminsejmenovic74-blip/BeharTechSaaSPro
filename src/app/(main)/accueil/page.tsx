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
          <h2 className="font-semibold text-[#1A1916] text-[17px] tracking-tight">Accès rapide</h2>
          <p className="mt-1 text-[#6B6B6B] text-[13.5px]">Gérez votre espace en dehors de la production.</p>
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
            <h2 id="integrations-a-venir" className="font-semibold text-[#1A1916] text-[19px] tracking-tight">
              Intégrations à venir
            </h2>
            <p className="mt-1 text-[#6B6B6B] text-[13.5px]">
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
        <h3 className="mt-5 font-semibold text-[#1A1916] text-[16px]">{name}</h3>
        <p className="mt-1.5 text-[#6B6B6B] text-[13px] leading-relaxed">
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
      className="group flex flex-col rounded-[18px] border border-[#E8E8E5] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:-translate-y-0.5 hover:border-[#2A9D8F]/50 hover:shadow-[0_12px_30px_rgba(16,24,40,0.09)]"
    >
      <div className="flex items-start justify-between">
        <span className="grid size-12 place-items-center rounded-[14px] border border-[#E8E8E5] bg-white text-[#2A9D8F]">
          <Icon className="size-6" />
        </span>
        <ArrowUpRight className="size-5 text-[#C4C4C0] transition group-hover:text-[#2A9D8F]" />
      </div>
      <h3 className="mt-4 font-semibold text-[#1A1916] text-[17px] tracking-tight">{title}</h3>
      <p className="mt-1.5 flex-1 text-[#6B6B6B] text-[13.5px] leading-relaxed">{description}</p>
      {hint && (
        <p className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#F1F2F4] px-2.5 py-1 font-medium text-[#6B6B6B] text-[11.5px]">
          {hint}
        </p>
      )}
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
      className="group rounded-[14px] border border-[#E8E8E5] bg-white p-3.5 transition hover:border-[#2A9D8F]/45 hover:shadow-[0_4px_14px_rgba(16,24,40,0.06)]"
    >
      <span className="grid size-9 place-items-center rounded-[10px] border border-[#E8E8E5] bg-white text-[#2A9D8F]">
        <Icon className="size-[17px]" />
      </span>
      <p className="mt-2.5 font-semibold text-[#1A1916] text-[13.5px]">{title}</p>
      <p className="mt-0.5 text-[#6B6B6B] text-[11.5px]">{caption}</p>
    </Link>
  );
}

function MiniStat({ value, label }: Readonly<{ value: number; label: string }>) {
  return (
    <div className="text-center">
      <p className="font-bold text-[#1A1916] text-[22px] leading-none tabular-nums">{value}</p>
      <p className="mt-1 text-[#6B6B6B] text-[11.5px]">{label}</p>
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
        <h2 className="font-semibold text-[#1A1916] text-[17px] capitalize tracking-tight">{monthLabel || "…"}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Mois précédent"
            onClick={() => viewDate && setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
            className="grid size-8 place-items-center rounded-[9px] border border-[#E8E8E5] bg-white text-[#6B6B6B] transition hover:border-[#2A9D8F]/40 hover:text-[#1A1916]"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Mois suivant"
            onClick={() => viewDate && setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
            className="grid size-8 place-items-center rounded-[9px] border border-[#E8E8E5] bg-white text-[#6B6B6B] transition hover:border-[#2A9D8F]/40 hover:text-[#1A1916]"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS_FR.map((day) => (
          <span key={day} className="pb-1 font-medium text-[#8A8A8A] text-[11px]">
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
                  isToday ? "bg-[#2A9D8F] font-semibold text-white" : inMonth ? "text-[#1A1916]" : "text-[#C4C4C0]"
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
        className="mt-4 flex items-center justify-between rounded-[12px] border border-[#E8E8E5] bg-white px-3.5 py-3 transition hover:border-[#2A9D8F]/45"
      >
        <span className="flex items-center gap-2 text-[#1A1916] text-[13.5px]">
          <CalendarDays className="size-4 text-[#2A9D8F]" />
          {todayCount > 0 ? `${todayCount} rendez-vous aujourd'hui` : "Aucun rendez-vous aujourd'hui"}
        </span>
        <ChevronRight className="size-4 text-[#A3A3A3]" />
      </Link>
    </PortalCard>
  );
}
