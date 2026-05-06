import 'server-only'

import { NextRequest, NextResponse } from 'next/server'

import type { JobResult } from '@/lib/jobs/types'

export function createCronRouteHandler(run: (input: { requestId?: string }) => Promise<JobResult>) {
  return async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('CRON_SECRET is not configured')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await run({
      requestId: request.headers.get('x-request-id') ?? undefined,
    })

    const payload = {
      success: result.status !== 'failed',
      status: result.status,
      message: result.message,
      ...(result.data ?? {}),
    }

    return NextResponse.json(payload, { status: result.status === 'failed' ? 500 : 200 })
  }
}
