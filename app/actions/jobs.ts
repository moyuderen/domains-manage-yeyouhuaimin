'use server'

import { revalidatePath } from 'next/cache'

import { requireAccess } from '@/lib/auth/access-server'
import { triggerDomainExpiryCheckDailyJob, triggerDomainExpiryCheckJob } from '@/lib/jobs/trigger-domain-expiry-check'
import type { JobResult } from '@/lib/jobs/types'

async function runManualJobAction(run: () => Promise<JobResult>) {
  await requireAccess()

  const result = await run()

  revalidatePath('/job-runs')
  revalidatePath('/logs')

  return result
}

export async function runDomainExpiryCheckManuallyAction() {
  return runManualJobAction(() => triggerDomainExpiryCheckJob({
    triggerSource: 'manual',
  }))
}

export async function runDomainExpiryCheckDailyManuallyAction() {
  return runManualJobAction(() => triggerDomainExpiryCheckDailyJob({
    triggerSource: 'manual',
  }))
}
