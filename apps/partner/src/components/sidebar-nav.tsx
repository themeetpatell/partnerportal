"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronRight,
  ClipboardList,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  User,
  Wrench,
  X,
} from "lucide-react"
import { useAuthClient } from "@repo/auth/client"

const primaryItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Submit Lead", href: "/dashboard/leads/new", icon: Plus },
  { label: "Clients", href: "/dashboard/clients", icon: ClipboardList },
  { label: "New Service Request", href: "/dashboard/service-requests/new", icon: Wrench },
  { label: "Service Requests", href: "/dashboard/service-requests", icon: ClipboardList },
  { label: "Commissions", href: "/dashboard/commissions", icon: DollarSign },
]

const secondaryItems = [
  { label: "Profile", href: "/dashboard/profile", icon: User },
]

interface SidebarNavProps {
  userName: string
  userEmail: string
  userInitials: string
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }
  active: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
        active
          ? "border border-indigo-400/30 bg-indigo-500/15 text-indigo-200"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
      }`}
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
          active
            ? "bg-indigo-500/20 text-indigo-200"
            : "bg-zinc-800 text-zinc-500 group-hover:text-zinc-300"
        }`}
      >
        <item.icon className="h-4 w-4" />
      </div>
      <span className="flex-1">{item.label}</span>
      {active ? <ChevronRight className="h-3.5 w-3.5 text-indigo-400" /> : null}
    </Link>
  )
}

function SidebarContent({
  pathname,
  userName,
  userEmail,
  userInitials,
  onNavClick,
}: {
  pathname: string
  userName: string
  userEmail: string
  userInitials: string
  onNavClick?: () => void
}) {
  const { signOut } = useAuthClient()

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 via-indigo-500 to-violet-500 text-sm font-bold text-white shadow-[0_10px_28px_rgba(99,102,241,0.35)]">
            F
          </div>
          <div>
            <p className="text-sm font-semibold leading-none text-white">Finanshels</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              Partner Portal
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
        <div>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Revenue
          </p>
          <div className="mt-3 space-y-1.5">
            {primaryItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href)
                }
                onClick={onNavClick}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Account
          </p>
          <div className="mt-3 space-y-1.5">
            {secondaryItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={pathname.startsWith(item.href)}
                onClick={onNavClick}
              />
            ))}
          </div>
        </div>
      </nav>

      <div className="border-t border-zinc-800 p-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/15 text-xs font-semibold text-indigo-200">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{userName}</p>
              <p className="truncate text-xs text-slate-400">{userEmail}</p>
            </div>
          </div>

          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className="secondary-button mt-4 w-full justify-center"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

export function SidebarNav({
  userName,
  userEmail,
  userInitials,
}: SidebarNavProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <aside className="hidden w-[320px] shrink-0 lg:block">
        <div className="surface-card-strong sticky top-4 h-[calc(100vh-2rem)] overflow-hidden rounded-[2rem]">
          <SidebarContent
            pathname={pathname}
            userName={userName}
            userEmail={userEmail}
            userInitials={userInitials}
          />
        </div>
      </aside>

      <div className="surface-card sticky top-4 z-30 mb-4 flex items-center justify-between rounded-[1.4rem] px-4 py-3 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-gradient-to-br from-indigo-400 via-indigo-500 to-violet-500 text-sm font-black text-white shadow-[0_10px_28px_rgba(99,102,241,0.35)]">
            F
          </div>
          <div>
            <p className="font-heading text-base font-semibold text-white">
              Finanshels
            </p>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
              Partner workspace
            </p>
          </div>
        </div>

        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-white/[0.05] text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-[#050505]/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-[88vw] max-w-[340px] p-4 transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="surface-card-strong relative h-full overflow-hidden rounded-[2rem]">
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] text-slate-300 hover:bg-white/[0.08] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <SidebarContent
            pathname={pathname}
            userName={userName}
            userEmail={userEmail}
            userInitials={userInitials}
            onNavClick={() => setMobileOpen(false)}
          />
        </div>
      </div>
    </>
  )
}
