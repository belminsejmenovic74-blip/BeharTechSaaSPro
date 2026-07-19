"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Bell, ChevronDown, FileText, LogOut, Menu, Plus, Search, UserRound, X } from "lucide-react";

import { PrimaryButton } from "@/components/behar/primitives";
import { SyncStatusBadge } from "@/components/behar/sync-status-badge";
import { type AppNotification, useBeharStore } from "@/lib/behar-store";
import { WidgetNotificationCenter } from "@/components/behar/widget-notification-center";
import { formatDeviceLabel } from "@/lib/format-device";
import { getUserFirstName } from "@/lib/user-display";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  title: string;
  hint: string;
  href: string;
  tone: "info" | "warn" | "ok";
  read?: boolean;
  appNotificationId?: string;
};

const notificationHref = (notification: AppNotification) => {
  if (notification.targetType === "repair") return "/dashboard/reparations";
  if (notification.targetType === "quote") return "/dashboard/devis";
  if (notification.targetType === "invoice") return "/dashboard/factures";
  if (notification.targetType === "payment") return "/dashboard/paiements";
  if (notification.targetType === "appointment") return "/dashboard/rendez-vous";
  if (notification.targetType === "widget_lead") return "/dashboard/demandes-site";
  if (notification.targetType === "stock") return "/dashboard/stock";
  if (notification.targetType === "settings") return "/dashboard/parametres";
  return "/dashboard";
};

export function Topbar({ onMenuClick }: Readonly<{ onMenuClick?: () => void }>) {
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [docOpen, setDocOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const invoices = useBeharStore((s) => s.invoices);
  const repairs = useBeharStore((s) => s.repairs);
  const quotes = useBeharStore((s) => s.quotes);
  const appointments = useBeharStore((s) => s.appointments);
  const customers = useBeharStore((s) => s.customers);
  const appNotifications = useBeharStore((s) => s.notifications);
  const markNotificationRead = useBeharStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useBeharStore((s) => s.markAllNotificationsRead);
  const currentUser = useBeharStore((s) => s.currentUser);
  const logout = useBeharStore((s) => s.logout);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const roleLabel =
    currentUser.role === "admin" ? "Gérant" : currentUser.role === "technician" ? "Technicien" : "Accueil";
  const userFirstName = getUserFirstName(currentUser.name, currentUser.id);
  const canViewNotifications = currentUser.permissions?.canViewNotifications !== false;

  const notifications = useMemo<NotificationItem[]>(() => {
    const out: NotificationItem[] = [];

    for (const inv of invoices) {
      if (inv.status !== "Payée" && inv.status !== "Annulée") {
        const customer = customers.find((c) => c.id === inv.customerId);
        out.push({
          id: `inv-${inv.id}`,
          title: `Facture ${inv.number} non payée`,
          hint: customer?.name ?? "Client",
          href: "/dashboard/factures",
          tone: "warn",
        });
      }
    }
    for (const repair of repairs) {
      if (repair.status === "Prêt") {
        const customer = customers.find((c) => c.id === repair.customerId);
        out.push({
          id: `rep-${repair.id}`,
          title: `Réparation ${repair.number} prête`,
          hint: `${customer?.name ?? "Client"} · ${formatDeviceLabel(repair, "")}`.trim(),
          href: "/dashboard/reparations",
          tone: "ok",
        });
      }
    }
    for (const quote of quotes) {
      if (quote.status === "Accepté") {
        out.push({
          id: `quo-${quote.id}`,
          title: `Devis ${quote.number} accepté`,
          hint: "À facturer",
          href: "/dashboard/devis",
          tone: "info",
        });
      }
    }
    const today = new Date().toISOString().slice(0, 10);
    for (const apt of appointments) {
      if (apt.date === today) {
        out.push({
          id: `apt-${apt.id}`,
          title: `Rendez-vous aujourd'hui à ${apt.time}`,
          hint: apt.issue || apt.device,
          href: "/dashboard/rendez-vous",
          tone: "info",
        });
      }
    }
    const persisted = appNotifications
      .filter((notification) => !notification.category)
      .map(
        (notification): NotificationItem => ({
          id: notification.id,
          title: notification.title,
          hint: `${notification.message} · ${notification.actorName}`,
          href: notificationHref(notification),
          tone:
            notification.type === "warning" || notification.type === "danger"
              ? "warn"
              : notification.type === "success"
                ? "ok"
                : "info",
          read: notification.read,
          appNotificationId: notification.id,
        }),
      );
    return [...persisted, ...out].slice(0, 12);
  }, [invoices, repairs, quotes, appointments, customers, appNotifications]);

  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    const out: Array<{ id: string; title: string; subtitle: string; href: string; type: string }> = [];

    // Repairs
    for (const r of repairs) {
      if (
        r.number.toLowerCase().includes(q) ||
        r.device.toLowerCase().includes(q) ||
        r.issue.toLowerCase().includes(q)
      ) {
        out.push({
          id: r.id,
          title: `Réparation ${r.number}`,
          subtitle: `${r.device} — ${r.issue}`,
          href: `/dashboard/reparations?selectedId=${r.id}`,
          type: "repair",
        });
      }
    }

    // Customers
    for (const c of customers) {
      if (c.name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q)) {
        out.push({
          id: c.id,
          title: c.name,
          subtitle: "Fiche Client",
          href: `/dashboard/clients?id=${c.id}`,
          type: "customer",
        });
      }
    }

    // Invoices
    for (const i of invoices) {
      if (i.number.toLowerCase().includes(q)) {
        out.push({
          id: i.id,
          title: `Facture ${i.number}`,
          subtitle: "Document financier",
          href: `/dashboard/factures?id=${i.id}`,
          type: "invoice",
        });
      }
    }

    return out.slice(0, 8);
  }, [searchQuery, repairs, customers, invoices]);

  const unreadCount = appNotifications.filter((notification) => !notification.read).length;
  const hasUnread = unreadCount > 0 || notifications.some((notification) => !notification.read);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey;
      if (isMod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-[64px] items-center gap-3 border-[#E4E7EC] border-b bg-white px-4 md:px-6">
      <button
        type="button"
        aria-label="Menu"
        onClick={onMenuClick}
        className="grid size-10 place-items-center rounded-[10px] text-[#667085] transition-colors hover:bg-[#F5F7FA] hover:text-[#101828] md:hidden"
      >
        <Menu className="size-5" />
      </button>

      <label className="relative max-w-[440px] flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[16px] -translate-y-1/2 text-[#667085]" />
        <input
          ref={inputRef}
          type="search"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          placeholder="Rechercher (client, réparation, facture…)"
          className="h-10 w-full rounded-[10px] border border-[#E4E7EC] bg-white pr-14 pl-10 text-[#101828] text-sm outline-none placeholder:text-[#667085] focus:border-[#2A9D8F]/55 focus:ring-2 focus:ring-[#2A9D8F]/10"
        />
        <kbd className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-3 hidden h-6 items-center gap-0.5 rounded-md border border-[#E4E7EC] bg-[#F5F7FA] px-1.5 font-medium text-[#667085] text-[10px] sm:flex">
          ⌘ K
        </kbd>

        {searchOpen && searchQuery.length >= 2 && (
          <>
            <button className="fixed inset-0 z-10 cursor-default" onClick={() => setSearchOpen(false)} type="button" />
            <div className="absolute top-12 left-0 z-20 w-full overflow-hidden rounded-[12px] border border-[#E4E7EC] bg-white shadow-[0_10px_30px_rgba(16,24,40,0.08)]">
              {searchResults.length === 0 ? (
                <p className="px-4 py-6 text-center text-[#667085] text-sm">Aucun résultat pour "{searchQuery}"</p>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  {searchResults.map((res) => (
                    <Link
                      key={res.id}
                      href={res.href}
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery("");
                        if (res.type === "repair") useBeharStore.getState().setSelected("repair", res.id);
                        if (res.type === "customer") useBeharStore.getState().setSelected("customer", res.id);
                        if (res.type === "invoice") useBeharStore.getState().setSelected("invoice", res.id);
                      }}
                      className="flex items-center gap-3 border-[#E4E7EC] border-b px-4 py-3 transition-colors hover:bg-[#F5F7FA] last:border-0"
                    >
                      <div className="grid size-8 place-items-center rounded-[8px] bg-[#F2F4F7] text-[#667085]">
                        <Search className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block font-medium text-[#101828] text-sm">{res.title}</span>
                        <span className="block truncate text-[#667085] text-xs">{res.subtitle}</span>
                      </div>
                      <span className="rounded-md bg-[#F2F4F7] px-1.5 py-0.5 font-medium text-[#667085] text-[10px] uppercase">
                        {res.type}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </label>

      <div className="ml-auto flex items-center gap-3">
        <SyncStatusBadge />
        <div className="relative hidden lg:block">
          <button
            type="button"
            aria-label="Compte utilisateur"
            onClick={() => setUserMenuOpen((v) => !v)}
            className={cn(
              "flex h-9 items-center gap-2 rounded-[9px] bg-white px-1.5 text-[#101828] transition-colors hover:bg-[#F4FBF9]",
              userMenuOpen && "bg-[#F4FBF9]",
            )}
          >
            <span className="grid size-7 place-items-center rounded-[8px] border border-[#D8EEEA] bg-white font-semibold text-[#167B70] text-[11px]">
              {userFirstName.charAt(0).toUpperCase()}
            </span>
            <span className="hidden font-medium text-[12px] xl:block">{userFirstName}</span>
          </button>
          {userMenuOpen && (
            <>
              <button
                type="button"
                aria-label="Fermer"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute top-12 right-0 z-20 w-[240px] overflow-hidden rounded-[12px] border border-[#E4E7EC] bg-white p-1 shadow-[0_10px_30px_rgba(16,24,40,0.08)]">
                <div className="border-b border-[#E4E7EC] px-3 py-2.5">
                  <p className="font-semibold text-[#101828] text-sm leading-tight">{userFirstName}</p>
                  <p className="mt-0.5 text-[#667085] text-[11px]">{roleLabel}</p>
                </div>
                <Link
                  href="/dashboard/parametres"
                  prefetch={false}
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-[#101828] text-sm hover:bg-[#F5F7FA]"
                >
                  <UserRound className="size-4 text-[#667085]" /> Mon compte
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-[#B42318] text-sm hover:bg-[#FFF1F0]"
                >
                  <LogOut className="size-4" /> Changer d'utilisateur
                </button>
              </div>
            </>
          )}
        </div>
        {pathname !== "/dashboard" && !pathname.startsWith("/dashboard/reparations") && (
          <Link className="hidden lg:block" href="/dashboard/reparations?create=1" prefetch={false}>
            <PrimaryButton className="h-10 gap-2 px-4">
              <Plus className="size-4" />
              Nouvelle prise en charge
            </PrimaryButton>
          </Link>
        )}
        {canViewNotifications && (
          <div className="relative">
            <button
              aria-label="Notifications"
              className={cn(
                "relative grid size-10 place-items-center rounded-[10px] text-[#667085] transition-colors hover:bg-[#F5F7FA] hover:text-[#101828]",
                notifOpen && "bg-[#F2F4F7] text-[#101828]",
              )}
              onClick={() => setNotifOpen((v) => !v)}
              type="button"
            >
              <Bell className="size-[18px]" />
              {hasUnread && <span className="absolute top-2.5 right-2.5 size-1.5 rounded-full bg-[#2A9D8F]" />}
            </button>
            {notifOpen && (
              <>
                <button
                  aria-label="Fermer"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setNotifOpen(false)}
                  type="button"
                />
                <div className="absolute top-12 right-0 z-20 w-[340px] overflow-hidden rounded-[14px] border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.035)]">
                  <div className="flex items-center justify-between border-[#E4E7EC] border-b px-4 py-3">
                    <span className="font-semibold text-[#101828] text-sm">
                      Notifications{unreadCount ? ` · ${unreadCount}` : ""}
                    </span>
                    {unreadCount > 0 && (
                      <button
                        className="rounded-[8px] px-2 py-1 font-medium text-[#2A9D8F] text-xs hover:bg-[#FFFFFF]"
                        onClick={markAllNotificationsRead}
                        type="button"
                      >
                        Tout lu
                      </button>
                    )}
                    <button
                      aria-label="Fermer"
                      className="grid size-7 place-items-center rounded-[8px] text-[#667085] hover:bg-[#FFFFFF]"
                      onClick={() => setNotifOpen(false)}
                      type="button"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <WidgetNotificationCenter onNavigate={() => setNotifOpen(false)} />
                  <div className="max-h-[360px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-[#667085] text-sm">
                        Aucune notification pour le moment.
                      </p>
                    ) : (
                      notifications.map((notif) => (
                        <Link
                          className={cn(
                            "flex items-start gap-3 border-[#E4E7EC] border-b px-4 py-3 transition hover:bg-[#FFFFFF]",
                            notif.read === false && "bg-[#FFFFFF]",
                          )}
                          href={notif.href}
                          key={notif.id}
                          onClick={() => {
                            if (notif.appNotificationId) markNotificationRead(notif.appNotificationId);
                            setNotifOpen(false);
                          }}
                          prefetch={false}
                        >
                          <span
                            className={cn(
                              "mt-1.5 size-2 shrink-0 rounded-full",
                              notif.tone === "warn" && "bg-[#FFFFFF]",
                              notif.tone === "ok" && "bg-[#2A9D8F]",
                              notif.tone === "info" && "bg-[#667085]",
                            )}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-[#101828] text-sm">{notif.title}</span>
                            <span className="block truncate text-[#667085] text-xs">{notif.hint}</span>
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        <div className="relative">
          <button
            type="button"
            aria-label="Documents"
            onClick={() => setDocOpen((v) => !v)}
            className={cn(
              "flex h-10 items-center gap-1 rounded-[10px] px-2 text-[#667085] transition-colors hover:bg-[#F5F7FA] hover:text-[#101828]",
              docOpen && "bg-[#F2F4F7] text-[#101828]",
            )}
          >
            <FileText className="size-[18px]" />
            <ChevronDown className="size-3.5" />
          </button>
          {docOpen && (
            <>
              <button
                type="button"
                aria-label="Fermer"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setDocOpen(false)}
              />
              <div className="absolute top-12 right-0 z-20 w-[220px] rounded-[14px] border border-[#E4E7EC] bg-white p-1 shadow-[0_1px_2px_rgba(16,24,40,0.035)]">
                <Link
                  href="/dashboard/documents"
                  prefetch={false}
                  onClick={() => setDocOpen(false)}
                  className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-[#101828] text-sm hover:bg-[#FFFFFF]"
                >
                  <FileText className="size-4 text-[#667085]" /> Tous les documents
                </Link>
                <Link
                  href="/dashboard/devis"
                  prefetch={false}
                  onClick={() => setDocOpen(false)}
                  className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-[#101828] text-sm hover:bg-[#FFFFFF]"
                >
                  <FileText className="size-4 text-[#667085]" /> Devis
                </Link>
                <Link
                  href="/dashboard/factures"
                  prefetch={false}
                  onClick={() => setDocOpen(false)}
                  className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-[#101828] text-sm hover:bg-[#FFFFFF]"
                >
                  <FileText className="size-4 text-[#667085]" /> Factures
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function CloseButton({ onClick, className }: Readonly<{ onClick?: () => void; className?: string }>) {
  return (
    <button
      type="button"
      aria-label="Fermer"
      onClick={onClick}
      className={cn(
        "grid size-9 place-items-center rounded-[10px] text-[#667085] transition-colors hover:bg-[#F5F7FA] hover:text-[#101828]",
        className,
      )}
    >
      <X className="size-5" />
    </button>
  );
}
