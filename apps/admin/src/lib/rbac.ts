export const ACCESS_MODULES = [
  "partners",
  "leads",
  "services",
  "invoices",
  "commissions",
  "users",
  "analytics",
] as const

export type AccessModule = (typeof ACCESS_MODULES)[number]
export type AccessLevel = "" | "r" | "rw"

export type CanonicalTeamRole =
  | "super_admin"
  | "admin"
  | "partnership_manager"
  | "sdr"
  | "finance"
  | "viewer"

export const TEAM_ROLE_ORDER: CanonicalTeamRole[] = [
  "super_admin",
  "admin",
  "partnership_manager",
  "sdr",
  "finance",
  "viewer",
]

const LEGACY_ROLE_ALIASES: Record<string, CanonicalTeamRole> = {
  // New canonical roles
  super_admin: "super_admin",
  admin: "admin",
  partnership_manager: "partnership_manager",
  sdr: "sdr",
  finance: "finance",
  viewer: "viewer",

  // Backward compatibility with existing records/routes
  partnership: "partnership_manager",
  sales: "sdr",
  appointment_setter: "sdr",
}

export const TEAM_ROLE_META: Record<
  CanonicalTeamRole,
  { label: string; color: string; summary: string }
> = {
  super_admin: {
    label: "Super Admin",
    color: "bg-fuchsia-950/60 border-fuchsia-800/40 text-fuchsia-300",
    summary: "Platform-wide control and privileged administration",
  },
  admin: {
    label: "Admin",
    color: "bg-red-950/60 border-red-800/40 text-red-400",
    summary: "Full business operations access",
  },
  partnership_manager: {
    label: "Partnership Manager",
    color: "bg-indigo-950/60 border-indigo-800/40 text-indigo-300",
    summary: "Partner lifecycle, activation, approvals, and relationship management",
  },
  sdr: {
    label: "SDR Team",
    color: "bg-cyan-950/60 border-cyan-800/40 text-cyan-300",
    summary: "Lead qualification, pipeline updates, and on-behalf submissions",
  },
  finance: {
    label: "Finance",
    color: "bg-yellow-950/60 border-yellow-800/40 text-yellow-300",
    summary: "Invoices, commissions, and finance reporting",
  },
  viewer: {
    label: "Viewer",
    color: "bg-zinc-800 border-zinc-700 text-zinc-400",
    summary: "Read-only visibility",
  },
}

export const ROLE_DEFAULT_PERMISSIONS: Record<
  CanonicalTeamRole,
  Record<AccessModule, AccessLevel>
> = {
  super_admin: {
    partners: "rw",
    leads: "rw",
    services: "rw",
    invoices: "rw",
    commissions: "rw",
    users: "rw",
    analytics: "rw",
  },
  admin: {
    partners: "rw",
    leads: "rw",
    services: "rw",
    invoices: "rw",
    commissions: "rw",
    users: "rw",
    analytics: "r",
  },
  partnership_manager: {
    partners: "rw",
    leads: "rw",
    services: "rw",
    invoices: "r",
    commissions: "r",
    users: "",
    analytics: "r",
  },
  sdr: {
    partners: "r",
    leads: "rw",
    services: "rw",
    invoices: "",
    commissions: "",
    users: "",
    analytics: "r",
  },
  finance: {
    partners: "r",
    leads: "r",
    services: "r",
    invoices: "rw",
    commissions: "rw",
    users: "",
    analytics: "r",
  },
  viewer: {
    partners: "r",
    leads: "r",
    services: "r",
    invoices: "r",
    commissions: "r",
    users: "",
    analytics: "r",
  },
}

export const TEAM_ROLE_OPTIONS = TEAM_ROLE_ORDER.map((value) => ({
  value,
  label: TEAM_ROLE_META[value].label,
  desc: TEAM_ROLE_META[value].summary,
}))

export const USER_MANAGEMENT_ROLES: CanonicalTeamRole[] = [
  "super_admin",
  "admin",
]

export function normalizeTeamRole(role: unknown): CanonicalTeamRole | null {
  if (typeof role !== "string") {
    return null
  }

  return LEGACY_ROLE_ALIASES[role] ?? null
}

export function hasAnyTeamRole(
  role: unknown,
  allowedRoles: CanonicalTeamRole[],
): boolean {
  const normalized = normalizeTeamRole(role)
  if (!normalized) {
    return false
  }

  return allowedRoles.includes(normalized)
}

export function getDefaultPermissionsForRole(role: unknown) {
  const normalized = normalizeTeamRole(role)
  if (!normalized) {
    return null
  }

  return ROLE_DEFAULT_PERMISSIONS[normalized]
}

export function parseTeamPermissions(value: unknown): Partial<
  Record<AccessModule, AccessLevel>
> {
  if (!value) {
    return {}
  }

  try {
    const parsed =
      typeof value === "string"
        ? JSON.parse(value)
        : value

    if (!parsed || typeof parsed !== "object") {
      return {}
    }

    const resolved: Partial<Record<AccessModule, AccessLevel>> = {}

    for (const accessModule of ACCESS_MODULES) {
      const level = (parsed as Record<string, unknown>)[accessModule]
      if (level === "" || level === "r" || level === "rw") {
        resolved[accessModule] = level
      }
    }

    return resolved
  } catch {
    return {}
  }
}

export function getResolvedPermissions(
  role: unknown,
  permissions?: unknown,
): Record<AccessModule, AccessLevel> {
  return {
    ...ROLE_DEFAULT_PERMISSIONS.viewer,
    ...(getDefaultPermissionsForRole(role) ?? {}),
    ...parseTeamPermissions(permissions),
  }
}

export function hasModuleAccess(
  role: unknown,
  permissions: unknown,
  module: AccessModule,
  requiredLevel: AccessLevel = "r",
) {
  const level = getResolvedPermissions(role, permissions)[module]

  if (requiredLevel === "rw") {
    return level === "rw"
  }

  return level === "r" || level === "rw"
}

export function getTeamRoleLabel(role: unknown) {
  const normalized = normalizeTeamRole(role)
  if (!normalized) {
    return "Viewer"
  }

  return TEAM_ROLE_META[normalized].label
}

export function getTeamRoleMeta(role: unknown) {
  const normalized = normalizeTeamRole(role)
  if (!normalized) {
    return TEAM_ROLE_META.viewer
  }

  return TEAM_ROLE_META[normalized]
}
