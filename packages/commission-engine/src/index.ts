import type { CommissionModel } from "@repo/types"

export interface CalculateCommissionParams {
  model: CommissionModel
  serviceFee: number
  partnerConversionsThisPeriod: number
  partnerLifetimeConversions: number
}

export interface CommissionResult {
  amount: number
  breakdown: string
}

export interface MilestoneBonus {
  target: number
  reward: number
}

export function calculateCommission(params: CalculateCommissionParams): CommissionResult {
  const { model, serviceFee, partnerConversionsThisPeriod } = params

  if (model.type === "flat_pct") {
    const config = model.config as { pct: number }
    const amount = (serviceFee * config.pct) / 100
    return {
      amount: Math.round(amount * 100) / 100,
      breakdown: `${config.pct}% of AED ${serviceFee} service fee`,
    }
  }

  if (model.type === "tiered") {
    const config = model.config as {
      tiers: { min: number; max: number | null; pct: number }[]
      period: string
    }
    const conversions = partnerConversionsThisPeriod
    const matchedTier = config.tiers.find(
      (t) => conversions >= t.min && (t.max === null || conversions <= t.max)
    )
    if (!matchedTier) {
      return { amount: 0, breakdown: "No matching tier found" }
    }
    const amount = (serviceFee * matchedTier.pct) / 100
    return {
      amount: Math.round(amount * 100) / 100,
      breakdown: `Tier ${matchedTier.min}–${matchedTier.max ?? "∞"}: ${matchedTier.pct}% of AED ${serviceFee} (${conversions} conversions this period)`,
    }
  }

  if (model.type === "milestone") {
    // milestone commissions are bonus payouts, not per-transaction
    return { amount: 0, breakdown: "Milestone bonuses paid separately" }
  }

  return { amount: 0, breakdown: "Unknown commission model" }
}

export function getMilestoneBonuses(params: {
  model: CommissionModel
  previousLifetimeConversions: number
  newLifetimeConversions: number
}): MilestoneBonus[] {
  const { model, previousLifetimeConversions, newLifetimeConversions } = params
  if (model.type !== "milestone") return []

  const config = model.config as {
    milestones: { target: number; reward: number }[]
  }

  return config.milestones.filter(
    (m) =>
      m.target > previousLifetimeConversions && m.target <= newLifetimeConversions
  )
}

export function getEffectivePct(model: CommissionModel, conversionsThisPeriod: number): number {
  if (model.type === "flat_pct") {
    return (model.config as { pct: number }).pct
  }
  if (model.type === "tiered") {
    const config = model.config as {
      tiers: { min: number; max: number | null; pct: number }[]
    }
    const tier = config.tiers.find(
      (t) => conversionsThisPeriod >= t.min && (t.max === null || conversionsThisPeriod <= t.max)
    )
    return tier?.pct ?? 0
  }
  return 0
}
