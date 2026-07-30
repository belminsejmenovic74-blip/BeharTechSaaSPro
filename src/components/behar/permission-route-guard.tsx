"use client";

import { type ReactNode, useEffect } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { ShieldAlert } from "lucide-react";

import type { PermissionKey } from "@/lib/behar-store";
import { useBeharStore } from "@/lib/behar-store";
import { useCapabilities } from "@/lib/use-capabilities";

const ROUTE_PERMISSIONS: Array<{ prefix: string; permission: PermissionKey; label: string }> = [
  { prefix: "/dashboard/parametres/equipe", permission: "canManageUsers", label: "gestion équipe" },
  { prefix: "/dashboard/parametres", permission: "canViewSettings", label: "paramètres atelier" },
  { prefix: "/dashboard/clients", permission: "canViewClients", label: "clients" },
  { prefix: "/dashboard/demandes-site", permission: "canViewNotifications", label: "demandes du site" },
  { prefix: "/dashboard/reparations", permission: "canViewRepairs", label: "réparations" },
  { prefix: "/dashboard/atelier", permission: "canViewRepairs", label: "atelier" },
  { prefix: "/dashboard/dossiers", permission: "canViewRepairs", label: "dossiers" },
  { prefix: "/dashboard/devis", permission: "canViewQuotes", label: "devis" },
  { prefix: "/dashboard/factures", permission: "canViewInvoices", label: "factures" },
  { prefix: "/dashboard/comptabilite/export", permission: "canExportData", label: "export comptable" },
  { prefix: "/dashboard/documents", permission: "canViewDocuments", label: "documents" },
  { prefix: "/dashboard/stock", permission: "canViewStock", label: "stock" },
  { prefix: "/dashboard/achats", permission: "canViewPurchasePrice", label: "achats" },
  { prefix: "/dashboard/rendez-vous", permission: "canViewRepairs", label: "rendez-vous" },
  { prefix: "/dashboard/reconditionnement", permission: "canViewRepairs", label: "reconditionnement" },
  { prefix: "/dashboard", permission: "canViewDashboard", label: "dashboard" },
];

function routeRequirement(pathname: string) {
  return ROUTE_PERMISSIONS.find((entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`));
}

function AccessDenied({ label }: Readonly<{ label: string }>) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-5">
      <section className="w-full max-w-[460px] rounded-[18px] border border-[#E4E7EC] bg-white p-6 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#F4F4F2] text-[#667085]">
          <ShieldAlert className="size-6" />
        </span>
        <h1 className="mt-4 font-bold text-[#101828] text-xl">Accès non autorisé</h1>
        <p className="mt-2 text-[#667085] text-sm">
          Votre rôle ne permet pas d'ouvrir la section {label}. Demandez à un admin d'ajuster vos permissions.
        </p>
        <Link
          className="mt-5 inline-flex h-11 items-center justify-center rounded-[12px] bg-[#101828] px-4 font-semibold text-sm text-white"
          href="/dashboard"
        >
          Retour au dashboard
        </Link>
      </section>
    </div>
  );
}

export function PermissionRouteGuard({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const capabilities = useCapabilities();
  const hydrated = useBeharStore((state) => state._hasHydrated);
  const hasPermission = useBeharStore((state) => state.hasPermission);
  const requirement = routeRequirement(pathname || "/dashboard");
  const billingRoute =
    pathname.startsWith("/dashboard/devis") ||
    pathname.startsWith("/dashboard/factures") ||
    pathname.startsWith("/dashboard/paiements") ||
    pathname.startsWith("/dashboard/ventes") ||
    pathname.startsWith("/dashboard/achats") ||
    pathname.startsWith("/dashboard/comptabilite/export");
  const accountingExport = pathname.startsWith("/dashboard/comptabilite/export");

  useEffect(() => {
    if (capabilities.ready && billingRoute && !capabilities.canInvoice) {
      router.replace("/dashboard");
    }
  }, [billingRoute, capabilities.canInvoice, capabilities.ready, router]);

  if (!hydrated || !capabilities.ready) return null;
  if (billingRoute && !capabilities.canInvoice) return null;
  if (requirement && !hasPermission(requirement.permission)) {
    return <AccessDenied label={requirement.label} />;
  }
  if (accountingExport && !capabilities.canExportAccounting) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-5">
        <section className="w-full max-w-[480px] rounded-[18px] border border-[#E4E7EC] bg-white p-6 text-center shadow-sm">
          <h1 className="font-bold text-[#101828] text-xl">Export comptable</h1>
          <p className="mt-2 text-[#667085] text-sm">
            L’export comptable est disponible avec les offres Pro et Business.
          </p>
          <Link
            className="mt-5 inline-flex h-11 items-center justify-center rounded-[12px] bg-[#101828] px-4 font-semibold text-sm text-white"
            href="/client?section=offre"
          >
            Voir les forfaits
          </Link>
        </section>
      </div>
    );
  }
  return <>{children}</>;
}
