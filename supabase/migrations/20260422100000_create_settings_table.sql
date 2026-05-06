create table if not exists public.settings (
  key text primary key,
  value text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace trigger set_settings_updated_at
before update on public.settings
for each row
execute function public.set_updated_at();

alter table public.settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'settings' and policyname = 'settings_dev_all'
  ) then
    create policy settings_dev_all on public.settings
      for all
      using (true)
      with check (true);
  end if;
end
$$;
