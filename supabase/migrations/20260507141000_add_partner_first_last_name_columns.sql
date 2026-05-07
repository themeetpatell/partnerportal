-- Migration: 20260507141000_add_partner_first_last_name_columns.sql
-- Title: add_partner_first_last_name_columns
-- change_key: 20260507141000_add_partner_first_last_name_columns

begin;

alter table if exists public.partners
  add column if not exists first_name text,
  add column if not exists last_name text;

-- Backfill split-name columns from existing contact_name when possible.
update public.partners
set
  first_name = coalesce(
    nullif(trim(first_name), ''),
    nullif(split_part(trim(coalesce(contact_name, '')), ' ', 1), '')
  ),
  last_name = coalesce(
    nullif(trim(last_name), ''),
    nullif(trim(regexp_replace(trim(coalesce(contact_name, '')), '^\S+\s*', '')), '')
  )
where
  nullif(trim(first_name), '') is null
  or nullif(trim(last_name), '') is null;

-- Keep legacy contact_name populated for compatibility where split names exist.
update public.partners
set contact_name = trim(concat_ws(' ', nullif(trim(first_name), ''), nullif(trim(last_name), '')))
where
  nullif(trim(contact_name), '') is null
  and (
    nullif(trim(first_name), '') is not null
    or nullif(trim(last_name), '') is not null
  );

insert into public.schema_change_log (change_key, title, sql_file, notes, applied_by)
values (
  '20260507141000_add_partner_first_last_name_columns',
  'Add partner first_name and last_name columns',
  'supabase/migrations/20260507141000_add_partner_first_last_name_columns.sql',
  'Adds split name fields and backfills from contact_name without dropping compatibility.',
  'meet@finanshels.com'
)
on conflict (change_key) do nothing;

commit;
