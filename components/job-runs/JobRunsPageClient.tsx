'use client'

import { format } from 'date-fns'
import { Loader2, Play, RefreshCw } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  runDomainExpiryCheckDailyManuallyAction,
  runDomainExpiryCheckManuallyAction,
} from '@/app/actions/jobs'
import { EmptyState } from '@/components/common/EmptyState'
import { MobilePagination } from '@/components/common/MobilePagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { useRefreshWithSpin } from '@/hooks/useRefreshWithSpin'
import { cn } from '@/lib/utils'
import { buildPaginationItems, PAGE_SIZE_OPTIONS } from '@/lib/utils/pagination'
import {
  JOB_RUN_STATUS_LABELS,
  JOB_TRIGGER_SOURCE_LABELS,
  type JobRun,
  type PaginatedJobRuns,
  type JobRunSummary,
} from '@/types/jobRun'

type JobRunsPageClientProps = {
  paginatedRuns: PaginatedJobRuns
  summary: JobRunSummary
}

type RunnableJobKey = 'domain-expiry-check' | 'domain-expiry-check-daily'

type RunnableJob = {
  key: RunnableJobKey
  label: string
  shortLabel: string
  variant: 'default' | 'secondary'
  run: () => ReturnType<typeof runDomainExpiryCheckManuallyAction>
}

const RUNNABLE_JOBS: RunnableJob[] = [
  {
    key: 'domain-expiry-check',
    label: '手动触发到期检查',
    shortLabel: '到期检查',
    variant: 'default',
    run: runDomainExpiryCheckManuallyAction,
  },
  {
    key: 'domain-expiry-check-daily',
    label: '手动触发每日检查',
    shortLabel: '每日检查',
    variant: 'secondary',
    run: runDomainExpiryCheckDailyManuallyAction,
  },
]

export function JobRunsPageClient({ paginatedRuns, summary }: JobRunsPageClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { spinning, refresh } = useRefreshWithSpin()
  const [runningJob, setRunningJob] = useState<RunnableJobKey | null>(null)

  const updateSearchParams = (nextPage = 1, nextPageSize = paginatedRuns.pageSize) => {
    const params = new URLSearchParams(searchParams.toString())

    if (nextPage > 1) params.set('page', String(nextPage))
    else params.delete('page')

    if (nextPageSize !== 10) params.set('pageSize', String(nextPageSize))
    else params.delete('pageSize')

    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  const paginationItems = buildPaginationItems(paginatedRuns.page, paginatedRuns.totalPages)
  const start = paginatedRuns.total === 0 ? 0 : (paginatedRuns.page - 1) * paginatedRuns.pageSize + 1
  const end = Math.min(paginatedRuns.page * paginatedRuns.pageSize, paginatedRuns.total)

  const paginationNode = (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="text-sm text-muted-foreground">
          显示第 {start}-{end} 条，共 {paginatedRuns.total} 条
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>每页</span>
          <Select value={String(paginatedRuns.pageSize)} onValueChange={(value) => updateSearchParams(1, Number(value))}>
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
              aria-disabled={paginatedRuns.page <= 1}
              className={paginatedRuns.page <= 1 ? 'pointer-events-none opacity-50' : undefined}
              onClick={() => { if (paginatedRuns.page > 1) updateSearchParams(paginatedRuns.page - 1) }}
            />
          </PaginationItem>

          {paginationItems.map((item, index) => (
            <PaginationItem key={`${item}-${index}`}>
              {item === 'ellipsis' ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  isActive={item === paginatedRuns.page}
                  onClick={() => updateSearchParams(item)}
                >
                  {item}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              aria-disabled={paginatedRuns.page >= paginatedRuns.totalPages}
              className={paginatedRuns.page >= paginatedRuns.totalPages ? 'pointer-events-none opacity-50' : undefined}
              onClick={() => { if (paginatedRuns.page < paginatedRuns.totalPages) updateSearchParams(paginatedRuns.page + 1) }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )

  const mobilePaginationNode = (
    <MobilePagination
      total={paginatedRuns.total}
      page={paginatedRuns.page}
      totalPages={paginatedRuns.totalPages}
      onPageChange={(page) => updateSearchParams(page)}
    />
  )

  const handleRun = async (job: RunnableJob) => {
    if (runningJob) return

    setRunningJob(job.key)

    try {
      const result = await job.run()
      showRunResultToast(result.status, result.message)
      refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '触发失败')
    } finally {
      setRunningJob(null)
    }
  }

  return (
    <TooltipProvider>
      <div className="flex h-[calc(100dvh-3.5rem-2rem)] flex-col gap-6 md:h-[calc(100dvh-3.5rem-3rem)]">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <SummaryMetric label="总执行" value={summary.total} />
            <SummaryMetric label="今日" value={summary.today} />
            <SummaryMetric label="成功" value={summary.success} />
            <SummaryMetric label="失败" value={summary.failed} />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {RUNNABLE_JOBS.map((job) => (
              <Button
                key={job.key}
                variant={job.variant}
                size="sm"
                onClick={() => { void handleRun(job) }}
                disabled={Boolean(runningJob) || spinning}
              >
                {runningJob === job.key ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                <span className="hidden sm:inline">{job.label}</span>
                <span className="sm:hidden">{job.shortLabel}</span>
              </Button>
            ))}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="secondary" size="icon" onClick={refresh} disabled={spinning || Boolean(runningJob)} aria-label="刷新">
                  <RefreshCw size={16} className={spinning ? 'animate-spin' : ''} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>刷新</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="hidden min-h-0 flex-1 md:flex md:flex-col">
          {paginatedRuns.items.length === 0 ? (
            <EmptyState
              title="暂无执行记录"
              description="当前还没有可展示的任务执行记录。"
              fillHeight
            />
          ) : (
            <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-0">
              <div className="min-h-0 flex-1 [&>[data-slot=table-container]]:h-full [&>[data-slot=table-container]]:min-h-0 [&>[data-slot=table-container]]:overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 z-30 bg-card hover:bg-card">
                      <TableHead className="min-w-[156px]">时间</TableHead>
                      <TableHead className="min-w-[160px]">任务</TableHead>
                      <TableHead className="min-w-[140px]">来源</TableHead>
                      <TableHead className="min-w-[96px]">状态</TableHead>
                      <TableHead className="min-w-[280px]">消息</TableHead>
                      <TableHead className="min-w-[260px]">元数据</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRuns.items.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="text-muted-foreground">{formatJobRunDateTime(run.startedAt)}</TableCell>
                        <TableCell className="font-medium text-foreground">{run.jobKey}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{JOB_TRIGGER_SOURCE_LABELS[run.triggerSource]}</Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={run.status} />
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">{run.message || '-'}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{formatMetadata(run)}</TableCell>
                      </TableRow>
                    ))}
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
          {paginatedRuns.items.length === 0 ? (
            <EmptyState
              title="暂无执行记录"
              description="当前还没有可展示的任务执行记录。"
              fillHeight
            />
          ) : (
            <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-0">
              <div className="min-h-0 flex-1 overflow-auto p-3">
                <div className="space-y-3">
                  {paginatedRuns.items.map((run) => (
                    <JobRunCard key={run.id} run={run} />
                  ))}
                </div>
              </div>
              {mobilePaginationNode}
            </Card>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground tabular-nums">{value}</span>
    </div>
  )
}

function JobRunCard({ run }: { run: JobRun }) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{JOB_TRIGGER_SOURCE_LABELS[run.triggerSource]}</Badge>
              <StatusBadge status={run.status} />
            </div>
            <div className="font-medium text-foreground">{run.jobKey}</div>
            <div className="text-sm text-muted-foreground">{run.message || '-'}</div>
          </div>
        </div>

        <div className="text-muted-foreground space-y-2 text-sm">
          <InfoRow label="时间" value={formatJobRunDateTime(run.startedAt)} />
          <InfoRow label="元数据" value={formatMetadata(run)} />
        </div>
      </CardContent>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span>{label}</span>
      <span className={cn('max-w-[70%] text-right text-foreground break-all')}>{value}</span>
    </div>
  )
}

function showRunResultToast(status: JobRun['status'], message: string) {
  if (status === 'failed') {
    toast.error(message || '触发失败')
    return
  }

  if (status === 'success') {
    toast.success(message || '任务执行成功')
    return
  }

  toast(message || '任务已触发')
}

function StatusBadge({ status }: { status: JobRun['status'] }) {
  const variant = status === 'failed'
    ? 'destructive'
    : status === 'success'
      ? 'secondary'
      : 'outline'

  return <Badge variant={variant}>{JOB_RUN_STATUS_LABELS[status]}</Badge>
}

function formatJobRunDateTime(value: string) {
  return format(new Date(value), 'yyyy/MM/dd HH:mm')
}

function formatMetadata(run: JobRun) {
  const entries: string[] = []
  const domainsChecked = run.metadata.domainsChecked
  const eventsEmitted = run.metadata.eventsEmitted
  const requestId = run.requestId || readString(run.metadata.requestId)

  if (typeof domainsChecked === 'number') {
    entries.push(`domainsChecked=${domainsChecked}`)
  }

  if (typeof eventsEmitted === 'number') {
    entries.push(`eventsEmitted=${eventsEmitted}`)
  }

  if (requestId) {
    entries.push(`requestId=${requestId}`)
  }

  if (entries.length > 0) {
    return entries.join(' · ')
  }

  const fallbackEntries = Object.entries(run.metadata)
    .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
    .slice(0, 3)
    .map(([key, value]) => `${key}=${String(value)}`)

  return fallbackEntries.length > 0 ? fallbackEntries.join(' · ') : '-'
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : ''
}

