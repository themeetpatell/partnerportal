import { z } from "zod"

export const LeadStatusSchema = z.enum([
  "submitted",           // Lead created by partner, pending approval
  "lead_approved",       // Partnership manager approved the lead into sales pipeline
  "lead_follow_up",      // Sales representative follow-up in progress
  "lead_qualified",      // Sales representative qualified the lead
  "proposal_sent",       // Proposal sent to customer
  "deal_won",            // Payment done, deal won
  "deal_lost",           // Lead did not convert
])
export type LeadStatus = z.infer<typeof LeadStatusSchema>

/** Lead detail progress bar: same order as the partner app pipeline (excludes terminal `deal_lost`). */
export const LEAD_DETAIL_PROGRESS_STEPS = [
  "submitted",
  "lead_approved",
  "lead_follow_up",
  "lead_qualified",
  "proposal_sent",
  "deal_won",
] as const satisfies readonly LeadStatus[]

export type LeadDetailProgressStep = (typeof LEAD_DETAIL_PROGRESS_STEPS)[number]

/** Allowed one-step status moves (admin + API). Mirrors native portal pipeline — no legacy CRM steps. */
export const LEAD_STATUS_TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  submitted: ["lead_approved", "deal_lost"],
  lead_approved: ["lead_follow_up", "lead_qualified", "deal_lost"],
  lead_follow_up: ["lead_qualified", "deal_lost"],
  lead_qualified: ["proposal_sent", "deal_lost"],
  proposal_sent: ["deal_won", "deal_lost"],
  deal_won: [],
  deal_lost: [],
}

export const LeadSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  partnerId: z.string().uuid(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  customerCompany: z.string().optional(),
  serviceInterest: z.array(z.string()).default([]),
  notes: z.string().optional(),
  status: LeadStatusSchema.default("submitted"),
  assignedTo: z.string().nullable().optional(),
  approvedAt: z.date().nullable().optional(),
  approvedBy: z.string().nullable().optional(),
  stageUpdatedAt: z.date().nullable().optional(),
  stageNotes: z.string().nullable().optional(),
  proposalSummary: z.string().nullable().optional(),
  proposalAmount: z.string().nullable().optional(),
  proposalSentAt: z.date().nullable().optional(),
  paymentStatus: z.string().nullable().optional(),
  paymentReference: z.string().nullable().optional(),
  paymentAmount: z.string().nullable().optional(),
  paymentDate: z.date().nullable().optional(),
  convertedAt: z.date().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Lead = z.infer<typeof LeadSchema>

export const CreateLeadSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Valid email required"),
  customerPhone: z.string().optional(),
  customerCompany: z.string().optional(),
  serviceInterest: z.array(z.string()).min(1, "Select at least one service"),
  notes: z.string().optional(),
})

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>
