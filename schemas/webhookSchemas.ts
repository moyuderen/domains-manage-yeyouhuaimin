import { z } from 'zod'

export const WEBHOOK_FORMATS = ['generic', 'discord', 'feishu', 'dingtalk'] as const
export type WebhookFormat = (typeof WEBHOOK_FORMATS)[number]

export const WEBHOOK_MENTION_MODES = ['none', 'all', 'custom'] as const
export type WebhookMentionMode = (typeof WEBHOOK_MENTION_MODES)[number]

export const webhookConfigSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, '请输入 Webhook URL')
    .refine((val) => { try { new URL(val); return true } catch { return false } }, 'URL 格式不正确')
    .refine((url) => url.startsWith('https://'), 'Webhook URL 必须使用 HTTPS'),
  secret: z.string().trim().optional(),
  format: z.enum(WEBHOOK_FORMATS),
  mentionMode: z.enum(WEBHOOK_MENTION_MODES),
  mentionTargets: z.string().trim().optional(),
  enabled: z.boolean(),
})

export type WebhookConfigValues = z.infer<typeof webhookConfigSchema>

export const defaultWebhookConfig: Omit<WebhookConfigValues, 'url'> = {
  secret: '',
  format: 'generic',
  mentionMode: 'none',
  mentionTargets: '',
  enabled: false,
}
