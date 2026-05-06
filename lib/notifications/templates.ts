import { buildChangeSummary } from '@/lib/activity-log-detail'
import { formatDateTimeInTimeZone, formatDateInTimeZone, formatTimeZoneOffset } from '@/lib/date'
import { getEventSourceInfo } from '@/lib/events/helpers'
import type { ResolvedEventInput } from '@/lib/events/types'
import { formatExpiryCountdown } from '@/lib/domainStatus'
import type { NotificationContent } from '@/types/notification'

// ---------------------------------------------------------------------------
// Domain expiry data types
// ---------------------------------------------------------------------------

export interface DomainExpiryInfo {
  name: string
  expiryDate: string | null
  daysRemaining: number | null
  registrar: string
}

// ---------------------------------------------------------------------------
// Template options
// ---------------------------------------------------------------------------

export interface TemplateOptions {
  projectName?: string
  timeZone: string
}

// ---------------------------------------------------------------------------
// Template type
// ---------------------------------------------------------------------------

export interface NotificationTemplate<T = unknown> {
  key: string
  buildContent: (data: T, options: TemplateOptions) => NotificationContent
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOTIFICATION_EXCLUDED_CHANGE_FIELDS = ['remark', 'description', 'emailProviderDetail', 'email']

function formatDomainExpiryText(domain: DomainExpiryInfo): string {
  if (domain.daysRemaining == null) {
    return `${domain.name} — ${domain.registrar}`
  }

  const expiryDisplay = domain.expiryDate?.replace(/-/g, '/') ?? ''
  const countdown = formatExpiryCountdown(domain.daysRemaining, 'd')

  if (domain.daysRemaining < 0) {
    return `🔴 ${domain.name} — ${countdown} ${expiryDisplay} — ${domain.registrar}`
  }
  if (domain.daysRemaining <= 7) {
    return `🟠 ${domain.name} — ${countdown} ${expiryDisplay} — ${domain.registrar}`
  }
  return `🟡 ${domain.name} — ${countdown} ${expiryDisplay} — ${domain.registrar}`
}

function formatOccurredAt(value: string, timeZone: string) {
  const formatted = formatDateTimeInTimeZone(value, timeZone)
  const fallback = value.replace('T', ' ').slice(0, 16)
  const offsetLabel = formatTimeZoneOffset(value, timeZone)
  return `${formatted || fallback}（${offsetLabel}）`
}

function buildMessageTitle(event: ResolvedEventInput) {
  if (event.severity === 'critical') return '🚨 重要提醒'
  if (event.severity === 'warning') return '⚠️ 高风险变更'
  return '📢 通知'
}

function readReason(detail: Record<string, unknown>) {
  const candidates = ['reason', 'message', 'error']
  for (const key of candidates) {
    const value = detail[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

function shouldShowSourceInfo(event: ResolvedEventInput) {
  return Boolean(event.requestContext || event.ip)
}

// ---------------------------------------------------------------------------
// Test notification mock data
// ---------------------------------------------------------------------------

const TEST_MOCK_EXPIRED: DomainExpiryInfo[] = [
  { name: 'expired-example.com', expiryDate: '2026/03/15', daysRemaining: -39, registrar: 'Cloudflare' },
]

const TEST_MOCK_EXPIRING: DomainExpiryInfo[] = [
  { name: 'expiring-example.cn', expiryDate: '2026/04/28', daysRemaining: 5, registrar: 'Alibaba Cloud' },
  { name: 'another-site.dev', expiryDate: '2026/05/10', daysRemaining: 17, registrar: 'Namecheap' },
]

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export const eventNotificationTemplate: NotificationTemplate<ResolvedEventInput> = {
  key: 'event_notification',
  buildContent(event, options) {
    const prefix = options.projectName ? `${options.projectName} · ` : ''
    const changes = buildChangeSummary(event.detail, {
      excludeFields: NOTIFICATION_EXCLUDED_CHANGE_FIELDS,
    })
    const blocks: NotificationContent['blocks'] = []

    if (event.resourceName) {
      blocks.push({ type: 'text', label: '🏷️ 对象', value: event.resourceName })
    }

    blocks.push({ type: 'text', label: '🕐 时间', value: formatOccurredAt(event.occurredAt, options.timeZone) })

    const reason = readReason(event.detail)
    if (reason) {
      blocks.push({ type: 'text', label: '💡 原因', value: reason })
    }

    if (changes.length > 0) {
      blocks.push({ type: 'list', label: '📋 变更内容', items: changes })
    }

    if (shouldShowSourceInfo(event)) {
      const source = getEventSourceInfo(event)

      if (source.ip) {
        blocks.push({ type: 'text', label: '🌐 IP', value: source.ip })
      }

      if (source.os) {
        blocks.push({ type: 'text', label: '💻 操作系统', value: source.os })
      }

      if (source.browser) {
        blocks.push({ type: 'text', label: '🧭 浏览器', value: source.browser })
      }
    }

    return {
      templateKey: 'event_notification',
      title: `${prefix}[${buildMessageTitle(event)}]`,
      summary: event.summary,
      blocks,
      meta: {
        eventKey: event.eventKey,
        severity: event.severity,
        resourceType: event.resourceType,
        resourceId: event.resourceId ?? '',
        resourceName: event.resourceName ?? '',
        occurredAt: event.occurredAt,
      },
    }
  },
}

export const domainExpiryReportTemplate: NotificationTemplate<{
  expiredDomains: DomainExpiryInfo[]
  expiringDomains: DomainExpiryInfo[]
}> = {
  key: 'domain_expiry_report',
  buildContent({ expiredDomains, expiringDomains }, options) {
    const prefix = options.projectName ? `${options.projectName} · ` : ''
    const now = new Date()
    const timeZoneLabel = formatTimeZoneOffset(now, options.timeZone)
    const expiredCount = expiredDomains.length
    const expiringCount = expiringDomains.length

    const blocks: NotificationContent['blocks'] = [
      { type: 'text', label: '📅 检查时间', value: `${formatDateInTimeZone(now, options.timeZone)}（${timeZoneLabel}）` },
    ]

    if (expiredCount > 0) {
      blocks.push({ type: 'list', label: '❌ 已过期', items: expiredDomains.map(formatDomainExpiryText) })
    }

    if (expiringCount > 0) {
      blocks.push({ type: 'list', label: '⏰ 即将到期', items: expiringDomains.map(formatDomainExpiryText) })
    }

    const summaryParts: string[] = []
    if (expiredCount > 0) summaryParts.push(`❌ ${expiredCount} 个已过期`)
    if (expiringCount > 0) summaryParts.push(`⏰ ${expiringCount} 个即将到期`)
    if (summaryParts.length === 0) summaryParts.push('暂无到期域名')

    return {
      templateKey: 'domain_expiry_report',
      title: `${prefix}📅 域名到期日报`,
      summary: summaryParts.join('，'),
      blocks,
      meta: {
        expiredCount: String(expiredCount),
        expiringCount: String(expiringCount),
      },
    }
  },
}

export const testNotificationTemplate: NotificationTemplate<void> = {
  key: 'test_notification',
  buildContent(_, options) {
    const prefix = options.projectName ? `${options.projectName} · ` : ''
    const now = new Date()
    const timeZoneLabel = formatTimeZoneOffset(now, options.timeZone)

    const blocks: NotificationContent['blocks'] = [
      { type: 'text', label: '🕐 时间', value: `${formatDateInTimeZone(now, options.timeZone)}（${timeZoneLabel}）` },
      { type: 'list', label: '❌ 已过期（模拟）', items: TEST_MOCK_EXPIRED.map(formatDomainExpiryText) },
      { type: 'list', label: '⏰ 即将到期（模拟）', items: TEST_MOCK_EXPIRING.map(formatDomainExpiryText) },
    ]

    return {
      templateKey: 'test_notification',
      title: `${prefix}🧪 测试通知`,
      summary: '👇 以下为模拟数据预览',
      blocks,
      meta: {},
    }
  },
}
