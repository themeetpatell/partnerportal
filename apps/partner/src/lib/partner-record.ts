import { cache } from "react"
import { currentUser } from "@repo/auth/server"
import { db, partners } from "@repo/db"
import { and, desc, eq, ilike, isNull } from "drizzle-orm"

const getPartnerRecordLookup = cache(
  async function getPartnerRecordLookup(userId: string, email?: string | null) {
    const [partner] = await db
      .select()
      .from(partners)
      .where(and(eq(partners.authUserId, userId), isNull(partners.deletedAt)))
      .limit(1)

    if (partner) {
      return partner
    }

    const normalizedEmail = email?.trim().toLowerCase()

    if (!normalizedEmail) {
      return null
    }

    const [partnerByEmail] = await db
      .select()
      .from(partners)
      .where(and(ilike(partners.email, normalizedEmail), isNull(partners.deletedAt)))
      .orderBy(desc(partners.updatedAt), desc(partners.createdAt))
      .limit(1)

    if (!partnerByEmail) {
      return null
    }

    const [linkedPartner] = await db
      .update(partners)
      .set({
        authUserId: userId,
        updatedAt: new Date(),
      })
      .where(eq(partners.id, partnerByEmail.id))
      .returning()

    return linkedPartner ?? partnerByEmail
  }
)

export async function getPartnerRecordByAuthUserId(userId: string) {
  return getPartnerRecordForAuthenticatedUser({ userId })
}

export async function getPartnerRecordForAuthenticatedUser(params: {
  userId: string
  email?: string | null
}) {
  return getPartnerRecordLookup(params.userId, params.email?.trim().toLowerCase() || null)
}

export const getCurrentPartnerRecord = cache(async function getCurrentPartnerRecord() {
  const user = await currentUser()

  if (!user?.id) {
    return null
  }

  return getPartnerRecordForAuthenticatedUser({
    userId: user.id,
    email: user.email,
  })
})

export function hasApprovedWorkspaceAccess(
  partner: { status: string; onboardedAt?: Date | string | null } | null | undefined,
) {
  return partner?.status === "approved"
}

export async function getPartnerPostAuthRoute(userId: string) {
  const partner = await getPartnerRecordByAuthUserId(userId)

  if (!partner) {
    return "/onboarding"
  }

  if (hasApprovedWorkspaceAccess(partner)) {
    return "/dashboard"
  }

  return "/dashboard/profile"
}
