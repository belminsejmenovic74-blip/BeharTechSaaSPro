"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  CalendarDays,
  ChevronsUpDown,
  CreditCard,
  FileStack,
  FileText,
  Home,
  LogOut,
  Monitor,
  Package,
  Receipt,
  Settings,
  ShoppingBag,
  Users,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { useBeharStore } from "@/lib/behar-store";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Tableau de bord", href: "/dashboard", icon: Home },
  { label: "Réparations", href: "/dashboard/reparations", icon: Wrench },
  { label: "Clients", href: "/dashboard/clients", icon: Users },
  { label: "Ventes", href: "/dashboard/ventes", icon: ShoppingBag },
  { label: "Devis", href: "/dashboard/devis", icon: FileText },
  { label: "Factures", href: "/dashboard/factures", icon: Receipt },
  { label: "Paiements", href: "/dashboard/paiements", icon: CreditCard },
  { label: "Rendez-vous", href: "/dashboard/rendez-vous", icon: CalendarDays },
  { label: "Stock", href: "/dashboard/stock", icon: Package },
  { label: "Documents", href: "/dashboard/documents", icon: FileStack },
  { label: "Paramètres", href: "/dashboard/parametres", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const workshopName = useBeharStore((s) => s.workshopSettings.name || s.workshopInfo.name);
  const workshopLogo = useBeharStore((s) => s.workshopSettings.logoUrl || s.workshopInfo.logoUrl || "");
  const canViewSettings = useBeharStore((s) => s.hasPermission("canViewSettings"));
  const currentUser = useBeharStore((s) => s.currentUser);
  const logout = useBeharStore((s) => s.logout);
  const userRoleLabel =
    currentUser.role === "admin" ? "Gérant" : currentUser.role === "technician" ? "Technicien" : "Accueil";
  const workshopInitials = workshopName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[230px] border-[#E7E4DC] border-r bg-white px-3.5 py-6 md:flex md:flex-col">
      <Link
        className="flex h-10 items-baseline gap-1.5 px-2 font-semibold text-[#1A1916] tracking-tight"
        href="/dashboard"
        prefetch={false}
      >
        <span className="text-[15px] tracking-[-0.02em] font-semibold">BEHAR</span>
        <span className="-mt-px text-[7px] text-[#2A9D8F] opacity-80">●</span>
        <span className="text-[15px] tracking-[-0.02em] font-semibold">TECH</span>
      </Link>

      <nav className="mt-6 flex flex-1 flex-col gap-0.5">
        {navItems
          .filter((item) => item.href !== "/dashboard/parametres" || canViewSettings)
          .map((item) => {
            const Icon = item.icon;
            const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                className={cn(
                  "flex h-[42px] items-center gap-3 rounded-[12px] px-3 font-medium text-[#6B6B6B] text-[13.5px] transition",
                  "hover:bg-[#F6F7F4] hover:text-[#1A1916]",
                  active && "bg-[#E7F5F1] font-semibold text-[#167B70]",
                )}
                href={item.href}
                key={item.href}
                prefetch={false}
              >
                <Icon className={cn("size-[18px]", active && "text-[#2A9D8F]")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
      </nav>

      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded-[14px] border border-[#F1F1EF] bg-white px-3 py-2.5">
          <span className="grid size-9 place-items-center rounded-full bg-[#EAF6F2] font-semibold text-[#2A9D8F] text-[13px]">
            {currentUser.name.charAt(0).toUpperCase()}
          </span>
          <div className="flex-1 leading-tight min-w-0">
            <div className="truncate font-medium text-[#1A1916] text-[13px]">{currentUser.name}</div>
            <div className="text-[#8A8984] text-[11px]">{userRoleLabel}</div>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="grid size-8 place-items-center rounded-[10px] text-[#B42318] transition hover:bg-[#FDF2F2]"
            title="Changer d'utilisateur"
            aria-label="Déconnexion"
          >
            <LogOut className="size-4" />
          </button>
        </div>
        <Link
          href={canViewSettings ? "/dashboard/parametres" : "/dashboard"}
          className="flex items-center gap-3 rounded-[14px] border border-[#F1F1EF] bg-white px-3 py-3 text-left transition-colors duration-200 hover:bg-[#FAFAF8]"
        >
          {workshopLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={`Logo ${workshopName}`}
              className="size-9 rounded-[10px] border border-[#F1F1EF] bg-white object-cover"
              src={workshopLogo}
            />
          ) : (
            <span className="grid size-9 place-items-center rounded-[10px] bg-[#1A1916] font-semibold text-white text-[11px] tracking-wide">
              {workshopInitials || "AT"}
            </span>
          )}
          <div className="flex-1 leading-tight">
            <div className="font-medium text-[#1A1916] text-[13px]">{workshopName}</div>
            <div className="text-[#B0AEA8] text-[11px]">Atelier principal</div>
          </div>
          <ChevronsUpDown className="size-4 text-[#CDCBC5]" />
        </Link>
      </div>
    </aside>
  );
}

function SidebarInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    if ((window as any).deferredInstallPrompt) {
      setInstallPrompt((window as any).deferredInstallPrompt);
    }

    const handlePromptAvailable = () => {
      setInstallPrompt((window as any).deferredInstallPrompt);
    };

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("pwa-prompt-available", handlePromptAvailable);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("pwa-prompt-available", handlePromptAvailable);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  if (isInstalled || !installPrompt) return null;

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      toast.success("Application installée.");
      setIsInstalled(true);
      setInstallPrompt(null);
    }
  };

  return (
    <button
      onClick={handleInstall}
      className={cn(
        "flex h-[42px] items-center gap-3 rounded-[12px] px-3 font-medium text-[#2A9D8F] text-[13.5px] transition mt-2",
        "bg-[#E7F5F1] hover:bg-[#D8EDEA]",
      )}
    >
      <Monitor className="size-[18px]" />
      <span>Installer Behar Tech</span>
    </button>
  );
}
