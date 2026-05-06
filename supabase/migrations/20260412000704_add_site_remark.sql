alter table public.sites
add column if not exists remark text not null default '';
