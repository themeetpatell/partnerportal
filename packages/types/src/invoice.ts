import { z } from "zod"

export const InvoiceStatusSchema = z.enum(["draft", "sent", "paid", "overdue", "cancelled"])
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>

export const InvoiceSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  partnerId: z.string().uuid(),
  invoiceNumber: z.string(),
  periodStart: z.date(),
  periodEnd: z.date(),
  subtotal: z.number().min(0),
  tax: z.number().min(0).default(0),
  total: z.number().min(0),
  currency: z.string().default("AED"),
  status: InvoiceStatusSchema.default("draft"),
  dueDate: z.date(),
  stripeInvoiceId: z.string().nullable().optional(),
  paidAt: z.date().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Invoice = z.infer<typeof InvoiceSchema>
