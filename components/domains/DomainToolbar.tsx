'use client'

import { Plus, RefreshCw, Search, Settings2, Trash2 } from 'lucide-react'

import { DOMAIN_HIDEABLE_COLUMNS, type HideableDomainColumnKey } from '@/components/domains/domain-columns'
import { SearchableSelect } from '@/components/searchable-select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { DomainFilters } from '@/types/domain'
import type { Site } from '@/types/site'

type DomainToolbarProps = {
  filters: DomainFilters
  keywordInput: string
  sites: Site[]
  selectedCount: number
  visibleColumns: HideableDomainColumnKey[]
  onKeywordChange: (keyword: string) => void
  onFiltersChange: (filters: DomainFilters) => void
  onToggleColumn: (column: HideableDomainColumnKey) => void
  onAdd: () => void
  refreshing?: boolean
  onRefresh: () => void
  onDeleteSelected: () => void
}

const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '正常', value: 'normal' },
  { label: '即将到期', value: 'expiring' },
  { label: '已过期', value: 'expired' },
] as const

const sortByOptions = [
  { label: '创建时间', value: 'createdAt' },
  { label: '更新时间', value: 'updatedAt' },
  { label: '域名后缀', value: 'suffix' },
] as const

const sortOrderOptions = [
  { label: '降序', value: 'desc' },
  { label: '升序', value: 'asc' },
] as const

export function DomainToolbar({ filters, keywordInput, sites, selectedCount, visibleColumns, onKeywordChange, onFiltersChange, onToggleColumn, onAdd, refreshing, onRefresh, onDeleteSelected }: DomainToolbarProps) {
  return (
    <TooltipProvider>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative w-full max-w-[16rem] min-w-0">
            <Search size={16} className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2" />
            <Input
              className="pl-9"
              value={keywordInput}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="搜索域名 / 注册站点 / 注册账号 / DNS 站点 / DNS 账号"
            />
          </label>
          <Select value={filters.status} onValueChange={(value) => onFiltersChange({ ...filters, status: value as DomainFilters['status'] })}>
            <SelectTrigger className="w-[8rem]">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {statusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectGroup>
            </SelectContent>
          </Select>
          <SearchableSelect
            value={filters.registrarSiteId}
            onValueChange={(value) => onFiltersChange({ ...filters, registrarSiteId: value })}
            placeholder="全部注册站点"
            searchPlaceholder="搜索注册站点..."
            className="w-[11rem]"
            options={[
              { label: '全部注册站点', value: 'all' },
              ...sites.map((site) => ({ label: site.name, value: site.id })),
            ]}
          />
          <SearchableSelect
            value={filters.dnsSiteId}
            onValueChange={(value) => onFiltersChange({ ...filters, dnsSiteId: value })}
            placeholder="全部 DNS 站点"
            searchPlaceholder="搜索 DNS 站点..."
            className="w-[11rem]"
            options={[
              { label: '全部 DNS 站点', value: 'all' },
              ...sites.map((site) => ({ label: site.name, value: site.id })),
            ]}
          />
        </div>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filters.sortBy} onValueChange={(value) => onFiltersChange({ ...filters, sortBy: value as DomainFilters['sortBy'] })}>
              <SelectTrigger className="w-[8rem]">
                <SelectValue placeholder="排序字段" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {sortByOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={filters.sortOrder} onValueChange={(value) => onFiltersChange({ ...filters, sortOrder: value as DomainFilters['sortOrder'] })}>
              <SelectTrigger className="w-[7rem]">
                <SelectValue placeholder="排序方向" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {sortOrderOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {selectedCount > 0 ? (
              <>
                <Badge variant="secondary">已选 {selectedCount} 项</Badge>
                <Button variant="destructive" onClick={onDeleteSelected}><Trash2 size={16} className="mr-2" />批量删除</Button>
              </>
            ) : null}
            <Tooltip>
              <Popover>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      aria-label="显示字段"
                    >
                      <Settings2 size={16} />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <PopoverContent align="end">
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium">选择显示字段</div>
                      <p className="text-muted-foreground mt-1 text-xs">刷新页面后会保留你的选择</p>
                    </div>
                    <div className="space-y-2">
                      {DOMAIN_HIDEABLE_COLUMNS.map((column) => {
                        const checked = visibleColumns.includes(column.key)
                        return (
                          <label key={column.key} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                            <span>{column.label}</span>
                            <Checkbox checked={checked} aria-label={`切换显示字段 ${column.label}`} onCheckedChange={() => onToggleColumn(column.key)} />
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <TooltipContent>
                <p>显示字段</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={onRefresh}
                  disabled={refreshing}
                  aria-label="刷新"
                >
                  <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>刷新</p>
              </TooltipContent>
            </Tooltip>
            <Button onClick={onAdd}><Plus size={16} className="mr-2" />添加域名</Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
