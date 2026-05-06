'use client'

import { Activity, CalendarClock, CircleAlert, Globe, Server, ServerCog, ServerOff, Tags, User, UserCheck, UserX, UserPlus } from 'lucide-react'
import { motion } from 'framer-motion'

import { Card, CardContent } from '@/components/ui/card'

type DomainStatistics = {
  total: number
  expiring: number
  expired: number
  newThisWeek: number
}

type AccountStatistics = {
  total: number
  active: number
  inactive: number
  newThisWeek: number
}

const domainItems = [
  { key: 'total', label: '总域名数', valueClassName: 'text-foreground', iconClassName: 'text-foreground', toneClassName: 'bg-muted text-foreground border-border/60', icon: Globe },
  { key: 'expiring', label: '即将到期', valueClassName: 'text-amber-700 dark:text-amber-300', iconClassName: 'text-amber-700 dark:text-amber-300', toneClassName: 'bg-amber-500/10 text-amber-700 border-amber-500/15 dark:text-amber-300', icon: CalendarClock },
  { key: 'expired', label: '已过期', valueClassName: 'text-destructive', iconClassName: 'text-destructive', toneClassName: 'bg-destructive/10 text-destructive border-destructive/15', icon: CircleAlert },
  { key: 'newThisWeek', label: '本周新增', valueClassName: 'text-foreground', iconClassName: 'text-muted-foreground', toneClassName: 'bg-muted/80 text-muted-foreground border-border/60', icon: Activity },
] as const

const accountItems = [
  { key: 'total', label: '总账户数', valueClassName: 'text-foreground', iconClassName: 'text-foreground', toneClassName: 'bg-muted text-foreground border-border/60', icon: User },
  { key: 'active', label: '启用账户', valueClassName: 'text-green-700 dark:text-green-300', iconClassName: 'text-green-700 dark:text-green-300', toneClassName: 'bg-green-500/10 text-green-700 border-green-500/15 dark:text-green-300', icon: UserCheck },
  { key: 'inactive', label: '停用账户', valueClassName: 'text-muted-foreground', iconClassName: 'text-muted-foreground', toneClassName: 'bg-muted/80 text-muted-foreground border-border/60', icon: UserX },
  { key: 'newThisWeek', label: '本周新增', valueClassName: 'text-foreground', iconClassName: 'text-muted-foreground', toneClassName: 'bg-muted/80 text-muted-foreground border-border/60', icon: UserPlus },
] as const

export function DomainStatsCards({ statistics }: { statistics: DomainStatistics }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
      {domainItems.map((item, index) => {
        const Icon = item.icon

        return (
          <motion.div key={item.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
            <Card>
              <CardContent>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-muted-foreground text-sm">{item.label}</div>
                    <div className={`mt-3 text-2xl font-semibold md:text-3xl ${item.valueClassName}`}>{statistics[item.key]}</div>
                  </div>
                  <div className={`${item.toneClassName} flex h-10 w-10 items-center justify-center rounded-2xl border`}>
                    <Icon size={18} className={item.iconClassName} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

export function AccountStatsCards({ statistics }: { statistics: AccountStatistics }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
      {accountItems.map((item, index) => {
        const Icon = item.icon

        return (
          <motion.div key={item.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
            <Card>
              <CardContent>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-muted-foreground text-sm">{item.label}</div>
                    <div className={`mt-3 text-2xl font-semibold md:text-3xl ${item.valueClassName}`}>{statistics[item.key]}</div>
                  </div>
                  <div className={`${item.toneClassName} flex h-10 w-10 items-center justify-center rounded-2xl border`}>
                    <Icon size={18} className={item.iconClassName} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

type SiteStatistics = {
  total: number
  active: number
  inactive: number
  categories: number
}

const siteItems = [
  { key: 'total', label: '总站点数', valueClassName: 'text-foreground', iconClassName: 'text-foreground', toneClassName: 'bg-muted text-foreground border-border/60', icon: Server },
  { key: 'active', label: '启用站点', valueClassName: 'text-green-700 dark:text-green-300', iconClassName: 'text-green-700 dark:text-green-300', toneClassName: 'bg-green-500/10 text-green-700 border-green-500/15 dark:text-green-300', icon: ServerCog },
  { key: 'inactive', label: '停用站点', valueClassName: 'text-muted-foreground', iconClassName: 'text-muted-foreground', toneClassName: 'bg-muted/80 text-muted-foreground border-border/60', icon: ServerOff },
  { key: 'categories', label: '站点分类', valueClassName: 'text-blue-700 dark:text-blue-300', iconClassName: 'text-blue-700 dark:text-blue-300', toneClassName: 'bg-blue-500/10 text-blue-700 border-blue-500/15 dark:text-blue-300', icon: Tags },
] as const

export function SiteStatsCards({ statistics }: { statistics: SiteStatistics }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
      {siteItems.map((item, index) => {
        const Icon = item.icon

        return (
          <motion.div key={item.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
            <Card>
              <CardContent>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-muted-foreground text-sm">{item.label}</div>
                    <div className={`mt-3 text-2xl font-semibold md:text-3xl ${item.valueClassName}`}>{statistics[item.key]}</div>
                  </div>
                  <div className={`${item.toneClassName} flex h-10 w-10 items-center justify-center rounded-2xl border`}>
                    <Icon size={18} className={item.iconClassName} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

// 兼容旧版导出
type StatsCardsProps = {
  statistics: DomainStatistics
  accountStatistics?: AccountStatistics
}

export function StatsCards({ statistics, accountStatistics }: StatsCardsProps) {
  return (
    <div className="space-y-4">
      <DomainStatsCards statistics={statistics} />
      {accountStatistics && <AccountStatsCards statistics={accountStatistics} />}
    </div>
  )
}
