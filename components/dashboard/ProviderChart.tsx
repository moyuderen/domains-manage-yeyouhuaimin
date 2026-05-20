'use client'

import { useMemo } from 'react'

import { useRouter } from 'next/navigation'
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'

import { Card, CardContent } from '@/components/ui/card'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { DnsDistributionItem, DomainSuffixDistributionItem, RegistrarDistributionItem } from '@/lib/dashboard'
import { createClickableTick, getScrollableChartMinWidth, SCROLLABLE_BAR_MAX_WIDTH, TruncatedTick, useUrlMap } from './chart-utils'

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
  data: { name: string; value: number; websiteUrl?: string | null }[]
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

function DomainSuffixTooltip({ active, payload }: { active?: boolean; payload?: { payload: DomainSuffixDistributionItem }[] }) {
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
      {item.value > item.domains.length && (
        <div className="text-muted-foreground mt-2 text-xs">
          共 {item.value} 个，点击查看全部
        </div>
      )}
    </div>
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

export function DomainSuffixChart({ data, title }: { data: DomainSuffixDistributionItem[]; title: string }) {
  const router = useRouter()
  const minWidth = useMemo(() => getScrollableChartMinWidth(data.length), [data.length])

  const handleClick = (barData: { payload?: Record<string, unknown> }) => {
    const item = barData.payload as DomainSuffixDistributionItem | undefined
    if (item?.suffix) {
      router.push(`/domains?suffix=${encodeURIComponent(item.suffix)}`)
    }
  }

  return (
    <Card>
      <CardContent>
        <div className="text-foreground mb-4 text-sm font-medium">{title}</div>
        <div className="overflow-x-auto pb-2">
          <ChartContainer config={BAR_CHART_CONFIG} className="h-[240px] min-h-[240px]" style={{ width: `max(100%, ${minWidth}px)` }}>
            <BarChart accessibilityLayer data={data} margin={{ top: 8, right: 12, left: 12, bottom: 16 }} barCategoryGap="20%">
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="name"
                interval={0}
                height={52}
                tickLine={false}
                axisLine={false}
                tick={TruncatedTick}
              />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<DomainSuffixTooltip />} />
              <Bar
                dataKey="value"
                fill="var(--color-value)"
                radius={[6, 6, 0, 0]}
                maxBarSize={SCROLLABLE_BAR_MAX_WIDTH}
                onClick={handleClick}
                cursor="pointer"
              >
                <LabelList
                  dataKey="value"
                  position="top"
                  offset={8}
                  className="fill-foreground text-[11px]"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
