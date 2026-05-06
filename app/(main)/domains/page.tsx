import { DomainsPageClient } from '@/components/domains/DomainsPageClient'
import { buildAccountLookup, getAllAccounts } from '@/lib/data/accounts'
import { getDomains } from '@/lib/data/domains'
import { getNotificationRuleSettings } from '@/lib/data/settings'
import { getActiveSites, getAllSites } from '@/lib/data/sites'
import { getSingleParam } from '@/lib/utils/params'
import { DEFAULT_DOMAIN_SORT_BY, DEFAULT_DOMAIN_SORT_ORDER, DOMAIN_SORT_BY_OPTIONS, DOMAIN_SORT_ORDER_OPTIONS, type DomainFilters } from '@/types/domain'

const defaultFilters: DomainFilters = {
  keyword: '',
  status: 'all',
  registrarSiteId: 'all',
  dnsSiteId: 'all',
  sortBy: DEFAULT_DOMAIN_SORT_BY,
  sortOrder: DEFAULT_DOMAIN_SORT_ORDER,
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
const DEFAULT_PAGE_SIZE = 20

export default async function DomainsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const status = getSingleParam(params?.status)
  const registrarSiteId = getSingleParam(params?.registrarSiteId)
  const dnsSiteId = getSingleParam(params?.dnsSiteId)
  const sortBy = getSingleParam(params?.sortBy)
  const sortOrder = getSingleParam(params?.sortOrder)
  const pageSize = Number.parseInt(getSingleParam(params?.pageSize) ?? String(DEFAULT_PAGE_SIZE), 10)
  const filters: DomainFilters = {
    keyword: getSingleParam(params?.keyword) ?? defaultFilters.keyword,
    status: isStatusValue(status) ? status : defaultFilters.status,
    registrarSiteId: registrarSiteId || defaultFilters.registrarSiteId,
    dnsSiteId: dnsSiteId || defaultFilters.dnsSiteId,
    sortBy: isSortByValue(sortBy) ? sortBy : defaultFilters.sortBy,
    sortOrder: isSortOrderValue(sortOrder) ? sortOrder : defaultFilters.sortOrder,
  }
  const page = Math.max(1, Number.parseInt(getSingleParam(params?.page) ?? '1', 10) || 1)

  const rulesPromise = getNotificationRuleSettings()
  const sitesPromise = getActiveSites()
  const linkSitesPromise = getAllSites()
  const accountsPromise = getAllAccounts()
  const rules = await rulesPromise
  const [result, sites, linkSites, accounts] = await Promise.all([
    getDomains({
      ...filters,
      page,
      pageSize: isPageSizeValue(pageSize) ? pageSize : DEFAULT_PAGE_SIZE,
    }, rules.expiryDays),
    sitesPromise,
    linkSitesPromise,
    accountsPromise,
  ])

  const accountLookup = buildAccountLookup(accounts)

  return <DomainsPageClient initialFilters={filters} paginatedDomains={result} sites={sites} linkSites={linkSites} accounts={accounts} accountLookup={accountLookup} expiryDays={rules.expiryDays} />
}

function isStatusValue(value?: string): value is DomainFilters['status'] {
  return value === 'all' || value === 'normal' || value === 'expiring' || value === 'expired'
}

function isSortByValue(value?: string): value is DomainFilters['sortBy'] {
  return DOMAIN_SORT_BY_OPTIONS.includes(value as DomainFilters['sortBy'])
}

function isSortOrderValue(value?: string): value is DomainFilters['sortOrder'] {
  return DOMAIN_SORT_ORDER_OPTIONS.includes(value as DomainFilters['sortOrder'])
}

function isPageSizeValue(value: number): value is (typeof PAGE_SIZE_OPTIONS)[number] {
  return PAGE_SIZE_OPTIONS.includes(value as (typeof PAGE_SIZE_OPTIONS)[number])
}
