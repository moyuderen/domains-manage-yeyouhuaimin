import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const GROUP_ITEM_COUNTS = [4, 3]

export default function SitesLoading() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem-2rem)] flex-col gap-6 md:h-[calc(100dvh-3.5rem-3rem)]">
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Skeleton className="h-10 w-full max-w-sm" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-4 w-40" />
          </div>

          <div className="flex items-center gap-2">
            <Skeleton className="hidden h-9 w-[4.75rem] md:block" />
            <Skeleton className="size-10" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
          <div className="hidden w-44 shrink-0 lg:block">
            <div className="space-y-1">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-4 overflow-auto pr-1">
            {GROUP_ITEM_COUNTS.map((itemCount, groupIndex) => (
              <Card key={groupIndex} className="border-0 shadow-none">
                <CardHeader className="flex flex-row items-center gap-2">
                  <Skeleton className={groupIndex === 0 ? 'h-6 w-20' : 'h-6 w-24'} />
                  <Skeleton className="h-6 w-[4.5rem] rounded-full" />
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(220px,280px))]">
                    {Array.from({ length: itemCount }, (_, itemIndex) => (
                      <div
                        key={itemIndex}
                        className="flex min-w-0 items-start justify-between gap-3 rounded-lg border bg-background px-3 py-2.5 shadow-xs"
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <Skeleton className="size-10 rounded-lg" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <Skeleton className="h-4 w-28 max-w-full" />
                            <Skeleton className="h-3 w-40 max-w-full" />
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Skeleton className="size-6 rounded-sm" />
                          <Skeleton className="size-6 rounded-sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
