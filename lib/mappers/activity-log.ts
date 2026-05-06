import {
  ACTIVITY_LOG_ACTIONS,
  ACTIVITY_LOG_CATEGORIES,
  ACTIVITY_LOG_RESULTS,
  ACTIVITY_LOG_SEVERITIES,
  type ActivityLog,
  type ActivityLogAction,
  type ActivityLogCategory,
  type ActivityLogDetail,
  type ActivityLogRequestContext,
  type ActivityLogResult,
  type ActivityLogRow,
  type ActivityLogSeverity,
} from '@/types/activity-log'

export function mapActivityLog(row: ActivityLogRow): ActivityLog {
  return {
    id: row.id,
    eventKey: row.event_key ?? `${normalizeActivityLogCategory(row.category)}.${normalizeActivityLogAction(row.action)}`,
    category: normalizeActivityLogCategory(row.category),
    action: normalizeActivityLogAction(row.action),
    resourceType: row.resource_type ?? '',
    resourceId: row.resource_id ?? '',
    resourceName: row.resource_name ?? '',
    summary: row.summary,
    detail: normalizeActivityLogDetail(row.detail),
    requestContext: normalizeActivityLogRequestContext(row.request_context),
    actorUserId: row.actor_user_id ?? '',
    severity: normalizeActivityLogSeverity(row.severity),
    result: normalizeActivityLogResult(row.result),
    idempotencyKey: row.idempotency_key ?? '',
    ip: row.ip ?? '',
    occurredAt: row.occurred_at ?? row.created_at,
    createdAt: row.created_at,
  }
}

function normalizeActivityLogCategory(value: string): ActivityLogCategory {
  if (ACTIVITY_LOG_CATEGORIES.includes(value as ActivityLogCategory)) {
    return value as ActivityLogCategory
  }

  return 'settings'
}

function normalizeActivityLogAction(value: string): ActivityLogAction {
  if (ACTIVITY_LOG_ACTIONS.includes(value as ActivityLogAction)) {
    return value as ActivityLogAction
  }

  return 'update'
}

function normalizeActivityLogDetail(value: unknown): ActivityLogDetail {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as ActivityLogDetail
}

function normalizeActivityLogRequestContext(value: unknown): ActivityLogRequestContext {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as ActivityLogRequestContext
}

function normalizeActivityLogSeverity(value: string | null): ActivityLogSeverity {
  if (value && ACTIVITY_LOG_SEVERITIES.includes(value as ActivityLogSeverity)) {
    return value as ActivityLogSeverity
  }

  return 'info'
}

function normalizeActivityLogResult(value: string | null): ActivityLogResult {
  if (value && ACTIVITY_LOG_RESULTS.includes(value as ActivityLogResult)) {
    return value as ActivityLogResult
  }

  return 'success'
}

export function formatActivityDevice(requestContext: ActivityLogRequestContext) {
  const os = typeof requestContext.os === 'string' ? requestContext.os : ''
  const browser = typeof requestContext.browser === 'string' ? requestContext.browser : ''

  if (os && browser) return `${os} · ${browser}`
  if (os) return os
  if (browser) return browser
  return '未知设备'
}

export function formatActivityIp(ip: string) {
  return ip || '-'
}
