with domain_relations as (
  select registrar_account_id as account_id, registrar_site_id as site_id
  from public.domains
  where registrar_account_id is not null and registrar_site_id is not null

  union

  select dns_account_id as account_id, dns_site_id as site_id
  from public.domains
  where dns_account_id is not null and dns_site_id is not null
),
candidate_entries as (
  select
    account.id as account_id,
    coalesce(site.id::text, entry.value ->> 'site') as site_key,
    site.id::text as resolved_site_id,
    case
      when site.id is not null then jsonb_set(entry.value, '{site}', to_jsonb(site.id::text))
      else entry.value
    end as entry,
    case when site.id is not null then 0 else 1 end as priority,
    entry.ordinality
  from public.accounts account
  join lateral jsonb_array_elements(coalesce(account.sites, '[]'::jsonb)) with ordinality as entry(value, ordinality) on true
  left join public.sites site
    on site.id::text = entry.value ->> 'site'
    or site.name = entry.value ->> 'site'

  union all

  select
    relation.account_id,
    relation.site_id::text as site_key,
    relation.site_id::text as resolved_site_id,
    jsonb_build_object('site', relation.site_id::text, 'note', '', 'isActive', true) as entry,
    2 as priority,
    1000000 + row_number() over (partition by relation.account_id order by relation.site_id) as ordinality
  from domain_relations relation
),
ranked_entries as (
  select
    candidate.account_id,
    candidate.site_key,
    candidate.resolved_site_id,
    candidate.entry,
    candidate.priority,
    candidate.ordinality,
    row_number() over (
      partition by candidate.account_id, candidate.site_key
      order by candidate.priority, candidate.ordinality
    ) as rank,
    first_value(nullif(candidate.entry ->> 'note', '')) over (
      partition by candidate.account_id, candidate.site_key
      order by case when nullif(candidate.entry ->> 'note', '') is null then 1 else 0 end, candidate.priority, candidate.ordinality
      rows between unbounded preceding and unbounded following
    ) as preserved_note,
    bool_or(coalesce((candidate.entry ->> 'isActive')::boolean, true) = false) over (
      partition by candidate.account_id, candidate.site_key
    ) as has_inactive
  from candidate_entries candidate
  where candidate.site_key is not null and candidate.site_key <> ''
),
final_entries as (
  select
    ranked.account_id,
    jsonb_build_object(
      'site', coalesce(ranked.resolved_site_id, ranked.site_key),
      'note', coalesce(ranked.preserved_note, ''),
      'isActive', not ranked.has_inactive
    ) as entry,
    ranked.ordinality as sort_order
  from ranked_entries ranked
  where ranked.rank = 1
),
final_accounts as (
  select
    account.id,
    coalesce(
      (
        select jsonb_agg(final.entry order by final.sort_order)
        from final_entries final
        where final.account_id = account.id
      ),
      '[]'::jsonb
    ) as sites
  from public.accounts account
)
update public.accounts account
set sites = final_accounts.sites
from final_accounts
where account.id = final_accounts.id
  and account.sites is distinct from final_accounts.sites;
