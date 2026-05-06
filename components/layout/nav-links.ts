import type { LucideIcon } from 'lucide-react'
import { Activity, Globe, History, KeyRound, LayoutGrid, ListTree, Settings } from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

type NavGroup = {
  title: string
  items: NavItem[]
}

type SecondaryNavItem = {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

export const navGroups: NavGroup[] = [
  {
    title: '概览',
    items: [
      { href: '/dashboard', label: '监测看板', icon: Activity, exact: true },
    ],
  },
  {
    title: '管理',
    items: [
      { href: '/domains', label: '域名管理', icon: Globe },
      { href: '/sites', label: '站点管理', icon: LayoutGrid },
      { href: '/accounts', label: '账号管理', icon: KeyRound },
    ],
  },
  {
    title: '记录',
    items: [
      { href: '/logs', label: '操作日志', icon: History, exact: true },
      { href: '/job-runs', label: '任务执行', icon: ListTree, exact: true },
    ],
  },
]

export const secondaryNavItems: SecondaryNavItem[] = [
  { href: '/settings', label: '系统设置', icon: Settings },
]
