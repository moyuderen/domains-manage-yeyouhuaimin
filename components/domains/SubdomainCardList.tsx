'use client'

import { Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { Subdomain } from '@/types/domain'

type SubdomainCardListProps = {
  domainName: string
  subdomains: Subdomain[]
  onEdit: (subdomain: Subdomain) => void
  onDelete: (subdomain: Subdomain) => void
}

export function SubdomainCardList({ domainName, subdomains, onEdit, onDelete }: SubdomainCardListProps) {
  return (
    <div className="space-y-3">
      {subdomains.map((subdomain) => (
        <div key={subdomain.id} className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium truncate">{`${subdomain.subdomain}.${domainName}`}</div>
              <div className="text-sm text-muted-foreground mt-0.5">{subdomain.subdomain}</div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(subdomain)}>
                <Pencil size={14} />
              </Button>
              <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => onDelete(subdomain)}>
                <Trash2 size={14} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">对应 IP</span>
              <div className="mt-0.5">{subdomain.ip || <span className="text-muted-foreground">—</span>}</div>
            </div>
            {subdomain.description && (
              <div>
                <span className="text-muted-foreground">用途说明</span>
                <div className="mt-0.5">{subdomain.description}</div>
              </div>
            )}
            {subdomain.remark && (
              <div className="col-span-2">
                <span className="text-muted-foreground">备注</span>
                <div className="mt-0.5 text-muted-foreground">{subdomain.remark}</div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
