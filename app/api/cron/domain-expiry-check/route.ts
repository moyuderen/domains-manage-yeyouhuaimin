import { createCronRouteHandler } from '@/lib/jobs/cron-route'
import { triggerDomainExpiryCheckJob } from '@/lib/jobs/trigger-domain-expiry-check'

export const dynamic = 'force-dynamic'

export const GET = createCronRouteHandler(({ requestId }) => triggerDomainExpiryCheckJob({
  triggerSource: 'vercel-cron',
  requestId,
}))
