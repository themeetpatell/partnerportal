import { NextRequest, NextResponse } from "next/server"
import { db, partners, leads, commissions } from "@repo/db"
import { and, eq, isNotNull } from "drizzle-orm"
import {
  sendDailyMorningBriefingEmail,
  type DailyBriefingStats,
  type DailyBriefingActiveLead,
} from "@repo/notifications"

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) return process.env.NODE_ENV === "development"
  return req.headers.get("authorization") === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const activePartners = await db
    .select()
    .from(partners)
    .where(and(eq(partners.status, "approved"), isNotNull(partners.onboardedAt)))

  let sent = 0
  let failed = 0

  for (const partner of activePartners) {
    if (!partner.email) continue

    try {
      const [partnerLeads, partnerCommissions] = await Promise.all([
        db
          .select({
            id: leads.id,
            customerName: leads.customerName,
            customerCompany: leads.customerCompany,
            status: leads.status,
            createdAt: leads.createdAt,
          })
          .from(leads)
          .where(eq(leads.partnerId, partner.id)),
        db
          .select({ amount: commissions.amount, status: commissions.status })
          .from(commissions)
          .where(eq(commissions.partnerId, partner.id)),
      ])

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const msPerDay = 1000 * 60 * 60 * 24

      const activeLeads: DailyBriefingActiveLead[] = partnerLeads
        .filter((l) =>
          l.status === "submitted" || l.status === "qualified" || l.status === "proposal_sent"
        )
        .map((l) => ({
          name: l.customerName,
          company: l.customerCompany,
          status: l.status as DailyBriefingActiveLead["status"],
          daysInPipeline: l.createdAt
            ? Math.floor((now.getTime() - new Date(l.createdAt).getTime()) / msPerDay)
            : 0,
        }))
        .sort((a, b) => b.daysInPipeline - a.daysInPipeline)

      const stats: DailyBriefingStats = {
        pipeline: {
          submitted: partnerLeads.filter((l) => l.status === "submitted").length,
          qualified: partnerLeads.filter((l) => l.status === "qualified").length,
          proposalSent: partnerLeads.filter((l) => l.status === "proposal_sent").length,
          dealWon: partnerLeads.filter((l) => l.status === "deal_won").length,
          dealLost: partnerLeads.filter((l) => l.status === "deal_lost").length,
        },
        activeLeads,
        awaitingPayoutAed: partnerCommissions
          .filter((c) => c.status === "approved" || c.status === "processing")
          .reduce((s, c) => s + Number(c.amount), 0),
        wonThisMonth: partnerLeads.filter(
          (l) => l.status === "deal_won" && l.createdAt && new Date(l.createdAt) >= startOfMonth
        ).length,
      }

      await sendDailyMorningBriefingEmail(partner.email, partner.contactName, stats)
      sent++
    } catch (err) {
      console.error(`[cron/daily-briefing] Failed for partner ${partner.id}:`, err)
      failed++
    }
  }

  console.log(`[cron/daily-briefing] Sent: ${sent}, Failed: ${failed}, Total: ${activePartners.length}`)
  return NextResponse.json({ sent, failed, total: activePartners.length })
}
