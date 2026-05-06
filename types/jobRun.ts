export const JOB_RUN_STATUSES = ['running', 'success', 'skipped', 'failed'] as const
export const JOB_TRIGGER_SOURCES = [
  'vercel-cron',
  'github-actions',
  'server-cron',
  'docker-cron',
  'manual',
  'http',
  'cli',
] as const

export const JOB_RUN_STATUS_LABELS: Record<JobRunStatus, string> = {
  running: '运行中',
  success: '成功',
  skipped: '跳过',
  failed: '失败',
}

export const JOB_TRIGGER_SOURCE_LABELS: Record<JobTriggerSource, string> = {
  'vercel-cron': 'Vercel Cron',
  'github-actions': 'GitHub Actions',
  'server-cron': 'Server Cron',
  'docker-cron': 'Docker Cron',
  manual: 'Manual',
  http: 'HTTP',
  cli: 'CLI',
}

export type JobRunStatus = (typeof JOB_RUN_STATUSES)[number]
export type JobTriggerSource = (typeof JOB_TRIGGER_SOURCES)[number]
export type JobRunMetadata = Record<string, unknown>

export type JobRun = {
  id: string
  jobKey: string
  triggerSource: JobTriggerSource
  requestId: string
  status: JobRunStatus
  message: string
  metadata: JobRunMetadata
  startedAt: string
}

export type JobRunListQuery = {
  page: number
  pageSize: number
}

export type PaginatedJobRuns = {
  items: JobRun[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type JobRunSummary = {
  total: number
  today: number
  success: number
  failed: number
}

export type JobRunRow = {
  id: string
  job_key: string
  trigger_source: string
  request_id: string | null
  status: string
  message: string | null
  metadata: unknown
  started_at: string
  finished_at: string | null
  created_at: string
  updated_at: string
}
