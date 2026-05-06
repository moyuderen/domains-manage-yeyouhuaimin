import { z } from 'zod'

import { DEFAULT_EMAIL_PROVIDER_SETTINGS } from '@/lib/notifications/settings'

const emailFieldSchema = z.string().trim().refine((value) => z.email().safeParse(value).success, '邮箱格式不正确')

export const emailConfigSchema = z.object({
  smtpHost: z.string().trim().min(1, '请输入 SMTP Host'),
  smtpPort: z
    .number()
    .int('SMTP 端口必须为整数')
    .min(1, 'SMTP 端口必须在 1 到 65535 之间')
    .max(65535, 'SMTP 端口必须在 1 到 65535 之间'),
  smtpSecure: z.boolean(),
  smtpUsername: z.string().trim().min(1, '请输入 SMTP 用户名'),
  smtpPassword: z.string().trim().min(1, '请输入 SMTP 密码或授权码'),
  fromEmail: emailFieldSchema,
  fromName: z.string().trim().min(1, '请输入发件人名称'),
  replyToEmail: emailFieldSchema.optional(),
  toEmails: z.array(emailFieldSchema).min(1, '请至少填写一个收件人邮箱'),
  enabled: z.boolean(),
})

export type EmailConfigValues = z.infer<typeof emailConfigSchema>

export const defaultEmailConfig: EmailConfigValues = {
  smtpHost: DEFAULT_EMAIL_PROVIDER_SETTINGS.smtpHost,
  smtpPort: DEFAULT_EMAIL_PROVIDER_SETTINGS.smtpPort,
  smtpSecure: DEFAULT_EMAIL_PROVIDER_SETTINGS.smtpSecure,
  smtpUsername: DEFAULT_EMAIL_PROVIDER_SETTINGS.smtpUsername,
  smtpPassword: DEFAULT_EMAIL_PROVIDER_SETTINGS.smtpPassword,
  fromEmail: DEFAULT_EMAIL_PROVIDER_SETTINGS.fromEmail,
  fromName: DEFAULT_EMAIL_PROVIDER_SETTINGS.fromName,
  replyToEmail: undefined,
  toEmails: DEFAULT_EMAIL_PROVIDER_SETTINGS.toEmails,
  enabled: DEFAULT_EMAIL_PROVIDER_SETTINGS.enabled,
}
