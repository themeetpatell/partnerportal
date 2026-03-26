import * as React from "react"
import { cn } from "./cn"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-white shadow-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
    )
  }
)
Select.displayName = "Select"

export interface SelectItemProps extends React.OptionHTMLAttributes<HTMLOptionElement> {}

const SelectItem = React.forwardRef<HTMLOptionElement, SelectItemProps>(
  ({ className, children, ...props }, ref) => (
    <option
      ref={ref}
      className={cn("bg-zinc-800 text-white", className)}
      {...props}
    >
      {children}
    </option>
  )
)
SelectItem.displayName = "SelectItem"

export { Select, SelectItem }
