create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  action text not null,
  resource_name text not null default '',
  summary text not null,
  detail jsonb not null default '{}'::jsonb,
  ip text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  constraint activity_logs_category_check check (category = any (array['auth', 'domain', 'site', 'account', 'settings']::text[])),
  constraint activity_logs_action_check check (action = any (array['login', 'login_failed', 'logout', 'create', 'update', 'delete']::text[]))
);

create index if not exists activity_logs_created_at_idx on public.activity_logs (created_at desc);
create index if not exists activity_logs_category_idx on public.activity_logs (category);
create index if not exists activity_logs_action_idx on public.activity_logs (action);
create index if not exists activity_logs_ip_idx on public.activity_logs (ip);
create index if not exists activity_logs_detail_idx on public.activity_logs using gin (detail);

alter table public.activity_logs enable row level security;
