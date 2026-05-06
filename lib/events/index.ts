import 'server-only'

import { persistActivityLogEvent } from '@/lib/events/sinks/activity-log'
import { persistNotificationEvent } from '@/lib/events/sinks/notification'
import { resolveEventInput, type EventDispatchContext, type EventInput, type EventSink } from '@/lib/events/types'

const sinks: EventSink[] = [persistActivityLogEvent, persistNotificationEvent]

export async function emitEvent(event: EventInput): Promise<EventDispatchContext> {
  const resolvedEvent = resolveEventInput(event)
  let context: EventDispatchContext = {}

  for (const sink of sinks) {
    const nextContext = await sink(resolvedEvent, context)
    if (nextContext) {
      context = {
        ...context,
        ...nextContext,
      }
    }
  }

  return context
}

export async function tryEmitEvent(event: EventInput): Promise<void> {
  try {
    await emitEvent(event)
  } catch (error) {
    console.error('Failed to emit event.', error)
  }
}

