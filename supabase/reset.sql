-- Drop all tables and rebuild from schema.sql
-- Usage: npx supabase db reset 或在 SQL Editor 中执行

drop table if exists public.notification_deliveries cascade;
drop table if exists public.notification_preferences cascade;
drop table if exists public.notification_endpoints cascade;
drop table if exists public.activity_logs cascade;
drop table if exists public.favorite_sites cascade;
drop table if exists public.subdomains cascade;
drop table if exists public.domains cascade;
drop table if exists public.accounts cascade;
drop table if exists public.sites cascade;
drop table if exists public.settings cascade;
drop function if exists public.set_updated_at() cascade;
