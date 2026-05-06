import { Button } from '@/components/ui/button'

type MobilePaginationProps = {
  total: number
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function MobilePagination({ total, page, totalPages, onPageChange }: MobilePaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="shrink-0 border-t px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">共 {total} 条</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            上一页
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            下一页
          </Button>
        </div>
      </div>
    </div>
  )
}
