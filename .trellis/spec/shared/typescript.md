# TypeScript 最佳实践

> 域名管理平台的 TypeScript 开发规范。

---

## 三层类型模式

项目对每个实体使用三个独立的类型层：

| 层级 | 用途 | 命名 | 字段风格 |
|-------|---------|--------|--------|
| 应用模型 | 用于组件和业务逻辑 | `Domain`、`Account`、`Site` | camelCase |
| 表单值 | 用于 React Hook Form | `DomainFormValues`、`AccountFormValues` | camelCase，字符串为主 |
| 数据库行 | 与 Supabase 表列对应 | `DomainRow`、`AccountRow` | snake_case |

```typescript
// types/domain.ts

// 应用模型（camelCase）
export interface Domain {
  id: string;
  name: string;
  registrarAccount: string;
  registrarAccountId: string | null;
  expiryDate: string;
  subdomains: Subdomain[];
}

// 表单值（表单输入使用字符串字段）
export interface DomainFormValues {
  name: string;
  registrar: string;
  registrarAccount: string;
  registrarAccountId: string;
  expiryDate: string;
}

// 数据库行（snake_case，与 Supabase 对应）
export interface DomainRow {
  id: string;
  name: string;
  registrar_account: string;
  registrar_account_id: string | null;
  expiry_date: string;
  subdomains?: SubdomainRow[];
}
```

### 错误：混合数据库字段与应用字段

```typescript
// 错误 — 单一类型混用命名风格，到处使用
interface Domain {
  id: string;
  name: string;
  registrar_account: string;   // 数据库的 snake_case
  registrarAccountId: string;  // 应用的 camelCase
  expiry_date: string;         // 命名不一致
}
```

---

## Zod Schema 模式

Zod schema 存放在 `schemas/*`，用于：
- React Hook Form 校验（`zodResolver`）
- Server Action 输入校验（`.parse()`）

```typescript
// schemas/domainSchemas.ts
import { z } from 'zod';

export const domainSchema = z.object({
  name: z.string().min(1, '请输入域名'),
  registrar: z.string().min(1, '请选择注册商'),
  registrarAccount: z.string().min(1, '请输入注册账号'),
  expiryDate: z.string().optional(),
}).refine(
  (data) => /* 跨字段校验 */,
  { message: '...', path: ['fieldName'] }
);

export const domainDefaultValues: DomainFormValues = {
  name: '',
  registrar: '',
  registrarAccount: '',
  registrarAccountId: '',
  expiryDate: '',
};
```

---

## Mapper 模式

Mapper 负责在数据库行（snake_case）与应用模型（camelCase）之间转换，存放在 `lib/mappers/*`。

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
  };
}
```

### 错误：在组件中内联转换

```typescript
// 错误 — 在组件文件中随意做字段转换
const domain = {
  id: row.id,
  name: row.name,
  registrarAccount: row.registrar_account, // 手动内联转换
}

// 正确 — 使用 lib/mappers/* 中的专用 mapper
import { mapDomain } from '@/lib/mappers/domain'
const domain = mapDomain(row as DomainRow)
```

### 错误：在组件中内联定义 Zod Schema

```typescript
// 错误 — schema 定义在组件文件内部
const schema = z.object({
  name: z.string().min(1, '请输入域名'),
  registrar: z.string(),
})

// 正确 — 从 schemas/* 导入
import { domainSchema, defaultDomainValues } from '@/schemas/domainSchemas'
```

---

## 常量枚举与状态值

对固定值集合使用 `as const` 数组：

```typescript
export const DOMAIN_STATUSES = ['normal', 'expiring', 'expired'] as const;
export type DomainStatus = (typeof DOMAIN_STATUSES)[number];
```

域名状态始终由 `expiryDate` **计算**得出，绝不存储：

```typescript
export function getDomainStatus(expiryDate: string): DomainStatus {
  // 使用 date-fns 进行日期比较
}
```

---

## 可辨识联合类型

对可能具有多种形态的类型，使用可辨识联合：

```typescript
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

if (result.success === true) {
  console.log(result.data);
} else {
  console.log(result.error);
}
```

---

## 泛型模式

### 分页响应

```typescript
type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
```

### 常用工具类型

```typescript
type ArrayElement<T> = T extends (infer E)[] ? E : never;
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
```

---

## 禁止模式

### 禁止使用 `any`

```typescript
// 错误
function process(data: any) { ... }

// 正确
function process(data: unknown) { ... }
function process(data: ProcessInput) { ... }
```

### 禁止非空断言

```typescript
// 错误
const name = user!.name;

// 正确
if (user) {
  const name = user.name;
}
```

### 禁止 `@ts-expect-error` / `@ts-ignore`

```typescript
// 错误
// @ts-expect-error - customField exists at runtime

// 正确 — 修改类型定义本身
```

### 禁止无校验的类型断言

```typescript
// 错误 — 盲目断言
const user = data as User;

// 正确 — 使用 Zod 进行运行时校验
const user = userSchema.parse(data);
```

---

## 类型导入

类型专用导入必须使用 `import type`：

```typescript
// 正确
import type { Domain, DomainFormValues } from '@/types/domain';
import { createDomain } from '@/lib/data/domains';

// 错误
import { Domain, createDomain } from '@/types/domain';
```

---

## 总结

| 实践 | 原因 |
| ----------------------- | ---------------------------- |
| 三层类型 | 清晰分离数据库 / 应用 / 表单 |
| Zod schema 做校验 | 单一数据真源 |
| Mapper 做转换 | snake_case ↔ camelCase |
| `as const` 做枚举 | 类型安全的固定值 |
| 禁止 `any` | 类型安全 |
| 禁止 `!` 断言 | 运行时安全 |
| `import type` | 清晰区分导入性质 |
