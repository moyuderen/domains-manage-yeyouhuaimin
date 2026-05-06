alter table public.domains
add column if not exists renewal_days_before_expiry integer;
