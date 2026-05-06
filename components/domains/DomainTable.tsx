'use client'

import { useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { CircleHelp, Copy, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

import { EmptyState } from '@/components/common/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { DEFAULT_VISIBLE_DOMAIN_COLUMNS, type HideableDomainColumnKey } from '@/components/domains/domain-columns'
import { SiteLinkCell, AccountCell } from '@/components/domains/domain-cells'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDate } from '@/lib/date'
import { cn } from '@/lib/utils'
import { getDomainStatus, getExpiryCountdownLabel, getStatusColor, getStatusLabel } from '@/lib/domainStatus'
import type { AccountLookup } from '@/lib/data/accounts'
import type { Domain } from '@/types/domain'
import type { Site } from '@/types/site'

type DomainTableProps = {
  domains: Domain[]
  linkSites: Site[]
  visibleColumns: HideableDomainColumnKey[]
  selectedDomainIds: string[]
  accountLookup: AccountLookup
  expiryDays: number
  onSelectDomain: (domainId: string, checked: boolean) => void
  onSelectAllDomains: (checked: boolean) => void
  onViewDetail: (domain: Domain) => void
  onEdit: (domain: Domain) => void
  onClone: (domain: Domain) => void
  onDelete: (domain: Domain) => void
  pagination?: ReactNode
}

export function DomainTable({ domains, linkSites, visibleColumns = DEFAULT_VISIBLE_DOMAIN_COLUMNS, selectedDomainIds, accountLookup, expiryDays, onSelectDomain, onSelectAllDomains, onViewDetail, onEdit, onClone, onDelete, pagination }: DomainTableProps) {
  const selectedDomainIdSet = useMemo(() => new Set(selectedDomainIds), [selectedDomainIds])
  const allSelected = domains.length > 0 && domains.every((domain) => selectedDomainIdSet.has(domain.id))
  const someSelected = selectedDomainIds.length > 0 && !allSelected
  const isVisible = (column: HideableDomainColumnKey) => visibleColumns.includes(column)
  const siteById = useMemo(() => new Map(linkSites.map((site) => [site.id, site])), [linkSites])

  if (!domains.length) {
    return <EmptyState title="暂无域名数据" description="先添加一个域名，或从 JSON 文件导入已有数据。" fillHeight footer={pagination} />
  }

  return (
    <TooltipProvider>
      <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-0">
        <div className="min-h-0 flex-1 [&>[data-slot=table-container]]:h-full [&>[data-slot=table-container]]:min-h-0 [&>[data-slot=table-container]]:overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="sticky top-0 z-30 bg-card hover:bg-card">
                <TableHead className="w-12">
                  <Checkbox checked={someSelected ? 'indeterminate' : allSelected} aria-label="全选当前页域名" onCheckedChange={(checked) => onSelectAllDomains(checked === true)} />
                </TableHead>
                <TableHead className="min-w-[180px]">域名</TableHead>
                {isVisible('status') ? <TableHead className="min-w-[96px] whitespace-nowrap">状态</TableHead> : null}
                {isVisible('registrar') ? <TableHead className="min-w-[140px]">注册站点</TableHead> : null}
                {isVisible('registrarAccount') ? <TableHead className="min-w-[180px]">注册账号</TableHead> : null}
                {isVisible('expiryDate') ? <TableHead className="min-w-[140px] whitespace-nowrap">到期时间</TableHead> : null}
                {isVisible('dnsProvider') ? <TableHead className="min-w-[140px]">DNS 站点</TableHead> : null}
                {isVisible('dnsAccount') ? <TableHead className="min-w-[180px]">DNS 账号</TableHead> : null}
                {isVisible('remark') ? <TableHead className="min-w-[112px]">备注</TableHead> : null}
                <TableHead className="sticky right-0 z-20 min-w-[96px] bg-card text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domains.map((domain) => {
                const status = getDomainStatus(domain.expiryDate, expiryDays)
                const expiryCountdown = getExpiryCountdownLabel(domain.expiryDate)
                const isSelected = selectedDomainIdSet.has(domain.id)

                return (
                  <TableRow key={domain.id} className="group" data-state={isSelected ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox checked={isSelected} aria-label={`选择域名 ${domain.name}`} onCheckedChange={(checked) => onSelectDomain(domain.id, checked === true)} />
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/domains/${domain.id}`}
                          className={cn(
                            'font-medium transition-colors hover:text-primary',
                            domain.isFree ? 'text-foreground' : 'text-amber-600 dark:text-amber-400',
                          )}
                        >
                          {domain.name}
                        </Link>
                        {domain.subdomains.length > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="secondary" className="cursor-default text-xs tabular-nums">
                                {domain.subdomains.length} 子域
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs">
                              <ul className="space-y-1">
                                {domain.subdomains.slice(0, 20).map((s) => (
                                  <li key={s.id} className="text-sm">
                                    <span className="font-medium">{s.subdomain}.{domain.name}</span>
                                    {s.ip ? <span className="text-muted-foreground ml-2">{s.ip}</span> : null}
                                  </li>
                                ))}
                                {domain.subdomains.length > 20 ? (
                                  <li className="text-muted-foreground text-sm">…还有 {domain.subdomains.length - 20} 个</li>
                                ) : null}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                      </div>
                    </TableCell>
                    {isVisible('status') ? <TableCell className="min-w-[96px] whitespace-nowrap"><Badge className={getStatusColor(status)} variant="outline">{getStatusLabel(status)}</Badge></TableCell> : null}
                    {isVisible('registrar') ? (
                      <TableCell className="text-muted-foreground">
                        <SiteLinkCell siteId={domain.registrarSiteId} siteById={siteById} />
                      </TableCell>
                    ) : null}
                    {isVisible('registrarAccount') ? (
                      <TableCell className="min-w-[180px] max-w-[180px] truncate">
                        <AccountCell accountId={domain.registrarAccountId} accountLookup={accountLookup} />
                      </TableCell>
                    ) : null}
                    {isVisible('expiryDate') ? (
                      <TableCell className="text-muted-foreground">
                        {expiryCountdown ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex cursor-default items-center gap-1.5">
                                <CircleHelp className="size-3.5 text-muted-foreground/70" />
                                <span>{formatDate(domain.expiryDate)}</span>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{expiryCountdown}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span>{formatDate(domain.expiryDate)}</span>
                        )}
                      </TableCell>
                    ) : null}
                    {isVisible('dnsProvider') ? (
                      <TableCell className="text-muted-foreground">
                        <SiteLinkCell siteId={domain.dnsSiteId} siteById={siteById} />
                      </TableCell>
                    ) : null}
                    {isVisible('dnsAccount') ? (
                      <TableCell className="min-w-[180px] max-w-[180px] truncate">
                        <AccountCell accountId={domain.dnsAccountId} accountLookup={accountLookup} />
                      </TableCell>
                    ) : null}
                    {isVisible('remark') ? <TableCell className="min-w-[112px] max-w-[200px] truncate text-muted-foreground">{domain.remark}</TableCell> : null}
                    <TableCell className="sticky right-0 z-10 min-w-[96px] bg-card text-right group-data-[state=selected]:bg-muted group-hover:bg-muted/50">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onEdit(domain)} aria-label={`编辑域名 ${domain.name}`} title={`编辑域名 ${domain.name}`}>
                          <Pencil size={16} />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`更多操作 ${domain.name}`} title="更多操作">
                              <MoreHorizontal size={16} />
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
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        {pagination ? (
          <div className="shrink-0 border-t px-6 py-3">
            {pagination}
          </div>
        ) : null}
      </Card>
    </TooltipProvider>
  )
}
