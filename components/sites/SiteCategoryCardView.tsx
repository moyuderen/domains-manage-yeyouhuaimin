'use client'

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Globe, GripVertical, Pencil, Star, Trash2 } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { EmptyState } from '@/components/common/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Site } from '@/types/site'

export type SiteCategoryGroup = {
  category: string
  items: Site[]
}

type SiteCategoryCardViewProps = {
  groups: SiteCategoryGroup[]
  favoriteIds: string[]
  onToggleFavorite: (siteId: string) => void
  onReorderFavorites: (orderedSiteIds: string[]) => void
  onEdit: (site: Site) => void
  onDelete: (site: Site) => void
  onAdd?: () => void
}

type SiteCategorySection = SiteCategoryGroup & {
  id: string
}

const FAVORITES_SECTION_ID = 'site-category-favorites'
const SECTION_VIEWPORT_OFFSET = 16
const SECTION_BOTTOM_THRESHOLD = 8
const SECTION_SCROLL_MARGIN_CLASS = 'scroll-mt-4'

function getSectionId(category: string) {
  const slug = category
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

  return `site-category-${slug || 'group'}`
}

function useScrollSpy(ids: string[], scrollRef: RefObject<HTMLDivElement | null>) {
  const [observedActiveId, setObservedActiveId] = useState(ids[0] ?? '')

  useEffect(() => {
    const scrollContainer = scrollRef.current
    if (ids.length <= 1 || !scrollContainer) return

    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section instanceof HTMLElement)

    if (!sections.length) return

    const updateActiveId = () => {
      if (!scrollContainer) return

      const isNearBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - SECTION_BOTTOM_THRESHOLD

      if (isNearBottom) {
        setObservedActiveId(sections[sections.length - 1]?.id ?? '')
        return
      }

      const containerRect = scrollContainer.getBoundingClientRect()
      const passedSections = sections.filter(
        (section) => section.getBoundingClientRect().top <= containerRect.top + SECTION_VIEWPORT_OFFSET,
      )

      if (passedSections.length) {
        setObservedActiveId(passedSections[passedSections.length - 1]?.id ?? '')
      } else {
        setObservedActiveId(sections[0]?.id ?? '')
      }
    }

    const observer = new IntersectionObserver(updateActiveId, {
      root: scrollContainer,
      rootMargin: `-${SECTION_VIEWPORT_OFFSET}px 0px -60% 0px`,
    })

    for (const section of sections) {
      observer.observe(section)
    }

    scrollContainer.addEventListener('scroll', updateActiveId, { passive: true })
    window.addEventListener('resize', updateActiveId)
    updateActiveId()

    return () => {
      observer.disconnect()
      scrollContainer.removeEventListener('scroll', updateActiveId)
      window.removeEventListener('resize', updateActiveId)
    }
  }, [ids, scrollRef])

  return ids.includes(observedActiveId) ? observedActiveId : (ids[0] ?? '')
}

function SortableFavoriteItem({
  site,
  onToggleFavorite,
}: {
  site: Site
  onToggleFavorite: (siteId: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: site.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex min-w-0 items-start justify-between gap-3 rounded-lg border bg-background px-3 py-2.5 shadow-xs transition-colors duration-200 hover:bg-accent/40',
        isDragging && 'z-50 shadow-md opacity-90',
      )}
    >
      <button
        type="button"
        className="mt-1 shrink-0 cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      {site.websiteUrl ? (
        <a
          href={site.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 flex-1 items-start gap-3"
        >
          <SiteItemContent site={site} />
        </a>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <SiteItemContent site={site} />
        </div>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-amber-500 hover:text-amber-500"
            onClick={() => onToggleFavorite(site.id)}
            aria-label={`取消常用 ${site.name}`}
          >
            <Star className="fill-current" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>取消常用</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

function SiteItemContent({ site }: { site: Site }) {
  return (
    <>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        {site.iconUrl ? (
          <img src={site.iconUrl} alt="" width={24} height={24} className="size-6 rounded object-contain" loading="lazy" />
        ) : (
          <Globe className="text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <span className="block truncate font-medium text-foreground">{site.name}</span>
        <span className="block truncate text-xs text-muted-foreground">{site.websiteUrl || '-'}</span>
      </div>
    </>
  )
}

export function SiteCategoryCardView({
  groups,
  favoriteIds,
  onToggleFavorite,
  onReorderFavorites,
  onEdit,
  onDelete,
  onAdd,
}: SiteCategoryCardViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const sections = useMemo<SiteCategorySection[]>(
    () => groups.map((group) => ({ ...group, id: getSectionId(group.category) })),
    [groups],
  )

  const allSites = useMemo(() => groups.flatMap((g) => g.items), [groups])
  const siteMap = useMemo(() => new Map(allSites.map((s) => [s.id, s])), [allSites])
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds])
  const favoriteSites = useMemo(
    () => favoriteIds.map((id) => siteMap.get(id)).filter((s): s is Site => !!s),
    [favoriteIds, siteMap],
  )

  const navItems = useMemo(() => {
    const items: { id: string; label: string; count: number }[] = []
    if (favoriteSites.length > 0) {
      items.push({ id: FAVORITES_SECTION_ID, label: '常用站点', count: favoriteSites.length })
    }
    for (const section of sections) {
      items.push({ id: section.id, label: section.category, count: section.items.length })
    }
    return items
  }, [favoriteSites, sections])

  const navIds = useMemo(() => navItems.map((item) => item.id), [navItems])
  const activeId = useScrollSpy(navIds, scrollRef)
  const showAnchorNav = navItems.length > 1

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = favoriteSites.findIndex((s) => s.id === active.id)
      const newIndex = favoriteSites.findIndex((s) => s.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = arrayMove(favoriteSites, oldIndex, newIndex)
      onReorderFavorites(reordered.map((s) => s.id))
    },
    [favoriteSites, onReorderFavorites],
  )

  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id)
    const container = scrollRef.current
    if (element && container) {
      const containerRect = container.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()
      container.scrollTo({
        top: container.scrollTop + elementRect.top - containerRect.top - 8,
        behavior: 'smooth',
      })
    }
  }, [])

  if (!sections.length && !favoriteSites.length) {
    return <EmptyState title="暂无站点数据" description="请调整筛选条件，或先添加一个站点。" action={onAdd ? <Button onClick={onAdd}>添加站点</Button> : undefined} fillHeight className="h-full" />
  }

  return (
    <div className="flex min-h-0 h-full gap-4 lg:gap-6">
      {showAnchorNav ? (
        <nav className="hidden w-44 shrink-0 lg:block overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeId === item.id
              const isFavorite = item.id === FAVORITES_SECTION_ID

              return (
                <Button
                  key={item.id}
                  type="button"
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'w-full justify-between gap-2 px-3',
                    !isActive && !isFavorite && 'text-muted-foreground',
                    isFavorite && 'text-amber-600 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-400',
                  )}
                  onClick={() => scrollToSection(item.id)}
                >
                  <span className="truncate">{item.label}</span>
                  <Badge variant="secondary" className="shrink-0">
                    {item.count}
                  </Badge>
                </Button>
              )
            })}
          </div>
        </nav>
      ) : null}

      <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto">
        <div className="space-y-4">
          {favoriteSites.length > 0 && (
            <section id={FAVORITES_SECTION_ID} className={SECTION_SCROLL_MARGIN_CLASS}>
              <Card className="border-0 shadow-none">
                <CardHeader className="flex flex-row items-center gap-2">
                  <Star className="size-4 fill-amber-500 text-amber-500" />
                  <CardTitle>常用站点</CardTitle>
                  <Badge variant="secondary">{favoriteSites.length} 个站点</Badge>
                </CardHeader>
                <CardContent className="pt-0">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={favoriteSites.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(220px,280px))]">
                        {favoriteSites.map((site) => (
                          <SortableFavoriteItem
                            key={site.id}
                            site={site}
                            onToggleFavorite={onToggleFavorite}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </CardContent>
              </Card>
            </section>
          )}

          {sections.map((section) => (
            <section key={section.id} id={section.id} className={SECTION_SCROLL_MARGIN_CLASS}>
              <Card className="border-0 shadow-none">
                <CardHeader className="flex flex-row items-center gap-2">
                  <CardTitle>{section.category}</CardTitle>
                  <Badge variant="secondary">{section.items.length} 个站点</Badge>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(220px,280px))]">
                    {section.items.map((site) => {
                      const isFav = favoriteIdSet.has(site.id)

                      return (
                        <div key={site.id} className="group flex min-w-0 items-start justify-between gap-3 rounded-lg border bg-background px-3 py-2.5 shadow-xs transition-colors duration-200 hover:bg-accent/40">
                          {site.websiteUrl ? (
                            <a
                              href={site.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex min-w-0 flex-1 items-start gap-3"
                            >
                              <SiteItemContent site={site} />
                            </a>
                          ) : (
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <SiteItemContent site={site} />
                            </div>
                          )}
                          <div className="flex shrink-0 items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  className={cn(isFav ? 'text-amber-500 hover:text-amber-500' : 'opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100')}
                                  onClick={() => onToggleFavorite(site.id)}
                                  aria-label={isFav ? `取消常用 ${site.name}` : `添加常用 ${site.name}`}
                                >
                                  <Star className={cn(isFav && 'fill-current')} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{isFav ? '取消常用' : '添加常用'}</p>
                              </TooltipContent>
                            </Tooltip>
                            <div className="opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon-xs" aria-label={`编辑站点 ${site.name}`} onClick={() => onEdit(site)}>
                                    <Pencil />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>编辑</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon-xs" className="text-destructive hover:text-destructive" aria-label={`删除站点 ${site.name}`} onClick={() => onDelete(site)}>
                                    <Trash2 />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>删除</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
