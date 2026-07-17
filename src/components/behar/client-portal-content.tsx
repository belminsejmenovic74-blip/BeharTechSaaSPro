"use client";

import Link from "next/link";

import { Building2, CreditCard, FileText, LayoutTemplate, Mail, MessageSquareText, Store, Users } from "lucide-react";

import AccueilHome from "@/app/(main)/accueil/page";
import { ExternalPaymentIntegrations } from "@/components/behar/external-payment-integrations";
import { PageHeader, PortalPage } from "@/components/behar/accueil-ui";

export type ClientSection =
  | "accueil"
  | "offre"
  | "sms"
  | "emails"
  | "documents"
  | "widgets"
  | "paiements"
  | "equipe"
  | "boutiques";

const SECTION_CONTENT = {
  offre: {
    title: "Mon offre",
    subtitle: "Consultez votre abonnement Behar Tech Pro sans mélanger sa facturation avec vos demandes clients.",
    href: "/dashboard/parametres",
    action: "Voir mon abonnement",
    icon: CreditCard,
  },
  sms: {
    title: "SMS",
    subtitle: "Gérez vos modèles, crédits et communications atelier.",
    href: "/dashboard/parametres#communications",
    action: "Gérer les SMS",
    icon: MessageSquareText,
  },
  emails: {
    title: "E-mails",
    subtitle: "Configurez l’expéditeur, les modèles et les communications clients.",
    href: "/dashboard/parametres#communications",
    action: "Gérer les e-mails",
    icon: Mail,
  },
  documents: {
    title: "Documents",
    subtitle: "Retrouvez les réglages de vos devis, factures, garanties et modèles PDF.",
    href: "/dashboard/documents",
    action: "Ouvrir les documents",
    icon: FileText,
  },
  widgets: {
    title: "Widgets",
    subtitle: "Personnalisez la prise de rendez-vous et les demandes depuis votre site.",
    href: "/accueil/widget",
    action: "Configurer le widget",
    icon: LayoutTemplate,
  },
  equipe: {
    title: "Équipe",
    subtitle: "Gérez les utilisateurs, les rôles et les droits d’accès aux boutiques.",
    href: "/dashboard/parametres/equipe",
    action: "Gérer l’équipe",
    icon: Users,
  },
  boutiques: {
    title: "Boutiques",
    subtitle: "Configurez vos établissements, devises, coordonnées et horaires.",
    href: "/dashboard/parametres",
    action: "Gérer les boutiques",
    icon: Store,
  },
} as const;

export function ClientPortalContent({ section }: Readonly<{ section: ClientSection }>) {
  if (section === "accueil") return <AccueilHome />;
  if (section === "paiements") {
    return (
      <PortalPage>
        <p className="mb-2 font-semibold text-[#6B6B6B] text-xs uppercase tracking-[0.18em]">Intégrations</p>
        <ExternalPaymentIntegrations />
      </PortalPage>
    );
  }

  const content = SECTION_CONTENT[section];
  const Icon = content.icon;
  return (
    <PortalPage>
      <PageHeader title={content.title} subtitle={content.subtitle} />
      <div className="max-w-3xl rounded-[20px] border border-[#E9E9E6] bg-white p-6 shadow-[0_12px_36px_rgba(26,25,22,0.04)] sm:p-8">
        <span className="grid size-12 place-items-center rounded-[14px] border border-[#E9E9E6] text-[#2A9D8F]">
          <Icon className="size-5" />
        </span>
        <h2 className="mt-5 font-semibold text-[#1A1916] text-xl">{content.title}</h2>
        <p className="mt-2 max-w-xl text-[#6B6B6B] text-sm leading-6">{content.subtitle}</p>
        <Link
          className="mt-6 inline-flex h-11 items-center justify-center rounded-[12px] border border-[#2A9D8F] px-5 font-semibold text-[#167B70] text-sm transition hover:bg-[#F0FAF8]"
          href={content.href}
        >
          {content.action}
        </Link>
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-[16px] border border-[#E9E9E6] bg-white p-5 text-[#6B6B6B] text-sm">
        <Building2 className="mt-0.5 size-5 shrink-0 text-[#2A9D8F]" />
        Ces réglages utilisent la même organisation, les mêmes boutiques et les mêmes données que le SaaS.
      </div>
    </PortalPage>
  );
}
