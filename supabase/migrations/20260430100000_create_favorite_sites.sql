create table if not exists public.favorite_sites (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  position int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint favorite_sites_site_id_unique unique (site_id)
);

create index if not exists favorite_sites_position_idx on public.favorite_sites (position);

alter table public.favorite_sites enable row level security;
