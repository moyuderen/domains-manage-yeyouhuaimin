'use client'

import { Pencil, Trash2 } from 'lucide-react'

import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Subdomain } from '@/types/domain'

export function SubdomainsTable({ domainName, subdomains, onEdit, onDelete }: { domainName: string; subdomains: Subdomain[]; onEdit: (subdomain: Subdomain) => void; onDelete: (subdomain: Subdomain) => void }) {
  if (!subdomains.length) {
    return <EmptyState title="暂无子域名" description="先为当前域名添加一个子域名入口。" />
  }

  return (
    <TooltipProvider>
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>子域名</TableHead>
              <TableHead>完整地址</TableHead>
              <TableHead>对应 IP</TableHead>
              <TableHead>用途说明</TableHead>
              <TableHead>备注</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subdomains.map((subdomain) => (
              <TableRow key={subdomain.id}>
                <TableCell className="font-medium">{subdomain.subdomain}</TableCell>
                <TableCell className="text-muted-foreground">{`${subdomain.subdomain}.${domainName}`}</TableCell>
                <TableCell className="text-muted-foreground">
                  {subdomain.ip && subdomain.ipRemark ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-default underline decoration-dashed underline-offset-4">{subdomain.ip}</span>
                      </TooltipTrigger>
                      <TooltipContent>{subdomain.ipRemark}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <span>{subdomain.ip || '—'}</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{subdomain.description}</TableCell>
                <TableCell className="text-muted-foreground">{subdomain.remark}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(subdomain)}><Pencil size={16} /></Button>
                    <Button variant="destructive" size="icon" onClick={() => onDelete(subdomain)}><Trash2 size={16} /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  )
}
