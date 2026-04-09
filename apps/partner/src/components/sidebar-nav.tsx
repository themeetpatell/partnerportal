"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  ChevronRight,
  ClipboardList,
  DollarSign,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Plus,
  User,
  Users,
  Wrench,
  X,
} from "lucide-react"
import { useAuthClient } from "@repo/auth/client"
import { ThemeToggle } from "@/components/theme-toggle"

const primaryItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, createHref: undefined },
  { label: "Clients", href: "/dashboard/clients", icon: ClipboardList, createHref: "/dashboard/clients/new" },
  { label: "Leads to Finanshels", href: "/dashboard/leads", icon: Users, createHref: "/dashboard/leads/new" },
  { label: "Service Requests", href: "/dashboard/service-requests", icon: Wrench, createHref: "/dashboard/service-requests/new" },
  { label: "Commissions", href: "/dashboard/commissions", icon: DollarSign, createHref: undefined },
]

const secondaryItems = [
  { label: "Profile", href: "/dashboard/profile", icon: User },
]

const mobilePrimaryItems = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Leads", href: "/dashboard/leads", icon: Users },
  { label: "Clients", href: "/dashboard/clients", icon: ClipboardList },
  { label: "Requests", href: "/dashboard/service-requests", icon: Wrench },
]

function isItemActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href)
}

function getMobileTopbarMeta(pathname: string) {
  if (pathname === "/dashboard") {
    return { section: "Overview", title: "Dashboard" }
  }

  if (pathname === "/dashboard/profile") {
    return { section: "Account", title: "Profile" }
  }

  if (pathname.startsWith("/dashboard/leads/new")) {
    return { section: "Leads", title: "New lead" }
  }

  if (pathname.startsWith("/dashboard/leads/")) {
    return { section: "Leads", title: "Lead details" }
  }

  if (pathname.startsWith("/dashboard/leads")) {
    return { section: "Leads", title: "Lead pipeline" }
  }

  if (pathname.startsWith("/dashboard/clients/new")) {
    return { section: "Clients", title: "Add client" }
  }

  if (pathname.startsWith("/dashboard/clients/")) {
    return { section: "Clients", title: "Client details" }
  }

  if (pathname.startsWith("/dashboard/clients")) {
    return { section: "Clients", title: "Client book" }
  }

  if (pathname.startsWith("/dashboard/service-requests/new")) {
    return { section: "Requests", title: "New request" }
  }

  if (pathname.startsWith("/dashboard/service-requests")) {
    return { section: "Requests", title: "Service requests" }
  }

  if (pathname.startsWith("/dashboard/commissions")) {
    return { section: "Revenue", title: "Commissions" }
  }

  if (pathname.startsWith("/dashboard/learn")) {
    return { section: "Resources", title: "Knowledge base" }
  }

  return { section: "Workspace", title: "Partner portal" }
}

interface SidebarNavProps {
  userName: string
  userEmail: string
  userInitials: string
  hasWorkspaceAccess: boolean
  partnerStatus: string
  contractStatus: string
  isOnboarded: boolean
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: { label: string; href: string; icon: React.ComponentType<{ className?: string }>; createHref?: string }
  active: boolean
  onClick?: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <Link
        href={item.href}
        onClick={onClick}
        className={`group flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
          active
            ? "border border-primary/30 bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
      >
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
            active
              ? "bg-primary/20 text-primary"
              : "bg-secondary text-muted-foreground group-hover:text-foreground"
          }`}
        >
          <item.icon className="h-4 w-4" />
        </div>
        <span className="flex-1">{item.label}</span>
        {active ? <ChevronRight className="h-3.5 w-3.5 text-primary" /> : null}
      </Link>
      {item.createHref ? (
        <Link
          href={item.createHref}
          onClick={onClick}
          title="Create new"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  )
}

function DisabledNavLink({
  item,
}: {
  item: { label: string; href: string; icon: React.ComponentType<{ className?: string }>; createHref?: string }
}) {
  return (
    <div className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm font-medium text-muted-foreground">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
        <item.icon className="h-4 w-4" />
      </div>
      <span className="flex-1">{item.label}</span>
      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
  )
}

function MobileNavLink({
  item,
  active,
  disabled,
  onClick,
}: {
  item: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }
  active: boolean
  disabled: boolean
  onClick?: () => void
}) {
  const content = (
    <>
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${
          active
            ? "bg-primary/18 text-primary"
            : "bg-secondary text-muted-foreground"
        }`}
      >
        <item.icon className="h-4.5 w-4.5" />
      </div>
      <span
        className={`text-[11px] font-medium tracking-[0.04em] ${
          active ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {item.label}
      </span>
    </>
  )

  if (disabled) {
    return (
      <span className="flex min-w-0 flex-1 flex-col items-center gap-1.5 opacity-45">
        {content}
      </span>
    )
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
    >
      {content}
    </Link>
  )
}

function SidebarContent({
  pathname,
  userName,
  userEmail,
  userInitials,
  hasWorkspaceAccess,
  partnerStatus,
  contractStatus,
  isOnboarded,
  onNavClick,
}: {
  pathname: string
  userName: string
  userEmail: string
  userInitials: string
  hasWorkspaceAccess: boolean
  partnerStatus: string
  contractStatus: string
  isOnboarded: boolean
  onNavClick?: () => void
}) {
  const { signOut } = useAuthClient()
  const statusLabel =
    partnerStatus === "pending"
      ? "Pending approval"
      : partnerStatus === "rejected"
        ? "Needs review"
        : partnerStatus === "suspended"
          ? "Suspended"
          : isOnboarded || partnerStatus === "approved"
            ? "Workspace unlocked"
            : "Review in progress"

  const lockedHint =
    partnerStatus === "pending"
      ? "Tabs unlock after review approval."
      : partnerStatus === "rejected"
        ? "Tabs stay locked until the application is cleared."
        : partnerStatus === "suspended"
          ? "Tabs stay locked while access is suspended."
          : isOnboarded || partnerStatus === "approved"
            ? "Workspace is unlocked."
            : "Your application is still under review."

  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
        <div>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Revenue
          </p>
          <div className="mt-3 space-y-1.5">
            {primaryItems.map((item) =>
              hasWorkspaceAccess ? (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isItemActive(pathname, item.href)}
                  onClick={onNavClick}
                />
              ) : (
                <DisabledNavLink key={item.href} item={item} />
              )
            )}
          </div>
          {!hasWorkspaceAccess ? (
            <div className="mt-3 rounded-xl border border-primary/12 bg-primary/6 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                {statusLabel}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--portal-text-soft)]">{lockedHint}</p>
            </div>
          ) : null}
        </div>

        <div>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Resources
          </p>
          <div className="mt-3 space-y-1.5">
            <NavLink
              item={{ label: "Knowledge base", href: "/dashboard/learn", icon: BookOpen, createHref: undefined }}
              active={pathname.startsWith("/dashboard/learn")}
              onClick={onNavClick}
            />
          </div>
        </div>

        <div>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
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

      <div className="border-t border-border p-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-xs font-semibold text-primary">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <ThemeToggle />
          </div>

          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className="secondary-button mt-3 w-full justify-center"
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
  hasWorkspaceAccess,
  partnerStatus,
  contractStatus,
  isOnboarded,
}: SidebarNavProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const mobileTopbar = getMobileTopbarMeta(pathname)

  useEffect(() => {
    if (!mobileOpen) {
      return
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [mobileOpen])

  return (
    <>
      <aside className="hidden w-[300px] shrink-0 xl:w-[320px] lg:block">
        <div className="surface-card-strong sticky top-4 h-[calc(100vh-2rem)] overflow-hidden rounded-[2rem]">
          <SidebarContent
            pathname={pathname}
            userName={userName}
            userEmail={userEmail}
            userInitials={userInitials}
            hasWorkspaceAccess={hasWorkspaceAccess}
            partnerStatus={partnerStatus}
            contractStatus={contractStatus}
            isOnboarded={isOnboarded}
          />
        </div>
      </aside>

      <div className="workspace-mobile-topbar sticky top-3 z-30 mb-3 flex items-center justify-between rounded-[1.6rem] px-5 py-4 lg:hidden">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/70">
            {mobileTopbar.section}
          </p>
          <p className="mt-1 truncate font-heading text-lg font-semibold text-foreground">
            {mobileTopbar.title}
          </p>
        </div>

        <Link
          href="/dashboard/profile"
          aria-label="Open profile"
          className="workspace-mobile-topbar-avatar flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] text-sm font-semibold text-foreground transition-colors hover:border-primary/35 hover:bg-primary/18"
        >
          {userInitials}
        </Link>
      </div>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/60 dark:bg-black/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:hidden">
        <div className="surface-card-strong flex items-center gap-1 rounded-[1.75rem] px-2 py-2 shadow-[0_-8px_40px_rgba(0,0,0,0.45)]">
          {mobilePrimaryItems.map((item) => (
            <MobileNavLink
              key={item.href}
              item={item}
              active={isItemActive(pathname, item.href)}
              disabled={!hasWorkspaceAccess}
            />
          ))}
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open more navigation options"
            className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-[var(--portal-text-soft)]">
              <Menu className="h-4.5 w-4.5" />
            </div>
            <span className="text-[11px] font-medium tracking-[0.04em]">More</span>
          </button>
        </div>
      </div>

      <div
        className={`fixed inset-x-0 bottom-0 z-50 p-3 transition-transform duration-300 sm:p-4 lg:hidden ${
          mobileOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="surface-card-strong relative max-h-[78vh] overflow-hidden rounded-[1.75rem] sm:rounded-[2rem]">
          <div className="flex items-center justify-between border-b border-border px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-foreground">More</p>
              <p className="text-xs text-muted-foreground">Account, commissions, resources</p>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-[min(78vh,720px)] overflow-y-auto">
            <SidebarContent
              pathname={pathname}
              userName={userName}
              userEmail={userEmail}
              userInitials={userInitials}
              hasWorkspaceAccess={hasWorkspaceAccess}
              partnerStatus={partnerStatus}
              contractStatus={contractStatus}
              isOnboarded={isOnboarded}
              onNavClick={() => setMobileOpen(false)}
            />
          </div>
        </div>
      </div>
    </>
  )
}
