import { cn } from "@/lib/utils";

type BeharLogoSize = "sm" | "md" | "lg";

const sizeClasses: Record<BeharLogoSize, { word: string; dot: string; badge: string; gap: string }> = {
  sm: {
    word: "text-[15px]",
    dot: "size-1.5",
    badge: "h-6 rounded-[7px] px-2 text-[10px]",
    gap: "gap-2",
  },
  md: {
    word: "text-[18px]",
    dot: "size-2",
    badge: "h-7 rounded-[8px] px-2.5 text-[12px]",
    gap: "gap-2.5",
  },
  lg: {
    word: "text-[24px]",
    dot: "size-2.5",
    badge: "h-9 rounded-[9px] px-3 text-[14px]",
    gap: "gap-3",
  },
};

export function BeharLogo({
  size = "md",
  className,
  showBadge = true,
}: Readonly<{
  size?: BeharLogoSize;
  className?: string;
  showBadge?: boolean;
}>) {
  const classes = sizeClasses[size];

  return (
    <span
      className={cn(
        "inline-flex select-none items-center whitespace-nowrap font-bold tracking-[-0.02em]",
        classes.gap,
        className,
      )}
      aria-label="Behar Tech Pro"
    >
      <span className={cn("leading-none text-[#1D1D1F]", classes.word)}>BEHAR</span>
      <span className={cn("shrink-0 rounded-full bg-[#2A9D8F]", classes.dot)} aria-hidden />
      <span className={cn("leading-none text-[#1D1D1F]", classes.word)}>TECH</span>
      {showBadge && (
        <span
          className={cn(
            "ml-1 inline-flex shrink-0 items-center rounded-[8px] border border-[#2A9D8F] font-bold leading-none text-[#1D7F73]",
            classes.badge,
          )}
        >
          PRO
        </span>
      )}
    </span>
  );
}
