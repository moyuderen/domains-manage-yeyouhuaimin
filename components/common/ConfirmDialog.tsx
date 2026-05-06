'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onClose: () => void
  loading?: boolean
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = '确认删除',
  cancelText = '取消',
  onConfirm,
  onClose,
  loading,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            variant="destructive"
            disabled={loading}
          >
            {loading ? '处理中...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
