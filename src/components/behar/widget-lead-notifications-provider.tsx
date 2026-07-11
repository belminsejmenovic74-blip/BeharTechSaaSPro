"use client";

import { useEffect, useRef } from "react";

import { useBeharStore } from "@/lib/behar-store";
import { widgetLeadDashboardRequest } from "@/lib/widget/dashboard-leads";
import { categoryFromServerNotification, categoryLabel, categorySeverity } from "@/lib/widget/notifications";

type RemoteNotification = {
  id: string;
  lead_id: string;
  notification_type?: string | null;
  lead_type?: string | null;
  has_photos?: boolean;
  title: string;
  message: string;
  created_at: string;
};

export function WidgetLeadNotificationsProvider() {
  const seen = useRef(new Set<string>());

  useEffect(() => {
    let disposed = false;
    const poll = async () => {
      const state = useBeharStore.getState();
      const workshopId = state.cloudSync?.workshopId;
      const licenseKey = state.licenseKey;
      if (!(workshopId && licenseKey)) return;
      try {
        const result = await widgetLeadDashboardRequest<{ notifications: RemoteNotification[] }>({
          operation: "notifications",
          workshopId,
          licenseKey,
        });
        if (disposed || result.notifications.length === 0) return;
        for (const notification of result.notifications) {
          if (seen.current.has(notification.id)) continue;
          seen.current.add(notification.id);
          const category = categoryFromServerNotification(notification.notification_type, notification.lead_type);
          useBeharStore.getState().addNotification({
            type: categorySeverity(category),
            title: notification.title || categoryLabel(category),
            message: notification.message,
            targetType: "widget_lead",
            targetId: notification.lead_id,
            category,
          });
          if (notification.has_photos) {
            useBeharStore.getState().addNotification({
              type: "info",
              title: "Photo reçue",
              message: notification.message,
              targetType: "widget_lead",
              targetId: notification.lead_id,
              category: "photo_received",
            });
          }
        }
        await widgetLeadDashboardRequest({ operation: "mark_notifications_read", workshopId, licenseKey });
      } catch {
        // Notification best-effort : le polling suivant retentera sans gêner le dashboard.
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 20_000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
