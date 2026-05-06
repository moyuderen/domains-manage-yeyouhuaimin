import { z } from 'zod'

export const resourceChangeConfigSchema = z.object({
  domainEnabled: z.boolean(),
  domainCreate: z.boolean(),
  domainUpdate: z.boolean(),
  domainDelete: z.boolean(),
  siteEnabled: z.boolean(),
  siteCreate: z.boolean(),
  siteUpdate: z.boolean(),
  siteDelete: z.boolean(),
  accountEnabled: z.boolean(),
  accountCreate: z.boolean(),
  accountUpdate: z.boolean(),
  accountDelete: z.boolean(),
})

export const notificationPreferenceTogglesSchema = z.object({
  domainExpiryReminder: z.boolean(),
  authActivity: z.boolean(),
  settingsChange: z.boolean(),
  resourceChange: resourceChangeConfigSchema,
})

export const notificationRuleSettingsSchema = z.object({
  expiryDays: z.number().int().min(1, '到期提醒天数必须在 1 到 365 之间').max(365, '到期提醒天数必须在 1 到 365 之间'),
  notifyHour: z.number().int().min(0, '每日推送时间必须在 0 到 23 点之间').max(23, '每日推送时间必须在 0 到 23 点之间'),
  notifyTimezone: z.string().trim().min(1, '请选择推送时区'),
  preferences: notificationPreferenceTogglesSchema,
})

export type NotificationRuleSettingsValues = z.infer<typeof notificationRuleSettingsSchema>
