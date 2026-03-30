"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  UserCheck,
  ClipboardList,
  DollarSign,
  FileText,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react"
import { useClerk } from "@clerk/nextjs"

const navItems = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Partners", href: "/partners", icon: UserCheck },
  { label: "Leads", href: "/leads", icon: Users },
  { label: "Service Requests", href: "/service-requests", icon: ClipboardList },
  { label: "Commissions", href: "/commissions", icon: DollarSign },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
]

interface AdminSidebarNavProps {
  userName: string
  userEmail: string
  userInitials: string
  userRole: string
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: (typeof navItems)[number]
  active: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
        active
          ? "border border-indigo-400/30 bg-indigo-500/15 text-indigo-200"
          : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
      }`}
    >
      <item.icon
        className={`h-4 w-4 flex-shrink-0 transition-colors ${
          active ? "text-indigo-200" : "text-slate-500 group-hover:text-slate-300"
        }`}
      />
      {item.label}
    </Link>
  )
}

function SidebarContent({
  pathname,
  userName,
  userEmail,
  userInitials,
  userRole,
  onNavClick,
}: {
  pathname: string
  userName: string
  userEmail: string
  userInitials: string
  userRole: string
  onNavClick?: () => void
}) {
  const { signOut } = useClerk()

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="border-b border-white/10 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 text-white shadow-[0_8px_24px_rgba(99,102,241,0.28)]">
            <span className="text-sm font-bold">F</span>
          </div>
          <div>
            <p className="text-sm font-semibold leading-none text-white">Finanshels</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Admin Portal
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href))
            }
            onClick={onNavClick}
          />
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-3">
        <div className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.05]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/15 text-xs font-semibold text-indigo-200">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-white">{userName}</p>
              <span className="shrink-0 rounded-md border border-white/12 bg-white/6 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                {userRole}
              </span>
            </div>
            <p className="truncate text-xs text-slate-500">{userEmail}</p>
          </div>
          <button
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
            className="shrink-0 rounded-lg p-1.5 text-slate-500 opacity-0 transition-all hover:bg-white/8 hover:text-slate-200 group-hover:opacity-100"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminSidebarNav({
  userName,
  userEmail,
  userInitials,
  userRole,
}: AdminSidebarNavProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col lg:flex"
        style={{
          background: "rgba(8, 8, 8, 0.88)",
          borderRight: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(24px)",
        }}
      >
        <SidebarContent
          pathname={pathname}
          userName={userName}
          userEmail={userEmail}
          userInitials={userInitials}
          userRole={userRole}
        />
      </aside>

      {/* Mobile top bar */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 lg:hidden"
        style={{
          background: "rgba(8, 8, 8, 0.88)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(24px)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 text-white shadow-[0_8px_20px_rgba(99,102,241,0.24)]">
            <span className="text-xs font-bold">F</span>
          </div>
          <span className="text-sm font-semibold text-white">Finanshels Admin</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/8 hover:text-white"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed left-0 top-0 z-50 h-full w-72 transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "rgba(8, 8, 8, 0.96)",
          borderRight: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(24px)",
        }}
      >
        <div className="absolute right-3 top-3">
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/8 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <SidebarContent
          pathname={pathname}
          userName={userName}
          userEmail={userEmail}
          userInitials={userInitials}
          userRole={userRole}
          onNavClick={() => setMobileOpen(false)}
        />
      </div>
    </>
  )
}
