'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

import { requireAccess } from '@/lib/auth/access-server'
import { buildSiteUpdateDetailFromForm } from '@/lib/activity-log-detail'
import { tryEmitEvent } from '@/lib/events'
import { buildActivitySummary, getActivityRequestContext } from '@/lib/events/helpers'
import { buildDeleteFallbackResourceName } from '@/lib/data/activity-logs'
import { addFavoriteSite, createSite, deleteSite, getSiteById, removeFavoriteSite, reorderFavoriteSites, toggleSiteActive, updateSite } from '@/lib/data/sites'
import { siteSchema } from '@/schemas/siteSchemas'
import type { Site, SiteFormValues } from '@/types/site'

export async function createSiteAction(values: SiteFormValues): Promise<Site> {
  await requireAccess()
  const parsed = siteSchema.parse(values)
  const requestContext = getActivityRequestContext(await headers())
  const site = await createSite(parsed)

  await tryEmitEvent({
    category: 'site',
    action: 'create',
    resourceType: 'site',
    resourceId: site.id,
    resourceName: site.name,
    summary: buildActivitySummary('create', '站点', site.name),
    requestContext,
  })
  revalidatePath('/sites')
  revalidatePath('/domains')
  revalidatePath('/')
  revalidatePath('/dashboard')
  revalidatePath('/logs')
  return site
}

export async function updateSiteAction(id: string, values: SiteFormValues) {
  await requireAccess()
  const parsed = siteSchema.parse(values)
  const [previousSite, headerStore] = await Promise.all([getSiteById(id), headers()])
  const requestContext = getActivityRequestContext(headerStore)
  const resourceName = parsed.name.trim()

  await updateSite(id, parsed)
  await tryEmitEvent({
    category: 'site',
    action: 'update',
    resourceType: 'site',
    resourceId: id,
    resourceName,
    summary: buildActivitySummary('update', '站点', resourceName),
    requestContext,
    detail: buildSiteUpdateDetailFromForm(previousSite, {
      ...parsed,
      name: resourceName,
    }),
  })
  revalidatePath('/sites')
  revalidatePath('/domains')
  revalidatePath('/')
  revalidatePath('/dashboard')
  revalidatePath('/logs')
}

export async function deleteSiteAction(id: string) {
  await requireAccess()
  const previousSite = await getSiteById(id)
  const requestContext = getActivityRequestContext(await headers())
  const resourceName = buildDeleteFallbackResourceName(previousSite?.name, id)

  await deleteSite(id)
  await tryEmitEvent({
    category: 'site',
    action: 'delete',
    resourceType: 'site',
    resourceId: id,
    resourceName,
    summary: buildActivitySummary('delete', '站点', resourceName),
    requestContext,
    severity: 'warning',
  })
  revalidatePath('/sites')
  revalidatePath('/domains')
  revalidatePath('/')
  revalidatePath('/dashboard')
  revalidatePath('/logs')
}

export async function toggleSiteActiveAction(id: string, isActive: boolean) {
  await requireAccess()
  await toggleSiteActive(id, isActive)
  revalidatePath('/sites')
  revalidatePath('/domains')
  revalidatePath('/')
  revalidatePath('/dashboard')
}

export async function addFavoriteSiteAction(siteId: string) {
  await requireAccess()
  await addFavoriteSite(siteId)
  revalidatePath('/sites')
}

export async function removeFavoriteSiteAction(siteId: string) {
  await requireAccess()
  await removeFavoriteSite(siteId)
  revalidatePath('/sites')
}

export async function reorderFavoriteSitesAction(orderedSiteIds: string[]) {
  await requireAccess()
  await reorderFavoriteSites(orderedSiteIds)
}
