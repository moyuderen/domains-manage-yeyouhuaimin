import 'server-only'

import { domainExpiryCheckDailyJob, domainExpiryCheckJob } from '@/lib/jobs/domain-expiry-check'

export const jobRegistry = {
  'domain-expiry-check': domainExpiryCheckJob,
  'domain-expiry-check-daily': domainExpiryCheckDailyJob,
} as const

export type JobId = keyof typeof jobRegistry
