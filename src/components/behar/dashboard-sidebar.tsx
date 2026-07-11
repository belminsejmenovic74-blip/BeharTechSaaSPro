"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Files,
  FileText,
  LayoutDashboard,
  Inbox,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBeharStore } from "@/lib/behar-store";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { label: "Réparations", href: "/dashboard/reparations", icon: Wrench },
  { label: "Clients", href: "/dashboard/clients", icon: Users },
  { label: "Demandes du site", href: "/dashboard/demandes-site", icon: Inbox },
  { label: "Devis", href: "/dashboard/devis", icon: FileText },
  { label: "Factures", href: "/dashboard/factures", icon: Receipt },
  { label: "Rendez-vous", href: "/dashboard/rendez-vous", icon: CalendarDays },
  { label: "Stock", href: "/dashboard/stock", icon: Package },
  { label: "Achats", href: "/dashboard/achats", icon: ShoppingCart },
  { label: "Reconditionnement", href: "/dashboard/reconditionnement", icon: RefreshCw },
  { label: "Documents", href: "/dashboard/documents", icon: Files },
  { label: "Paramètres", href: "/dashboard/parametres", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const workshopName = useBeharStore((s) => s.workshopSettings.name || s.workshopInfo.name);
  const workshopLogo = useBeharStore((s) => s.workshopSettings.logoUrl || s.workshopInfo.logoUrl || "");
  const canViewSettings = useBeharStore((s) => s.hasPermission("canViewSettings"));
  // L'onglet Achats expose les prix d'achat : réservé aux rôles autorisés.
  const canViewPurchases = useBeharStore((s) => s.hasPermission("canViewPurchasePrice"));
  const currentUser = useBeharStore((s) => s.currentUser);
  const logout = useBeharStore((s) => s.logout);
  const userRoleLabel =
    currentUser.role === "admin" ? "Gérant" : currentUser.role === "technician" ? "Technicien" : "Accueil";
  const workshopInitials = workshopName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    const saved = window.localStorage.getItem("behar-sidebar-collapsed") === "true";
    setCollapsed(saved);
    document.documentElement.style.setProperty("--behar-sidebar-width", saved ? "78px" : "234px");
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem("behar-sidebar-collapsed", String(next));
    document.documentElement.style.setProperty("--behar-sidebar-width", next ? "78px" : "230px");
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden border-[#E8E8E5] border-r bg-white py-6 transition-[width,padding] duration-200 md:flex md:flex-col",
        collapsed ? "w-[78px] px-2.5" : "w-[234px] px-3",
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
          className="grid size-8 shrink-0 place-items-center rounded-[10px] border border-[#E8E8E5] bg-white text-[#6B6B6B] transition hover:border-[#2A9D8F]/45 hover:text-[#1A1916]"
          aria-label={collapsed ? "Afficher le menu" : "Masquer le menu"}
          title={collapsed ? "Afficher le menu" : "Masquer le menu"}
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        </button>
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-0.5">
        {navItems
          .filter((item) => item.href !== "/dashboard/parametres" || canViewSettings)
          .filter((item) => item.href !== "/dashboard/achats" || canViewPurchases)
          .map((item) => {
            const Icon = item.icon;
            const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                className={cn(
                  "flex h-[42px] items-center rounded-[12px] font-medium text-[#6B6B6B] text-[13.5px] transition",
                  collapsed ? "justify-center px-0" : "gap-3 px-3",
                  "hover:bg-[#FFFFFF] hover:text-[#1A1916]",
                  active && "bg-[#FFFFFF] font-semibold text-[#167B70]",
                )}
                href={item.href}
                key={item.href}
                prefetch={false}
              >
                <Icon className={cn("size-[17px] shrink-0", active && "text-[#2A9D8F]")} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
      </nav>

      <div className="space-y-2">
        <div
          className={cn(
            "flex items-center rounded-[14px] border border-[#E8E8E5] bg-white py-2.5",
            collapsed ? "justify-center px-1.5" : "gap-3 px-3",
          )}
        >
          <span className="grid size-9 place-items-center rounded-[10px] bg-[#FFFFFF] font-semibold text-[#2A9D8F] text-[13px]">
            {currentUser.name.charAt(0).toUpperCase()}
          </span>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate font-medium text-[#1A1916] text-[13px]">{currentUser.name}</div>
                <div className="text-[#6B6B6B] text-[11px]">{userRoleLabel}</div>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                className="grid size-8 place-items-center rounded-[10px] text-[#B42318] transition hover:bg-[#FFFFFF]"
                title="Changer d'utilisateur"
                aria-label="Déconnexion"
              >
                <LogOut className="size-4" />
              </button>
            </>
          )}
        </div>
        {/* Modes plein écran (comptoir/atelier) rangés dans le menu de l'atelier — discrets, hors du flux principal. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-center rounded-[14px] border border-[#E8E8E5] bg-white py-3 text-left transition-colors duration-200 hover:bg-[#FFFFFF]",
                collapsed ? "justify-center px-1.5" : "gap-3 px-3",
              )}
            >
              {workshopLogo ? (
                // biome-ignore lint/performance/noImgElement: logo atelier déjà fourni par l'utilisateur, pas une image LCP.
                <img
                  alt={`Logo ${workshopName}`}
                  className="size-9 rounded-[10px] border border-[#E8E8E5] bg-white object-cover"
                  src={workshopLogo}
                />
              ) : (
                <span className="grid size-9 place-items-center rounded-[10px] border border-[#E8E8E5] bg-[#FFFFFF] font-semibold text-[#1A1916] text-[11px] tracking-wide">
                  {workshopInitials || "AT"}
                </span>
              )}
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate font-medium text-[#1A1916] text-[13px]">{workshopName}</div>
                    <div className="text-[#8A8A8A] text-[11px]">Atelier principal</div>
                  </div>
                  <ChevronsUpDown className="size-4 text-[#A3A3A3]" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[206px]" side="top">
            <DropdownMenuItem asChild>
              <Link className="flex items-center gap-2.5" href="/comptoir" prefetch={false}>
                <Store className="size-4" />
                Mode comptoir
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link className="flex items-center gap-2.5" href="/atelier" prefetch={false}>
                <Wrench className="size-4" />
                Mode atelier
              </Link>
            </DropdownMenuItem>
            {canViewSettings && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link className="flex items-center gap-2.5" href="/dashboard/parametres" prefetch={false}>
                    <Settings className="size-4" />
                    Paramètres
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
