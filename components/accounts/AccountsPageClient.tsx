'use client'

import Link from 'next/link'
import { Globe, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { deleteAccountAction, toggleAccountActiveAction, updateAccountSitesAction } from '@/app/actions/accounts'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { MobilePagination } from '@/components/common/MobilePagination'
import { AccountCardList } from '@/components/accounts/AccountCardList'
import { AccountFormDialog } from '@/components/accounts/AccountFormDialog'
import { useRefreshWithSpin } from '@/hooks/useRefreshWithSpin'
import { SearchableSelect } from '@/components/searchable-select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { EMAIL_PROVIDER_LABELS, type Account, type AccountFilters, type EmailProvider, type PaginatedAccounts, type SiteEntry } from '@/types/account'
import { isEmail } from '@/schemas/accountSchemas'
import type { Site } from '@/types/site'

const EMAIL_PROVIDER_OPTIONS: Array<{ label: string; value: EmailProvider | 'all' }> = [
  { label: '全部账号类型', value: 'all' },
  ...Object.entries(EMAIL_PROVIDER_LABELS).map(([value, label]) => ({ value: value as EmailProvider, label })),
]

const STATUS_OPTIONS = [
  { label: '全部状态', value: 'all' },
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
] as const

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

type AccountsPageClientProps = {
  initialFilters: AccountFilters
  paginatedAccounts: PaginatedAccounts
  usedSites: { id: string; name: string }[]
  sites: Site[]
  emailIdentifiers: string[]
}

export function AccountsPageClient({ initialFilters, paginatedAccounts, usedSites, sites, emailIdentifiers }: AccountsPageClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState(paginatedAccounts.items)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null)
  const [siteAccount, setSiteAccount] = useState<Account | null>(null)
  const [isPending, startTransition] = useTransition()
  const [keywordInput, setKeywordInput] = useState(initialFilters.keyword)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const { spinning, refresh } = useRefreshWithSpin()

  const siteNamesById = useMemo(() => new Map(sites.map((site) => [site.id, site.name])), [sites])
  const siteOptions = [
    { label: '全部站点', value: 'all' },
    ...usedSites.map((site) => ({ label: site.name, value: site.id })),
  ]

  useEffect(() => {
    setAccounts(paginatedAccounts.items)
  }, [paginatedAccounts.items])

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

  const updateSearchParams = (nextFilters: AccountFilters, nextPage = 1, nextPageSize = paginatedAccounts.pageSize) => {
    const params = new URLSearchParams(searchParams.toString())

    if (nextFilters.keyword.trim()) params.set('keyword', nextFilters.keyword.trim())
    else params.delete('keyword')

    if (nextFilters.emailProvider !== 'all') params.set('emailProvider', nextFilters.emailProvider)
    else params.delete('emailProvider')

    if (nextFilters.site !== 'all') params.set('site', nextFilters.site)
    else params.delete('site')

    if (nextFilters.isActive !== 'all') params.set('isActive', nextFilters.isActive ? 'active' : 'inactive')
    else params.delete('isActive')

    if (nextPage > 1) params.set('page', String(nextPage))
    else params.delete('page')

    if (nextPageSize !== 10) params.set('pageSize', String(nextPageSize))
    else params.delete('pageSize')

    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  const handleToggleActive = (accountId: string, checked: boolean) => {
    setAccounts((prev) => prev.map((account) => account.id === accountId ? { ...account, isActive: checked } : account))
    startTransition(async () => {
      try {
        await toggleAccountActiveAction(accountId, checked)
        toast.success(checked ? '账号已启用' : '账号已停用')
      } catch {
        setAccounts((prev) => prev.map((account) => account.id === accountId ? { ...account, isActive: !checked } : account))
        toast.error('状态切换失败')
      }
    })
  }

  const handleDelete = () => {
    if (!deletingAccount) return

    startTransition(async () => {
      try {
        await deleteAccountAction(deletingAccount.id)
        setDeletingAccount(null)
        router.refresh()
        toast.success('账号删除成功')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '删除失败')
      }
    })
  }

  const handleSaveSites = (accountId: string, nextSites: SiteEntry[]) => {
    startTransition(async () => {
      try {
        await updateAccountSitesAction(accountId, nextSites)
        setAccounts((prev) => prev.map((a) => a.id === accountId ? { ...a, sites: nextSites } : a))
        setSiteAccount(null)
        toast.success('站点已更新')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '更新失败')
      }
    })
  }

  const paginationItems = buildPaginationItems(paginatedAccounts.page, paginatedAccounts.totalPages)
  const start = paginatedAccounts.total === 0 ? 0 : (paginatedAccounts.page - 1) * paginatedAccounts.pageSize + 1
  const end = Math.min(paginatedAccounts.page * paginatedAccounts.pageSize, paginatedAccounts.total)

  const paginationNode = (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="text-sm text-muted-foreground">
          显示第 {start}-{end} 条，共 {paginatedAccounts.total} 条
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>每页</span>
          <Select value={String(paginatedAccounts.pageSize)} onValueChange={(value) => updateSearchParams(initialFilters, 1, Number(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((option) => (
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
              onClick={() => { if (paginatedAccounts.page > 1) updateSearchParams(initialFilters, paginatedAccounts.page - 1) }}
            />
          </PaginationItem>

          {paginationItems.map((item, index) => (
            <PaginationItem key={`${item}-${index}`}>
              {item === 'ellipsis' ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  isActive={item === paginatedAccounts.page}
                  onClick={() => updateSearchParams(initialFilters, item)}
                >
                  {item}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              onClick={() => { if (paginatedAccounts.page < paginatedAccounts.totalPages) updateSearchParams(initialFilters, paginatedAccounts.page + 1) }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )

  const mobilePaginationNode = (
    <MobilePagination
      total={paginatedAccounts.total}
      page={paginatedAccounts.page}
      totalPages={paginatedAccounts.totalPages}
      onPageChange={(page) => updateSearchParams(initialFilters, page)}
    />
  )

  return (
    <div className="flex h-[calc(100dvh-3.5rem-2rem)] flex-col gap-6 md:h-[calc(100dvh-3.5rem-3rem)]">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="max-w-xs"
          placeholder="搜索账号 / 备注"
          value={keywordInput}
          onChange={(event) => setKeywordInput(event.target.value)}
        />
        <Select value={initialFilters.emailProvider} onValueChange={(value) => updateSearchParams({ ...initialFilters, emailProvider: value as AccountFilters['emailProvider'] })}>
          <SelectTrigger className="w-[11rem]">
            <SelectValue placeholder="全部账号类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {EMAIL_PROVIDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <SearchableSelect
          value={initialFilters.site}
          onValueChange={(value) => updateSearchParams({ ...initialFilters, site: value as AccountFilters['site'] })}
          placeholder="全部站点"
          searchPlaceholder="搜索站点..."
          className="w-[10rem]"
          options={siteOptions}
        />
        <Select value={initialFilters.isActive === 'all' ? 'all' : initialFilters.isActive ? 'active' : 'inactive'} onValueChange={(value) => updateSearchParams({ ...initialFilters, isActive: value === 'all' ? 'all' : value === 'active' })}>
          <SelectTrigger className="w-[8rem]">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <TooltipProvider>
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
          </TooltipProvider>
          <Button onClick={() => { setEditingAccount(null); setDialogOpen(true) }}>
            <Plus data-icon="inline-start" />
            添加账号
          </Button>
        </div>
      </div>

      {/* Desktop: Table */}
      <div className="hidden min-h-0 flex-1 md:flex md:flex-col">
        {accounts.length === 0 ? (
          <EmptyState
            title="暂无账号数据"
            description="先添加可复用账号，后续可在域名、DNS、GitHub 等站点中直接选择。"
            action={<Button onClick={() => { setEditingAccount(null); setDialogOpen(true) }}>添加账号</Button>}
            fillHeight
            footer={paginationNode}
          />
        ) : (
          <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-0">
            <div className="min-h-0 flex-1 [&>[data-slot=table-container]]:h-full [&>[data-slot=table-container]]:min-h-0 [&>[data-slot=table-container]]:overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="sticky top-0 z-30 bg-card hover:bg-card">
                    <TableHead className="min-w-[220px]">账号标识</TableHead>
                    <TableHead className="min-w-[120px]">账号类型</TableHead>
                    <TableHead className="min-w-[180px]">注册站点</TableHead>
                    <TableHead className="min-w-[120px]">安全辅助</TableHead>
                    <TableHead className="min-w-[200px]">备注</TableHead>
                    <TableHead className="min-w-[80px]">状态</TableHead>
                    <TableHead className="w-[180px] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => {
                    return (
                      <TableRow
                        key={account.id}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => router.push(`/accounts/${account.id}`)}
                      >
                        <TableCell className="font-medium">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link href={`/accounts/${account.id}`} className={`transition-colors ${account.email && !isEmail(account.identifier) ? 'text-purple-700 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300' : 'hover:text-foreground/80'}`}>
                                  {account.identifier}
                                </Link>
                              </TooltipTrigger>
                              {account.email && !isEmail(account.identifier) && (
                                <TooltipContent>
                                  <p>绑定邮箱：{account.email}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{EMAIL_PROVIDER_LABELS[account.emailProvider]}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {account.sites.map((entry) => (
                              <Badge key={entry.site} variant={entry.isActive ? 'outline' : 'secondary'} className={!entry.isActive ? 'opacity-50' : undefined}>
                                {siteNamesById.get(entry.site) ?? entry.site}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{account.vaultLocation || <span className="text-muted-foreground">-</span>}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{account.description || <span className="text-muted-foreground">-</span>}</span>
                        </TableCell>
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <Switch
                            checked={account.isActive}
                            onCheckedChange={(checked) => handleToggleActive(account.id, checked)}
                            className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                          />
                        </TableCell>
                        <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setSiteAccount(account)} title="管理站点">
                              <Globe />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { setEditingAccount(account); setDialogOpen(true) }}>
                              <Pencil />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeletingAccount(account)}>
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="shrink-0 border-t px-6 py-3">
              {paginationNode}
            </div>
          </Card>
        )}
      </div>

      {/* Mobile: Card list */}
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        {accounts.length === 0 ? (
          <EmptyState
            title="暂无账号数据"
            description="先添加可复用账号，后续可在域名、DNS、GitHub 等站点中直接选择。"
            action={<Button onClick={() => { setEditingAccount(null); setDialogOpen(true) }}>添加账号</Button>}
            fillHeight
          />
        ) : (
          <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-0">
            <div className="min-h-0 flex-1 overflow-auto p-3">
              <AccountCardList
                accounts={accounts}
                sites={sites}
                onToggleActive={handleToggleActive}
                onManageSites={setSiteAccount}
                onEdit={(account) => { setEditingAccount(account); setDialogOpen(true) }}
                onDelete={setDeletingAccount}
                onClickCard={(id) => router.push(`/accounts/${id}`)}
              />
            </div>
            {mobilePaginationNode}
          </Card>
        )}
      </div>

      <AccountFormDialog
        open={dialogOpen}
        initialValue={editingAccount}
        sites={sites}
        emailIdentifiers={emailIdentifiers}
        onClose={() => {
          setDialogOpen(false)
          setEditingAccount(null)
          router.refresh()
        }}
      />

      {siteAccount && (
        <SiteManageDialog
          account={siteAccount}
          availableSites={sites}
          loading={isPending}
          onSave={handleSaveSites}
          onClose={() => setSiteAccount(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deletingAccount)}
        title="删除账号"
        description={`确认删除 ${deletingAccount?.identifier ?? ''} 吗？已被域名使用的账号不能直接删除。`}
        onClose={() => setDeletingAccount(null)}
        onConfirm={handleDelete}
        loading={isPending}
      />
    </div>
  )
}

function SiteManageDialog({
  account,
  availableSites,
  loading,
  onSave,
  onClose,
}: {
  account: Account
  availableSites: Site[]
  loading: boolean
  onSave: (accountId: string, sites: SiteEntry[]) => void
  onClose: () => void
}) {
  const [sites, setSites] = useState<SiteEntry[]>(account.sites)

  const siteIds = sites.map((s) => s.site)
  const siteNamesById = useMemo(() => new Map(availableSites.map((site) => [site.id, site.name])), [availableSites])
  const selectableSites = availableSites.filter((site) => !siteIds.includes(site.id))

  const addSite = (siteId: string) => {
    if (!siteId || siteIds.includes(siteId)) return
    setSites((prev) => [...prev, { site: siteId, note: '', isActive: true }])
  }

  const remove = (site: string) => {
    setSites((prev) => prev.filter((s) => s.site !== site))
  }

  const updateNote = (site: string, note: string) => {
    setSites((prev) => prev.map((s) => s.site === site ? { ...s, note } : s))
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent disableOutsideClose className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>管理注册站点</DialogTitle>
          <DialogDescription>为 {account.identifier} 添加或移除注册站点。</DialogDescription>
        </DialogHeader>

        {sites.length > 0 && (
          <div className="space-y-2">
            <div className="text-muted-foreground text-xs">当前站点</div>
            <div className="space-y-2">
              {sites.map((entry) => (
                <div key={entry.site} className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1 pr-1 shrink-0">
                    {siteNamesById.get(entry.site) ?? entry.site}
                    <button type="button" className="rounded-full hover:bg-muted" onClick={() => remove(entry.site)}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                  <Textarea
                    value={entry.note}
                    onChange={(e) => updateNote(entry.site, e.target.value)}
                    placeholder="备注（可选）"
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {selectableSites.length > 0 && (
          <div className="space-y-2">
            <div className="text-muted-foreground text-xs">可添加站点</div>
            <SearchableSelect
              value=""
              onValueChange={addSite}
              placeholder="选择站点添加"
              searchPlaceholder="搜索站点..."
              options={selectableSites.map((site) => ({ label: site.name, value: site.id }))}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button disabled={loading} onClick={() => onSave(account.id, sites)}>
            {loading ? '保存中...' : '保存'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
