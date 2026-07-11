import * as React from "react"
import { cn } from "../../lib/utils"

const buttonVariants = {
  default: "bg-white text-zinc-950 hover:bg-zinc-200",
  destructive: "bg-red-500 text-zinc-50 hover:bg-red-500/90",
  outline: "border border-zinc-800 bg-transparent hover:bg-zinc-800 text-zinc-300 hover:text-white",
  secondary: "bg-zinc-800 text-zinc-50 hover:bg-zinc-700",
  ghost: "hover:bg-zinc-800 text-zinc-300 hover:text-white",
  link: "text-zinc-50 underline-offset-4 hover:underline",
};

const sizeVariants = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-10 rounded-md px-8",
  icon: "h-9 w-9",
};

const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 disabled:pointer-events-none disabled:opacity-50",
        buttonVariants[variant],
        sizeVariants[size],
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }
