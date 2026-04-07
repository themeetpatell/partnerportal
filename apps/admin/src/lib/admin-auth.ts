import { currentUser } from "@repo/auth/server"
import { db, teamMembers } from "@repo/db"
import { and, eq, ilike } from "drizzle-orm"

export async function getActiveTeamMember(userId: string, email?: string | null) {
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.authUserId, userId), eq(teamMembers.isActive, true)))
    .limit(1)

  if (member) {
    return member
  }

  // Email fallback: try to link an existing team member by email.
  // Accept email as a parameter to avoid a redundant currentUser() call
  // when the caller already has the user object.
  const normalizedEmail = email?.trim().toLowerCase()

  if (!normalizedEmail) {
    return null
  }

  const [memberByEmail] = await db
    .select()
    .from(teamMembers)
    .where(and(ilike(teamMembers.email, normalizedEmail), eq(teamMembers.isActive, true)))
    .limit(1)

  if (!memberByEmail) {
    return null
  }

  await db
    .update(teamMembers)
    .set({ authUserId: userId, updatedAt: new Date() })
    .where(eq(teamMembers.id, memberByEmail.id))

  return {
    ...memberByEmail,
    authUserId: userId,
    updatedAt: new Date(),
  }
}

export async function getActorName() {
  const user = await currentUser()

  return (
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Admin"
  )
}
