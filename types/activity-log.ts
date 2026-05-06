export const ACTIVITY_LOG_CATEGORIES = ['auth', 'domain', 'site', 'account', 'settings'] as const
export const ACTIVITY_LOG_ACTIONS = ['login', 'login_failed', 'logout', 'create', 'update', 'delete'] as const
export const ACTIVITY_LOG_TIME_RANGES = ['today', '7d', '30d', 'all'] as const
export const ACTIVITY_LOG_SEVERITIES = ['info', 'warning', 'critical'] as const
export const ACTIVITY_LOG_RESULTS = ['success', 'failure'] as const

export type ActivityLogCategory = (typeof ACTIVITY_LOG_CATEGORIES)[number]
export type ActivityLogAction = (typeof ACTIVITY_LOG_ACTIONS)[number]
export type ActivityLogTimeRange = (typeof ACTIVITY_LOG_TIME_RANGES)[number]
export type ActivityLogSeverity = (typeof ACTIVITY_LOG_SEVERITIES)[number]
export type ActivityLogResult = (typeof ACTIVITY_LOG_RESULTS)[number]
export type ActivityLogRequestContext = Record<string, unknown>

export type ActivityLogChange = {
  field: string
  label: string
  before: string
  after: string
  displayBefore: string
  displayAfter: string
}

export type ActivityLogDetail = Record<string, unknown>

export const ACTIVITY_LOG_CATEGORY_LABELS: Record<ActivityLogCategory, string> = {
  auth: '登录',
  domain: '域名',
  site: '站点',
  account: '账号',
  settings: '设置',
}

export const ACTIVITY_LOG_ACTION_LABELS: Record<ActivityLogAction, string> = {
  login: '登录',
  login_failed: '失败',
  logout: '退出',
  create: '新增',
  update: '编辑',
  delete: '删除',
}

export const ACTIVITY_LOG_TIME_RANGE_LABELS: Record<ActivityLogTimeRange, string> = {
  today: '今天',
  '7d': '近 7 天',
  '30d': '近 30 天',
  all: '全部时间',
}

export type ActivityLog = {
  id: string
  eventKey: string
  category: ActivityLogCategory
  action: ActivityLogAction
  resourceType: string
  resourceId: string
  resourceName: string
  summary: string
  detail: ActivityLogDetail
  requestContext: ActivityLogRequestContext
  actorUserId: string
  severity: ActivityLogSeverity
  result: ActivityLogResult
  idempotencyKey: string
  ip: string
  occurredAt: string
  createdAt: string
}

export type ActivityLogListItem = Omit<ActivityLog, 'detail'> & {
  changes: ActivityLogChange[]
}

export type ActivityLogFilters = {
  keyword: string
  category: ActivityLogCategory | 'all'
  timeRange: ActivityLogTimeRange
}

export type ActivityLogListQuery = ActivityLogFilters & {
  page: number
  pageSize: number
}

export type PaginatedActivityLogs = {
  items: ActivityLogListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type ActivityLogRow = {
  id: string
  event_key: string | null
  category: string
  action: string
  resource_type: string | null
  resource_id: string | null
  resource_name: string | null
  summary: string
  detail: unknown
  request_context: unknown
  actor_user_id: string | null
  severity: string | null
  result: string | null
  idempotency_key: string | null
  ip: string | null
  occurred_at: string | null
  created_at: string
}
