'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { Card, CardContent } from '@/components/ui/card'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { shortDayLabel } from '@/lib/date'

export function ExpiryTrendChart({ data, title }: { data: { name: string; value: number }[]; title: string }) {
  const chartConfig = {
    value: {
      label: '数量',
      color: 'var(--chart-4)',
    },
  } satisfies ChartConfig

  return (
    <Card>
      <CardContent>
        <div className="text-foreground mb-4 text-sm font-medium">{title}</div>
        <ChartContainer config={chartConfig} className="min-h-[220px] w-full md:min-h-[300px]">
          <AreaChart accessibilityLayer data={data}>
            <defs>
              <linearGradient id="fillValue" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value: string) => shortDayLabel(value)}
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => typeof value === 'string' ? shortDayLabel(value) : value} />} />
            <Area type="monotone" dataKey="value" stroke="var(--color-value)" fill="url(#fillValue)" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
