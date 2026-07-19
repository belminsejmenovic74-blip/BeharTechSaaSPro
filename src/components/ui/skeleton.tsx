import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-[8px] bg-[#E8E8E5]", className)}
      {...props}
    />
  )
}

export { Skeleton }
