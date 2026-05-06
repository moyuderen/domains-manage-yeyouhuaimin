# Research: Telegram Bot API Core Endpoints

- **Query**: Telegram Bot sendMessage / getUpdates API, HTML parse mode, error handling
- **Scope**: External
- **Date**: 2026-04-23

## Findings

### sendMessage API

**Endpoint**: `POST https://api.telegram.org/bot{token}/sendMessage`

**Required Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `chat_id` | `number` or `string` | Target chat ID (numeric for users/groups, `@channelname` for public channels) |
| `text` | `string` | Message text (1-4096 characters after parse_mode formatting) |

**Key Optional Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `parse_mode` | `string` | none | `HTML`, `Markdown`, or `MarkdownV2` |
| `disable_notification` | `boolean` | false | Send silently (no push notification sound) |
| `disable_web_page_preview` | `boolean` | false | Disable link previews in message |
| `reply_to_message_id` | `number` | none | Reply to a specific message |
| `protect_content` | `boolean` | false | Prevent forwarding/saving |

**Example Request (TypeScript, native fetch)**:

```typescript
async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string,
  options?: { parseMode?: string; disableNotification?: boolean }
): Promise<Response> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
  }

  if (options?.parseMode) {
    body.parse_mode = options.parseMode
  }
  if (options?.disableNotification !== undefined) {
    body.disable_notification = options.disableNotification
  }

  return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
```

**Success Response** (HTTP 200):

```json
{
  "ok": true,
  "result": {
    "message_id": 42,
    "from": { "id": 123456, "is_bot": true, "first_name": "MyBot" },
    "chat": { "id": 789012, "type": "private" },
    "date": 1713849600,
    "text": "Hello world"
  }
}
```

**Error Response** (HTTP 4xx/5xx):

```json
{
  "ok": false,
  "error_code": 400,
  "description": "Bad Request: chat not found"
}
```

### getUpdates API

**Endpoint**: `GET https://api.telegram.org/bot{token}/getUpdates`

Used to receive incoming updates via polling. For this project, the primary use case is extracting the `chat_id` after a user sends `/start` or any message to the bot.

**Key Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `offset` | `number` | none | Identifier of the first update to return. Must be one greater than the last received update_id to acknowledge it. |
| `limit` | `number` | 100 | Limits the number of updates to retrieve (1-100) |
| `timeout` | `number` | 0 | Long polling timeout in seconds (0 = short polling, up to 50) |
| `allowed_updates` | `string[]` | all | JSON-serialized array of update types to receive |

**Short Polling** (for one-shot chat_id extraction):

```typescript
async function getBotChatId(token: string): Promise<number | null> {
  const res = await fetch(
    `https://api.telegram.org/bot${token}/getUpdates?limit=10`
  )
  const data = await res.json()

  if (!data.ok || !data.result?.length) {
    return null
  }

  // Extract chat_id from the latest message
  const lastUpdate = data.result[data.result.length - 1]
  const chatId = lastUpdate?.message?.chat?.id
    ?? lastUpdate?.edited_message?.chat?.id
    ?? null

  return chatId
}
```

**Long Polling**: Set `timeout` to e.g. 25 seconds. The server holds the connection open until an update arrives or timeout expires. Not needed for this project (we only need one-shot extraction).

**Important**: After retrieving updates, confirm them by calling getUpdates again with `offset = last_update_id + 1`. Otherwise the same updates will be returned repeatedly.

**Response Structure**:

```json
{
  "ok": true,
  "result": [
    {
      "update_id": 123456789,
      "message": {
        "message_id": 1,
        "from": { "id": 111222, "first_name": "User" },
        "chat": { "id": 111222, "type": "private" },
        "date": 1713849600,
        "text": "/start"
      }
    }
  ]
}
```

### Error Handling

**Common Error Codes**:

| HTTP Status | Error Code | Description | Action |
|-------------|-----------|-------------|--------|
| 400 | `BAD_REQUEST` | Malformed request, invalid parse_mode, bad HTML | Check message formatting |
| 401 | `UNAUTHORIZED` | Invalid bot token | Verify token configuration |
| 403 | `FORBIDDEN` | Bot was blocked by user, or chat not found | Log and skip; user must re-initiate |
| 404 | `Not Found` | Invalid bot token format | Verify token |
| 429 | `TOO_MANY_REQUESTS` | Rate limited | Retry after `retry_after` seconds (in response body) |
| 400 | `chat not found` | chat_id does not exist | Verify chat_id |

**Rate Limits**:
- 1 message per second to the same chat
- 30 messages per second overall (across all chats)
- 20 messages per minute to the same group
- Bulk notifications: max ~30 messages per second spread across users

**Rate Limit Response**:

```json
{
  "ok": false,
  "error_code": 429,
  "description": "Too Many Requests: retry after 5",
  "parameters": { "retry_after": 5 }
}
```

**Error Handling Pattern (TypeScript)**:

```typescript
interface TelegramErrorResponse {
  ok: false
  error_code: number
  description: string
  parameters?: { retry_after?: number; migrate_to_chat_id?: number }
}

async function safeSendTelegram(
  token: string,
  chatId: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })

    const data = await res.json()

    if (!data.ok) {
      const err = data as TelegramErrorResponse
      console.error(`Telegram API error ${err.error_code}: ${err.description}`)
      return { success: false, error: err.description }
    }

    return { success: true }
  } catch (error) {
    console.error('Telegram fetch failed:', error)
    return { success: false, error: 'Network error' }
  }
}
```

### HTML Formatting (parse_mode: "HTML")

**Supported Tags**:

| Tag | Effect | Example |
|-----|--------|---------|
| `<b>...</b>` or `<strong>...</strong>` | Bold | `<b>Important</b>` |
| `<i>...</i>` or `<em>...</em>` | Italic | `<i>note</i>` |
| `<u>...</u>` | Underline | `<u>underline</u>` |
| `<s>...</s>` or `<del>...</del>` | Strikethrough | `<s>removed</s>` |
| `<code>...</code>` | Monospace (inline) | `<code>example.com</code>` |
| `<pre>...</pre>` | Preformatted block | `<pre>block text</pre>` |
| `<pre><code class="language-xxx">...</code></pre>` | Syntax-highlighted code block | `<pre><code class="language-json">{...}</code></pre>` |
| `<a href="URL">...</a>` | Inline link | `<a href="https://example.com">link</a>` |
| `<tg-spoiler>...</tg-spoiler>` | Spoiler text | `<tg-spoiler>hidden</tg-spoiler>` |
| `<blockquote>...</blockquote>` | Block quote | `<blockquote>quote</blockquote>` |
| `<tg-emoji emoji-id="...">...</tg-emoji>` | Custom emoji | Rarely used |

**Limitations and Gotchas**:

1. **HTML must be well-formed** -- unclosed tags cause the entire message to be rejected (400 error)
2. **No nested formatting** in all clients -- `<b><i>text</i></b>` may render inconsistently across clients
3. **Character limit** is 4096 characters AFTER HTML parsing. Long messages are truncated.
4. **Special characters** `<`, `>`, `&` in plain text must be escaped as `&lt;`, `&gt;`, `&amp;` respectively. Do NOT escape them inside tag attributes.
5. **`<a>` tags** must have an `href` attribute with a valid URL starting with `http://` or `https://`
6. **No `<br>` tag** -- use newline characters `\n` for line breaks in the `text` field
7. **No `<p>` tag** -- not supported
8. **Images/media** cannot be embedded in sendMessage text; use sendPhoto/sendDocument separately

**Escape helper**:

```typescript
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
```

## Notes / Not Found

- All Telegram Bot API endpoints use `https://api.telegram.org/bot{token}/{method}` as the base URL pattern.
- No authentication header is needed; the token is embedded in the URL path.
- For production use, consider adding a timeout to the fetch call (e.g., `AbortSignal.timeout(10000)`).
- The Bot API is stable and backward-compatible; no versioning in the URL.
