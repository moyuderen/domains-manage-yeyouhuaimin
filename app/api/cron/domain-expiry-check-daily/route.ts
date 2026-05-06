import { createCronRouteHandler } from '@/lib/jobs/cron-route'
import { triggerDomainExpiryCheckDailyJob } from '@/lib/jobs/trigger-domain-expiry-check'

export const dynamic = 'force-dynamic'

export const GET = createCronRouteHandler(({ requestId }) => triggerDomainExpiryCheckDailyJob({
  triggerSource: 'vercel-cron',
  requestId,
}))
