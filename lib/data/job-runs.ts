import 'server-only'

import { format } from 'date-fns'

import { getStartOfToday } from '@/lib/date'
import { mockJobRuns } from '@/lib/mock/job-runs'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import {
  JOB_RUN_STATUSES,
  JOB_TRIGGER_SOURCES,
  type JobRun,
  type JobRunListQuery,
  type JobRunMetadata,
  type JobRunRow,
  type JobRunStatus,
  type JobRunSummary,
  type JobTriggerSource,
  type PaginatedJobRuns,
} from '@/types/jobRun'

const DEFAULT_PAGE_SIZE = 10

export async function createJobRun(input: {
  jobKey: string
  triggerSource: JobTriggerSource
  requestId?: string
  metadata?: JobRunMetadata
  startedAt?: string
}): Promise<JobRun | null> {
  if (!canAccessJobRuns()) {
    return null
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('job_runs')
    .insert({
      job_key: input.jobKey.trim(),
      trigger_source: input.triggerSource,
      request_id: input.requestId?.trim() ?? '',
      status: 'running',
      message: '',
      metadata: input.metadata ?? {},
      started_at: input.startedAt ?? new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapJobRun(data as JobRunRow)
}

export async function updateJobRun(input: {
  id: string
  status: JobRunStatus
  message: string
  metadata?: JobRunMetadata
  finishedAt?: string | null
}): Promise<void> {
  if (!canAccessJobRuns()) {
    return
  }

  const supabase = createSupabaseAdminClient()
  const payload = {
    status: input.status,
    message: input.message.trim(),
    metadata: input.metadata ?? {},
    finished_at: input.finishedAt ?? new Date().toISOString(),
  }

  const { error } = await supabase
    .from('job_runs')
    .update(payload)
    .eq('id', input.id)

  if (error) throw new Error(error.message)
}

export async function getJobRuns(query: JobRunListQuery): Promise<PaginatedJobRuns> {
  if (!canAccessJobRuns()) {
    return emptyPaginatedJobRuns(query)
  }

  try {
    const supabase = createSupabaseAdminClient()
    const from = (query.page - 1) * query.pageSize
    const to = from + query.pageSize - 1
    const { data, error, count } = await supabase
      .from('job_runs')
      .select('id, job_key, trigger_source, request_id, status, message, metadata, started_at', { count: 'exact' })
      .order('started_at', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      throw new Error(error.message)
    }

    const total = count ?? 0

    if (total === 0) return emptyPaginatedJobRuns(query)

    return {
      items: (data ?? []).map((row) => mapJobRun(row as JobRunRow)),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    }
  } catch (error) {
    console.error('Failed to load job runs, using mock data instead.', error)
    return emptyPaginatedJobRuns(query)
  }
}

export async function getJobRunSummary(): Promise<JobRunSummary> {
  if (!canAccessJobRuns()) {
    return getMockJobRunSummary()
  }

  try {
    const supabase = createSupabaseAdminClient()
    const today = format(new Date(), 'yyyy-MM-dd')
    const [totalResult, todayResult, successResult, failedResult] = await Promise.all([
      supabase.from('job_runs').select('*', { count: 'exact', head: true }),
      supabase.from('job_runs').select('*', { count: 'exact', head: true }).gte('started_at', today),
      supabase.from('job_runs').select('*', { count: 'exact', head: true }).eq('status', 'success'),
      supabase.from('job_runs').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    ])

    if (totalResult.error) throw new Error(totalResult.error.message)
    if (todayResult.error) throw new Error(todayResult.error.message)
    if (successResult.error) throw new Error(successResult.error.message)
    if (failedResult.error) throw new Error(failedResult.error.message)

    const total = totalResult.count ?? 0
    if (total === 0) return getMockJobRunSummary()

    return {
      total,
      today: todayResult.count ?? 0,
      success: successResult.count ?? 0,
      failed: failedResult.count ?? 0,
    }
  } catch (error) {
    console.error('Failed to load job run summary, using mock data instead.', error)
    return getMockJobRunSummary()
  }
}

function getMockJobRunSummary() {
  const todayStart = getStartOfToday()
  return {
    total: mockJobRuns.length,
    today: mockJobRuns.filter(r => new Date(r.startedAt) > todayStart).length,
    success: mockJobRuns.filter(r => r.status === 'success').length,
    failed: mockJobRuns.filter(r => r.status === 'failed').length,
  }
}

function mapJobRun(row: JobRunRow): JobRun {
  return {
    id: row.id,
    jobKey: row.job_key,
    triggerSource: normalizeJobTriggerSource(row.trigger_source),
    requestId: row.request_id ?? '',
    status: normalizeJobRunStatus(row.status),
    message: row.message ?? '',
    metadata: normalizeMetadata(row.metadata),
    startedAt: row.started_at,
  }
}

function emptyPaginatedJobRuns(query: JobRunListQuery): PaginatedJobRuns {
  const pageSize = query.pageSize || DEFAULT_PAGE_SIZE
  const start = (query.page - 1) * pageSize
  const items = mockJobRuns.slice(start, start + pageSize)
  return {
    items,
    total: mockJobRuns.length,
    page: query.page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(mockJobRuns.length / pageSize)),
  }
}

function canAccessJobRuns() {
  return isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function normalizeMetadata(value: unknown): JobRunMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as JobRunMetadata
}

function normalizeJobRunStatus(value: string): JobRunStatus {
  if (JOB_RUN_STATUSES.includes(value as JobRunStatus)) {
    return value as JobRunStatus
  }

  return 'failed'
}

function normalizeJobTriggerSource(value: string): JobTriggerSource {
  if (JOB_TRIGGER_SOURCES.includes(value as JobTriggerSource)) {
    return value as JobTriggerSource
  }

  return 'manual'
}
