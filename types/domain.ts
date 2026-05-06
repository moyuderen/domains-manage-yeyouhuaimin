export const DOMAIN_STATUS = ['normal', 'expiring', 'expired'] as const
export const DOMAIN_SORT_BY_OPTIONS = ['createdAt', 'updatedAt', 'suffix'] as const
export const DOMAIN_SORT_ORDER_OPTIONS = ['desc', 'asc'] as const
export const DOMAIN_CURRENCIES = ['CNY', 'USD', 'EUR', 'JPY', 'GBP'] as const

export type DomainStatus = (typeof DOMAIN_STATUS)[number]
export type DomainSortBy = (typeof DOMAIN_SORT_BY_OPTIONS)[number]
export type DomainSortOrder = (typeof DOMAIN_SORT_ORDER_OPTIONS)[number]
export type DomainCurrency = (typeof DOMAIN_CURRENCIES)[number]

export const DEFAULT_DOMAIN_SORT_BY: DomainSortBy = 'createdAt'
export const DEFAULT_DOMAIN_SORT_ORDER: DomainSortOrder = 'desc'

export type Subdomain = {
  id: string
  domainId: string
  subdomain: string
  ip: string
  ipRemark: string
  description: string
  remark: string
  createdAt: string
  updatedAt: string
}

export type Domain = {
  id: string
  name: string
  registrarAccountId: string | null
  registrarSiteId: string | null
  registrationDate: string | null
  expiryDate: string | null
  dnsAccountId: string | null
  dnsSiteId: string | null
  renewalDaysBeforeExpiry: number | null
  isFree: boolean
  currency: DomainCurrency
  purchasePrice: number | null
  renewalPrice: number | null
  autoRenewal: boolean
  remark: string
  createdAt: string
  updatedAt: string
  subdomains: Subdomain[]
}

export type DomainFormValues = {
  name: string
  registrarAccountId: string
  registrarSiteId: string
  registrationDate: string
  expiryDate: string
  dnsAccountId: string
  dnsSiteId: string
  renewalDaysBeforeExpiry: string
  isFree: string
  currency: DomainCurrency
  purchasePrice: string
  renewalPrice: string
  autoRenewal: string
  remark: string
}

export type DomainDialogMode = 'create' | 'edit' | 'clone'

export type SubdomainFormValues = {
  subdomain: string
  ip: string
  ipRemark: string
  description: string
  remark: string
}

export type DomainFilters = {
  keyword: string
  status: DomainStatus | 'all'
  registrarSiteId: string | 'all'
  dnsSiteId: string | 'all'
  sortBy: DomainSortBy
  sortOrder: DomainSortOrder
}

export type DomainListQuery = DomainFilters & {
  page: number
  pageSize: number
}

export type PaginatedDomains = {
  items: Domain[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type DomainRow = {
  id: string
  name: string
  registrar_account_id: string | null
  registrar_site_id: string | null
  registration_date: string | null
  expiry_date: string | null
  dns_account_id: string | null
  dns_site_id: string | null
  renewal_days_before_expiry: number | null
  is_free: boolean
  currency: string
  purchase_price: number | null
  renewal_price: number | null
  auto_renewal: boolean
  remark: string | null
  created_at: string
  updated_at: string
  subdomains?: SubdomainRow[]
}

export type SubdomainRow = {
  id: string
  domain_id: string
  subdomain: string
  ip: string
  ip_remark: string
  description: string
  remark: string
  created_at: string
  updated_at: string
}
