"use client";

import { useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  CalendarDays,
  CreditCard,
  FileText,
  Folder,
  Home,
  LogOut,
  MoreHorizontal,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Users,
  Wrench,
  X,
} from "lucide-react";

import { useBeharStore } from "@/lib/behar-store";
import { cn } from "@/lib/utils";

const mobileItems = [
  { label: "Accueil", href: "/dashboard", icon: Home },
  { label: "Réparations", href: "/dashboard/reparations", icon: Wrench },
  { label: "Clients", href: "/dashboard/clients", icon: Users },
  { label: "Paiements", href: "/dashboard/paiements", icon: CreditCard },
] as const;

const moreItems = [
  { label: "Ventes", href: "/dashboard/ventes", icon: ShoppingCart },
  { label: "Devis", href: "/dashboard/devis", icon: FileText },
  { label: "Factures", href: "/dashboard/factures", icon: Receipt },
  { label: "Rendez-vous", href: "/dashboard/rendez-vous", icon: CalendarDays },
  { label: "Stock", href: "/dashboard/stock", icon: Package },
  { label: "Documents", href: "/dashboard/documents", icon: Folder },
  { label: "Paramètres", href: "/dashboard/parametres", icon: Settings },
  { label: "Catalogue prix", href: "/dashboard/parametres/catalogue", icon: FileText },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const currentUser = useBeharStore((s) => s.currentUser);
  const logout = useBeharStore((s) => s.logout);

  const moreActive = moreItems.some((m) => pathname.startsWith(m.href));
  const roleLabel =
    currentUser.role === "admin" ? "Gérant" : currentUser.role === "technician" ? "Technicien" : "Accueil";

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.06] bg-white/80 px-1.5 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/65 md:hidden">
        <div className="grid grid-cols-5">
          {mobileItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                className={cn(
                  "group relative flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 font-medium text-[#8A8984] text-[10.5px] tracking-tight transition-colors",
                  active && "text-[#2A9D8F]",
                )}
                href={item.href}
                key={item.href}
                prefetch={false}
              >
                <span className={cn("relative flex size-7 items-center justify-center transition-transform group-active:scale-90")}>
                  <Icon className={cn("size-[22px]", active ? "stroke-[2.2]" : "stroke-[1.7]")} strokeWidth={active ? 2.2 : 1.7} />
                </span>
                <span className="max-w-full truncate">{item.label}</span>
                {active && (
                  <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-[#2A9D8F]" aria-hidden />
                )}
              </Link>
            );
          })}
          <button
            className={cn(
              "group relative flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 font-medium text-[#8A8984] text-[10.5px] tracking-tight transition-colors",
              (open || moreActive) && "text-[#2A9D8F]",
            )}
            onClick={() => setOpen(true)}
            type="button"
            aria-label="Plus de modules"
          >
            <span className="relative flex size-7 items-center justify-center transition-transform group-active:scale-90">
              <MoreHorizontal className="size-[22px]" strokeWidth={open || moreActive ? 2.2 : 1.7} />
            </span>
            <span className="max-w-full truncate">Plus</span>
            {(open || moreActive) && (
              <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-[#2A9D8F]" aria-hidden />
            )}
          </button>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true">
          <button
            className="absolute inset-0 bg-[#1A1916]/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setOpen(false)}
            type="button"
            aria-label="Fermer"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-hidden rounded-t-[28px] bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_rgba(26,25,22,0.18)] animate-in slide-in-from-bottom duration-300">
            {/* Handle bar iOS */}
            <div className="flex justify-center pt-2 pb-1">
              <span className="h-1 w-9 rounded-full bg-[#D1CFCA]" aria-hidden />
            </div>
            <div className="flex items-end justify-between gap-3 px-6 pt-3 pb-4">
              <div>
                <p className="font-semibold text-[#1A1916] text-[22px] leading-tight tracking-tight">Modules</p>
                <p className="mt-1 text-[#8A8984] text-[13px]">Accédez à toutes les sections.</p>
              </div>
              <button
                className="grid size-9 place-items-center rounded-full bg-[#F1F1EF] text-[#6B6B6B] transition active:scale-90"
                onClick={() => setOpen(false)}
                type="button"
                aria-label="Fermer"
              >
                <X className="size-4" strokeWidth={2.2} />
              </button>
            </div>
            {/* Bloc utilisateur connecté + Déconnexion */}
            <div className="mx-4 mb-4 mt-1 flex items-center justify-between gap-3 rounded-[16px] bg-[#FAFAF8] px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#EAF6F2] font-semibold text-[#2A9D8F]">
                  {currentUser.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#1A1916] text-[14px] leading-tight">{currentUser.name}</p>
                  <p className="mt-0.5 text-[#8A8984] text-[11.5px]">{roleLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3 font-semibold text-[#B42318] text-[12.5px] transition active:scale-95"
                aria-label="Déconnexion"
              >
                <LogOut className="size-3.5" /> Déconnexion
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 px-4 pb-6">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-[18px] bg-[#FAFAF8] px-4 py-3.5 text-left transition active:scale-[0.98] active:bg-[#F1F1EF]",
                      active && "bg-[#EAF6F2]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-11 shrink-0 place-items-center rounded-[14px] bg-white text-[#2A9D8F] shadow-[0_1px_3px_rgba(26,25,22,0.05)]",
                        active && "bg-[#2A9D8F] text-white shadow-[0_4px_12px_rgba(42,157,143,0.25)]",
                      )}
                    >
                      <Icon className="size-5" strokeWidth={2} />
                    </span>
                    <span className="font-semibold text-[#1A1916] text-[14px] leading-tight tracking-tight">{item.label}</span>
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
