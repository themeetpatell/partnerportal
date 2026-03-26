"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronRight,
  ClipboardList,
  DollarSign,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Plus,
  Sparkles,
  User,
  Users,
  Wrench,
  X,
} from "lucide-react"
import { useClerk } from "@clerk/nextjs"

const primaryItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Submit Lead", href: "/dashboard/leads/new", icon: Plus },
  { label: "My Leads", href: "/dashboard/leads", icon: Users },
  { label: "New Service Request", href: "/dashboard/service-requests/new", icon: Wrench },
  { label: "Service Requests", href: "/dashboard/service-requests", icon: ClipboardList },
  { label: "Commissions", href: "/dashboard/commissions", icon: DollarSign },
]

const secondaryItems = [
  { label: "Invoices", href: "/dashboard/invoices", icon: FileText },
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
      className={`group flex items-center gap-3 rounded-[1.1rem] px-3 py-3 text-sm font-medium transition-all ${
        active
          ? "bg-gradient-to-r from-[#58d5c4]/16 to-[#f2bc74]/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
          active
            ? "bg-[#58d5c4]/16 text-[#8ce7db]"
            : "bg-white/[0.04] text-slate-500 group-hover:text-slate-200"
        }`}
      >
        <item.icon className="h-4 w-4" />
      </div>
      <span className="flex-1">{item.label}</span>
      {active ? <ChevronRight className="h-4 w-4 text-[#8ce7db]" /> : null}
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
  const { signOut } = useClerk()

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/8 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-gradient-to-br from-[#58d5c4] via-[#8ce7db] to-[#f2bc74] text-sm font-black text-[#08111f] shadow-[0_18px_45px_rgba(88,213,196,0.28)]">
            F
          </div>
          <div>
            <p className="font-heading text-lg font-semibold text-white">Finanshels</p>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
              Partner Portal
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[1.4rem] border border-[#58d5c4]/18 bg-[#58d5c4]/8 p-4">
          <div className="flex items-center gap-2 text-[#8ce7db]">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.22em]">
              Workspace status
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Keep leads moving, route service requests cleanly, and monitor payouts without chasing updates.
          </p>
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

        <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-slate-200">
            <LifeBuoy className="h-4 w-4 text-[#f2bc74]" />
            <p className="text-sm font-semibold">Need support?</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Use profile details and registration context to keep your partnership information current.
          </p>
        </div>
      </nav>

      <div className="border-t border-white/8 p-4">
        <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8 text-sm font-semibold text-white">
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
          <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-gradient-to-br from-[#58d5c4] via-[#8ce7db] to-[#f2bc74] text-sm font-black text-[#08111f]">
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
          className="fixed inset-0 z-40 bg-[#08111f]/80 backdrop-blur-sm lg:hidden"
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
