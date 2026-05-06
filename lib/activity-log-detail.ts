import { currencyLabel, currencySymbol } from '@/lib/currency'
import { formatDate } from '@/lib/date'
import { EMAIL_PROVIDER_LABELS, type Account, type AccountFormValues, type EmailProvider, type SiteEntry } from '@/types/account'
import type { ActivityLogChange, ActivityLogDetail } from '@/types/activity-log'
import type { Domain, DomainCurrency, DomainFormValues } from '@/types/domain'
import type { Site, SiteFormValues } from '@/types/site'

type DisplayStage = 'before' | 'after'

type DisplayContext = {
  accountNamesById?: Map<string, string>
  siteNamesById?: Map<string, string>
  previousCurrency?: DomainCurrency
  nextCurrency?: DomainCurrency
}

type ChangeDescriptor<T> = {
  field: string
  label: string
  select: (value: T) => string
  display?: (value: string, stage: DisplayStage, context: DisplayContext) => string
}

type ChangeSummaryOptions = {
  limit?: number
  excludeFields?: string[]
}

type SettingsTitles = {
  title: string
  subtitle: string
  icon: string
}

const EMPTY_VALUE_LABEL = '未设置'
const CHANGE_DETAIL_TYPE = 'field_changes'
const DEFAULT_NOTIFICATION_CHANGE_LIMIT = 5

const domainChangeDescriptors: ChangeDescriptor<Domain>[] = [
  { field: 'name', label: '域名', select: (value) => value.name },
  { field: 'registrarSiteId', label: '注册站点', select: (value) => value.registrarSiteId ?? '', display: formatSiteDisplay },
  { field: 'registrarAccountId', label: '注册账号', select: (value) => value.registrarAccountId ?? '', display: formatAccountDisplay },
  { field: 'registrationDate', label: '注册时间', select: (value) => value.registrationDate ?? '', display: formatDateDisplay },
  { field: 'expiryDate', label: '到期时间', select: (value) => value.expiryDate ?? '', display: formatDateDisplay },
  { field: 'dnsSiteId', label: 'DNS 站点', select: (value) => value.dnsSiteId ?? '', display: formatSiteDisplay },
  { field: 'dnsAccountId', label: 'DNS 账号', select: (value) => value.dnsAccountId ?? '', display: formatAccountDisplay },
  { field: 'renewalDaysBeforeExpiry', label: '续费提前天数', select: (value) => value.renewalDaysBeforeExpiry == null ? '' : String(value.renewalDaysBeforeExpiry), display: formatDaysDisplay },
  { field: 'isFree', label: '域名类型', select: (value) => String(value.isFree), display: formatDomainTypeDisplay },
  { field: 'currency', label: '币种', select: (value) => value.currency, display: formatCurrencyDisplay },
  { field: 'purchasePrice', label: '购买金额', select: (value) => value.purchasePrice == null ? '' : String(value.purchasePrice), display: formatPriceDisplay },
  { field: 'renewalPrice', label: '续费金额', select: (value) => value.renewalPrice == null ? '' : String(value.renewalPrice), display: formatPriceDisplay },
  { field: 'autoRenewal', label: '自动续费', select: (value) => String(value.autoRenewal), display: formatAutoRenewalDisplay },
  { field: 'remark', label: '备注', select: (value) => value.remark },
]

const siteChangeDescriptors: ChangeDescriptor<Site>[] = [
  { field: 'name', label: '站点名称', select: (value) => value.name },
  { field: 'category', label: '分类', select: (value) => value.category },
  { field: 'websiteUrl', label: '网址', select: (value) => value.websiteUrl },
  { field: 'iconUrl', label: '图标地址', select: (value) => value.iconUrl },
  { field: 'description', label: '描述', select: (value) => value.description },
  { field: 'remark', label: '备注', select: (value) => value.remark },
  { field: 'isActive', label: '状态', select: (value) => String(value.isActive), display: formatActiveDisplay },
]

const accountChangeDescriptors: ChangeDescriptor<Account>[] = [
  { field: 'identifier', label: '账号标识', select: (value) => value.identifier },
  { field: 'email', label: '邮箱/手机号', select: (value) => value.email },
  { field: 'emailProvider', label: '账号类型', select: (value) => value.emailProvider, display: formatEmailProviderDisplay },
  { field: 'emailProviderDetail', label: '类型补充', select: (value) => value.emailProviderDetail },
  { field: 'sites', label: '关联站点', select: (value) => serializeAccountSites(value.sites), display: formatAccountSitesDisplay },
  { field: 'description', label: '描述', select: (value) => value.description },
  { field: 'isActive', label: '状态', select: (value) => String(value.isActive), display: formatActiveDisplay },
]

const settingsChangeDescriptors: ChangeDescriptor<SettingsTitles>[] = [
  { field: 'title', label: '项目标题', select: (value) => value.title },
  { field: 'subtitle', label: '项目副标题', select: (value) => value.subtitle },
  { field: 'icon', label: '项目图标', select: (value) => value.icon },
]

export function buildDomainUpdateDetail(
  previousDomain: Domain | null,
  nextDomain: Domain,
  lookups?: {
    accountNamesById?: Map<string, string>
    siteNamesById?: Map<string, string>
  },
) {
  return buildFieldChangeDetail(previousDomain, nextDomain, domainChangeDescriptors, {
    accountNamesById: lookups?.accountNamesById,
    siteNamesById: lookups?.siteNamesById,
    previousCurrency: previousDomain?.currency,
    nextCurrency: nextDomain.currency,
  })
}

export function buildDomainUpdateDetailFromForm(
  previousDomain: Domain | null,
  values: DomainFormValues,
  lookups?: {
    accountNamesById?: Map<string, string>
    siteNamesById?: Map<string, string>
  },
) {
  const nextDomain: Domain = {
    id: previousDomain?.id ?? '',
    name: values.name.trim(),
    registrarAccountId: values.registrarAccountId || null,
    registrarSiteId: values.registrarSiteId || null,
    registrationDate: values.registrationDate || null,
    expiryDate: values.expiryDate || null,
    dnsAccountId: values.dnsAccountId || null,
    dnsSiteId: values.dnsSiteId || null,
    renewalDaysBeforeExpiry: values.renewalDaysBeforeExpiry ? Number(values.renewalDaysBeforeExpiry) : null,
    isFree: values.isFree === 'true',
    currency: values.currency,
    purchasePrice: values.isFree !== 'true' && values.purchasePrice ? Number(values.purchasePrice) : null,
    renewalPrice: values.isFree !== 'true' && values.renewalPrice ? Number(values.renewalPrice) : null,
    autoRenewal: values.isFree !== 'true' && values.autoRenewal === 'true',
    remark: values.remark.trim(),
    createdAt: previousDomain?.createdAt ?? '',
    updatedAt: previousDomain?.updatedAt ?? '',
    subdomains: previousDomain?.subdomains ?? [],
  }

  return buildDomainUpdateDetail(previousDomain, nextDomain, lookups)
}

export function buildSiteUpdateDetail(previousSite: Site | null, nextSite: Site) {
  return buildFieldChangeDetail(previousSite, nextSite, siteChangeDescriptors)
}

export function buildSiteUpdateDetailFromForm(previousSite: Site | null, values: SiteFormValues) {
  const nextSite: Site = {
    id: previousSite?.id ?? '',
    name: values.name.trim(),
    category: values.category.trim(),
    iconUrl: values.iconUrl.trim(),
    description: values.description.trim(),
    remark: values.remark.trim(),
    websiteUrl: values.websiteUrl.trim(),
    isActive: values.isActive,
    createdAt: previousSite?.createdAt ?? '',
    updatedAt: previousSite?.updatedAt ?? '',
  }

  return buildSiteUpdateDetail(previousSite, nextSite)
}

export function buildAccountUpdateDetail(
  previousAccount: Account | null,
  nextAccount: Account,
  lookups?: { siteNamesById?: Map<string, string> },
) {
  return buildFieldChangeDetail(previousAccount, nextAccount, accountChangeDescriptors, {
    siteNamesById: lookups?.siteNamesById,
  })
}

export function buildAccountUpdateDetailFromForm(
  previousAccount: Account | null,
  values: AccountFormValues,
  lookups?: { siteNamesById?: Map<string, string> },
) {
  const nextAccount: Account = {
    id: previousAccount?.id ?? '',
    identifier: values.identifier.trim(),
    email: values.email.trim(),
    emailProvider: values.emailProvider,
    emailProviderDetail: values.emailProviderDetail.trim(),
    sites: values.sites,
    passwordHint: previousAccount?.passwordHint ?? '',
    vaultLocation: previousAccount?.vaultLocation ?? '',
    description: values.description.trim(),
    isActive: values.isActive,
    createdAt: previousAccount?.createdAt ?? '',
    updatedAt: previousAccount?.updatedAt ?? '',
  }

  return buildAccountUpdateDetail(previousAccount, nextAccount, lookups)
}

export function buildSettingsUpdateDetail(previousSettings: SettingsTitles, nextSettings: SettingsTitles) {
  return buildFieldChangeDetail(previousSettings, nextSettings, settingsChangeDescriptors)
}

export function getActivityLogChanges(detail: ActivityLogDetail): ActivityLogChange[] {
  const type = typeof detail.type === 'string' ? detail.type : ''
  if (type !== CHANGE_DETAIL_TYPE) {
    return []
  }

  const changes = detail.changes
  if (!Array.isArray(changes)) {
    return []
  }

  return changes.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return []
    }

    const record = item as Record<string, unknown>
    const field = typeof record.field === 'string' ? record.field : ''
    const label = typeof record.label === 'string' ? record.label : ''
    const before = typeof record.before === 'string' ? record.before : ''
    const after = typeof record.after === 'string' ? record.after : ''
    const displayBefore = typeof record.displayBefore === 'string' ? record.displayBefore : normalizeEmptyDisplay(before)
    const displayAfter = typeof record.displayAfter === 'string' ? record.displayAfter : normalizeEmptyDisplay(after)

    if (!field || !label) {
      return []
    }

    return [{
      field,
      label,
      before,
      after,
      displayBefore,
      displayAfter,
    } satisfies ActivityLogChange]
  })
}

export function buildChangeSummary(detail: ActivityLogDetail, options?: ChangeSummaryOptions) {
  const excludedFields = new Set(options?.excludeFields ?? [])
  const changes = getActivityLogChanges(detail).filter((change) => !excludedFields.has(change.field))
  if (changes.length === 0) {
    return []
  }

  const limit = options?.limit ?? DEFAULT_NOTIFICATION_CHANGE_LIMIT
  const summaryLines = changes
    .slice(0, limit)
    .map((change) => `${change.label}：${change.displayBefore} → ${change.displayAfter}`)

  if (changes.length > limit) {
    summaryLines.push(`其余 ${changes.length - limit} 项变更请前往日志查看`)
  }

  return summaryLines
}

function buildFieldChangeDetail<T>(
  previousValue: T | null,
  nextValue: T,
  descriptors: ChangeDescriptor<T>[],
  context: DisplayContext = {},
): ActivityLogDetail {
  const changes = descriptors.flatMap((descriptor) => {
    const before = previousValue ? normalizeChangeValue(descriptor.select(previousValue)) : ''
    const after = normalizeChangeValue(descriptor.select(nextValue))

    if (before === after) {
      return []
    }

    const display = descriptor.display ?? defaultDisplay

    return [{
      field: descriptor.field,
      label: descriptor.label,
      before,
      after,
      displayBefore: display(before, 'before', context),
      displayAfter: display(after, 'after', context),
    } satisfies ActivityLogChange]
  })

  return changes.length > 0
    ? {
        type: CHANGE_DETAIL_TYPE,
        changes,
      }
    : {}
}

function normalizeChangeValue(value: string) {
  return value.trim()
}

function defaultDisplay(value: string) {
  return normalizeEmptyDisplay(value)
}

function normalizeEmptyDisplay(value: string) {
  return value.trim() ? value.trim() : EMPTY_VALUE_LABEL
}

function formatDateDisplay(value: string) {
  return value ? formatDate(value) : EMPTY_VALUE_LABEL
}

function formatDaysDisplay(value: string) {
  return value ? `${value} 天` : EMPTY_VALUE_LABEL
}

function formatDomainTypeDisplay(value: string) {
  if (!value) return EMPTY_VALUE_LABEL
  return value === 'true' ? '免费' : '付费'
}

function formatAutoRenewalDisplay(value: string) {
  if (!value) return EMPTY_VALUE_LABEL
  return value === 'true' ? '已开启' : '未开启'
}

function formatActiveDisplay(value: string) {
  if (!value) return EMPTY_VALUE_LABEL
  return value === 'true' ? '启用' : '停用'
}

function formatCurrencyDisplay(value: string) {
  if (!value) return EMPTY_VALUE_LABEL
  return currencyLabel(value as DomainCurrency)
}

function formatPriceDisplay(value: string, stage: DisplayStage, context: DisplayContext) {
  if (!value) {
    return EMPTY_VALUE_LABEL
  }

  const amount = Number(value)
  if (!Number.isFinite(amount)) {
    return value
  }

  const currency = stage === 'before'
    ? context.previousCurrency ?? context.nextCurrency
    : context.nextCurrency ?? context.previousCurrency

  if (!currency) {
    return formatNumber(amount)
  }

  return `${currencySymbol(currency)}${formatNumber(amount)}`
}

function formatNumber(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

function formatAccountDisplay(value: string, _stage: DisplayStage, context: DisplayContext) {
  if (!value) {
    return EMPTY_VALUE_LABEL
  }

  return context.accountNamesById?.get(value) ?? value
}

function formatSiteDisplay(value: string, _stage: DisplayStage, context: DisplayContext) {
  if (!value) {
    return EMPTY_VALUE_LABEL
  }

  return context.siteNamesById?.get(value) ?? value
}

function formatEmailProviderDisplay(value: string) {
  if (!value) return EMPTY_VALUE_LABEL
  return EMAIL_PROVIDER_LABELS[value as EmailProvider] ?? value
}

function serializeAccountSites(entries: SiteEntry[]) {
  return JSON.stringify(entries.map((entry) => ({
    site: entry.site.trim(),
    note: entry.note.trim(),
    isActive: entry.isActive,
  })))
}

function formatAccountSitesDisplay(value: string, _stage: DisplayStage, context: DisplayContext) {
  if (!value) {
    return EMPTY_VALUE_LABEL
  }

  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return EMPTY_VALUE_LABEL
    }

    return parsed
      .flatMap((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return []
        }

        const record = item as Record<string, unknown>
        const siteId = typeof record.site === 'string' ? record.site.trim() : ''
        const note = typeof record.note === 'string' ? record.note.trim() : ''
        const isActive = typeof record.isActive === 'boolean' ? record.isActive : true

        if (!siteId) {
          return []
        }

        const fragments = [context.siteNamesById?.get(siteId) ?? siteId]
        if (note) {
          fragments.push(`备注：${note}`)
        }
        if (!isActive) {
          fragments.push('已停用')
        }

        return [fragments.join(' / ')]
      })
      .join('；') || EMPTY_VALUE_LABEL
  } catch {
    return value
  }
}
