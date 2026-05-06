alter table public.domains
  add column if not exists is_free boolean not null default true,
  add column if not exists currency text not null default 'CNY',
  add column if not exists purchase_price numeric(10,2),
  add column if not exists renewal_price numeric(10,2),
  add column if not exists auto_renewal boolean not null default false;

alter table public.domains
  add constraint domains_currency_check
  check (currency = any (array['CNY', 'USD', 'EUR', 'JPY', 'GBP']::text[]));

alter table public.domains
  add constraint domains_paid_prices_required
  check (is_free or (purchase_price is not null and renewal_price is not null));
