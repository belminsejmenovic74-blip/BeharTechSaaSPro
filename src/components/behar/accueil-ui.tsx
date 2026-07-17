import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// Blocs partagés par les pages de l'espace Accueil (style Brevo épuré).

export function PortalPage({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-5 md:px-8 md:py-10 2xl:max-w-[1360px]">
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: Readonly<{ title: string; subtitle?: string; action?: ReactNode }>) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-bold text-[#1A1916] text-[28px] leading-[1.05] tracking-[-0.025em] md:text-[34px]">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-[#6B6B6B] text-[15px]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PortalCard({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <section
      className={cn(
        "rounded-[18px] border border-[#E8E8E5] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] md:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function StatusPill({ tone, children }: Readonly<{ tone: "ok" | "warn"; children: ReactNode }>) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2 py-0.5 font-bold text-[10.5px] uppercase tracking-wide",
        tone === "ok" ? "border-[#D6EBE7] text-[#167B70]" : "border-[#F0DAD5] text-[#B42318]",
      )}
    >
      {children}
    </span>
  );
}
