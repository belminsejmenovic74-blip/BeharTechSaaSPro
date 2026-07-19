"use client";

import { type MouseEvent as ReactMouseEvent, type ReactNode, useEffect, useRef, useState } from "react";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import {
  CreditCard,
  FileText,
  Home,
  LayoutTemplate,
  LogOut,
  Mail,
  Menu,
  MessageSquareText,
  Store,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import { BeharLogo } from "@/components/behar/behar-logo";
import { useBeharStore } from "@/lib/behar-store";
import { cn } from "@/lib/utils";

// Navigation canonique de l'espace client public. Les réglages sensibles
// continuent d'être servis par les routes server-only du SaaS.
const NAV = [
  { label: "Accueil", href: "/client", section: "", icon: Home },
  { label: "Mon offre", href: "/client?section=offre", section: "offre", icon: CreditCard },
  { label: "SMS", href: "/client?section=sms", section: "sms", icon: MessageSquareText, badge: "1er août" },
  { label: "E-mails", href: "/client?section=emails", section: "emails", icon: Mail, badge: "1er août" },
  { label: "Documents", href: "/client?section=documents", section: "documents", icon: FileText },
  { label: "Widgets", href: "/client?section=widgets", section: "widgets", icon: LayoutTemplate },
  { label: "Intégrations", href: "/client?section=paiements", section: "paiements", icon: WalletCards },
  { label: "Équipe", href: "/client?section=equipe", section: "equipe", icon: Users },
  { label: "Boutiques", href: "/client?section=boutiques", section: "boutiques", icon: Store },
] as const;

function useNavActive() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = searchParams.get("section") || "";
  return (targetSection: string) => pathname.startsWith("/client") && section === targetSection;
}

export function AccueilShell({ children }: Readonly<{ children: ReactNode }>) {
  const [open, setOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const isActive = useNavActive();
  const currentUser = useBeharStore((s) => s.currentUser);
  const logout = useBeharStore((s) => s.logout);
  const workshopName = useBeharStore((s) => s.workshopSettings.name || s.workshopInfo.name);

  const handleLogout = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    logout();
    window.location.assign("/api/auth/logout?returnTo=/");
  };

  useEffect(() => {
    if (!userOpen) return;
    const close = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) setUserOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [userOpen]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="min-h-svh bg-white text-[#101828]">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[292px] flex-col border-[#E9E9E6] border-r bg-white px-3 py-7 md:flex">
        <div className="px-1">
          <Link href="/client" prefetch={false}>
            <BeharLogo size="sm" />
          </Link>
        </div>
        <nav className="mt-7 flex flex-1 flex-col gap-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.section);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={cn(
                  "flex h-[42px] items-center gap-3 rounded-[12px] px-3 font-medium text-[13.5px] text-[#667085] transition hover:bg-[#F1F2F4] hover:text-[#101828]",
                  active && "bg-[#EAF6F4] font-semibold text-[#167B70]",
                )}
              >
                <Icon className={cn("size-[17px] shrink-0", active && "text-[#2A9D8F]")} />
                <span className="min-w-0 flex-1">{item.label}</span>
                {"badge" in item ? (
                  <span className="rounded-full bg-[#F1F2F4] px-2 py-0.5 text-[9.5px] font-semibold text-[#73736F]">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Topbar mobile */}
      <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-[#E4E7EC] border-b bg-white px-5 md:hidden">
        <Link href="/client" prefetch={false}>
          <BeharLogo size="sm" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Menu"
          className="grid size-11 place-items-center rounded-[10px] text-[#667085] outline-none transition hover:bg-[#F1F2F4] focus-visible:ring-3 focus-visible:ring-[#2A9D8F]/25"
        >
          <Menu className="size-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Fermer"
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute inset-y-0 left-0 flex w-[min(280px,calc(100vw-24px))] flex-col bg-white px-3 py-5 shadow-xl"
            role="dialog"
            aria-label="Navigation principale"
            aria-modal="true"
          >
            <div className="flex items-center justify-between px-1">
              <BeharLogo size="sm" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="grid size-11 place-items-center rounded-[10px] text-[#667085] outline-none hover:bg-[#F1F2F4] focus-visible:ring-3 focus-visible:ring-[#2A9D8F]/25"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="mt-6 flex flex-col gap-0.5">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.section);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex h-12 items-center gap-3 rounded-[12px] px-3 font-medium text-[15px] text-[#667085] transition hover:bg-[#F1F2F4] hover:text-[#101828]",
                      active && "bg-[#EAF6F4] font-semibold text-[#167B70]",
                    )}
                  >
                    <Icon className={cn("size-5 shrink-0", active && "text-[#2A9D8F]")} />
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {"badge" in item ? (
                      <span className="rounded-full bg-[#F1F2F4] px-2 py-0.5 text-[10px] font-semibold text-[#73736F]">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
            <a
              href="/api/auth/logout?returnTo=/"
              onClick={handleLogout}
              className="mt-auto flex h-12 items-center gap-3 rounded-[12px] px-3 font-medium text-[#B42318] text-[15px] transition hover:bg-[#FDF3F1]"
            >
              <LogOut className="size-5" />
              Se déconnecter
            </a>
          </div>
        </div>
      )}

      <div className="min-w-0 md:pl-[292px]">
        <header className="sticky top-0 z-20 hidden h-[72px] items-center justify-end border-[#E9E9E6] border-b bg-white/95 px-10 backdrop-blur md:flex">
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={userOpen}
              onClick={() => setUserOpen((value) => !value)}
              className="flex items-center gap-3 rounded-[12px] px-2.5 py-2 text-left transition hover:bg-[#F1F2F4]"
            >
              <span className="grid size-9 place-items-center rounded-full bg-[#EAF6F4] font-semibold text-[#167B70] text-[13px]">
                {currentUser.name.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-44">
                <span className="block truncate font-medium text-[#101828] text-[13px]">{currentUser.name}</span>
                <span className="block truncate text-[#667085] text-[11px]">{workshopName || "Mon atelier"}</span>
              </span>
            </button>
            {userOpen && (
              <div
                className="absolute right-0 mt-2 w-52 rounded-[14px] border border-[#E4E7EC] bg-white p-1.5 shadow-[0_16px_40px_rgba(16,24,40,0.12)]"
                role="menu"
              >
                <Link
                  href="/client?section=offre"
                  className="flex h-10 items-center rounded-[10px] px-3 text-[#101828] text-sm hover:bg-[#F1F2F4]"
                  role="menuitem"
                >
                  Profil et configuration
                </Link>
                <a
                  href="/api/auth/logout?returnTo=/"
                  onClick={handleLogout}
                  className="flex h-10 items-center gap-2 rounded-[10px] px-3 text-[#B42318] text-sm hover:bg-[#FDF3F1]"
                  role="menuitem"
                >
                  <LogOut className="size-4" /> Se déconnecter
                </a>
              </div>
            )}
          </div>
        </header>
        <main className="min-h-svh min-w-0 overflow-x-clip">{children}</main>
      </div>
    </div>
  );
}
