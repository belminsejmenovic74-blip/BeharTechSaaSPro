import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[10px] border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-colors duration-150 outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-[#238579]",
        outline:
          "border-border bg-white text-foreground shadow-xs hover:bg-[#F5F7FA] aria-expanded:bg-[#F5F7FA]",
        secondary:
          "bg-[#F2F4F7] text-secondary-foreground hover:bg-[#E4E7EC] aria-expanded:bg-[#E4E7EC]",
        ghost:
          "hover:bg-[#F2F4F7] hover:text-foreground aria-expanded:bg-[#F2F4F7] aria-expanded:text-foreground",
        destructive:
          "bg-[#FCECEB] text-destructive hover:bg-[#F7DDDA] focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        xs: "h-8 gap-1.5 rounded-[8px] px-2.5 text-xs in-data-[slot=button-group]:rounded-[8px] [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-1.5 rounded-[9px] px-3 text-[0.8125rem] in-data-[slot=button-group]:rounded-[9px] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-10",
        "icon-xs":
          "size-8 rounded-[8px] in-data-[slot=button-group]:rounded-[8px] [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm":
          "size-9 rounded-[9px] in-data-[slot=button-group]:rounded-[9px]",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
