export const NOTIFICATION_CHANNEL_KEYS = ['telegram', 'email', 'webhook'] as const
export const NOTIFICATION_TYPE_KEYS = [
  'domain_expiry_reminder',
  'notification_schedule',
  'auth_activity',
  'resource_change',
  'settings_change',
] as const
export const NOTIFICATION_DELIVERY_STATUSES = ['pending', 'sent', 'failed', 'skipped'] as const
export const NOTIFICATION_LEVELS = ['info', 'warning', 'critical'] as const

export type NotificationChannelKey = (typeof NOTIFICATION_CHANNEL_KEYS)[number]
export type NotificationTypeKey = (typeof NOTIFICATION_TYPE_KEYS)[number]
export type NotificationDeliveryStatus = (typeof NOTIFICATION_DELIVERY_STATUSES)[number]
export type NotificationLevel = (typeof NOTIFICATION_LEVELS)[number]
export type NotificationConfig = Record<string, unknown>

export type NotificationContentTextBlock = {
  type: 'text'
  label: string
  value: string
}

export type NotificationContentListBlock = {
  type: 'list'
  label: string
  items: string[]
}

export type NotificationContentBlock = NotificationContentTextBlock | NotificationContentListBlock

export type NotificationContent = {
  templateKey: string
  title: string
  summary: string
  blocks: NotificationContentBlock[]
  meta: Record<string, string>
}

export type NotificationPayloadContext = {
  eventKey?: string
  resourceType?: string
  resourceId?: string
  resourceName?: string
  occurredAt?: string
  detail?: Record<string, unknown>
  ip?: string
  os?: string
  browser?: string
}

export type NotificationPayload = {
  version?: number
  content?: NotificationContent
  context?: NotificationPayloadContext
  message?: string
} & Record<string, unknown>

export type NotificationEndpoint = {
  id: string
  channelKey: NotificationChannelKey
  name: string
  enabled: boolean
  config: NotificationConfig
  lastVerifiedAt: string
  createdAt: string
  updatedAt: string
}

export type NotificationPreference = {
  id: string
  userId: string
  typeKey: NotificationTypeKey
  enabled: boolean
  config: NotificationConfig
  createdAt: string
  updatedAt: string
}

export type NotificationDelivery = {
  id: string
  activityLogId: string
  typeKey: NotificationTypeKey
  channelKey: NotificationChannelKey
  endpointId: string
  status: NotificationDeliveryStatus
  level: NotificationLevel
  payload: NotificationPayload
  dedupeKey: string
  providerMessageId: string
  errorMessage: string
  sentAt: string
  createdAt: string
  updatedAt: string
}

export type NotificationEndpointRow = {
  id: string
  channel_key: string
  name: string
  enabled: boolean
  config: unknown
  last_verified_at: string | null
  created_at: string
  updated_at: string
}

export type NotificationPreferenceRow = {
  id: string
  user_id: string
  type_key: string
  enabled: boolean
  config: unknown
  created_at: string
  updated_at: string
}

export type NotificationDeliveryRow = {
  id: string
  activity_log_id: string
  type_key: string
  channel_key: string
  endpoint_id: string | null
  status: string
  level: string
  payload: unknown
  dedupe_key: string | null
  provider_message_id: string | null
  error_message: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}
