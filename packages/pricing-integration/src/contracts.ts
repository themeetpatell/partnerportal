import { z } from "zod"

/** Header carrying HMAC-SHA256 of the raw webhook body (see signPricingEngineWebhookBody). */
export const PRICING_ENGINE_SIGNATURE_HEADER = "x-pricing-engine-signature"

/** Outbound — contract the Replit pricing engine should accept. */
export type CreatePortalQuoteRequest = {
  tenant_id: string
  partner_id: string
  external_lead_id: string
  partner_promo_code?: string | null
  customer: {
    company?: string | null
    email: string
    phone?: string | null
    first_name?: string | null
    last_name?: string | null
    full_name?: string | null
  }
  service_hints: string[]
  requested_by: {
    auth_user_id: string
    role: "admin" | "partner"
  }
  idempotency_key: string
}

const WebhookDataSchema = z
  .object({
    quote_id: z.string().min(1),
    quote_number: z.string().nullable().optional(),
    external_lead_id: z.string().uuid(),
    partner_id: z.string().uuid().optional().nullable(),
    status: z.string().nullable().optional(),
    total_display: z.string().nullable().optional(),
    currency: z.string().nullable().optional(),
    expires_at: z.string().nullable().optional(),
    proposal_view_url: z.string().nullable().optional(),
    pdf_url: z.string().nullable().optional(),
    engagement_letter_status: z.string().nullable().optional(),
    stripe_payment_status: z.string().nullable().optional(),
    onboarding_pushed_at: z.string().nullable().optional(),
  })
  .passthrough()

/** Inbound — webhook body the engine should POST to the portal. */
export const PricingEngineWebhookPayloadSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
    occurred_at: z.string().optional(),
    tenant_id: z.string().uuid(),
    data: WebhookDataSchema,
  })
  .passthrough()

export type PricingEngineWebhookPayload = z.infer<typeof PricingEngineWebhookPayloadSchema>
