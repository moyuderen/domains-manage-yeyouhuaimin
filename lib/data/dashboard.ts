import { getAccountProviderDistribution, getAccountReuseDistribution, getAccountRisks, getAccountSiteDistribution, getAccountStatistics, getCreatedTrend, getDnsProviderDistribution, getExpiryTimeline, getFreePaidDistribution, getRegistrarDistribution, getStatusDistribution, getUpcomingRisk, getSiteStatistics, getSiteAccountCountDistribution } from '@/lib/dashboard'
import { getAllAccounts } from '@/lib/data/accounts'
import { getDomains } from '@/lib/data/domains'
import { getNotificationRuleSettings } from '@/lib/data/settings'
import { getAllSites } from '@/lib/data/sites'
import { getStatistics } from '@/lib/statistics'
import { DEFAULT_DOMAIN_SORT_BY, DEFAULT_DOMAIN_SORT_ORDER } from '@/types/domain'

export async function getDashboardData() {
  const rulesPromise = getNotificationRuleSettings()
  const accountsPromise = getAllAccounts()
  const sitesPromise = getAllSites()
  const rules = await rulesPromise
  const [{ items: domains }, accounts, sites] = await Promise.all([
    getDomains({
      keyword: '',
      status: 'all',
      registrarSiteId: 'all',
      dnsSiteId: 'all',
      sortBy: DEFAULT_DOMAIN_SORT_BY,
      sortOrder: DEFAULT_DOMAIN_SORT_ORDER,
      page: 1,
      pageSize: 1000,
    }, rules.expiryDays),
    accountsPromise,
    sitesPromise,
  ])

  return {
    domains,
    statistics: getStatistics(domains, rules.expiryDays),
    statusDistribution: getStatusDistribution(domains, rules.expiryDays),
    freePaidDistribution: getFreePaidDistribution(domains),
    registrarDistribution: getRegistrarDistribution(domains, sites),
    dnsProviderDistribution: getDnsProviderDistribution(domains, sites),
    expiry30: getExpiryTimeline(domains, 30),
    createdTrend: getCreatedTrend(domains),
    upcomingRisk: getUpcomingRisk(domains, rules.expiryDays),
    // 账户相关数据
    accountStatistics: getAccountStatistics(accounts),
    accountProviderDistribution: getAccountProviderDistribution(accounts),
    accountSiteDistribution: getAccountSiteDistribution(accounts, sites),
    accountReuseDistribution: getAccountReuseDistribution(accounts, domains),
    accountRisks: getAccountRisks(accounts, domains),
    // 站点相关数据
    siteStatistics: getSiteStatistics(sites),
    siteAccountCountDistribution: getSiteAccountCountDistribution(accounts, sites),
  }
}
