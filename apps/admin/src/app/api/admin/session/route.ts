import { NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { getActiveTeamMember } from "@/lib/admin-auth"

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const teamMember = await getActiveTeamMember(userId)

  if (!teamMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json({
    userId,
    role: teamMember.role,
  })
}
