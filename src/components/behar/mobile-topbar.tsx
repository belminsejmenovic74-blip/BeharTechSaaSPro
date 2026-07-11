"use client";

import { useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  CalendarDays,
  Files,
  FileText,
  LayoutDashboard,
  Inbox,
  LogOut,
  Menu,
  Package,
  Receipt,
  Settings,
  Users,
  Wrench,
  X,
} from "lucide-react";

import { BeharLogo } from "@/components/behar/behar-logo";
import { useBeharStore } from "@/lib/behar-store";
import { cn } from "@/lib/utils";

const allModules = [
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { label: "Réparations", href: "/dashboard/reparations", icon: Wrench },
  { label: "Dossiers", href: "/dashboard/dossiers", icon: Files },
  { label: "Clients", href: "/dashboard/clients", icon: Users },
  { label: "Demandes du site", href: "/dashboard/demandes-site", icon: Inbox },
  { label: "Devis", href: "/dashboard/devis", icon: FileText },
  { label: "Factures", href: "/dashboard/factures", icon: Receipt },
  { label: "Rendez-vous", href: "/dashboard/rendez-vous", icon: CalendarDays },
  { label: "Stock", href: "/dashboard/stock", icon: Package },
  { label: "Documents", href: "/dashboard/documents", icon: Files },
  { label: "Paramètres", href: "/dashboard/parametres", icon: Settings },
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
      <header className="sticky top-0 z-40 flex h-[60px] items-center justify-between border-[#E8E8E5] border-b bg-white px-5 md:hidden">
        <Link
          href="/dashboard"
          className="flex items-center transition active:scale-95"
          prefetch={false}
          aria-label="Accueil Behar Tech"
        >
          <BeharLogo size="sm" />
        </Link>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="relative grid size-10 place-items-center rounded-[12px] border border-[#E8E8E5] bg-white text-[#1A1916] transition active:scale-90"
        >
          <Menu className="size-[18px]" />
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
            className="absolute inset-0 bg-[#1A1916]/30 animate-in fade-in duration-200"
          />
          <aside className="absolute inset-0 flex flex-col bg-white animate-in fade-in slide-in-from-right-2 duration-200">
            <div className="flex items-center justify-between px-5 pr-10 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
              <BeharLogo size="sm" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-[#FFFFFF] text-[#1A1916] transition active:scale-90"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-2 ml-5 mr-8 flex items-center justify-between gap-3 rounded-[16px] bg-[#FFFFFF] px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-[#FFFFFF] font-semibold text-[#2A9D8F]">
                  {currentUser.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#1A1916] text-[14px] leading-tight">{currentUser.name}</p>
                  <p className="mt-0.5 text-[#6B6B6B] text-[11.5px]">{roleLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                aria-label="Déconnexion"
                className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-white px-3 font-semibold text-[#B42318] text-[12px] transition active:scale-95"
              >
                <LogOut className="size-3.5" /> Quitter
              </button>
            </div>

            <nav className="mt-4 flex-1 overflow-y-auto px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {allModules.map((item) => {
                const Icon = item.icon;
                const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "group flex items-center gap-3.5 rounded-[14px] px-3 py-3 transition active:scale-[0.98] active:bg-[#FFFFFF]",
                      active && "bg-[#FFFFFF]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-[10px] text-[#2A9D8F]",
                        active ? "bg-[#2A9D8F] text-white" : "bg-[#FFFFFF]",
                      )}
                    >
                      <Icon className="size-[18px]" />
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
