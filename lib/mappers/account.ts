import type { Account, AccountRow, EmailProvider, SiteEntry } from '@/types/account'

export function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    identifier: normalizeAccountIdentifier(row.identifier),
    email: row.email ?? '',
    emailProvider: normalizeEmailProvider(row.email_provider),
    emailProviderDetail: row.email_provider_detail ?? '',
    sites: normalizeAccountSites(row.sites),
    passwordHint: row.password_hint ?? '',
    vaultLocation: row.vault_location ?? '',
    description: row.description ?? '',
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function normalizeAccountIdentifier(identifier: string) {
  return identifier.trim()
}

function normalizeEmailProvider(value: string): EmailProvider {
  if (
    value === 'qq' ||
    value === '163' ||
    value === 'apple' ||
    value === 'google' ||
    value === 'hotmail' ||
    value === 'outlook' ||
    value === 'domain_mail' ||
    value === 'proton' ||
    value === 'phone' ||
    value === 'other'
  ) {
    return value
  }

  return 'other'
}

export function normalizeAccountSites(values: unknown): SiteEntry[] {
  if (!Array.isArray(values)) return []
  return values
    .filter((entry) => {
      if (typeof entry !== 'object' || entry === null) return false
      const obj = entry as Record<string, unknown>
      return typeof obj.site === 'string' && obj.site.trim().length > 0
    })
    .map((entry) => {
      const obj = entry as Record<string, unknown>
      return {
        site: (obj.site as string).trim(),
        note: typeof obj.note === 'string' ? obj.note.trim() : '',
        isActive: typeof obj.isActive === 'boolean' ? obj.isActive : true,
      }
    })
}
