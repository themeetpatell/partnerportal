-- Bootstrap script for a clean Supabase database in this project.
-- This intentionally resets only the public schema and keeps auth/storage schemas intact.

begin;

-- Ensure crypto helpers used by Drizzle defaults are available.
create extension if not exists pgcrypto;

-- Wipe app data and schema objects.
drop schema if exists public cascade;
drop schema if exists drizzle cascade;
create schema public;

-- Restore default grants on public schema.
grant usage on schema public to postgres;
grant all privileges on schema public to postgres;
grant usage on schema public to anon;
grant usage on schema public to authenticated;
grant usage on schema public to service_role;

commit;
