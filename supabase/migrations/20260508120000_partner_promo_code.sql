-- Partner proposal / pricing promo code (unique per tenant, 3–6 chars, enforced in application layer)

ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS promo_code text;

CREATE INDEX IF NOT EXISTS partners_promo_lookup_idx
  ON public.partners (tenant_id, promo_code);

CREATE UNIQUE INDEX IF NOT EXISTS partners_tenant_promo_code_uidx
  ON public.partners (tenant_id, upper(promo_code))
  WHERE promo_code IS NOT NULL AND deleted_at IS NULL;
