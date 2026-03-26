import { z } from "zod"

export const DocumentOwnerTypeSchema = z.enum(["partner", "lead", "service_request"])
export type DocumentOwnerType = z.infer<typeof DocumentOwnerTypeSchema>

export const DocumentSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  ownerType: DocumentOwnerTypeSchema,
  ownerId: z.string().uuid(),
  documentType: z.string(),
  fileName: z.string(),
  zohoWorkdriveId: z.string(),
  zohoWorkdriveUrl: z.string().url(),
  uploadedBy: z.string(),
  uploadedAt: z.date(),
})

export type Document = z.infer<typeof DocumentSchema>
