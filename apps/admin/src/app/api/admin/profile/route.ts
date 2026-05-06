import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@repo/auth/server"
import { getSupabaseAdminClient } from "@repo/auth/admin"
import { and, eq } from "drizzle-orm"
import { db, teamMembers, logActivity } from "@repo/db"
import { rateLimit } from "@repo/auth"
import { getActorName, getActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"

const patchSchema = z.object({
  firstName: z.string().max(100),
  lastName: z.string().max(100),
  email: z.string().email().max(255),
  phone: z.string().max(50),
  designation: z.string().max(200),
})

export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limited = rateLimit(`admin-profile:patch:${userId}`, 30, 60_000)
  if (limited) return limited

  const member = await getActiveTeamMember(userId)
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Validation failed"
    return NextResponse.json({ error: msg }, { status: 422 })
  }

  const data = parsed.data
  const tenantId = getRequiredTenantId()

  const nextFirst = data.firstName.trim() || null
  const nextLast = data.lastName.trim() || null
  const combined = [nextFirst, nextLast].filter(Boolean).join(" ").trim()

  const updates: Partial<typeof teamMembers.$inferInsert> = {
    updatedAt: new Date(),
    firstName: nextFirst,
    lastName: nextLast,
    name: combined.length > 0 ? combined : member.name,
    phone: data.phone.trim() || null,
    designation: data.designation.trim() || null,
  }

  const nextEmail = data.email.trim().toLowerCase()
  if (nextEmail !== member.email.trim().toLowerCase()) {
    try {
      const admin = getSupabaseAdminClient()
      const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
        email: nextEmail,
      })
      if (authErr) {
        return NextResponse.json(
          { error: authErr.message || "Could not update sign-in email." },
          { status: 422 },
        )
      }
      updates.email = nextEmail
    } catch (e) {
      const message = e instanceof Error ? e.message : "Auth service unavailable."
      return NextResponse.json({ error: message }, { status: 503 })
    }
  }

  const [updated] = await db
    .update(teamMembers)
    .set(updates)
    .where(and(eq(teamMembers.id, member.id), eq(teamMembers.tenantId, tenantId)))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: "Could not save profile" }, { status: 500 })
  }

  try {
    const admin = getSupabaseAdminClient()
    await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        first_name: nextFirst ?? "",
        last_name: nextLast ?? "",
        full_name: combined || updated.name,
      },
    })
  } catch {
    /* non-fatal */
  }

  const actorName = await getActorName()
  await logActivity({
    tenantId,
    entityType: "team_member",
    entityId: member.id,
    actorId: userId,
    actorName,
    action: "team_member.profile_updated",
  })

  return NextResponse.json({ member: updated })
}
