import { normalizeDomainName } from '@/lib/mappers/domain'
import type { Domain } from '@/types/domain'

const SAMPLE_DOMAIN_LIMIT = 10

export type DomainSuffixContext = {
  twoSegmentDomains: Set<string>
}

export type DomainSuffixOption = {
  value: string
  count: number
}

export type DomainSuffixDistributionItem = {
  name: string
  value: number
  domains: string[]
  suffix: string
}

export function normalizeSuffixValue(suffix: string) {
  return normalizeDomainName(suffix).replace(/^\.+|\.+$/g, '')
}

export function createDomainSuffixContext(domainNames: string[]): DomainSuffixContext {
  const twoSegmentDomains = new Set<string>()

  for (const domainName of domainNames) {
    const segments = getDomainSegments(domainName)
    if (segments.length === 2) {
      twoSegmentDomains.add(segments.join('.'))
    }
  }

  return { twoSegmentDomains }
}

export function extractDomainSuffix(domainName: string, context?: DomainSuffixContext) {
  const segments = getDomainSegments(domainName)

  if (segments.length === 0) return ''
  if (segments.length === 1) return segments[0] ?? ''
  if (segments.length === 2) return segments[1] ?? ''

  const lastSegment = segments[segments.length - 1] ?? ''
  const lastTwoSegments = segments.slice(-2).join('.')
  const resolvedContext = context ?? createDomainSuffixContext([domainName])

  return resolvedContext.twoSegmentDomains.has(lastTwoSegments) ? lastSegment : lastTwoSegments
}

export function matchesDomainSuffix(domainName: string, suffix: string) {
  const normalizedDomainName = normalizeSuffixValue(domainName)
  const normalizedSuffix = normalizeSuffixValue(suffix)

  if (!normalizedSuffix) return true
  if (!normalizedDomainName) return false

  return normalizedDomainName === normalizedSuffix || normalizedDomainName.endsWith(`.${normalizedSuffix}`)
}

export function collectDomainSuffixOptions(domainNames: string[]): DomainSuffixOption[] {
  const context = createDomainSuffixContext(domainNames)
  const counts = new Map<string, number>()

  for (const domainName of domainNames) {
    const suffix = extractDomainSuffix(domainName, context)
    if (!suffix) continue
    counts.set(suffix, (counts.get(suffix) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count
      return left.value.localeCompare(right.value, 'zh-CN')
    })
}

export function buildDomainSuffixDistribution(domains: Domain[]): DomainSuffixDistributionItem[] {
  const context = createDomainSuffixContext(domains.map((domain) => domain.name))
  const groups = new Map<string, { value: number; domains: string[] }>()

  for (const domain of domains) {
    const suffix = extractDomainSuffix(domain.name, context)
    if (!suffix) continue

    const group = groups.get(suffix) ?? { value: 0, domains: [] }
    group.value += 1
    if (group.domains.length < SAMPLE_DOMAIN_LIMIT) {
      group.domains.push(domain.name)
    }
    groups.set(suffix, group)
  }

  return Array.from(groups.entries())
    .map(([suffix, group]) => ({
      name: suffix,
      value: group.value,
      domains: group.domains,
      suffix,
    }))
    .sort((left, right) => {
      if (right.value !== left.value) return right.value - left.value
      return left.name.localeCompare(right.name, 'zh-CN')
    })
}

function getDomainSegments(domainName: string) {
  return normalizeSuffixValue(domainName)
    .split('.')
    .filter(Boolean)
}
