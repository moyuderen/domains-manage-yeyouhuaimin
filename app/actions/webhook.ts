'use server'

import { revalidatePath } from 'next/cache'

import { requireAccess } from '@/lib/auth/access-server'
import {
  getNotificationNotifyTimezone,
  getProjectTitles,
  getWebhookProviderSettings,
  saveWebhookProviderSettings,
} from '@/lib/data/settings'
import { renderTestPayload } from '@/lib/notifications/webhook'
import { testNotificationTemplate } from '@/lib/notifications/templates'
import { webhookConfigSchema } from '@/schemas/webhookSchemas'

export async function saveWebhookProviderAction(values: {
  url: string
  secret: string
  format: string
  mentionMode: string
  mentionTargets: string
  enabled: boolean
}) {
  await requireAccess()

  let secret = values.secret.trim()

  if (!secret) {
    const current = await getWebhookProviderSettings()
    secret = current.secret
  }

  const parsed = webhookConfigSchema.safeParse({
    url: values.url.trim(),
    secret: secret || undefined,
    format: values.format,
    mentionMode: values.mentionMode,
    mentionTargets: values.mentionTargets.trim() || undefined,
    enabled: values.enabled,
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(', '))
  }

  await saveWebhookProviderSettings({
    url: parsed.data.url,
    secret: parsed.data.secret ?? '',
    format: parsed.data.format,
    mentionMode: parsed.data.mentionMode,
    mentionTargets: parsed.data.mentionTargets ?? '',
    enabled: parsed.data.enabled,
  })

  revalidatePath('/settings')
}

export async function sendWebhookTestAction() {
  await requireAccess()

  const [notifyTimezone, projectTitles, provider] = await Promise.all([
    getNotificationNotifyTimezone(),
    getProjectTitles(),
    getWebhookProviderSettings(),
  ])

  if (!provider.url) {
    throw new Error('请先配置 Webhook URL')
  }

  const content = testNotificationTemplate.buildContent(undefined, {
    projectName: projectTitles.title,
    timeZone: notifyTimezone,
  })

  const payload = renderTestPayload(content, provider.format, provider.mentionMode, provider.mentionTargets)
  const body = JSON.stringify(payload)

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  const result = await fetch(provider.url, {
    method: 'POST',
    headers,
    body,
    signal: AbortSignal.timeout(15_000),
  })

  if (!result.ok) {
    const text = await result.text().catch(() => '')
    throw new Error(`HTTP ${result.status}: ${text.slice(0, 200)}`)
  }

  await saveWebhookProviderSettings({
    url: provider.url,
    secret: provider.secret,
    format: provider.format,
    mentionMode: provider.mentionMode,
    mentionTargets: provider.mentionTargets,
    enabled: provider.enabled,
    lastVerifiedAt: new Date().toISOString(),
  })

  revalidatePath('/settings')
}
