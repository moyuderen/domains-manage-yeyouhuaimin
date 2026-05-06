import { format, subDays } from 'date-fns'

import { getActivityLogChanges } from '@/lib/activity-log-detail'
import { mapActivityLog } from '@/lib/mappers/activity-log'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import type {
  ActivityLogAction,
  ActivityLogCategory,
  ActivityLogDetail,
  ActivityLogListQuery,
  ActivityLogRequestContext,
  ActivityLogResult,
  ActivityLogRow,
  ActivityLogSeverity,
  PaginatedActivityLogs,
} from '@/types/activity-log'

const DEFAULT_PAGE_SIZE = 10

export type ActivityLogInput = {
  eventKey: string
  category: ActivityLogCategory
  action: ActivityLogAction
  resourceType: string
  resourceId?: string
  resourceName?: string
  summary: string
  detail?: ActivityLogDetail
  requestContext?: ActivityLogRequestContext
  actorUserId?: string
  severity?: ActivityLogSeverity
  result?: ActivityLogResult
  idempotencyKey?: string
  ip?: string
  occurredAt?: string
}

export async function logActivity(input: ActivityLogInput): Promise<{ id: string } | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  const supabase = createSupabaseAdminClient()
  const idempotencyKey = input.idempotencyKey?.trim() ?? ''

  if (idempotencyKey) {
    const { data: existing, error: existingError } = await supabase
      .from('activity_logs')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (existingError) {
      throw new Error(existingError.message)
    }

    if (existing) {
      return { id: existing.id }
    }
  }

  const { data, error } = await supabase.from('activity_logs').insert({
    event_key: input.eventKey,
    category: input.category,
    action: input.action,
    resource_type: input.resourceType.trim(),
    resource_id: input.resourceId?.trim() ?? '',
    resource_name: input.resourceName?.trim() ?? '',
    summary: input.summary,
    detail: input.detail ?? {},
    request_context: input.requestContext ?? {},
    actor_user_id: input.actorUserId?.trim() ?? '',
    severity: input.severity ?? 'info',
    result: input.result ?? 'success',
    idempotency_key: input.idempotencyKey?.trim() ?? '',
    ip: input.ip?.trim() ?? '',
    occurred_at: input.occurredAt ?? new Date().toISOString(),
  }).select('id').single()

  if (error) {
    throw new Error(error.message)
  }

  return data ? { id: data.id } : null
}

export async function getActivityLogs(query: ActivityLogListQuery): Promise<PaginatedActivityLogs> {
  if (!isSupabaseConfigured()) {
    return emptyPaginatedLogs(query)
  }

  try {
    const supabase = createSupabaseAdminClient()
    let builder = supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .order('occurred_at', { ascending: false })
      .order('created_at', { ascending: false })

    const keyword = query.keyword.trim()

    if (keyword) {
      const escapedKeyword = escapeLikeValue(keyword)
      builder = builder.or([
        `summary.ilike.%${escapedKeyword}%`,
        `resource_name.ilike.%${escapedKeyword}%`,
        `ip.ilike.%${escapedKeyword}%`,
      ].join(','))
    }

    if (query.category !== 'all') {
      builder = builder.eq('category', query.category)
    }

    const createdAfter = getCreatedAfter(query.timeRange)
    if (createdAfter) {
      builder = builder.gte('occurred_at', createdAfter)
    }

    const from = (query.page - 1) * query.pageSize
    const to = from + query.pageSize - 1
    const { data, error, count } = await builder.range(from, to)

    if (error) {
      throw new Error(error.message)
    }

    const items = (data ?? []).map((row) => {
      const log = mapActivityLog(row as ActivityLogRow)
      return {
        id: log.id,
        eventKey: log.eventKey,
        category: log.category,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        resourceName: log.resourceName,
        summary: log.summary,
        requestContext: log.requestContext,
        actorUserId: log.actorUserId,
        severity: log.severity,
        result: log.result,
        idempotencyKey: log.idempotencyKey,
        ip: log.ip,
        occurredAt: log.occurredAt,
        createdAt: log.createdAt,
        changes: getActivityLogChanges(log.detail),
      }
    })
    const total = count ?? 0

    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    }
  } catch (error) {
    console.error('Failed to load activity logs.', error)
    return emptyPaginatedLogs(query)
  }
}

export async function getActivityLogSummary(): Promise<{
  total: number
  today: number
  auth: number
  changes: number
}> {
  if (!isSupabaseConfigured()) {
    return {
      total: 0,
      today: 0,
      auth: 0,
      changes: 0,
    }
  }

  try {
    const supabase = createSupabaseAdminClient()
    const today = getCreatedAfter('today')
    const [totalResult, todayResult, authResult, changesResult] = await Promise.all([
      supabase.from('activity_logs').select('*', { count: 'exact', head: true }),
      supabase.from('activity_logs').select('*', { count: 'exact', head: true }).gte('occurred_at', today),
      supabase.from('activity_logs').select('*', { count: 'exact', head: true }).eq('category', 'auth'),
      supabase.from('activity_logs').select('*', { count: 'exact', head: true }).neq('category', 'auth'),
    ])

    if (totalResult.error) throw new Error(totalResult.error.message)
    if (todayResult.error) throw new Error(todayResult.error.message)
    if (authResult.error) throw new Error(authResult.error.message)
    if (changesResult.error) throw new Error(changesResult.error.message)

    return {
      total: totalResult.count ?? 0,
      today: todayResult.count ?? 0,
      auth: authResult.count ?? 0,
      changes: changesResult.count ?? 0,
    }
  } catch (error) {
    console.error('Failed to load activity log summary.', error)
    return {
      total: 0,
      today: 0,
      auth: 0,
      changes: 0,
    }
  }
}

function emptyPaginatedLogs(query: ActivityLogListQuery): PaginatedActivityLogs {
  return {
    items: [],
    total: 0,
    page: 1,
    pageSize: query.pageSize || DEFAULT_PAGE_SIZE,
    totalPages: 1,
  }
}

function getCreatedAfter(timeRange: ActivityLogListQuery['timeRange']) {
  if (timeRange === 'all') {
    return null
  }

  if (timeRange === 'today') {
    return format(new Date(), 'yyyy-MM-dd')
  }

  if (timeRange === '7d') {
    return format(subDays(new Date(), 6), 'yyyy-MM-dd')
  }

  return format(subDays(new Date(), 29), 'yyyy-MM-dd')
}

function escapeLikeValue(value: string) {
  return value.replaceAll(',', '\\,')
}

export function buildDeleteFallbackResourceName(resourceName: string | null | undefined, fallbackLabel: string) {
  return resourceName?.trim() || fallbackLabel
}

export function isActivityLogEmpty(result: PaginatedActivityLogs) {
  return result.total === 0 && result.items.length === 0
}

export function getDefaultActivityLogFilters() {
  return {
    keyword: '',
    category: 'all' as const,
    timeRange: '7d' as const,
  }
}
