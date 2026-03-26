import { z } from "zod"

export const PartnerTypeSchema = z.enum(["referral", "channel"])
export type PartnerType = z.infer<typeof PartnerTypeSchema>

export const PartnerStatusSchema = z.enum(["pending", "approved", "rejected", "suspended"])
export type PartnerStatus = z.infer<typeof PartnerStatusSchema>

export const PartnerSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  clerkUserId: z.string(),
  type: PartnerTypeSchema,
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  status: PartnerStatusSchema.default("pending"),
  commissionModelId: z.string().uuid().nullable().optional(),
  zohoContactId: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  onboardedAt: z.date().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Partner = z.infer<typeof PartnerSchema>

export const CreatePartnerSchema = PartnerSchema.omit({
  id: true,
  clerkUserId: true,
  status: true,
  zohoContactId: true,
  rejectionReason: true,
  onboardedAt: true,
  createdAt: true,
  updatedAt: true,
})

export type CreatePartnerInput = z.infer<typeof CreatePartnerSchema>

export const PartnerRegistrationSchema = z.object({
  type: PartnerTypeSchema,
  companyName: z.string().min(1, "Company name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  commissionModelId: z.string().uuid().optional(),
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the terms" }),
  }),
})

export type PartnerRegistrationInput = z.infer<typeof PartnerRegistrationSchema>
