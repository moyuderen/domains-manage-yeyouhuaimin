import { LogsPageClient } from '@/components/logs/LogsPageClient'
import { requirePageAccess } from '@/lib/auth/access-server'
import { getActivityLogs, getActivityLogSummary, getDefaultActivityLogFilters } from '@/lib/data/activity-logs'
import { getSingleParam } from '@/lib/utils/params'
import { DEFAULT_PAGE_SIZE, isStandardPageSize } from '@/lib/utils/pagination'
import { ACTIVITY_LOG_CATEGORIES, ACTIVITY_LOG_TIME_RANGES, type ActivityLogFilters, type ActivityLogTimeRange } from '@/types/activity-log'
const defaultFilters = getDefaultActivityLogFilters()

export default async function LogsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageAccess()
  const params = await searchParams
  const rawCategory = getSingleParam(params?.category)
  const rawTimeRange = getSingleParam(params?.timeRange)
  const rawPageSize = getSingleParam(params?.pageSize)
  const pageSize = Number.parseInt(rawPageSize ?? String(DEFAULT_PAGE_SIZE), 10)
  const filters: ActivityLogFilters = {
    keyword: getSingleParam(params?.keyword) ?? defaultFilters.keyword,
    category: isActivityLogCategoryValue(rawCategory) ? rawCategory : defaultFilters.category,
    timeRange: isTimeRangeValue(rawTimeRange) ? rawTimeRange : defaultFilters.timeRange,
  }
  const page = Math.max(1, Number.parseInt(getSingleParam(params?.page) ?? '1', 10) || 1)

  const [result, summary] = await Promise.all([
    getActivityLogs({
      ...filters,
      page,
      pageSize: isStandardPageSize(pageSize) ? pageSize : DEFAULT_PAGE_SIZE,
    }),
    getActivityLogSummary(),
  ])

  return <LogsPageClient initialFilters={filters} paginatedLogs={result} summary={summary} />
}

function isActivityLogCategoryValue(value?: string): value is ActivityLogFilters['category'] {
  return value === 'all' || ACTIVITY_LOG_CATEGORIES.includes(value as (typeof ACTIVITY_LOG_CATEGORIES)[number])
}

function isTimeRangeValue(value?: string): value is ActivityLogTimeRange {
  return ACTIVITY_LOG_TIME_RANGES.includes(value as ActivityLogTimeRange)
}

