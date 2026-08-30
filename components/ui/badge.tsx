import * as React from "react"
import { cn } from "@/lib/utils"

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-slate-700/60 text-slate-300 border-slate-600/40',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    error: 'bg-red-500/15 text-red-400 border-red-500/25',
    info: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
