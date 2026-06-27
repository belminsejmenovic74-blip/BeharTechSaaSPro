"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ShieldAlert } from "lucide-react";

import type { PermissionKey } from "@/lib/behar-store";
import { useBeharStore } from "@/lib/behar-store";

const ROUTE_PERMISSIONS: Array<{ prefix: string; permission: PermissionKey; label: string }> = [
  { prefix: "/dashboard/parametres/equipe", permission: "canManageUsers", label: "gestion équipe" },
  { prefix: "/dashboard/parametres", permission: "canViewSettings", label: "paramètres atelier" },
  { prefix: "/dashboard/clients", permission: "canViewClients", label: "clients" },
  { prefix: "/dashboard/reparations", permission: "canViewRepairs", label: "réparations" },
  { prefix: "/dashboard/atelier", permission: "canViewRepairs", label: "atelier" },
  { prefix: "/dashboard/dossiers", permission: "canViewRepairs", label: "dossiers" },
  { prefix: "/dashboard/devis", permission: "canViewQuotes", label: "devis" },
  { prefix: "/dashboard/factures", permission: "canViewInvoices", label: "factures" },
  { prefix: "/dashboard/paiements", permission: "canViewPayments", label: "paiements" },
  { prefix: "/dashboard/documents", permission: "canViewDocuments", label: "documents" },
  { prefix: "/dashboard/stock", permission: "canViewStock", label: "stock" },
  { prefix: "/dashboard/ventes", permission: "canViewSales", label: "ventes" },
  { prefix: "/dashboard/rendez-vous", permission: "canViewRepairs", label: "rendez-vous" },
  { prefix: "/dashboard/comptoir", permission: "canCreateRepair", label: "comptoir" },
  { prefix: "/dashboard", permission: "canViewDashboard", label: "dashboard" },
];

function routeRequirement(pathname: string) {
  return ROUTE_PERMISSIONS.find((entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`));
}

function AccessDenied({ label }: Readonly<{ label: string }>) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-5">
      <section className="w-full max-w-[460px] rounded-[18px] border border-[#E8E8E5] bg-white p-6 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#FFF7ED] text-[#B45309]">
          <ShieldAlert className="size-6" />
        </span>
        <h1 className="mt-4 font-bold text-[#1A1916] text-xl">Accès non autorisé</h1>
        <p className="mt-2 text-[#6B6B6B] text-sm">
          Votre rôle ne permet pas d'ouvrir la section {label}. Demandez à un admin d'ajuster vos permissions.
        </p>
        <Link
          className="mt-5 inline-flex h-11 items-center justify-center rounded-[12px] bg-[#1A1916] px-4 font-semibold text-sm text-white"
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
  const hydrated = useBeharStore((state) => state._hasHydrated);
  const hasPermission = useBeharStore((state) => state.hasPermission);
  const requirement = routeRequirement(pathname || "/dashboard");

  if (!hydrated) return null;
  if (requirement && !hasPermission(requirement.permission)) {
    return <AccessDenied label={requirement.label} />;
  }
  return <>{children}</>;
}
