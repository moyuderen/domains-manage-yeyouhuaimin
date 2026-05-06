import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { LoginPageClient } from '@/components/login/LoginPageClient'
import { SettingsHydrator } from '@/components/settings/SettingsHydrator'
import { hasAccessSession } from '@/lib/auth/access-server'
import { getProjectTitles } from '@/lib/data/settings'

export async function generateMetadata(): Promise<Metadata> {
  const { subtitle } = await getProjectTitles()
  return {
    title: `登录 | ${subtitle}`,
    description: `输入访问秘钥以进入 ${subtitle}`,
  }
}

export default async function LoginPage() {
  if (await hasAccessSession()) {
    redirect('/dashboard')
  }

  const projectTitles = await getProjectTitles()

  return (
    <>
      <SettingsHydrator projectTitles={projectTitles} />
      <LoginPageClient />
    </>
  )
}
