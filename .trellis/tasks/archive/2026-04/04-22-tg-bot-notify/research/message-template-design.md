# Research: Message Template Design

- **Query**: Best practices for Telegram notification message formatting, HTML templates for domain expiry alerts
- **Scope**: External + Internal
- **Date**: 2026-04-23

## Findings

### Design Principles for Telegram Notifications

1. **Lead with the most important info** -- Users scan notifications quickly; put the action-required info first.
2. **Use visual hierarchy** -- Bold for key values, monospace for domain names, emojis sparingly as section markers.
3. **Keep it scannable** -- One domain per block, consistent formatting, clear separators.
4. **Avoid over-formatting** -- Too many bold/italic tags make the message harder to read, not easier.
5. **Character limit awareness** -- 4096 characters per message. For many domains, batch or summarize.

### Recommended Template Structure

#### Single Domain Alert

```
<b>Domain Expiry Alert</b>

<code>example.com</code>
Expires: <b>2026-05-15</b>
Days remaining: <b>22</b>
Registrar: Cloudflare

Action required: Renew before expiration to avoid service disruption.
```

Rendered as:

> **Domain Expiry Alert**
>
> `example.com`
> Expires: **2026-05-15**
> Days remaining: **22**
> Registrar: Cloudflare
>
> Action required: Renew before expiration to avoid service disruption.

#### Multiple Domains (Batch Notification)

When multiple domains are expiring, group them by urgency:

```
<b>Domain Expiry Report</b>
<i>2026-04-23 Daily Check</i>

<b>--- Expired ---</b>

<code>expired-site.com</code>
Expired: 2026-04-20 (3 days ago)

<b>--- Expiring Soon ---</b>

<code>nearly-due.com</code>
Expires: <b>2026-04-25</b> (2 days remaining)

<code>coming-up.com</code>
Expires: <b>2026-05-10</b> (17 days remaining)

<i>Total: 1 expired, 2 expiring</i>
```

### HTML Template Function (TypeScript)

```typescript
interface DomainExpiryInfo {
  name: string
  expiryDate: string | null
  daysRemaining: number | null
  registrar: string
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function formatDomainBlock(domain: DomainExpiryInfo): string {
  const safeName = escapeHtml(domain.name)
  const registrar = escapeHtml(domain.registrar)

  if (domain.daysRemaining !== null && domain.daysRemaining < 0) {
    // Already expired
    return [
      `<code>${safeName}</code>`,
      `Expired: <b>${domain.expiryDate}</b> (${Math.abs(domain.daysRemaining)} days ago)`,
      `Registrar: ${registrar}`,
    ].join('\n')
  }

  // Expiring soon
  const daysText = domain.daysRemaining === 0
    ? 'Today'
    : `${domain.daysRemaining} days remaining`

  return [
    `<code>${safeName}</code>`,
    `Expires: <b>${domain.expiryDate}</b> (${daysText})`,
    `Registrar: ${registrar}`,
  ].join('\n')
}

export function buildExpiryNotification(
  expiredDomains: DomainExpiryInfo[],
  expiringDomains: DomainExpiryInfo[]
): string {
  const parts: string[] = []

  // Header
  parts.push('<b>Domain Expiry Report</b>')
  parts.push(`<i>${new Date().toISOString().split('T')[0]} Daily Check</i>`)

  // Expired section
  if (expiredDomains.length > 0) {
    parts.push('')
    parts.push('<b>\u{1F534} Expired</b>')
    for (const domain of expiredDomains) {
      parts.push('')
      parts.push(formatDomainBlock(domain))
    }
  }

  // Expiring section
  if (expiringDomains.length > 0) {
    parts.push('')
    parts.push('<b>\u{1F7E0} Expiring Soon</b>')
    for (const domain of expiringDomains) {
      parts.push('')
      parts.push(formatDomainBlock(domain))
    }
  }

  // Summary
  parts.push('')
  parts.push(
    `<i>Total: ${expiredDomains.length} expired, ${expiringDomains.length} expiring</i>`
  )

  return parts.join('\n')
}
```

### Test Message Template

For the "send test message" verification feature:

```typescript
export function buildTestMessage(): string {
  return [
    '<b>Test Notification</b>',
    '',
    `Sent at: <code>${new Date().toISOString()}</code>`,
    '',
    'If you see this message, the Telegram Bot integration is working correctly.',
  ].join('\n')
}
```

Rendered as:

> **Test Notification**
>
> Sent at: `2026-04-23T10:30:00.000Z`
>
> If you see this message, the Telegram Bot integration is working correctly.

### Character Limit Handling

If the message exceeds 4096 characters (many domains), split into multiple messages:

```typescript
function splitMessages(fullText: string, limit = 4000): string[] {
  const messages: string[] = []
  let remaining = fullText

  while (remaining.length > 0) {
    if (remaining.length <= limit) {
      messages.push(remaining)
      break
    }

    // Find last newline before limit to avoid splitting mid-domain
    let splitAt = remaining.lastIndexOf('\n\n', limit)
    if (splitAt < limit / 2) {
      splitAt = remaining.lastIndexOf('\n', limit)
    }
    if (splitAt < limit / 2) {
      splitAt = limit
    }

    messages.push(remaining.slice(0, splitAt))
    remaining = remaining.slice(splitAt).trimStart()
  }

  return messages
}
```

### Message Template for Single-Domain Urgent Alert

When only one domain is critically expiring (e.g., within 3 days), use a more urgent format:

```typescript
export function buildUrgentAlert(domain: DomainExpiryInfo): string {
  const safeName = escapeHtml(domain.name)
  const daysText = domain.daysRemaining === 0
    ? '<b>TODAY</b>'
    : `<b>${domain.daysRemaining} days</b>`

  return [
    `<b>URGENT: ${safeName}</b>`,
    '',
    `Domain expires in ${daysText}`,
    `Expiry date: <code>${domain.expiryDate}</code>`,
    `Registrar: ${escapeHtml(domain.registrar)}`,
    '',
    'Please renew immediately to avoid service disruption.',
  ].join('\n')
}
```

### Formatting Best Practices Summary

| Practice | Why |
|----------|-----|
| Use `<code>` for domain names | Domains look like code/data, monospace makes them scannable |
| Use `<b>` for dates and day counts | Draws attention to the key numbers |
| Use `<i>` for meta/summary info | De-emphasize secondary information |
| Separate domains with blank lines | Visual separation between domain blocks |
| Escape all user-provided text | Prevent HTML injection / broken messages |
| Keep header concise | Users see the first ~100 chars in notification preview |
| Use English in templates | Domain management is technical; Chinese for explanatory text is fine but keep domain-specific terms in English |

### Project Integration Notes

The project's domain data is shaped by `lib/mappers/domain.ts` which maps DB rows to `Domain` type with fields:

| App Field | DB Column | Template Usage |
|-----------|-----------|----------------|
| `name` | `name` | Domain name (escape, wrap in `<code>`) |
| `expiryDate` | `expiry_date` | Expiry date (bold) |
| `registrar` | `registrar` | Registrar name |

`lib/date.ts` provides `differenceInDays(target)` which returns days remaining (negative = expired). This maps directly to `daysRemaining` in the template.

`lib/domainStatus.ts` has thresholds:
- `expired`: `remainingDays < 0`
- `expiring`: `remainingDays <= 7`
- `normal`: `remainingDays > 7`

The PRD mentions "N days before" as configurable, so the cron handler should use a configurable threshold rather than the hardcoded 7-day value from `domainStatus.ts`.

## Notes / Not Found

- The `<tg-spoiler>` and `<blockquote>` tags were considered but not used in these templates as they don't add value for expiry notifications.
- Emoji usage (e.g., red circle for expired, orange circle for expiring) should be kept minimal -- some notification contexts strip or render emojis differently.
- No Markdown/V2 format was considered since PRD specifies HTML.
