import { currentUser } from "@clerk/nextjs/server"
import { db, teamMembers } from "@repo/db"
import { and, eq } from "drizzle-orm"

export async function getActiveTeamMember(userId: string) {
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.clerkUserId, userId), eq(teamMembers.isActive, true)))
    .limit(1)

  return member ?? null
}

export async function getActorName() {
  const user = await currentUser()

  return (
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.emailAddresses[0]?.emailAddress ||
    "Admin"
  )
}
