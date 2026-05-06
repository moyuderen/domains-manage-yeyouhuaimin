'use server'

import { revalidatePath } from 'next/cache'

import { requireAccess } from '@/lib/auth/access-server'
import {
  getNotificationNotifyTimezone,
  getProjectTitles,
  getTelegramBotToken,
  getTelegramProviderSettings,
  saveNotificationRuleSettings,
  saveTelegramProviderSettings,
} from '@/lib/data/settings'
import { renderTelegramMessage } from '@/lib/notifications/renderers'
import { testNotificationTemplate } from '@/lib/notifications/templates'
import type { NotificationPreferenceToggles } from '@/lib/notifications/settings'
import { getTelegramChatId, sendTelegramMessage } from '@/lib/telegram'
import { notificationRuleSettingsSchema } from '@/schemas/notificationSchemas'
import { telegramConfigSchema } from '@/schemas/telegramSchemas'

export async function saveNotificationRulesAction(values: {
  expiryDays: number
  notifyHour: number
  notifyTimezone: string
  preferences: NotificationPreferenceToggles
}) {
  await requireAccess()

  const parsed = notificationRuleSettingsSchema.safeParse(values)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(', '))
  }

  await saveNotificationRuleSettings(parsed.data)
  revalidatePath('/settings')
}

export async function saveTelegramProviderAction(values: {
  botToken: string
  chatId: string
  enabled: boolean
}) {
  await requireAccess()

  let botToken = values.botToken.trim()
  if (!botToken) {
    botToken = await getTelegramBotToken()
  }

  if (botToken) {
    const parsed = telegramConfigSchema.safeParse({
      botToken,
      chatId: values.chatId,
      enabled: values.enabled,
    })
    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((issue) => issue.message).join(', '))
    }
  }

  await saveTelegramProviderSettings({
    botToken,
    chatId: values.chatId.trim(),
    enabled: values.enabled,
  })

  revalidatePath('/settings')
}

export async function sendTestMessageAction() {
  await requireAccess()

  const [notifyTimezone, projectTitles, provider] = await Promise.all([
    getNotificationNotifyTimezone(),
    getProjectTitles(),
    getTelegramProviderSettings(),
  ])

  if (!provider.botToken || !provider.chatId) {
    throw new Error('请先配置 Bot Token 和 Chat ID')
  }

  const content = testNotificationTemplate.buildContent(undefined, {
    projectName: projectTitles.title,
    timeZone: notifyTimezone,
  })
  const message = renderTelegramMessage(content)
  const result = await sendTelegramMessage(provider.botToken, provider.chatId, message)

  if (!result.success) {
    throw new Error(result.error ?? '发送失败')
  }

  await saveTelegramProviderSettings({
    botToken: provider.botToken,
    chatId: provider.chatId,
    enabled: provider.enabled,
    lastVerifiedAt: new Date().toISOString(),
  })

  revalidatePath('/settings')
}

export async function getChatIdAction(botToken: string) {
  await requireAccess()

  let token = botToken.trim()

  if (!token) {
    const provider = await getTelegramProviderSettings()
    token = provider.botToken
  }

  if (!token) {
    throw new Error('请输入 Bot Token')
  }

  const result = await getTelegramChatId(token)

  if (result.error) {
    throw new Error(result.error)
  }

  if (!result.chatId) {
    throw new Error('无法获取 Chat ID，请先向 Bot 发送任意消息')
  }

  return { chatId: result.chatId }
}
