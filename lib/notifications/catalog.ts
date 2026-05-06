import type { EventKey, EventSeverity } from '@/lib/events/types'
import { NOTIFICATION_CHANNEL_KEYS, type NotificationChannelKey, type NotificationLevel, type NotificationTypeKey } from '@/types/notification'

export type NotificationRule = {
  typeKey: NotificationTypeKey
  channelKeys: readonly NotificationChannelKey[]
  defaultEnabled: boolean
  level: NotificationLevel
  dedupeWindowMinutes: number
}

const NOTIFICATION_RULES: Partial<Record<EventKey, NotificationRule>> = {
  'auth.login': {
    typeKey: 'auth_activity',
    channelKeys: NOTIFICATION_CHANNEL_KEYS,
    defaultEnabled: false,
    level: 'info',
    dedupeWindowMinutes: 0,
  },
  'auth.logout': {
    typeKey: 'auth_activity',
    channelKeys: NOTIFICATION_CHANNEL_KEYS,
    defaultEnabled: false,
    level: 'info',
    dedupeWindowMinutes: 0,
  },
  'auth.login_failed': {
    typeKey: 'auth_activity',
    channelKeys: NOTIFICATION_CHANNEL_KEYS,
    defaultEnabled: true,
    level: 'critical',
    dedupeWindowMinutes: 10,
  },
  'domain.create': {
    typeKey: 'resource_change',
    channelKeys: NOTIFICATION_CHANNEL_KEYS,
    defaultEnabled: false,
    level: 'info',
    dedupeWindowMinutes: 0,
  },
  'domain.update': {
    typeKey: 'resource_change',
    channelKeys: NOTIFICATION_CHANNEL_KEYS,
    defaultEnabled: false,
    level: 'info',
    dedupeWindowMinutes: 0,
  },
  'domain.delete': {
    typeKey: 'resource_change',
    channelKeys: NOTIFICATION_CHANNEL_KEYS,
    defaultEnabled: true,
    level: 'warning',
    dedupeWindowMinutes: 0,
  },
  'site.create': {
    typeKey: 'resource_change',
    channelKeys: NOTIFICATION_CHANNEL_KEYS,
    defaultEnabled: false,
    level: 'info',
    dedupeWindowMinutes: 0,
  },
  'site.update': {
    typeKey: 'resource_change',
    channelKeys: NOTIFICATION_CHANNEL_KEYS,
    defaultEnabled: false,
    level: 'info',
    dedupeWindowMinutes: 0,
  },
  'site.delete': {
    typeKey: 'resource_change',
    channelKeys: NOTIFICATION_CHANNEL_KEYS,
    defaultEnabled: true,
    level: 'warning',
    dedupeWindowMinutes: 0,
  },
  'account.create': {
    typeKey: 'resource_change',
    channelKeys: NOTIFICATION_CHANNEL_KEYS,
    defaultEnabled: false,
    level: 'info',
    dedupeWindowMinutes: 0,
  },
  'account.update': {
    typeKey: 'resource_change',
    channelKeys: NOTIFICATION_CHANNEL_KEYS,
    defaultEnabled: false,
    level: 'info',
    dedupeWindowMinutes: 0,
  },
  'account.delete': {
    typeKey: 'resource_change',
    channelKeys: NOTIFICATION_CHANNEL_KEYS,
    defaultEnabled: true,
    level: 'warning',
    dedupeWindowMinutes: 0,
  },
  'settings.update': {
    typeKey: 'settings_change',
    channelKeys: NOTIFICATION_CHANNEL_KEYS,
    defaultEnabled: false,
    level: 'info',
    dedupeWindowMinutes: 0,
  },
  'settings.critical_changed': {
    typeKey: 'settings_change',
    channelKeys: NOTIFICATION_CHANNEL_KEYS,
    defaultEnabled: true,
    level: 'critical',
    dedupeWindowMinutes: 0,
  },
}

export function getNotificationRule(eventKey: EventKey) {
  return NOTIFICATION_RULES[eventKey]
}

export function getNotificationLevel(severity: EventSeverity, fallback: NotificationLevel): NotificationLevel {
  if (severity === 'critical') return 'critical'
  if (severity === 'warning') return 'warning'
  return fallback
}
