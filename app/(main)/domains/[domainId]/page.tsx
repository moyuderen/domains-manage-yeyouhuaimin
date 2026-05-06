import { notFound } from 'next/navigation'

import { DomainDetailsPage } from '@/components/domains/DomainDetailsPage'
import { buildAccountLookup, getAllAccounts } from '@/lib/data/accounts'
import { getDomainById } from '@/lib/data/domains'
import { getNotificationRuleSettings } from '@/lib/data/settings'
import { getAllSites } from '@/lib/data/sites'

export default async function DomainDetailPage({ params }: { params: Promise<{ domainId: string }> }) {
  const { domainId } = await params
  const domain = await getDomainById(domainId)

  if (!domain) {
    notFound()
  }

  const [sites, accounts, rules] = await Promise.all([
    getAllSites(),
    getAllAccounts(),
    getNotificationRuleSettings(),
  ])

  const accountLookup = buildAccountLookup(accounts)

  return <DomainDetailsPage domain={domain} linkSites={sites} accountLookup={accountLookup} expiryDays={rules.expiryDays} />
}
