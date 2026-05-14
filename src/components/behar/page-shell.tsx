"use client";

import type { ReactNode } from "react";

import Image from "next/image";

import { Bell } from "lucide-react";

import { SearchBox } from "@/components/behar/primitives";
import { useBeharStore } from "@/lib/behar-store";
import { cn } from "@/lib/utils";

export function PageShell({
  title,
  subtitle,
  searchPlaceholder = "Rechercher...",
  searchValue,
  onSearchChange,
  actions,
  toolbar,
  children,
  fitScreen,
}: Readonly<{
  title: string;
  subtitle?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  actions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  fitScreen?: boolean;
}>) {
  const hasMobileControls = (toolbar ?? actions) != null;
  const workshopName = useBeharStore((s) => s.workshopSettings.name || s.workshopInfo.name || "Behar Tech");
  const workshopLogo = useBeharStore((s) => s.workshopSettings.logoUrl || s.workshopInfo.logoUrl || "");

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1500px] px-4 py-5 pb-28 md:px-7 md:py-7 md:pb-8",
        fitScreen && "md:flex md:h-[calc(100svh-64px)] md:min-h-0 md:flex-col md:overflow-hidden md:py-6 md:pb-6",
      )}
    >
      <header className={cn("mb-6 shrink-0", fitScreen && "md:mb-4")}>
        {/* iOS-style header mobile : petit "kicker" atelier + grand titre */}
        <div className="mb-2 flex items-center justify-between md:hidden">
          <div className="flex items-center gap-2.5 min-w-0">
            {workshopLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={`Logo ${workshopName}`}
                className="size-8 shrink-0 rounded-[10px] border border-black/[0.05] bg-white object-cover"
                src={workshopLogo}
              />
            ) : (
              <Image
                alt={workshopName}
                className="size-8 shrink-0 rounded-[10px] border border-black/[0.05] bg-white object-cover"
                height={32}
                src="/assets/logos/app-icon.jpeg"
                width={32}
              />
            )}
            <span className="truncate font-medium text-[#6B6B6B] text-[13px] tracking-tight">{workshopName}</span>
          </div>
          <button
            aria-label="Notifications"
            className="relative grid size-10 place-items-center rounded-full bg-[#F1F1EF] text-[#1A1916] transition active:scale-90"
            type="button"
          >
            <Bell className="size-[18px]" strokeWidth={1.9} />
            <span className="absolute top-2 right-2 size-1.5 rounded-full bg-[#2A9D8F]" />
          </button>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-bold text-[#1A1916] text-[32px] leading-[1.05] tracking-[-0.02em] md:text-[34px] md:font-semibold md:tracking-tight">
              {title}
            </h1>
            {subtitle && <p className="mt-1.5 text-[#8A8984] text-[14px] tracking-tight md:text-[14px] md:text-[#6B6B6B]">{subtitle}</p>}
          </div>
          {actions && <div className="hidden items-center gap-2 md:flex">{actions}</div>}
        </div>

        {hasMobileControls && (
          <div className="mt-4 flex flex-col gap-3 md:hidden">
            <SearchBox
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={onSearchChange}
            />
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
            {toolbar && <div className="flex flex-wrap gap-2">{toolbar}</div>}
          </div>
        )}
        {toolbar && <div className="mt-5 hidden flex-wrap gap-3 md:flex">{toolbar}</div>}
      </header>

      <div className={cn(fitScreen && "md:min-h-0 md:flex-1")}>{children}</div>
    </div>
  );
}
