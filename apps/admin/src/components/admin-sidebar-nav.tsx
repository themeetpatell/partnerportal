"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Users,
  Home,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Building2,
  CircleDollarSign,
  Receipt,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react"
import { useAuthClient } from "@repo/auth/client"
import {
  hasModuleAccess,
  hasAnyTeamRole,
  type AccessModule,
  type CanonicalTeamRole,
} from "@/lib/rbac"

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  /** Single module gate (legacy) */
  module?: AccessModule
  /** If set, show link when user has read access to any of these (OR). */
  anyOfModules?: AccessModule[]
  roles?: CanonicalTeamRole[]
  /**
   * Leads inbox + cross-sell (existing clients) live in one place: `/leads` with filters and
   * `/service-requests/...` detail — not a second nav module.
   */
  activeAlsoUnder?: readonly string[]
  exactPath?: boolean
}

const navItems: NavItem[] = [
  { label: "Home", href: "/", icon: Home, exactPath: true },
  {
    label: "Leads",
    href: "/leads",
    icon: Users,
    anyOfModules: ["leads", "services"],
    activeAlsoUnder: ["/leads", "/service-requests"],
  },
  { label: "Partners", href: "/partners", icon: Building2, module: "partners" },
  { label: "Commissions", href: "/commissions", icon: CircleDollarSign, module: "commissions" },
  { label: "Invoices", href: "/invoices", icon: Receipt, module: "invoices" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, module: "analytics" },
  { label: "Settings", href: "/settings", icon: Settings },
]

function itemVisible(
  teamRole: string | null,
  teamPermissions: string,
  item: NavItem,
): boolean {
  if (item.roles) {
    return hasAnyTeamRole(teamRole, item.roles)
  }
  if (item.anyOfModules?.length) {
    return item.anyOfModules.some((m) => hasModuleAccess(teamRole, teamPermissions, m))
  }
  if (!item.module) {
    return true
  }
  return hasModuleAccess(teamRole, teamPermissions, item.module)
}

function isNavItemActive(pathname: string, item: NavItem): boolean {
  const base = item.href.split("?")[0]

  if (item.exactPath) {
    return pathname === base
  }

  if (item.activeAlsoUnder?.length) {
    return item.activeAlsoUnder.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  }

  return pathname === base || pathname.startsWith(`${base}/`)
}

interface AdminSidebarNavProps {
  userName: string
  userEmail: string
  userInitials: string
  /** Public URL from workspace profile (e.g. Supabase Storage). */
  userAvatarUrl?: string | null
  userRole: string
  teamRole: string | null
  teamPermissions: string
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem
  active: boolean
  onClick?: () => void
}) {
  return (
    <Link
      prefetch
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
  userAvatarUrl,
  userRole,
  teamRole,
  teamPermissions,
  onNavClick,
}: {
  pathname: string
  userName: string
  userEmail: string
  userInitials: string
  userAvatarUrl?: string | null
  userRole: string
  teamRole: string | null
  teamPermissions: string
  onNavClick?: () => void
}) {
  const { signOut } = useAuthClient()
  const visibleNavItems = navItems.filter((item) =>
    itemVisible(teamRole, teamPermissions, item),
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-zinc-800">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg outline-none ring-offset-zinc-900 transition-colors hover:bg-zinc-800/80 focus-visible:ring-2 focus-visible:ring-indigo-500/60"
          title="Home"
        >
          <Image
            src="/brand-mark.png"
            alt="Finanshels logo"
            width={32}
            height={32}
            className="h-8 w-8 flex-shrink-0"
          />
          <div>
            <p className="text-zinc-100 font-semibold text-sm leading-none">
              Finanshels
            </p>
            <p className="text-zinc-500 text-xs mt-0.5">Admin Portal</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => (
          <NavLink
            key={`${item.label}-${item.href}`}
            item={item}
            active={isNavItemActive(pathname, item)}
            onClick={onNavClick}
          />
        ))}
      </nav>

      <div className="border-t border-zinc-800 p-3 space-y-3">
        <Link
          href="/profile"
          className="block rounded-lg px-2 py-2 transition-colors hover:bg-zinc-800 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-900/60 border border-indigo-700/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {userAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote Supabase URL; avoids image remotePatterns
                <img src={userAvatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-indigo-300 text-xs font-semibold">{userInitials}</span>
              )}
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
              <p className="text-[11px] text-indigo-400/90 mt-1 font-medium">View profile →</p>
            </div>
          </div>
        </Link>
        <div className="flex items-center justify-between gap-2 px-1">
          <Link
            href="/settings"
            className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            Settings
          </Link>
          <button
            type="button"
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
            className="inline-flex items-center gap-1 rounded-md p-1.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminSidebarNav(props: AdminSidebarNavProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 h-screen sticky top-0">
        <SidebarContent pathname={pathname} {...props} />
      </aside>

      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2 rounded-lg py-1 pr-2 hover:bg-zinc-800/80" title="Home">
          <Image
            src="/brand-mark.png"
            alt="Finanshels logo"
            width={28}
            height={28}
            className="h-7 w-7"
          />
          <span className="text-zinc-100 font-semibold text-sm">
            Finanshels Admin
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-zinc-950/80 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

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
          {...props}
          onNavClick={() => setMobileOpen(false)}
        />
      </div>
    </>
  )
}
