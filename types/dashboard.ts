export const DASHBOARD_TABS = ['domains', 'accounts', 'sites'] as const

export type DashboardTab = (typeof DASHBOARD_TABS)[number]

export const DEFAULT_DASHBOARD_TAB: DashboardTab = 'domains'

export function isDashboardTab(value?: string | null): value is DashboardTab {
  return DASHBOARD_TABS.includes(value as DashboardTab)
}

export function parseDashboardTab(value?: string | null): DashboardTab {
  return isDashboardTab(value) ? value : DEFAULT_DASHBOARD_TAB
}
