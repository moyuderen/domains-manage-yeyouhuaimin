'use client'

import { AlertTriangle, Clock } from 'lucide-react'
import Link from 'next/link'
import { Pie, PieChart, Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts'
import { motion } from 'framer-motion'

import { Card, CardContent } from '@/components/ui/card'
import { type ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { getChartColor, TruncatedTick } from './chart-utils'

import type {
  AccountProviderDistributionItem,
  AccountReuseDistributionItem,
  InactiveAccountRiskItem,
  StaleAccountRiskItem,
} from '@/lib/dashboard'

function AccountProviderTooltip({ active, payload }: { active?: boolean; payload?: { payload: AccountProviderDistributionItem }[] }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 shadow-md">
      <div className="text-sm font-medium">{item.name}</div>
      <div className="text-muted-foreground mt-1 text-xs">账号数量：{item.value}</div>
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

export function AccountProviderChart({ data }: { data: AccountProviderDistributionItem[] }) {
  const chartData = data.map((item, i) => ({
    ...item,
    fill: getChartColor(i),
  }))

  const chartConfig = Object.fromEntries(
    data.map((item, i) => [
      item.name,
      { label: item.name, color: getChartColor(i) },
    ]),
  ) satisfies ChartConfig

  return (
    <Card>
      <CardContent>
        <div className="text-foreground mb-4 text-sm font-medium">邮箱提供商分布</div>
        <ChartContainer config={chartConfig} className="mx-auto min-h-[200px] md:min-h-[250px]">
          <PieChart>
            <ChartTooltip content={<AccountProviderTooltip />} />
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

type AccountSiteData = { name: string; value: number; siteNames: string[] }

function AccountSiteTooltip({ active, payload }: { active?: boolean; payload?: { payload: AccountSiteData }[] }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 shadow-md">
      <div className="text-sm font-medium">{item.name}</div>
      <div className="text-muted-foreground mt-1 text-xs">站点总数：{item.value}</div>
      {item.siteNames.length > 0 && (
        <div className="mt-1.5 max-h-40 space-y-0.5 overflow-y-auto">
          {item.siteNames.map((name) => (
            <div key={name} className="text-xs">{name}</div>
          ))}
        </div>
      )}
    </div>
  )
}

export function AccountSiteChart({ data }: { data: AccountSiteData[] }) {
  const chartConfig = Object.fromEntries(
    data.map((item, i) => [
      item.name,
      { label: item.name, color: getChartColor(i) },
    ]),
  ) satisfies ChartConfig

  return (
    <Card>
      <CardContent>
        <div className="text-foreground mb-4 text-sm font-medium">注册站点分布</div>
        <ChartContainer config={chartConfig} className="min-h-[220px] w-full md:min-h-[280px]">
          <BarChart accessibilityLayer data={data} margin={{ top: 8, bottom: 40 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} height={50} tick={TruncatedTick} />
            <YAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip content={<AccountSiteTooltip />} />
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

function AccountReuseTooltip({ active, payload }: { active?: boolean; payload?: { payload: AccountReuseDistributionItem }[] }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload

  return (
    <div className="bg-popover text-popover-foreground w-60 rounded-lg border px-2.5 py-2 shadow-md">
      <div className="text-sm font-medium">{item.name}</div>
      <div className="text-muted-foreground mt-0.5 text-xs">账户总数：{item.value}</div>
      {item.accounts.length > 0 && (
        <div className="mt-1.5 max-h-40 space-y-1 overflow-y-auto pr-1">
          {item.accounts.map((account) => (
            <div
              key={account.accountId}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${account.isActive ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border bg-muted/20'}`}
            >
              <Link
                href={`/accounts/${account.accountId}`}
                className={`min-w-0 flex-1 truncate font-medium underline-offset-4 hover:underline ${account.isActive ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {account.identifier}
              </Link>
              <span className={`shrink-0 text-[11px] ${account.isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}>
                x{account.reuseCount}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function AccountReuseChart({ data }: { data: AccountReuseDistributionItem[] }) {
  const chartConfig = {
    value: {
      label: '账户数',
      color: 'var(--chart-4)',
    },
  } satisfies ChartConfig

  return (
    <Card>
      <CardContent>
        <div className="text-foreground mb-4 text-sm font-medium">账户复用情况</div>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full md:min-h-[250px]">
          <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
            <YAxis dataKey="name" type="category" width={70} tickLine={false} axisLine={false} />
            <Tooltip content={<AccountReuseTooltip />} wrapperStyle={{ pointerEvents: 'auto' }} />
            <Bar dataKey="value" fill="var(--color-value)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

type AccountRisksProps = {
  inactiveWithDomains: InactiveAccountRiskItem[]
  staleAccounts: StaleAccountRiskItem[]
}

export function AccountRiskCard({ inactiveWithDomains, staleAccounts }: AccountRisksProps) {
  const hasRisks = inactiveWithDomains.length > 0 || staleAccounts.length > 0

  if (!hasRisks) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <AlertTriangle size={16} className="text-green-600 dark:text-green-400" />
            账户风险监控
          </div>
          <div className="mt-4 text-muted-foreground text-sm">暂无风险账户。</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <AlertTriangle size={16} className="text-amber-600 dark:text-amber-300" />
          账户风险监控
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {inactiveWithDomains.length > 0 && (
            <div className="space-y-3">
              <div className="text-muted-foreground text-xs">停用但有关联域名</div>
              {inactiveWithDomains.slice(0, 3).map((account) => (
                <motion.div key={account.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="bg-red-500/8 rounded-xl border border-red-500/15 p-3">
                    <div className="font-medium text-foreground text-sm">{account.identifier}</div>
                    <div className="text-muted-foreground mt-1 text-xs">关联 {account.domainCount} 个域名</div>
                  </div>
                </motion.div>
              ))}
              {inactiveWithDomains.length > 3 && (
                <div className="text-muted-foreground text-xs">还有 {inactiveWithDomains.length - 3} 个...</div>
              )}
            </div>
          )}
          {staleAccounts.length > 0 && (
            <div className="space-y-3">
              <div className="text-muted-foreground text-xs">超过 90 天未更新</div>
              {staleAccounts.slice(0, 3).map((account) => (
                <motion.div key={account.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="bg-amber-500/8 rounded-xl border border-amber-500/15 p-3">
                    <div className="font-medium text-foreground text-sm">{account.identifier}</div>
                    <div className="text-muted-foreground mt-1 text-xs">
                      <Clock size={12} className="mr-1 inline" />
                      {account.daysSinceUpdate} 天前更新
                    </div>
                  </div>
                </motion.div>
              ))}
              {staleAccounts.length > 3 && (
                <div className="text-muted-foreground text-xs">还有 {staleAccounts.length - 3} 个...</div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
