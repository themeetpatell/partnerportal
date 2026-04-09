import { cache } from "react"
import { currentUser } from "@repo/auth/server"
import { db, teamMembers } from "@repo/db"
import { and, eq, ilike } from "drizzle-orm"

const getActiveTeamMemberLookup = cache(
  async function getActiveTeamMemberLookup(userId: string, email?: string | null) {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.authUserId, userId), eq(teamMembers.isActive, true)))
      .limit(1)

    if (member) {
      return member
    }

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
)

export async function getActiveTeamMember(userId: string, email?: string | null) {
  return getActiveTeamMemberLookup(userId, email?.trim().toLowerCase() || null)
}

export const getCurrentActiveTeamMember = cache(
  async function getCurrentActiveTeamMember() {
    const user = await currentUser()

    if (!user?.id) {
      return null
    }

    return getActiveTeamMember(user.id, user.email)
  }
)

export async function getActorName() {
  const user = await currentUser()

  return (
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Admin"
  )
}
