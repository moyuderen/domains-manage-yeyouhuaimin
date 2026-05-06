import { JobRunsPageClient } from '@/components/job-runs/JobRunsPageClient'
import { requirePageAccess } from '@/lib/auth/access-server'
import { getJobRuns, getJobRunSummary } from '@/lib/data/job-runs'
import { getSingleParam } from '@/lib/utils/params'
import { DEFAULT_PAGE_SIZE, isStandardPageSize } from '@/lib/utils/pagination'

export default async function JobRunsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageAccess()
  const params = await searchParams
  const rawPageSize = getSingleParam(params?.pageSize)
  const pageSize = Number.parseInt(rawPageSize ?? String(DEFAULT_PAGE_SIZE), 10)
  const page = Math.max(1, Number.parseInt(getSingleParam(params?.page) ?? '1', 10) || 1)

  const [paginatedRuns, summary] = await Promise.all([
    getJobRuns({
      page,
      pageSize: isStandardPageSize(pageSize) ? pageSize : DEFAULT_PAGE_SIZE,
    }),
    getJobRunSummary(),
  ])

  return <JobRunsPageClient paginatedRuns={paginatedRuns} summary={summary} />
}

