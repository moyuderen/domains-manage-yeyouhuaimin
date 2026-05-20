import { getAccountProviderDistribution, getAccountReuseDistribution, getAccountRisks, getAccountSiteDistribution, getAccountStatistics, getCreatedTrend, getDnsProviderDistribution, getDomainSuffixDistribution, getExpiryTimeline, getFreePaidDistribution, getRegistrarDistribution, getStatusDistribution, getUpcomingRisk, getSiteStatistics, getSiteAccountCountDistribution } from '@/lib/dashboard'
import { getAllAccounts } from '@/lib/data/accounts'
import { listAllDomainsForDashboard } from '@/lib/data/domains'
import { getNotificationRuleSettings } from '@/lib/data/settings'
import { getAllSites } from '@/lib/data/sites'
import { getStatistics } from '@/lib/statistics'
export async function getDashboardData() {
  const rulesPromise = getNotificationRuleSettings()
  const accountsPromise = getAllAccounts()
  const sitesPromise = getAllSites()
  const domainsPromise = listAllDomainsForDashboard()
  const rules = await rulesPromise
  const [domains, accounts, sites] = await Promise.all([
    domainsPromise,
    accountsPromise,
    sitesPromise,
  ])

  return {
    statistics: getStatistics(domains, rules.expiryDays),
    statusDistribution: getStatusDistribution(domains, rules.expiryDays),
    freePaidDistribution: getFreePaidDistribution(domains),
    registrarDistribution: getRegistrarDistribution(domains, sites),
    dnsProviderDistribution: getDnsProviderDistribution(domains, sites),
    suffixDistribution: getDomainSuffixDistribution(domains),
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
