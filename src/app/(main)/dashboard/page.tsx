"use client";

import { Bell, CalendarDays, MoreHorizontal } from "lucide-react";

import Link from "next/link";
import { DashboardPremium } from "@/components/behar/dashboard-premium";
import { PageShell } from "@/components/behar/page-shell";
import { DeviceThumb, PrimaryButton, StatusBadge } from "@/components/behar/primitives";
import { formatEuro, useBeharStore } from "@/lib/behar-store";

export default function Page() {
  return (
    <PageShell
      title="Tableau de bord"
      subtitle="Vue d'ensemble de votre activité en temps réel."
      actions={
        <div className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#E7E4DC] bg-white px-3.5 font-medium text-[#1A1916] text-sm">
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

function MobileDashboard() {
  const store = useBeharStore();
  const repairsInProgress = store.repairs.filter(
    (r) => r.status !== "Prêt" && r.status !== "Restitué" && r.status !== "Annulé",
  ).length;
  const monthRevenue = store.payments.filter((p) => p.status === "Payé").reduce((sum, p) => sum + p.amount, 0);
  const today = new Date().toLocaleDateString("fr-FR");
  const todaysAppointments = store.appointments.filter((a) => a.date === today || a.date === "Aujourd'hui").length;

  const featured = store.repairs.find((r) => r.status === "Préparation / Réparation") ?? store.repairs[0];
  const featuredCustomer = featured ? store.customers.find((c) => c.id === featured.customerId) : undefined;
  const pendingInvoice = store.invoices.find((i) => i.status !== "Payée" && i.status !== "Annulée");
  const pendingTotal = pendingInvoice ? pendingInvoice.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0) : 0;

  return (
    <div className="space-y-6">
      {/* Section header iOS-style */}
      <h2 className="px-1 font-semibold text-[#8A8984] text-[12px] uppercase tracking-[0.06em]">Aujourd'hui</h2>

      {/* KPI : 2 grandes cartes en haut + 1 large en dessous */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/dashboard/reparations" className="block transition active:scale-[0.98]">
            <div className="rounded-[20px] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
              <p className="text-[#8A8984] text-[12px] font-medium tracking-tight">Réparations en cours</p>
              <p className="mt-3 font-bold text-[#1A1916] text-[28px] leading-none tracking-tight">{repairsInProgress}</p>
            </div>
          </Link>
          <Link href="/dashboard/rendez-vous" className="block transition active:scale-[0.98]">
            <div className="rounded-[20px] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
              <p className="text-[#8A8984] text-[12px] font-medium tracking-tight">RDV du jour</p>
              <p className="mt-3 font-bold text-[#1A1916] text-[28px] leading-none tracking-tight">{todaysAppointments}</p>
            </div>
          </Link>
        </div>
        <Link href="/dashboard/paiements" className="block transition active:scale-[0.98]">
          <div className="flex items-end justify-between gap-3 rounded-[20px] bg-gradient-to-br from-[#2A9D8F] to-[#1F7C70] p-5 shadow-[0_8px_24px_rgba(42,157,143,0.18)]">
            <div>
              <p className="text-white/80 text-[12px] font-medium tracking-tight">CA encaissé</p>
              <p className="mt-3 font-bold text-white text-[30px] leading-none tracking-tight">{formatEuro(monthRevenue)}</p>
            </div>
            <span className="rounded-full bg-white/20 px-3 py-1 font-semibold text-white text-[11px]">Voir</span>
          </div>
        </Link>
      </div>

      {/* Réparation en focus */}
      {featured && (
        <div className="space-y-2">
          <h3 className="px-1 font-semibold text-[#8A8984] text-[12px] uppercase tracking-[0.06em]">En atelier</h3>
          <Link href={`/dashboard/reparations?selectedId=${featured.id}`} className="block transition active:scale-[0.99]">
            <div className="rounded-[20px] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
              <div className="flex items-start gap-4">
                <DeviceThumb />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#1A1916] text-[17px] tracking-tight">{featuredCustomer?.name ?? "Client"}</p>
                      <p className="mt-0.5 truncate text-[#1A1916] text-[14px]">{featured.device}</p>
                      <p className="mt-0.5 truncate text-[#8A8984] text-[13px]">{featured.issue}</p>
                    </div>
                    <MoreHorizontal className="size-5 shrink-0 text-[#CDCBC5]" />
                  </div>
                  <div className="mt-4">
                    <StatusBadge status={featured.status} />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Encaissement en attente */}
      {pendingInvoice && (
        <div className="space-y-2">
          <h3 className="px-1 font-semibold text-[#8A8984] text-[12px] uppercase tracking-[0.06em]">À encaisser</h3>
          <Link href={`/dashboard/factures?id=${pendingInvoice.id}`} className="block transition active:scale-[0.99]">
            <div className="flex items-center justify-between gap-4 rounded-[20px] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
              <div>
                <p className="text-[#8A8984] text-[12px] font-medium tracking-tight">Montant en attente</p>
                <p className="mt-1.5 font-bold text-[#1A1916] text-[26px] leading-none tracking-tight">{formatEuro(pendingTotal)}</p>
              </div>
              <PrimaryButton className="h-11 rounded-full px-6 font-semibold text-[14px]">Encaisser</PrimaryButton>
            </div>
          </Link>
        </div>
      )}

      {/* Notification cliente */}
      {featured && featuredCustomer && (
        <div className="space-y-2">
          <h3 className="px-1 font-semibold text-[#8A8984] text-[12px] uppercase tracking-[0.06em]">Notification client</h3>
          <div className="flex items-start gap-3.5 rounded-[20px] bg-white p-4 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
            <div className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-[#EAF6F2] text-[#2A9D8F]">
              <Bell className="size-5" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[#1A1916] text-[14px] tracking-tight">Message prêt à envoyer</p>
              <p className="mt-0.5 text-[#6B6B6B] text-[13px] leading-snug">
                Bonjour {featuredCustomer.name}, votre appareil est{" "}
                {featured.status === "Prêt" ? "prêt" : "en cours de traitement"}.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
