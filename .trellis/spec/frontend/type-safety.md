# 类型安全

本文档介绍域名管理平台的 TypeScript 约定与类型组织方式。

## 类型文件组织

类型按业务实体分别存放于 `types/*.ts`：

```typescript
// types/domain.ts
export type Domain = {
  id: string
  name: string
  registrar: string
  registrarAccount: string
  registrarAccountId: string | null
  expiryDate: string | null
  subdomains: Subdomain[]
}

export type DomainFormValues = {
  name: string
  registrar: string
  // 所有字段均为字符串，用于表单
}

export type DomainRow = {
  id: string
  name: string
  registrar_account: string      // 来自数据库的 snake_case 字段
  registrar_account_id: string | null
  expiry_date: string | null
}
```

### 三层类型结构

| 层级 | 命名规范 | 示例 | 用途 |
|-------|--------|---------|---------|
| 应用模型 | PascalCase，camelCase 字段 | `Domain` | 在整个应用中使用 |
| 表单值 | `*FormValues` | `DomainFormValues` | React Hook Form 状态 |
| 数据库行 | `*Row`，snake_case 字段 | `DomainRow` | Supabase 查询结果 |

## Zod Schema

Schema 存放于 `schemas/*.ts`，同时用于客户端校验和服务端解析：

```typescript
// schemas/domainSchemas.ts
export const domainSchema = z.object({
  name: z.string().trim().min(1, '请输入域名')
    .regex(/^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/, '请输入合法域名'),
  registrar: z.string().trim(),
  registrationDate: dateField(),
  expiryDate: dateField(),
}).refine(/* 跨字段校验 */)

export const defaultDomainValues = {
  name: '',
  registrar: '',
}
```

### Schema 规则

1. Schema 同时导出 `z.object()` 和默认值
2. 校验提示信息使用中文
3. 跨字段校验使用 `.refine()`
4. 同一个 Schema 既用于 `useForm({ resolver })`，也用于 Server Actions

## 常量枚举模式

使用 `as const` 数组配合派生类型来定义字符串联合类型：

```typescript
export const DOMAIN_STATUS = ['normal', 'expiring', 'expired'] as const
export type DomainStatus = (typeof DOMAIN_STATUS)[number]
```

## 域名状态推导

状态始终从 `expiryDate` 计算得出，绝不存入数据库：

```typescript
// lib/domainStatus.ts
export function getDomainStatus(expiryDate: string | null): DomainStatus
```

## 日期处理

所有日期操作必须使用 `date-fns`：

```typescript
import { format, addYears, parseISO, addDays } from 'date-fns'

format(new Date(), 'yyyy-MM-dd')
format(addDays(new Date(), 90), 'yyyy-MM-dd')
addYears(parseISO(value), 1)
```

禁止使用 `new Date().toLocaleDateString()`、`moment` 或手动日期计算。

## 类型导入风格

纯类型导入必须使用 `import type`：

```typescript
import type { Domain, DomainFormValues, DomainRow } from '@/types/domain'
import type { Account } from '@/types/account'
```

## 反模式

- 将域名状态存为数据库字段（应从 expiryDate 推导）
- 重复定义类型，而非从 `types/*` 导入
- 使用 `any` 类型
- 在类型收窄可行时使用 `as` 类型断言
- 在组件内联定义 Zod Schema，而非放在 `schemas/*`
- 使用 `moment.js` 或原生 Date 方法，而非 `date-fns`
