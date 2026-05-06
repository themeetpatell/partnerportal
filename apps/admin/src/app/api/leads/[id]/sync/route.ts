import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { rateLimit } from "@repo/auth"
import { getActiveTeamMember } from "@/lib/admin-auth"
import { hasAnyTeamRole, LEAD_PIPELINE_ROLES } from "@/lib/rbac"

function getRedirectTarget(request: NextRequest, leadId: string) {
  const url = new URL(request.url)
  return url.searchParams.get("redirectTo") || `/leads/${leadId}`
}

function maybeRedirect(request: NextRequest, leadId: string) {
  const accept = request.headers.get("accept") || ""
  const contentType = request.headers.get("content-type") || ""

  if (!accept.includes("text/html") && contentType.includes("application/json")) {
    return null
  }

  const redirectUrl = new URL(getRedirectTarget(request, leadId), request.url)
  redirectUrl.searchParams.set("status", "error")
  redirectUrl.searchParams.set("next", "sync_removed")
  return NextResponse.redirect(redirectUrl)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = rateLimit(`lead-sync:${userId}`, 10, 60_000)
  if (limited) return limited

  const { id } = await params
  const member = await getActiveTeamMember(userId)
  if (!member || !hasAnyTeamRole(member.role, LEAD_PIPELINE_ROLES)) {
    const redirect = maybeRedirect(req, id)
    if (redirect) return redirect

    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const redirect = maybeRedirect(req, id)
  if (redirect) return redirect

  return NextResponse.json(
    { error: "Lead sync has been removed. Update pipeline status directly." },
    { status: 410 },
  )
}
