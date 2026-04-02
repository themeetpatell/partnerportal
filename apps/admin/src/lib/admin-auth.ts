import { currentUser } from "@repo/auth/server"
import { db, teamMembers } from "@repo/db"
import { and, eq, ilike } from "drizzle-orm"

export async function getActiveTeamMember(userId: string) {
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.authUserId, userId), eq(teamMembers.isActive, true)))
    .limit(1)

  if (member) {
    return member
  }

  const user = await currentUser()
  const email = user?.email?.trim().toLowerCase()

  if (!email) {
    return null
  }

  const [memberByEmail] = await db
    .select()
    .from(teamMembers)
    .where(and(ilike(teamMembers.email, email), eq(teamMembers.isActive, true)))
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
