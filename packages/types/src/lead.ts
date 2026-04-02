import { z } from "zod"

export const LeadStatusSchema = z.enum([
  "submitted",           // Lead created by partner
  "qualified",           // Lead qualified, deal created in Zoho CRM
  "proposal_sent",       // Proposal sent to customer
  "deal_won",            // Deal won in Zoho CRM
  "deal_lost",           // Deal lost in Zoho CRM
])
export type LeadStatus = z.infer<typeof LeadStatusSchema>

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
  zohoLeadId: z.string().nullable().optional(),
  zohoDealId: z.string().nullable().optional(),
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
