import type { ActivityLogAction, ActivityLogCategory, ActivityLogDetail } from '@/types/activity-log'

export const EVENT_RESOURCE_TYPES = ['auth', 'domain', 'site', 'account', 'settings', 'task', 'system'] as const
export const EVENT_SEVERITIES = ['info', 'warning', 'critical'] as const
export const EVENT_RESULTS = ['success', 'failure'] as const
export const EVENT_KEYS = [
  'auth.login',
  'auth.login_failed',
  'auth.logout',
  'domain.create',
  'domain.update',
  'domain.delete',
  'domain.expiry.warning',
  'domain.expiry.expired',
  'domain.check.failed',
  'site.create',
  'site.update',
  'site.delete',
  'site.monitor.failed',
  'account.create',
  'account.update',
  'account.delete',
  'settings.update',
  'settings.critical_changed',
  'task.import.completed',
  'task.import.failed',
  'task.export.completed',
  'task.export.failed',
] as const

export type ActivityRequestContext = {
  ip: string
  userAgent: string
  os: string
  browser: string
}

export type EventResourceType = (typeof EVENT_RESOURCE_TYPES)[number]
export type EventSeverity = (typeof EVENT_SEVERITIES)[number]
export type EventResult = (typeof EVENT_RESULTS)[number]
type DefaultEventKey = `${ActivityLogCategory}.${ActivityLogAction}`
export type EventKey = (typeof EVENT_KEYS)[number] | DefaultEventKey

export type EventInput = {
  eventKey?: EventKey
  category: ActivityLogCategory
  action: ActivityLogAction
  resourceType?: EventResourceType
  resourceId?: string
  resourceName?: string
  summary: string
  detail?: ActivityLogDetail
  ip?: string
  requestContext?: ActivityRequestContext
  occurredAt?: string
  actorUserId?: string
  severity?: EventSeverity
  result?: EventResult
  idempotencyKey?: string
}

export type ResolvedEventInput = Omit<EventInput, 'eventKey' | 'resourceType' | 'detail' | 'ip' | 'occurredAt' | 'severity' | 'result'> & {
  eventKey: EventKey
  resourceType: EventResourceType
  detail: ActivityLogDetail
  ip: string
  occurredAt: string
  severity: EventSeverity
  result: EventResult
}

export type EventDispatchContext = {
  activityLogId?: string
  notificationsCreated?: number
  notificationsSent?: number
  notificationsFailed?: number
  notificationsSkipped?: number
}

export type EventSink = (event: ResolvedEventInput, context: EventDispatchContext) => Promise<EventDispatchContext | void>

export function getEventKey(event: Pick<EventInput, 'category' | 'action'> & Partial<Pick<EventInput, 'eventKey'>>): EventKey {
  return event.eventKey ?? `${event.category}.${event.action}`
}

export function resolveEventInput(event: EventInput): ResolvedEventInput {
  return {
    ...event,
    eventKey: getEventKey(event),
    resourceType: event.resourceType ?? event.category,
    resourceId: normalizeOptionalString(event.resourceId),
    resourceName: normalizeOptionalString(event.resourceName),
    detail: event.detail ?? {},
    ip: normalizeOptionalString(event.ip) ?? event.requestContext?.ip ?? '',
    occurredAt: event.occurredAt ?? new Date().toISOString(),
    actorUserId: normalizeOptionalString(event.actorUserId),
    severity: event.severity ?? 'info',
    result: event.result ?? getDefaultEventResult(event),
    idempotencyKey: normalizeOptionalString(event.idempotencyKey),
  }
}

function getDefaultEventResult(event: Pick<EventInput, 'eventKey' | 'action'>): EventResult {
  const eventKey = event.eventKey ?? ''

  if (event.action === 'login_failed' || eventKey.endsWith('.failed')) {
    return 'failure'
  }

  return 'success'
}

function normalizeOptionalString(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

