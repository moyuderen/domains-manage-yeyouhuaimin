import { z } from 'zod'

export const telegramConfigSchema = z.object({
  botToken: z
    .string()
    .trim()
    .min(1, '请输入 Bot Token')
    .regex(/^\d+:[A-Za-z0-9_-]{35}$/, 'Bot Token 格式不正确'),
  chatId: z
    .string()
    .trim()
    .min(1, '请输入 Chat ID'),
  enabled: z.boolean(),
})

export type TelegramConfigValues = z.infer<typeof telegramConfigSchema>

export const defaultTelegramConfig: TelegramConfigValues = {
  botToken: '',
  chatId: '',
  enabled: false,
}
