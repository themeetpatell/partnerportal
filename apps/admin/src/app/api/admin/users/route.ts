import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { db, teamMembers, logActivity } from "@repo/db"
import { and, eq } from "drizzle-orm"

const TENANT_ID = process.env.DEFAULT_TENANT_ID!

// Default permission matrices per role
const ROLE_PERMISSIONS: Record<string, Record<string, string>> = {
  admin: {
    partners: "rw", leads: "rw", services: "rw",
    invoices: "rw", commissions: "rw", users: "rw", analytics: "r",
  },
  partnership: {
    partners: "rw", leads: "rw", services: "rw",
    invoices: "r", commissions: "r", users: "r", analytics: "r",
  },
  sales: {
    partners: "r", leads: "rw", services: "r",
    invoices: "r", commissions: "r", users: "", analytics: "r",
  },
  appointment_setter: {
    partners: "r", leads: "rw", services: "",
    invoices: "", commissions: "", users: "", analytics: "",
  },
  finance: {
    partners: "r", leads: "r", services: "r",
    invoices: "rw", commissions: "rw", users: "", analytics: "r",
  },
  viewer: {
    partners: "r", leads: "r", services: "r",
    invoices: "r", commissions: "r", users: "", analytics: "r",
  },
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.tenantId, TENANT_ID))
    .orderBy(teamMembers.createdAt)

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await currentUser()
  const actorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.emailAddresses[0]?.emailAddress ||
    "Admin"

  // Only admin can create users
  const [caller] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.clerkUserId, userId), eq(teamMembers.isActive, true)))
    .limit(1)

  if (caller && caller.role !== "admin") {
    return NextResponse.json({ error: "Forbidden — Admin only" }, { status: 403 })
  }

  const body = await req.json()
  const { clerkUserId, name, email, role, rowScope = "all", permissions } = body

  if (!clerkUserId || !name || !email || !role) {
    return NextResponse.json(
      { error: "clerkUserId, name, email, role are required" },
      { status: 400 }
    )
  }

  const validRoles = ["admin", "partnership", "sales", "appointment_setter", "finance", "viewer"]
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }, { status: 400 })
  }

  // Use provided permissions or default to role matrix
  const resolvedPermissions = permissions ?? ROLE_PERMISSIONS[role] ?? {}

  const [created] = await db
    .insert(teamMembers)
    .values({
      tenantId: TENANT_ID,
      clerkUserId,
      name,
      email,
      role,
      rowScope,
      permissions: JSON.stringify(resolvedPermissions),
      isActive: true,
    })
    .returning()

  await logActivity({
    tenantId: TENANT_ID,
    entityType: "team_member",
    entityId: created!.id,
    actorId: userId,
    actorName,
    action: "created",
    note: `User ${name} (${role}) created by ${actorName}`,
  })

  return NextResponse.json(created, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [caller] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.clerkUserId, userId), eq(teamMembers.isActive, true)))
    .limit(1)

  if (caller && caller.role !== "admin") {
    return NextResponse.json({ error: "Forbidden — Admin only" }, { status: 403 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const body = await req.json()
  const { role, rowScope, permissions, isActive } = body

  const updates: Partial<typeof teamMembers.$inferInsert> = {}
  if (role !== undefined) updates.role = role
  if (rowScope !== undefined) updates.rowScope = rowScope
  if (permissions !== undefined) updates.permissions = JSON.stringify(permissions)
  if (isActive !== undefined) updates.isActive = isActive

  const [updated] = await db
    .update(teamMembers)
    .set(updates)
    .where(eq(teamMembers.id, id))
    .returning()

  return NextResponse.json(updated)
}
