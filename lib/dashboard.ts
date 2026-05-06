import type { Account } from '../types/account'
import type { Domain } from '../types/domain'
import type { Site } from '../types/site'
import { addDays, dayLabel } from './date'
import { getDomainStatus } from './domainStatus'
import { EMAIL_PROVIDER_LABELS } from '../types/account'
import { subDays, differenceInDays as dfnsDifferenceInDays, isBefore, parseISO } from 'date-fns'

const UNNAMED = '未填写'

export type AccountReuseDistributionAccount = {
  accountId: string
  identifier: string
  isActive: boolean
  emailProviderLabel: string
  reuseCount: number
}

export type AccountReuseDistributionItem = {
  name: '未使用' | '低复用' | '中复用' | '高复用'
  value: number
  accounts: AccountReuseDistributionAccount[]
}

export function getStatusDistribution(domains: Domain[], expiryDays: number) {
  const counts = { 正常: 0, 即将到期: 0, 已过期: 0 }

  domains.forEach((domain) => {
    const status = getDomainStatus(domain.expiryDate, expiryDays)
    if (status === 'normal') counts['正常'] += 1
    if (status === 'expiring') counts['即将到期'] += 1
    if (status === 'expired') counts['已过期'] += 1
  })

  return Object.entries(counts).map(([name, value]) => ({ name, value }))
}

export function getFreePaidDistribution(domains: Domain[]) {
  const counts = { 免费域名: 0, 付费域名: 0 }

  domains.forEach((domain) => {
    if (domain.isFree) counts['免费域名'] += 1
    else counts['付费域名'] += 1
  })

  return Object.entries(counts).map(([name, value]) => ({ name, value }))
}

export type RegistrarDistributionItem = {
  name: string
  value: number
  domains: string[]
  registrarSiteId: string | null
  websiteUrl: string | null
}

export function getRegistrarDistribution(domains: Domain[], sites: Site[]): RegistrarDistributionItem[] {
  const siteMap = new Map(sites.map((s) => [s.id, s]))
  const groups = new Map<string, { count: number; domainNames: string[]; siteId: string | null }>()

  domains.forEach((domain) => {
    const siteId = domain.registrarSiteId
    const key = siteId ?? UNNAMED
    const group = groups.get(key) ?? { count: 0, domainNames: [], siteId: null }
    group.count += 1
    if (group.domainNames.length < 5) {
      group.domainNames.push(domain.name)
    }
    if (siteId && !group.siteId) {
      group.siteId = siteId
    }
    groups.set(key, group)
  })

  return Array.from(groups.entries())
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([, group]) => ({
      name: group.siteId ? (siteMap.get(group.siteId)?.name ?? UNNAMED) : UNNAMED,
      value: group.count,
      domains: group.domainNames,
      registrarSiteId: group.siteId,
      websiteUrl: group.siteId ? (siteMap.get(group.siteId)?.websiteUrl ?? null) : null,
    }))
}

export type DnsDistributionItem = {
  name: string
  value: number
  websiteUrl: string | null
}

export function getDnsProviderDistribution(domains: Domain[], sites: Site[]): DnsDistributionItem[] {
  const siteMap = new Map(sites.map((s) => [s.id, s]))
  const groups = new Map<string, { count: number; siteId: string | null }>()

  domains.forEach((domain) => {
    const siteId = domain.dnsSiteId
    const key = siteId ?? UNNAMED
    const group = groups.get(key) ?? { count: 0, siteId: null }
    group.count += 1
    if (siteId && !group.siteId) {
      group.siteId = siteId
    }
    groups.set(key, group)
  })

  return Array.from(groups.entries())
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([, group]) => ({
      name: group.siteId ? (siteMap.get(group.siteId)?.name ?? UNNAMED) : UNNAMED,
      value: group.count,
      websiteUrl: group.siteId ? (siteMap.get(group.siteId)?.websiteUrl ?? null) : null,
    }))
}

export function getExpiryTimeline(domains: Domain[], range: 30 | 60 | 90 = 30) {
  const buckets = Array.from({ length: range }, (_, index) => {
    const date = addDays(index)
    return { date, value: 0 }
  })

  domains.forEach((domain) => {
    if (!domain.expiryDate) {
      return
    }

    const bucket = buckets.find((item) => item.date === domain.expiryDate)
    if (bucket) bucket.value += 1
  })

  return buckets.map((item) => ({
    name: item.date,
    value: item.value,
  }))
}

export function getCreatedTrend(domains: Domain[]) {
  const counts = new Map<string, number>()

  domains.forEach((domain) => {
    const key = dayLabel(domain.createdAt)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })

  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => ({ name, value }))
}

export function getUpcomingRisk(domains: Domain[], expiryDays: number) {
  return domains.filter((domain) => getDomainStatus(domain.expiryDate, expiryDays) === 'expiring').slice(0, 5)
}

// 账户统计
export function getAccountStatistics(accounts: Account[]) {
  const weekAgo = subDays(new Date(), 7)

  return {
    total: accounts.length,
    active: accounts.filter((a) => a.isActive).length,
    inactive: accounts.filter((a) => !a.isActive).length,
    newThisWeek: accounts.filter((a) => !isBefore(parseISO(a.createdAt), weekAgo)).length,
  }
}

export type AccountProviderDistributionItem = {
  name: string
  value: number
  identifiers: string[]
}

export type InactiveAccountRiskItem = {
  id: string
  identifier: string
  domainCount: number
}

export type StaleAccountRiskItem = {
  id: string
  identifier: string
  daysSinceUpdate: number
}

// 邮箱提供商分布
export function getAccountProviderDistribution(accounts: Account[]) {
  const map = new Map<string, string[]>()

  accounts.forEach((account) => {
    const label = EMAIL_PROVIDER_LABELS[account.emailProvider] ?? account.emailProvider
    const list = map.get(label) ?? []
    list.push(account.identifier)
    map.set(label, list)
  })

  return Array.from(map.entries())
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([name, list]) => ({ name, value: list.length, identifiers: list }))
}

// 注册站点分布（按账号维度）
export function getAccountSiteDistribution(accounts: Account[], sites: Site[]) {
  const siteNamesById = new Map(sites.map((site) => [site.id, site.name]))

  return accounts
    .map((account) => {
      const activeSites = account.sites.filter((s) => s.isActive)
      return {
        name: account.identifier,
        value: activeSites.length,
        siteNames: activeSites.map((s) => siteNamesById.get(s.site) ?? s.site),
      }
    })
    .sort((a, b) => b.value - a.value)
}

// 账户复用分布
export function getAccountReuseDistribution(accounts: Account[], domains: Domain[]): AccountReuseDistributionItem[] {
  const counts = new Map<string, number>()

  accounts.forEach((account) => counts.set(account.id, 0))

  domains.forEach((domain) => {
    if (domain.registrarAccountId) {
      counts.set(domain.registrarAccountId, (counts.get(domain.registrarAccountId) ?? 0) + 1)
    }
    if (domain.dnsAccountId) {
      counts.set(domain.dnsAccountId, (counts.get(domain.dnsAccountId) ?? 0) + 1)
    }
  })

  const groups: Record<AccountReuseDistributionItem['name'], AccountReuseDistributionAccount[]> = {
    '未使用': [],
    '低复用': [],
    '中复用': [],
    '高复用': [],
  }

  accounts.forEach((account) => {
    const reuseCount = counts.get(account.id) ?? 0
    const groupName: AccountReuseDistributionItem['name'] = reuseCount === 0
      ? '未使用'
      : reuseCount <= 3
        ? '低复用'
        : reuseCount <= 6
          ? '中复用'
          : '高复用'

    groups[groupName].push({
      accountId: account.id,
      identifier: account.identifier,
      isActive: account.isActive,
      emailProviderLabel: EMAIL_PROVIDER_LABELS[account.emailProvider] ?? account.emailProvider,
      reuseCount,
    })
  })

  return (['未使用', '低复用', '中复用', '高复用'] as const).map((name) => ({
    name,
    value: groups[name].length,
    accounts: groups[name].sort((a, b) => {
      if (b.reuseCount !== a.reuseCount) return b.reuseCount - a.reuseCount
      return a.identifier.localeCompare(b.identifier)
    }),
  }))
}

// 账户风险监控
export function getAccountRisks(accounts: Account[], domains: Domain[]) {
  const ninetyDaysAgo = subDays(new Date(), 90)

  const accountDomainCounts = new Map<string, number>()
  domains.forEach((domain) => {
    if (domain.registrarAccountId) {
      accountDomainCounts.set(domain.registrarAccountId, (accountDomainCounts.get(domain.registrarAccountId) ?? 0) + 1)
    }
    if (domain.dnsAccountId) {
      accountDomainCounts.set(domain.dnsAccountId, (accountDomainCounts.get(domain.dnsAccountId) ?? 0) + 1)
    }
  })

  const inactiveWithDomains: InactiveAccountRiskItem[] = accounts
    .filter((account) => !account.isActive && (accountDomainCounts.get(account.id) ?? 0) > 0)
    .map((account) => ({
      id: account.id,
      identifier: account.identifier,
      domainCount: accountDomainCounts.get(account.id) ?? 0,
    }))

  const now = new Date()
  const staleAccounts: StaleAccountRiskItem[] = accounts
    .map((account) => {
      const updatedAt = parseISO(account.updatedAt)
      return { account, updatedAt }
    })
    .filter(({ updatedAt }) => isBefore(updatedAt, ninetyDaysAgo))
    .map(({ account, updatedAt }) => ({
      id: account.id,
      identifier: account.identifier,
      daysSinceUpdate: dfnsDifferenceInDays(now, updatedAt),
    }))

  return { inactiveWithDomains, staleAccounts }
}

// ── 站点统计 ──

export function getSiteStatistics(sites: Site[]) {
  let active = 0
  const categories = new Set<string>()

  for (const site of sites) {
    if (site.isActive) active++
    if (site.category) categories.add(site.category)
  }

  return {
    total: sites.length,
    active,
    inactive: sites.length - active,
    categories: categories.size,
  }
}

// 站点账号个数分布（横坐标站点名称，纵坐标账号数）
export function getSiteAccountCountDistribution(accounts: Account[], sites: Site[]) {
  const siteById = new Map(sites.map((s) => [s.id, s]))
  const buckets = new Map(sites.map((s) => [s.id, { count: 0, identifiers: [] as string[] }]))

  accounts.forEach((account) => {
    account.sites.forEach((entry) => {
      let bucket = buckets.get(entry.site)
      if (!bucket) {
        bucket = { count: 0, identifiers: [] }
        buckets.set(entry.site, bucket)
      }
      bucket.count += 1
      bucket.identifiers.push(account.identifier)
    })
  })

  return Array.from(buckets.entries())
    .map(([siteKey, { count, identifiers }]) => ({
      name: siteById.get(siteKey)?.name ?? siteKey,
      value: count,
      identifiers,
      websiteUrl: siteById.get(siteKey)?.websiteUrl ?? null,
    }))
    .sort((a, b) => b.value - a.value)
}
