import 'server-only'

import type { JobTriggerSource } from '@/types/jobRun'

import { runJob } from '@/lib/jobs/run-job'
import type { JobId } from '@/lib/jobs/registry'

export async function triggerDomainExpiryCheckJob(input: {
  triggerSource: JobTriggerSource
  requestId?: string
}) {
  return triggerDomainExpiryJob('domain-expiry-check', input)
}

export async function triggerDomainExpiryCheckDailyJob(input: {
  triggerSource: JobTriggerSource
  requestId?: string
}) {
  return triggerDomainExpiryJob('domain-expiry-check-daily', input)
}

async function triggerDomainExpiryJob(jobId: JobId, input: {
  triggerSource: JobTriggerSource
  requestId?: string
}) {
  return runJob(jobId, {
    triggerSource: input.triggerSource,
    triggeredAt: new Date().toISOString(),
    requestId: input.requestId,
  })
}
