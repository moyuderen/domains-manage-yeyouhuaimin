'use client'

import { Pie, PieChart } from 'recharts'

import { Card, CardContent } from '@/components/ui/card'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

import { getChartColor } from './chart-utils'

export function PurposeChart({ data = [], title }: { data?: { name: string; value: number }[]; title: string }) {
  const chartData = data.map((item, i) => ({
    ...item,
    fill: getChartColor(i),
  }))

  const chartConfig = Object.fromEntries(
    data.map((item, i) => [item.name, { label: item.name, color: getChartColor(i) }]),
  ) satisfies ChartConfig

  return (
    <Card>
      <CardContent>
        <div className="text-foreground mb-4 text-sm font-medium">{title}</div>
        <ChartContainer config={chartConfig} className="mx-auto min-h-[200px] md:min-h-[250px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
