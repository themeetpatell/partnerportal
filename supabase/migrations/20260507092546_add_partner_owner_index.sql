-- Migration: 20260507092546_add_partner_owner_index.sql
-- Title: add_partner_owner_index
-- change_key: 20260507092546_add_partner_owner_index

begin;

create index if not exists partners_owner_id_idx
  on public.partners (owner_id);

insert into public.schema_change_log (change_key, title, sql_file, notes, applied_by)
values (
  '20260507092546_add_partner_owner_index',
  'Add partner owner_id index',
  'supabase/migrations/20260507092546_add_partner_owner_index.sql',
  'Add index for faster partner owner filters',
  'meet@finanshels.com'
)
on conflict (change_key) do nothing;

commit;
