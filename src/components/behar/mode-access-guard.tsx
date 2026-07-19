"use client";

import type { ReactNode } from "react";

import Link from "next/link";

import { LayoutDashboard, LogOut, ShieldAlert, Store, Wrench } from "lucide-react";

import { type PermissionKey, useBeharStore } from "@/lib/behar-store";
import { getUserFirstName } from "@/lib/user-display";

const DESTINATIONS: Array<{
  permission: PermissionKey;
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { permission: "canAccessCounter", href: "/comptoir", label: "Ouvrir le Comptoir", icon: Store },
  { permission: "canAccessWorkshopMode", href: "/atelier", label: "Ouvrir l’Atelier", icon: Wrench },
  { permission: "canViewDashboard", href: "/dashboard", label: "Ouvrir le Dashboard", icon: LayoutDashboard },
];

export function ModeAccessGuard({
  permission,
  label,
  children,
}: Readonly<{ permission: PermissionKey; label: string; children: ReactNode }>) {
  const hydrated = useBeharStore((state) => state._hasHydrated);
  const currentUser = useBeharStore((state) => state.currentUser);
  const hasPermission = useBeharStore((state) => state.hasPermission);
  const logout = useBeharStore((state) => state.logout);

  if (!hydrated) return null;
  if (hasPermission(permission)) return <>{children}</>;

  const alternatives = DESTINATIONS.filter(
    (destination) => destination.permission !== permission && hasPermission(destination.permission),
  );
  const firstName = getUserFirstName(currentUser.name, currentUser.id);

  return (
    <main className="grid min-h-svh place-items-center bg-white px-5 py-10 text-[#101828]">
      <section className="w-full max-w-[500px] rounded-[20px] border border-[#E4E7EC] bg-white p-7 text-center shadow-[0_10px_40px_rgba(16,24,40,0.06)]">
        <span className="mx-auto grid size-12 place-items-center rounded-full border border-[#E4E7EC] bg-white text-[#667085]">
          <ShieldAlert className="size-6" />
        </span>
        <h1 className="mt-4 text-xl font-bold">Accès au {label} désactivé</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#667085]">
          {firstName}, le gérant doit activer cet accès dans Paramètres → Équipe → Permissions.
        </p>
        {alternatives.length ? (
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {alternatives.map(({ href, label: destinationLabel, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[11px] bg-[#101828] px-4 text-sm font-semibold text-white transition hover:bg-[#2A2925]"
              >
                <Icon className="size-4" /> {destinationLabel}
              </Link>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => logout()}
          className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-medium text-[#667085] transition hover:bg-[#F4FBF9] hover:text-[#101828]"
        >
          <LogOut className="size-4" /> Changer d’utilisateur
        </button>
      </section>
    </main>
  );
}
