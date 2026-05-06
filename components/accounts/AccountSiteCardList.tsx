'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { useMemo } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { SiteEntry } from '@/types/account'
import type { Site } from '@/types/site'

type AccountSiteCardListProps = {
  sites: SiteEntry[]
  allSites: Site[]
  onToggleActive: (site: string, isActive: boolean) => void
  onEditNote: (site: string) => void
  onRemove: (site: string) => void
}

export function AccountSiteCardList({ sites, allSites, onToggleActive, onEditNote, onRemove }: AccountSiteCardListProps) {
  const siteNamesById = useMemo(() => new Map(allSites.map((site) => [site.id, site.name])), [allSites])

  return (
    <div className="space-y-3">
      {sites.map((entry) => (
        <div key={entry.site} className={`rounded-lg border bg-card p-4 space-y-3 ${!entry.isActive ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline">{siteNamesById.get(entry.site) ?? entry.site}</Badge>
            <Switch
              checked={entry.isActive}
              onCheckedChange={(checked) => onToggleActive(entry.site, checked)}
              className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
            />
          </div>

          <div className="text-sm">
            {entry.note ? (
              <span>{entry.note}</span>
            ) : (
              <span className="text-muted-foreground">暂无备注</span>
            )}
          </div>

          <div className="flex items-center justify-end gap-1 border-t pt-3">
            <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => onEditNote(entry.site)}>
              <Pencil className="size-3.5" />
              备注
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-destructive hover:text-destructive" onClick={() => onRemove(entry.site)}>
              <Trash2 className="size-3.5" />
              移除
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
