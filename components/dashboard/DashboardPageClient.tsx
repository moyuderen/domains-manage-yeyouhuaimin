'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Globe, KeyRound, LayoutGrid, RefreshCw, TriangleAlert } from 'lucide-react'

import { AccountProviderChart, AccountSiteChart, AccountReuseChart, AccountRiskCard } from '@/components/dashboard/AccountCharts'
import { OverviewCharts } from '@/components/dashboard/OverviewCharts'
import { SiteAccountChart } from '@/components/dashboard/SiteCharts'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DomainStatsCards, AccountStatsCards, SiteStatsCards } from '@/components/dashboard/StatsCards'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate } from '@/lib/date'
import { useRefreshWithSpin } from '@/hooks/useRefreshWithSpin'
import type {
  AccountProviderDistributionItem,
  AccountReuseDistributionItem,
  DnsDistributionItem,
  InactiveAccountRiskItem,
  RegistrarDistributionItem,
  StaleAccountRiskItem,
} from '@/lib/dashboard'
import { isDashboardTab, parseDashboardTab } from '@/types/dashboard'
import type { Domain } from '@/types/domain'

type DashboardPageClientProps = {
  statistics: {
    total: number
    expiring: number
    expired: number
    newThisWeek: number
  }
  statusDistribution: { name: string; value: number }[]
  freePaidDistribution: { name: string; value: number }[]
  registrarDistribution: RegistrarDistributionItem[]
  dnsProviderDistribution: DnsDistributionItem[]
  expiry30: { name: string; value: number }[]
  createdTrend: { name: string; value: number }[]
  upcomingRisk: Domain[]
  // 账户相关
  accountStatistics: {
    total: number
    active: number
    inactive: number
    newThisWeek: number
  }
  accountProviderDistribution: AccountProviderDistributionItem[]
  accountSiteDistribution: { name: string; value: number; siteNames: string[] }[]
  accountReuseDistribution: AccountReuseDistributionItem[]
  accountRisks: {
    inactiveWithDomains: InactiveAccountRiskItem[]
    staleAccounts: StaleAccountRiskItem[]
  }
  // 站点相关
  siteStatistics: {
    total: number
    active: number
    inactive: number
    categories: number
  }
  siteAccountCountDistribution: { name: string; value: number; identifiers: string[]; websiteUrl: string | null }[]
}

export function DashboardPageClient(props: DashboardPageClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = parseDashboardTab(searchParams.get('tab'))
  const { spinning, refresh } = useRefreshWithSpin()

  const handleTabChange = (nextTab: string) => {
    if (!isDashboardTab(nextTab) || nextTab === activeTab) return

    const params = new URLSearchParams(searchParams.toString())
    if (nextTab === 'domains') params.delete('tab')
    else params.set('tab', nextTab)

    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex items-center justify-between">
          <TabsList variant="line">
            <TabsTrigger value="domains">
              <Globe size={16} data-icon="inline-start" />
              域名监控
            </TabsTrigger>
            <TabsTrigger value="sites">
              <LayoutGrid size={16} data-icon="inline-start" />
              站点监控
            </TabsTrigger>
            <TabsTrigger value="accounts">
              <KeyRound size={16} data-icon="inline-start" />
              账户监控
            </TabsTrigger>
          </TabsList>
          <Button variant="ghost" size="icon" onClick={refresh} disabled={spinning}>
            <RefreshCw size={16} className={spinning ? 'animate-spin' : ''} />
          </Button>
        </div>

        <TabsContent value="domains" className="mt-6 space-y-6">
          <DomainStatsCards statistics={props.statistics} />

          <Card>
            <CardContent>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <TriangleAlert size={16} className="text-amber-600 dark:text-amber-300" />
                近期风险提醒
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-5">
                {props.upcomingRisk.length ? (
                  props.upcomingRisk.map((domain) => (
                    <div key={domain.id} className="bg-amber-500/8 rounded-2xl border border-amber-500/15 p-4">
                      <div className="font-medium text-foreground">{domain.name}</div>
                      <div className="text-muted-foreground mt-2 text-sm">到期：{formatDate(domain.expiryDate)}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground text-sm">暂无 7 天内到期域名。</div>
                )}
              </div>
            </CardContent>
          </Card>

          <OverviewCharts
            statusDistribution={props.statusDistribution ?? []}
            freePaidDistribution={props.freePaidDistribution ?? []}
            registrarDistribution={props.registrarDistribution ?? []}
            dnsProviderDistribution={props.dnsProviderDistribution ?? []}
            expiry30={props.expiry30 ?? []}
            createdTrend={props.createdTrend ?? []}
          />
        </TabsContent>

        <TabsContent value="accounts" className="mt-6 space-y-6">
          <AccountStatsCards statistics={props.accountStatistics} />

          <div className="grid gap-6 md:grid-cols-2">
            <AccountProviderChart data={props.accountProviderDistribution} />
            <AccountReuseChart data={props.accountReuseDistribution} />
          </div>

          <AccountSiteChart data={props.accountSiteDistribution} />

          <AccountRiskCard inactiveWithDomains={props.accountRisks.inactiveWithDomains} staleAccounts={props.accountRisks.staleAccounts} />
        </TabsContent>

        <TabsContent value="sites" className="mt-6 space-y-6">
          <SiteStatsCards statistics={props.siteStatistics} />

          <SiteAccountChart data={props.siteAccountCountDistribution} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
