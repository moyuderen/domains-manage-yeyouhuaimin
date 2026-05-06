with ranked_deliveries as (
  select
    id,
    dedupe_key,
    row_number() over (
      partition by dedupe_key
      order by created_at asc, id asc
    ) as row_number
  from public.notification_deliveries
  where dedupe_key <> ''
),
duplicates as (
  select id
  from ranked_deliveries
  where row_number > 1
)
delete from public.notification_deliveries delivery
using duplicates
where delivery.id = duplicates.id;

create unique index if not exists notification_deliveries_dedupe_key_unique_idx
  on public.notification_deliveries (dedupe_key)
  where dedupe_key <> '';
