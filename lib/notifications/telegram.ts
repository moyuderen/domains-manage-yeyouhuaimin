import 'server-only'

import { readConfigString, readNotificationContent } from '@/lib/notifications/message'
import { renderTelegramMessage } from '@/lib/notifications/renderers'
import { sendTelegramMessage } from '@/lib/telegram'
import type { NotificationDelivery, NotificationEndpoint } from '@/types/notification'

export async function sendTelegramDelivery(input: {
  delivery: NotificationDelivery
  endpoint: NotificationEndpoint
}): Promise<{ success: true; providerMessageId?: string } | { success: false; errorMessage: string }> {
  const botToken = readConfigString(input.endpoint.config, 'botToken')
  const chatId = readConfigString(input.endpoint.config, 'chatId')

  if (!botToken || !chatId) {
    return { success: false, errorMessage: 'Telegram 渠道未配置 Bot Token 或 Chat ID' }
  }

  const content = readNotificationContent(input.delivery.payload)
  if (!content) {
    return { success: false, errorMessage: '通知消息内容为空' }
  }

  const message = renderTelegramMessage(content)
  const result = await sendTelegramMessage(botToken, chatId, message)

  if (!result.success) {
    return { success: false, errorMessage: result.error ?? 'Telegram 发送失败' }
  }

  return { success: true }
}
