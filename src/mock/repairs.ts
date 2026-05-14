import type { RepairStatus } from "@/lib/behar-store";

export type RepairCard = {
  id: string;
  shop_id: string;
  /** Référence dossier (ex. R-2026-xxxx) */
  number?: string;
  device: string;
  issue: string;
  customer: string;
  time: string;
  status: RepairStatus;
  totalLabel?: string;
  paidLabel?: string;
  paymentPaid?: boolean;
  showCounterBadge?: boolean;
  showInvoiceBadge?: boolean;
  showReadyBadge?: boolean;
};

export const dashboardRepairColumns = [
  {
    title: "Reçu",
    count: 4,
    cards: [
      {
        id: "repair_s21_battery",
        shop_id: "shop_atelier_belmin",
        device: "Samsung Galaxy S21",
        issue: "Batterie à remplacer",
        customer: "Julien R.",
        time: "Aujourd'hui, 09:12",
        status: "Reçu",
      },
      {
        id: "repair_macbook_air",
        shop_id: "shop_atelier_belmin",
        device: "MacBook Air M1",
        issue: "Clavier défectueux",
        customer: "Sophie L.",
        time: "Aujourd'hui, 08:45",
        status: "Reçu",
      },
      {
        id: "repair_ipad_screen",
        shop_id: "shop_atelier_belmin",
        device: "iPad 9e génération",
        issue: "Écran cassé",
        customer: "Lucas D.",
        time: "Hier, 17:33",
        status: "Reçu",
      },
    ],
  },
  {
    title: "Diagnostic",
    count: 3,
    cards: [
      {
        id: "repair_iphone_11",
        shop_id: "shop_atelier_belmin",
        device: "iPhone 11",
        issue: "Ne s'allume plus",
        customer: "Thomas B.",
        time: "Aujourd'hui, 10:11",
        status: "Diagnostic",
      },
      {
        id: "repair_iphone_xr",
        shop_id: "shop_atelier_belmin",
        device: "iPhone XR",
        issue: "Face ID ne fonctionne pas",
        customer: "Nadia K.",
        time: "Hier, 15:44",
        status: "Diagnostic",
      },
    ],
  },
  {
    title: "Réparation",
    count: 3,
    cards: [
      {
        id: "repair_belmin_iphone13",
        shop_id: "shop_atelier_belmin",
        device: "iPhone 13",
        issue: "Écran cassé",
        customer: "Belmin",
        time: "Aujourd'hui, 10:15",
        status: "Préparation / Réparation",
      },
      {
        id: "repair_iphone_12",
        shop_id: "shop_atelier_belmin",
        device: "iPhone 12",
        issue: "Remplacement batterie",
        customer: "Laura P.",
        time: "Aujourd'hui, 09:47",
        status: "Préparation / Réparation",
      },
      {
        id: "repair_macbook_pro",
        shop_id: "shop_atelier_belmin",
        device: "MacBook Pro 13”",
        issue: "Ventilateur bruyant",
        customer: "Antoine G.",
        time: "Hier, 13:30",
        status: "Préparation / Réparation",
      },
    ],
  },
  {
    title: "Prêt",
    count: 2,
    cards: [
      {
        id: "repair_iphone_8",
        shop_id: "shop_atelier_belmin",
        device: "iPhone 8",
        issue: "Batterie à remplacer",
        customer: "Clara M.",
        time: "Hier, 11:20",
        status: "Prêt",
      },
      {
        id: "repair_ipad_air",
        shop_id: "shop_atelier_belmin",
        device: "iPad Air 4",
        issue: "Connecteur défectueux",
        customer: "Youssef A.",
        time: "Hier, 10:05",
        status: "Prêt",
      },
    ],
  },
] satisfies Array<{ title: string; count: number; cards: RepairCard[] }>;

export const repairKanbanColumns = [
  dashboardRepairColumns[0],
  dashboardRepairColumns[1],
  dashboardRepairColumns[2],
  {
    title: "Test final",
    count: 2,
    cards: [
      {
        id: "repair_test_iphone8",
        shop_id: "shop_atelier_belmin",
        device: "iPhone 8",
        issue: "Batterie à remplacer",
        customer: "Clara M.",
        time: "Hier, 11:20",
        status: "Test final",
      },
      {
        id: "repair_test_ipad_air",
        shop_id: "shop_atelier_belmin",
        device: "iPad Air 4",
        issue: "Connecteur défectueux",
        customer: "Youssef A.",
        time: "Hier, 10:05",
        status: "Test final",
      },
    ],
  },
  {
    title: "Prêt",
    count: 2,
    cards: [
      {
        id: "repair_ready_se",
        shop_id: "shop_atelier_belmin",
        device: "iPhone SE (2020)",
        issue: "Écran + batterie",
        customer: "Romain D.",
        time: "Hier, 16:40",
        status: "Prêt",
      },
      {
        id: "repair_airpods",
        shop_id: "shop_atelier_belmin",
        device: "AirPods 3",
        issue: "Nettoyage",
        customer: "Camille B.",
        time: "Hier, 15:15",
        status: "Prêt",
      },
    ],
  },
] satisfies Array<{ title: string; count: number; cards: RepairCard[] }>;

export const selectedRepair = {
  id: "repair_belmin_iphone13",
  shop_id: "shop_atelier_belmin",
  number: "R-2026-0518",
  customer: "Belmin",
  phone: "06 12 34 56 78",
  email: "belmin@example.com",
  device: "iPhone 13",
  storage: "128 Go",
  color: "Minuit",
  imei: "35 123456 789012 3",
  issue: "Écran cassé",
  droppedAt: "Aujourd'hui, 10:15",
  status: "Préparation / Réparation",
  estimatedDoneAt: "Demain, 15:00",
  amount: "189,00 €",
  notes: "Le client souhaite conserver le True Tone.",
  parts: ["Écran OLED iPhone 13"],
  history: ["Réparation créée", "Diagnostic terminé", "Réparation démarrée"],
};
