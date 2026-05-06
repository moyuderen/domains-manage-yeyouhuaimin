import type { DomainCurrency } from '@/types/domain'

const CURRENCY_LABELS: Record<DomainCurrency, string> = {
  CNY: 'CNY (¥)',
  USD: 'USD ($)',
  EUR: 'EUR (€)',
  JPY: 'JPY (¥)',
  GBP: 'GBP (£)',
}

const CURRENCY_SYMBOLS: Record<DomainCurrency, string> = {
  CNY: '¥',
  USD: '$',
  EUR: '€',
  JPY: '¥',
  GBP: '£',
}

export function currencyLabel(currency: DomainCurrency) {
  return CURRENCY_LABELS[currency]
}

export function currencySymbol(currency: DomainCurrency) {
  return CURRENCY_SYMBOLS[currency]
}
