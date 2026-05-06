'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

import { requireAccess } from '@/lib/auth/access-server'
import { buildDomainUpdateDetailFromForm } from '@/lib/activity-log-detail'
import { getAccountsByIds, ensureAccountSiteRelations } from '@/lib/data/accounts'
import { buildDeleteFallbackResourceName } from '@/lib/data/activity-logs'
import { getSitesByIds } from '@/lib/data/sites'
import { tryEmitEvent } from '@/lib/events'
import { buildActivitySummary, getActivityRequestContext } from '@/lib/events/helpers'
import { createDomain, deleteDomain, deleteDomains, getDomainById, getDomainsByIds, updateDomain } from '@/lib/data/domains'
import { normalizeDomainName } from '@/lib/mappers/domain'
import { domainSchema } from '@/schemas/domainSchemas'
import type { DomainFormValues } from '@/types/domain'

export async function createDomainAction(values: DomainFormValues) {
  await requireAccess()
  const parsed = domainSchema.parse(values)
  const resourceName = normalizeDomainName(parsed.name)
  const requestContext = getActivityRequestContext(await headers())

  const domain = await createDomain(parsed)
  await ensureAccountSiteRelations(getAccountSiteRelations(parsed))
  await tryEmitEvent({
    category: 'domain',
    action: 'create',
    resourceType: 'domain',
    resourceId: domain.id,
    resourceName,
    summary: buildActivitySummary('create', '域名', resourceName),
    requestContext,
  })
  revalidatePath('/')
  revalidatePath('/dashboard')
  revalidatePath('/logs')
  revalidateAccountPaths(parsed)
}

export async function updateDomainAction(id: string, values: DomainFormValues) {
  await requireAccess()
  const parsed = domainSchema.parse(values)
  const resourceName = normalizeDomainName(parsed.name)
  const [previousDomain, headerStore] = await Promise.all([getDomainById(id), headers()])
  const requestContext = getActivityRequestContext(headerStore)
  const accountIds = [...new Set([
    parsed.registrarAccountId,
    parsed.dnsAccountId,
    previousDomain?.registrarAccountId ?? '',
    previousDomain?.dnsAccountId ?? '',
  ].filter(Boolean))]
  const siteIds = [...new Set([
    parsed.registrarSiteId,
    parsed.dnsSiteId,
    previousDomain?.registrarSiteId ?? '',
    previousDomain?.dnsSiteId ?? '',
  ].filter(Boolean))]
  const [accounts, sites] = await Promise.all([getAccountsByIds(accountIds), getSitesByIds(siteIds)])

  await updateDomain(id, parsed)
  await ensureAccountSiteRelations(getAccountSiteRelations(parsed))

  const detail = buildDomainUpdateDetailFromForm(previousDomain, {
    ...parsed,
    name: resourceName,
  }, {
    accountNamesById: new Map(accounts.map((account) => [account.id, account.identifier])),
    siteNamesById: new Map(sites.map((site) => [site.id, site.name])),
  })

  await tryEmitEvent({
    category: 'domain',
    action: 'update',
    resourceType: 'domain',
    resourceId: id,
    resourceName,
    summary: buildActivitySummary('update', '域名', resourceName),
    requestContext,
    detail,
  })
  revalidatePath('/')
  revalidatePath('/dashboard')
  revalidatePath('/logs')
  revalidateAccountPaths(parsed, previousDomain)
}

function getAccountSiteRelations(values: DomainFormValues) {
  return [
    { accountId: values.registrarAccountId, siteId: values.registrarSiteId },
    { accountId: values.dnsAccountId, siteId: values.dnsSiteId },
  ]
}

function revalidateAccountPaths(values: DomainFormValues, previousDomain?: { registrarAccountId: string | null; dnsAccountId: string | null } | null) {
  revalidateAccountIds([
    values.registrarAccountId,
    values.dnsAccountId,
    previousDomain?.registrarAccountId ?? '',
    previousDomain?.dnsAccountId ?? '',
  ])
}

function revalidateDeletedAccountPaths(domains: { registrarAccountId: string | null; dnsAccountId: string | null }[]) {
  revalidateAccountIds(domains.flatMap((domain) => [domain.registrarAccountId, domain.dnsAccountId]))
}

function revalidateAccountIds(accountIds: Array<string | null>) {
  revalidatePath('/accounts')

  for (const accountId of new Set(accountIds.filter(Boolean))) {
    revalidatePath(`/accounts/${accountId}`)
  }
}

export async function deleteDomainAction(id: string) {
  await requireAccess()
  const previousDomain = await getDomainById(id)
  const requestContext = getActivityRequestContext(await headers())
  const resourceName = buildDeleteFallbackResourceName(previousDomain?.name, id)

  await deleteDomain(id)
  await tryEmitEvent({
    category: 'domain',
    action: 'delete',
    resourceType: 'domain',
    resourceId: id,
    resourceName,
    summary: buildActivitySummary('delete', '域名', resourceName),
    requestContext,
    severity: 'warning',
  })
  revalidatePath('/')
  revalidatePath('/dashboard')
  revalidatePath('/domains')
  revalidatePath('/logs')
  revalidateDeletedAccountPaths(previousDomain ? [previousDomain] : [])
}

export async function deleteDomainsAction(ids: string[]) {
  await requireAccess()
  if (!ids.length) return
  const previousDomains = await getDomainsByIds(ids)
  const requestContext = getActivityRequestContext(await headers())

  await deleteDomains(ids)
  await Promise.all(previousDomains.map((domain) => tryEmitEvent({
    category: 'domain',
    action: 'delete',
    resourceType: 'domain',
    resourceId: domain.id,
    resourceName: domain.name,
    summary: buildActivitySummary('delete', '域名', domain.name),
    requestContext,
    severity: 'warning',
  })))
  revalidatePath('/')
  revalidatePath('/dashboard')
  revalidatePath('/domains')
  revalidatePath('/logs')
  revalidateDeletedAccountPaths(previousDomains)
}
