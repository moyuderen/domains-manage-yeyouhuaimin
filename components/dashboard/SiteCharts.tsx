'use client'

import { Cell, Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'

import { Card, CardContent } from '@/components/ui/card'
import { type ChartConfig, ChartContainer } from '@/components/ui/chart'
import { createClickableTick, getChartColor, useUrlMap } from './chart-utils'

type SiteAccountData = { name: string; value: number; identifiers: string[]; websiteUrl: string | null }

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: SiteAccountData }[] }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 shadow-md">
      <div className="text-sm font-medium">{item.name}</div>
      <div className="text-muted-foreground mt-1 text-xs">账号总数：{item.value}</div>
      {item.identifiers.length > 0 && (
        <div className="mt-1.5 max-h-40 space-y-0.5 overflow-y-auto">
          {item.identifiers.map((id) => (
            <div key={id} className="text-xs">{id}</div>
          ))}
        </div>
      )}
    </div>
  )
}

export function SiteAccountChart({ data }: { data: SiteAccountData[] }) {
  const urlMap = useUrlMap(data)
  const chartConfig = Object.fromEntries(
    data.map((item, i) => [
      item.name,
      { label: item.name, color: getChartColor(i) },
    ]),
  ) satisfies ChartConfig

  return (
    <Card>
      <CardContent>
        <div className="text-foreground mb-4 text-sm font-medium">站点账号分布</div>
        <ChartContainer config={chartConfig} className="h-[260px] w-full md:h-[320px]">
          <BarChart accessibilityLayer data={data} margin={{ top: 8, right: 8, left: 8, bottom: 56 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} height={64} tick={createClickableTick(urlMap, { truncateText: true, rotate: true })} />
            <YAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} minPointSize={4}>
              {data.map((_, index) => (
                <Cell key={index} fill={getChartColor(index)} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
