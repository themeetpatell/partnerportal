import { NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { getCurrentActiveTeamMember } from "@/lib/admin-auth"

export async function GET() {
  const [{ userId }, teamMember] = await Promise.all([
    auth(),
    getCurrentActiveTeamMember(),
  ])

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!teamMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json({
    userId,
    role: teamMember.role,
  })
}
