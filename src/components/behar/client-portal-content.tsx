"use client";

import { useEffect } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Building2,
  CalendarDays,
  Check,
  Copy,
  CreditCard,
  FileText,
  KeyRound,
  LayoutTemplate,
  Mail,
  MessageSquareText,
  Sparkles,
  Store,
  Users,
} from "lucide-react";

import AccueilHome from "@/app/(main)/accueil/page";
import { ExternalPaymentIntegrations } from "@/components/behar/external-payment-integrations";
import { useCapabilities } from "@/lib/use-capabilities";
import { PageHeader, PortalPage } from "@/components/behar/accueil-ui";
import { useBeharStore } from "@/lib/behar-store";

function LicenseKeyCard() {
  const licenseKey = useBeharStore((s) => s.licenseKey);
  const licensePlan = useBeharStore((s) => s.licensePlan);
  const licenseActivated = useBeharStore((s) => s.licenseActivated);
  const [copied, setCopied] = useState(false);

  if (!licenseActivated || !licenseKey) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(licenseKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* presse-papiers indisponible */
    }
  };

  return (
    <div className="mb-5 max-w-3xl rounded-[20px] border border-[#D8EDEA] bg-[#F3FAF9] p-6 sm:p-7">
      <div className="flex items-center gap-2 text-[#167B70]">
        <KeyRound className="size-5" />
        <p className="text-xs font-bold uppercase tracking-[0.14em]">
          Clé de licence{licensePlan ? ` · ${licensePlan}` : ""}
        </p>
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="break-all font-mono text-lg font-semibold tracking-wide text-[#101828]">{licenseKey}</p>
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[12px] border border-[#2A9D8F] px-4 text-sm font-semibold text-[#167B70] transition hover:bg-[#EAF7F4]"
        >
          {copied ? (
            <>
              <Check className="size-4" /> Copiée
            </>
          ) : (
            <>
              <Copy className="size-4" /> Copier
            </>
          )}
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#5A726D]">
        Cette clé active votre logiciel Behar Tech Pro. Conservez-la : elle sert à réactiver l’accès sur un nouvel
        appareil.
      </p>
    </div>
  );
}

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
  const router = useRouter();
  const capabilities = useCapabilities();
  useEffect(() => {
    if (section === "paiements" && capabilities.ready && !capabilities.canCollectPayment) {
      router.replace("/client");
    }
  }, [capabilities.canCollectPayment, capabilities.ready, router, section]);

  if (section === "accueil") return <AccueilHome />;
  if (section === "sms" || section === "emails") {
    const isSms = section === "sms";
    const Icon = isSms ? MessageSquareText : Mail;
    return (
      <PortalPage>
        <PageHeader
          title={isSms ? "SMS" : "E-mails"}
          subtitle="Les communications clients arrivent bientôt dans votre espace."
        />
        <section className="relative max-w-3xl overflow-hidden rounded-[24px] border border-[#E5E9E6] bg-white p-6 shadow-[0_18px_55px_rgba(22,32,29,0.08)] sm:p-9">
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#EFF9F7] to-transparent" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#D6EBE7] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#167B70] shadow-sm">
              <Sparkles className="size-3.5" /> Nouvelle fonctionnalité
            </span>
            <span className="mt-6 grid size-14 place-items-center rounded-[17px] border border-[#DCEAE7] bg-white text-[#2A9D8F] shadow-[0_8px_24px_rgba(42,157,143,0.12)]">
              <Icon className="size-6" />
            </span>
            <h2 className="mt-5 text-[23px] font-semibold tracking-tight text-[#101828]">
              {isSms ? "Communications SMS" : "Communications par e-mail"}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#667085]">
              {isSms
                ? "Envoyez les confirmations, suivis et rappels directement depuis les dossiers clients."
                : "Envoyez vos documents, confirmations et informations de suivi depuis le même espace."}
            </p>
            <div className="mt-7 inline-flex min-h-12 items-center gap-3 rounded-[14px] border border-[#DDE7E4] bg-[#F7FAF9] px-4 text-sm font-semibold text-[#285F58]">
              <CalendarDays className="size-5 text-[#2A9D8F]" />
              Disponible à partir du 1er août 2026
            </div>
          </div>
        </section>
      </PortalPage>
    );
  }
  if (section === "paiements") {
    if (!capabilities.ready || !capabilities.canCollectPayment) return null;
    return (
      <PortalPage>
        <p className="mb-2 font-semibold text-[#667085] text-xs uppercase tracking-[0.18em]">Intégrations</p>
        <ExternalPaymentIntegrations />
      </PortalPage>
    );
  }

  const content = SECTION_CONTENT[section];
  const Icon = content.icon;
  return (
    <PortalPage>
      <PageHeader title={content.title} subtitle={content.subtitle} />
      {section === "offre" ? <LicenseKeyCard /> : null}
      <div className="max-w-3xl rounded-[20px] border border-[#E9E9E6] bg-white p-6 shadow-[0_12px_36px_rgba(16,24,40,0.04)] sm:p-8">
        <span className="grid size-12 place-items-center rounded-[14px] border border-[#E9E9E6] text-[#2A9D8F]">
          <Icon className="size-5" />
        </span>
        <h2 className="mt-5 font-semibold text-[#101828] text-xl">{content.title}</h2>
        <p className="mt-2 max-w-xl text-[#667085] text-sm leading-6">{content.subtitle}</p>
        <Link
          className="mt-6 inline-flex h-11 items-center justify-center rounded-[12px] border border-[#2A9D8F] px-5 font-semibold text-[#167B70] text-sm transition hover:bg-[#F0FAF8]"
          href={content.href}
        >
          {content.action}
        </Link>
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-[16px] border border-[#E9E9E6] bg-white p-5 text-[#667085] text-sm">
        <Building2 className="mt-0.5 size-5 shrink-0 text-[#2A9D8F]" />
        Ces réglages utilisent la même organisation, les mêmes boutiques et les mêmes données que le SaaS.
      </div>
    </PortalPage>
  );
}
