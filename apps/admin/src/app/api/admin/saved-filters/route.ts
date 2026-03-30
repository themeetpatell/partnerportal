import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, savedFilters } from "@repo/db"
import { eq, and } from "drizzle-orm"

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { name, context, filters } = body

  if (!name || !context) {
    return NextResponse.json({ error: "name and context are required" }, { status: 400 })
  }

  const tenantId = process.env.DEFAULT_TENANT_ID!

  const [created] = await db
    .insert(savedFilters)
    .values({
      tenantId,
      userId,
      name,
      context,
      filters: JSON.stringify(filters ?? {}),
    })
    .returning()

  return NextResponse.json(created)
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  await db
    .delete(savedFilters)
    .where(and(eq(savedFilters.id, id), eq(savedFilters.userId, userId)))

  return NextResponse.json({ ok: true })
}
