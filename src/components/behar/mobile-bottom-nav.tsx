"use client";

import { useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  CalendarDays,
  Files,
  FileText,
  LayoutDashboard,
  Landmark,
  LogOut,
  MoreHorizontal,
  Package,
  Receipt,
  RefreshCw,
  Settings,
  ShoppingCart,
  Store,
  Users,
  Wrench,
  X,
} from "lucide-react";

import { useBeharStore } from "@/lib/behar-store";
import { useCapabilities } from "@/lib/use-capabilities";
import { cn } from "@/lib/utils";

// Sur mobile, on n'expose PAS les modes tablette « Atelier » et « Mode comptoir »
// (pensés pour tablette/PC) : accès aux modules du dashboard uniquement.
const mobileItems = [
  { label: "Accueil", href: "/dashboard", icon: LayoutDashboard },
  { label: "Réparations", href: "/dashboard/reparations", icon: Wrench },
  { label: "Clients", href: "/dashboard/clients", icon: Users },
  { label: "Devis", href: "/dashboard/devis", icon: FileText },
] as const;

const moreItems = [
  { label: "Factures", href: "/dashboard/factures", icon: Receipt },
  { label: "Rendez-vous", href: "/dashboard/rendez-vous", icon: CalendarDays },
  { label: "Stock", href: "/dashboard/stock", icon: Package },
  { label: "Achats", href: "/dashboard/achats", icon: ShoppingCart },
  { label: "Recond.", href: "/dashboard/reconditionnement", icon: RefreshCw },
  { label: "Documents", href: "/dashboard/documents", icon: Files },
  { label: "Paramètres", href: "/dashboard/parametres", icon: Settings },
  { label: "Catalogue prix", href: "/dashboard/parametres/catalogue", icon: FileText },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const currentUser = useBeharStore((s) => s.currentUser);
  const canViewPurchases = useBeharStore((s) => s.hasPermission("canViewPurchasePrice"));
  const logout = useBeharStore((s) => s.logout);
  const capabilities = useCapabilities();
  const visibleMobileItems = mobileItems.filter((item) => item.href !== "/dashboard/devis" || capabilities.canQuote);
  const visibleMoreItems = moreItems.filter(
    (item) =>
      (item.href !== "/dashboard/achats" || canViewPurchases) &&
      (!["/dashboard/factures", "/dashboard/achats"].includes(item.href) || capabilities.canInvoice),
  );

  const moreActive = moreItems.some((m) => pathname.startsWith(m.href));
  const roleLabel =
    currentUser.role === "admin" ? "Gérant" : currentUser.role === "technician" ? "Technicien" : "Accueil";

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E4E7EC] bg-white px-1.5 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
        <div className={cn("grid", capabilities.canQuote ? "grid-cols-5" : "grid-cols-4")}>
          {visibleMobileItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                className={cn(
                  "group relative flex min-h-12 min-w-0 flex-col items-center gap-1 rounded-[10px] px-1 py-1.5 font-medium text-[#667085] text-[10.5px] tracking-tight transition-colors",
                  active && "text-[#2A9D8F]",
                )}
                href={item.href}
                key={item.href}
                prefetch={false}
              >
                <span
                  className={cn(
                    "relative flex size-7 items-center justify-center transition-transform group-active:scale-90",
                  )}
                >
                  <Icon className="size-[19px]" />
                </span>
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
          <button
            className={cn(
              "group relative flex min-h-12 min-w-0 flex-col items-center gap-1 rounded-[10px] px-1 py-1.5 font-medium text-[#667085] text-[10.5px] tracking-tight transition-colors",
              (open || moreActive) && "text-[#2A9D8F]",
            )}
            onClick={() => setOpen(true)}
            type="button"
            aria-label="Plus de modules"
          >
            <span className="relative flex size-7 items-center justify-center transition-transform group-active:scale-90">
              <MoreHorizontal className="size-[19px]" />
            </span>
            <span className="max-w-full truncate">Plus</span>
          </button>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true">
          <button
            className="absolute inset-0 bg-[#101828]/30 animate-in fade-in duration-200"
            onClick={() => setOpen(false)}
            type="button"
            aria-label="Fermer"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-hidden rounded-t-[14px] border border-[#E4E7EC] bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_28px_rgba(16,24,40,0.08)] animate-in slide-in-from-bottom duration-250">
            <div className="flex items-end justify-between gap-3 px-6 pt-5 pb-4">
              <div>
                <p className="font-semibold text-[#101828] text-[22px] leading-tight tracking-tight">Modules</p>
              </div>
              <button
                className="grid size-9 place-items-center rounded-[9px] bg-[#F2F4F7] text-[#667085] transition-colors active:bg-[#E4E7EC]"
                onClick={() => setOpen(false)}
                type="button"
                aria-label="Fermer"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mx-4 mb-4 mt-1 flex items-center justify-between gap-3 rounded-[12px] border border-[#E4E7EC] bg-[#F9FAFB] px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-[#EAF6F3] font-semibold text-[#167B70]">
                  {currentUser.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#101828] text-[14px] leading-tight">{currentUser.name}</p>
                  <p className="mt-0.5 text-[#667085] text-[11.5px]">{roleLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-white px-3 font-semibold text-[#B42318] text-[12.5px] transition active:scale-95"
                aria-label="Déconnexion"
              >
                <LogOut className="size-3.5" /> Déconnexion
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 px-4 pb-6">
              {visibleMoreItems.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex min-h-14 items-center gap-3 rounded-[12px] border border-[#E4E7EC] bg-white px-4 py-3 text-left transition-colors active:bg-[#F5F7FA]",
                      active && "border-[#CDE9E3] bg-[#EAF6F3]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-[10px] bg-[#F2F4F7] text-[#2A9D8F]",
                        active && "bg-[#2A9D8F] text-white",
                      )}
                    >
                      <Icon className="size-[18px]" />
                    </span>
                    <span className="font-semibold text-[#101828] text-[14px] leading-tight tracking-tight">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
