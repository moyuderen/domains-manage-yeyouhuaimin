import 'server-only'

import nodemailer from 'nodemailer'

import { readConfigString, readConfigStringArray, readNotificationContent } from '@/lib/notifications/message'
import type { NotificationContent, NotificationDelivery, NotificationEndpoint } from '@/types/notification'

export type EmailDeliveryConfig = {
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUsername: string
  smtpPassword: string
  fromEmail: string
  fromName: string
  replyToEmail: string
  toEmails: string[]
}

const transporterCache = new Map<string, nodemailer.Transporter>()

function escapeEmailHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderEmailSubject(content: NotificationContent) {
  return `${content.title} ${content.summary}`.trim()
}

function renderEmailText(content: NotificationContent) {
  const lines = [content.title, '', content.summary]

  for (const block of content.blocks) {
    lines.push('')

    if (block.type === 'text') {
      lines.push(`${block.label}：${block.value}`)
      continue
    }

    lines.push(`${block.label}：`)
    for (const item of block.items) {
      lines.push(`- ${item}`)
    }
  }

  return lines.join('\n')
}

function renderEmailHtml(content: NotificationContent) {
  const sections = [
    `<h1>${escapeEmailHtml(content.title)}</h1>`,
    `<p>${escapeEmailHtml(content.summary)}</p>`,
  ]

  for (const block of content.blocks) {
    if (block.type === 'text') {
      sections.push(
        `<p><strong>${escapeEmailHtml(block.label)}：</strong>${escapeEmailHtml(block.value)}</p>`,
      )
      continue
    }

    const items = block.items
      .map((item) => `<li>${escapeEmailHtml(item)}</li>`)
      .join('')

    sections.push(`<section><p><strong>${escapeEmailHtml(block.label)}</strong></p><ul>${items}</ul></section>`)
  }

  return `<!doctype html><html><body>${sections.join('')}</body></html>`
}

function createTransporter(config: EmailDeliveryConfig) {
  const cacheKey = JSON.stringify({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    user: config.smtpUsername,
    pass: config.smtpPassword,
  })

  const cached = transporterCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUsername,
      pass: config.smtpPassword,
    },
  })

  transporterCache.set(cacheKey, transporter)
  return transporter
}

function normalizeEmailError(error: unknown) {
  if (!(error instanceof Error)) {
    return '邮件发送失败，请稍后重试'
  }

  const message = error.message.toLowerCase()
  const code = typeof (error as Error & { code?: unknown }).code === 'string'
    ? ((error as Error & { code?: string }).code ?? '').toUpperCase()
    : ''
  const responseCode = typeof (error as Error & { responseCode?: unknown }).responseCode === 'number'
    ? (error as Error & { responseCode?: number }).responseCode
    : undefined

  if (code === 'EAUTH' || responseCode === 535 || responseCode === 534) {
    return 'SMTP 认证失败，请检查用户名、密码或授权码'
  }

  if (code === 'ESOCKET' || code === 'ECONNECTION' || code === 'ENOTFOUND' || code === 'EHOSTUNREACH') {
    return 'SMTP 连接失败，请检查服务器地址和端口'
  }

  if (code === 'ETIMEDOUT' || code === 'ECONNRESET') {
    return 'SMTP 连接超时，请稍后重试'
  }

  if (message.includes('certificate') || message.includes('tls') || message.includes('ssl')) {
    return 'SMTP TLS 连接失败，请检查安全连接配置'
  }

  if (message.includes('invalid recipient') || responseCode === 550 || responseCode === 553) {
    return '收件人邮箱地址无效，请检查收件人配置'
  }

  if (responseCode != null && responseCode >= 500) {
    return 'SMTP 服务器拒绝发送邮件，请检查发件人与收件人配置'
  }

  if (responseCode != null && responseCode >= 400) {
    return 'SMTP 服务暂时不可用，请稍后重试'
  }

  if (message.includes('envelope') || message.includes('message')) {
    return '邮件内容构建失败，请检查邮件配置'
  }

  return '邮件发送失败，请检查 SMTP 配置后重试'
}

function readEmailDeliveryConfig(config: Record<string, unknown>): EmailDeliveryConfig | null {
  const smtpHost = readConfigString(config, 'smtpHost')
  const smtpUsername = readConfigString(config, 'smtpUsername')
  const smtpPassword = readConfigString(config, 'smtpPassword')
  const fromEmail = readConfigString(config, 'fromEmail')
  const fromName = readConfigString(config, 'fromName')
  const replyToEmail = readConfigString(config, 'replyToEmail')
  const toEmails = readConfigStringArray(config, 'toEmails')
  const smtpPort = typeof config.smtpPort === 'number' ? config.smtpPort : Number.NaN
  const smtpSecure = typeof config.smtpSecure === 'boolean' ? config.smtpSecure : false

  if (!smtpHost || !Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    return null
  }

  if (!smtpUsername || !smtpPassword) {
    return null
  }

  if (!fromEmail || !fromName || toEmails.length === 0) {
    return null
  }

  return {
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUsername,
    smtpPassword,
    fromEmail,
    fromName,
    replyToEmail,
    toEmails,
  }
}

async function deliverEmail(content: NotificationContent, config: EmailDeliveryConfig) {
  const transporter = createTransporter(config)

  try {
    const result = await transporter.sendMail({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: config.toEmails.join(', '),
      replyTo: config.replyToEmail || undefined,
      subject: renderEmailSubject(content),
      text: renderEmailText(content),
      html: renderEmailHtml(content),
    })

    return { success: true as const, providerMessageId: result.messageId }
  } catch (error) {
    return { success: false as const, errorMessage: normalizeEmailError(error) }
  }
}

export async function sendTestEmail(input: {
  content: NotificationContent
  config: EmailDeliveryConfig
}): Promise<{ success: true; providerMessageId?: string } | { success: false; errorMessage: string }> {
  return deliverEmail(input.content, input.config)
}

export async function sendEmailDelivery(input: {
  delivery: NotificationDelivery
  endpoint: NotificationEndpoint
}): Promise<{ success: true; providerMessageId?: string } | { success: false; errorMessage: string }> {
  const content = readNotificationContent(input.delivery.payload)
  if (!content) {
    return { success: false, errorMessage: '通知消息内容为空' }
  }

  const parsedConfig = readEmailDeliveryConfig(input.endpoint.config)
  if (!parsedConfig) {
    return { success: false, errorMessage: 'Email 渠道配置不完整，请检查 SMTP、发件人与收件人设置' }
  }

  return deliverEmail(content, parsedConfig)
}
