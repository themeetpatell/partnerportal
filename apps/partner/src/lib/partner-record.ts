import { db, partners } from "@repo/db"
import { eq } from "drizzle-orm"

export async function getPartnerRecordByAuthUserId(userId: string) {
  const [partner] = await db
    .select()
    .from(partners)
    .where(eq(partners.authUserId, userId))
    .limit(1)

  return partner ?? null
}

export function hasApprovedWorkspaceAccess(
  partner: { status: string; onboardedAt?: Date | string | null } | null | undefined,
) {
  return partner?.status === "approved" && Boolean(partner.onboardedAt)
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
