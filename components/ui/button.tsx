import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', loading, children, disabled, ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]"

    const variants = {
      default: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20",
      outline: "border border-white/20 bg-white/5 text-white hover:bg-white/10",
      ghost: "text-slate-300 hover:bg-white/10 hover:text-white",
      destructive: "bg-red-600/90 text-white hover:bg-red-500 shadow-lg shadow-red-600/20",
      success: "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20",
    }

    const sizes = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-5 text-sm",
      lg: "h-12 px-7 text-base",
      icon: "h-10 w-10",
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(baseClasses, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
