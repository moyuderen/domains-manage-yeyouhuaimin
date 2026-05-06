alter table public.domains
alter column registration_date drop not null,
alter column expiry_date drop not null;

alter table public.domains
drop constraint if exists domains_expiry_after_registration;

alter table public.domains
add constraint domains_expiry_after_registration check (
  (registration_date is null and expiry_date is null)
  or (
    registration_date is not null
    and expiry_date is not null
    and expiry_date >= registration_date
  )
);
