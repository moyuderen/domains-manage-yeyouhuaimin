'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import type { ActivityLogChange } from '@/types/activity-log'

type ActivityLogDetailDialogProps = {
  open: boolean
  changes: ActivityLogChange[]
  summary: string
  resourceName: string
  onClose: () => void
}

export function ActivityLogDetailDialog({ open, changes, summary, resourceName, onClose }: ActivityLogDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>查看变更</DialogTitle>
          <DialogDescription>
            {resourceName ? `${summary} · ${resourceName}` : summary}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {changes.map((change) => (
            <div key={change.field} className="space-y-2 rounded-lg border p-3">
              <div className="text-sm font-semibold text-foreground">{change.label}</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ValueBlock label="修改前" value={change.displayBefore} />
                <ValueBlock label="修改后" value={change.displayAfter} />
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ValueBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="rounded-md bg-muted/50 px-3 py-2 text-sm break-words text-foreground">{value}</div>
    </div>
  )
}
