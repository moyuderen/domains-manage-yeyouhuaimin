create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  remark text not null default '',
  website_url text not null default '',
  category text not null default '',
  icon_url text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint sites_name_unique unique (name)
);


create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  email_provider text not null,
  email_provider_detail text not null default '',
  sites jsonb not null default '[]'::jsonb,
  password_hint text not null default '',
  vault_location text not null default '',
  email text not null default '',
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint accounts_identifier_unique unique (identifier),
  constraint accounts_email_provider_check check (email_provider = any (array['qq', '163', 'apple', 'google', 'hotmail', 'outlook', 'domain_mail', 'proton', 'phone', 'other']::text[]))
);

create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  registrar_account_id uuid references public.accounts(id) on delete set null,
  registrar_site_id uuid references public.sites(id) on delete set null,
  registration_date date,
  expiry_date date,
  dns_account_id uuid references public.accounts(id) on delete set null,
  dns_site_id uuid references public.sites(id) on delete set null,
  renewal_days_before_expiry integer,
  is_free boolean not null default true,
  currency text not null default 'CNY',
  purchase_price numeric(10,2),
  renewal_price numeric(10,2),
  auto_renewal boolean not null default false,
  remark text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint domains_name_unique unique (name),
  constraint domains_name_lower_trimmed check (name = lower(btrim(name))),
  constraint domains_expiry_after_registration check (
    (registration_date is null and expiry_date is null)
    or (
      registration_date is not null
      and expiry_date is not null
      and expiry_date >= registration_date
    )
  ),
  constraint domains_currency_check check (currency = any (array['CNY', 'USD', 'EUR', 'JPY', 'GBP']::text[])),
  constraint domains_paid_prices_required check (is_free or (purchase_price is not null and renewal_price is not null))
);

create table if not exists public.subdomains (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.domains(id) on delete cascade,
  subdomain text not null,
  ip text not null,
  ip_remark text not null default '',
  description text not null default '',
  remark text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint subdomains_subdomain_trimmed check (subdomain = lower(btrim(subdomain))),
  constraint subdomains_domain_id_subdomain_unique unique (domain_id, subdomain)
);

create index if not exists domains_expiry_date_idx on public.domains (expiry_date);
create index if not exists accounts_identifier_idx on public.accounts (identifier);
create index if not exists accounts_email_provider_idx on public.accounts (email_provider);
create index if not exists accounts_is_active_idx on public.accounts (is_active);
create index if not exists accounts_sites_idx on public.accounts using gin (sites);
create index if not exists domains_registrar_account_id_idx on public.domains (registrar_account_id);
create index if not exists domains_dns_account_id_idx on public.domains (dns_account_id);
create index if not exists domains_registrar_site_id_idx on public.domains (registrar_site_id);
create index if not exists domains_dns_site_id_idx on public.domains (dns_site_id);
create index if not exists sites_is_active_idx on public.sites (is_active);
create index if not exists subdomains_domain_id_idx on public.subdomains (domain_id);
create index if not exists subdomains_subdomain_idx on public.subdomains (subdomain);

create or replace trigger set_sites_updated_at
before update on public.sites
for each row
execute function public.set_updated_at();

create or replace trigger set_domains_updated_at
before update on public.domains
for each row
execute function public.set_updated_at();

create or replace trigger set_accounts_updated_at
before update on public.accounts
for each row
execute function public.set_updated_at();

create or replace trigger set_subdomains_updated_at
before update on public.subdomains
for each row
execute function public.set_updated_at();

create table if not exists public.favorite_sites (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  position int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint favorite_sites_site_id_unique unique (site_id)
);

create index if not exists favorite_sites_position_idx on public.favorite_sites (position);

create table if not exists public.settings (
  key text primary key,
  value text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  category text not null,
  action text not null,
  resource_type text not null default '',
  resource_id text not null default '',
  resource_name text not null default '',
  summary text not null,
  detail jsonb not null default '{}'::jsonb,
  request_context jsonb not null default '{}'::jsonb,
  actor_user_id text not null default '',
  severity text not null default 'info',
  result text not null default 'success',
  idempotency_key text not null default '',
  ip text not null default '',
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint activity_logs_category_check check (category = any (array['auth', 'domain', 'site', 'account', 'settings']::text[])),
  constraint activity_logs_action_check check (action = any (array['login', 'login_failed', 'logout', 'create', 'update', 'delete']::text[])),
  constraint activity_logs_severity_check check (severity = any (array['info', 'warning', 'critical']::text[])),
  constraint activity_logs_result_check check (result = any (array['success', 'failure']::text[]))
);

create index if not exists activity_logs_occurred_at_idx on public.activity_logs (occurred_at desc);
create index if not exists activity_logs_created_at_idx on public.activity_logs (created_at desc);
create index if not exists activity_logs_event_key_idx on public.activity_logs (event_key);
create index if not exists activity_logs_category_idx on public.activity_logs (category);
create index if not exists activity_logs_action_idx on public.activity_logs (action);
create index if not exists activity_logs_resource_type_resource_id_idx on public.activity_logs (resource_type, resource_id);
create index if not exists activity_logs_ip_idx on public.activity_logs (ip);
create index if not exists activity_logs_detail_idx on public.activity_logs using gin (detail);
create index if not exists activity_logs_request_context_idx on public.activity_logs using gin (request_context);

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
  constraint notification_preferences_type_key_check check (type_key = any (array['domain_expiry_reminder', 'notification_schedule', 'auth_activity', 'resource_change', 'settings_change']::text[])),
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
  constraint notification_deliveries_type_key_check check (type_key = any (array['domain_expiry_reminder', 'notification_schedule', 'auth_activity', 'resource_change', 'settings_change']::text[])),
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
create unique index if not exists notification_deliveries_dedupe_key_unique_idx
  on public.notification_deliveries (dedupe_key)
  where dedupe_key <> '';
create index if not exists notification_deliveries_payload_idx on public.notification_deliveries using gin (payload);

create table if not exists public.job_runs (
  id uuid primary key default gen_random_uuid(),
  job_key text not null,
  trigger_source text not null default 'manual',
  request_id text not null default '',
  status text not null default 'running',
  message text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint job_runs_status_check check (status = any (array['running', 'success', 'skipped', 'failed']::text[])),
  constraint job_runs_trigger_source_check check (trigger_source = any (array['vercel-cron', 'github-actions', 'server-cron', 'docker-cron', 'manual', 'http', 'cli']::text[]))
);

create index if not exists job_runs_job_key_idx on public.job_runs (job_key);
create index if not exists job_runs_trigger_source_idx on public.job_runs (trigger_source);
create index if not exists job_runs_status_idx on public.job_runs (status);
create index if not exists job_runs_started_at_idx on public.job_runs (started_at desc);

create or replace trigger set_settings_updated_at
before update on public.settings
for each row
execute function public.set_updated_at();

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

create or replace trigger set_job_runs_updated_at
before update on public.job_runs
for each row
execute function public.set_updated_at();

alter table public.sites enable row level security;
alter table public.accounts enable row level security;
alter table public.domains enable row level security;
alter table public.subdomains enable row level security;
alter table public.settings enable row level security;
alter table public.favorite_sites enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notification_endpoints enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.job_runs enable row level security;
