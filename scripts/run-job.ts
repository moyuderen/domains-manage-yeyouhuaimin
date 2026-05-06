import 'server-only'

import { runJob } from '@/lib/jobs/run-job'
import { jobRegistry, type JobId } from '@/lib/jobs/registry'
import { JOB_TRIGGER_SOURCES, type JobTriggerSource } from '@/types/jobRun'

async function main() {
  const [, , rawJobId, rawTriggerSource] = process.argv

  if (!rawJobId) {
    printUsage()
    process.exitCode = 1
    return
  }

  if (!isJobId(rawJobId)) {
    console.error(`Unknown job id: ${rawJobId}`)
    printUsage()
    process.exitCode = 1
    return
  }

  const triggerSource = parseTriggerSource(rawTriggerSource)
  if (!triggerSource) {
    console.error(`Unsupported trigger source: ${rawTriggerSource}`)
    printUsage()
    process.exitCode = 1
    return
  }

  const result = await runJob(rawJobId, {
    triggerSource,
    triggeredAt: new Date().toISOString(),
  })

  console.info(JSON.stringify({
    jobId: rawJobId,
    status: result.status,
    message: result.message,
    ...(result.data ? { data: result.data } : {}),
  }, null, 2))

  process.exitCode = result.status === 'failed' ? 1 : 0
}

function isJobId(value: string): value is JobId {
  return value in jobRegistry
}

function parseTriggerSource(value?: string): JobTriggerSource | null {
  if (!value) {
    return 'cli'
  }

  return JOB_TRIGGER_SOURCES.includes(value as JobTriggerSource) ? (value as JobTriggerSource) : null
}

function printUsage() {
  console.info('Usage: npm run job -- <job-id> [trigger-source]')
  console.info(`Available job ids: ${Object.keys(jobRegistry).join(', ')}`)
}

void main()
