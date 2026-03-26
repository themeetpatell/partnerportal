import { z } from "zod"

export const CommissionModelTypeSchema = z.enum(["flat_pct", "tiered", "milestone"])
export type CommissionModelType = z.infer<typeof CommissionModelTypeSchema>

export const FlatPctConfigSchema = z.object({
  pct: z.number().min(0).max(100),
})

export const TieredConfigSchema = z.object({
  tiers: z.array(
    z.object({
      min: z.number().int().min(0),
      max: z.number().int().nullable(),
      pct: z.number().min(0).max(100),
    })
  ),
  period: z.enum(["monthly", "quarterly", "annual"]).default("monthly"),
})

export const MilestoneConfigSchema = z.object({
  milestones: z.array(
    z.object({
      target: z.number().int().positive(),
      reward: z.number().positive(),
    })
  ),
  currency: z.string().default("AED"),
})

export const CommissionModelSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  type: CommissionModelTypeSchema,
  config: z.union([FlatPctConfigSchema, TieredConfigSchema, MilestoneConfigSchema]),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
})

export type CommissionModel = z.infer<typeof CommissionModelSchema>

export const CommissionStatusSchema = z.enum(["pending", "approved", "processing", "paid", "disputed"])
export type CommissionStatus = z.infer<typeof CommissionStatusSchema>

export const CommissionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  partnerId: z.string().uuid(),
  sourceType: z.enum(["lead", "service_request"]),
  sourceId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().default("AED"),
  status: CommissionStatusSchema.default("pending"),
  breakdown: z.string().optional(),
  calculatedAt: z.date(),
  approvedAt: z.date().nullable().optional(),
  paidAt: z.date().nullable().optional(),
  stripeTransferId: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Commission = z.infer<typeof CommissionSchema>
