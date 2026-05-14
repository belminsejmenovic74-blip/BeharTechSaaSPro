import { cn } from "@/lib/utils";

export function DemoTimeline({ items, compact }: Readonly<{ items: readonly string[]; compact?: boolean }>) {
  return (
    <ol className={cn("space-y-3", compact && "space-y-2")}>
      {items.map((item, index) => (
        <li className="flex gap-3 text-sm" key={item}>
          <span
            className={cn(
              "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-xs",
              index === items.length - 1
                ? "border-[#2A9D8F] bg-[#2A9D8F] text-white"
                : "border-[#CFE7E1] bg-[#EAF6F2] text-[#167B70]",
            )}
          >
            {index + 1}
          </span>
          <span className="text-[#1A1916]">{item}</span>
        </li>
      ))}
    </ol>
  );
}
