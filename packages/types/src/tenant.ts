import { z } from "zod"

export const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  customDomain: z.string().nullable().optional(),
  brandingConfig: z
    .object({
      logo: z.string().optional(),
      primaryColor: z.string().optional(),
      companyName: z.string().optional(),
    })
    .optional(),
  plan: z.enum(["starter", "pro", "enterprise"]).default("starter"),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
})

export type Tenant = z.infer<typeof TenantSchema>
