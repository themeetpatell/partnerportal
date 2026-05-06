import { randomUUID } from "crypto"
import { calculateCommission, deriveNetCommissionBaseFromCrm } from "@repo/commission-engine"
import { db, commissions, leads, logActivity, partners } from "@repo/db"
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm"
import type { PaymentRecurringSlug } from "@repo/types"
import { getCommissionVatOptionsFromEnv } from "@/lib/commission-env"
import {
  countPartnerDealWonLeads,
  resolvePartnerCommissionModel,
} from "@/lib/partner-commission-resolution"

export type DealCloseCommissionFailureReason =
  | "duplicate"
  | "not_deal_won"
  | "no_basis"
  | "no_model"
  | "zero_commission"
  | "server"

export type CreateDealCloseCommissionResult =
  | { ok: true; commission: typeof commissions.$inferSelect }
  | { ok: false; reason: DealCloseCommissionFailureReason }

function rawBasisFromLead(
  lead: typeof leads.$inferSelect,
  basisAmountOverride?: number,
): number {
  if (
    basisAmountOverride != null &&
    Number.isFinite(basisAmountOverride) &&
    basisAmountOverride > 0
  ) {
    return basisAmountOverride
  }
  const fromPayment = Number(lead.paymentAmount ?? 0)
  const fromProposal = Number(lead.proposalAmount ?? 0)
  if (fromPayment > 0) return fromPayment
  if (fromProposal > 0) return fromProposal
  return 0
}

export async function createDealCloseCommissionFromLead(opts: {
  lead: typeof leads.$inferSelect
  partner: typeof partners.$inferSelect
  actorUserId: string
  actorName: string
  basisAmountOverride?: number
  snapshotSource?: string
  logNote?: string
}): Promise<CreateDealCloseCommissionResult> {
  const {
    lead,
    partner,
    actorUserId,
    actorName,
    basisAmountOverride,
    snapshotSource = "auto_deal_close_on_mark_won",
    logNote = "Deal-close commission created automatically from lead (partner rate).",
  } = opts

  if (lead.status !== "deal_won") {
    return { ok: false, reason: "not_deal_won" }
  }

  const [existing] = await db
    .select({ id: commissions.id })
    .from(commissions)
    .where(and(eq(commissions.sourceType, "lead"), eq(commissions.sourceId, lead.id)))
    .limit(1)

  if (existing) {
    return { ok: false, reason: "duplicate" }
  }

  const commissionModel = await resolvePartnerCommissionModel(partner)
  if (!commissionModel) {
    return { ok: false, reason: "no_model" }
  }

  const rawBasis = rawBasisFromLead(lead, basisAmountOverride)
  if (!Number.isFinite(rawBasis) || rawBasis <= 0) {
    return { ok: false, reason: "no_basis" }
  }

  const vatOpts = getCommissionVatOptionsFromEnv()
  const basis = deriveNetCommissionBaseFromCrm(rawBasis, vatOpts)
  const conversions = await countPartnerDealWonLeads(partner.id)

  const commissionResult = calculateCommission({
    model: commissionModel,
    serviceFee: basis.netForCommission,
    partnerConversionsThisPeriod: conversions,
    partnerLifetimeConversions: conversions,
  })

  if (commissionResult.amount <= 0) {
    return { ok: false, reason: "zero_commission" }
  }

  const calculationSnapshot = {
    version: 3,
    source: snapshotSource,
    leadId: lead.id,
    grossFromLead: rawBasis,
    netForCommission: basis.netForCommission,
    vatRatePct: basis.vatRatePct,
    crmAmountIncludesVatApplied: basis.crmAmountIncludesVat,
  }

  let created: typeof commissions.$inferSelect | undefined
  try {
    ;[created] = await db
      .insert(commissions)
      .values({
        tenantId: lead.tenantId,
        partnerId: partner.id,
        sourceType: "lead",
        sourceId: lead.id,
        relatedLeadId: lead.id,
        amount: String(commissionResult.amount),
        currency: "AED",
        status: "pending",
        breakdown: `${basis.summaryLine}. ${commissionResult.breakdown}`,
        calculationSnapshot,
        calculatedAt: new Date(),
      })
      .returning()
  } catch (e) {
    console.error("[createDealCloseCommissionFromLead]", e)
    return { ok: false, reason: "server" }
  }

  if (!created) {
    return { ok: false, reason: "server" }
  }

  await logActivity({
    tenantId: lead.tenantId,
    entityType: "commission",
    entityId: created.id,
    actorId: actorUserId,
    actorName,
    action: "created",
    note: logNote,
    metadata: {
      leadId: lead.id,
      sourceType: "lead",
      basisAmount: rawBasis,
      recurring: false,
    },
  })

  return { ok: true, commission: created }
}

export function intervalMonthsForPaymentRecurring(
  recurring: string | null | undefined,
): number {
  if (!recurring) return 0
  const slug = recurring.trim().toLowerCase()
  switch (slug as PaymentRecurringSlug) {
    case "monthly":
      return 1
    case "quarterly":
      return 3
    case "bi_annual":
      return 6
    case "annually":
      return 12
    default:
      return 0
  }
}

function utcDayStartMs(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export function addMonthsUTC(d: Date, monthsToAdd: number): Date {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const day = d.getUTCDate()
  return new Date(
    Date.UTC(
      y,
      m + monthsToAdd,
      day,
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
      d.getUTCMilliseconds(),
    ),
  )
}

async function maxRecurringPeriodIndex(leadId: string): Promise<number> {
  const rows = await db
    .select({ calculationSnapshot: commissions.calculationSnapshot })
    .from(commissions)
    .where(
      and(eq(commissions.relatedLeadId, leadId), eq(commissions.sourceType, "lead_recurring_invoice")),
    )

  let max = 0
  for (const r of rows) {
    const raw = r.calculationSnapshot?.recurringPeriodIndex
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN
    if (Number.isFinite(n) && n > max) max = n
  }
  return max
}

async function leadHasDealCloseCommission(leadId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: commissions.id })
    .from(commissions)
    .where(and(eq(commissions.sourceType, "lead"), eq(commissions.sourceId, leadId)))
    .limit(1)
  return Boolean(row)
}

async function recurringPeriodExists(leadId: string, periodIndex: number): Promise<boolean> {
  const [row] = await db
    .select({ id: commissions.id })
    .from(commissions)
    .where(
      and(
        eq(commissions.relatedLeadId, leadId),
        eq(commissions.sourceType, "lead_recurring_invoice"),
        sql`(calculation_snapshot->>'recurringPeriodIndex')::int = ${periodIndex}`,
      ),
    )
    .limit(1)
  return Boolean(row)
}

export type RecurringCronStats = { leadsScanned: number; created: number; errors: number }

const MAX_RECURRING_PERIODS_PER_LEAD = 120

/**
 * Creates due recurring commission rows for deal-won leads with `payment_recurring` set,
 * only after the one-time deal-close row exists (`source_type` `lead`, `source_id` = lead id).
 * Idempotent per (lead, period index). Safe to run daily.
 */
export async function processDueRecurringCommissionsFromLeads(now: Date = new Date()): Promise<RecurringCronStats> {
  const stats: RecurringCronStats = { leadsScanned: 0, created: 0, errors: 0 }
  const todayMs = utcDayStartMs(now)

  const wonLeads = await db
    .select()
    .from(leads)
    .where(and(eq(leads.status, "deal_won"), isNull(leads.deletedAt), isNotNull(leads.paymentRecurring)))

  for (const lead of wonLeads) {
    stats.leadsScanned += 1
    if (!lead.paymentRecurring?.trim()) continue
    const step = intervalMonthsForPaymentRecurring(lead.paymentRecurring)
    if (step <= 0) continue
    if (!(await leadHasDealCloseCommission(lead.id))) continue

    const anchorRaw = lead.convertedAt ?? lead.paymentDate
    if (!anchorRaw) continue
    const anchor = anchorRaw instanceof Date ? anchorRaw : new Date(anchorRaw)

    const [partner] = await db
      .select()
      .from(partners)
      .where(eq(partners.id, lead.partnerId))
      .limit(1)
    if (!partner) continue

    const commissionModel = await resolvePartnerCommissionModel(partner)
    if (!commissionModel) continue

    let period = (await maxRecurringPeriodIndex(lead.id)) + 1
    const vatOpts = getCommissionVatOptionsFromEnv()
    const conversions = await countPartnerDealWonLeads(partner.id)

    while (period <= MAX_RECURRING_PERIODS_PER_LEAD) {
      if (await recurringPeriodExists(lead.id, period)) {
        period += 1
        continue
      }

      const due = addMonthsUTC(anchor, period * step)
      if (utcDayStartMs(due) > todayMs) {
        break
      }

      const rawBasis = rawBasisFromLead(lead, undefined)
      if (!Number.isFinite(rawBasis) || rawBasis <= 0) {
        break
      }

      const basis = deriveNetCommissionBaseFromCrm(rawBasis, vatOpts)
      const commissionResult = calculateCommission({
        model: commissionModel,
        serviceFee: basis.netForCommission,
        partnerConversionsThisPeriod: conversions,
        partnerLifetimeConversions: conversions,
      })

      if (commissionResult.amount <= 0) {
        break
      }

      const calculationSnapshot = {
        version: 3,
        source: "cron_recurring_from_lead",
        leadId: lead.id,
        recurringPeriodIndex: period,
        recurringDueDate: due.toISOString(),
        grossFromLead: rawBasis,
        netForCommission: basis.netForCommission,
        vatRatePct: basis.vatRatePct,
        crmAmountIncludesVatApplied: basis.crmAmountIncludesVat,
        paymentRecurring: lead.paymentRecurring,
      }

      const sourceId = randomUUID()
      try {
        const [createdRow] = await db
          .insert(commissions)
          .values({
            tenantId: lead.tenantId,
            partnerId: partner.id,
            sourceType: "lead_recurring_invoice",
            sourceId,
            relatedLeadId: lead.id,
            amount: String(commissionResult.amount),
            currency: "AED",
            status: "pending",
            breakdown: `${basis.summaryLine}. ${commissionResult.breakdown} (recurring period ${period})`,
            calculationSnapshot,
            calculatedAt: new Date(),
          })
          .returning()
        if (!createdRow) break
        stats.created += 1
        await logActivity({
          tenantId: lead.tenantId,
          entityType: "commission",
          entityId: createdRow.id,
          actorId: "system",
          actorName: "Recurring commissions job",
          action: "created",
          note: `Recurring commission period ${period} created for lead ${lead.id}.`,
          metadata: { leadId: lead.id, period, paymentRecurring: lead.paymentRecurring },
        })
      } catch (e) {
        console.error("[processDueRecurringCommissionsFromLeads]", lead.id, e)
        stats.errors += 1
        break
      }

      period += 1
    }
  }

  return stats
}
