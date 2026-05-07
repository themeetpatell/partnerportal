import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { db, partners, teamMembers, logActivity } from "@repo/db"
import { and, eq, isNull, sql } from "drizzle-orm"
import { rateLimit } from "@repo/auth"
import { getSupabaseAdminClient } from "@repo/auth/admin"
import {
  buildPortalUrl,
  buildSupabaseVerificationUrl,
  sendPartnerPortalActivationEmail,
} from "@repo/notifications"
import { getActorName, getActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import { hasAnyTeamRole, PARTNER_OPERATIONS_ROLES } from "@/lib/rbac"
import { resolvePartnerScopeForActor } from "@/lib/row-scope"

async function resolveRoundRobinPartnershipExecutiveId(tenantId: string) {
  const executives = await db
    .select({
      id: teamMembers.id,
      createdAt: teamMembers.createdAt,
    })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.tenantId, tenantId),
        eq(teamMembers.isActive, true),
        eq(teamMembers.role, "partnership_executive"),
      ),
    )

  if (executives.length === 0) {
    return null
  }

  const partnerLoadRows = await db
    .select({
      ownerId: partners.ownerId,
      count: sql<number>`count(*)::int`,
    })
    .from(partners)
    .where(and(eq(partners.tenantId, tenantId), isNull(partners.deletedAt)))
    .groupBy(partners.ownerId)

  const loadByOwnerId = new Map<string, number>(
    partnerLoadRows
      .filter((row): row is { ownerId: string; count: number } => Boolean(row.ownerId))
      .map((row) => [row.ownerId, Number(row.count) || 0]),
  )

  const sorted = [...executives].sort((a, b) => {
    const loadA = loadByOwnerId.get(a.id) ?? 0
    const loadB = loadByOwnerId.get(b.id) ?? 0
    if (loadA !== loadB) return loadA - loadB
    return a.createdAt.getTime() - b.createdAt.getTime()
  })

  return sorted[0]?.id ?? null
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

type OptionalUrlResult = {
  value: string | null
  error: string | null
}

function normalizeOptionalUrl(value: unknown) {
  const raw = normalizeOptionalText(value)
  if (!raw) return { value: null, error: null } satisfies OptionalUrlResult

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const parsed = new URL(withProtocol)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { error: "website must be a valid http(s) URL", value: null } satisfies OptionalUrlResult
    }
    return { value: parsed.toString(), error: null } satisfies OptionalUrlResult
  } catch {
    return { error: "website must be a valid URL", value: null } satisfies OptionalUrlResult
  }
}

async function ensurePartnerAuthUserId(email: string, fullName: string, currentAuthUserId: string) {
  if (!currentAuthUserId.startsWith("manual_")) {
    return currentAuthUserId
  }

  const supabaseAdmin = getSupabaseAdminClient()
  const { data: createData, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

  if (!createError) {
    return createData.user.id
  }

  if (
    !createError.message?.includes("already been registered") &&
    !createError.message?.includes("already exists")
  ) {
    throw new Error(`Failed to create partner auth account: ${createError.message}`)
  }

  let page = 1
  while (true) {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 })
    const users = data?.users ?? []
    if (users.length === 0) {
      break
    }
    const existingUser = users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (existingUser) {
      return existingUser.id
    }
    page += 1
  }

  throw new Error("Partner auth account exists but could not be resolved.")
}

async function sendPartnerActivationLinkEmail(params: {
  email: string
  contactName: string
}) {
  const supabaseAdmin = getSupabaseAdminClient()
  const { data: linkData, error: linkError } =
    await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: params.email,
      options: { redirectTo: buildPortalUrl("partner", "/reset-password") },
    })

  if (linkError || !linkData?.properties) {
    throw new Error(linkError?.message ?? "Failed to generate activation link")
  }

  const activationUrl = buildSupabaseVerificationUrl(
    "partner",
    "/reset-password",
    linkData.properties
  )

  await sendPartnerPortalActivationEmail(
    params.email,
    params.contactName,
    activationUrl
  )
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limited = rateLimit(`admin-partners:create:${userId}`, 20, 60_000)
  if (limited) return limited

  const actorName = await getActorName()
  const member = await getActiveTeamMember(userId)
  const tenantId = getRequiredTenantId()

  // Only admin or partnership roles may create partners
  if (!member || !hasAnyTeamRole(member.role, PARTNER_OPERATIONS_ROLES)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const scope = await resolvePartnerScopeForActor({
    tenantId,
    actorUserId: userId,
    member,
  })

  const body = await req.json()
  const {
    companyName,
    contactName,
    email,
    phone,
    type,
    tier,
    country,
    city,
    designation,
    secondaryEmail,
    website,
    linkedinId,
    nationality,
    businessSize,
    partnerIndustry,
    partnerAddress,
    ownerId,
    agreementUrl,
    commissionModelId,
    sendActivationLink = false,
  } = body

  const roundRobinOwnerId =
    scope.kind === "restricted" ? null : await resolveRoundRobinPartnershipExecutiveId(tenantId)

  const resolvedOwnerId =
    scope.kind === "restricted" ? member.id : ownerId ? String(ownerId) : null
  const finalOwnerId = resolvedOwnerId ?? roundRobinOwnerId

  if (!companyName || !contactName || !email || !type) {
    return NextResponse.json(
      { error: "companyName, contactName, email, type are required" },
      { status: 400 }
    )
  }

  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : ""

  if (!normalizedEmail) {
    return NextResponse.json({ error: "email is required" }, { status: 400 })
  }

  const normalizedWebsite = normalizeOptionalUrl(website)
  if (normalizedWebsite.error) {
    return NextResponse.json({ error: normalizedWebsite.error }, { status: 400 })
  }

  // Duplicate email check — prevent two active partner records for the same email
  const [existingPartner] = await db
    .select({ id: partners.id })
    .from(partners)
    .where(and(
      eq(partners.email, normalizedEmail),
      eq(partners.tenantId, tenantId),
      isNull(partners.deletedAt)
    ))
    .limit(1)

  if (existingPartner) {
    return NextResponse.json(
      { error: "A partner with this email already exists", duplicateId: existingPartner.id },
      { status: 409 }
    )
  }

  // Generate a placeholder authUserId for manually-created partners (no auth account yet)
  const placeholderAuthUserId = `manual_${crypto.randomUUID()}`

  const [created] = await db
    .insert(partners)
    .values({
      tenantId,
      authUserId: placeholderAuthUserId,
      companyName,
      contactName,
      email: normalizedEmail,
      phone: normalizeOptionalText(phone),
      type,
      tier: normalizeOptionalText(tier),
      country: normalizeOptionalText(country),
      city: normalizeOptionalText(city),
      channel: "manual",
      ownerId: finalOwnerId,
      agreementUrl: normalizeOptionalText(agreementUrl),
      commissionModelId: normalizeOptionalText(commissionModelId),
      status: "pending",
      designation: normalizeOptionalText(designation),
      secondaryEmail: normalizeOptionalText(secondaryEmail),
      website: normalizedWebsite.value,
      linkedinId: normalizeOptionalText(linkedinId),
      nationality: normalizeOptionalText(nationality),
      businessSize: normalizeOptionalText(businessSize),
      partnerIndustry: normalizeOptionalText(partnerIndustry),
      partnerAddress: normalizeOptionalText(partnerAddress),
    })
    .returning()

  await logActivity({
    tenantId,
    entityType: "partner",
    entityId: created!.id,
    actorId: userId,
    actorName,
    action: "created",
    note: `Partner profile created manually by ${actorName}. Status: pending`,
  })

  let activationLinkSent = false
  let activationLinkError: string | null = null

  if (sendActivationLink === true) {
    try {
      const resolvedAuthUserId = await ensurePartnerAuthUserId(
        normalizedEmail,
        contactName,
        created.authUserId
      )

      if (resolvedAuthUserId !== created.authUserId) {
        await db
          .update(partners)
          .set({ authUserId: resolvedAuthUserId, updatedAt: new Date() })
          .where(eq(partners.id, created.id))
      }

      await sendPartnerActivationLinkEmail({
        email: normalizedEmail,
        contactName,
      })

      await logActivity({
        tenantId,
        entityType: "partner",
        entityId: created.id,
        actorId: userId,
        actorName,
        action: "partner.activation_link.sent",
        note: `Portal activation email sent to ${normalizedEmail}.`,
      })

      activationLinkSent = true
    } catch (error) {
      activationLinkError =
        error instanceof Error
          ? error.message
          : "Activation link failed to send."

      console.error("[POST /api/admin/partners] Activation link error:", error)
    }
  }

  return NextResponse.json(
    { ...created, activationLinkSent, activationLinkError },
    { status: 201 }
  )
}
