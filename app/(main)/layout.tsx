import type { ReactNode } from 'react'

import { AppShell } from '@/components/layout/AppShell'
import { SettingsHydrator } from '@/components/settings/SettingsHydrator'
import { requirePageAccess } from '@/lib/auth/access-server'
import { getCurrentUserInfo } from '@/lib/data/current-user'
import { getProjectTitles } from '@/lib/data/settings'

export default async function MainLayout({ children }: { children: ReactNode }) {
  await requirePageAccess()
  const [user, projectTitles] = await Promise.all([getCurrentUserInfo(), getProjectTitles()])

  return (
    <>
      <SettingsHydrator projectTitles={projectTitles} />
      <AppShell user={user}>{children}</AppShell>
    </>
  )
}
