"use client";

import type { ReactNode } from "react";

import { SearchBox } from "@/components/behar/primitives";
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

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1500px] px-4 pt-4 pb-10 sm:px-5 md:px-7 md:py-6 md:pb-8 lg:px-8 xl:px-10 2xl:max-w-[1760px] 2xl:px-12",
        fitScreen &&
          "md:flex md:h-[calc(100svh-64px)] md:min-h-0 md:flex-col md:overflow-hidden md:py-5 md:pb-5 lg:py-6 2xl:py-7",
      )}
    >
      <header className={cn("mb-5 shrink-0", fitScreen && "md:mb-4", "lg:mb-6")}>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-semibold text-[#101828] text-[30px] leading-[1.08] tracking-[-0.025em] md:text-[30px] lg:text-[32px]">
              {title}
            </h1>
            {subtitle && <p className="mt-1.5 text-[#667085] text-[14px] leading-5">{subtitle}</p>}
          </div>
          {actions && <div className="hidden items-center gap-2 md:flex 2xl:gap-3">{actions}</div>}
        </div>

        {hasMobileControls && (
          <div className="mt-4 flex flex-col gap-3 md:hidden">
            <SearchBox placeholder={searchPlaceholder} value={searchValue} onChange={onSearchChange} />
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
            {toolbar && <div className="flex flex-wrap gap-2">{toolbar}</div>}
          </div>
        )}
        {toolbar && <div className="mt-4 hidden flex-wrap gap-2.5 md:flex">{toolbar}</div>}
      </header>

      <div className={cn(fitScreen && "md:min-h-0 md:flex-1")}>{children}</div>
    </div>
  );
}
