import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { resolveAccountDisplay, type AccountLookup } from '@/lib/data/accounts'
import type { Site } from '@/types/site'

export function SiteLinkCell({ siteId, siteById }: { siteId: string | null; siteById: Map<string, Site> }) {
  const site = siteId ? siteById.get(siteId) : undefined
  if (!site) return <span className={siteId ? undefined : 'text-muted-foreground'}>{siteId ? '未知站点' : '未设置'}</span>
  if (site.websiteUrl) {
    return (
      <a href={site.websiteUrl} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-primary hover:underline">
        {site.name}
      </a>
    )
  }
  return site.name
}

export function AccountCell({ accountId, accountLookup }: { accountId: string | null; accountLookup: AccountLookup }) {
  if (!accountId) return <span className="text-muted-foreground">未设置</span>
  const { name, highlight, tooltip } = resolveAccountDisplay(accountId, accountLookup)
  if (highlight && tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-purple-700 dark:text-purple-400 cursor-default">{name}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    )
  }
  if (highlight) return <span className="text-purple-700 dark:text-purple-400">{name}</span>
  return <span className="text-muted-foreground">{name}</span>
}
