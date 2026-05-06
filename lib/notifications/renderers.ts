import type { NotificationContent } from '@/types/notification'

export type ChannelRenderer = (content: NotificationContent) => string

// ---------------------------------------------------------------------------
// Telegram format strategies
// ---------------------------------------------------------------------------

interface TelegramFormat {
  separator: string
  header: (title: string, summary: string) => string[]
  text: (label: string, value: string) => string
  list: (label: string, items: string[]) => string[]
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const PLAIN: TelegramFormat = {
  separator: '',
  header: (title, summary) => [`${title} ${summary}`],
  text: (label, value) => `${label}：${value}`,
  list: (label, items) => [`${label}：`, ...items.map((i) => `- ${i}`)],
}

const HTML: TelegramFormat = {
  separator: '',
  header: (title, summary) => [`<b>${escapeHtml(title)}</b>`, `<i>${escapeHtml(summary)}</i>`, ''],
  text: (label, value) => `${escapeHtml(label)}：<code>${escapeHtml(value)}</code>`,
  list: (label, items) => [`<b>${escapeHtml(label)}</b>`, ...items.map((i) => `  · ${escapeHtml(i)}`)],
}

// ---------------------------------------------------------------------------
// Shared block renderer
// ---------------------------------------------------------------------------

function renderTelegramFormat(content: NotificationContent, fmt: TelegramFormat): string {
  const lines = fmt.header(content.title, content.summary)

  for (const block of content.blocks) {
    if (fmt.separator) lines.push(fmt.separator)

    if (block.type === 'text') {
      lines.push(fmt.text(block.label, block.value))
    } else if (block.items.length > 0) {
      lines.push(...fmt.list(block.label, block.items))
    }
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function renderTelegramMessage(content: NotificationContent): string {
  const fmt = content.templateKey === 'domain_expiry_report' || content.templateKey === 'test_notification'
    ? HTML
    : PLAIN
  return renderTelegramFormat(content, fmt)
}
