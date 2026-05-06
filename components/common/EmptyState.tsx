import type { ReactNode } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type EmptyStateProps = {
  title: string
  description: string
  action?: ReactNode
  footer?: ReactNode
  fillHeight?: boolean
  className?: string
}

export function EmptyState({ title, description, action, footer, fillHeight = false, className }: EmptyStateProps) {
  if (!fillHeight && !footer && !className) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="text-lg font-semibold text-foreground">{title}</div>
            <p className="text-muted-foreground max-w-md text-sm">{description}</p>
            {action}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(fillHeight && 'flex min-h-0 flex-1 flex-col gap-0 overflow-hidden py-0', className)}>
      <div className={cn('flex flex-col items-center gap-3 py-6 text-center', fillHeight && 'flex flex-1 items-center justify-center px-6')}>
        <div className="text-lg font-semibold text-foreground">{title}</div>
        <p className="text-muted-foreground max-w-md text-sm">{description}</p>
        {action}
      </div>
      {footer ? (
        <div className="shrink-0 border-t px-6 py-3">
          {footer}
        </div>
      ) : null}
    </Card>
  )
}
