import type { Domain } from '../types/domain'
import { getDomainStatus } from './domainStatus'
import { subDays } from 'date-fns'

export function getStatistics(domains: Domain[], expiryDays: number) {
  const start = subDays(new Date(), 7)

  return domains.reduce(
    (summary, domain) => {
      const status = getDomainStatus(domain.expiryDate, expiryDays)

      if (status === 'expiring') summary.expiring += 1
      if (status === 'expired') summary.expired += 1
      if (new Date(domain.createdAt) >= start) summary.newThisWeek += 1

      summary.total += 1
      return summary
    },
    {
      total: 0,
      expiring: 0,
      expired: 0,
      newThisWeek: 0,
    },
  )
}
