# 后端目录结构

本文档描述域名管理平台的服务端文件组织方式。

## 概览

```
app/actions/                    # Server Actions（数据变更）
├── domains.ts                  # 域名 CRUD
├── accounts.ts                 # 账号 CRUD
├── sites.ts                    # 站点 CRUD
├── subdomains.ts               # 子域名 CRUD
├── settings.ts                 # 设置更新
└── auth.ts                     # 登录/登出

lib/data/                       # 数据查询（读取）
├── domains.ts                  # getDomains, getDomainById, createDomain, ...
├── accounts.ts                 # getAllAccounts, getAccountById, ...
├── sites.ts                    # getActiveSites, getAllSites, ...
├── dashboard.ts                # getDashboardData
├── settings.ts                 # getSettings, updateSettings
└── current-user.ts             # 会话/用户辅助函数

lib/supabase/                   # Supabase 客户端工厂
├── server.ts                   # createSupabaseServerClient（基于 cookie）
├── browser.ts                  # createSupabaseBrowserClient（客户端）
├── admin.ts                    # createSupabaseAdminClient（service role）
└── config.ts                   # isSupabaseConfigured

lib/mappers/                    # 数据库行 → 应用模型映射器
├── domain.ts                   # mapDomain, mapSubdomain, normalizeDomainName
├── account.ts                  # mapAccount
└── site.ts                     # mapSite

lib/auth/                       # 访问密钥认证
├── access.ts                   # verifyAccessKey、会话创建与校验
└── access-server.ts            # requireAccess、cookie 管理

lib/mock/                       # Mock 数据（Supabase 未配置时的回退）
├── domains.ts
├── accounts.ts
└── sites.ts

schemas/                        # Zod 校验 schema
├── domainSchemas.ts
├── accountSchemas.ts
└── siteSchemas.ts

types/                          # TypeScript 类型定义
├── domain.ts                   # Domain, DomainRow, DomainFormValues, ...
├── account.ts                  # Account, AccountRow, AccountFormValues, ...
└── site.ts                     # Site, SiteRow, SiteFormValues, ...
```

## Server Action 模式

每个 Server Action 遵循以下模式：

```typescript
// app/actions/domains.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireAccess } from '@/lib/auth/access-server'
import { createDomain } from '@/lib/data/domains'
import { domainSchema } from '@/schemas/domainSchemas'
import type { DomainFormValues } from '@/types/domain'

export async function createDomainAction(values: DomainFormValues) {
  await requireAccess()                    // 1. 权限检查
  const parsed = domainSchema.parse(values) // 2. 校验输入
  await createDomain(parsed)               // 3. 委托数据层处理
  revalidatePath('/')                      // 4. 使缓存失效
  revalidatePath('/dashboard')
}
```

### 规则

1. 文件以 `'use server'` 开头
2. 每个 action 首先调用 `requireAccess()`
3. 使用 Zod schema 校验输入
4. 将数据库操作委托给 `lib/data/*`
5. 为受影响的路由调用 `revalidatePath()`
6. 函数名以 `Action` 后缀结尾

## 数据层模式

`lib/data/*` 中的数据查询函数负责：

1. **Supabase 配置检查** — 未配置时回退到 mock 数据
2. **创建 Supabase 客户端** — 通过 `createSupabaseServerClient()`
3. **构建查询** — 使用 Supabase 链式 builder API
4. **行数据映射** — 将数据库 snake_case 行转换为 camelCase 模型

```typescript
// lib/data/domains.ts
export async function getDomainById(id: string): Promise<Domain | null> {
  if (!isSupabaseConfigured()) {
    return mockDomains.find((domain) => domain.id === id) ?? null
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('domains')
    .select('*, subdomains(*)')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return mapDomain(data as DomainRow)
}
```

## 映射器模式

映射器将 Supabase snake_case 行数据转换为 camelCase 应用模型：

```typescript
// lib/mappers/domain.ts
export function mapDomain(row: DomainRow): Domain {
  return {
    id: row.id,
    name: row.name,
    registrarAccount: row.registrar_account,
    registrarAccountId: row.registrar_account_id ?? null,
    expiryDate: row.expiry_date,
    subdomains: (row.subdomains ?? []).map(mapSubdomain),
  }
}
```

## Route Handler 模式

仅当需要 HTTP 接口（外部 cron 调用、webhook、文件下载）时使用 Route Handler。其余情况优先用 Server Actions。

```
app/api/                          # Route Handlers（HTTP 接口）
└── cron/
    └── domain-expiry-check/
        └── route.ts              # 域名到期检查（外部 cron 触发）
```

```typescript
// app/api/cron/domain-expiry-check/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // 1. Authenticate via CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Use admin client (no user session)
  const supabase = createSupabaseAdminClient()
  // ... query and respond
}
```

### Route Handler 规则

1. 必须设置 `export const dynamic = 'force-dynamic'` 防止响应缓存
2. 无用户 session，必须使用 `createSupabaseAdminClient()` 查询数据库
3. 通过 `Authorization: Bearer <CRON_SECRET>` 鉴权，CRON_SECRET 仅服务端环境变量
4. 返回 `NextResponse.json()` 格式响应
5. 文件路径映射为 API 路径：`app/api/cron/domain-expiry-check/route.ts` → `GET /api/cron/domain-expiry-check`

### 何时用 Route Handler vs Server Action

| 场景 | 选择 |
|------|------|
| 表单提交、UI 交互触发数据变更 | Server Action |
| 外部服务调用（cron、webhook） | Route Handler |
| 文件下载 | Route Handler |
| 需要自定义 HTTP 响应头/状态码 | Route Handler |

## 反模式

- 在 Server Actions 中直接查询 Supabase（应委托给 `lib/data/*`）
- 在 `lib/supabase/*` 之外创建 Supabase 客户端
- 在 Server Actions 中跳过 `requireAccess()`
- 写入数据库前跳过 Zod 校验
- 数据变更后忘记调用 `revalidatePath()`
- 在同一函数中混合读取和写入逻辑
- 在 Route Handler 中使用 `createSupabaseServerClient()`（无 session，会报错）
