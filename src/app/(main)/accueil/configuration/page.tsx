"use client";

import Link from "next/link";
import { Building2, CreditCard, FileText, Mail, MessageSquareText, Shield, Users, Wrench } from "lucide-react";

import { PageHeader, PortalCard, PortalPage, StatusPill } from "@/components/behar/accueil-ui";
import { getPlanLimits } from "@/lib/plan-limits";
import { useBeharStore } from "@/lib/behar-store";

const sections = [
  {
    title: "Mon entreprise",
    description: "Coordonnees, mentions legales, horaires et devise",
    href: "/dashboard/parametres",
    icon: Building2,
  },
  {
    title: "SMS",
    description: "Modeles, automatisations, consommation et historique",
    href: "/dashboard/parametres#communications",
    icon: MessageSquareText,
  },
  {
    title: "E-mails",
    description: "Expediteur, signature, modeles et historique",
    href: "/dashboard/parametres#communications",
    icon: Mail,
  },
  {
    title: "Documents",
    description: "Devis, factures, garanties, QR et apercus PDF",
    href: "/dashboard/documents",
    icon: FileText,
  },
  {
    title: "Utilisateurs et acces",
    description: "Equipe, roles et permissions",
    href: "/dashboard/parametres/equipe",
    icon: Users,
  },
  {
    title: "Securite",
    description: "Sessions, appareils et journal d'activite",
    href: "/dashboard/parametres/equipe",
    icon: Shield,
  },
];

export default function PortalConfigurationPage() {
  const store = useBeharStore();
  const limits = getPlanLimits(store.licensePlan);
  return (
    <PortalPage>
      <PageHeader title="Configuration" subtitle="Les reglages enregistres ici sont ceux utilises par le SaaS." />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map(({ title, description, href, icon: Icon }) => (
            <Link
              href={href}
              key={title}
              className="group rounded-[18px] border border-[#E4E7EC] bg-white p-5 transition hover:border-[#2A9D8F]/50 hover:shadow-[0_10px_28px_rgba(16,24,40,.07)]"
            >
              <Icon className="size-5 text-[#2A9D8F]" />
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="mt-1 text-[#667085] text-sm leading-6">{description}</p>
            </Link>
          ))}
        </div>
        <PortalCard>
          <div className="flex items-center justify-between">
            <span className="grid size-10 place-items-center rounded-xl bg-[#EAF6F4] text-[#167B70]">
              <CreditCard className="size-5" />
            </span>
            <StatusPill tone={store.licenseActivated ? "ok" : "warn"}>
              {store.licenseActivated ? "Active" : "Inactive"}
            </StatusPill>
          </div>
          <h2 className="mt-4 font-semibold text-lg">Abonnement et licence</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Plan" value={store.licensePlan || "Non disponible"} />
            <Row label="Appareils" value={limits.devices == null ? "Illimites" : String(limits.devices)} />
            <Row
              label="Reparations / mois"
              value={limits.repairsPerMonth == null ? "Illimitees" : String(limits.repairsPerMonth)}
            />
            <Row label="SMS / mois" value={limits.smsPerMonth == null ? "Illimites" : String(limits.smsPerMonth)} />
          </dl>
          {store.licenseKey ? (
            <div className="mt-4 rounded-xl border border-[#E4E7EC] bg-[#F6F7F9] p-3">
              <p className="text-[#667085] text-xs">Cle de licence</p>
              <p className="mt-1 break-all font-mono text-sm">{store.licenseKey}</p>
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-[#FFF7ED] p-3 text-[#9A3412] text-sm">
              Aucune licence active sur cet appareil.
            </p>
          )}
          <Link
            href="/dashboard/parametres"
            className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#101828] font-semibold text-sm text-white"
          >
            <Wrench className="size-4" />
            Gerer les parametres
          </Link>
        </PortalCard>
      </div>
    </PortalPage>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[#667085]">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}
