'use client'

import { format } from 'date-fns'
import { ClipboardList, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { EmptyState } from '@/components/common/EmptyState'
import { MobilePagination } from '@/components/common/MobilePagination'
import { ActivityLogDetailDialog } from '@/components/logs/ActivityLogDetailDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatActivityDevice, formatActivityIp } from '@/lib/mappers/activity-log'
import { useRefreshWithSpin } from '@/hooks/useRefreshWithSpin'
import { cn } from '@/lib/utils'
import { buildPaginationItems, PAGE_SIZE_OPTIONS } from '@/lib/utils/pagination'
import {
  ACTIVITY_LOG_ACTION_LABELS,
  ACTIVITY_LOG_CATEGORY_LABELS,
  ACTIVITY_LOG_TIME_RANGE_LABELS,
  type ActivityLogFilters,
  type ActivityLogListItem,
  type PaginatedActivityLogs,
} from '@/types/activity-log'

type LogsPageClientProps = {
  initialFilters: ActivityLogFilters
  paginatedLogs: PaginatedActivityLogs
  summary: {
    total: number
    today: number
    auth: number
    changes: number
  }
}

export function LogsPageClient({ initialFilters, paginatedLogs, summary }: LogsPageClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [keywordInput, setKeywordInput] = useState(initialFilters.keyword)
  const [selectedLog, setSelectedLog] = useState<ActivityLogListItem | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const { spinning, refresh } = useRefreshWithSpin()

  useEffect(() => {
    setKeywordInput(initialFilters.keyword)
  }, [initialFilters.keyword])

  useEffect(() => {
    if (keywordInput === initialFilters.keyword) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => updateSearchParams({ ...initialFilters, keyword: keywordInput }), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only trigger on keywordInput changes; guard prevents stale initialFilters from firing
  }, [keywordInput])

  const updateSearchParams = (nextFilters: ActivityLogFilters, nextPage = 1, nextPageSize = paginatedLogs.pageSize) => {
    const params = new URLSearchParams(searchParams.toString())

    if (nextFilters.keyword.trim()) params.set('keyword', nextFilters.keyword.trim())
    else params.delete('keyword')

    if (nextFilters.category !== 'all') params.set('category', nextFilters.category)
    else params.delete('category')

    if (nextFilters.timeRange !== '7d') params.set('timeRange', nextFilters.timeRange)
    else params.delete('timeRange')

    if (nextPage > 1) params.set('page', String(nextPage))
    else params.delete('page')

    if (nextPageSize !== 10) params.set('pageSize', String(nextPageSize))
    else params.delete('pageSize')

    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  const paginationItems = buildPaginationItems(paginatedLogs.page, paginatedLogs.totalPages)
  const start = paginatedLogs.total === 0 ? 0 : (paginatedLogs.page - 1) * paginatedLogs.pageSize + 1
  const end = Math.min(paginatedLogs.page * paginatedLogs.pageSize, paginatedLogs.total)

  const paginationNode = (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="text-sm text-muted-foreground">
          显示第 {start}-{end} 条，共 {paginatedLogs.total} 条
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>每页</span>
          <Select value={String(paginatedLogs.pageSize)} onValueChange={(value) => updateSearchParams(initialFilters, 1, Number(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>{option} 条</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              aria-disabled={paginatedLogs.page <= 1}
              className={paginatedLogs.page <= 1 ? 'pointer-events-none opacity-50' : undefined}
              onClick={() => { if (paginatedLogs.page > 1) updateSearchParams(initialFilters, paginatedLogs.page - 1) }}
            />
          </PaginationItem>

          {paginationItems.map((item, index) => (
            <PaginationItem key={`${item}-${index}`}>
              {item === 'ellipsis' ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  isActive={item === paginatedLogs.page}
                  onClick={() => updateSearchParams(initialFilters, item)}
                >
                  {item}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              aria-disabled={paginatedLogs.page >= paginatedLogs.totalPages}
              className={paginatedLogs.page >= paginatedLogs.totalPages ? 'pointer-events-none opacity-50' : undefined}
              onClick={() => { if (paginatedLogs.page < paginatedLogs.totalPages) updateSearchParams(initialFilters, paginatedLogs.page + 1) }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )

  const mobilePaginationNode = (
    <MobilePagination
      total={paginatedLogs.total}
      page={paginatedLogs.page}
      totalPages={paginatedLogs.totalPages}
      onPageChange={(page) => updateSearchParams(initialFilters, page)}
    />
  )

  const selectedLogChanges = selectedLog?.changes ?? []

  return (
    <TooltipProvider>
      <div className="flex h-[calc(100dvh-3.5rem-2rem)] flex-col gap-6 md:h-[calc(100dvh-3.5rem-3rem)]">
        <Card className="gap-3 py-4">
          <CardContent className="flex flex-col gap-3 px-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span>总日志 {summary.total}</span>
            <span>今日 {summary.today}</span>
            <span>登录 {summary.auth}</span>
            <span>变更 {summary.changes}</span>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Input
                className="max-w-sm"
                placeholder="搜索摘要 / 资源名 / IP"
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
              />
              <Select value={initialFilters.category} onValueChange={(value) => updateSearchParams({ ...initialFilters, category: value as ActivityLogFilters['category'] })}>
                <SelectTrigger className="w-[10rem]">
                  <SelectValue placeholder="全部类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="auth">登录</SelectItem>
                  <SelectItem value="domain">域名</SelectItem>
                  <SelectItem value="site">站点</SelectItem>
                  <SelectItem value="account">账号</SelectItem>
                  <SelectItem value="settings">设置</SelectItem>
                </SelectContent>
              </Select>
              <Select value={initialFilters.timeRange} onValueChange={(value) => updateSearchParams({ ...initialFilters, timeRange: value as ActivityLogFilters['timeRange'] })}>
                <SelectTrigger className="w-[10rem]">
                  <SelectValue placeholder="时间范围" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTIVITY_LOG_TIME_RANGE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="secondary" size="icon" onClick={refresh} disabled={spinning} aria-label="刷新">
                  <RefreshCw size={16} className={spinning ? 'animate-spin' : ''} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>刷新</TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>

      <div className="hidden min-h-0 flex-1 md:flex md:flex-col">
        {paginatedLogs.items.length === 0 ? (
          <EmptyState
            title="暂无操作日志"
            description="当前筛选条件下还没有可展示的日志记录。"
            fillHeight
          />
        ) : (
          <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-0">
            <div className="min-h-0 flex-1 [&>[data-slot=table-container]]:h-full [&>[data-slot=table-container]]:min-h-0 [&>[data-slot=table-container]]:overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="sticky top-0 z-30 bg-card hover:bg-card">
                    <TableHead className="min-w-[156px]">时间</TableHead>
                    <TableHead className="min-w-[96px]">类别</TableHead>
                    <TableHead className="min-w-[96px]">操作</TableHead>
                    <TableHead className="min-w-[320px]">摘要</TableHead>
                    <TableHead className="min-w-[112px]">变更</TableHead>
                    <TableHead className="min-w-[160px]">设备</TableHead>
                    <TableHead className="min-w-[140px]">IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.items.map((log) => {
                    const changes = log.changes

                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-muted-foreground">{formatLogDateTime(log.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ACTIVITY_LOG_CATEGORY_LABELS[log.category]}</Badge>
                        </TableCell>
                        <TableCell>
                          <ActionBadge action={log.action} />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-foreground">{log.summary}</div>
                            {log.resourceName ? <div className="text-muted-foreground text-xs">资源：{log.resourceName}</div> : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          {changes.length > 0 ? (
                            <Button variant="outline" size="sm" onClick={() => setSelectedLog(log)}>
                              查看变更
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatActivityDevice(log.requestContext)}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{formatActivityIp(log.ip)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="shrink-0 border-t px-6 py-3">
              {paginationNode}
            </div>
          </Card>
        )}
      </div>

        <div className="flex min-h-0 flex-1 flex-col md:hidden">
          {paginatedLogs.items.length === 0 ? (
            <EmptyState
              title="暂无操作日志"
              description="当前筛选条件下还没有可展示的日志记录。"
              fillHeight
            />
          ) : (
            <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-0">
              <div className="min-h-0 flex-1 overflow-auto p-3">
                <div className="space-y-3">
                  {paginatedLogs.items.map((log) => (
                    <LogCard key={log.id} log={log} onOpenDetail={setSelectedLog} />
                  ))}
                </div>
              </div>
              {mobilePaginationNode}
            </Card>
          )}
        </div>
      </div>
      <ActivityLogDetailDialog
        open={Boolean(selectedLog && selectedLogChanges.length > 0)}
        changes={selectedLogChanges}
        summary={selectedLog?.summary ?? ''}
        resourceName={selectedLog?.resourceName ?? ''}
        onClose={() => setSelectedLog(null)}
      />
    </TooltipProvider>
  )
}

function LogCard({ log, onOpenDetail }: { log: ActivityLogListItem; onOpenDetail: (log: ActivityLogListItem) => void }) {
  const changes = log.changes

  return (
    <Card className="gap-0 py-0">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{ACTIVITY_LOG_CATEGORY_LABELS[log.category]}</Badge>
              <ActionBadge action={log.action} />
            </div>
            <div className="font-medium text-foreground">{log.summary}</div>
            {log.resourceName ? <div className="text-muted-foreground text-sm">资源：{log.resourceName}</div> : null}
          </div>
          <ClipboardList className="text-muted-foreground size-4 shrink-0" />
        </div>

        <div className="text-muted-foreground space-y-2 text-sm">
          <InfoRow label="时间" value={formatLogDateTime(log.createdAt)} />
          <InfoRow label="设备" value={formatActivityDevice(log.requestContext)} />
          <InfoRow label="IP" value={formatActivityIp(log.ip)} mono />
        </div>

        {changes.length > 0 ? (
          <div className="flex justify-end border-t pt-3">
            <Button variant="outline" size="sm" onClick={() => onOpenDetail(log)}>
              查看变更
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span>{label}</span>
      <span className={cn('text-right text-foreground', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  )
}

function ActionBadge({ action }: { action: ActivityLogListItem['action'] }) {
  const variant = action === 'delete' || action === 'login_failed'
    ? 'destructive'
    : action === 'create' || action === 'login'
      ? 'secondary'
      : 'outline'

  return <Badge variant={variant}>{ACTIVITY_LOG_ACTION_LABELS[action]}</Badge>
}

function formatLogDateTime(value: string) {
  return format(new Date(value), 'yyyy/MM/dd HH:mm')
}

