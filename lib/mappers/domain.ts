import type { Domain, DomainCurrency, DomainRow, SubdomainRow } from '@/types/domain'

export function mapSubdomain(row: SubdomainRow) {
  return {
    id: row.id,
    domainId: row.domain_id,
    subdomain: row.subdomain,
    ip: row.ip,
    ipRemark: row.ip_remark ?? '',
    description: row.description,
    remark: row.remark ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapDomain(row: DomainRow): Domain {
  return {
    id: row.id,
    name: row.name,
    registrarAccountId: row.registrar_account_id ?? null,
    registrarSiteId: row.registrar_site_id ?? null,
    registrationDate: row.registration_date,
    expiryDate: row.expiry_date,
    dnsAccountId: row.dns_account_id ?? null,
    dnsSiteId: row.dns_site_id ?? null,
    renewalDaysBeforeExpiry: row.renewal_days_before_expiry ?? null,
    isFree: row.is_free,
    currency: row.currency as DomainCurrency,
    purchasePrice: row.purchase_price ?? null,
    renewalPrice: row.renewal_price ?? null,
    autoRenewal: row.auto_renewal,
    remark: row.remark ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    subdomains: (row.subdomains ?? []).map(mapSubdomain),
  }
}

export function normalizeDomainName(name: string) {
  return name.trim().toLowerCase()
}
