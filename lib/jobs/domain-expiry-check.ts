import 'server-only'

import { format, subDays } from 'date-fns'

import { addDays, differenceInDays, formatDateKeyInTimeZone, getHourInTimeZone } from '@/lib/date'
import { listExpiringDomainsForNotification, type ExpiringDomainNotificationRow } from '@/lib/data/domains'
import { hasEnabledNotificationEndpoint } from '@/lib/data/notifications'
import { getNotificationRuleSettings, getProjectTitles } from '@/lib/data/settings'
import { emitEvent } from '@/lib/events'
import { processPendingNotificationDeliveries, sendTemplateNotification } from '@/lib/events/sinks/notification'
import type { JobContext, JobDefinition, JobResult } from '@/lib/jobs/types'
import { domainExpiryReportTemplate, type DomainExpiryInfo } from '@/lib/notifications/templates'

type DomainExpiryCheckData = {
  checkedAt: string
  domainsChecked: number
  eventsEmitted: number
  notificationsCreated: number
  notificationsSent: number
  notificationsFailed: number
  notificationsSkipped: number
}

type DomainExpiryCheckMode = 'hourly' | 'daily'

export const domainExpiryCheckJob: JobDefinition = {
  id: 'domain-expiry-check',
  async run(_, context) {
    return runDomainExpiryCheck('hourly', context)
  },
}

export const domainExpiryCheckDailyJob: JobDefinition = {
  id: 'domain-expiry-check-daily',
  async run(_, context) {
    return runDomainExpiryCheck('daily', context)
  },
}

async function runDomainExpiryCheck(mode: DomainExpiryCheckMode, context: JobContext): Promise<JobResult> {
  const now = new Date()
  const checkedAt = now.toISOString()

  const [rules, hasEnabledEndpoint, projectTitles] = await Promise.all([
    getNotificationRuleSettings(),
    hasEnabledNotificationEndpoint(),
    getProjectTitles(),
  ])
  const isManual = context.triggerSource === 'manual'

  if (!isManual && !rules.preferences.domainExpiryReminder) {
    return createSkippedResult('Domain expiry notifications are disabled', checkedAt)
  }

  if (!hasEnabledEndpoint) {
    return createSkippedResult('No notification channel is enabled', checkedAt)
  }

  if (mode === 'hourly' && !isManual) {
    const currentHour = getHourInTimeZone(now, rules.notifyTimezone)

    if (currentHour == null) {
      return createFailedResult('Failed to resolve notify timezone hour')
    }

    if (currentHour !== rules.notifyHour) {
      return createSkippedResult(
        `Not scheduled time (current: ${currentHour}:00, configured: ${rules.notifyHour}:00 ${rules.notifyTimezone})`,
        checkedAt,
      )
    }
  }

  const threshold = addDays(rules.expiryDays)
  const expiredCutoff = format(subDays(now, 30), 'yyyy-MM-dd')

  let rows: ExpiringDomainNotificationRow[]

  try {
    rows = await listExpiringDomainsForNotification({
      startDate: expiredCutoff,
      endDate: threshold,
    })
  } catch (error) {
    console.error('Failed to query domains:', error)
    return createFailedResult('Database query failed')
  }

  if (rows.length === 0) {
    return createSkippedResult('No expiring domains found', checkedAt)
  }

  const localDateKey = formatDateKeyInTimeZone(now, rules.notifyTimezone)
  const runKey = isManual ? context.triggeredAt : localDateKey
  const expiredDomains: DomainExpiryInfo[] = []
  const expiringDomains: DomainExpiryInfo[] = []
  const domainsWithExpiry = rows.flatMap((row) => {
    const daysRemaining = differenceInDays(row.expiry_date)
    if (daysRemaining == null) {
      return []
    }

    const registrar = row.registrar_site_id?.[0]?.name ?? '未设置'
    const domain: DomainExpiryInfo = {
      name: row.name,
      expiryDate: row.expiry_date,
      daysRemaining,
      registrar,
    }

    if (daysRemaining < 0) {
      expiredDomains.push(domain)
    } else {
      expiringDomains.push(domain)
    }

    return [{ row, daysRemaining, registrar }]
  })

  const eventResults = await Promise.all(domainsWithExpiry.map(({ row, daysRemaining, registrar }) => {
    const eventKey = daysRemaining < 0 ? 'domain.expiry.expired' : 'domain.expiry.warning'
    return emitEvent({
      eventKey,
      category: 'domain',
      action: 'update',
      resourceType: 'domain',
      resourceId: row.id,
      resourceName: row.name,
      summary: buildExpirySummary(row.name, daysRemaining),
      severity: daysRemaining < 0 ? 'critical' : 'warning',
      idempotencyKey: `${eventKey}:${row.id}:${runKey}`,
      detail: {
        expiryDate: row.expiry_date,
        daysRemaining,
        registrar,
        notifyDate: localDateKey,
        triggerSource: context.triggerSource,
      },
    })
  }))

  const eventsEmitted = eventResults.filter(Boolean).length
  const firstActivityLogId = eventResults.find((result) => result?.activityLogId)?.activityLogId

  const totals = {
    eventsEmitted,
    notificationsCreated: 0,
    notificationsSent: 0,
    notificationsFailed: 0,
    notificationsSkipped: 0,
  }

  if (firstActivityLogId && (expiredDomains.length > 0 || expiringDomains.length > 0)) {
    const content = domainExpiryReportTemplate.buildContent(
      { expiredDomains, expiringDomains },
      { projectName: projectTitles.title, timeZone: rules.notifyTimezone },
    )

    const reportResult = await sendTemplateNotification({
      typeKey: 'domain_expiry_reminder',
      content,
      level: expiredDomains.length > 0 ? 'critical' : 'warning',
      activityLogId: firstActivityLogId,
      dedupeKey: `domain.expiry.report:${runKey}`,
    })

    totals.notificationsCreated = reportResult.notificationsCreated
    totals.notificationsSent = reportResult.notificationsSent
    totals.notificationsFailed = reportResult.notificationsFailed
    totals.notificationsSkipped = reportResult.notificationsSkipped
  }

  const pendingSummary = await processPendingNotificationDeliveries()

  totals.notificationsCreated += pendingSummary.notificationsCreated ?? 0
  totals.notificationsSent += pendingSummary.notificationsSent ?? 0
  totals.notificationsFailed += pendingSummary.notificationsFailed ?? 0
  totals.notificationsSkipped += pendingSummary.notificationsSkipped ?? 0

  return {
    status: 'success',
    message: 'Domain expiry check completed',
    data: {
      checkedAt,
      domainsChecked: rows.length,
      ...totals,
    },
  }
}

function createSkippedResult(message: string, checkedAt: string): JobResult {
  return {
    status: 'skipped',
    message,
    data: createEmptyData(checkedAt),
  }
}

function createFailedResult(message: string): JobResult {
  return {
    status: 'failed',
    message,
  }
}

function createEmptyData(checkedAt: string): DomainExpiryCheckData {
  return {
    checkedAt,
    domainsChecked: 0,
    eventsEmitted: 0,
    notificationsCreated: 0,
    notificationsSent: 0,
    notificationsFailed: 0,
    notificationsSkipped: 0,
  }
}

function buildExpirySummary(domainName: string, daysRemaining: number) {
  if (daysRemaining < 0) {
    return `域名 ${domainName} 已过期`
  }

  if (daysRemaining === 0) {
    return `域名 ${domainName} 今天到期`
  }

  return `域名 ${domainName} 将于 ${daysRemaining} 天后到期`
}
