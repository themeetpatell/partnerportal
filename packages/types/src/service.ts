import { z } from "zod"

export const ServiceRequestStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "cancelled",
])
export type ServiceRequestStatus = z.infer<typeof ServiceRequestStatusSchema>

export const ServiceSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string(),
  basePrice: z.number().positive(),
  requiredDocuments: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
})

export type Service = z.infer<typeof ServiceSchema>

export const ServiceRequestSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  partnerId: z.string().uuid(),
  serviceId: z.string().uuid(),
  customerCompany: z.string().min(1),
  customerContact: z.string().min(1),
  customerEmail: z.string().email(),
  status: ServiceRequestStatusSchema.default("pending"),
  startDate: z.date().optional(),
  completedAt: z.date().nullable().optional(),
  notes: z.string().optional(),
  assignedTo: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type ServiceRequest = z.infer<typeof ServiceRequestSchema>

export const CreateServiceRequestSchema = z.object({
  serviceId: z.string().uuid("Select a service"),
  customerCompany: z.string().min(1, "Company name is required"),
  customerContact: z.string().min(1, "Contact name is required"),
  customerEmail: z.string().email("Valid email required"),
  startDate: z.string().optional(),
  notes: z.string().optional(),
})

export type CreateServiceRequestInput = z.infer<typeof CreateServiceRequestSchema>
