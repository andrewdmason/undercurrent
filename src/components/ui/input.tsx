import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-8 w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--input)] px-3 text-xs text-[var(--grey-800)] placeholder:text-[var(--grey-400)] transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-30",
        "hover:border-[var(--grey-200)]",
        "focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20",
        "aria-invalid:border-[#f72736] aria-invalid:ring-2 aria-invalid:ring-[#f72736]/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
