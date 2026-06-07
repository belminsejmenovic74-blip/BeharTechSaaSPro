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
        "mx-auto w-full max-w-[1500px] px-5 pt-2 pb-10 md:px-7 md:py-7 md:pb-8 lg:px-8 lg:py-8 xl:px-10 xl:py-9 2xl:max-w-[1760px] 2xl:px-12 2xl:py-10",
        fitScreen && "md:flex md:h-[calc(100svh-64px)] md:min-h-0 md:flex-col md:overflow-hidden md:py-6 md:pb-6 lg:py-6 xl:py-7 2xl:py-8",
      )}
    >
      <header className={cn("mb-6 shrink-0", fitScreen && "md:mb-4", "lg:mb-7 2xl:mb-8")}>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-bold text-[#1A1916] text-[34px] leading-[1.05] tracking-[-0.025em] md:text-[30px] md:font-semibold md:tracking-tight lg:text-[32px] xl:text-[34px] 2xl:text-[36px]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1.5 text-[#6B6B6B] text-[14px] tracking-tight md:text-[14px] md:text-[#6B6B6B] 2xl:text-[15px]">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="hidden items-center gap-2 md:flex 2xl:gap-3">{actions}</div>}
        </div>

        {hasMobileControls && (
          <div className="mt-5 flex flex-col gap-3 md:hidden">
            <SearchBox placeholder={searchPlaceholder} value={searchValue} onChange={onSearchChange} />
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
