import { CalendarDays, ReceiptText, TrendingUp, Wrench } from "lucide-react";

export const dashboardKpis = [
  {
    shop_id: "shop_atelier_belmin",
    label: "CA du mois",
    value: "12 840 €",
    trend: "18,6 %",
    helper: "vs mois dernier",
    icon: TrendingUp,
  },
  {
    shop_id: "shop_atelier_belmin",
    label: "Ticket moyen",
    value: "147 €",
    trend: "6,3 %",
    helper: "vs mois dernier",
    icon: ReceiptText,
  },
  {
    shop_id: "shop_atelier_belmin",
    label: "Réparations en cours",
    value: "24",
    trend: "20,0 %",
    helper: "vs hier",
    icon: Wrench,
  },
  {
    shop_id: "shop_atelier_belmin",
    label: "Rendez-vous du jour",
    value: "8",
    trend: "14,3 %",
    helper: "vs hier",
    icon: CalendarDays,
  },
];

export const revenueData = [
  { day: "22 avr.", revenue: 2800 },
  { day: "26 avr.", revenue: 4600 },
  { day: "29 avr.", revenue: 6400 },
  { day: "2 mai", revenue: 4800 },
  { day: "6 mai", revenue: 7200 },
  { day: "9 mai", revenue: 9600 },
  { day: "13 mai", revenue: 7800 },
  { day: "16 mai", revenue: 10800 },
  { day: "20 mai", revenue: 12840 },
];

export const dashboardStats = [
  {
    shop_id: "shop_atelier_belmin",
    label: "Réparations",
    value: "126",
    trend: "15,5 %",
    helper: "vs période précédente",
    icon: Wrench,
  },
  {
    shop_id: "shop_atelier_belmin",
    label: "Ventes",
    value: "48",
    trend: "9,1 %",
    helper: "vs période précédente",
    icon: CalendarDays,
  },
  {
    shop_id: "shop_atelier_belmin",
    label: "Devis signés",
    value: "37",
    trend: "12,2 %",
    helper: "vs période précédente",
    icon: ReceiptText,
  },
  {
    shop_id: "shop_atelier_belmin",
    label: "Taux de conversion",
    value: "38,1 %",
    trend: "4,8 pts",
    helper: "vs période précédente",
    icon: TrendingUp,
  },
];
