'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

import { requireAccess } from '@/lib/auth/access-server'
import { buildSettingsUpdateDetail } from '@/lib/activity-log-detail'
import { tryEmitEvent } from '@/lib/events'
import { buildSettingsSummary, getActivityRequestContext } from '@/lib/events/helpers'
import { getProjectTitles, SETTINGS_KEYS, upsertSetting } from '@/lib/data/settings'

const DEFAULT_ICON = '/icon.svg'

export async function updateProjectTitlesAction(title: string, subtitle: string, icon: string) {
  await requireAccess()

  const trimmedTitle = title.trim()
  const trimmedSubtitle = subtitle.trim()
  const trimmedIcon = icon.trim()
  const finalIcon = trimmedIcon || DEFAULT_ICON

  if (!trimmedTitle) throw new Error('项目标题不能为空')
  if (trimmedTitle.length > 50) throw new Error('项目标题不能超过 50 个字符')
  if (trimmedSubtitle.length > 50) throw new Error('项目副标题不能超过 50 个字符')
  if (finalIcon !== DEFAULT_ICON) {
    if (finalIcon.length > 500) throw new Error('图标地址不能超过 500 个字符')
    if (!finalIcon.startsWith('https://')) throw new Error('图标地址必须以 https:// 开头')
  }

  const requestContext = getActivityRequestContext(await headers())
  const previousTitles = await getProjectTitles()

  await Promise.all([
    upsertSetting(SETTINGS_KEYS.PROJECT_TITLE, trimmedTitle),
    upsertSetting(SETTINGS_KEYS.PROJECT_SUBTITLE, trimmedSubtitle),
    upsertSetting(SETTINGS_KEYS.PROJECT_ICON, finalIcon),
  ])

  await tryEmitEvent({
    eventKey: 'settings.critical_changed',
    category: 'settings',
    action: 'update',
    resourceType: 'settings',
    resourceId: 'project_titles',
    resourceName: '项目标题',
    summary: buildSettingsSummary('项目标题'),
    requestContext,
    severity: 'critical',
    detail: buildSettingsUpdateDetail(previousTitles, {
      title: trimmedTitle,
      subtitle: trimmedSubtitle,
      icon: finalIcon,
    }),
  })

  revalidatePath('/', 'layout')
  revalidatePath('/logs')
}

