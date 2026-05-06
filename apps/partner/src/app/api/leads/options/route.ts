import { auth } from "@repo/auth/server"
import { LEAD_SERVICE_OPTIONS } from "@repo/types"
import { NextResponse } from "next/server"
import { db, partners } from "@repo/db"
import { eq } from "drizzle-orm"

async function getPartner(userId: string) {
  const [partner] = await db
    .select()
    .from(partners)
    .where(eq(partners.authUserId, userId))
    .limit(1)

  return partner ?? null
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    }

    const partner = await getPartner(userId)
    if (!partner) {
      return NextResponse.json(
        {
          serviceOptions: [],
          source: "catalog",
        },
        { status: 200 },
      )
    }

    return NextResponse.json({
      serviceOptions: [...LEAD_SERVICE_OPTIONS],
      source: "catalog",
    })
  } catch (error) {
    console.error("[GET /api/leads/options] Error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    )
  }
}
