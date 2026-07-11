import * as React from "react"
import { cn } from "../../lib/utils"

function Badge({ className, variant = "default", ...props }) {
  const baseStyles = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
  
  const variants = {
    default: "border-transparent bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
    secondary: "border-transparent bg-slate-800 text-slate-300",
    destructive: "border-transparent bg-rose-500/10 text-rose-400 border border-rose-500/20",
    outline: "text-slate-400 border border-white/8",
    success: "border-transparent bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse-glow"
  }

  return (
    <div className={cn(baseStyles, variants[variant], className)} {...props} />
  )
}

export { Badge }
