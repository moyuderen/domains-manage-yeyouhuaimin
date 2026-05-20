import { describe, expect, it } from 'vitest'

import { buildDomainSuffixDistribution, collectDomainSuffixOptions, extractDomainSuffix, matchesDomainSuffix } from '@/lib/domainSuffix'
import type { Domain } from '@/types/domain'

const domains: Domain[] = [
  {
    id: '1',
    name: 'example.test',
    registrarAccountId: null,
    registrarSiteId: null,
    registrationDate: null,
    expiryDate: null,
    dnsAccountId: null,
    dnsSiteId: null,
    renewalDaysBeforeExpiry: null,
    isFree: false,
    currency: 'USD',
    purchasePrice: null,
    renewalPrice: null,
    autoRenewal: false,
    remark: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    subdomains: [],
  },
  {
    id: '2',
    name: 'www.example.test',
    registrarAccountId: null,
    registrarSiteId: null,
    registrationDate: null,
    expiryDate: null,
    dnsAccountId: null,
    dnsSiteId: null,
    renewalDaysBeforeExpiry: null,
    isFree: false,
    currency: 'USD',
    purchasePrice: null,
    renewalPrice: null,
    autoRenewal: false,
    remark: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    subdomains: [],
  },
  {
    id: '3',
    name: 'api.foo.zone.example',
    registrarAccountId: null,
    registrarSiteId: null,
    registrationDate: null,
    expiryDate: null,
    dnsAccountId: null,
    dnsSiteId: null,
    renewalDaysBeforeExpiry: null,
    isFree: false,
    currency: 'USD',
    purchasePrice: null,
    renewalPrice: null,
    autoRenewal: false,
    remark: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    subdomains: [],
  },
  {
    id: '4',
    name: 'foo.zone.example',
    registrarAccountId: null,
    registrarSiteId: null,
    registrationDate: null,
    expiryDate: null,
    dnsAccountId: null,
    dnsSiteId: null,
    renewalDaysBeforeExpiry: null,
    isFree: false,
    currency: 'USD',
    purchasePrice: null,
    renewalPrice: null,
    autoRenewal: false,
    remark: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    subdomains: [],
  },
  {
    id: '5',
    name: 'alpha.branch.example',
    registrarAccountId: null,
    registrarSiteId: null,
    registrationDate: null,
    expiryDate: null,
    dnsAccountId: null,
    dnsSiteId: null,
    renewalDaysBeforeExpiry: null,
    isFree: false,
    currency: 'USD',
    purchasePrice: null,
    renewalPrice: null,
    autoRenewal: false,
    remark: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    subdomains: [],
  },
  {
    id: '6',
    name: 'beta.forest.example',
    registrarAccountId: null,
    registrarSiteId: null,
    registrationDate: null,
    expiryDate: null,
    dnsAccountId: null,
    dnsSiteId: null,
    renewalDaysBeforeExpiry: null,
    isFree: false,
    currency: 'USD',
    purchasePrice: null,
    renewalPrice: null,
    autoRenewal: false,
    remark: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    subdomains: [],
  },
]

describe('domainSuffix', () => {
  it('matches single-segment suffixes', () => {
    expect(matchesDomainSuffix('www.a.test', 'test')).toBe(true)
    expect(matchesDomainSuffix('www.a.test', 'example')).toBe(false)
  })

  it('matches multi-segment suffixes', () => {
    expect(matchesDomainSuffix('api.foo.zone.example', 'zone.example')).toBe(true)
    expect(matchesDomainSuffix('api.foo.zone.example', 'example')).toBe(true)
    expect(matchesDomainSuffix('api.foo.zone.example', 'test')).toBe(false)
  })

  it('extracts suffixes using shared context', () => {
    const options = collectDomainSuffixOptions(domains.map((domain) => domain.name))
    expect(options.map((option) => option.value)).toContain('test')
    expect(options.map((option) => option.value)).toContain('zone.example')
    expect(options.map((option) => option.value)).toContain('branch.example')
    expect(options.map((option) => option.value)).toContain('forest.example')
    expect(extractDomainSuffix('www.example.test', createDomainSuffixContextForTest())).toBe('test')
    expect(extractDomainSuffix('alpha.branch.example', createDomainSuffixContextForTest())).toBe('branch.example')
    expect(extractDomainSuffix('beta.forest.example', createDomainSuffixContextForTest())).toBe('forest.example')
  })

  it('builds suffix distribution with up to ten sample domains', () => {
    const distribution = buildDomainSuffixDistribution(domains)
    expect(distribution.find((item) => item.suffix === 'test')).toMatchObject({ value: 2, domains: ['example.test', 'www.example.test'] })
    expect(distribution.find((item) => item.suffix === 'zone.example')).toMatchObject({ value: 2, domains: ['api.foo.zone.example', 'foo.zone.example'] })
    expect(distribution.find((item) => item.suffix === 'branch.example')).toMatchObject({ value: 1, domains: ['alpha.branch.example'] })
    expect(distribution.find((item) => item.suffix === 'forest.example')).toMatchObject({ value: 1, domains: ['beta.forest.example'] })
  })
})

function createDomainSuffixContextForTest() {
  return {
    twoSegmentDomains: new Set(['example.test']),
  }
}
