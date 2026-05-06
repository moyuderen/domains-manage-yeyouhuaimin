export const DOMAIN_HIDEABLE_COLUMNS = [
  { key: 'status', label: '状态' },
  { key: 'registrar', label: '注册站点' },
  { key: 'registrarAccount', label: '注册账号' },
  { key: 'expiryDate', label: '到期时间' },
  { key: 'dnsProvider', label: 'DNS 站点' },
  { key: 'dnsAccount', label: 'DNS 账号' },
  { key: 'remark', label: '备注' },
] as const

export type HideableDomainColumnKey = (typeof DOMAIN_HIDEABLE_COLUMNS)[number]['key']

export const DEFAULT_VISIBLE_DOMAIN_COLUMNS: HideableDomainColumnKey[] = DOMAIN_HIDEABLE_COLUMNS.map((column) => column.key)
