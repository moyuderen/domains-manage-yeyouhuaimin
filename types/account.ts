export const EMAIL_PROVIDERS = ['qq', '163', 'apple', 'google', 'hotmail', 'outlook', 'domain_mail', 'proton', 'phone', 'other'] as const

export type EmailProvider = (typeof EMAIL_PROVIDERS)[number]

export type SiteEntry = {
  site: string
  note: string
  isActive: boolean
}

export const EMAIL_PROVIDER_LABELS: Record<EmailProvider, string> = {
  qq: 'QQ 邮箱',
  '163': '163 邮箱',
  apple: 'Apple 邮箱',
  google: 'Google 邮箱',
  hotmail: 'Hotmail 邮箱',
  outlook: 'Outlook 邮箱',
  domain_mail: '域名邮箱',
  proton: 'Proton 邮箱',
  phone: '手机号',
  other: '其他',
}

export type Account = {
  id: string
  identifier: string
  email: string
  emailProvider: EmailProvider
  emailProviderDetail: string
  sites: SiteEntry[]
  passwordHint: string
  vaultLocation: string
  description: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type AccountFormValues = {
  identifier: string
  email: string
  emailProvider: EmailProvider
  emailProviderDetail: string
  sites: SiteEntry[]
  passwordHint: string
  vaultLocation: string
  description: string
  isActive: boolean
}

export type AccountRow = {
  id: string
  identifier: string
  email: string | null
  email_provider: string
  email_provider_detail: string | null
  sites: { site: string; note: string; isActive: boolean }[]
  password_hint: string | null
  vault_location: string | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AccountFilters = {
  keyword: string
  emailProvider: EmailProvider | 'all'
  site: string | 'all'
  isActive: boolean | 'all'
}

export type AccountListQuery = AccountFilters & {
  page: number
  pageSize: number
}

export type PaginatedAccounts = {
  items: Account[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
