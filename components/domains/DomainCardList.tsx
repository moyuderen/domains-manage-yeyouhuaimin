'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { CircleHelp, Copy, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { DEFAULT_VISIBLE_DOMAIN_COLUMNS, type HideableDomainColumnKey } from '@/components/domains/domain-columns'
import { SiteLinkCell, AccountCell } from '@/components/domains/domain-cells'
import { TooltipProvider } from '@/components/ui/tooltip'
import { formatDate } from '@/lib/date'
import { cn } from '@/lib/utils'
import { getDomainStatus, getExpiryCountdownLabel, getStatusColor, getStatusLabel } from '@/lib/domainStatus'
import type { AccountLookup } from '@/lib/data/accounts'
import type { Domain } from '@/types/domain'
import type { Site } from '@/types/site'

type DomainCardListProps = {
  domains: Domain[]
  linkSites: Site[]
  visibleColumns: HideableDomainColumnKey[]
  accountLookup: AccountLookup
  expiryDays: number
  onViewDetail: (domain: Domain) => void
  onEdit: (domain: Domain) => void
  onClone: (domain: Domain) => void
  onDelete: (domain: Domain) => void
}

export function DomainCardList({ domains, linkSites, visibleColumns = DEFAULT_VISIBLE_DOMAIN_COLUMNS, accountLookup, expiryDays, onViewDetail, onEdit, onClone, onDelete }: DomainCardListProps) {
  const isVisible = (column: HideableDomainColumnKey) => visibleColumns.includes(column)
  const siteById = useMemo(() => new Map(linkSites.map((site) => [site.id, site])), [linkSites])

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {domains.map((domain) => {
          const status = getDomainStatus(domain.expiryDate, expiryDays)
          const expiryCountdown = getExpiryCountdownLabel(domain.expiryDate)

          return (
            <div key={domain.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Link
                    href={`/domains/${domain.id}`}
                    className={cn(
                      'font-medium truncate transition-colors hover:text-primary',
                      domain.isFree ? 'text-foreground' : 'text-amber-600 dark:text-amber-400',
                    )}
                  >
                    {domain.name}
                  </Link>
                  {domain.subdomains.length > 0 && (
                    <Badge variant="secondary" className="shrink-0 text-xs tabular-nums">
                      {domain.subdomains.length} 子域
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(domain)} aria-label={`编辑域名 ${domain.name}`}>
                    <Pencil size={14} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8" aria-label="更多操作">
                        <MoreHorizontal size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDetail(domain)}>
                        <Eye className="mr-2 size-4" />
                        查看详情
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onClone(domain)}>
                        <Copy className="mr-2 size-4" />
                        复制域名
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(domain)}>
                        <Trash2 className="mr-2 size-4" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {isVisible('status') && (
                  <div>
                    <span className="text-muted-foreground">状态</span>
                    <div className="mt-0.5"><Badge className={getStatusColor(status)} variant="outline">{getStatusLabel(status)}</Badge></div>
                  </div>
                )}
                {isVisible('expiryDate') && (
                  <div>
                    <span className="text-muted-foreground">到期时间</span>
                    <div className="mt-0.5 flex items-center gap-1">
                      <span>{formatDate(domain.expiryDate)}</span>
                      {expiryCountdown && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <CircleHelp className="size-3" />
                          {expiryCountdown}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {isVisible('registrar') && (
                  <div>
                    <span className="text-muted-foreground">注册站点</span>
                    <div className="mt-0.5">
                      <SiteLinkCell siteId={domain.registrarSiteId} siteById={siteById} />
                    </div>
                  </div>
                )}
                {isVisible('registrarAccount') && (
                  <div>
                    <span className="text-muted-foreground">注册账号</span>
                    <div className="mt-0.5 truncate">
                      <AccountCell accountId={domain.registrarAccountId} accountLookup={accountLookup} />
                    </div>
                  </div>
                )}
                {isVisible('dnsProvider') && (
                  <div>
                    <span className="text-muted-foreground">DNS 站点</span>
                    <div className="mt-0.5">
                      <SiteLinkCell siteId={domain.dnsSiteId} siteById={siteById} />
                    </div>
                  </div>
                )}
                {isVisible('dnsAccount') && (
                  <div>
                    <span className="text-muted-foreground">DNS 账号</span>
                    <div className="mt-0.5 truncate">
                      <AccountCell accountId={domain.dnsAccountId} accountLookup={accountLookup} />
                    </div>
                  </div>
                )}
                {isVisible('remark') && domain.remark && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">备注</span>
                    <div className="mt-0.5 text-muted-foreground">{domain.remark}</div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
