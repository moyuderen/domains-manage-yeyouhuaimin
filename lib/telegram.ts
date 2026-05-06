// ---------------------------------------------------------------------------
// Message splitting (4096 char limit)
// ---------------------------------------------------------------------------

function splitMessages(fullText: string, limit = 4000): string[] {
  const messages: string[] = []
  let remaining = fullText

  while (remaining.length > 0) {
    if (remaining.length <= limit) {
      messages.push(remaining)
      break
    }

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

// ---------------------------------------------------------------------------
// Send helpers
// ---------------------------------------------------------------------------

export interface TelegramSendResult {
  success: boolean
  error?: string
}

export async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string
): Promise<TelegramSendResult> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
      signal: AbortSignal.timeout(10_000),
    })

    const data = await res.json()

    if (!data.ok) {
      const description = data.description ?? `HTTP ${res.status}`
      console.error(`Telegram API error ${data.error_code}: ${description}`)
      return { success: false, error: description }
    }

    return { success: true }
  } catch (error) {
    console.error('Telegram fetch failed:', error)
    return { success: false, error: 'Network error' }
  }
}

export async function sendTelegramMessages(
  token: string,
  chatId: string,
  text: string
): Promise<TelegramSendResult[]> {
  const chunks = splitMessages(text)
  const results: TelegramSendResult[] = []

  for (const chunk of chunks) {
    const result = await sendTelegramMessage(token, chatId, chunk)
    results.push(result)
    if (!result.success) break
  }

  return results
}

// ---------------------------------------------------------------------------
// getUpdates — extract Chat ID
// ---------------------------------------------------------------------------

export async function getTelegramChatId(
  token: string
): Promise<{ chatId: string | null; error?: string }> {
  try {
    // Clear any existing webhook — getUpdates and webhook are mutually exclusive
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
    })

    const res = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?limit=10`,
      { signal: AbortSignal.timeout(10_000) }
    )

    const data = await res.json()

    if (!data.ok) {
      return { chatId: null, error: data.description ?? `HTTP ${res.status}` }
    }

    if (!data.result?.length) {
      return { chatId: null, error: '未找到消息，请先向 Bot 发送任意消息' }
    }

    const lastUpdate = data.result[data.result.length - 1]
    const chatId =
      lastUpdate?.message?.chat?.id ?? lastUpdate?.edited_message?.chat?.id ?? null

    if (chatId == null) {
      return { chatId: null, error: '无法从最近消息中提取 Chat ID' }
    }

    return { chatId: String(chatId) }
  } catch {
    return { chatId: null, error: '网络请求失败' }
  }
}
