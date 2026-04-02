import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { rateLimit } from "@repo/auth"
import { getActiveTeamMember } from "@/lib/admin-auth"
import { hasAnyTeamRole } from "@/lib/rbac"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = rateLimit(`lead-status:${userId}`, 30, 60_000)
  if (limited) return limited

  const member = await getActiveTeamMember(userId)
  if (!member || !hasAnyTeamRole(member.role, ["super_admin", "admin", "partnership_manager", "sdr"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const redirectTo = new URL(req.url).searchParams.get("redirectTo") || `/leads/${id}`
  const redirectUrl = new URL(redirectTo, req.url)
  redirectUrl.searchParams.set("sync", "required")

  if ((req.headers.get("accept") || "").includes("text/html")) {
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.json(
    {
      error: "Lead status is controlled by Zoho CRM. Sync the lead from CRM instead of changing it manually.",
    },
    { status: 409 },
  )
}
