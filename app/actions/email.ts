'use server'

import { revalidatePath } from 'next/cache'

import { requireAccess } from '@/lib/auth/access-server'
import {
  getEmailProviderSettings,
  getNotificationNotifyTimezone,
  getProjectTitles,
  saveEmailProviderSettings,
} from '@/lib/data/settings'
import { normalizeDelimitedStringList } from '@/lib/notifications/message'
import { sendTestEmail } from '@/lib/notifications/email'
import { testNotificationTemplate } from '@/lib/notifications/templates'
import { emailConfigSchema } from '@/schemas/emailSchemas'

export async function saveEmailProviderAction(values: {
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUsername: string
  smtpPassword: string
  fromEmail: string
  fromName: string
  replyToEmail: string
  recipientsText: string
  enabled: boolean
}) {
  await requireAccess()

  const current = await getEmailProviderSettings()
  const smtpPassword = values.smtpPassword.trim() || current.smtpPassword

  const parsed = emailConfigSchema.safeParse({
    smtpHost: values.smtpHost.trim(),
    smtpPort: values.smtpPort,
    smtpSecure: values.smtpSecure,
    smtpUsername: values.smtpUsername.trim(),
    smtpPassword,
    fromEmail: values.fromEmail.trim(),
    fromName: values.fromName.trim(),
    replyToEmail: values.replyToEmail.trim() || undefined,
    toEmails: normalizeDelimitedStringList(values.recipientsText),
    enabled: values.enabled,
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(', '))
  }

  await saveEmailProviderSettings({
    smtpHost: parsed.data.smtpHost,
    smtpPort: parsed.data.smtpPort,
    smtpSecure: parsed.data.smtpSecure,
    smtpUsername: parsed.data.smtpUsername,
    smtpPassword: parsed.data.smtpPassword,
    fromEmail: parsed.data.fromEmail,
    fromName: parsed.data.fromName,
    replyToEmail: parsed.data.replyToEmail ?? '',
    toEmails: parsed.data.toEmails,
    enabled: parsed.data.enabled,
  })

  revalidatePath('/settings')
}

export async function sendEmailTestAction() {
  await requireAccess()

  const [notifyTimezone, projectTitles, provider] = await Promise.all([
    getNotificationNotifyTimezone(),
    getProjectTitles(),
    getEmailProviderSettings(),
  ])

  const parsed = emailConfigSchema.safeParse({
    smtpHost: provider.smtpHost,
    smtpPort: provider.smtpPort,
    smtpSecure: provider.smtpSecure,
    smtpUsername: provider.smtpUsername,
    smtpPassword: provider.smtpPassword,
    fromEmail: provider.fromEmail,
    fromName: provider.fromName,
    replyToEmail: provider.replyToEmail || undefined,
    toEmails: provider.toEmails,
    enabled: provider.enabled,
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(', '))
  }

  const content = testNotificationTemplate.buildContent(undefined, {
    projectName: projectTitles.title,
    timeZone: notifyTimezone,
  })

  const result = await sendTestEmail({
    content,
    config: {
      smtpHost: parsed.data.smtpHost,
      smtpPort: parsed.data.smtpPort,
      smtpSecure: parsed.data.smtpSecure,
      smtpUsername: parsed.data.smtpUsername,
      smtpPassword: parsed.data.smtpPassword,
      fromEmail: parsed.data.fromEmail,
      fromName: parsed.data.fromName,
      replyToEmail: parsed.data.replyToEmail ?? '',
      toEmails: parsed.data.toEmails,
    },
  })

  if (!result.success) {
    throw new Error(result.errorMessage)
  }

  await saveEmailProviderSettings({
    smtpHost: provider.smtpHost,
    smtpPort: provider.smtpPort,
    smtpSecure: provider.smtpSecure,
    smtpUsername: provider.smtpUsername,
    smtpPassword: provider.smtpPassword,
    fromEmail: provider.fromEmail,
    fromName: provider.fromName,
    replyToEmail: provider.replyToEmail,
    toEmails: provider.toEmails,
    enabled: provider.enabled,
    lastVerifiedAt: new Date().toISOString(),
  })

  revalidatePath('/settings')
}
