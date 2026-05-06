import 'server-only'

import { createJobRun, updateJobRun } from '@/lib/data/job-runs'
import { jobRegistry, type JobId } from '@/lib/jobs/registry'
import type { JobContext, JobResult } from '@/lib/jobs/types'

export async function runJob(jobId: JobId, context: JobContext): Promise<JobResult> {
  const job = jobRegistry[jobId]

  console.info(`[job:${jobId}] started`, {
    triggerSource: context.triggerSource,
    triggeredAt: context.triggeredAt,
    requestId: context.requestId,
  })

  const jobRun = await createJobRun({
    jobKey: jobId,
    triggerSource: context.triggerSource,
    requestId: context.requestId,
    metadata: {
      triggeredAt: context.triggeredAt,
    },
    startedAt: context.triggeredAt,
  })

  try {
    const result = await job.run(undefined, context)

    console.info(`[job:${jobId}] finished`, {
      status: result.status,
      message: result.message,
    })

    if (jobRun) {
      await updateJobRun({
        id: jobRun.id,
        status: result.status,
        message: result.message,
        metadata: {
          triggeredAt: context.triggeredAt,
          ...(result.data ?? {}),
        },
      })
    }

    return result
  } catch (error) {
    console.error(`[job:${jobId}] failed`, error)

    const result = {
      status: 'failed' as const,
      message: error instanceof Error ? error.message : 'Unknown error',
    }

    if (jobRun) {
      await updateJobRun({
        id: jobRun.id,
        status: result.status,
        message: result.message,
        metadata: {
          triggeredAt: context.triggeredAt,
        },
      })
    }

    return result
  }
}
