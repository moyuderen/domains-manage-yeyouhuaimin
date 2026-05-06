'use client'

import { ChevronLeft, Pencil, Plus, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'

import { updateAccountSitesAction } from '@/app/actions/accounts'
import { AccountFormDialog } from '@/components/accounts/AccountFormDialog'
import { AccountSiteCardList } from '@/components/accounts/AccountSiteCardList'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { SearchableSelect } from '@/components/searchable-select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EMAIL_PROVIDER_LABELS, type Account, type SiteEntry } from '@/types/account'
import type { Site } from '@/types/site'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function AccountDetailsPage({ account, sites, emailIdentifiers }: { account: Account; sites: Site[]; emailIdentifiers: string[] }) {
  const router = useRouter()
  const [accountSites, setAccountSites] = useState<SiteEntry[]>(account.sites)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [removeSite, setRemoveSite] = useState<string | null>(null)
  const [editNoteEntry, setEditNoteEntry] = useState<string | null>(null)
  const [editNoteValue, setEditNoteValue] = useState('')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const siteNamesById = useMemo(() => new Map(sites.map((site) => [site.id, site.name])), [sites])

  const saveSites = (next: SiteEntry[]) => {
    startTransition(async () => {
      try {
        await updateAccountSitesAction(account.id, next)
        setAccountSites(next)
        toast.success('站点已更新')
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '更新失败')
      }
    })
  }

  const handleAddSites = (toAdd: SiteEntry[]) => {
    saveSites([...accountSites, ...toAdd])
    setAddDialogOpen(false)
  }

  const handleRemoveSite = () => {
    if (!removeSite) return
    saveSites(accountSites.filter((s) => s.site !== removeSite))
    setRemoveSite(null)
  }

  const handleToggleActive = (site: string, isActive: boolean) => {
    saveSites(accountSites.map((s) => s.site === site ? { ...s, isActive } : s))
  }

  const handleSaveNote = () => {
    if (!editNoteEntry) return
    saveSites(accountSites.map((s) => s.site === editNoteEntry ? { ...s, note: editNoteValue.trim() } : s))
    setEditNoteEntry(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <Button variant="ghost" asChild>
            <Link href="/accounts">
              <ChevronLeft />
              返回账号列表
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{account.identifier}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={account.isActive ? 'default' : 'secondary'}>{account.isActive ? '启用' : '停用'}</Badge>
          <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
            <Pencil />
            编辑
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">基础信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-6 gap-y-3 md:grid-cols-2 xl:grid-cols-4">
            <Info label="账号类型" value={EMAIL_PROVIDER_LABELS[account.emailProvider]} />
            {account.email ? <Info label="绑定邮箱" value={account.email} /> : null}
            <Info label="密码提示" value={account.passwordHint || '-'} />
            <Info label="密码库位置" value={account.vaultLocation || '-'} />
            <Info label="备注" value={account.description || '-'} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">注册站点</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus />
            添加站点
          </Button>
        </CardHeader>
        <CardContent>
          {accountSites.length === 0 ? (
            <EmptyState
              title="暂未分配注册站点"
              description="为账号添加可复用站点，后续域名保存时也会自动补齐关联。"
              action={(
                <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
                  <Plus />
                  添加站点
                </Button>
              )}
            />
          ) : (
            <>
              {/* Desktop: Table */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>站点</TableHead>
                      <TableHead>备注</TableHead>
                      <TableHead className="w-[80px]">状态</TableHead>
                      <TableHead className="w-[80px] text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountSites.map((entry) => (
                      <TableRow key={entry.site} className={!entry.isActive ? 'opacity-50' : undefined}>
                        <TableCell>
                          <Badge variant="outline">{siteNamesById.get(entry.site) ?? entry.site}</Badge>
                        </TableCell>
                        <TableCell>
                          {entry.note ? (
                            <span className="text-sm">{entry.note}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={entry.isActive}
                            onCheckedChange={(checked) => handleToggleActive(entry.site, checked)}
                            className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setEditNoteEntry(entry.site); setEditNoteValue(entry.note) }} title="编辑备注">
                              <Pencil className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setRemoveSite(entry.site)}>
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: Card list */}
              <div className="md:hidden">
                <AccountSiteCardList
                  sites={accountSites}
                  allSites={sites}
                  onToggleActive={handleToggleActive}
                  onEditNote={(site) => { setEditNoteEntry(site); setEditNoteValue(accountSites.find((e) => e.site === site)?.note ?? '') }}
                  onRemove={setRemoveSite}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AccountFormDialog
        open={editDialogOpen}
        initialValue={account}
        sites={sites}
        emailIdentifiers={emailIdentifiers}
        onClose={() => {
          setEditDialogOpen(false)
          router.refresh()
        }}
      />

      <AddSiteDialog
        open={addDialogOpen}
        existingSites={accountSites}
        availableSites={sites}
        loading={isPending}
        onConfirm={handleAddSites}
        onClose={() => setAddDialogOpen(false)}
      />

      <Dialog open={Boolean(editNoteEntry)} onOpenChange={(open) => { if (!open) setEditNoteEntry(null) }}>
        <DialogContent disableOutsideClose className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑备注</DialogTitle>
            <DialogDescription>为「{editNoteEntry ? (siteNamesById.get(editNoteEntry) ?? editNoteEntry) : ''}」添加或修改备注。</DialogDescription>
          </DialogHeader>
          <Textarea
            value={editNoteValue}
            onChange={(e) => setEditNoteValue(e.target.value)}
            placeholder="输入备注信息"
          />
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => setEditNoteEntry(null)}>取消</Button>
            <Button onClick={handleSaveNote}>保存</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(removeSite)}
        title="移除注册站点"
        description={`确认移除「${removeSite ? (siteNamesById.get(removeSite) ?? removeSite) : ''}」站点吗？`}
        onClose={() => setRemoveSite(null)}
        onConfirm={handleRemoveSite}
        loading={isPending}
      />
    </div>
  )
}

function Info({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="text-muted-foreground text-xs leading-none">{label}</div>
      <div className="text-foreground text-sm font-medium break-words">{value}</div>
    </div>
  )
}

function AddSiteDialog({
  open,
  existingSites,
  availableSites,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean
  existingSites: SiteEntry[]
  availableSites: Site[]
  loading: boolean
  onConfirm: (entries: SiteEntry[]) => void
  onClose: () => void
}) {
  const [pending, setPending] = useState<{ site: string; note: string }[]>([])

  const existingSiteIds = existingSites.map((e) => e.site)
  const pendingSiteIds = pending.map((p) => p.site)
  const selectableSites = availableSites.filter((site) => !existingSiteIds.includes(site.id) && !pendingSiteIds.includes(site.id))
  const siteNamesById = useMemo(() => new Map(availableSites.map((site) => [site.id, site.name])), [availableSites])

  const addSite = (siteId: string) => {
    if (!siteId || existingSiteIds.includes(siteId) || pendingSiteIds.includes(siteId)) return
    setPending((prev) => [...prev, { site: siteId, note: '' }])
  }

  const updateNote = (site: string, note: string) => {
    setPending((prev) => prev.map((p) => p.site === site ? { ...p, note } : p))
  }

  const removePending = (site: string) => {
    setPending((prev) => prev.filter((p) => p.site !== site))
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setPending([])
      onClose()
    }
  }

  const handleConfirm = () => {
    const entries: SiteEntry[] = pending.map((p) => ({ site: p.site, note: p.note, isActive: true }))
    onConfirm(entries)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent disableOutsideClose className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>添加注册站点</DialogTitle>
          <DialogDescription>选择已有站点添加到账号，可同时填写备注。</DialogDescription>
        </DialogHeader>

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

        {pending.length > 0 && (
          <div className="space-y-2">
            <div className="text-muted-foreground text-xs">待添加</div>
            <div className="space-y-2">
              {pending.map((item) => (
                <div key={item.site} className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1 pr-1 shrink-0">
                    {siteNamesById.get(item.site) ?? item.site}
                    <button type="button" className="rounded-full hover:bg-muted" onClick={() => removePending(item.site)}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                  <Textarea
                    value={item.note}
                    onChange={(e) => updateNote(item.site, e.target.value)}
                    placeholder="备注（可选）"
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t pt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button disabled={pending.length === 0 || loading} onClick={handleConfirm}>
            {loading ? '添加中...' : '添加'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
