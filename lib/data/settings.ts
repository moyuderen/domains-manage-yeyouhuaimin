import 'server-only'

import { cache } from 'react'

import {
  DEFAULT_NOTIFICATION_USER_ID,
  getNotificationEndpointByChannel,
  getNotificationPreference,
  listNotificationPreferences,
  upsertNotificationEndpoint,
  upsertNotificationPreference,
} from '@/lib/data/notifications'
import { normalizeRecord, readConfigStringArray } from '@/lib/notifications/message'
import {
  createDefaultEmailProviderSettings,
  createDefaultNotificationPreferenceToggles,
  createDefaultNotificationRuleSettings,
  createDefaultTelegramProviderSettings,
  createDefaultWebhookProviderSettings,
  type EmailProviderSettings,
  type EmailProviderView,
  type NotificationRuleSettings,
  type NotificationSettingsPageData,
  type ResourceChangeNotificationToggles,
  type TelegramProviderSettings,
  type TelegramProviderView,
  type WebhookProviderSettings,
  type WebhookProviderView,
} from '@/lib/notifications/settings'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import type { NotificationTypeKey } from '@/types/notification'

export const SETTINGS_KEYS = {
  PROJECT_TITLE: 'project_title',
  PROJECT_SUBTITLE: 'project_subtitle',
  PROJECT_ICON: 'project_icon',
} as const

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS]

const DEFAULTS: Record<SettingsKey, string> = {
  [SETTINGS_KEYS.PROJECT_TITLE]: '管理系统',
  [SETTINGS_KEYS.PROJECT_SUBTITLE]: 'Domain Manage',
  [SETTINGS_KEYS.PROJECT_ICON]: '/icon.svg',
}

const DEFAULT_PROJECT_TITLES = {
  title: DEFAULTS[SETTINGS_KEYS.PROJECT_TITLE],
  subtitle: DEFAULTS[SETTINGS_KEYS.PROJECT_SUBTITLE],
  icon: DEFAULTS[SETTINGS_KEYS.PROJECT_ICON],
}

const NOTIFICATION_TYPE_DEFAULTS: Record<NotificationTypeKey, boolean> = {
  domain_expiry_reminder: true,
  notification_schedule: true,
  auth_activity: true,
  resource_change: false,
  settings_change: true,
}

export type {
  EmailProviderSettings,
  EmailProviderView,
  NotificationPreferenceToggles,
  NotificationRuleSettings,
  NotificationSettingsPageData,
  ResourceChangeNotificationToggles,
  TelegramProviderSettings,
  TelegramProviderView,
  WebhookProviderSettings,
  WebhookProviderView,
} from '@/lib/notifications/settings'

const DEFAULT_NOTIFICATION_RULE_SETTINGS = createDefaultNotificationRuleSettings()
const DEFAULT_NOTIFICATION_PREFERENCES = createDefaultNotificationPreferenceToggles()

const DEFAULT_EMAIL_PROVIDER_SETTINGS = createDefaultEmailProviderSettings()
const DEFAULT_TELEGRAM_PROVIDER_SETTINGS = createDefaultTelegramProviderSettings()
const DEFAULT_WEBHOOK_PROVIDER_SETTINGS = createDefaultWebhookProviderSettings()

export function getDefaultSetting(key: SettingsKey): string {
  return DEFAULTS[key] ?? ''
}

export async function getSetting(key: SettingsKey): Promise<string> {
  if (!isSupabaseConfigured()) {
    return DEFAULTS[key] ?? ''
  }

  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single()

    if (error || !data) return DEFAULTS[key] ?? ''
    return data.value
  } catch {
    return DEFAULTS[key] ?? ''
  }
}

export const getProjectTitles = cache(async (): Promise<{ title: string; subtitle: string; icon: string }> => {
  if (!isSupabaseConfigured()) {
    return DEFAULT_PROJECT_TITLES
  }

  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', [SETTINGS_KEYS.PROJECT_TITLE, SETTINGS_KEYS.PROJECT_SUBTITLE, SETTINGS_KEYS.PROJECT_ICON])

    if (error || !data) return DEFAULT_PROJECT_TITLES

    const map = new Map(data.map((row) => [row.key, row.value]))
    return {
      title: map.get(SETTINGS_KEYS.PROJECT_TITLE) ?? DEFAULT_PROJECT_TITLES.title,
      subtitle: map.get(SETTINGS_KEYS.PROJECT_SUBTITLE) ?? DEFAULT_PROJECT_TITLES.subtitle,
      icon: map.get(SETTINGS_KEYS.PROJECT_ICON) ?? DEFAULT_PROJECT_TITLES.icon,
    }
  } catch {
    return DEFAULT_PROJECT_TITLES
  }
})

export async function upsertSetting(key: SettingsKey, value: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value }, { onConflict: 'key' })

  if (error) throw new Error(error.message)
}

export async function getNotificationRuleSettings(): Promise<NotificationRuleSettings> {
  if (!isSupabaseConfigured()) {
    return DEFAULT_NOTIFICATION_RULE_SETTINGS
  }

  try {
    const preferences = await listNotificationPreferences(DEFAULT_NOTIFICATION_USER_ID)
    const preferenceMap = new Map(preferences.map((item) => [item.typeKey, item]))
    const domainExpiryConfig = normalizeRecord(preferenceMap.get('domain_expiry_reminder')?.config)
    const scheduleConfig = normalizeRecord(preferenceMap.get('notification_schedule')?.config)

    return {
      expiryDays: readNumber(domainExpiryConfig, 'expiryDays') ?? DEFAULT_NOTIFICATION_RULE_SETTINGS.expiryDays,
      notifyHour:
        readNumber(scheduleConfig, 'notifyHour')
        ?? readNumber(domainExpiryConfig, 'notifyHour')
        ?? DEFAULT_NOTIFICATION_RULE_SETTINGS.notifyHour,
      notifyTimezone:
        readString(scheduleConfig, 'notifyTimezone')
        || readString(domainExpiryConfig, 'notifyTimezone')
        || DEFAULT_NOTIFICATION_RULE_SETTINGS.notifyTimezone,
      preferences: {
        domainExpiryReminder: preferenceMap.get('domain_expiry_reminder')?.enabled ?? NOTIFICATION_TYPE_DEFAULTS.domain_expiry_reminder,
        authActivity: preferenceMap.get('auth_activity')?.enabled ?? NOTIFICATION_TYPE_DEFAULTS.auth_activity,
        settingsChange: preferenceMap.get('settings_change')?.enabled ?? NOTIFICATION_TYPE_DEFAULTS.settings_change,
        resourceChange: readResourceChangePreferences(preferenceMap.get('resource_change')?.config),
      },
    }
  } catch {
    return DEFAULT_NOTIFICATION_RULE_SETTINGS
  }
}

export async function saveNotificationRuleSettings(config: NotificationRuleSettings): Promise<void> {
  await Promise.all([
    upsertNotificationPreference({
      typeKey: 'domain_expiry_reminder',
      enabled: config.preferences.domainExpiryReminder,
      config: {
        expiryDays: config.expiryDays,
      },
    }),
    upsertNotificationPreference({
      typeKey: 'notification_schedule',
      enabled: true,
      config: {
        notifyHour: config.notifyHour,
        notifyTimezone: config.notifyTimezone,
      },
    }),
    upsertNotificationPreference({
      typeKey: 'auth_activity',
      enabled: config.preferences.authActivity,
      config: {},
    }),
    upsertNotificationPreference({
      typeKey: 'settings_change',
      enabled: config.preferences.settingsChange,
      config: {},
    }),
    upsertNotificationPreference({
      typeKey: 'resource_change',
      enabled: hasEnabledResourceChange(config.preferences.resourceChange),
      config: buildResourceChangePreferenceConfig(config.preferences.resourceChange),
    }),
  ])
}

export async function getEmailProviderSettings(): Promise<EmailProviderSettings> {
  if (!isSupabaseConfigured()) {
    return { ...DEFAULT_EMAIL_PROVIDER_SETTINGS }
  }

  try {
    const endpoint = await getNotificationEndpointByChannel('email')
    const endpointConfig = normalizeRecord(endpoint?.config)

    return {
      smtpHost: readString(endpointConfig, 'smtpHost'),
      smtpPort: readPort(endpointConfig, 'smtpPort', DEFAULT_EMAIL_PROVIDER_SETTINGS.smtpPort),
      smtpSecure: readBoolean(endpointConfig, 'smtpSecure', DEFAULT_EMAIL_PROVIDER_SETTINGS.smtpSecure),
      smtpUsername: readString(endpointConfig, 'smtpUsername'),
      smtpPassword: readString(endpointConfig, 'smtpPassword'),
      fromEmail: readString(endpointConfig, 'fromEmail'),
      fromName: readString(endpointConfig, 'fromName'),
      replyToEmail: readString(endpointConfig, 'replyToEmail'),
      toEmails: readConfigStringArray(endpointConfig, 'toEmails'),
      enabled: endpoint?.enabled ?? DEFAULT_EMAIL_PROVIDER_SETTINGS.enabled,
      lastVerifiedAt: endpoint?.lastVerifiedAt ?? '',
    }
  } catch {
    return { ...DEFAULT_EMAIL_PROVIDER_SETTINGS }
  }
}

export async function saveEmailProviderSettings(config: {
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUsername: string
  smtpPassword: string
  fromEmail: string
  fromName: string
  replyToEmail: string
  toEmails: string[]
  enabled: boolean
  lastVerifiedAt?: string | null
}): Promise<void> {
  await upsertNotificationEndpoint({
    channelKey: 'email',
    name: 'Email',
    enabled: config.enabled,
    config: {
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpSecure: config.smtpSecure,
      smtpUsername: config.smtpUsername,
      smtpPassword: config.smtpPassword,
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      replyToEmail: config.replyToEmail,
      toEmails: config.toEmails,
    },
    lastVerifiedAt: config.lastVerifiedAt ?? null,
  })
}

export async function getTelegramProviderSettings(): Promise<TelegramProviderSettings> {
  if (!isSupabaseConfigured()) {
    return { ...DEFAULT_TELEGRAM_PROVIDER_SETTINGS }
  }

  try {
    const endpoint = await getNotificationEndpointByChannel('telegram')
    const endpointConfig = normalizeRecord(endpoint?.config)

    return {
      botToken: readString(endpointConfig, 'botToken'),
      chatId: readString(endpointConfig, 'chatId'),
      enabled: endpoint?.enabled ?? DEFAULT_TELEGRAM_PROVIDER_SETTINGS.enabled,
      lastVerifiedAt: endpoint?.lastVerifiedAt ?? '',
    }
  } catch {
    return { ...DEFAULT_TELEGRAM_PROVIDER_SETTINGS }
  }
}

export async function saveTelegramProviderSettings(config: {
  botToken: string
  chatId: string
  enabled: boolean
  lastVerifiedAt?: string | null
}): Promise<void> {
  await upsertNotificationEndpoint({
    channelKey: 'telegram',
    name: 'Telegram',
    enabled: config.enabled,
    config: {
      botToken: config.botToken,
      chatId: config.chatId,
    },
    lastVerifiedAt: config.lastVerifiedAt ?? null,
  })
}

export async function getWebhookProviderSettings(): Promise<WebhookProviderSettings> {
  if (!isSupabaseConfigured()) {
    return { ...DEFAULT_WEBHOOK_PROVIDER_SETTINGS }
  }

  try {
    const endpoint = await getNotificationEndpointByChannel('webhook')
    const endpointConfig = normalizeRecord(endpoint?.config)

    return {
      url: readString(endpointConfig, 'url'),
      secret: readString(endpointConfig, 'secret'),
      format: (readString(endpointConfig, 'format') || 'generic') as WebhookProviderSettings['format'],
      mentionMode: (readString(endpointConfig, 'mentionMode') || 'none') as WebhookProviderSettings['mentionMode'],
      mentionTargets: readString(endpointConfig, 'mentionTargets'),
      enabled: endpoint?.enabled ?? DEFAULT_WEBHOOK_PROVIDER_SETTINGS.enabled,
      lastVerifiedAt: endpoint?.lastVerifiedAt ?? '',
    }
  } catch {
    return { ...DEFAULT_WEBHOOK_PROVIDER_SETTINGS }
  }
}

export async function saveWebhookProviderSettings(config: {
  url: string
  secret: string
  format: string
  mentionMode: string
  mentionTargets: string
  enabled: boolean
  lastVerifiedAt?: string | null
}): Promise<void> {
  await upsertNotificationEndpoint({
    channelKey: 'webhook',
    name: 'Webhook',
    enabled: config.enabled,
    config: {
      url: config.url,
      secret: config.secret,
      format: config.format,
      mentionMode: config.mentionMode,
      mentionTargets: config.mentionTargets,
    },
    lastVerifiedAt: config.lastVerifiedAt ?? null,
  })
}

export async function getNotificationSettingsPageData(): Promise<NotificationSettingsPageData> {
  const [rules, emailProvider, telegramProvider, webhookProvider] = await Promise.all([
    getNotificationRuleSettings(),
    getEmailProviderSettings(),
    getTelegramProviderSettings(),
    getWebhookProviderSettings(),
  ])

  return {
    rules,
    emailProvider: toEmailProviderView(emailProvider),
    telegramProvider: toTelegramProviderView(telegramProvider),
    webhookProvider: toWebhookProviderView(webhookProvider),
  }
}

export async function getNotificationNotifyTimezone(): Promise<string> {
  if (!isSupabaseConfigured()) {
    return DEFAULT_NOTIFICATION_RULE_SETTINGS.notifyTimezone
  }

  const schedulePreference = await getNotificationPreference('notification_schedule')
  const scheduleConfig = normalizeRecord(schedulePreference?.config)

  return (
    readString(scheduleConfig, 'notifyTimezone')
    || readString(normalizeRecord((await getNotificationPreference('domain_expiry_reminder'))?.config), 'notifyTimezone')
    || DEFAULT_NOTIFICATION_RULE_SETTINGS.notifyTimezone
  )
}

export async function getTelegramBotToken(): Promise<string> {
  const provider = await getTelegramProviderSettings()
  return provider.botToken
}

function toEmailProviderView(config: EmailProviderSettings): EmailProviderView {
  return {
    smtpHost: config.smtpHost,
    smtpPort: config.smtpPort,
    smtpSecure: config.smtpSecure,
    smtpUsername: config.smtpUsername,
    fromEmail: config.fromEmail,
    fromName: config.fromName,
    replyToEmail: config.replyToEmail,
    recipientsText: config.toEmails.join('\n'),
    enabled: config.enabled,
    hasPassword: config.smtpPassword.length > 0,
    lastVerifiedAt: config.lastVerifiedAt,
  }
}

function toTelegramProviderView(config: TelegramProviderSettings): TelegramProviderView {
  return {
    chatId: config.chatId,
    enabled: config.enabled,
    hasToken: config.botToken.length > 0,
    lastVerifiedAt: config.lastVerifiedAt,
  }
}

function toWebhookProviderView(config: WebhookProviderSettings): WebhookProviderView {
  return {
    url: config.url,
    hasSecret: config.secret.length > 0,
    format: config.format,
    mentionMode: config.mentionMode,
    mentionTargets: config.mentionTargets,
    enabled: config.enabled,
    lastVerifiedAt: config.lastVerifiedAt,
  }
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return typeof value === 'string' ? value.trim() : ''
}

function readNumber(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readPort(record: Record<string, unknown>, key: string, fallback: number) {
  const value = readNumber(record, key)
  return value != null && Number.isInteger(value) && value >= 1 && value <= 65535 ? value : fallback
}

function readResourceChangePreferences(config: unknown): ResourceChangeNotificationToggles {
  const record = normalizeRecord(config)
  const fallback = DEFAULT_NOTIFICATION_PREFERENCES.resourceChange

  return {
    domainEnabled: readBoolean(record, 'domainEnabled', fallback.domainEnabled),
    domainCreate: readBoolean(record, 'domainCreate', fallback.domainCreate),
    domainUpdate: readBoolean(record, 'domainUpdate', fallback.domainUpdate),
    domainDelete: readBoolean(record, 'domainDelete', fallback.domainDelete),
    siteEnabled: readBoolean(record, 'siteEnabled', fallback.siteEnabled),
    siteCreate: readBoolean(record, 'siteCreate', fallback.siteCreate),
    siteUpdate: readBoolean(record, 'siteUpdate', fallback.siteUpdate),
    siteDelete: readBoolean(record, 'siteDelete', fallback.siteDelete),
    accountEnabled: readBoolean(record, 'accountEnabled', fallback.accountEnabled),
    accountCreate: readBoolean(record, 'accountCreate', fallback.accountCreate),
    accountUpdate: readBoolean(record, 'accountUpdate', fallback.accountUpdate),
    accountDelete: readBoolean(record, 'accountDelete', fallback.accountDelete),
  }
}

function buildResourceChangePreferenceConfig(preferences: ResourceChangeNotificationToggles) {
  return {
    domainEnabled: preferences.domainEnabled,
    domainCreate: preferences.domainCreate,
    domainUpdate: preferences.domainUpdate,
    domainDelete: preferences.domainDelete,
    siteEnabled: preferences.siteEnabled,
    siteCreate: preferences.siteCreate,
    siteUpdate: preferences.siteUpdate,
    siteDelete: preferences.siteDelete,
    accountEnabled: preferences.accountEnabled,
    accountCreate: preferences.accountCreate,
    accountUpdate: preferences.accountUpdate,
    accountDelete: preferences.accountDelete,
  }
}

function hasEnabledResourceChange(preferences: ResourceChangeNotificationToggles) {
  return preferences.domainEnabled || preferences.siteEnabled || preferences.accountEnabled
}

function readBoolean(record: Record<string, unknown>, key: string, fallback = false) {
  const value = record[key]
  return typeof value === 'boolean' ? value : fallback
}
