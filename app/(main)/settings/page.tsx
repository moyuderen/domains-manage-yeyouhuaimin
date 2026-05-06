import { SettingsPageClient } from '@/components/settings/SettingsPageClient'
import { getNotificationSettingsPageData } from '@/lib/data/settings'

export default async function SettingsPage() {
  const notificationSettings = await getNotificationSettingsPageData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">系统设置</h1>
        <p className="text-sm text-muted-foreground">管理应用配置、账户信息与通知偏好。</p>
      </div>

      <SettingsPageClient notificationSettings={notificationSettings} />
    </div>
  )
}
