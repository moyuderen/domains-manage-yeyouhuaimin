import type { Domain, DomainStatus } from '../types/domain'
import { differenceInDays } from './date'

export function getDomainStatus(expiryDate: string | null, expiryDays: number): DomainStatus {
  const remainingDays = differenceInDays(expiryDate)

  if (remainingDays == null) {
    return 'normal'
  }

  if (remainingDays < 0) {
    return 'expired'
  }

  if (remainingDays <= expiryDays) {
    return 'expiring'
  }

  return 'normal'
}

export function getStatusLabel(status: DomainStatus) {
  if (status === 'expired') return '已过期'
  if (status === 'expiring') return '即将到期'
  return '正常'
}

export function getStatusColor(status: DomainStatus) {
  if (status === 'expired') return 'border-destructive/15 bg-destructive/10 text-destructive'
  if (status === 'expiring') return 'border-amber-500/15 bg-amber-500/10 text-amber-700 dark:text-amber-300'
  return 'border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
}

export function formatExpiryCountdown(daysRemaining: number, unit = ' 天'): string {
  if (daysRemaining < 0) return `已过期 ${Math.abs(daysRemaining)}${unit}`
  if (daysRemaining === 0) return '今天到期'
  return `剩余 ${daysRemaining}${unit}`
}

export function getExpiryCountdownLabel(expiryDate: string | null) {
  const remainingDays = differenceInDays(expiryDate)

  if (remainingDays == null) {
    return null
  }

  return formatExpiryCountdown(remainingDays)
}

export function getExpiryCountdownColor(status: DomainStatus) {
  if (status === 'expired') return 'text-destructive'
  if (status === 'expiring') return 'text-amber-600 dark:text-amber-400'
  return 'text-muted-foreground'
}

export function sortDomainsByExpiry(domains: Domain[]) {
  return [...domains].sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0
    if (!a.expiryDate) return 1
    if (!b.expiryDate) return -1
    return a.expiryDate.localeCompare(b.expiryDate)
  })
}
