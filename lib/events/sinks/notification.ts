import 'server-only'

import { getTime, parseISO } from 'date-fns'

import {
  createNotificationDelivery,
  getNotificationEndpointById,
  getNotificationPreference,
  listNotificationEndpointsByChannel,
  listPendingNotificationDeliveries,
  updateNotificationDeliveryStatus,
} from '@/lib/data/notifications'
import { getNotificationNotifyTimezone, getProjectTitles } from '@/lib/data/settings'
import { getEventSourceInfo } from '@/lib/events/helpers'
import { getNotificationLevel, getNotificationRule } from '@/lib/notifications/catalog'
import { normalizeRecord } from '@/lib/notifications/message'
import { eventNotificationTemplate } from '@/lib/notifications/templates'
import type { ChannelSender } from '@/lib/notifications/types'
import { sendEmailDelivery } from '@/lib/notifications/email'
import { sendTelegramDelivery } from '@/lib/notifications/telegram'
import { sendWebhookDelivery } from '@/lib/notifications/webhook'
import type { EventDispatchContext, ResolvedEventInput } from '@/lib/events/types'
import {
  NOTIFICATION_CHANNEL_KEYS,
  type NotificationChannelKey,
  type NotificationConfig,
  type NotificationContent,
  type NotificationDelivery,
  type NotificationEndpoint,
  type NotificationLevel,
  type NotificationPayload,
  type NotificationTypeKey,
} from '@/types/notification'

// ---------------------------------------------------------------------------
// Channel sender registry
// ---------------------------------------------------------------------------

const CHANNEL_SENDERS: Partial<Record<NotificationChannelKey, ChannelSender>> = {
  telegram: sendTelegramDelivery,
  email: sendEmailDelivery,
  webhook: sendWebhookDelivery,
}

// ---------------------------------------------------------------------------
// Event-driven notification (event sink)
// ---------------------------------------------------------------------------

export async function persistNotificationEvent(event: ResolvedEventInput, context: EventDispatchContext) {
  const rule = getNotificationRule(event.eventKey)
  if (!rule || !context.activityLogId) {
    return
  }

  const activityLogId = context.activityLogId
  const preference = await getNotificationPreference(rule.typeKey)
  const enabled = isNotificationEnabled(event, rule.typeKey, preference?.enabled ?? rule.defaultEnabled, preference?.config)
  if (!enabled) {
    return
  }

  const [projectTitles, notifyTimezone, targets] = await Promise.all([
    getProjectTitles(),
    getNotificationNotifyTimezone(),
    resolveNotificationTargets(rule.channelKeys),
  ])

  if (targets.length === 0) {
    return
  }

  const options = { projectName: projectTitles.title, timeZone: notifyTimezone }
  const content = eventNotificationTemplate.buildContent(event, options)
  const level = getNotificationLevel(event.severity, rule.level)
  const dedupeKey = buildNotificationDedupeKey(event, rule.dedupeWindowMinutes)

  const results = await Promise.all(
    targets.map(async (target) => {
      const delivery = await createNotificationDelivery({
        activityLogId,
        typeKey: rule.typeKey,
        channelKey: target.channelKey,
        endpointId: target.endpoint.id,
        status: 'pending',
        level,
        dedupeKey: `${dedupeKey}:${target.channelKey}`,
        payload: buildNotificationPayload(content, event),
      })

      if (!delivery) {
        return {
          notificationsCreated: 0,
          notificationsSent: 0,
          notificationsFailed: 0,
          notificationsSkipped: 1,
        }
      }

      return processNotificationDelivery(delivery, target.endpoint)
    }),
  )

  return summarizeNotificationResults(results)
}

// ---------------------------------------------------------------------------
// Aggregated notification (for templates like domain_expiry_report)
// ---------------------------------------------------------------------------

export async function sendTemplateNotification(params: {
  typeKey: NotificationTypeKey
  content: NotificationContent
  level: NotificationLevel
  activityLogId: string
  dedupeKey: string
}) {
  const targets = await resolveAllEnabledTargets()

  if (targets.length === 0) {
    return { notificationsCreated: 0, notificationsSent: 0, notificationsFailed: 0, notificationsSkipped: 0 }
  }

  const results = await Promise.all(
    targets.map(async (target) => {
      const delivery = await createNotificationDelivery({
        activityLogId: params.activityLogId,
        typeKey: params.typeKey,
        channelKey: target.channelKey,
        endpointId: target.endpoint.id,
        status: 'pending',
        level: params.level,
        dedupeKey: `${params.dedupeKey}:${target.channelKey}`,
        payload: buildNotificationPayload(params.content),
      })

      if (!delivery) {
        return {
          notificationsCreated: 0,
          notificationsSent: 0,
          notificationsFailed: 0,
          notificationsSkipped: 1,
        }
      }

      return processNotificationDelivery(delivery, target.endpoint)
    }),
  )

  return summarizeNotificationResults(results)
}

// ---------------------------------------------------------------------------
// Delivery processing
// ---------------------------------------------------------------------------

export async function processPendingNotificationDeliveries(limit = 50) {
  const deliveries = await listPendingNotificationDeliveries(limit)
  const results = await Promise.all(deliveries.map((delivery) => processNotificationDelivery(delivery)))
  const summary = {
    notificationsCreated: deliveries.length,
    notificationsSent: 0,
    notificationsFailed: 0,
    notificationsSkipped: 0,
  }

  for (const result of results) {
    summary.notificationsSent += result.notificationsSent ?? 0
    summary.notificationsFailed += result.notificationsFailed ?? 0
    summary.notificationsSkipped += result.notificationsSkipped ?? 0
  }

  return summary
}

async function processNotificationDelivery(delivery: NotificationDelivery, endpointOverride?: NotificationEndpoint) {
  if (!delivery.endpointId) {
    await updateNotificationDeliveryStatus({
      id: delivery.id,
      status: 'skipped',
      errorMessage: '通知目标缺少 endpoint',
      sentAt: null,
    })
    return {
      notificationsCreated: 1,
      notificationsSent: 0,
      notificationsFailed: 0,
      notificationsSkipped: 1,
    }
  }

  const endpoint = endpointOverride ?? (await getNotificationEndpointById(delivery.endpointId))
  if (!endpoint || !endpoint.enabled) {
    await updateNotificationDeliveryStatus({
      id: delivery.id,
      status: 'failed',
      errorMessage: `${delivery.channelKey} 通道未启用`,
      sentAt: null,
    })
    return {
      notificationsCreated: 1,
      notificationsSent: 0,
      notificationsFailed: 1,
      notificationsSkipped: 0,
    }
  }

  const result = await dispatchToChannel(delivery, endpoint)
  if (!result.success) {
    await updateNotificationDeliveryStatus({
      id: delivery.id,
      status: 'failed',
      errorMessage: result.errorMessage,
      sentAt: null,
    })
    return {
      notificationsCreated: 1,
      notificationsSent: 0,
      notificationsFailed: 1,
      notificationsSkipped: 0,
    }
  }

  await updateNotificationDeliveryStatus({
    id: delivery.id,
    status: 'sent',
    providerMessageId: result.providerMessageId,
  })

  return {
    notificationsCreated: 1,
    notificationsSent: 1,
    notificationsFailed: 0,
    notificationsSkipped: 0,
  }
}

// ---------------------------------------------------------------------------
// Channel dispatch (map lookup)
// ---------------------------------------------------------------------------

async function dispatchToChannel(delivery: NotificationDelivery, endpoint: NotificationEndpoint) {
  const sender = CHANNEL_SENDERS[delivery.channelKey]

  if (!sender) {
    return { success: false as const, errorMessage: `暂不支持 ${delivery.channelKey} 通道发送` }
  }

  return sender({ delivery, endpoint })
}

// ---------------------------------------------------------------------------
// Target resolution
// ---------------------------------------------------------------------------

async function resolveNotificationTargets(channelKeys: readonly NotificationChannelKey[]) {
  const targets = await Promise.all(
    channelKeys.map(async (channelKey) => {
      const endpoints = await listNotificationEndpointsByChannel(channelKey)
      const endpoint = endpoints.find((item) => item.enabled)
      return endpoint ? { channelKey, endpoint } : null
    }),
  )

  return targets.filter((target): target is { channelKey: NotificationChannelKey; endpoint: NotificationEndpoint } => target !== null)
}

async function resolveAllEnabledTargets() {
  return resolveNotificationTargets([...NOTIFICATION_CHANNEL_KEYS])
}

// ---------------------------------------------------------------------------
// Payload builder
// ---------------------------------------------------------------------------

function buildNotificationPayload(content: NotificationContent, event?: ResolvedEventInput): NotificationPayload {
  return {
    version: 2,
    content,
    context: event
      ? {
          eventKey: event.eventKey,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          resourceName: event.resourceName,
          occurredAt: event.occurredAt,
          ...getEventSourceInfo(event),
        }
      : undefined,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function summarizeNotificationResults(
  results: Array<{
    notificationsCreated?: number
    notificationsSent?: number
    notificationsFailed?: number
    notificationsSkipped?: number
  }>,
) {
  return results.reduce<{
    notificationsCreated: number
    notificationsSent: number
    notificationsFailed: number
    notificationsSkipped: number
  }>(
    (summary, result) => ({
      notificationsCreated: summary.notificationsCreated + (result.notificationsCreated ?? 0),
      notificationsSent: summary.notificationsSent + (result.notificationsSent ?? 0),
      notificationsFailed: summary.notificationsFailed + (result.notificationsFailed ?? 0),
      notificationsSkipped: summary.notificationsSkipped + (result.notificationsSkipped ?? 0),
    }),
    {
      notificationsCreated: 0,
      notificationsSent: 0,
      notificationsFailed: 0,
      notificationsSkipped: 0,
    },
  )
}

function buildNotificationDedupeKey(event: ResolvedEventInput, dedupeWindowMinutes: number) {
  if (dedupeWindowMinutes <= 0) {
    return [event.eventKey, event.resourceType, event.resourceId ?? '', event.occurredAt].join(':')
  }

  const bucket = Math.floor(getTime(parseISO(event.occurredAt)) / (dedupeWindowMinutes * 60 * 1000))
  return [event.eventKey, event.resourceType, event.resourceId ?? '', String(bucket)].join(':')
}

function isNotificationEnabled(
  event: ResolvedEventInput,
  typeKey: NotificationTypeKey,
  defaultEnabled: boolean,
  config: NotificationConfig | undefined,
) {
  if (typeKey !== 'resource_change') {
    return defaultEnabled
  }

  const resourceConfig = normalizeRecord(config)
  const configKeys = getResourceChangeConfigKeys(event)

  if (!configKeys) {
    return defaultEnabled
  }

  const groupEnabled = resourceConfig[configKeys.groupKey]
  if (typeof groupEnabled !== 'boolean' || !groupEnabled) {
    return false
  }

  const actionEnabled = resourceConfig[configKeys.actionKey]
  return typeof actionEnabled === 'boolean' ? actionEnabled : defaultEnabled
}

function getResourceChangeConfigKeys(event: ResolvedEventInput) {
  if (event.category === 'domain' && event.action === 'create') return { groupKey: 'domainEnabled', actionKey: 'domainCreate' }
  if (event.category === 'domain' && event.action === 'update') return { groupKey: 'domainEnabled', actionKey: 'domainUpdate' }
  if (event.category === 'domain' && event.action === 'delete') return { groupKey: 'domainEnabled', actionKey: 'domainDelete' }
  if (event.category === 'site' && event.action === 'create') return { groupKey: 'siteEnabled', actionKey: 'siteCreate' }
  if (event.category === 'site' && event.action === 'update') return { groupKey: 'siteEnabled', actionKey: 'siteUpdate' }
  if (event.category === 'site' && event.action === 'delete') return { groupKey: 'siteEnabled', actionKey: 'siteDelete' }
  if (event.category === 'account' && event.action === 'create') return { groupKey: 'accountEnabled', actionKey: 'accountCreate' }
  if (event.category === 'account' && event.action === 'update') return { groupKey: 'accountEnabled', actionKey: 'accountUpdate' }
  if (event.category === 'account' && event.action === 'delete') return { groupKey: 'accountEnabled', actionKey: 'accountDelete' }
  return null
}
