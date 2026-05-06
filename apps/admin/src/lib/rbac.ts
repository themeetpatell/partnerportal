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

/** Values persisted on `team_members.role` (migration 0020 aligns legacy rows). */
export type CanonicalTeamRole =
  | "super_admin"
  | "admin"
  | "partnership_executive"
  | "partnership_manager"
  | "finance"
  | "sales_representative"
  | "pre_sales_representative"
  | "operation_manager"
  | "viewer"

export const TEAM_ROLE_ORDER: CanonicalTeamRole[] = [
  "super_admin",
  "admin",
  "partnership_executive",
  "partnership_manager",
  "operation_manager",
  "sales_representative",
  "pre_sales_representative",
  "finance",
  "viewer",
]

const LEGACY_ROLE_ALIASES: Record<string, CanonicalTeamRole> = {
  super_admin: "super_admin",
  admin: "admin",
  partnership_executive: "partnership_executive",
  partnership_manager: "partnership_manager",
  finance: "finance",
  sales_representative: "sales_representative",
  pre_sales_representative: "pre_sales_representative",
  operation_manager: "operation_manager",
  viewer: "viewer",

  // Legacy slugs / imports from other systems
  partnership: "partnership_manager",
  sales: "sales_representative",
  appointment_setter: "pre_sales_representative",
  sdr: "pre_sales_representative",
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
  partnership_executive: {
    label: "Partnership Executive",
    color: "bg-violet-950/60 border-violet-800/40 text-violet-300",
    summary: "Strategic partner portfolio, commercials alignment, and executive stakeholder coverage",
  },
  partnership_manager: {
    label: "Partnership Manager",
    color: "bg-indigo-950/60 border-indigo-800/40 text-indigo-300",
    summary: "Partner lifecycle, activation, approvals, and day-to-day relationship management",
  },
  operation_manager: {
    label: "Operation Manager",
    color: "bg-teal-950/60 border-teal-800/40 text-teal-300",
    summary: "Delivery coordination, service fulfilment, SLAs, and cross-team orchestration",
  },
  sales_representative: {
    label: "Sales Representative",
    color: "bg-cyan-950/60 border-cyan-800/40 text-cyan-300",
    summary: "Deal owner — proposals, commercials, negotiation, and close / won updates",
  },
  pre_sales_representative: {
    label: "Pre-sales Representative",
    color: "bg-sky-950/60 border-sky-800/40 text-sky-300",
    summary: "Lead owner — first response, qualification, discovery, and early pipeline motion",
  },
  finance: {
    label: "Finance",
    color: "bg-yellow-950/60 border-yellow-800/40 text-yellow-300",
    summary:
      "Invoices, commissions, finance reporting, and creating service requests on behalf of partners",
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
  partnership_executive: {
    partners: "rw",
    leads: "rw",
    services: "rw",
    invoices: "rw",
    commissions: "r",
    users: "",
    analytics: "rw",
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
  operation_manager: {
    partners: "r",
    leads: "rw",
    services: "rw",
    invoices: "r",
    commissions: "r",
    users: "",
    analytics: "r",
  },
  sales_representative: {
    partners: "r",
    leads: "rw",
    services: "rw",
    invoices: "",
    commissions: "",
    users: "",
    analytics: "r",
  },
  pre_sales_representative: {
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
    services: "rw",
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

/** Partner approvals, lifecycle, CRM-style partner edits */
export const PARTNER_OPERATIONS_ROLES: CanonicalTeamRole[] = [
  "super_admin",
  "admin",
  "partnership_executive",
  "partnership_manager",
]

/** Lead intake, pipeline edits, sync, notes */
export const LEAD_PIPELINE_ROLES: CanonicalTeamRole[] = [
  "super_admin",
  "admin",
  "partnership_executive",
  "partnership_manager",
  "pre_sales_representative",
  "sales_representative",
  "operation_manager",
]

export const FINANCE_ROLES: CanonicalTeamRole[] = [
  "super_admin",
  "admin",
  "finance",
]

export const ANALYTICS_EXPORT_ROLES: CanonicalTeamRole[] = [
  "super_admin",
  "admin",
  "partnership_executive",
  "partnership_manager",
  "finance",
]

export const LEAD_NOTES_ROLES: CanonicalTeamRole[] = [
  ...LEAD_PIPELINE_ROLES,
  "finance",
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
    const parsed = typeof value === "string" ? JSON.parse(value) : value

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

/** Team member picklists: partnership executive pool */
export function isPreSalesAssignableRole(role: unknown): boolean {
  const n = normalizeTeamRole(role)
  if (!n) return false
  return (
    n === "pre_sales_representative" ||
    n === "super_admin" ||
    n === "admin" ||
    n === "partnership_executive"
  )
}

/** Deal owner pool (sales-led) */
export function isDealOwnerAssignableRole(role: unknown): boolean {
  const n = normalizeTeamRole(role)
  if (!n) return false
  return (
    n === "sales_representative" ||
    n === "super_admin" ||
    n === "admin" ||
    n === "partnership_executive" ||
    n === "partnership_manager" ||
    n === "operation_manager"
  )
}

/** Partnership manager assignment on partner record */
export function isPartnershipManagerAssignableRole(role: unknown): boolean {
  const n = normalizeTeamRole(role)
  if (!n) return false
  return (
    n === "partnership_manager" ||
    n === "partnership_executive" ||
    n === "super_admin" ||
    n === "admin"
  )
}
