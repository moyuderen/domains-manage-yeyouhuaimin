import 'server-only'

import crypto from 'node:crypto'

import { readConfigString, readNotificationContent } from '@/lib/notifications/message'
import type { NotificationDelivery, NotificationEndpoint } from '@/types/notification'

import type { WebhookFormat, WebhookMentionMode } from '@/schemas/webhookSchemas'
import type { NotificationContent } from '../../types/notification'

const LEVEL_EMOJI: Record<string, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  critical: '🚨',
}

function renderGenericPayload(content: NotificationContent, delivery: NotificationDelivery) {
  return {
    id: delivery.id,
    type: delivery.typeKey,
    level: delivery.level,
    templateKey: content.templateKey,
    title: content.title,
    summary: content.summary,
    blocks: content.blocks,
    meta: content.meta,
    context: delivery.payload.context,
    timestamp: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Discord embeds
// ---------------------------------------------------------------------------

const DISCORD_COLORS: Record<string, number> = {
  info: 0x3498db,
  warning: 0xf1c40f,
  critical: 0xe74c3c,
}

function renderDiscordPayload(content: NotificationContent, delivery: NotificationDelivery, mention: string) {
  const fields = content.blocks.flatMap((block) => {
    if (block.type === 'text') {
      return [{ name: block.label, value: `\`${block.value}\``, inline: true }]
    }
    return [{ name: block.label, value: block.items.map((item) => `• ${item}`).join('\n'), inline: false }]
  })

  const payload: Record<string, unknown> = {
    embeds: [
      {
        title: `${LEVEL_EMOJI[delivery.level] ?? ''} ${content.title}`.trim(),
        description: content.summary,
        color: DISCORD_COLORS[delivery.level] ?? DISCORD_COLORS.info,
        fields,
        timestamp: new Date().toISOString(),
      },
    ],
  }

  if (mention) {
    payload.content = mention
  }

  return payload
}

// ---------------------------------------------------------------------------
// Feishu (Lark) Card message
// ---------------------------------------------------------------------------

function renderFeishuPayload(content: NotificationContent, delivery: NotificationDelivery, mention: string) {
  const elements: Record<string, unknown>[] = []

  if (mention) {
    elements.push({
      tag: 'div',
      text: { tag: 'lark_md', content: mention },
    })
  }

  elements.push(
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: content.summary,
      },
    },
    { tag: 'hr' },
  )

  for (const block of content.blocks) {
    if (block.type === 'text') {
      elements.push({
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `**${block.label}**：${block.value}`,
        },
      })
    } else {
      const itemsMd = block.items.map((item) => `- ${item}`).join('\n')
      elements.push({
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `**${block.label}**：\n${itemsMd}`,
        },
      })
    }
  }

  return {
    msg_type: 'interactive',
    card: {
      header: {
        title: {
          tag: 'plain_text',
          content: `${LEVEL_EMOJI[delivery.level] ?? ''} ${content.title}`.trim(),
        },
        template: delivery.level === 'critical' ? 'red' : delivery.level === 'warning' ? 'orange' : 'blue',
      },
      elements,
    },
  }
}

// ---------------------------------------------------------------------------
// Dingtalk Markdown message
// ---------------------------------------------------------------------------

function renderDingtalkPayload(content: NotificationContent, delivery: NotificationDelivery, mention: string) {
  const lines: string[] = [
    `### ${LEVEL_EMOJI[delivery.level] ?? ''} ${content.title}`,
    '',
    `> ${content.summary}`,
    '',
    '---',
    '',
  ]

  for (const block of content.blocks) {
    if (block.type === 'text') {
      lines.push(`**${block.label}**：${block.value}`)
    } else {
      lines.push(`**${block.label}**：`)
      for (const item of block.items) {
        lines.push(`- ${item}`)
      }
      lines.push('')
    }
  }

  if (mention) {
    lines.push('', mention)
  }

  return {
    msgtype: 'markdown',
    markdown: {
      title: content.title,
      text: lines.join('\n'),
    },
  }
}

// ---------------------------------------------------------------------------
// Render dispatcher
// ---------------------------------------------------------------------------

const MENTION_ALL_TEXT: Record<WebhookFormat, string> = {
  discord: '@everyone',
  feishu: '<at user_id="all">所有人</at>',
  dingtalk: '@all',
  generic: '',
}

const MENTION_CUSTOM_WRAP: Record<Exclude<WebhookFormat, 'generic'>, (id: string) => string> = {
  discord: (id) => `<@${id}>`,
  feishu: (id) => `<at user_id="${id}"></at>`,
  dingtalk: (phone) => `@${phone}`,
}

function buildMentionText(mode: WebhookMentionMode, targets: string, format: WebhookFormat): string {
  if (mode === 'all') return MENTION_ALL_TEXT[format]

  if (mode === 'custom' && targets && format !== 'generic') {
    const items = targets.split(',').map((s) => s.trim()).filter(Boolean)
    if (items.length === 0) return ''
    const wrap = MENTION_CUSTOM_WRAP[format]
    return items.map(wrap).join(' ')
  }

  return ''
}

function renderWebhookPayload(content: NotificationContent, delivery: NotificationDelivery, format: WebhookFormat, mention: string) {
  switch (format) {
    case 'discord':
      return renderDiscordPayload(content, delivery, mention)
    case 'feishu':
      return renderFeishuPayload(content, delivery, mention)
    case 'dingtalk':
      return renderDingtalkPayload(content, delivery, mention)
    default:
      return renderGenericPayload(content, delivery)
  }
}

// ---------------------------------------------------------------------------
// Signing
// ---------------------------------------------------------------------------

function signGeneric(secret: string, body: string): Record<string, string> {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(body)
  return { 'X-Webhook-Signature': hmac.digest('hex') }
}

function signFeishuOrDingtalk(secret: string, url: string): string {
  const timestamp = String(Date.now())
  const stringToSign = `${timestamp}\n${secret}`
  const hmac = crypto.createHmac('sha256', stringToSign)
  hmac.update('')
  const sign = encodeURIComponent(hmac.digest('base64'))
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}timestamp=${timestamp}&sign=${sign}`
}

// ---------------------------------------------------------------------------
// Sender
// ---------------------------------------------------------------------------

export async function sendWebhookDelivery(input: {
  delivery: NotificationDelivery
  endpoint: NotificationEndpoint
}): Promise<{ success: true; providerMessageId?: string } | { success: false; errorMessage: string }> {
  const config = input.endpoint.config
  const url = readConfigString(config, 'url')
  const secret = readConfigString(config, 'secret')
  const format = (readConfigString(config, 'format') || 'generic') as WebhookFormat
  const mentionMode = (readConfigString(config, 'mentionMode') || 'none') as WebhookMentionMode
  const mentionTargets = readConfigString(config, 'mentionTargets')

  if (!url) {
    return { success: false, errorMessage: 'Webhook 渠道未配置 URL' }
  }

  const content = readNotificationContent(input.delivery.payload)
  if (!content) {
    return { success: false, errorMessage: '通知消息内容为空' }
  }

  const mention = buildMentionText(mentionMode, mentionTargets, format)
  const payload = renderWebhookPayload(content, input.delivery, format, mention)
  const body = JSON.stringify(payload)

  let finalUrl = url
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (secret) {
    if (format === 'generic') {
      Object.assign(headers, signGeneric(secret, body))
    } else if (format === 'feishu' || format === 'dingtalk') {
      finalUrl = signFeishuOrDingtalk(secret, url)
    }
  }

  try {
    const res = await fetch(finalUrl, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { success: false, errorMessage: `HTTP ${res.status}: ${text.slice(0, 200)}` }
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook 发送失败'
    return { success: false, errorMessage: message }
  }
}

// ---------------------------------------------------------------------------
// Public helpers (used by test action)
// ---------------------------------------------------------------------------

export function renderTestPayload(content: NotificationContent, format: WebhookFormat, mentionMode: WebhookMentionMode, mentionTargets: string) {
  const mockDelivery = {
    id: 'test',
    typeKey: 'auth_activity' as const,
    channelKey: 'webhook' as const,
    endpointId: '',
    status: 'pending' as const,
    level: 'info' as const,
    payload: { content },
    dedupeKey: '',
    providerMessageId: '',
    errorMessage: '',
    sentAt: '',
    activityLogId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const mention = buildMentionText(mentionMode, mentionTargets, format)
  return renderWebhookPayload(content, mockDelivery, format, mention)
}
