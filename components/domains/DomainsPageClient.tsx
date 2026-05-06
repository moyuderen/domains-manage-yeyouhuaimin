'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { deleteDomainAction, deleteDomainsAction } from '@/app/actions/domains'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { MobilePagination } from '@/components/common/MobilePagination'
import { DEFAULT_VISIBLE_DOMAIN_COLUMNS, type HideableDomainColumnKey } from '@/components/domains/domain-columns'
import { DomainCardList } from '@/components/domains/DomainCardList'
import { DomainDetailsDialog } from '@/components/domains/DomainDetailsDialog'
import { DomainFormDialog } from '@/components/domains/DomainFormDialog'
import { DomainTable } from '@/components/domains/DomainTable'
import { DomainToolbar } from '@/components/domains/DomainToolbar'
import { useRefreshWithSpin } from '@/hooks/useRefreshWithSpin'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { DEFAULT_DOMAIN_SORT_BY, DEFAULT_DOMAIN_SORT_ORDER, type Domain, type DomainDialogMode, type DomainFilters, type PaginatedDomains } from '@/types/domain'
import type { AccountLookup } from '@/lib/data/accounts'
import type { Account } from '@/types/account'
import type { Site } from '@/types/site'

const DOMAIN_COLUMNS_STORAGE_KEY = 'domains-visible-columns'

export function DomainsPageClient({ initialFilters, paginatedDomains, sites, linkSites, accounts, accountLookup, expiryDays }: { initialFilters: DomainFilters; paginatedDomains: PaginatedDomains; sites: Site[]; linkSites: Site[]; accounts: Account[]; accountLookup: AccountLookup; expiryDays: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const { spinning, refresh } = useRefreshWithSpin()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<DomainDialogMode>('create')
  const [activeDomain, setActiveDomain] = useState<Domain | null>(null)
  const [deletingDomain, setDeletingDomain] = useState<Domain | null>(null)
  const [selectedDomainIds, setSelectedDomainIds] = useState<string[]>([])
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<HideableDomainColumnKey[]>(DEFAULT_VISIBLE_DOMAIN_COLUMNS)
  const [detailDomain, setDetailDomain] = useState<Domain | null>(null)
  const [keywordInput, setKeywordInput] = useState(initialFilters.keyword)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const domains = paginatedDomains.items
  const selectedDomainIdSet = useMemo(() => new Set(selectedDomainIds), [selectedDomainIds])

  const selectedCount = useMemo(
    () => domains.filter((domain) => selectedDomainIdSet.has(domain.id)).length,
    [domains, selectedDomainIdSet],
  )

  useEffect(() => {
    const storedValue = window.localStorage.getItem(DOMAIN_COLUMNS_STORAGE_KEY)
    if (!storedValue) return

    try {
      const parsed = JSON.parse(storedValue)
      if (!Array.isArray(parsed)) return

      const validColumns = parsed.filter((column): column is HideableDomainColumnKey =>
        DEFAULT_VISIBLE_DOMAIN_COLUMNS.includes(column as HideableDomainColumnKey),
      )

      if (validColumns.length) setVisibleColumns(validColumns)
    } catch {
      window.localStorage.removeItem(DOMAIN_COLUMNS_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(DOMAIN_COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

  useEffect(() => {
    setKeywordInput(initialFilters.keyword)
  }, [initialFilters.keyword])

  useEffect(() => {
    if (keywordInput === initialFilters.keyword) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => updateSearchParams({ ...initialFilters, keyword: keywordInput }), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only trigger on keywordInput changes; guard prevents stale initialFilters from firing
  }, [keywordInput])

  const updateSearchParams = (nextFilters: DomainFilters, nextPage = 1, nextPageSize = paginatedDomains.pageSize) => {
    const params = new URLSearchParams(searchParams.toString())

    if (nextFilters.keyword.trim()) params.set('keyword', nextFilters.keyword.trim())
    else params.delete('keyword')

    if (nextFilters.status !== 'all') params.set('status', nextFilters.status)
    else params.delete('status')

    if (nextFilters.registrarSiteId !== 'all') params.set('registrarSiteId', nextFilters.registrarSiteId)
    else params.delete('registrarSiteId')

    if (nextFilters.dnsSiteId !== 'all') params.set('dnsSiteId', nextFilters.dnsSiteId)
    else params.delete('dnsSiteId')

    if (nextFilters.sortBy !== DEFAULT_DOMAIN_SORT_BY) params.set('sortBy', nextFilters.sortBy)
    else params.delete('sortBy')

    if (nextFilters.sortOrder !== DEFAULT_DOMAIN_SORT_ORDER) params.set('sortOrder', nextFilters.sortOrder)
    else params.delete('sortOrder')

    if (nextPage > 1) params.set('page', String(nextPage))
    else params.delete('page')

    if (nextPageSize > 10) params.set('pageSize', String(nextPageSize))
    else params.delete('pageSize')

    setSelectedDomainIds([])
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  const handleSelectDomain = (domainId: string, checked: boolean) => {
    setSelectedDomainIds((current) => checked ? [...current, domainId] : current.filter((id) => id !== domainId))
  }

  const handleSelectAllDomains = (checked: boolean) => {
    setSelectedDomainIds(checked ? domains.map((domain) => domain.id) : [])
  }

  const handleToggleColumn = (column: HideableDomainColumnKey) => {
    setVisibleColumns((current) => {
      if (current.includes(column)) {
        return current.length === 1 ? current : current.filter((item) => item !== column)
      }

      return [...current, column]
    })
  }

  const openDomainDialog = (mode: DomainDialogMode, domain: Domain | null = null) => {
    setDialogMode(mode)
    setActiveDomain(domain)
    setDialogOpen(true)
  }

  const paginationItems = buildPaginationItems(paginatedDomains.page, paginatedDomains.totalPages)
  const start = paginatedDomains.total === 0 ? 0 : (paginatedDomains.page - 1) * paginatedDomains.pageSize + 1
  const end = Math.min(paginatedDomains.page * paginatedDomains.pageSize, paginatedDomains.total)
  const pageSizeOptions = [10, 20, 50, 100]

  const paginationNode = (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="text-sm text-muted-foreground">
          显示第 {start}-{end} 条，共 {paginatedDomains.total} 条
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>每页</span>
          <Select value={String(paginatedDomains.pageSize)} onValueChange={(value) => updateSearchParams(initialFilters, 1, Number(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>{option} 条</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => { if (paginatedDomains.page > 1) updateSearchParams(initialFilters, paginatedDomains.page - 1) }}
            />
          </PaginationItem>

          {paginationItems.map((item, index) => (
            <PaginationItem key={`${item}-${index}`}>
              {item === 'ellipsis' ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  isActive={item === paginatedDomains.page}
                  onClick={() => updateSearchParams(initialFilters, item)}
                >
                  {item}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              onClick={() => { if (paginatedDomains.page < paginatedDomains.totalPages) updateSearchParams(initialFilters, paginatedDomains.page + 1) }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )

  const mobilePaginationNode = (
    <MobilePagination
      total={paginatedDomains.total}
      page={paginatedDomains.page}
      totalPages={paginatedDomains.totalPages}
      onPageChange={(page) => updateSearchParams(initialFilters, page)}
    />
  )

  return (
    <div className="flex h-[calc(100dvh-3.5rem-2rem)] flex-col gap-6 md:h-[calc(100dvh-3.5rem-3rem)]">
      <DomainToolbar
        filters={initialFilters}
        keywordInput={keywordInput}
        sites={sites}
        selectedCount={selectedCount}
        visibleColumns={visibleColumns}
        onKeywordChange={setKeywordInput}
        onFiltersChange={(filters) => updateSearchParams(filters)}
        onToggleColumn={handleToggleColumn}
        onAdd={() => openDomainDialog('create')}
        refreshing={spinning}
        onRefresh={() => {
          setSelectedDomainIds([])
          refresh()
        }}
        onDeleteSelected={() => {
          if (!selectedCount) return
          setBatchDeleteOpen(true)
        }}
      />

      {/* Desktop: Table */}
      <div className="hidden min-h-0 flex-1 md:flex md:flex-col">
        <DomainTable
          domains={domains}
          linkSites={linkSites}
          visibleColumns={visibleColumns}
          selectedDomainIds={selectedDomainIds}
          accountLookup={accountLookup}
          expiryDays={expiryDays}
          onSelectDomain={handleSelectDomain}
          onSelectAllDomains={handleSelectAllDomains}
          onViewDetail={(domain) => setDetailDomain(domain)}
          onEdit={(domain) => openDomainDialog('edit', domain)}
          onClone={(domain) => openDomainDialog('clone', domain)}
          onDelete={setDeletingDomain}
          pagination={paginationNode}
        />
      </div>

      {/* Mobile: Card list */}
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-0">
          <div className="min-h-0 flex-1 overflow-auto p-3">
            {domains.length === 0 ? (
              <EmptyState title="暂无域名数据" description="先添加一个域名，或从 JSON 文件导入已有数据。" fillHeight />
            ) : (
              <DomainCardList
                domains={domains}
                linkSites={linkSites}
                visibleColumns={visibleColumns}
                accountLookup={accountLookup}
                expiryDays={expiryDays}
                onViewDetail={(domain) => setDetailDomain(domain)}
                onEdit={(domain) => openDomainDialog('edit', domain)}
                onClone={(domain) => openDomainDialog('clone', domain)}
                onDelete={setDeletingDomain}
              />
            )}
          </div>
          {mobilePaginationNode}
        </Card>
      </div>

      <DomainFormDialog
        open={dialogOpen}
        mode={dialogMode}
        initialValue={activeDomain}
        sites={sites}
        accounts={accounts}
        onClose={(shouldRefresh) => {
          setDialogOpen(false)
          setDialogMode('create')
          setActiveDomain(null)
          if (shouldRefresh) router.refresh()
        }}
      />

      <ConfirmDialog
        open={Boolean(deletingDomain)}
        title="删除域名"
        description={`确认删除 ${deletingDomain?.name ?? ''} 吗？该域名下的子域名也会被一并删除。`}
        onClose={() => setDeletingDomain(null)}
        onConfirm={() => {
          if (!deletingDomain) return
          startTransition(async () => {
            try {
              await deleteDomainAction(deletingDomain.id)
              setDeletingDomain(null)
              setSelectedDomainIds((current) => current.filter((id) => id !== deletingDomain.id))
              router.refresh()
              toast.success('域名删除成功')
            } catch (error) {
              toast.error(error instanceof Error ? error.message : '删除失败')
            }
          })
        }}
        loading={isPending}
      />

      <ConfirmDialog
        open={batchDeleteOpen}
        title="批量删除域名"
        description={`确认删除已选中的 ${selectedCount} 个域名吗？这些域名下的子域名也会被一并删除。`}
        onClose={() => {
          if (isPending) return
          setBatchDeleteOpen(false)
        }}
        onConfirm={() => {
          if (!selectedDomainIds.length) return
          startTransition(async () => {
            try {
              await deleteDomainsAction(selectedDomainIds)
              setBatchDeleteOpen(false)
              setSelectedDomainIds([])
              router.refresh()
              toast.success('批量删除成功')
            } catch (error) {
              toast.error(error instanceof Error ? error.message : '删除失败')
            }
          })
        }}
        loading={isPending}
      />

      <DomainDetailsDialog
        open={Boolean(detailDomain)}
        domain={detailDomain}
        linkSites={linkSites}
        accountLookup={accountLookup}
        expiryDays={expiryDays}
        onClose={() => setDetailDomain(null)}
      />
    </div>
  )
}

function buildPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 'ellipsis', totalPages] as const
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const
  }

  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages] as const
}
