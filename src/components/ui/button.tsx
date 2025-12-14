import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs font-semibold transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:pointer-events-none disabled:opacity-30 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:shadow-[0_0_0_1px_var(--grey-0),0_0_0_3px_var(--ring)]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-t from-[#262626] to-[#404040] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16),inset_0_0_0_100px_rgba(255,255,255,0.08)]",
        destructive:
          "bg-[#f72736] text-white hover:bg-[#a80000] focus-visible:ring-[#f72736]/20",
        success:
          "bg-[#00975a] text-white hover:bg-[#007a49] focus-visible:ring-[#00975a]/20",
        outline:
          "border border-[var(--border)] bg-white text-[var(--grey-800)] shadow-sm hover:bg-[var(--grey-50-a)]",
        secondary:
          "bg-[var(--grey-50)] text-[var(--grey-800)] hover:bg-[var(--grey-50-a)]",
        ghost:
          "text-[var(--grey-800)] hover:bg-[var(--grey-50-a)]",
        link: "text-[#1a5eff] underline-offset-4 hover:underline",
        upgrade:
          "bg-[#6600cc] text-white hover:bg-[#7b24ff]",
      },
      size: {
        default: "h-8 px-4 py-2",
        sm: "h-6 px-2 gap-1.5 text-xs rounded-lg",
        lg: "h-12 px-4",
        icon: "size-8",
        "icon-sm": "size-6",
        "icon-lg": "size-12",
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
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
