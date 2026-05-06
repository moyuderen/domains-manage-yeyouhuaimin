import { notFound } from 'next/navigation'

import { AccountDetailsPage } from '@/components/accounts/AccountDetailsPage'
import { getAccountById, getAllAccounts } from '@/lib/data/accounts'
import { getActiveSites } from '@/lib/data/sites'
import { isEmail } from '@/schemas/accountSchemas'

export default async function AccountDetailsRoute({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params
  const [account, sites, allAccounts] = await Promise.all([
    getAccountById(accountId),
    getActiveSites(),
    getAllAccounts(),
  ])

  if (!account) {
    notFound()
  }

  const emailIdentifiers = allAccounts.filter((a) => isEmail(a.identifier)).map((a) => a.identifier)

  return <AccountDetailsPage account={account} sites={sites} emailIdentifiers={emailIdentifiers} />
}
