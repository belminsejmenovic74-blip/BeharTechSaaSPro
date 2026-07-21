"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  Files,
  FileText,
  Inbox,
  Landmark,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  RefreshCw,
  Settings,
  ShoppingCart,
  Store,
  Users,
  Wrench,
} from "lucide-react";

import { BeharLogo } from "@/components/behar/behar-logo";
import { type PermissionKey, useBeharStore } from "@/lib/behar-store";
import { getUserFirstName } from "@/lib/user-display";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Général",
    items: [{ label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard, permission: "canViewDashboard" }],
  },
  {
    label: "Atelier",
    items: [
      { label: "Réparations", href: "/dashboard/reparations", icon: Wrench, permission: "canViewRepairs" },
      { label: "Clients", href: "/dashboard/clients", icon: Users, permission: "canViewClients" },
      {
        label: "Demandes du site",
        href: "/dashboard/demandes-site",
        icon: Inbox,
        permission: "canViewNotifications",
      },
      { label: "Rendez-vous", href: "/dashboard/rendez-vous", icon: CalendarDays, permission: "canViewRepairs" },
    ],
  },
  {
    label: "Ventes & gestion",
    items: [
      { label: "Devis", href: "/dashboard/devis", icon: FileText, permission: "canViewQuotes" },
      { label: "Factures", href: "/dashboard/factures", icon: Receipt, permission: "canViewInvoices" },
      { label: "Stock", href: "/dashboard/stock", icon: Package, permission: "canViewStock" },
      { label: "Achats", href: "/dashboard/achats", icon: ShoppingCart, permission: "canViewPurchasePrice" },
    ],
  },
  {
    label: "Services",
    items: [
      {
        label: "Reconditionnement",
        href: "/dashboard/reconditionnement",
        icon: RefreshCw,
        permission: "canViewRepairs",
      },
      { label: "Documents", href: "/dashboard/documents", icon: Files, permission: "canViewDocuments" },
    ],
  },
  {
    label: "Modes de travail",
    items: [
      { label: "Comptoir", href: "/comptoir", icon: Store, permission: "canAccessCounter" },
      { label: "Atelier plein écran", href: "/atelier", icon: Wrench, permission: "canAccessWorkshopMode" },
    ],
  },
  {
    label: "Configuration",
    items: [{ label: "Paramètres", href: "/dashboard/parametres", icon: Settings, permission: "canViewSettings" }],
  },
] satisfies Array<{
  label: string;
  items: Array<{ label: string; href: string; icon: typeof LayoutDashboard; permission: PermissionKey }>;
}>;

export function DashboardSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const hasPermission = useBeharStore((s) => s.hasPermission);
  const currentUser = useBeharStore((s) => s.currentUser);
  const logout = useBeharStore((s) => s.logout);
  const userRoleLabel =
    currentUser.role === "admin" ? "Gérant" : currentUser.role === "technician" ? "Technicien" : "Accueil";
  const userFirstName = getUserFirstName(currentUser.name, currentUser.id);
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasPermission(item.permission)),
    }))
    .filter((group) => group.items.length > 0);

  useEffect(() => {
    const saved = window.localStorage.getItem("behar-sidebar-collapsed") === "true";
    setCollapsed(saved);
    document.documentElement.style.setProperty("--behar-sidebar-width", saved ? "72px" : "232px");
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem("behar-sidebar-collapsed", String(next));
    document.documentElement.style.setProperty("--behar-sidebar-width", next ? "72px" : "232px");
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden border-[#E4E7EC] border-r bg-white py-5 transition-[width,padding] duration-200 md:flex md:flex-col",
        collapsed ? "w-[72px] px-2" : "w-[232px] px-3",
      )}
    >
      <div className={cn("flex h-10 items-center", collapsed ? "justify-center" : "gap-1.5")}>
        {!collapsed && (
          <Link className="min-w-0 flex-1" href="/dashboard" prefetch={false}>
            <BeharLogo size="sm" />
          </Link>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="grid size-8 shrink-0 place-items-center rounded-[9px] border border-[#E4E7EC] bg-white text-[#667085] transition-colors hover:bg-[#F5F7FA] hover:text-[#101828]"
          aria-label={collapsed ? "Afficher le menu" : "Masquer le menu"}
          title={collapsed ? "Afficher le menu" : "Masquer le menu"}
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        </button>
      </div>

      <nav className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0.5">
        {visibleGroups.map((group) => (
          <section key={group.label}>
            {!collapsed && (
              <p className="mb-1 px-2 font-semibold text-[#98A2B3] text-[9px] uppercase leading-4 tracking-[0.12em]">
                {group.label}
              </p>
            )}
            <div className={cn("space-y-0.5", !collapsed && "ml-2 border-[#EAECF0] border-l pl-2")}>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);

                return (
                  <Link
                    className={cn(
                      "flex h-9 items-center rounded-[9px] border border-transparent font-medium text-[#667085] text-[12.5px] transition-colors",
                      collapsed ? "justify-center px-0" : "gap-2.5 px-2.5",
                      "hover:bg-[#F4FBF9] hover:text-[#101828]",
                      active && "border-[#D8EEEA] bg-[#F4FBF9] font-semibold text-[#167B70]",
                    )}
                    href={item.href}
                    key={item.href}
                    prefetch={false}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={cn("size-4 shrink-0", active && "text-[#2A9D8F]")} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="border-[#EAECF0] border-t pt-3">
        <div
          className={cn(
            "group flex min-h-9 items-center rounded-[9px] bg-white py-1 transition-colors hover:bg-[#F4FBF9]",
            collapsed ? "justify-center px-1" : "gap-2 px-2",
          )}
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-[8px] border border-[#D8EEEA] bg-white font-semibold text-[#167B70] text-[11px]">
            {userFirstName.charAt(0).toUpperCase()}
          </span>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate font-medium text-[#101828] text-[12px]">{userFirstName}</div>
                <div className="text-[#98A2B3] text-[9.5px]">{userRoleLabel}</div>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                className="grid size-7 place-items-center rounded-[8px] text-[#98A2B3] opacity-60 transition hover:bg-white hover:text-[#B42318] hover:opacity-100"
                title="Changer d'utilisateur"
                aria-label="Déconnexion"
              >
                <LogOut className="size-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
