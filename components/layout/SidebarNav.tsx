'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { navGroups, secondaryNavItems } from '@/components/layout/nav-links'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type SidebarNavProps = {
  collapsed: boolean
  onNavigate?: () => void
}

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

function getNavItemClassName(collapsed: boolean, active: boolean) {
  return cn(
    'app-shell-nav-item group flex rounded-lg py-1.5 text-sm font-medium transition-colors',
    collapsed ? 'justify-center px-2' : 'items-center gap-2.5 px-2.5',
    active
      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
  )
}

function getNavIconClassName(active: boolean) {
  return cn(
    'flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors',
    active
      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
      : 'text-muted-foreground group-hover:text-sidebar-foreground',
  )
}

export function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <TooltipProvider>
      <nav className="flex h-full min-h-0 flex-col" aria-label="主导航">
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            {navGroups.map((group, index) => (
              <section key={group.title}>
                {collapsed && index > 0 ? (
                  <div className="mx-2 my-2 border-t border-sidebar-border/70" />
                ) : null}

                {!collapsed ? (
                  <div className="text-muted-foreground px-2.5 pt-1 pb-2 text-[11px] font-medium tracking-[0.16em] uppercase">
                    {group.title}
                  </div>
                ) : null}

                <ul role="list" className="space-y-1.5">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const active = isActive(pathname, item.href, item.exact)
                    const link = (
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={getNavItemClassName(collapsed, active)}
                        onClick={onNavigate}
                      >
                        <span className={getNavIconClassName(active)}>
                          <Icon size={12} />
                        </span>
                        {!collapsed ? <span className="app-shell-nav-label min-w-0 flex-1 truncate text-left">{item.label}</span> : null}
                      </Link>
                    )

                    return (
                      <li key={item.href}>
                        {collapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>{link}</TooltipTrigger>
                            <TooltipContent side="right">
                              <p>{item.label}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          link
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <section className="mt-4 shrink-0 border-t border-sidebar-border/70 pt-4">
          <ul role="list" className="space-y-1.5">
            {secondaryNavItems.map((item) => {
              const Icon = item.icon
              const active = isActive(pathname, item.href, item.exact)
              const link = (
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={getNavItemClassName(collapsed, active)}
                  onClick={onNavigate}
                >
                  <span className={getNavIconClassName(active)}>
                    <Icon size={12} />
                  </span>
                  {!collapsed ? <span className="app-shell-nav-label min-w-0 flex-1 truncate text-left">{item.label}</span> : null}
                </Link>
              )

              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      </nav>
    </TooltipProvider>
  )
}
