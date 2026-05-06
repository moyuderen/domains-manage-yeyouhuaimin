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

create or replace trigger set_job_runs_updated_at
before update on public.job_runs
for each row
execute function public.set_updated_at();

alter table public.job_runs enable row level security;
