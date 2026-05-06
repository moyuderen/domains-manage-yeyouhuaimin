# 数据库操作

本文档介绍域名管理平台中使用 Supabase（PostgreSQL）的数据库操作模式。

## Supabase 客户端类型

| 客户端 | 位置 | 用途 |
|--------|----------|-------|
| `createSupabaseAdminClient` | `lib/supabase/admin.ts` | **数据层唯一客户端** — `lib/data/*` 中所有数据操作均使用此客户端（绕过 RLS） |
| `createSupabaseServerClient` | `lib/supabase/server.ts` | 基于 anon key + cookie session，受 RLS 约束。当前项目未使用，保留供未来引入 Supabase Auth 时复用 |
| `createSupabaseBrowserClient` | `lib/supabase/browser.ts` | 客户端组件（少用，仅在必要时使用） |
| `isSupabaseConfigured` | `lib/supabase/config.ts` | 检查 Supabase 环境变量是否已配置 |

### Design Decision: 数据层统一使用 Admin Client

**背景**：RLS 已启用且无开放策略（数据库对 anon key 私有）。`createSupabaseServerClient` 基于 anon key，受 RLS 约束，无法读写数据。应用层已有 Access Key + middleware 做路由保护，数据层无需再依赖 RLS 做权限控制。

**结论**：`lib/data/*` 中所有 Supabase 操作统一使用 `createSupabaseAdminClient()`（service role key，绕过 RLS）。

```typescript
// 正确 — lib/data/* 中的标准模式
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
const supabase = createSupabaseAdminClient()  // 注意：不需要 await
```

**注意**：`createSupabaseAdminClient()` 是同步函数（不依赖 cookies），不需要 `await`。

## 查询模式

### 基础查询

```typescript
const supabase = createSupabaseAdminClient()
const { data, error } = await supabase
  .from('domains')
  .select('*, subdomains(*)')
  .eq('id', id)
  .maybeSingle()

if (error) throw new Error(error.message)
```

### 带过滤条件的分页列表查询

```typescript
const supabase = createSupabaseAdminClient()
let builder = supabase
  .from('domains')
  .select('*, subdomains(*)', { count: 'exact' })

if (keyword) {
  builder = builder.or([
    `name.ilike.%${keyword}%`,
    `registrar_site_id.in.(${siteIds.join(',')})`,
  ].join(','))
}

if (status === 'expired') {
  builder = builder.lt('expiry_date', todayDate())
}

const from = (page - 1) * pageSize
const to = from + pageSize - 1
const { data, error, count } = await builder
  .order('updated_at', { ascending: false })
  .range(from, to)
```

### 插入

```typescript
const supabase = createSupabaseAdminClient()
const payload = {
  name: normalizeDomainName(values.name),
  registrar_site_id: values.registrarSiteId || null,
  registrar_account_id: values.registrarAccountId || null,
  expiry_date: values.expiryDate || null,
}

const { error } = await supabase.from('domains').insert(payload)
if (error) throw new Error(error.message)
```

### 更新

```typescript
const { error } = await supabase
  .from('domains')
  .update(payload)
  .eq('id', id)

if (error) throw new Error(error.message)
```

### 删除（单条与批量）

```typescript
// 单条删除
const { error } = await supabase.from('domains').delete().eq('id', id)

// 批量删除
const { error } = await supabase.from('domains').delete().in('id', ids)
```

## 字段命名约定

数据库列名使用 **snake_case**，应用模型使用 **camelCase**。转换在 `lib/mappers/*` 中完成：

| 数据库列名 | 应用字段名 |
|-----------|-----------|
| `registrar_site_id` | `registrarSiteId` |
| `registrar_account_id` | `registrarAccountId` |
| `expiry_date` | `expiryDate` |
| `created_at` | `createdAt` |
| `dns_site_id` | `dnsSiteId` |

## Mock 数据回退

当 `isSupabaseConfigured()` 返回 false 时，数据函数回退到 `lib/mock/*`：

```typescript
export async function getDomains(query: DomainListQuery) {
  if (!isSupabaseConfigured()) {
    return paginateDomains(sortDomains(filterMockDomains(query), query), query)
  }
  // ... Supabase 查询
}
```

## 数据库迁移规范

每次涉及表结构变更（新增/删除/修改列、新建表、修改约束等）都必须：

1. **更新 `supabase/schema.sql`** — 保持完整 schema 定义
2. **创建迁移文件** — 在 `supabase/migrations/` 下新建文件，命名格式：`YYYYMMDDHHMMSS_description.sql`
3. **迁移文件必须幂等** — 使用 `IF EXISTS` / `IF NOT EXISTS` 确保可重复执行

```sql
-- 示例：幂等迁移
alter table public.domains
  add column if not exists new_column text not null default '';

-- 示例：幂等删除
alter table public.domains
  drop column if exists old_column;
```

**注意**：迁移文件目前通过 Supabase SQL Editor 手动执行，不使用自动化工具。

## Scenario: 账号站点关系 ID 化迁移与域名反推补数

### 1. Scope / Trigger
- Trigger: 涉及 `accounts.sites` JSON 结构迁移、`domains` -> `accounts` 的跨表回填、以及手动执行的 SQL 数据清洗。
- 适用场景：当账号站点关系从旧站点名称文本切换为 `sites.id`，或需要根据域名中的 registrar/dns 关联补齐账号 `sites` 时。

### 2. Signatures
- DB 表字段：
  - `public.accounts.sites jsonb`
  - `public.domains.registrar_account_id uuid`
  - `public.domains.registrar_site_id uuid`
  - `public.domains.dns_account_id uuid`
  - `public.domains.dns_site_id uuid`
  - `public.sites.id uuid`
  - `public.sites.name text`
- 迁移文件：`supabase/migrations/*_store_account_sites_by_site_id.sql`

### 3. Contracts
- `accounts.sites` 条目结构：
  - `site: string` — 最终必须为 `sites.id`，不能再保留站点名称文本
  - `note: string` — 迁移与补数后必须保留已有人工备注
  - `isActive: boolean` — 迁移与补数后必须保留已有停用语义
- 域名反推关系来源：
  - `(registrar_account_id, registrar_site_id)`
  - `(dns_account_id, dns_site_id)`
- 环境/执行方式：
  - 迁移通过 Supabase SQL Editor 手动执行
  - 不依赖额外 Node 脚本作为主清洗路径

### 4. Validation & Error Matrix
- `accounts.sites[*].site` 等于 `sites.name` -> 迁移时替换为对应 `sites.id`
- `accounts.sites[*].site` 已是合法 `sites.id` -> 保留为 ID，不重复改写
- 同一账号同一站点同时出现“旧名称条目 + 新 ID 条目” -> 合并为单条 ID 记录
- 多条重复记录存在任一 `isActive = false` -> 合并后保留 `isActive = false`
- 多条重复记录存在非空 `note` -> 合并后保留已有非空 `note`
- `domains` 中存在 `(account_id, site_id)` 但账号 `sites` 缺失 -> 迁移时补回账号 `sites`
- `account.sites` 为 `NULL` -> 使用 `is distinct from` 参与更新，不能跳过
- 无法从 `sites.id` 或 `sites.name` 解析出的历史文本 -> 保留原值，不做猜测映射

### 5. Good/Base/Bad Cases
- Good: 账号已有 `[{ site: "阿里云", note: "主账号", isActive: true }]`，站点表能匹配到阿里云，迁移后变成 `[{ site: "<aliyun-id>", note: "主账号", isActive: true }]`
- Base: 账号 `sites` 为空，但域名里出现 `(accountId, registrarSiteId)`，迁移后自动补出 `[{ site: "<site-id>", note: "", isActive: true }]`
- Bad: 同一账号同时保留 `{ site: "阿里云" }` 和 `{ site: "<aliyun-id>" }` 两条重复语义记录；或迁移把已有 `note/isActive` 清空覆盖

### 6. Tests Required
- SQL/验证查询：
  - 断言迁移后 `accounts.sites[*].site` 不再命中已知旧站点名称
  - 断言域名里出现过的 `(accountId, siteId)` 在账号 `sites` 中存在
  - 断言重复站点条目被合并为单条 ID 记录
  - 断言已有非空 `note` 与 `isActive = false` 在合并后仍被保留
- 应用层回归：
  - 账号列表/详情/筛选仍能用 ID 正常显示站点名
  - `getUsedSites()` 返回 `{ id, name }[]`，不再依赖域名表直接读名称

### 7. Wrong vs Correct
#### Wrong
```sql
-- 只做名称替换，不处理域名反推补数，也忽略 NULL 安全更新
update public.accounts account
set sites = mapped.sites
from ...
where account.sites <> mapped.sites;
```

#### Correct
```sql
-- 名称 -> ID、domains 反推补齐、重复合并、NULL 安全更新一次完成
with domain_relations as (...), candidate_entries as (...), ranked_entries as (...)
update public.accounts account
set sites = final_accounts.sites
from final_accounts
where account.id = final_accounts.id
  and account.sites is distinct from final_accounts.sites;
```

## Scenario: 通知投递内容模型与服务端边界

### 1. Scope / Trigger
- Trigger: 涉及通知事件入库、provider 发送、通知 payload 结构、或通知相关服务端 helper 改造时。
- 适用文件：`lib/events/sinks/notification.ts`、`lib/data/notifications.ts`、`lib/data/settings.ts`、`lib/notifications/*`、`types/notification.ts`。

### 2. Signatures
- 投递入库：`createNotificationDelivery(input)`
- Provider 发送：`sendTelegramDelivery({ delivery, endpoint })`
- endpoint 查询：`listNotificationEndpointsByChannel(channelKey)`
- 通知 payload：
  - `version?: number`
  - `content?: NotificationContent`
  - `context?: NotificationPayloadContext`
  - `message?: string`（仅历史兼容）
- `NotificationContent`：
  - `title: string`
  - `summary: string`
  - `blocks: NotificationContentBlock[]`
  - `meta: Record<string, string>`

### 3. Contracts
- 新通知投递记录的 `payload` 应优先写入标准化内容模型，而不是只写最终字符串。
- `payload.content.blocks` 允许的 block：
  - `text` -> `{ type: 'text', label, value }`
  - `list` -> `{ type: 'list', label, items }`
- `payload.context` 至少保留事件上下文：`eventKey`、`resourceType`、`resourceId`、`resourceName`、`occurredAt`、`detail`。
- provider sender 从 `payload.content` 渲染渠道消息；只有历史记录兼容时才 fallback 到 `payload.message`。
- 所有会读取 endpoint 配置、bot token、service-role 数据的 helper 必须是服务端专用模块，并显式 `import 'server-only'`。

### 4. Validation & Error Matrix
- `payload.content` 缺失但 `payload.message` 存在 -> 允许发送，按历史字符串兼容。
- `payload.content.title/summary` 缺失 -> sender 不应信任该结构，应回退旧字段或返回“消息内容为空”。
- endpoint 缺少 bot token / chat id -> provider 返回失败，不静默跳过。
- 模块读取 admin client / provider secret 但未限制服务端边界 -> 视为实现缺陷，必须补 `server-only`。

### 5. Good/Base/Bad Cases
- Good: sink 写入 `version + content + context`，Telegram sender 由 content 渲染消息。
- Base: 历史 delivery 只有 `payload.message`，sender 仍可兼容发送。
- Bad: 把 Telegram 最终字符串作为唯一事实来源写入 payload，后续 Email/Webhook 无法复用；或在非 `server-only` 模块里读取 bot token。

### 6. Tests Required
- 单测：`buildNotificationPayload` / renderer 输出包含 title、summary、blocks。
- 单测：sender 在 `payload.content` 存在时优先渲染内容模型。
- 回归：sender 在旧 `payload.message` 记录上仍可发送。
- 构建检查：`npm run lint`、`npm run build` 必须通过，且通知相关服务端 helper 不得被客户端导入。

### 7. Wrong vs Correct
#### Wrong
```typescript
payload: {
  message: buildTelegramNotificationMessage(event, options),
}
```

#### Correct
```typescript
payload: {
  version: 2,
  content,
  context: {
    eventKey: event.eventKey,
    occurredAt: event.occurredAt,
    detail: event.detail,
  },
}
```

## 域名状态规则

域名状态（`normal`、`expiring`、`expired`）**始终**在查询时通过 `lib/domainStatus.ts` 由 `expiryDate` 计算得出，绝不能将其作为字段存储在数据库中。

## 安全规则

| 规则 | 说明 |
|------|--------|
| 客户端代码环境变量 | 只能使用 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Service role key | 只能在 `lib/supabase/admin.ts` 中使用，绝不能出现在客户端代码中 |
| RLS 策略 | 所有表启用 RLS 但无开放策略 — 数据库对 anon key 完全私有 |
| 数据层客户端 | `lib/data/*` 统一使用 `createSupabaseAdminClient()`（绕过 RLS） |
| 输入校验 | 写入数据库前必须使用 Zod schema 进行校验 |
| 权限检查 | Server Actions 中必须调用 `requireAccess()` |

## 正确与错误模式对比

### 错误处理

```typescript
// 正确 — 使用数据前始终检查 error
const { data, error } = await supabase.from('domains').select('*')
if (error) throw new Error(error.message)

// 错误 — 忽略 error，data 可能为 null
const { data } = await supabase.from('domains').select('*')
return data.map(mapDomain)  // data 为 null 时会崩溃
```

### 批量操作

```typescript
// 正确 — 使用 .in() 单次查询
const { error } = await supabase.from('domains').delete().in('id', ids)

// 错误 — N+1 问题，每条记录执行一次查询
for (const id of ids) {
  await supabase.from('domains').delete().eq('id', id)
}
```

### 客户端安全

```typescript
// 正确 — 在 lib/data/* 中使用 admin 客户端
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
const supabase = createSupabaseAdminClient()

// 错误 — 在客户端组件中使用 admin 客户端
'use client'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
// 绝对禁止 — 会将 service role key 暴露给浏览器
```

## 反模式

- 在客户端代码中使用 `createSupabaseAdminClient`
- 将 `SUPABASE_SERVICE_ROLE_KEY` 暴露在任何 `NEXT_PUBLIC_*` 变量中
- 跳过 Supabase 响应的错误检查（`if (error) throw`）
- 在 Supabase builder API 已能满足需求时编写原始 SQL
- 将计算得出的域名状态存储到数据库中
- 在循环中 await Supabase 调用（批量操作请使用 `.in()`）
- 在 `lib/data/*` 中使用 `createSupabaseServerClient()`（受 RLS 约束，无法读写数据）
