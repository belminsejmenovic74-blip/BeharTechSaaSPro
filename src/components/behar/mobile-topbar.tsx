"use client";

import { useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Bell,
  CalendarDays,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Folder,
  Home,
  LogOut,
  Menu,
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

const allModules = [
  { label: "Tableau de bord", href: "/dashboard", icon: Home },
  { label: "Réparations", href: "/dashboard/reparations", icon: Wrench },
  { label: "Clients", href: "/dashboard/clients", icon: Users },
  { label: "Ventes", href: "/dashboard/ventes", icon: ShoppingCart },
  { label: "Devis", href: "/dashboard/devis", icon: FileText },
  { label: "Factures", href: "/dashboard/factures", icon: Receipt },
  { label: "Paiements", href: "/dashboard/paiements", icon: CreditCard },
  { label: "Rendez-vous", href: "/dashboard/rendez-vous", icon: CalendarDays },
  { label: "Stock", href: "/dashboard/stock", icon: Package },
  { label: "Documents", href: "/dashboard/documents", icon: Folder },
  { label: "Paramètres", href: "/dashboard/parametres", icon: Settings },
  { label: "Catalogue prix", href: "/dashboard/parametres/catalogue", icon: FileSpreadsheet },
] as const;

/**
 * Topbar mobile premium. Logo Behar Tech à gauche, hamburger à droite.
 * Le menu hamburger ouvre un sheet plein écran avec tous les modules.
 */
export function MobileTopbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const currentUser = useBeharStore((s) => s.currentUser);
  const logout = useBeharStore((s) => s.logout);
  const unreadCount = useBeharStore((s) => s.notifications.filter((n) => !n.read).length);

  const roleLabel =
    currentUser.role === "admin" ? "Gérant" : currentUser.role === "technician" ? "Technicien" : "Accueil";

  return (
    <>
      <header className="sticky top-0 z-40 flex h-[60px] items-center justify-between bg-[#FAFAF8]/85 px-5 backdrop-blur-xl md:hidden">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 transition active:scale-95"
          prefetch={false}
          aria-label="Accueil Behar Tech"
        >
          <span className="font-bold text-[#1A1916] text-[13px] tracking-[0.18em]">BEHAR</span>
          <span className="size-[5px] rounded-full bg-[#2A9D8F]" aria-hidden />
          <span className="font-bold text-[#1A1916] text-[13px] tracking-[0.18em]">TECH</span>
        </Link>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="relative grid size-10 place-items-center rounded-full bg-white text-[#1A1916] shadow-[0_1px_3px_rgba(26,25,22,0.06)] transition active:scale-90"
        >
          <Menu className="size-[18px]" strokeWidth={2.2} />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 size-1.5 rounded-full bg-[#2A9D8F]" aria-hidden />
          )}
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fermer"
            className="absolute inset-0 bg-[#1A1916]/40 backdrop-blur-sm animate-in fade-in duration-200"
          />
          <aside className="absolute inset-y-0 right-0 flex w-[86%] max-w-[360px] flex-col bg-white shadow-[-10px_0_40px_rgba(26,25,22,0.18)] animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#1A1916] text-[13px] tracking-[0.18em]">BEHAR</span>
                <span className="size-[5px] rounded-full bg-[#2A9D8F]" aria-hidden />
                <span className="font-bold text-[#1A1916] text-[13px] tracking-[0.18em]">TECH</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="grid size-9 place-items-center rounded-full bg-[#F1F1EF] text-[#1A1916] transition active:scale-90"
              >
                <X className="size-4" strokeWidth={2.2} />
              </button>
            </div>

            <div className="mx-5 mt-2 flex items-center justify-between gap-3 rounded-[16px] bg-[#FAFAF8] px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#EAF6F2] font-semibold text-[#2A9D8F]">
                  {currentUser.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#1A1916] text-[14px] leading-tight">
                    {currentUser.name}
                  </p>
                  <p className="mt-0.5 text-[#8A8984] text-[11.5px]">{roleLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                aria-label="Déconnexion"
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3 font-semibold text-[#B42318] text-[12px] transition active:scale-95"
              >
                <LogOut className="size-3.5" /> Quitter
              </button>
            </div>

            <nav className="mt-4 flex-1 overflow-y-auto px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {allModules.map((item) => {
                const Icon = item.icon;
                const active = item.href === "/dashboard"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "group flex items-center gap-3.5 rounded-[14px] px-3 py-3 transition active:scale-[0.98] active:bg-[#F1F1EF]",
                      active && "bg-[#EAF6F2]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-[10px] text-[#2A9D8F]",
                        active ? "bg-[#2A9D8F] text-white" : "bg-[#FAFAF8]",
                      )}
                    >
                      <Icon className="size-[18px]" strokeWidth={2} />
                    </span>
                    <span
                      className={cn(
                        "font-medium text-[#1A1916] text-[14.5px] tracking-tight",
                        active && "font-semibold text-[#2A9D8F]",
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
