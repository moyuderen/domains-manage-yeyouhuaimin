'use client'

import Link from 'next/link'
import { Globe, Pencil, Trash2 } from 'lucide-react'
import { useMemo } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { EMAIL_PROVIDER_LABELS, type Account } from '@/types/account'
import { isEmail } from '@/schemas/accountSchemas'
import type { Site } from '@/types/site'

type AccountCardListProps = {
  accounts: Account[]
  sites: Site[]
  onToggleActive: (accountId: string, checked: boolean) => void
  onManageSites: (account: Account) => void
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
  onClickCard: (accountId: string) => void
}

export function AccountCardList({ accounts, sites, onToggleActive, onManageSites, onEdit, onDelete, onClickCard }: AccountCardListProps) {
  const siteNamesById = useMemo(() => new Map(sites.map((site) => [site.id, site.name])), [sites])

  return (
    <div className="space-y-3">
      {accounts.map((account) => (
        <div key={account.id} className="rounded-lg border bg-card p-4 space-y-3 cursor-pointer" onClick={() => onClickCard(account.id)}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/accounts/${account.id}`}
                onClick={(e) => e.stopPropagation()}
                className={`font-medium transition-colors ${account.email && !isEmail(account.identifier) ? 'text-purple-700 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300' : 'hover:text-foreground/80'}`}
              >
                {account.identifier}
              </Link>
              {account.email && !isEmail(account.identifier) && (
                <div className="text-xs text-muted-foreground mt-0.5">绑定邮箱：{account.email}</div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={account.isActive}
                onCheckedChange={(checked) => onToggleActive(account.id, checked)}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">账号类型</span>
              <div className="mt-0.5">{EMAIL_PROVIDER_LABELS[account.emailProvider]}</div>
            </div>
            {account.sites.length > 0 && (
              <div>
                <span className="text-muted-foreground">注册站点</span>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {account.sites.map((entry) => (
                    <Badge key={entry.site} variant={entry.isActive ? 'outline' : 'secondary'} className={!entry.isActive ? 'opacity-50 text-xs' : 'text-xs'}>
                      {siteNamesById.get(entry.site) ?? entry.site}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {account.vaultLocation && (
              <div>
                <span className="text-muted-foreground">安全辅助</span>
                <div className="mt-0.5">{account.vaultLocation}</div>
              </div>
            )}
            {account.description && (
              <div className="col-span-2">
                <span className="text-muted-foreground">备注</span>
                <div className="mt-0.5 text-muted-foreground">{account.description}</div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-1 border-t pt-3" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => onManageSites(account)}>
              <Globe className="size-3.5" />
              站点
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => onEdit(account)}>
              <Pencil className="size-3.5" />
              编辑
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-destructive hover:text-destructive" onClick={() => onDelete(account)}>
              <Trash2 className="size-3.5" />
              删除
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
