import Link from 'next/link'
import { ChevronLeft, Plus } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { SubdomainManager } from '@/components/domains/SubdomainManager'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDate } from '@/lib/date'
import type { AccountLookup } from '@/lib/data/accounts'
import { resolveAccountDisplay } from '@/lib/data/accounts'
import { getDomainStatus, getExpiryCountdownColor, getExpiryCountdownLabel, getStatusColor, getStatusLabel } from '@/lib/domainStatus'
import { cn } from '@/lib/utils'
import type { Domain } from '@/types/domain'
import type { Site } from '@/types/site'

type DomainDetailsPageProps = {
  domain: Domain
  linkSites: Site[]
  accountLookup: AccountLookup
  expiryDays: number
}

export function DomainDetailsPage({ domain, linkSites, accountLookup, expiryDays }: DomainDetailsPageProps) {
  const status = getDomainStatus(domain.expiryDate, expiryDays)
  const expiryCountdown = getExpiryCountdownLabel(domain.expiryDate)
  const siteById = new Map(linkSites.map((site) => [site.id, site]))
  const registrarSite = domain.registrarSiteId ? siteById.get(domain.registrarSiteId) : undefined
  const dnsSite = domain.dnsSiteId ? siteById.get(domain.dnsSiteId) : undefined
  const registrarAccount = resolveAccountDisplay(domain.registrarAccountId, accountLookup)
  const dnsAccount = resolveAccountDisplay(domain.dnsAccountId, accountLookup)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <Button variant="ghost" asChild>
            <Link href="/domains">
              <ChevronLeft size={16} />
              返回域名列表
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{domain.name}</h1>
          </div>
        </div>
        <div className="min-w-[96px] whitespace-nowrap">
          <Badge className={getStatusColor(status)} variant="outline">{getStatusLabel(status)}</Badge>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="grid gap-x-6 gap-y-3 md:grid-cols-2 xl:grid-cols-4">
            <Info label="注册站点" value={registrarSite?.name ?? '未设置'} href={registrarSite?.websiteUrl || undefined} />
            <AccountInfo label="注册站点账号" value={registrarAccount.name} highlight={registrarAccount.highlight} tooltip={registrarAccount.tooltip} />
            <Info label="DNS 站点" value={dnsSite?.name ?? '未设置'} href={dnsSite?.websiteUrl || undefined} />
            <AccountInfo label="DNS 账号" value={dnsAccount.name} highlight={dnsAccount.highlight} tooltip={dnsAccount.tooltip} />
            <Info label="注册时间" value={formatDate(domain.registrationDate)} />
            <Info label="到期时间" value={formatDate(domain.expiryDate)} description={expiryCountdown ?? undefined} descriptionClassName={getExpiryCountdownColor(status)} />
            <Info label="备注" value={domain.remark} />
          </div>
        </CardContent>
      </Card>

      <SubdomainManager domain={domain} addIcon={<Plus size={16} className="mr-2" />} />
    </div>
  )
}

function Info({ label, value, href, description, descriptionClassName, className }: { label: string; value: string; href?: string; description?: string; descriptionClassName?: string; className?: string }) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="text-muted-foreground text-xs leading-none">{label}</div>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-medium break-words text-foreground transition-colors hover:text-primary hover:underline">
          {value}
        </a>
      ) : (
        <div className="text-foreground text-sm font-medium break-words">{value}</div>
      )}
      {description ? <div className={cn('text-xs font-medium', descriptionClassName ?? 'text-muted-foreground')}>{description}</div> : null}
    </div>
  )
}

function AccountInfo({ label, value, highlight, tooltip }: { label: string; value: string; highlight: boolean; tooltip?: string }) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground text-xs leading-none">{label}</div>
      {tooltip ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn('text-sm font-medium break-words cursor-default', highlight ? 'text-purple-700 dark:text-purple-400' : 'text-foreground')}>{value}</div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <div className={cn('text-sm font-medium break-words', highlight ? 'text-purple-700 dark:text-purple-400' : 'text-foreground')}>{value}</div>
      )}
    </div>
  )
}
