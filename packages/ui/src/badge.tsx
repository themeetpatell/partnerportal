import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "./cn"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-zinc-700 text-zinc-100 border border-zinc-600",
        success:
          "bg-green-900/40 text-green-400 border border-green-700/50",
        warning:
          "bg-yellow-900/40 text-yellow-400 border border-yellow-700/50",
        danger:
          "bg-red-900/40 text-red-400 border border-red-700/50",
        info:
          "bg-blue-900/40 text-blue-400 border border-blue-700/50",
        pending:
          "bg-yellow-900/40 text-yellow-300 border border-yellow-700/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
