import { DashboardPageClient } from '@/components/dashboard/DashboardPageClient'
import { getDashboardData } from '@/lib/data/dashboard'

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <DashboardPageClient
      statistics={data.statistics}
      statusDistribution={data.statusDistribution}
      freePaidDistribution={data.freePaidDistribution}
      registrarDistribution={data.registrarDistribution}
      dnsProviderDistribution={data.dnsProviderDistribution}
      suffixDistribution={data.suffixDistribution}
      expiry30={data.expiry30}
      createdTrend={data.createdTrend}
      upcomingRisk={data.upcomingRisk}
      accountStatistics={data.accountStatistics}
      accountProviderDistribution={data.accountProviderDistribution}
      accountSiteDistribution={data.accountSiteDistribution}
      accountReuseDistribution={data.accountReuseDistribution}
      accountRisks={data.accountRisks}
      siteStatistics={data.siteStatistics}
      siteAccountCountDistribution={data.siteAccountCountDistribution}
    />
  )
}
