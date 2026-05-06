alter table public.activity_logs
  add column if not exists event_key text,
  add column if not exists resource_type text not null default '',
  add column if not exists resource_id text not null default '',
  add column if not exists request_context jsonb not null default '{}'::jsonb,
  add column if not exists actor_user_id text not null default '',
  add column if not exists severity text not null default 'info',
  add column if not exists result text not null default 'success',
  add column if not exists idempotency_key text not null default '',
  add column if not exists occurred_at timestamptz not null default timezone('utc', now());

update public.activity_logs
set event_key = concat(category, '.', action)
where event_key is null or event_key = '';

alter table public.activity_logs
  alter column event_key set not null;

alter table public.activity_logs
  drop constraint if exists activity_logs_severity_check,
  add constraint activity_logs_severity_check check (severity = any (array['info', 'warning', 'critical']::text[]));

alter table public.activity_logs
  drop constraint if exists activity_logs_result_check,
  add constraint activity_logs_result_check check (result = any (array['success', 'failure']::text[]));

create index if not exists activity_logs_occurred_at_idx on public.activity_logs (occurred_at desc);
create index if not exists activity_logs_event_key_idx on public.activity_logs (event_key);
create index if not exists activity_logs_resource_type_resource_id_idx on public.activity_logs (resource_type, resource_id);
create index if not exists activity_logs_request_context_idx on public.activity_logs using gin (request_context);
