import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { getProjectTitles } from '@/lib/data/settings'
import { DARK_MODE_MEDIA_QUERY, THEME_MODE_STORAGE_KEY } from '@/lib/theme'

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'app-shell-sidebar-collapsed'

const sidebarStateScript = `(function(){try{var collapsed=window.localStorage.getItem('${SIDEBAR_COLLAPSED_STORAGE_KEY}')==='true';document.documentElement.dataset.sidebarCollapsed=collapsed?'true':'false';}catch(e){document.documentElement.dataset.sidebarCollapsed='false';}})();`
const themeModeScript = `(function(){try{var mode=window.localStorage.getItem('${THEME_MODE_STORAGE_KEY}')||'auto';var isDark=window.matchMedia('${DARK_MODE_MEDIA_QUERY}').matches;var theme=mode==='auto'?(isDark?'dark':'light'):mode;document.documentElement.classList.toggle('dark',theme==='dark');}catch(e){document.documentElement.classList.remove('dark');}})();`

const sidebarCollapsedStyle = `@media (min-width:1024px){html[data-sidebar-collapsed='true'] .app-shell-sidebar{width:5rem;}html[data-sidebar-collapsed='true'] .app-shell-main{padding-left:5rem;}html[data-sidebar-collapsed='true'] .app-shell-sidebar-header{justify-content:center;padding-left:0;padding-right:0;}html[data-sidebar-collapsed='true'] .app-shell-brand-text,html[data-sidebar-collapsed='true'] .app-shell-nav-group-title,html[data-sidebar-collapsed='true'] .app-shell-nav-label,html[data-sidebar-collapsed='true'] .app-shell-nav-meta{display:none;}html[data-sidebar-collapsed='true'] .app-shell-nav-item{justify-content:center;padding-left:.5rem;padding-right:.5rem;gap:0;}}`

export async function generateMetadata(): Promise<Metadata> {
  const { subtitle } = await getProjectTitles()
  return {
    title: subtitle,
    description: '域名管理与状态监测系统',
  }
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: sidebarStateScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeModeScript }} />
        <style dangerouslySetInnerHTML={{ __html: sidebarCollapsedStyle }} />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
