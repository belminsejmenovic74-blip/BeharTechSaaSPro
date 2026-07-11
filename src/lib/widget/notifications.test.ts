import { describe, expect, it } from "vitest";

import {
  categoryFromLeadType,
  categoryFromServerNotification,
  categoryLabel,
  categoryQuickActions,
  categorySeverity,
  filterNotifications,
  NOTIFICATION_CATEGORIES,
  notificationShops,
  unreadCount,
  type NotificationCategory,
} from "@/lib/widget/notifications";

describe("catégorisation des notifications widget", () => {
  it("mappe le type de demande vers une catégorie", () => {
    expect(categoryFromLeadType("callback")).toBe("callback");
    expect(categoryFromLeadType("quote")).toBe("quote");
    expect(categoryFromLeadType("price_request")).toBe("price_request");
    expect(categoryFromLeadType("appointment")).toBe("new_appointment");
    expect(categoryFromLeadType("request")).toBe("new_request");
    expect(categoryFromLeadType(null)).toBe("new_request");
  });

  it("mappe une notification serveur, en retombant sur le type de demande", () => {
    expect(categoryFromServerNotification("widget_photo_received")).toBe("photo_received");
    expect(categoryFromServerNotification("widget_lead_created", "quote")).toBe("quote");
    expect(categoryFromServerNotification(null, "callback")).toBe("callback");
    expect(categoryFromServerNotification(null, null)).toBe("new_request");
  });

  it("couvre les onze catégories avec libellé, sévérité et actions", () => {
    expect(NOTIFICATION_CATEGORIES).toHaveLength(11);
    for (const category of NOTIFICATION_CATEGORIES) {
      expect(categoryLabel(category)).toBeTruthy();
      expect(["info", "success", "warning", "danger"]).toContain(categorySeverity(category));
      expect(categoryQuickActions(category).length).toBeGreaterThan(0);
    }
    expect(categoryLabel("price_request")).toBe("Demande de prix sans tarif");
    expect(categorySeverity("appointment_cancelled")).toBe("danger");
  });
});

type N = { id: string; read?: boolean; shopId?: string; category?: NotificationCategory };

const sample: N[] = [
  { id: "1", read: false, shopId: "shop_a", category: "new_appointment" },
  { id: "2", read: false, shopId: "shop_b", category: "callback" },
  { id: "3", read: true, shopId: "shop_a", category: "quote" },
  { id: "4", read: false, shopId: "shop_a", category: "stock_to_confirm" },
];

describe("filtre par boutique — plusieurs boutiques", () => {
  it("liste les boutiques distinctes", () => {
    expect(notificationShops(sample).sort()).toEqual(["shop_a", "shop_b"]);
  });

  it("filtre les notifications par boutique", () => {
    expect(filterNotifications(sample, { shopId: "shop_a" }).map((n) => n.id)).toEqual(["1", "3", "4"]);
    expect(filterNotifications(sample, { shopId: "shop_b" }).map((n) => n.id)).toEqual(["2"]);
  });

  it("compte les non lues par boutique", () => {
    expect(unreadCount(sample)).toBe(3);
    expect(unreadCount(sample, { shopId: "shop_a" })).toBe(2);
    expect(unreadCount(sample, { shopId: "shop_b" })).toBe(1);
  });

  it("filtre par catégorie", () => {
    expect(filterNotifications(sample, { categories: ["callback", "quote"] }).map((n) => n.id)).toEqual(["2", "3"]);
  });
});

describe("respect des permissions — plusieurs employés", () => {
  it("masque tout et compte zéro quand l'employé ne peut pas voir les notifications", () => {
    expect(filterNotifications(sample, { canView: false })).toEqual([]);
    expect(unreadCount(sample, { canView: false })).toBe(0);
  });

  it("laisse voir quand l'employé est autorisé", () => {
    expect(filterNotifications(sample, { canView: true })).toHaveLength(4);
    expect(unreadCount(sample, { canView: true })).toBe(3);
  });
});
