'use client'

import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDate } from '@/lib/date'
import type { AccountLookup } from '@/lib/data/accounts'
import { resolveAccountDisplay } from '@/lib/data/accounts'
import { getDomainStatus, getExpiryCountdownColor, getExpiryCountdownLabel, getStatusColor, getStatusLabel } from '@/lib/domainStatus'
import { cn } from '@/lib/utils'
import type { Domain } from '@/types/domain'
import type { Site } from '@/types/site'

type DomainDetailsDialogProps = {
  open: boolean
  domain: Domain | null
  linkSites: Site[]
  accountLookup: AccountLookup
  expiryDays: number
  onClose: () => void
}

export function DomainDetailsDialog({ open, domain, linkSites, accountLookup, expiryDays, onClose }: DomainDetailsDialogProps) {
  const status = domain ? getDomainStatus(domain.expiryDate, expiryDays) : 'normal'
  const expiryCountdown = domain ? getExpiryCountdownLabel(domain.expiryDate) : null
  const siteById = new Map(linkSites.map((site) => [site.id, site]))
  const registrarSite = domain?.registrarSiteId ? siteById.get(domain.registrarSiteId) : undefined
  const dnsSite = domain?.dnsSiteId ? siteById.get(domain.dnsSiteId) : undefined
  const registrarAccount = domain ? resolveAccountDisplay(domain.registrarAccountId, accountLookup) : null
  const dnsAccount = domain ? resolveAccountDisplay(domain.dnsAccountId, accountLookup) : null

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{domain?.name ?? ''}</DialogTitle>
          <DialogDescription asChild>
            <div className="mt-1 flex items-center gap-2">
              <Badge className={cn('w-fit', getStatusColor(status))} variant="outline">
                {getStatusLabel(status)}
              </Badge>
              {expiryCountdown && (
                <span className={cn('text-xs font-medium', getExpiryCountdownColor(status))}>
                  {expiryCountdown}
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {domain && (
          <div className="space-y-4">
            <div className="space-y-3">
              <SectionTitle>注册信息</SectionTitle>
              <InfoItem label="注册站点" value={registrarSite?.name ?? '未设置'} href={registrarSite?.websiteUrl || undefined} />
              <InfoItem label="注册账号" value={registrarAccount?.name ?? '未设置'} highlight={registrarAccount?.highlight} tooltip={registrarAccount?.tooltip} />
              <InfoItem label="注册时间" value={formatDate(domain.registrationDate)} />
              <InfoItem label="到期时间" value={formatDate(domain.expiryDate)} />
              <InfoItem label="续费提前天数" value={domain.renewalDaysBeforeExpiry != null ? `${domain.renewalDaysBeforeExpiry} 天` : '未设置'} />
              <InfoItem label="域名类型" value={domain.isFree ? '免费' : '付费'} />
              {!domain.isFree && (
                <>
                  <InfoItem label="币种" value={domain.currency} />
                  <InfoItem label="购买金额" value={domain.purchasePrice != null ? String(domain.purchasePrice) : '未设置'} />
                  <InfoItem label="续费金额" value={domain.renewalPrice != null ? String(domain.renewalPrice) : '未设置'} />
                  <InfoItem label="自动续费" value={domain.autoRenewal ? '已开启' : '未开启'} />
                </>
              )}
            </div>

            <div className="space-y-3">
              <SectionTitle>DNS 信息</SectionTitle>
              <InfoItem label="DNS 站点" value={dnsSite?.name ?? '未设置'} href={dnsSite?.websiteUrl || undefined} />
              <InfoItem label="DNS 账号" value={dnsAccount?.name ?? '未设置'} highlight={dnsAccount?.highlight} tooltip={dnsAccount?.tooltip} />
            </div>

            <div className="space-y-3">
              <SectionTitle>其他信息</SectionTitle>
              <InfoItem label="备注" value={domain.remark || '无'} />
              <InfoItem label="创建时间" value={formatDate(domain.createdAt)} />
              <InfoItem label="更新时间" value={formatDate(domain.updatedAt)} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm font-semibold text-foreground">{children}</div>
  )
}

function InfoItem({ label, value, href, highlight, tooltip }: { label: string; value: string; href?: string; highlight?: boolean; tooltip?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground whitespace-nowrap">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground transition-colors hover:text-primary hover:underline truncate text-right">
          {value}
        </a>
      ) : tooltip ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn('text-sm font-medium truncate text-right cursor-default', highlight ? 'text-purple-700 dark:text-purple-400' : 'text-foreground')}>{value}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <span className={cn('text-sm font-medium truncate text-right', highlight ? 'text-purple-700 dark:text-purple-400' : 'text-foreground')}>{value}</span>
      )}
    </div>
  )
}
