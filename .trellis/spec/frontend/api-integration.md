# API 集成

本文档介绍前端与后端的交互方式：Server Actions 用于数据变更，`lib/data/*` 用于数据查询。

## 数据流架构

```
Server Component (page.tsx)
  ↓ 调用 lib/data/*.ts（读取）
  ↓ 通过 props 传递数据
Client Component (*PageClient.tsx)
  ↓ 调用 app/actions/*.ts（写入）
  ↓ router.refresh() 触发重新渲染
Server Component 使用最新数据重新运行
```

## 读取数据：lib/data/*

所有数据查询通过 `lib/data/*.ts` 进行。这些是仅限服务端的函数，其职责为：

1. 检查 Supabase 是否已配置（未配置则降级到 mock 数据）
2. 创建 Supabase 服务端客户端
3. 查询数据库
4. 通过 `lib/mappers/*` 将 snake_case 行映射为 camelCase 模型

```typescript
// lib/data/domains.ts
export async function getDomains(query: DomainListQuery): Promise<PaginatedDomains> {
  if (!isSupabaseConfigured()) {
    return paginateDomains(sortDomains(filterMockDomains(query), query), query)
  }

  const supabase = await createSupabaseServerClient()
  let builder = supabase.from('domains').select('*, subdomains(*)', { count: 'exact' })
  // 应用过滤条件...

  const { data, error } = await builder
  if (error) throw new Error(error.message)

  return paginateDomains(
    sortDomains((data ?? []).map((row) => mapDomain(row as DomainRow)), query),
    query
  )
}
```

### 页面使用 Promise.all 并行获取数据

```typescript
// app/(main)/domains/page.tsx
export default async function DomainsPage({ searchParams }) {
  const [result, sites, accounts] = await Promise.all([
    getDomains({ ...filters, page, pageSize }),
    getActiveSites(),
    getAllAccounts(),
  ])
  return <DomainsPageClient ... />
}
```

## 写入数据：Server Actions

所有变更操作（创建、更新、删除）使用 `app/actions/*.ts` 中的 Server Actions：

```typescript
// app/actions/domains.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireAccess } from '@/lib/auth/access-server'
import { createDomain } from '@/lib/data/domains'
import { domainSchema } from '@/schemas/domainSchemas'

export async function createDomainAction(values: DomainFormValues) {
  await requireAccess()
  const parsed = domainSchema.parse(values)
  await createDomain(parsed)
  revalidatePath('/')
  revalidatePath('/dashboard')
}
```

### Server Action 规则

1. 每个 action 文件以 `'use server'` 开头
2. 每个 action 首先调用 `requireAccess()`
3. 写入数据库前使用 Zod schema 验证输入
4. 变更后对所有受影响的路由调用 `revalidatePath()`
5. Actions 将数据库操作委托给 `lib/data/*` 函数
6. Actions 以 `Action` 后缀命名：`createDomainAction`、`deleteDomainAction`

### 客户端调用模式

```typescript
// 表单提交
const submit = async (values: DomainFormValues) => {
  setLoading(true)
  try {
    await createDomainAction(values)
    toast.success('添加成功')
    onClose(true)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    setLoading(false)
  }
}

// 删除操作使用 useTransition
const [isPending, startTransition] = useTransition()

startTransition(async () => {
  try {
    await deleteDomainAction(id)
    router.refresh()
    toast.success('删除成功')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '删除失败')
  }
})
```

## Scenario: 域名保存时联动补齐账号站点关系

### 1. Scope / Trigger
- Trigger: 域名表单提交不仅写 `domains`，还需要跨层补齐 `accounts.sites`，并刷新受影响的账号页面缓存。
- 适用场景：`createDomainAction`、`updateDomainAction`、`deleteDomainAction`、`deleteDomainsAction` 修改了 registrar/dns 账号或站点关联。

### 2. Signatures
- Server Actions:
  - `createDomainAction(values: DomainFormValues)`
  - `updateDomainAction(id: string, values: DomainFormValues)`
  - `deleteDomainAction(id: string)`
  - `deleteDomainsAction(ids: string[])`
- Data helpers:
  - `ensureAccountSiteRelations(relations: { accountId: string; siteId: string }[])`
  - `getDomainById(id: string)`
  - `getDomainsByIds(ids: string[])`
- Client form:
  - `components/domains/DomainFormDialog.tsx`

### 3. Contracts
- 请求字段：
  - `DomainFormValues.registrarAccountId: string`
  - `DomainFormValues.registrarSiteId: string`
  - `DomainFormValues.dnsAccountId: string`
  - `DomainFormValues.dnsSiteId: string`
- 服务端补齐规则：
  - 仅当 `accountId` 与 `siteId` 同时非空时才生成补齐关系
  - 同一提交里 registrar 与 dns 指向同一账号时，服务端按账号聚合后一次更新
  - 若账号已有该站点 ID，不重复写入
  - 若账号仍含旧站点名称条目，运行时允许合并为单条 ID 记录并保留已有 `note/isActive`
- 缓存刷新：
  - 至少刷新 `/`、`/dashboard`、`/accounts`
  - 更新域名时，必须同时刷新旧/新关联账号详情页 `/accounts/[id]`
  - 删除单个/批量域名时，必须按删除前关联账号集合刷新 `/accounts/[id]`
- 前端表单联动：
  - 站点变化后，当前已选账号可以保留
  - 账号候选按“是否已关联当前站点 ID”优先排序
  - 嵌套快速新建账号时，必须传 `allSites` 与当前会话里的合并账号邮箱标识

### 4. Validation & Error Matrix
- 表单字段通过 `domainSchema.parse(values)` 校验失败 -> Action 直接抛错，客户端 toast 展示
- `accountId` 或 `siteId` 为空 -> 跳过该条补齐关系，不写入 `accounts.sites`
- 账号已存在该站点 ID -> `ensureAccountSiteRelations` 无写入
- 账号存在同站点旧名称条目 -> 运行时合并成单条 ID 记录
- 更新前读取不到旧 domain -> 仍更新新值，但账户页缓存只按新值刷新
- 删除前读取不到旧 domain -> 仍删除，但账户页缓存不会额外刷新不存在的旧账号页

### 5. Good/Base/Bad Cases
- Good: 用户把 registrar 站点切到新站点，但保留当前 registrar 账号；保存后该账号自动补上新站点 ID
- Base: registrar/dns 都为空或只有一侧有值；Action 只处理存在的关系，不报错
- Bad: 站点切换时立即清空账号；或保存后只刷新 `/domains`，导致账号详情页仍展示旧关联

### 6. Tests Required
- Action 层：
  - 创建域名后调用 `ensureAccountSiteRelations`，并刷新 `/accounts`
  - 更新域名时对旧/新账号 ID 并集调用账号详情页刷新
  - 删除单个/批量域名时按删除前账号集合刷新账号详情页
- Data 层：
  - `ensureAccountSiteRelations` 对同账号多站点关系聚合后只更新一次
  - 已有 ID 条目不重复写入
  - 名称条目 + ID 条目合并后保留 `note/isActive`
- UI 层：
  - `DomainFormDialog` 中按当前站点优先展示账号
  - 快速新建站点后，再打开嵌套账号表单时能立即看到该站点

### 7. Wrong vs Correct
#### Wrong
```typescript
await updateDomain(id, parsed)
revalidatePath('/domains')
```

#### Correct
```typescript
const previousDomain = await getDomainById(id)
await updateDomain(id, parsed)
await ensureAccountSiteRelations(getAccountSiteRelations(parsed))
revalidateAccountPaths(parsed, previousDomain)
```

## Mock 数据降级

当 Supabase 未配置时，数据函数降级到 `lib/mock/*`：

```typescript
if (!isSupabaseConfigured()) {
  return mockDomains.find((domain) => domain.id === id) ?? null
}
```

## 行映射

数据库行使用 snake_case；应用模型使用 camelCase。`lib/mappers/*` 中的映射器负责转换：

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
    // ...
  }
}
```

## 正确与错误模式对比

### Server Action 结构

```typescript
// 正确 — 遵循标准模式
export async function createDomainAction(values: DomainFormValues) {
  await requireAccess()                    // 1. 先鉴权
  const parsed = domainSchema.parse(values) // 2. 验证输入
  await createDomain(parsed)               // 3. 委托给数据层
  revalidatePath('/')                      // 4. 刷新缓存
  revalidatePath('/dashboard')
}

// 错误 — 跳过鉴权、内联数据库查询、没有缓存刷新
export async function createDomainAction(values: DomainFormValues) {
  const supabase = await createSupabaseServerClient()
  await supabase.from('domains').insert({
    name: values.name,
    registrar_account: values.registrarAccount,
  })
}
```

### Mock 数据降级

```typescript
// 正确 — 查询 Supabase 前始终检查是否已配置
export async function getDomains(query: DomainListQuery) {
  if (!isSupabaseConfigured()) {
    return paginateDomains(sortDomains(filterMockDomains(query), query), query)
  }
  const supabase = await createSupabaseServerClient()
  // ...
}

// 错误 — Supabase 环境变量未设置时会崩溃
export async function getDomains(query: DomainListQuery) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from('domains').select('*')
  return data
}
```

### 行映射

```typescript
// 正确 — 使用专用映射器
import { mapDomain } from '@/lib/mappers/domain'
const items = (data ?? []).map((row) => mapDomain(row as DomainRow))

// 错误 — 手动内联转换散落在组件中
const items = data.map((row) => ({
  id: row.id,
  name: row.name,
  registrarAccount: row.registrar_account,  // 临时映射
}))
```

## 反模式

- 在页面文件或组件中直接查询 Supabase
- 在客户端组件中调用 `lib/data/*` 读取函数
- 不通过 Server Actions 直接变更数据
- 变更后遗漏 `revalidatePath()`
- Server Actions 中跳过 `requireAccess()`
- 写入数据库前跳过 Zod 验证
