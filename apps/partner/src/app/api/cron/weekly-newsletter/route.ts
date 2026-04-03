import { NextRequest, NextResponse } from "next/server"
import { db, partners, leads, commissions } from "@repo/db"
import { and, eq, gte, isNotNull } from "drizzle-orm"
import { sendWeeklyNewsletterEmail, type WeeklyNewsletterStats } from "@repo/notifications"

// Vercel cron jobs call this route with Authorization: Bearer <CRON_SECRET>
// Configure CRON_SECRET in your environment variables
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) {
    // If no secret configured, only allow in development
    return process.env.NODE_ENV === "development"
  }
  const auth = req.headers.get("authorization")
  return auth === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  // Week seed for rotating tips (ISO week number)
  const weekSeed = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))

  // Fetch all approved partners with email
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
          .select({ id: leads.id, status: leads.status, createdAt: leads.createdAt })
          .from(leads)
          .where(eq(leads.partnerId, partner.id)),
        db
          .select({ amount: commissions.amount, status: commissions.status })
          .from(commissions)
          .where(eq(commissions.partnerId, partner.id)),
      ])

      const leadsThisMonth = partnerLeads.filter(
        (l) => l.createdAt && l.createdAt >= startOfMonth
      ).length

      const stats: WeeklyNewsletterStats = {
        leadsThisMonth,
        leadsTotal: partnerLeads.length,
        wonTotal: partnerLeads.filter((l) => l.status === "deal_won").length,
        commissionsEarned: partnerCommissions
          .filter((c) => ["approved", "processing", "paid"].includes(c.status))
          .reduce((s, c) => s + Number(c.amount), 0),
        commissionsPending: partnerCommissions
          .filter((c) => c.status === "pending")
          .reduce((s, c) => s + Number(c.amount), 0),
      }

      await sendWeeklyNewsletterEmail(partner.email, partner.contactName, stats, weekSeed)
      sent++
    } catch (err) {
      console.error(`[cron/weekly-newsletter] Failed for partner ${partner.id}:`, err)
      failed++
    }
  }

  console.log(`[cron/weekly-newsletter] Sent: ${sent}, Failed: ${failed}, Total: ${activePartners.length}`)
  return NextResponse.json({ sent, failed, total: activePartners.length })
}
