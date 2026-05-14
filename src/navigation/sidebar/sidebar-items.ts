import {
  CalendarDays,
  CreditCard,
  FileText,
  Home,
  type LucideIcon,
  Package,
  Receipt,
  Settings,
  Users,
  Wrench,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    items: [
      { title: "Tableau de bord", url: "/dashboard", icon: Home },
      { title: "Réparations", url: "/dashboard/reparations", icon: Wrench },
      { title: "Clients", url: "/dashboard/clients", icon: Users },
      { title: "Devis", url: "/dashboard/devis", icon: FileText },
      { title: "Factures", url: "/dashboard/factures", icon: Receipt },
      { title: "Paiements", url: "/dashboard/paiements", icon: CreditCard },
      { title: "Rendez-vous", url: "/dashboard/rendez-vous", icon: CalendarDays },
      { title: "Stock", url: "/dashboard/stock", icon: Package },
      { title: "Paramètres", url: "/dashboard/parametres", icon: Settings },
    ],
  },
];
