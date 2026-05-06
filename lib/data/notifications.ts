import 'server-only'

import { formatISO } from 'date-fns'

import { normalizeRecord } from '@/lib/notifications/message'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import {
  NOTIFICATION_CHANNEL_KEYS,
  NOTIFICATION_DELIVERY_STATUSES,
  NOTIFICATION_LEVELS,
  NOTIFICATION_TYPE_KEYS,
  type NotificationChannelKey,
  type NotificationConfig,
  type NotificationDelivery,
  type NotificationDeliveryRow,
  type NotificationDeliveryStatus,
  type NotificationEndpoint,
  type NotificationEndpointRow,
  type NotificationLevel,
  type NotificationPayload,
  type NotificationPreference,
  type NotificationPreferenceRow,
  type NotificationTypeKey,
} from '@/types/notification'

export const DEFAULT_NOTIFICATION_USER_ID = 'default'

export async function listNotificationEndpoints(): Promise<NotificationEndpoint[]> {
  if (!isSupabaseConfigured()) {
    return []
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('notification_endpoints')
    .select('*')
    .order('channel_key', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapNotificationEndpoint(row as NotificationEndpointRow))
}

export async function listNotificationEndpointsByChannel(
  channelKey: NotificationChannelKey,
): Promise<NotificationEndpoint[]> {
  if (!isSupabaseConfigured()) {
    return []
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('notification_endpoints')
    .select('*')
    .eq('channel_key', channelKey)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapNotificationEndpoint(row as NotificationEndpointRow))
}

export async function getNotificationEndpointByChannel(channelKey: NotificationChannelKey): Promise<NotificationEndpoint | null> {
  const endpoints = await listNotificationEndpointsByChannel(channelKey)
  return endpoints[0] ?? null
}

export async function hasEnabledNotificationEndpoint(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false
  }

  const supabase = createSupabaseAdminClient()
  const { count, error } = await supabase
    .from('notification_endpoints')
    .select('id', { count: 'exact', head: true })
    .eq('enabled', true)

  if (error) throw new Error(error.message)
  return (count ?? 0) > 0
}

export async function getNotificationEndpointById(id: string): Promise<NotificationEndpoint | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('notification_endpoints')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapNotificationEndpoint(data as NotificationEndpointRow)
}

export async function upsertNotificationEndpoint(input: {
  channelKey: NotificationChannelKey
  name: string
  enabled: boolean
  config?: NotificationConfig
  lastVerifiedAt?: string | null
}): Promise<NotificationEndpoint> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('notification_endpoints')
    .upsert({
      channel_key: input.channelKey,
      name: input.name.trim(),
      enabled: input.enabled,
      config: input.config ?? {},
      last_verified_at: input.lastVerifiedAt ?? null,
    }, { onConflict: 'channel_key' })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapNotificationEndpoint(data as NotificationEndpointRow)
}

export async function listNotificationPreferences(userId = DEFAULT_NOTIFICATION_USER_ID): Promise<NotificationPreference[]> {
  if (!isSupabaseConfigured()) {
    return []
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .order('type_key', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapNotificationPreference(row as NotificationPreferenceRow))
}

export async function getNotificationPreference(typeKey: NotificationTypeKey, userId = DEFAULT_NOTIFICATION_USER_ID): Promise<NotificationPreference | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('type_key', typeKey)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapNotificationPreference(data as NotificationPreferenceRow)
}

export async function upsertNotificationPreference(input: {
  typeKey: NotificationTypeKey
  enabled: boolean
  config?: NotificationConfig
  userId?: string
}): Promise<NotificationPreference> {
  const userId = input.userId?.trim() || DEFAULT_NOTIFICATION_USER_ID
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      type_key: input.typeKey,
      enabled: input.enabled,
      config: input.config ?? {},
    }, { onConflict: 'user_id,type_key' })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapNotificationPreference(data as NotificationPreferenceRow)
}

export async function createNotificationDelivery(input: {
  activityLogId: string
  typeKey: NotificationTypeKey
  channelKey: NotificationChannelKey
  endpointId?: string
  status?: NotificationDeliveryStatus
  level?: NotificationLevel
  payload?: NotificationPayload
  dedupeKey?: string
}): Promise<NotificationDelivery | null> {
  const supabase = createSupabaseAdminClient()
  const dedupeKey = input.dedupeKey?.trim() ?? ''

  const { data, error } = await supabase
    .from('notification_deliveries')
    .insert({
      activity_log_id: input.activityLogId,
      type_key: input.typeKey,
      channel_key: input.channelKey,
      endpoint_id: input.endpointId?.trim() || null,
      status: input.status ?? 'pending',
      level: input.level ?? 'info',
      payload: input.payload ?? {},
      dedupe_key: dedupeKey,
    })
    .select('*')
    .single()

  if (error) {
    if (isNotificationDeliveryDedupeConflict(error, dedupeKey)) {
      return null
    }

    throw new Error(error.message)
  }

  return mapNotificationDelivery(data as NotificationDeliveryRow)
}

export async function listPendingNotificationDeliveries(limit = 50): Promise<NotificationDelivery[]> {
  if (!isSupabaseConfigured()) {
    return []
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('notification_deliveries')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapNotificationDelivery(row as NotificationDeliveryRow))
}

export async function updateNotificationDeliveryStatus(input: {
  id: string
  status: NotificationDeliveryStatus
  providerMessageId?: string
  errorMessage?: string
  sentAt?: string | null
}): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const payload = {
    status: input.status,
    provider_message_id: input.providerMessageId?.trim() ?? '',
    error_message: input.errorMessage?.trim() ?? '',
    sent_at: input.sentAt ?? (input.status === 'sent' ? formatISO(new Date()) : null),
  }

  const { error } = await supabase
    .from('notification_deliveries')
    .update(payload)
    .eq('id', input.id)

  if (error) throw new Error(error.message)
}

function mapNotificationEndpoint(row: NotificationEndpointRow): NotificationEndpoint {
  return {
    id: row.id,
    channelKey: normalizeNotificationChannelKey(row.channel_key),
    name: row.name,
    enabled: row.enabled,
    config: normalizeRecord(row.config),
    lastVerifiedAt: row.last_verified_at ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapNotificationPreference(row: NotificationPreferenceRow): NotificationPreference {
  return {
    id: row.id,
    userId: row.user_id,
    typeKey: normalizeNotificationTypeKey(row.type_key),
    enabled: row.enabled,
    config: normalizeRecord(row.config),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapNotificationDelivery(row: NotificationDeliveryRow): NotificationDelivery {
  return {
    id: row.id,
    activityLogId: row.activity_log_id,
    typeKey: normalizeNotificationTypeKey(row.type_key),
    channelKey: normalizeNotificationChannelKey(row.channel_key),
    endpointId: row.endpoint_id ?? '',
    status: normalizeNotificationDeliveryStatus(row.status),
    level: normalizeNotificationLevel(row.level),
    payload: normalizeRecord(row.payload),
    dedupeKey: row.dedupe_key ?? '',
    providerMessageId: row.provider_message_id ?? '',
    errorMessage: row.error_message ?? '',
    sentAt: row.sent_at ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeNotificationChannelKey(value: string): NotificationChannelKey {
  if (NOTIFICATION_CHANNEL_KEYS.includes(value as NotificationChannelKey)) {
    return value as NotificationChannelKey
  }

  return 'telegram'
}

function normalizeNotificationTypeKey(value: string): NotificationTypeKey {
  if (NOTIFICATION_TYPE_KEYS.includes(value as NotificationTypeKey)) {
    return value as NotificationTypeKey
  }

  return 'settings_change'
}

function normalizeNotificationDeliveryStatus(value: string): NotificationDeliveryStatus {
  if (NOTIFICATION_DELIVERY_STATUSES.includes(value as NotificationDeliveryStatus)) {
    return value as NotificationDeliveryStatus
  }

  return 'pending'
}

function normalizeNotificationLevel(value: string): NotificationLevel {
  if (NOTIFICATION_LEVELS.includes(value as NotificationLevel)) {
    return value as NotificationLevel
  }

  return 'info'
}

function isNotificationDeliveryDedupeConflict(error: { code?: string; message: string }, dedupeKey: string) {
  return dedupeKey !== '' && error.code === '23505'
}
