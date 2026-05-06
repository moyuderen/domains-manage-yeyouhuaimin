import { ExpiryTrendChart } from '@/components/dashboard/ExpiryTrendChart'
import { ProviderChart, RegistrarChart } from '@/components/dashboard/ProviderChart'
import { PurposeChart } from '@/components/dashboard/PurposeChart'
import type { DnsDistributionItem, RegistrarDistributionItem } from '@/lib/dashboard'

type OverviewChartsProps = {
  statusDistribution: { name: string; value: number }[]
  freePaidDistribution: { name: string; value: number }[]
  registrarDistribution: RegistrarDistributionItem[]
  dnsProviderDistribution: DnsDistributionItem[]
  expiry30: { name: string; value: number }[]
  createdTrend: { name: string; value: number }[]
}

export function OverviewCharts(props: OverviewChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <PurposeChart data={props.statusDistribution} title="到期状态分布" />
      <PurposeChart data={props.freePaidDistribution} title="免费/付费域名分布" />
      <RegistrarChart data={props.registrarDistribution} title="注册商分布" />
      <ProviderChart data={props.dnsProviderDistribution} title="DNS 站点分布" />
      <ExpiryTrendChart data={props.expiry30} title="未来 30 天到期趋势" />
      <ExpiryTrendChart data={props.createdTrend} title="新增域名趋势" />
    </div>
  )
}
