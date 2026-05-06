import 'server-only'

import type { JobTriggerSource } from '@/types/jobRun'

export type JobStatus = 'success' | 'skipped' | 'failed'

export interface JobContext {
  triggerSource: JobTriggerSource
  triggeredAt: string
  requestId?: string
}

export interface JobResult {
  status: JobStatus
  message: string
  data?: Record<string, unknown>
}

export interface JobDefinition<TInput = void> {
  id: string
  run: (input: TInput, context: JobContext) => Promise<JobResult>
}
