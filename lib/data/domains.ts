import { format, addDays as dfnsAddDays } from 'date-fns'

import { getDomainStatus } from '@/lib/domainStatus'
import { getNotificationRuleSettings } from '@/lib/data/settings'
import { mapDomain, normalizeDomainName } from '@/lib/mappers/domain'
import { mockDomains } from '@/lib/mock/domains'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import type { Domain, DomainFormValues, DomainListQuery, DomainRow, PaginatedDomains, SubdomainFormValues } from '@/types/domain'

export async function getDomains(query: DomainListQuery, expiryDays?: number): Promise<PaginatedDomains> {
  const resolvedExpiryDays = expiryDays ?? (await getNotificationRuleSettings()).expiryDays
  const threshold = format(dfnsAddDays(new Date(), resolvedExpiryDays), 'yyyy-MM-dd')

  if (!isSupabaseConfigured()) {
    return paginateDomains(sortDomains(filterMockDomains(query, resolvedExpiryDays), query), query)
  }

  try {
    const supabase = createSupabaseAdminClient()
    let builder = supabase
      .from('domains')
      .select('*, subdomains(*)', { count: 'exact' })

    const keyword = query.keyword.trim().toLowerCase()

    if (keyword) {
      const conditions = [`name.ilike.%${keyword}%`]

      const [matchingSites, matchingAccounts] = await Promise.all([
        supabase.from('sites').select('id').ilike('name', `%${keyword}%`),
        supabase.from('accounts').select('id').ilike('identifier', `%${keyword}%`),
      ])

      if (matchingSites.error) throw new Error(matchingSites.error.message)
      if (matchingAccounts.error) throw new Error(matchingAccounts.error.message)

      const siteIds = (matchingSites.data ?? []).map((s) => s.id)
      const accountIds = (matchingAccounts.data ?? []).map((a) => a.id)

      if (siteIds.length > 0) {
        conditions.push(`registrar_site_id.in.(${siteIds.join(',')})`)
        conditions.push(`dns_site_id.in.(${siteIds.join(',')})`)
      }
      if (accountIds.length > 0) {
        conditions.push(`registrar_account_id.in.(${accountIds.join(',')})`)
        conditions.push(`dns_account_id.in.(${accountIds.join(',')})`)
      }

      builder = builder.or(conditions.join(','))
    }

    if (query.status === 'expired') {
      builder = builder.lt('expiry_date', todayDate())
    }

    if (query.status === 'expiring') {
      builder = builder.gte('expiry_date', todayDate()).lte('expiry_date', threshold)
    }

    if (query.status === 'normal') {
      builder = builder.gt('expiry_date', threshold)
    }

    if (query.registrarSiteId !== 'all') {
      builder = builder.eq('registrar_site_id', query.registrarSiteId)
    }

    if (query.dnsSiteId !== 'all') {
      builder = builder.eq('dns_site_id', query.dnsSiteId)
    }

    if (query.sortBy === 'updatedAt' || query.sortBy === 'createdAt') {
      const from = (query.page - 1) * query.pageSize
      const to = from + query.pageSize - 1
      const ascending = query.sortOrder === 'asc'
      const sortColumn = query.sortBy === 'createdAt' ? 'created_at' : 'updated_at'
      const orderedBuilder = builder
        .order(sortColumn, { ascending })
        .order('name', { ascending: true })
      const { data, error, count } = await orderedBuilder.range(from, to)

      if (error) {
        throw new Error(error.message)
      }

      const items = (data ?? []).map((row) => mapDomain(row as DomainRow))
      const total = count ?? 0

      return {
        items,
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      }
    }

    const { data, error } = await builder

    if (error) {
      throw new Error(error.message)
    }

    return paginateDomains(sortDomains((data ?? []).map((row) => mapDomain(row as DomainRow)), query), query)
  } catch (error) {
    console.error('Failed to load domains from Supabase, using mock data instead.', error)
    return paginateDomains(sortDomains(filterMockDomains(query, resolvedExpiryDays), query), query)
  }
}

export async function getDomainById(id: string): Promise<Domain | null> {
  if (!isSupabaseConfigured()) {
    return mockDomains.find((domain) => domain.id === id) ?? null
  }

  return getDomainByIdWithClient(createSupabaseAdminClient(), id)
}

export async function createDomain(values: DomainFormValues) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from('domains').insert(buildDomainPayload(values)).select('*').single()
  if (error) throw new Error(error.message)
  return mapDomain(data as DomainRow)
}

export async function updateDomain(id: string, values: DomainFormValues) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('domains').update(buildDomainPayload(values)).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteDomain(id: string) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('domains').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteDomains(ids: string[]) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('domains').delete().in('id', ids)
  if (error) throw new Error(error.message)
}

export async function getDomainsByIds(ids: string[]) {
  if (ids.length === 0) return []

  if (!isSupabaseConfigured()) {
    return mockDomains.filter((domain) => ids.includes(domain.id))
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('domains')
    .select('*, subdomains(*)')
    .in('id', ids)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapDomain(row as DomainRow))
}

export type ExpiringDomainNotificationRow = {
  id: string
  name: string
  expiry_date: string | null
  registrar_site_id: { name: string }[] | null
}

export async function listExpiringDomainsForNotification(input: {
  startDate: string
  endDate: string
}): Promise<ExpiringDomainNotificationRow[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('domains')
    .select('id, name, expiry_date, registrar_site_id(name)')
    .not('expiry_date', 'is', null)
    .gte('expiry_date', input.startDate)
    .lte('expiry_date', input.endDate)

  if (error) throw new Error(error.message)
  return (data ?? []) as ExpiringDomainNotificationRow[]
}

export async function createSubdomain(domainId: string, values: SubdomainFormValues) {
  const supabase = createSupabaseAdminClient()
  const payload = {
    domain_id: domainId,
    subdomain: values.subdomain.trim().toLowerCase(),
    ip: values.ip.trim(),
    description: values.description.trim(),
    remark: values.remark.trim(),
  }

  const { error } = await supabase.from('subdomains').insert(payload)
  if (error) throw new Error(error.message)
}

export async function updateSubdomain(id: string, values: SubdomainFormValues) {
  const supabase = createSupabaseAdminClient()
  const payload = {
    subdomain: values.subdomain.trim().toLowerCase(),
    ip: values.ip.trim(),
    description: values.description.trim(),
    remark: values.remark.trim(),
  }

  const { error } = await supabase.from('subdomains').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteSubdomain(id: string) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('subdomains').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

function buildDomainPayload(values: DomainFormValues) {
  return {
    name: normalizeDomainName(values.name),
    registrar_account_id: values.registrarAccountId || null,
    registrar_site_id: values.registrarSiteId || null,
    registration_date: values.registrationDate || null,
    expiry_date: values.expiryDate || null,
    dns_account_id: values.dnsAccountId || null,
    dns_site_id: values.dnsSiteId || null,
    renewal_days_before_expiry: values.renewalDaysBeforeExpiry ? Number(values.renewalDaysBeforeExpiry) : null,
    is_free: values.isFree === 'true',
    currency: values.currency,
    purchase_price: values.isFree !== 'true' && values.purchasePrice ? Number(values.purchasePrice) : null,
    renewal_price: values.isFree !== 'true' && values.renewalPrice ? Number(values.renewalPrice) : null,
    auto_renewal: values.isFree !== 'true' && values.autoRenewal === 'true',
    remark: values.remark.trim(),
  }
}

async function getDomainByIdWithClient(supabase: ReturnType<typeof createSupabaseAdminClient>, id: string): Promise<Domain | null> {
  const { data, error } = await supabase
    .from('domains')
    .select('*, subdomains(*)')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return mapDomain(data as DomainRow)
}

function filterMockDomains(query: DomainListQuery, expiryDays: number) {
  const keyword = query.keyword.trim().toLowerCase()

  return mockDomains.filter((domain) => {
    const matchesKeyword = !keyword || domain.name.toLowerCase().includes(keyword)
    const matchesStatus = query.status === 'all' || getDomainStatus(domain.expiryDate, expiryDays) === query.status
    const matchesRegistrarSite = query.registrarSiteId === 'all' || domain.registrarSiteId === query.registrarSiteId
    const matchesDnsSite = query.dnsSiteId === 'all' || domain.dnsSiteId === query.dnsSiteId
    return matchesKeyword && matchesStatus && matchesRegistrarSite && matchesDnsSite
  })
}

function sortDomains(domains: Domain[], query: DomainListQuery) {
  const direction = query.sortOrder === 'asc' ? 1 : -1

  return [...domains].sort((left, right) => {
    if (query.sortBy === 'suffix') {
      const suffixResult = compareStrings(extractDomainSuffix(left.name), extractDomainSuffix(right.name), direction)
      if (suffixResult !== 0) return suffixResult
    } else if (query.sortBy === 'createdAt') {
      const createdAtResult = compareStrings(left.createdAt, right.createdAt, direction)
      if (createdAtResult !== 0) return createdAtResult
    } else {
      const updatedAtResult = compareStrings(left.updatedAt, right.updatedAt, direction)
      if (updatedAtResult !== 0) return updatedAtResult
    }

    const nameResult = compareStrings(left.name, right.name, 1)
    if (nameResult !== 0) return nameResult

    return compareStrings(left.updatedAt, right.updatedAt, -1)
  })
}

function paginateDomains(domains: Domain[], query: DomainListQuery): PaginatedDomains {
  const total = domains.length
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize))
  const currentPage = Math.min(query.page, totalPages)
  const from = (currentPage - 1) * query.pageSize
  const items = domains.slice(from, from + query.pageSize)

  return {
    items,
    total,
    page: currentPage,
    pageSize: query.pageSize,
    totalPages,
  }
}

function extractDomainSuffix(domainName: string) {
  const segments = normalizeDomainName(domainName).split('.').filter(Boolean)
  return segments.at(-1) ?? ''
}

function compareStrings(left: string, right: string, direction: 1 | -1) {
  return left.localeCompare(right, 'zh-CN') * direction
}

function todayDate() {
  return format(new Date(), 'yyyy-MM-dd')
}

