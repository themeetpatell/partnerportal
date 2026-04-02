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
  partner: { status: string } | null | undefined,
) {
  return partner?.status === "approved"
}
