"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Moon, Sun, Monitor } from "lucide-react"

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="flex items-center gap-1 rounded-xl bg-secondary p-1">
        <div className="h-8 w-8 rounded-lg" />
        <div className="h-8 w-8 rounded-lg" />
        <div className="h-8 w-8 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 rounded-xl bg-secondary p-1">
      {themes.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          aria-label={`Switch to ${label} theme`}
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs transition-all ${
            theme === value
              ? "bg-primary/15 text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}
