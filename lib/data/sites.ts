import { mapSite } from '@/lib/mappers/site'
import { mockSites } from '@/lib/mock/sites'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { Site, SiteFormValues, SiteListQuery, SiteRow, PaginatedSites, FavoriteSite } from '@/types/site'

export async function getActiveSites(): Promise<Site[]> {
  if (!isSupabaseConfigured()) {
    return mockSites.filter((s) => s.isActive)
  }

  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => mapSite(row as SiteRow))
  } catch (error) {
    console.error('Failed to load sites from Supabase, using mock data.', error)
    return mockSites.filter((s) => s.isActive)
  }
}

export async function getSites(query: SiteListQuery): Promise<PaginatedSites> {
  if (!isSupabaseConfigured()) {
    return paginateSites(filterMockSites(query), query)
  }

  try {
    const supabase = createSupabaseAdminClient()
    let builder = supabase
      .from('sites')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true })

    const keyword = query.keyword.trim().toLowerCase()

    if (keyword) {
      builder = builder.or(`name.ilike.%${keyword}%,description.ilike.%${keyword}%,remark.ilike.%${keyword}%`)
    }

    if (query.category !== 'all' && query.category) {
      builder = builder.eq('category', query.category)
    }

    if (query.isActive !== 'all') {
      builder = builder.eq('is_active', query.isActive)
    }

    const from = (query.page - 1) * query.pageSize
    const to = from + query.pageSize - 1

    const { data, error, count } = await builder.range(from, to)

    if (error) throw new Error(error.message)

    const items = (data ?? []).map((row) => mapSite(row as SiteRow))
    const total = count ?? 0

    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    }
  } catch (error) {
    console.error('Failed to load sites from Supabase, using mock data.', error)
    return paginateSites(filterMockSites(query), query)
  }
}

export async function getAllSites(): Promise<Site[]> {
  if (!isSupabaseConfigured()) {
    return mockSites
  }

  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => mapSite(row as SiteRow))
  } catch (error) {
    console.error('Failed to load sites from Supabase, using mock data.', error)
    return mockSites
  }
}

export async function getSitesByIds(ids: string[]): Promise<Site[]> {
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
  if (uniqueIds.length === 0) {
    return []
  }

  if (!isSupabaseConfigured()) {
    return mockSites.filter((site) => uniqueIds.includes(site.id))
  }

  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .in('id', uniqueIds)

    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => mapSite(row as SiteRow))
  } catch (error) {
    console.error('Failed to load sites by ids from Supabase, using mock data.', error)
    return mockSites.filter((site) => uniqueIds.includes(site.id))
  }
}

export async function getSiteById(id: string): Promise<Site | null> {
  if (!isSupabaseConfigured()) {
    return mockSites.find((s) => s.id === id) ?? null
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return mapSite(data as SiteRow)
}

export async function createSite(values: SiteFormValues): Promise<Site> {
  const supabase = createSupabaseAdminClient()
  const payload = {
    name: values.name.trim(),
    category: values.category.trim(),
    icon_url: values.iconUrl.trim(),
    description: values.description.trim(),
    remark: values.remark.trim(),
    website_url: values.websiteUrl.trim(),
    is_active: values.isActive,
  }

  const { data, error } = await supabase.from('sites').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return mapSite(data as SiteRow)
}

export async function updateSite(id: string, values: SiteFormValues) {
  const supabase = createSupabaseAdminClient()
  const payload = {
    name: values.name.trim(),
    category: values.category.trim(),
    icon_url: values.iconUrl.trim(),
    description: values.description.trim(),
    remark: values.remark.trim(),
    website_url: values.websiteUrl.trim(),
    is_active: values.isActive,
  }

  const { error } = await supabase.from('sites').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteSite(id: string) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('sites').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function toggleSiteActive(id: string, isActive: boolean) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('sites')
    .update({ is_active: isActive })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

function filterMockSites(query: SiteListQuery): Site[] {
  const keyword = query.keyword.trim().toLowerCase()

  return mockSites.filter((site) => {
    const matchesKeyword = !keyword ||
      site.name.toLowerCase().includes(keyword) ||
      site.description.toLowerCase().includes(keyword) ||
      site.remark.toLowerCase().includes(keyword)
    const matchesCategory = query.category === 'all' || !query.category || site.category === query.category
    const matchesActive = query.isActive === 'all' || site.isActive === query.isActive
    return matchesKeyword && matchesCategory && matchesActive
  })
}

function paginateSites(sites: Site[], query: SiteListQuery): PaginatedSites {
  const total = sites.length
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize))
  const currentPage = Math.min(query.page, totalPages)
  const from = (currentPage - 1) * query.pageSize
  const items = sites.slice(from, from + query.pageSize)

  return {
    items,
    total,
    page: currentPage,
    pageSize: query.pageSize,
    totalPages,
  }
}

export async function getFavoriteSites(): Promise<FavoriteSite[]> {
  if (!isSupabaseConfigured()) {
    return []
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('favorite_sites')
    .select('site_id, position')
    .order('position', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    siteId: row.site_id,
    position: row.position,
  }))
}

export async function addFavoriteSite(siteId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()

  const { data: maxPos } = await supabase
    .from('favorite_sites')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = (maxPos?.[0]?.position ?? -1) + 1

  const { error } = await supabase
    .from('favorite_sites')
    .insert({ site_id: siteId, position: nextPosition })

  if (error) throw new Error(error.message)
}

export async function removeFavoriteSite(siteId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('favorite_sites')
    .delete()
    .eq('site_id', siteId)

  if (error) throw new Error(error.message)
}

export async function reorderFavoriteSites(orderedSiteIds: string[]): Promise<void> {
  const supabase = createSupabaseAdminClient()

  const updates = orderedSiteIds.map((siteId, index) =>
    supabase
      .from('favorite_sites')
      .update({ position: index })
      .eq('site_id', siteId),
  )

  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed?.error) throw new Error(failed.error.message)
}
