import { NextRequest, NextResponse } from "next/server"
import { processDueRecurringCommissionsFromLeads } from "@/lib/create-lead-commissions"

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) return process.env.NODE_ENV === "development"
  return req.headers.get("authorization") === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const stats = await processDueRecurringCommissionsFromLeads(new Date())
    return NextResponse.json({ ok: true, ...stats })
  } catch (e) {
    console.error("[cron/recurring-commissions]", e)
    return NextResponse.json({ error: "Job failed" }, { status: 500 })
  }
}
