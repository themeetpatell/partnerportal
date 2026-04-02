import { z } from "zod"

export const PartnerTypeSchema = z.enum(["referral", "channel"])
export type PartnerType = z.infer<typeof PartnerTypeSchema>

export const PartnerStatusSchema = z.enum(["pending", "approved", "rejected", "suspended"])
export type PartnerStatus = z.infer<typeof PartnerStatusSchema>

export const PartnerSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  authUserId: z.string(),
  type: PartnerTypeSchema,
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  status: PartnerStatusSchema.default("pending"),
  tier: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  channel: z.string().nullable().optional(),
  agreementUrl: z.string().nullable().optional(),
  zohoSignRequestId: z.string().nullable().optional(),
  contractSentAt: z.date().nullable().optional(),
  contractStatus: z.string().optional(),
  contractSignedAt: z.date().nullable().optional(),
  contractSignedName: z.string().nullable().optional(),
  contractSignedDesignation: z.string().nullable().optional(),
  contractSignatureType: z.string().nullable().optional(),
  contractSignatureDataUrl: z.string().nullable().optional(),
  meetingCompletedAt: z.date().nullable().optional(),
  nurturingStartedAt: z.date().nullable().optional(),

  // Primary Information extras
  designation: z.string().nullable().optional(),
  partnershipManager: z.string().nullable().optional(),
  appointmentsSetter: z.string().nullable().optional(),
  strategicFunnelStage: z.string().nullable().optional(),
  activationDate: z.date().nullable().optional(),
  lastMetOn: z.date().nullable().optional(),
  meetingScheduledDateAS: z.date().nullable().optional(),
  meetingDatePM: z.date().nullable().optional(),
  partnersId: z.string().nullable().optional(),

  // Secondary Information extras
  partnershipLevel: z.string().nullable().optional(),
  agreementStartDate: z.date().nullable().optional(),
  agreementEndDate: z.date().nullable().optional(),
  salesTrainingDone: z.boolean().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  secondaryEmail: z.string().nullable().optional(),
  emailOptOut: z.boolean().nullable().optional(),

  // Commercial
  commissionModelId: z.string().uuid().nullable().optional(),
  commissionType: z.string().nullable().optional(),
  commissionRate: z.string().nullable().optional(),

  // Business profile
  website: z.string().nullable().optional(),
  linkedinId: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  businessSize: z.string().nullable().optional(),
  partnerIndustry: z.string().nullable().optional(),
  overview: z.string().nullable().optional(),
  partnerAddress: z.string().nullable().optional(),

  // Financial / compliance
  vatRegistered: z.boolean().nullable().optional(),
  vatNumber: z.string().nullable().optional(),
  tradeLicense: z.string().nullable().optional(),
  emirateIdPassport: z.string().nullable().optional(),

  // Banking
  beneficiaryName: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  bankCountry: z.string().nullable().optional(),
  accountNoIban: z.string().nullable().optional(),
  swiftBicCode: z.string().nullable().optional(),
  paymentFrequency: z.string().nullable().optional(),

  // CRM / system
  zohoContactId: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  onboardedAt: z.date().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Partner = z.infer<typeof PartnerSchema>

export const CreatePartnerSchema = PartnerSchema.omit({
  id: true,
  authUserId: true,
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
