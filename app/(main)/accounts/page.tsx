import { AccountsPageClient } from '@/components/accounts/AccountsPageClient'
import { getAccounts, getUsedSites, getAllAccounts } from '@/lib/data/accounts'
import { getActiveSites } from '@/lib/data/sites'
import { getSingleParam } from '@/lib/utils/params'
import { isEmail } from '@/schemas/accountSchemas'
import { EMAIL_PROVIDERS, type AccountFilters, type EmailProvider } from '@/types/account'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
const DEFAULT_PAGE_SIZE = 20

const defaultFilters: AccountFilters = {
  keyword: '',
  emailProvider: 'all',
  site: 'all',
  isActive: 'all',
}

export default async function AccountsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const rawKeyword = getSingleParam(params?.keyword)
  const rawEmailProvider = getSingleParam(params?.emailProvider)
  const rawSite = getSingleParam(params?.site)
  const rawIsActive = getSingleParam(params?.isActive)
  const rawPageSize = getSingleParam(params?.pageSize)
  const pageSize = Number.parseInt(rawPageSize ?? String(DEFAULT_PAGE_SIZE), 10)
  const filters: AccountFilters = {
    keyword: rawKeyword ?? defaultFilters.keyword,
    emailProvider: isEmailProviderValue(rawEmailProvider) ? rawEmailProvider : defaultFilters.emailProvider,
    site: (rawSite && rawSite.trim()) ? rawSite.trim() : defaultFilters.site,
    isActive: isActiveValue(rawIsActive) ? (rawIsActive === 'active') : defaultFilters.isActive,
  }
  const page = Math.max(1, Number.parseInt(getSingleParam(params?.page) ?? '1', 10) || 1)

  const [result, usedSites, activeSites, allAccounts] = await Promise.all([
    getAccounts({
      ...filters,
      page,
      pageSize: isPageSizeValue(pageSize) ? pageSize : DEFAULT_PAGE_SIZE,
    }),
    getUsedSites(),
    getActiveSites(),
    getAllAccounts(),
  ])

  const emailIdentifiers = allAccounts.filter((a) => isEmail(a.identifier)).map((a) => a.identifier)

  return <AccountsPageClient initialFilters={filters} paginatedAccounts={result} usedSites={usedSites} sites={activeSites} emailIdentifiers={emailIdentifiers} />
}

function isEmailProviderValue(value?: string): value is EmailProvider {
  return Boolean(value && EMAIL_PROVIDERS.includes(value as EmailProvider))
}

function isActiveValue(value?: string): value is 'active' | 'inactive' {
  return value === 'active' || value === 'inactive'
}

function isPageSizeValue(value: number): value is (typeof PAGE_SIZE_OPTIONS)[number] {
  return PAGE_SIZE_OPTIONS.includes(value as (typeof PAGE_SIZE_OPTIONS)[number])
}
