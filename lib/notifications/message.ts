import type { NotificationContent, NotificationPayload } from '@/types/notification'

export function readNotificationContent(payload: NotificationPayload): NotificationContent | null {
  const content = payload.content

  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return null
  }

  const title = typeof content.title === 'string' ? content.title.trim() : ''
  const summary = typeof content.summary === 'string' ? content.summary.trim() : ''
  const blocks: NotificationContent['blocks'] = []

  for (const block of content.blocks) {
    if (block.type === 'text') {
      const label = block.label.trim()
      const value = block.value.trim()

      if (label && value) {
        blocks.push({ type: 'text', label, value })
      }

      continue
    }

    const label = block.label.trim()
    const items = block.items.map((item) => item.trim()).filter(Boolean)

    if (label && items.length > 0) {
      blocks.push({ type: 'list', label, items })
    }
  }

  const meta = readStringRecord(content.meta)

  if (!title || !summary) {
    return null
  }

  const templateKey = typeof content.templateKey === 'string' ? content.templateKey.trim() : ''

  return { templateKey, title, summary, blocks, meta }
}

function readStringRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entryValue]) => {
      if (typeof entryValue !== 'string') {
        return []
      }

      const normalized = entryValue.trim()
      return normalized ? [[key, normalized]] : []
    }),
  )
}

export function readConfigString(value: Record<string, unknown>, key: string) {
  const field = value[key]
  return typeof field === 'string' ? field.trim() : ''
}

export function readConfigStringArray(value: Record<string, unknown>, key: string) {
  const field = value[key]
  if (!Array.isArray(field)) {
    return []
  }

  return field.flatMap((item) => (typeof item === 'string' && item.trim() ? [item.trim()] : []))
}

export function normalizeDelimitedStringList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function normalizeRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}
