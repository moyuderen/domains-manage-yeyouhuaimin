import 'server-only'

import { logActivity } from '@/lib/data/activity-logs'
import type { ResolvedEventInput } from '@/lib/events/types'

export async function persistActivityLogEvent(event: ResolvedEventInput) {
  const activityLog = await logActivity({
    eventKey: event.eventKey,
    category: event.category,
    action: event.action,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    resourceName: event.resourceName,
    summary: event.summary,
    detail: event.detail,
    ip: event.ip,
    requestContext: event.requestContext,
    occurredAt: event.occurredAt,
    actorUserId: event.actorUserId,
    severity: event.severity,
    result: event.result,
    idempotencyKey: event.idempotencyKey,
  })

  return activityLog ? { activityLogId: activityLog.id } : undefined
}
