export interface ResourceChangeNotificationToggles {
  domainEnabled: boolean
  domainCreate: boolean
  domainUpdate: boolean
  domainDelete: boolean
  siteEnabled: boolean
  siteCreate: boolean
  siteUpdate: boolean
  siteDelete: boolean
  accountEnabled: boolean
  accountCreate: boolean
  accountUpdate: boolean
  accountDelete: boolean
}

export interface NotificationPreferenceToggles {
  domainExpiryReminder: boolean
  authActivity: boolean
  settingsChange: boolean
  resourceChange: ResourceChangeNotificationToggles
}

export interface NotificationRuleSettings {
  expiryDays: number
  notifyHour: number
  notifyTimezone: string
  preferences: NotificationPreferenceToggles
}

export interface EmailProviderSettings {
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
  lastVerifiedAt: string
}

export interface EmailProviderView {
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUsername: string
  fromEmail: string
  fromName: string
  replyToEmail: string
  recipientsText: string
  enabled: boolean
  hasPassword: boolean
  lastVerifiedAt: string
}

export interface TelegramProviderSettings {
  botToken: string
  chatId: string
  enabled: boolean
  lastVerifiedAt: string
}

export interface TelegramProviderView {
  chatId: string
  enabled: boolean
  hasToken: boolean
  lastVerifiedAt: string
}

import type { WebhookFormat, WebhookMentionMode } from '@/schemas/webhookSchemas'

export type { WebhookFormat, WebhookMentionMode }

export interface WebhookProviderSettings {
  url: string
  secret: string
  format: WebhookFormat
  mentionMode: WebhookMentionMode
  mentionTargets: string
  enabled: boolean
  lastVerifiedAt: string
}

export interface WebhookProviderView {
  url: string
  hasSecret: boolean
  format: WebhookFormat
  mentionMode: WebhookMentionMode
  mentionTargets: string
  enabled: boolean
  lastVerifiedAt: string
}

export interface NotificationSettingsPageData {
  rules: NotificationRuleSettings
  emailProvider: EmailProviderView
  telegramProvider: TelegramProviderView
  webhookProvider: WebhookProviderView
}

export const DEFAULT_EMAIL_PROVIDER_SETTINGS: EmailProviderSettings = {
  smtpHost: '',
  smtpPort: 465,
  smtpSecure: true,
  smtpUsername: '',
  smtpPassword: '',
  fromEmail: '',
  fromName: '',
  replyToEmail: '',
  toEmails: [],
  enabled: false,
  lastVerifiedAt: '',
}

export const COMMON_NOTIFICATION_TIMEZONES = [
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+9)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (UTC+8)' },
  { value: 'Asia/Hong_Kong', label: 'Asia/Hong_Kong (UTC+8)' },
  { value: 'Asia/Taipei', label: 'Asia/Taipei (UTC+8)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (UTC+5:30)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (UTC+4)' },
  { value: 'Europe/London', label: 'Europe/London (UTC+0/+1)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (UTC+1/+2)' },
  { value: 'Europe/Moscow', label: 'Europe/Moscow (UTC+3)' },
  { value: 'America/New_York', label: 'America/New_York (UTC-5/-4)' },
  { value: 'America/Chicago', label: 'America/Chicago (UTC-6/-5)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (UTC-8/-7)' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (UTC+12/+13)' },
] as const

export function createDefaultResourceChangeNotificationToggles(): ResourceChangeNotificationToggles {
  return {
    domainEnabled: false,
    domainCreate: false,
    domainUpdate: false,
    domainDelete: true,
    siteEnabled: false,
    siteCreate: false,
    siteUpdate: false,
    siteDelete: true,
    accountEnabled: false,
    accountCreate: false,
    accountUpdate: false,
    accountDelete: true,
  }
}

export function createDefaultNotificationPreferenceToggles(): NotificationPreferenceToggles {
  return {
    domainExpiryReminder: true,
    authActivity: true,
    settingsChange: true,
    resourceChange: createDefaultResourceChangeNotificationToggles(),
  }
}

export function createDefaultNotificationRuleSettings(): NotificationRuleSettings {
  return {
    expiryDays: 30,
    notifyHour: 9,
    notifyTimezone: 'Asia/Shanghai',
    preferences: createDefaultNotificationPreferenceToggles(),
  }
}

export function createDefaultEmailProviderSettings(): EmailProviderSettings {
  return { ...DEFAULT_EMAIL_PROVIDER_SETTINGS }
}

export function createDefaultTelegramProviderSettings(): TelegramProviderSettings {
  return {
    botToken: '',
    chatId: '',
    enabled: false,
    lastVerifiedAt: '',
  }
}

export function createDefaultWebhookProviderSettings(): WebhookProviderSettings {
  return {
    url: '',
    secret: '',
    format: 'generic',
    mentionMode: 'none',
    mentionTargets: '',
    enabled: false,
    lastVerifiedAt: '',
  }
}
