import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-8 w-full min-w-0 rounded-xl border-0 bg-[var(--grey-30-a)] px-2 text-xs text-[var(--grey-800)] placeholder:text-[var(--grey-400)] transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-30",
        "hover:ring-2 hover:ring-[var(--border)]",
        "focus:ring-2 focus:ring-[var(--ring)]",
        "aria-invalid:ring-2 aria-invalid:ring-[#f72736]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
