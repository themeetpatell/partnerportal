-- Expand internal roles: map legacy stored roles to new canonical slugs
UPDATE team_members SET role = 'pre_sales_representative' WHERE role IN ('appointment_setter', 'sdr');
UPDATE team_members SET role = 'sales_representative' WHERE role = 'sales';
UPDATE team_members SET role = 'partnership_manager' WHERE role = 'partnership';

-- Partner assignments: SDR (pre-sales) & Partnership Manager as FKs to team_members
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS sdr_team_member_id uuid REFERENCES team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partnership_manager_team_member_id uuid REFERENCES team_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS partners_sdr_team_member_id_idx ON partners(sdr_team_member_id);
CREATE INDEX IF NOT EXISTS partners_partnership_manager_team_member_id_idx ON partners(partnership_manager_team_member_id);

-- Lead routing: store Supabase auth user IDs for owners (aligns with assigned_to / row scope)
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS lead_owner_user_id text,
  ADD COLUMN IF NOT EXISTS deal_owner_user_id text;

CREATE INDEX IF NOT EXISTS leads_lead_owner_user_id_idx ON leads(lead_owner_user_id);
CREATE INDEX IF NOT EXISTS leads_deal_owner_user_id_idx ON leads(deal_owner_user_id);
