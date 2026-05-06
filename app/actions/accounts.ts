'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

import { requireAccess } from '@/lib/auth/access-server'
import { buildAccountUpdateDetailFromForm } from '@/lib/activity-log-detail'
import { tryEmitEvent } from '@/lib/events'
import { buildActivitySummary, getActivityRequestContext } from '@/lib/events/helpers'
import { buildDeleteFallbackResourceName } from '@/lib/data/activity-logs'
import { createAccount, deleteAccount, getAccountById, toggleAccountActive, updateAccount, updateAccountSites } from '@/lib/data/accounts'
import { getSitesByIds } from '@/lib/data/sites'
import { accountSchema } from '@/schemas/accountSchemas'
import type { AccountFormValues, SiteEntry } from '@/types/account'

export async function createAccountAction(values: AccountFormValues) {
  await requireAccess()
  const parsed = accountSchema.parse(values)
  const requestContext = getActivityRequestContext(await headers())
  const account = await createAccount(parsed)

  await tryEmitEvent({
    category: 'account',
    action: 'create',
    resourceType: 'account',
    resourceId: account.id,
    resourceName: account.identifier,
    summary: buildActivitySummary('create', '账号', account.identifier),
    requestContext,
  })
  revalidatePath('/accounts')
  revalidatePath('/domains')
  revalidatePath('/logs')
  return account
}

export async function updateAccountAction(id: string, values: AccountFormValues) {
  await requireAccess()
  const parsed = accountSchema.parse(values)
  const [previousAccount, headerStore] = await Promise.all([getAccountById(id), headers()])
  const requestContext = getActivityRequestContext(headerStore)
  const resourceName = parsed.identifier.trim()
  const siteIds = [...new Set([
    ...parsed.sites.map((site) => site.site),
    ...(previousAccount?.sites.map((site) => site.site) ?? []),
  ])]
  const sites = await getSitesByIds(siteIds)

  await updateAccount(id, parsed)
  await tryEmitEvent({
    category: 'account',
    action: 'update',
    resourceType: 'account',
    resourceId: id,
    resourceName,
    summary: buildActivitySummary('update', '账号', resourceName),
    requestContext,
    detail: buildAccountUpdateDetailFromForm(previousAccount, parsed, {
      siteNamesById: new Map(sites.map((site) => [site.id, site.name])),
    }),
  })
  revalidatePath('/accounts')
  revalidatePath('/domains')
  revalidatePath('/logs')
}

export async function deleteAccountAction(id: string) {
  await requireAccess()
  const previousAccount = await getAccountById(id)
  const requestContext = getActivityRequestContext(await headers())
  const resourceName = buildDeleteFallbackResourceName(previousAccount?.identifier, id)

  await deleteAccount(id)
  await tryEmitEvent({
    category: 'account',
    action: 'delete',
    resourceType: 'account',
    resourceId: id,
    resourceName,
    summary: buildActivitySummary('delete', '账号', resourceName),
    requestContext,
    severity: 'warning',
  })
  revalidatePath('/accounts')
  revalidatePath('/domains')
  revalidatePath('/logs')
}

export async function toggleAccountActiveAction(id: string, isActive: boolean) {
  await requireAccess()
  await toggleAccountActive(id, isActive)
  revalidatePath('/accounts')
  revalidatePath('/domains')
}

export async function updateAccountSitesAction(id: string, sites: SiteEntry[]) {
  await requireAccess()
  await updateAccountSites(id, sites)
  revalidatePath('/accounts')
  revalidatePath('/accounts/[accountId]')
  revalidatePath('/domains')
}
