# Research: Next.js Route Handler for Cron

- **Query**: Best practices for cron-triggered Route Handler in Next.js App Router, CRON_SECRET auth, method conventions
- **Scope**: External + Internal
- **Date**: 2026-04-23

## Findings

### Route Handler Location Convention

In Next.js App Router, Route Handlers are defined as `route.ts` files under `app/api/`:

```
app/api/cron/domain-expiry-check/route.ts
```

This maps to `GET/POST /api/cron/domain-expiry-check`.

### Existing Project Patterns

The project currently has **zero Route Handlers** -- all data mutation goes through Server Actions (`app/actions/*.ts`). This cron endpoint will be the first Route Handler.

Relevant project infrastructure:

| File | Role |
|------|------|
| `lib/supabase/server.ts` | Server-side Supabase client (uses cookies) |
| `lib/supabase/admin.ts` | Admin client (service role key, bypasses RLS) |
| `lib/data/domains.ts` | Domain data access layer |
| `lib/data/settings.ts` | Settings data access layer |
| `lib/domainStatus.ts` | Status computation from expiryDate |
| `lib/date.ts` | Date utilities (differenceInDays, addDays) |

**Important**: The cron endpoint runs without a user session. `createSupabaseServerClient()` relies on cookies which will not be present in a cron context. The route handler must use `createSupabaseAdminClient()` from `lib/supabase/admin.ts` for database access, or a dedicated unauthenticated server client.

### HTTP Method: GET vs POST

**Standard practice**: Cron triggers (Vercel Cron, GitHub Actions, external schedulers) typically use `GET` for simple "tick" endpoints.

However, for security-sensitive operations:

| Method | Pros | Cons |
|--------|------|------|
| `GET` | Simple, standard for cron services like Vercel Cron | Semantically not ideal for side-effect operations |
| `POST` | Semantically correct for write operations, body can carry parameters | Some cron services default to GET |

**Recommendation for this project**: Use `GET` since the PRD specifies external cron calls and GET is the most universal method across cron providers. Authentication via `CRON_SECRET` header provides sufficient protection.

```typescript
// app/api/cron/domain-expiry-check/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // ... handler logic
}
```

### CRON_SECRET Authentication

The cron endpoint must verify an authentication secret to prevent unauthorized invocation.

**Pattern**: Check a custom header (`Authorization: Bearer <secret>`) against the `CRON_SECRET` environment variable.

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('CRON_SECRET is not configured')
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 500 }
    )
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // ... authenticated logic
}
```

**Caller side** (cron service configuration):

```bash
curl -X GET \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  https://your-domain.com/api/cron/domain-expiry-check
```

### Route Segment Config

For a cron handler that may involve multiple database queries and API calls, configure the route appropriately:

```typescript
// Disable caching -- this must execute every time it is called
export const dynamic = 'force-dynamic'

// Optional: extend timeout for long-running checks
// Vercel: default 10s for Hobby, 60s for Pro; self-hosted: depends on config
export const maxDuration = 60 // seconds (only effective on Vercel)
```

**Important**: `export const dynamic = 'force-dynamic'` is essential. Without it, Next.js may cache the response, meaning the cron logic would not execute on subsequent calls.

### Response Format Best Practices

Return structured JSON with enough information for monitoring and debugging:

```typescript
interface CronResponse {
  success: boolean
  message: string
  checkedAt: string        // ISO timestamp
  domainsChecked?: number  // how many domains were evaluated
  notificationsSent?: number // how many Telegram messages sent
  errors?: string[]        // non-fatal errors encountered
}
```

**Example success response** (HTTP 200):

```json
{
  "success": true,
  "message": "Domain expiry check completed",
  "checkedAt": "2026-04-23T02:00:00.000Z",
  "domainsChecked": 42,
  "notificationsSent": 3,
  "errors": []
}
```

**Example partial failure** (HTTP 200 -- the cron itself ran, but some notifications failed):

```json
{
  "success": true,
  "message": "Domain expiry check completed with errors",
  "checkedAt": "2026-04-23T02:00:00.000Z",
  "domainsChecked": 42,
  "notificationsSent": 2,
  "errors": ["Telegram API error for domain example.com: 403 Forbidden"]
}
```

**Auth failure** (HTTP 401):

```json
{ "error": "Unauthorized" }
```

**Config missing** (HTTP 500):

```json
{ "error": "Bot token or chat ID not configured" }
```

### Timeout Considerations

1. **Vercel serverless function timeout**: 10s (Hobby), 60s (Pro). If checking hundreds of domains and sending many notifications, this could be a bottleneck.
2. **Telegram API rate limit**: 30 messages/second overall. For large domain lists, batch and add delays.
3. **Self-hosted Node.js**: No hard timeout from Next.js, but consider adding an `AbortSignal.timeout()` to the overall handler.

**Timeout-safe pattern**:

```typescript
export async function GET(request: NextRequest) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 50_000) // 50s safety margin

  try {
    // ... handler logic, pass controller.signal to fetch calls
    const result = await doDomainCheck(controller.signal)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Handler timed out' },
        { status: 504 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    clearTimeout(timeout)
  }
}
```

### Complete Route Handler Skeleton

```typescript
// app/api/cron/domain-expiry-check/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // 1. Authenticate
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Read config from settings (requires admin/supabase client without session)
  // const { botToken, chatId } = await getTelegramConfig()

  // 3. Query expiring/expired domains
  // const domains = await getExpiringDomains()

  // 4. Build and send notifications
  // for (const domain of domains) {
  //   await sendTelegramMessage(botToken, chatId, formatMessage(domain))
  // }

  // 5. Return result
  return NextResponse.json({
    success: true,
    message: 'Domain expiry check completed',
    checkedAt: new Date().toISOString(),
    domainsChecked: 0,
    notificationsSent: 0,
    errors: [],
  })
}
```

### .env.example Addition

```
# Cron endpoint authentication secret (used by external scheduler to call /api/cron/*)
CRON_SECRET=your-cron-secret-here
```

### Related Project Files

| File | Relevance |
|------|-----------|
| `lib/supabase/admin.ts` | Must use this for DB access in cron (no session cookies) |
| `lib/data/settings.ts` | Settings query pattern (needs adaptation for admin client) |
| `lib/data/domains.ts` | Domain query pattern (expiry_date filtering) |
| `lib/domainStatus.ts` | `getDomainStatus()` computes status from `expiryDate` |
| `lib/date.ts` | `differenceInDays()` for days-until-expiry calculation |
| `.env.example` | Needs `CRON_SECRET` entry |

### Key Implementation Note

The existing `lib/data/settings.ts` uses `createSupabaseServerClient()` which requires the cookie-based session. The cron handler has no session cookies. Two approaches:

1. **Create a dedicated query function** in `lib/data/settings.ts` that uses `createSupabaseAdminClient()` for cron context
2. **Use the admin client directly** in the route handler for the settings lookup

Option 1 is cleaner and aligns with the project's data-layer pattern.

## Notes / Not Found

- No existing Route Handlers in the project to reference -- this is the first one.
- The project uses Next.js 16.x (`"next": "^16.2.2"`). Route Handler API is stable since Next.js 13.
- Vercel Cron Jobs (if used) would use `vercel.json` for schedule config, but PRD says external cron -- so no `vercel.json` cron config needed.
