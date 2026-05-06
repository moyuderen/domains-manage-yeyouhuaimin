'use client'

import type { ReactNode } from 'react'
import { useEffect, useState, useTransition } from 'react'
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { logoutAction } from '@/app/actions/auth'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useSettingsStore } from '@/lib/stores/settings'
import { cn } from '@/lib/utils'

type AppShellProps = {
  children: ReactNode
  user: {
    displayName: string
    email: string
  }
}

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'app-shell-sidebar-collapsed'

export function AppShell({ children }: AppShellProps) {
  const router = useRouter()
  const projectTitles = useSettingsStore((s) => s.projectTitles)
  const [isPending, startTransition] = useTransition()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    const collapsed = document.documentElement.dataset.sidebarCollapsed === 'true'
      || window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true'
    document.documentElement.dataset.sidebarCollapsed = String(collapsed)
    return collapsed
  })

  useEffect(() => {
    document.documentElement.dataset.sidebarCollapsed = String(sidebarCollapsed)
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(sidebarCollapsed))
  }, [sidebarCollapsed])

  const handleLogout = () => {
    startTransition(async () => {
      try {
        await logoutAction()
        setMobileNavOpen(false)
        router.replace('/login')
        router.refresh()
        toast.success('已退出登录')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '退出登录失败')
      }
    })
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <aside
        className={cn(
          'app-shell-sidebar bg-sidebar/88 fixed inset-y-0 left-0 hidden flex-col border-r border-sidebar-border/70 px-3 pb-4 backdrop-blur-xl transition-[width] duration-200 lg:flex',
          sidebarCollapsed ? 'w-20' : 'w-56',
        )}
      >
        <div className={cn('app-shell-sidebar-header mb-5 flex h-14 items-center border-b border-sidebar-border/70', sidebarCollapsed ? 'justify-center px-0' : 'px-3')}>
          <div className="flex items-center gap-3">
            <Image src={projectTitles.icon} alt="Logo" width={36} height={36} className="h-9 w-9 rounded-lg" />
            {!sidebarCollapsed ? (
              <div className="app-shell-brand-text">
                <div className="text-sm font-semibold leading-none">{projectTitles.title}</div>
                <p className="text-muted-foreground mt-1 text-xs">{projectTitles.subtitle}</p>
              </div>
            ) : null}
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <SidebarNav collapsed={sidebarCollapsed} />
        </div>
      </aside>

      <main className={cn('app-shell-main transition-[padding] duration-200', sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-56')}>
        <div className="bg-background/80 sticky top-0 z-20 border-b border-border/70 backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileNavOpen((open) => !open)}
                aria-label={mobileNavOpen ? '关闭菜单' : '打开菜单'}
                title={mobileNavOpen ? '关闭菜单' : '打开菜单'}
              >
                <Menu />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="relative hidden lg:inline-flex"
                onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
                aria-label={sidebarCollapsed ? '展开菜单' : '收起菜单'}
                title={sidebarCollapsed ? '展开菜单' : '收起菜单'}
              >
                <span className="app-shell-toggle-icon app-shell-toggle-icon-open absolute inset-0 flex items-center justify-center"><PanelLeftOpen /></span>
                <span className="app-shell-toggle-icon app-shell-toggle-icon-close absolute inset-0 flex items-center justify-center"><PanelLeftClose /></span>
              </Button>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="bg-card/80 border-border/70 flex items-center rounded-xl border p-1 shadow-sm">
                <ThemeToggle />
              </div>
              <div className="bg-card/80 border-border/70 flex items-center rounded-xl border p-1 shadow-sm">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={handleLogout}
                        disabled={isPending}
                        aria-label={isPending ? '退出中...' : '退出登录'}
                      >
                        <LogOut size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isPending ? '退出中...' : '退出登录'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-72 p-0 sm:max-w-none">
            <SheetHeader className="border-sidebar-border/70 border-b px-4 py-3 text-left">
              <SheetTitle>导航菜单</SheetTitle>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              <div className="mb-5 flex h-14 items-center border-b border-sidebar-border/70 px-1">
                <div className="flex items-center gap-3">
                  <Image src={projectTitles.icon} alt="Logo" width={36} height={36} className="h-9 w-9 rounded-lg" />
                  <div>
                    <div className="text-sm font-semibold leading-none">{projectTitles.title}</div>
                    <p className="text-muted-foreground mt-1 text-xs">{projectTitles.subtitle}</p>
                  </div>
                </div>
              </div>
              <SidebarNav collapsed={false} onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <div className="w-full px-4 py-4 md:px-8 md:py-6">{children}</div>
      </main>
    </div>
  )
}
