// Centre de notifications widget — catégories, libellés, sévérité, mapping et
// filtres. Pur (aucune dépendance React/store) : la logique de catégorisation,
// le compteur non lu, le filtre par boutique et le respect des permissions sont
// testables indépendamment de l'interface.

export type NotificationCategory =
  | "new_request" // nouvelle demande
  | "price_request" // demande de prix sans tarif
  | "callback" // demande de rappel
  | "quote" // demande de devis
  | "new_appointment" // nouveau rendez-vous
  | "appointment_moved" // rendez-vous déplacé
  | "appointment_cancelled" // rendez-vous annulé
  | "stock_to_confirm" // stock à confirmer
  | "price_to_confirm" // prix à confirmer
  | "photo_received" // photo reçue
  | "converted"; // conversion en dossier

export type NotificationSeverity = "info" | "success" | "warning" | "danger";

export type QuickActionKey = "open_request" | "open_appointment" | "open_repair" | "confirm" | "call";

export type NotificationCategoryMeta = {
  label: string;
  severity: NotificationSeverity;
  /** targetType du store → route du lien « voir la demande ». */
  targetType: "widget_lead" | "appointment" | "repair";
  quickActions: QuickActionKey[];
};

export const NOTIFICATION_CATEGORY_META: Record<NotificationCategory, NotificationCategoryMeta> = {
  new_request: {
    label: "Nouvelle demande",
    severity: "info",
    targetType: "widget_lead",
    quickActions: ["open_request", "call"],
  },
  price_request: {
    label: "Demande de prix sans tarif",
    severity: "warning",
    targetType: "widget_lead",
    quickActions: ["open_request", "call"],
  },
  callback: {
    label: "Demande de rappel",
    severity: "info",
    targetType: "widget_lead",
    quickActions: ["open_request", "call"],
  },
  quote: {
    label: "Demande de devis",
    severity: "info",
    targetType: "widget_lead",
    quickActions: ["open_request", "call"],
  },
  new_appointment: {
    label: "Nouveau rendez-vous",
    severity: "success",
    targetType: "appointment",
    quickActions: ["open_appointment", "confirm"],
  },
  appointment_moved: {
    label: "Rendez-vous déplacé",
    severity: "info",
    targetType: "appointment",
    quickActions: ["open_appointment"],
  },
  appointment_cancelled: {
    label: "Rendez-vous annulé",
    severity: "danger",
    targetType: "appointment",
    quickActions: ["open_appointment"],
  },
  stock_to_confirm: {
    label: "Stock à confirmer",
    severity: "warning",
    targetType: "appointment",
    quickActions: ["open_appointment", "confirm"],
  },
  price_to_confirm: {
    label: "Prix à confirmer",
    severity: "warning",
    targetType: "appointment",
    quickActions: ["open_appointment", "confirm"],
  },
  photo_received: { label: "Photo reçue", severity: "info", targetType: "widget_lead", quickActions: ["open_request"] },
  converted: {
    label: "Conversion en dossier",
    severity: "success",
    targetType: "repair",
    quickActions: ["open_repair"],
  },
};

// Ordre d'affichage des filtres par catégorie.
export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  "new_request",
  "callback",
  "quote",
  "price_request",
  "new_appointment",
  "appointment_moved",
  "appointment_cancelled",
  "stock_to_confirm",
  "price_to_confirm",
  "photo_received",
  "converted",
];

export function categoryLabel(category: NotificationCategory): string {
  return NOTIFICATION_CATEGORY_META[category]?.label ?? "Notification";
}

export function categorySeverity(category: NotificationCategory): NotificationSeverity {
  return NOTIFICATION_CATEGORY_META[category]?.severity ?? "info";
}

export function categoryTargetType(category: NotificationCategory): NotificationCategoryMeta["targetType"] {
  return NOTIFICATION_CATEGORY_META[category]?.targetType ?? "widget_lead";
}

export function categoryQuickActions(category: NotificationCategory): QuickActionKey[] {
  return NOTIFICATION_CATEGORY_META[category]?.quickActions ?? [];
}

// Type de demande du widget → catégorie de notification.
export function categoryFromLeadType(leadType: string | null | undefined): NotificationCategory {
  switch (leadType) {
    case "callback":
      return "callback";
    case "quote":
      return "quote";
    case "price_request":
      return "price_request";
    case "appointment":
      return "new_appointment";
    default:
      return "new_request";
  }
}

// Notification serveur (widget_notifications.notification_type) → catégorie,
// en retombant sur le type de demande lié si disponible.
export function categoryFromServerNotification(
  notificationType: string | null | undefined,
  leadType?: string | null,
): NotificationCategory {
  const type = String(notificationType ?? "").toLowerCase();
  if (type.includes("photo")) return "photo_received";
  if (type.includes("appointment") || type.includes("rendez")) return "new_appointment";
  if (type.includes("quote") || type.includes("devis")) return "quote";
  if (type.includes("callback") || type.includes("rappel")) return "callback";
  if (type.includes("price") || type.includes("prix")) return "price_request";
  if (leadType) return categoryFromLeadType(leadType);
  return "new_request";
}

// ---------------------------------------------------------------------------
// Filtres et compteurs (compatibles avec AppNotification du store).
// ---------------------------------------------------------------------------

export type NotificationLike = {
  read?: boolean;
  shopId?: string;
  category?: NotificationCategory;
};

export type NotificationView = {
  /** Filtre boutique ; absent = toutes les boutiques. */
  shopId?: string;
  /** Catégories retenues ; absent = toutes. */
  categories?: NotificationCategory[];
  /** L'employé courant peut-il voir les notifications ? (respect des permissions) */
  canView?: boolean;
};

function matchesView<T extends NotificationLike>(notification: T, view: NotificationView): boolean {
  if (view.canView === false) return false;
  if (view.shopId && notification.shopId && notification.shopId !== view.shopId) return false;
  if (
    view.categories &&
    view.categories.length &&
    notification.category &&
    !view.categories.includes(notification.category)
  ) {
    return false;
  }
  return true;
}

export function filterNotifications<T extends NotificationLike>(notifications: T[], view: NotificationView = {}): T[] {
  if (view.canView === false) return [];
  return notifications.filter((notification) => matchesView(notification, view));
}

export function unreadCount<T extends NotificationLike>(notifications: T[], view: NotificationView = {}): number {
  if (view.canView === false) return 0;
  return notifications.reduce(
    (count, notification) => (!notification.read && matchesView(notification, view) ? count + 1 : count),
    0,
  );
}

// Boutiques distinctes présentes dans les notifications (pour le sélecteur de filtre).
export function notificationShops<T extends NotificationLike>(notifications: T[]): string[] {
  return [
    ...new Set(notifications.map((notification) => notification.shopId).filter((id): id is string => Boolean(id))),
  ];
}
