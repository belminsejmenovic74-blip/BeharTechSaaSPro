"use client";

// Centre de notifications widget (intégré au panneau cloche du topbar).
// Catégorise les notifications issues du widget, filtre par boutique, propose des
// actions rapides et le marquage lu / tout lu. Se masque s'il n'y a rien.

import { useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { type AppNotification, useBeharStore } from "@/lib/behar-store";
import { cn } from "@/lib/utils";
import {
  categoryLabel,
  categoryQuickActions,
  categorySeverity,
  filterNotifications,
  notificationShops,
  unreadCount,
  type QuickActionKey,
} from "@/lib/widget/notifications";

const ROUTE = {
  widget_lead: "/dashboard/demandes-site",
  appointment: "/dashboard/rendez-vous",
  repair: "/dashboard/reparations",
} as const;

const ACTION_LABEL: Record<QuickActionKey, string> = {
  open_request: "Voir la demande",
  open_appointment: "Voir le rendez-vous",
  open_repair: "Ouvrir le dossier",
  confirm: "Confirmer",
  call: "Appeler",
};

const SEVERITY_DOT: Record<string, string> = {
  info: "bg-[#667085]",
  success: "bg-[#2A9D8F]",
  warning: "bg-[#C89B3C]",
  danger: "bg-[#B4232A]",
};

export function WidgetNotificationCenter({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const notifications = useBeharStore((state) => state.notifications);
  const markRead = useBeharStore((state) => state.markNotificationRead);
  const markAllRead = useBeharStore((state) => state.markAllNotificationsRead);
  const updateAppointment = useBeharStore((state) => state.updateAppointment);
  const [shop, setShop] = useState<string | undefined>(undefined);

  const widgetNotifs = useMemo(() => notifications.filter((entry) => entry.category), [notifications]);
  const shops = useMemo(() => notificationShops(widgetNotifs), [widgetNotifs]);
  const visible = useMemo(() => filterNotifications(widgetNotifs, { shopId: shop }), [widgetNotifs, shop]);
  const unread = unreadCount(widgetNotifs, { shopId: shop });

  if (widgetNotifs.length === 0) return null;

  const runAction = (notification: AppNotification, action: QuickActionKey) => {
    if (action === "confirm" && notification.targetType === "appointment") {
      updateAppointment(notification.targetId, { status: "Confirmé", confirmed: true });
    } else {
      const route =
        action === "open_appointment" ? ROUTE.appointment : action === "open_repair" ? ROUTE.repair : ROUTE.widget_lead;
      router.push(route);
      onNavigate?.();
    }
    markRead(notification.id);
  };

  return (
    <div className="border-[#E4E7EC] border-b bg-[#FCFCFD]">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5">
        <span className="font-semibold text-[#101828] text-xs uppercase tracking-wide">
          Widget · {unread} non lue{unread > 1 ? "s" : ""}
        </span>
        {unread > 0 ? (
          <button type="button" onClick={markAllRead} className="font-medium text-[#2A9D8F] text-xs hover:underline">
            Tout marquer comme lu
          </button>
        ) : null}
      </div>

      {shops.length > 1 ? (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          <FilterChip active={!shop} onClick={() => setShop(undefined)}>
            Toutes boutiques
          </FilterChip>
          {shops.map((entry) => (
            <FilterChip key={entry} active={shop === entry} onClick={() => setShop(entry)}>
              {entry}
            </FilterChip>
          ))}
        </div>
      ) : null}

      <div className="max-h-[280px] overflow-y-auto">
        {visible.length === 0 ? (
          <p className="px-4 py-6 text-center text-[#667085] text-xs">Aucune notification pour cette boutique.</p>
        ) : (
          visible.map((notification) => (
            <div
              key={notification.id}
              className={cn("border-[#E4E7EC] border-b px-4 py-2.5", !notification.read && "bg-white")}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    SEVERITY_DOT[categorySeverity(notification.category!)],
                  )}
                />
                <span className="rounded-full bg-[#F1F0EC] px-2 py-0.5 font-medium text-[#667085] text-[11px]">
                  {categoryLabel(notification.category!)}
                </span>
              </div>
              <p className="mt-1 font-medium text-[#101828] text-sm">{notification.title}</p>
              <p className="truncate text-[#667085] text-xs">{notification.message}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {categoryQuickActions(notification.category!).map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => runAction(notification, action)}
                    className={
                      action === "confirm"
                        ? "rounded-[8px] bg-[#2A9D8F] px-2.5 py-1 font-semibold text-white text-[11px] hover:brightness-95"
                        : "rounded-[8px] border border-[#E4E7EC] bg-white px-2.5 py-1 font-medium text-[#101828] text-[11px] hover:border-[#2A9D8F]"
                    }
                  >
                    {ACTION_LABEL[action]}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "max-w-[140px] truncate rounded-full border px-2.5 py-0.5 font-medium text-[11px] transition",
        active ? "border-[#2A9D8F] bg-[#ECF8F4] text-[#167B70]" : "border-[#E4E7EC] bg-white text-[#667085]",
      )}
    >
      {children}
    </button>
  );
}
