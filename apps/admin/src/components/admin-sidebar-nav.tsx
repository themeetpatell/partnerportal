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
  ChevronRight,
  LogOut,
} from "lucide-react"
import { useAuthClient } from "@repo/auth/client"

const navItems = [
  {
    label: "Overview",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    label: "Partners",
    href: "/partners",
    icon: UserCheck,
  },
  {
    label: "Leads",
    href: "/leads",
    icon: Users,
  },
  {
    label: "Service Requests",
    href: "/service-requests",
    icon: ClipboardList,
  },
  {
    label: "Commissions",
    href: "/commissions",
    icon: DollarSign,
  },
  {
    label: "Invoices",
    href: "/invoices",
    icon: FileText,
  },
  {
    label: "Users & Access",
    href: "/settings/users",
    icon: Settings,
  },
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
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group ${
        active
          ? "bg-indigo-600/20 text-indigo-400 border border-indigo-600/30"
          : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
      }`}
    >
      <item.icon
        className={`w-4 h-4 flex-shrink-0 ${active ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300"}`}
      />
      {item.label}
      {active && <ChevronRight className="w-3 h-3 ml-auto text-indigo-400" />}
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
  const { signOut } = useAuthClient()

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <div>
            <p className="text-zinc-100 font-semibold text-sm leading-none">
              Finanshels
            </p>
            <p className="text-zinc-500 text-xs mt-0.5">Admin Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))}
            onClick={onNavClick}
          />
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-zinc-800 p-3">
        <div className="px-2 py-2 rounded-lg hover:bg-zinc-800 transition-colors group">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-900/60 border border-indigo-700/40 flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-300 text-xs font-semibold">
                {userInitials}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-zinc-200 text-sm font-medium truncate">
                  {userName}
                </p>
                <span className="flex-shrink-0 text-xs bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 px-1.5 py-0.5 rounded font-medium">
                  {userRole}
                </span>
              </div>
              <p className="text-zinc-500 text-xs truncate">{userEmail}</p>
            </div>
            <button
              onClick={() => signOut({ redirectUrl: "/sign-in" })}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-zinc-700 flex-shrink-0"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
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
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 h-screen sticky top-0">
        <SidebarContent
          pathname={pathname}
          userName={userName}
          userEmail={userEmail}
          userInitials={userInitials}
          userRole={userRole}
        />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">F</span>
          </div>
          <span className="text-zinc-100 font-semibold text-sm">
            Finanshels Admin
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-zinc-950/80 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed top-0 left-0 h-full w-72 z-50 bg-zinc-900 border-r border-zinc-800 transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
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
