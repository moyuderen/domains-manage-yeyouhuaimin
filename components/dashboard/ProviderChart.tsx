'use client'

import { useRouter } from 'next/navigation'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { Card, CardContent } from '@/components/ui/card'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { createClickableTick, useUrlMap } from './chart-utils'
import type { DnsDistributionItem, RegistrarDistributionItem } from '@/lib/dashboard'

const BAR_CHART_CONFIG = {
  value: {
    label: '数量',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig

function BarChartCard({
  data,
  title,
  tooltipContent,
  onBarClick,
}: {
  data: { name: string; value: number; websiteUrl: string | null }[]
  title: string
  tooltipContent: React.ReactElement
  onBarClick?: (barData: { payload?: Record<string, unknown> }) => void
}) {
  const urlMap = useUrlMap(data)

  return (
    <Card>
      <CardContent>
        <div className="text-foreground mb-4 text-sm font-medium">{title}</div>
        <ChartContainer config={BAR_CHART_CONFIG} className="min-h-[220px] w-full md:min-h-[300px]">
          <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
            <YAxis
              dataKey="name"
              type="category"
              width={80}
              interval={0}
              tickLine={false}
              axisLine={false}
              tick={createClickableTick(urlMap, { truncateText: true, rotate: true })}
            />
            <ChartTooltip content={tooltipContent} />
            <Bar
              dataKey="value"
              fill="var(--color-value)"
              radius={[0, 6, 6, 0]}
              onClick={onBarClick}
              cursor={onBarClick ? 'pointer' : undefined}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function RegistrarTooltip({ active, payload }: { active?: boolean; payload?: { payload: RegistrarDistributionItem }[] }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload

  return (
    <div className="bg-popover text-popover-foreground w-60 rounded-lg border px-2.5 py-2 shadow-md">
      <div className="text-sm font-medium">{item.name}</div>
      <div className="text-muted-foreground mt-0.5 text-xs">域名数量：{item.value}</div>
      {item.domains.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {item.domains.map((name) => (
            <div key={name} className="text-xs">{name}</div>
          ))}
        </div>
      )}
      {item.value > 5 && (
        <div className="text-muted-foreground mt-2 text-xs">
          共 {item.value} 个，点击柱条查看全部
        </div>
      )}
    </div>
  )
}

export function RegistrarChart({ data, title }: { data: RegistrarDistributionItem[]; title: string }) {
  const router = useRouter()

  const handleClick = (barData: { payload?: Record<string, unknown> }) => {
    const item = barData.payload as RegistrarDistributionItem | undefined
    if (item?.registrarSiteId) {
      router.push(`/domains?registrarSiteId=${item.registrarSiteId}`)
    }
  }

  return (
    <BarChartCard
      data={data}
      title={title}
      tooltipContent={<RegistrarTooltip />}
      onBarClick={handleClick}
    />
  )
}

export function ProviderChart({ data, title }: { data: DnsDistributionItem[]; title: string }) {
  return (
    <BarChartCard
      data={data}
      title={title}
      tooltipContent={<ChartTooltipContent />}
    />
  )
}
