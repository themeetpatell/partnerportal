import {
  type Column,
  type InferSelectModel,
  and,
  eq,
  inArray,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm"
import { db, leads, partners, serviceRequests, teamMembers } from "@repo/db"
import { hasAnyTeamRole } from "@/lib/rbac"

export type ScopedTeamMember = Pick<
  InferSelectModel<typeof teamMembers>,
  "id" | "authUserId" | "role" | "rowScope"
>

/** Partner + super Admin roles see all rows regardless of Row Scope dropdown. */
export function bypassesRowScope(role: unknown): boolean {
  return hasAnyTeamRole(role, ["super_admin", "admin"])
}

function normalizeRowScope(raw: string | null | undefined): "all" | "team" | "own" {
  const value = raw?.trim().toLowerCase()
  if (value === "own" || value === "team") {
    return value
  }

  return "all"
}

async function authIdsForScopeMode(
  tenantId: string,
  member: ScopedTeamMember,
  actorAuthUserId: string,
  mode: "own" | "team",
): Promise<string[]> {
  if (mode === "own") {
    return actorAuthUserId ? [actorAuthUserId] : []
  }

  const rows = await db
    .select({ authUserId: teamMembers.authUserId })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.tenantId, tenantId),
        eq(teamMembers.isActive, true),
        eq(teamMembers.role, member.role),
      ),
    )

  const ids = rows.map((row) => row.authUserId).filter(Boolean)

  return ids.length > 0 ? ids : actorAuthUserId ? [actorAuthUserId] : []
}

/** Row-level partner visibility derived from CRM ownership + lead/SR attribution. */
export async function resolvePartnerRowScope(params: {
  tenantId: string
  authUserId: string
  member: ScopedTeamMember
}): Promise<
  | { kind: "unrestricted" }
  | { kind: "restricted"; partnerIds: readonly string[] }
> {
  const { tenantId, authUserId: actorAuthUserId, member } = params

  if (bypassesRowScope(member.role)) {
    return { kind: "unrestricted" }
  }

  const rowMode = normalizeRowScope(member.rowScope)
  if (rowMode === "all") {
    return { kind: "unrestricted" }
  }

  const mode = rowMode === "team" ? "team" : "own"
  const attributionIds = await authIdsForScopeMode(tenantId, member, actorAuthUserId, mode)
  const idSet = new Set<string>()

  const ownedPartners = await db
    .select({ id: partners.id })
    .from(partners)
    .where(
      and(eq(partners.tenantId, tenantId), isNull(partners.deletedAt), eq(partners.ownerId, member.id)),
    )
  ownedPartners.forEach((row) => idSet.add(row.id))

  if (attributionIds.length === 0) {
    return { kind: "restricted", partnerIds: [...idSet].sort() }
  }

  const assigneeConditions: SQL[] = []
  for (const uid of attributionIds) {
    assigneeConditions.push(eq(leads.assignedTo, uid))
    assigneeConditions.push(eq(leads.createdBy, uid))
    assigneeConditions.push(eq(leads.leadOwnerUserId, uid))
    assigneeConditions.push(eq(leads.dealOwnerUserId, uid))
  }

  const leadPartners = await db
    .selectDistinct({ partnerId: leads.partnerId })
    .from(leads)
    .where(
      and(
        eq(leads.tenantId, tenantId),
        isNull(leads.deletedAt),
        assigneeConditions.length > 0 ? or(...assigneeConditions) : sql`false`,
      ),
    )
  leadPartners.forEach((row) => idSet.add(row.partnerId))

  const srConditions: SQL[] = []
  for (const uid of attributionIds) {
    srConditions.push(eq(serviceRequests.assignedTo, uid))
    srConditions.push(eq(serviceRequests.createdBy, uid))
  }

  const srPartners = await db
    .selectDistinct({ partnerId: serviceRequests.partnerId })
    .from(serviceRequests)
    .where(
      and(
        eq(serviceRequests.tenantId, tenantId),
        isNull(serviceRequests.deletedAt),
        srConditions.length > 0 ? or(...srConditions) : sql`false`,
      ),
    )
  srPartners.forEach((row) => idSet.add(row.partnerId))

  return { kind: "restricted", partnerIds: [...idSet].sort() }
}

export function isPartnerReadable(
  scope: Awaited<ReturnType<typeof resolvePartnerRowScope>>,
  partnerId: string,
): boolean {
  if (scope.kind === "unrestricted") {
    return true
  }

  return scope.partnerIds.includes(partnerId)
}

/** Combine with `.where(and(..., partnerScopeWhere(scope, partners.id)))` */
export function partnerScopeWhere(
  scope: Awaited<ReturnType<typeof resolvePartnerRowScope>>,
  partnerIdColumn: Column,
): SQL | undefined {
  if (scope.kind === "unrestricted") {
    return undefined
  }

  if (scope.partnerIds.length === 0) {
    return sql`false`
  }

  return inArray(partnerIdColumn, [...scope.partnerIds])
}

/** Optional route filter `?partnerId=` combined with RBAC scope (unsafe IDs → no rows). */
export function scopedPartnerFilters(
  scope: Awaited<ReturnType<typeof resolvePartnerRowScope>>,
  partnerIdColumn: Column,
  requestedPartnerId?: string | null,
): SQL | undefined {
  if (requestedPartnerId) {
    if (!isPartnerReadable(scope, requestedPartnerId)) {
      return sql`false`
    }
  }

  const scopeSql = partnerScopeWhere(scope, partnerIdColumn)
  const pidClause = requestedPartnerId ? eq(partnerIdColumn, requestedPartnerId) : undefined

  if (pidClause && scopeSql) {
    return and(pidClause, scopeSql)
  }

  return pidClause ?? scopeSql ?? undefined
}

export async function resolvePartnerScopeForActor(params: {
  tenantId: string
  actorUserId: string
  member: ScopedTeamMember | null | undefined
}): Promise<
  | { kind: "unrestricted" }
  | { kind: "restricted"; partnerIds: readonly string[] }
> {
  const { tenantId, actorUserId, member } = params
  if (!member) {
    return { kind: "restricted", partnerIds: [] }
  }

  return resolvePartnerRowScope({
    tenantId,
    authUserId: actorUserId,
    member,
  })
}
