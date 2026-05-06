create table if not exists public.notification_endpoints (
  id uuid primary key default gen_random_uuid(),
  channel_key text not null,
  name text not null,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  last_verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint notification_endpoints_channel_key_check check (channel_key = any (array['telegram', 'email', 'webhook']::text[])),
  constraint notification_endpoints_channel_key_unique unique (channel_key)
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'default',
  type_key text not null,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint notification_preferences_type_key_check check (type_key = any (array['domain_expiry_reminder', 'auth_activity', 'resource_change', 'settings_change']::text[])),
  constraint notification_preferences_user_type_unique unique (user_id, type_key)
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  activity_log_id uuid not null references public.activity_logs(id) on delete cascade,
  type_key text not null,
  channel_key text not null,
  endpoint_id uuid references public.notification_endpoints(id) on delete set null,
  status text not null default 'pending',
  level text not null default 'info',
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null default '',
  provider_message_id text not null default '',
  error_message text not null default '',
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint notification_deliveries_type_key_check check (type_key = any (array['domain_expiry_reminder', 'auth_activity', 'resource_change', 'settings_change']::text[])),
  constraint notification_deliveries_channel_key_check check (channel_key = any (array['telegram', 'email', 'webhook']::text[])),
  constraint notification_deliveries_status_check check (status = any (array['pending', 'sent', 'failed', 'skipped']::text[])),
  constraint notification_deliveries_level_check check (level = any (array['info', 'warning', 'critical']::text[]))
);

create index if not exists notification_endpoints_enabled_idx on public.notification_endpoints (enabled);
create index if not exists notification_preferences_user_id_idx on public.notification_preferences (user_id);
create index if not exists notification_preferences_type_key_idx on public.notification_preferences (type_key);
create index if not exists notification_deliveries_activity_log_id_idx on public.notification_deliveries (activity_log_id);
create index if not exists notification_deliveries_status_idx on public.notification_deliveries (status);
create index if not exists notification_deliveries_type_key_idx on public.notification_deliveries (type_key);
create index if not exists notification_deliveries_channel_key_idx on public.notification_deliveries (channel_key);
create index if not exists notification_deliveries_dedupe_key_idx on public.notification_deliveries (dedupe_key);
create index if not exists notification_deliveries_payload_idx on public.notification_deliveries using gin (payload);

create or replace trigger set_notification_endpoints_updated_at
before update on public.notification_endpoints
for each row
execute function public.set_updated_at();

create or replace trigger set_notification_preferences_updated_at
before update on public.notification_preferences
for each row
execute function public.set_updated_at();

create or replace trigger set_notification_deliveries_updated_at
before update on public.notification_deliveries
for each row
execute function public.set_updated_at();

alter table public.notification_endpoints enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_deliveries enable row level security;
