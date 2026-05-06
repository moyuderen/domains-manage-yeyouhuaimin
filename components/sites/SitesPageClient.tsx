'use client'

/* eslint-disable @next/next/no-img-element */

import { Globe, LayoutGrid, List, Pencil, Plus, RefreshCw, Star, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, useTransition } from 'react'

import { deleteSiteAction, toggleSiteActiveAction, addFavoriteSiteAction, removeFavoriteSiteAction, reorderFavoriteSitesAction } from '@/app/actions/sites'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { SiteCategoryCardView, type SiteCategoryGroup } from '@/components/sites/SiteCategoryCardView'
import { useRefreshWithSpin } from '@/hooks/useRefreshWithSpin'
import type { FavoriteSite } from '@/types/site'
import { SearchableSelect } from '@/components/searchable-select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Site } from '@/types/site'

import { SiteFormDialog } from './SiteFormDialog'

type SitesPageClientProps = {
  initialSites: Site[]
  total: number
  initialFavorites: FavoriteSite[]
}

type SiteViewMode = 'table' | 'card'

const UNCATEGORIZED_LABEL = '未分类'

export function SitesPageClient({ initialSites, total, initialFavorites }: SitesPageClientProps) {
  const [sites, setSites] = useState(initialSites)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [deletingSite, setDeletingSite] = useState<Site | null>(null)
  const [keyword, setKeyword] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<SiteViewMode>('card')
  const [isPending, startTransition] = useTransition()
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => initialFavorites.map((f) => f.siteId))
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds])
  const { spinning, refresh } = useRefreshWithSpin()

  useEffect(() => {
    setSites(initialSites)
  }, [initialSites])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    if (mq.matches) setViewMode('card')
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setViewMode('card') }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const site of sites) {
      if (site.category) set.add(site.category)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'))
  }, [sites])

  const filteredSites = useMemo(() => {
    const search = keyword.trim().toLowerCase()

    return sites.filter((site) => {
      const matchesKeyword = !search ||
        site.name.toLowerCase().includes(search) ||
        site.description.toLowerCase().includes(search) ||
        site.remark.toLowerCase().includes(search)
      const matchesCategory = selectedCategory === 'all' || site.category === selectedCategory
      return matchesKeyword && matchesCategory
    })
  }, [keyword, sites, selectedCategory])

  const groupedSites = useMemo<SiteCategoryGroup[]>(() => {
    const groups = new Map<string, Site[]>()

    for (const site of filteredSites) {
      const category = site.category || UNCATEGORIZED_LABEL
      const current = groups.get(category) ?? []
      current.push(site)
      groups.set(category, current)
    }

    return Array.from(groups.entries())
      .sort(([left], [right]) => left.localeCompare(right, 'zh-CN'))
      .map(([category, items]) => ({ category, items }))
  }, [filteredSites])

  const handleToggleActive = (siteId: string, checked: boolean) => {
    setSites((prev) =>
      prev.map((site) => (site.id === siteId ? { ...site, isActive: checked } : site)),
    )
    startTransition(async () => {
      try {
        await toggleSiteActiveAction(siteId, checked)
        toast.success(checked ? '站点已启用' : '站点已停用')
      } catch {
        setSites((prev) =>
          prev.map((site) => (site.id === siteId ? { ...site, isActive: !checked } : site)),
        )
        toast.error('状态切换失败')
      }
    })
  }

  const handleFormClose = (createdSite?: Site) => {
    setDialogOpen(false)
    setEditingSite(null)
    if (createdSite) {
      setSites((prev) => {
        const hasSite = prev.some((site) => site.id === createdSite.id)
        if (hasSite) {
          return prev.map((site) => (site.id === createdSite.id ? createdSite : site))
        }
        return [createdSite, ...prev]
      })
    }
  }

  const handleDelete = () => {
    if (!deletingSite) return
    startTransition(async () => {
      try {
        await deleteSiteAction(deletingSite.id)
        setSites((prev) => prev.filter((site) => site.id !== deletingSite.id))
        setFavoriteIds((prev) => prev.filter((id) => id !== deletingSite.id))
        setDeletingSite(null)
        toast.success('站点删除成功')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '删除失败')
      }
    })
  }

  const handleToggleFavorite = (siteId: string) => {
    const isFav = favoriteIdSet.has(siteId)
    setFavoriteIds((prev) =>
      isFav ? prev.filter((id) => id !== siteId) : [...prev, siteId],
    )
    startTransition(async () => {
      try {
        if (isFav) {
          await removeFavoriteSiteAction(siteId)
        } else {
          await addFavoriteSiteAction(siteId)
        }
      } catch {
        setFavoriteIds((prev) =>
          isFav ? [...prev, siteId] : prev.filter((id) => id !== siteId),
        )
        toast.error(isFav ? '取消常用失败' : '添加常用失败')
      }
    })
  }

  const handleReorderFavorites = (orderedSiteIds: string[]) => {
    setFavoriteIds(orderedSiteIds)
    startTransition(async () => {
      try {
        await reorderFavoriteSitesAction(orderedSiteIds)
      } catch {
        toast.error('排序保存失败')
      }
    })
  }

  return (
    <TooltipProvider>
      <div className="flex h-[calc(100dvh-3.5rem-2rem)] flex-col gap-6 md:h-[calc(100dvh-3.5rem-3rem)]">
        <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Input
                placeholder="搜索站点名称、描述或备注..."
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                className="max-w-sm"
              />
              <SearchableSelect
                value={selectedCategory}
                onValueChange={setSelectedCategory}
                placeholder="全部分类"
                searchPlaceholder="搜索分类..."
                className="w-[160px]"
                options={[
                  { label: '全部分类', value: 'all' },
                  ...categories.map((category) => ({ label: category, value: category })),
                ]}
              />
              <div className="text-sm text-muted-foreground">当前 {filteredSites.length} / 共 {total} 个站点</div>
            </div>
            <div className="flex items-center gap-2">
              <ToggleGroup type="single" value={viewMode} onValueChange={(value) => { if (value) setViewMode(value as SiteViewMode) }} variant="outline" size="sm" className="hidden md:flex">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem
                      value="table"
                      aria-label="表格视图"
                      className={cn(viewMode === 'table' && 'bg-accent text-accent-foreground')}
                    >
                      <List />
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>表格视图</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem
                      value="card"
                      aria-label="卡片视图"
                      className={cn(viewMode === 'card' && 'bg-accent text-accent-foreground')}
                    >
                      <LayoutGrid />
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>卡片视图</p>
                  </TooltipContent>
                </Tooltip>
              </ToggleGroup>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="icon" onClick={refresh} disabled={spinning} aria-label="刷新">
                    <RefreshCw size={16} className={spinning ? 'animate-spin' : ''} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>刷新</p>
                </TooltipContent>
              </Tooltip>
              <Button onClick={() => { setEditingSite(null); setDialogOpen(true) }}>
                <Plus data-icon="inline-start" />
                添加站点
              </Button>
            </div>
          </div>

          {/* Tabs: desktop toggles table/card, mobile always card via matchMedia */}
          <Tabs value={viewMode} className="min-h-0 flex-1 flex-col flex">
            <TabsContent value="table" className="mt-0 min-h-0 flex-1">
              {filteredSites.length === 0 ? (
                <EmptyState
                  title="暂无站点数据"
                  description="先添加注册站点或 DNS 站点，后续可在域名与账号管理中直接关联使用。"
                  action={<Button onClick={() => { setEditingSite(null); setDialogOpen(true) }}>添加站点</Button>}
                  fillHeight
                  className="h-full"
                />
              ) : (
                <Card className="flex min-h-0 h-full flex-1 flex-col gap-0 overflow-hidden p-0">
                  <div className="min-h-0 flex-1 [&>[data-slot=table-container]]:h-full [&>[data-slot=table-container]]:min-h-0 [&>[data-slot=table-container]]:overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="sticky top-0 z-30 bg-card hover:bg-card">
                          <TableHead className="min-w-[180px]">站点名称</TableHead>
                          <TableHead className="min-w-[80px]">分类</TableHead>
                          <TableHead className="min-w-[112px]">描述</TableHead>
                          <TableHead className="min-w-[112px]">备注</TableHead>
                          <TableHead className="min-w-[80px]">状态</TableHead>
                          <TableHead className="w-[100px] text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSites.map((site) => {
                          const isFav = favoriteIdSet.has(site.id)
                          return (
                          <TableRow key={site.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-start gap-2">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                                  {site.iconUrl ? (
                                    <img src={site.iconUrl} alt="" width={20} height={20} className="size-5 rounded object-contain" loading="lazy" />
                                  ) : (
                                    <Globe className="size-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="min-w-0 space-y-0.5">
                                  {site.websiteUrl ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <a href={site.websiteUrl} target="_blank" rel="noopener noreferrer" className="block truncate hover:underline">
                                          {site.name}
                                        </a>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{site.websiteUrl}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <span className="block truncate">{site.name}</span>
                                  )}
                                  <span className="block truncate text-xs font-normal text-muted-foreground">{site.websiteUrl || '-'}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {site.category ? (
                                <Badge variant="secondary">{site.category}</Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="min-w-[112px] max-w-[200px] truncate text-muted-foreground">{site.description || '-'}</TableCell>
                            <TableCell className="min-w-[112px] max-w-[200px] truncate text-muted-foreground">{site.remark || '-'}</TableCell>
                            <TableCell>
                              <Switch
                                checked={site.isActive}
                                onCheckedChange={(checked) => handleToggleActive(site.id, checked)}
                                className="data-[state=checked]:bg-primary dark:data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={cn('text-muted-foreground', isFav && 'text-amber-500 hover:text-amber-500')}
                                      onClick={() => handleToggleFavorite(site.id)}
                                      aria-label={isFav ? `取消常用 ${site.name}` : `添加常用 ${site.name}`}
                                    >
                                      <Star className={cn('size-4', isFav && 'fill-current')} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{isFav ? '取消常用' : '添加常用'}</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => { setEditingSite(site); setDialogOpen(true) }}
                                >
                                  <Pencil size={14} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeletingSite(site)}
                                  aria-label={`删除站点 ${site.name}`}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="card" className="mt-0 min-h-0 flex-1">
              <SiteCategoryCardView
                groups={groupedSites}
                favoriteIds={favoriteIds}
                onToggleFavorite={handleToggleFavorite}
                onReorderFavorites={handleReorderFavorites}
                onEdit={(site) => { setEditingSite(site); setDialogOpen(true) }}
                onDelete={setDeletingSite}
                onAdd={() => { setEditingSite(null); setDialogOpen(true) }}
              />
            </TabsContent>
          </Tabs>
        </div>

        <SiteFormDialog
          open={dialogOpen}
          initialValue={editingSite}
          onClose={(createdSite) => handleFormClose(createdSite)}
        />

        <ConfirmDialog
          open={Boolean(deletingSite)}
          title="删除站点"
          description={`确认删除 ${deletingSite?.name ?? ''} 吗？已有域名关联此站点的引用将被置空。`}
          onClose={() => setDeletingSite(null)}
          onConfirm={handleDelete}
          loading={isPending}
        />
      </div>
    </TooltipProvider>
  )
}
