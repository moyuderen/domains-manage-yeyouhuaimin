# 代码质量规范

> 域名管理平台强制执行的代码质量规则。

---

## 禁止非空断言

**绝对禁止**使用非空断言（`!`）。它会绕过 TypeScript 的空值检查，导致运行时错误。

```typescript
// 禁止
const name = user!.name;
const value = data!.items![0]!;

// 必须 — 使用显式检查
const user = getUser();
if (!user) {
  throw new Error('User not found');
}
const name = user.name;

// 必须 — 使用可选链配合默认值
const value = data?.items?.[0] ?? defaultValue;
```

---

## 禁止 `any` 类型

```typescript
// 错误
function process(data: any) { ... }

// 正确 — 使用具体类型
function process(data: ProcessInput) { ... }

// 正确 — 对真正未知的数据使用 unknown
function parseJSON(input: string): unknown {
  return JSON.parse(input);
}
```

---

## 禁止 `@ts-expect-error` / `@ts-ignore`

```typescript
// 禁止
// @ts-expect-error - field exists at runtime
const value = user.customField;

// 必须 — 从根源修复类型问题
// 如果某字段在运行时存在但类型定义中没有，请更新类型定义。
```

---

## Import 排序

按以下顺序组织 import，各组之间用空行分隔：

```typescript
// 1. React / Next.js
import { useState } from 'react';
import { revalidatePath } from 'next/cache';

// 2. 外部依赖包
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';

// 3. 内部别名路径（@/）
import { requireAccess } from '@/lib/auth/access-server';
import { getDomains } from '@/lib/data/domains';
import type { Domain } from '@/types/domain';

// 4. 本地相对路径导入
import { formatDate } from './utils';
```

类型专用导入必须使用 `import type`：

```typescript
// 正确
import type { Domain, DomainFormValues } from '@/types/domain';
import { createDomain } from '@/lib/data/domains';

// 错误 — 混合导入未加 type 注解
import { Domain, createDomain } from '@/types/domain';
```

---

## 命名约定

### 文件与目录

| 类型 | 约定 | 示例 |
| --------------- | --------------------------- | ----------------------------- |
| React 组件 | PascalCase | `DomainFormDialog.tsx` |
| 页面客户端组件 | PascalCase + `PageClient` | `DomainsPageClient.tsx` |
| Hook | camelCase + `use` 前缀 | `useSettings.ts` |
| 工具函数 | camelCase | `domainStatus.ts` |
| 类型文件 | camelCase | `domain.ts` |
| Schema 文件 | camelCase + `Schemas` | `domainSchemas.ts` |
| 目录 | kebab-case | `lib/data/` |

### 变量与函数

| 类型 | 约定 | 示例 |
| -------------- | ---------- | -------------------------------- |
| 变量 | camelCase | `domainName`、`isExpired` |
| 函数 | camelCase | `getDomainById` |
| Server Action | camelCase + `Action` 后缀 | `createDomainAction` |
| 类型 / 接口 | PascalCase | `Domain`、`DomainFormValues` |
| 数据库行类型 | PascalCase + `Row` 后缀 | `DomainRow`、`AccountRow` |

### 布尔变量

使用 `is`、`has`、`should`、`can` 前缀：

```typescript
// 正确
const isExpired = true;
const hasSubdomains = domain.subdomains.length > 0;

// 错误
const expired = true;
const subdomains = domain.subdomains.length > 0;
```

### 错误：静默吞掉异常

```typescript
// 错误 — 吞掉错误，用户得不到任何反馈
try {
  await deleteDomainAction(id)
} catch {}

// 正确 — 始终将错误展示给用户
try {
  await deleteDomainAction(id)
  toast.success('删除成功')
} catch (error) {
  toast.error(error instanceof Error ? error.message : '操作失败')
}
```

---

## 错误处理

### Supabase 错误处理模式

```typescript
const { data, error } = await supabase.from('domains').select('*');
if (error) throw new Error(error.message);
```

### Server Action 错误处理模式

Server Actions 抛出错误，客户端组件通过 toast 捕获并展示：

```typescript
// Server Action
export async function deleteDomainAction(id: string) {
  await requireAccess();
  await deleteDomain(id);
  revalidatePath('/');
}

// 客户端组件
try {
  await deleteDomainAction(id);
  toast.success('删除成功');
} catch (error) {
  toast.error(error instanceof Error ? error.message : '操作失败');
}
```

---

## 清除死代码

- 删除未使用的 import（ESLint 会强制执行）
- 删除被注释掉的代码块
- 删除未使用的变量、函数和类型
- 删除 `return`、`throw`、`break`、`continue` 之后不可达的代码

---

## 提交前执行 Lint 和构建

```bash
# 每次提交前必须通过
npm run lint
npm run build
```

### Lint 范围保护

ESLint 配置必须忽略构建产物与 Claude 临时 worktree 目录，例如嵌套的 `.next` 和 `.claude/worktrees/**`。否则 `eslint .` 会把临时构建文件扫进检查范围，产生与业务代码无关的假失败。

---

## 总结

| 规则 | 原因 |
| ----------------------- | ----------------- |
| 禁止 `!` 断言 | 避免运行时错误 |
| 禁止 `any` 类型 | 类型安全 |
| 禁止 `@ts-expect-error` | 掩盖真实问题 |
| `import type` | 清晰区分导入性质 |
| 提交前执行 lint + build | 保持代码一致性 |
| 清除死代码 | 提高可维护性 |
