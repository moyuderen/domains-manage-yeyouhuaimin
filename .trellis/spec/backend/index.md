# 后端开发规范索引

> **技术栈**：Next.js Server Actions + Supabase（PostgreSQL）

## 关联规范

| 规范 | 位置 | 何时阅读 |
| ---- | ---- | -------- |
| **共享代码规范** | `../shared/` | 始终阅读——适用于所有代码 |

---

## 文档文件

| 文件 | 描述 | 何时阅读 |
| ---- | ---- | -------- |
| [directory-structure.md](./directory-structure.md) | 服务端文件组织方式 | 开始新功能时 |
| [database.md](./database.md) | Supabase 客户端、查询、数据模式 | 数据库操作时 |
| [authentication.md](./authentication.md) | 访问密钥校验、requireAccess | 涉及认证相关功能时 |
| [quality.md](./quality.md) | 后端代码提交前检查清单 | 提交前 |

---

## 快速导航

| 任务 | 文件 |
| ---- | ---- |
| 项目结构 | [directory-structure.md](./directory-structure.md) |
| Server Actions 模式 | [directory-structure.md](./directory-structure.md) |
| Supabase 查询 | [database.md](./database.md) |
| 数据层辅助函数 | [database.md](./database.md) |
| 行数据到模型映射 | [database.md](./database.md) |
| 访问控制 | [authentication.md](./authentication.md) |

---

## 核心规则摘要

| 规则 | 参考 |
| ---- | ---- |
| **Server Actions 仅用于数据变更** | [directory-structure.md](./directory-structure.md) |
| **数据查询放在 `lib/data/*`，不放在 actions 或组件中** | [directory-structure.md](./directory-structure.md) |
| **所有 Supabase 访问通过 `lib/supabase/*`** | [database.md](./database.md) |
| **写入数据库前使用 Zod schema 校验** | [database.md](./database.md) |
| **通过 `lib/mappers/*` 将 snake_case 数据库行映射为 camelCase** | [database.md](./database.md) |
| **数据变更后调用 `revalidatePath`** | [directory-structure.md](./directory-structure.md) |
| **绝不将 `SUPABASE_SERVICE_ROLE_KEY` 暴露给客户端** | [database.md](./database.md) |
| **域名状态由 `expiryDate` 推导，绝不持久化存储** | [database.md](./database.md) |
| **所有 action 首先调用 `requireAccess()`** | [authentication.md](./authentication.md) |

---

## 参考文件

| 功能 | 位置 |
| ---- | ---- |
| 服务端 Supabase | `lib/supabase/server.ts` |
| 浏览器端 Supabase | `lib/supabase/browser.ts` |
| 管理员 Supabase | `lib/supabase/admin.ts` |
| 配置检查 | `lib/supabase/config.ts` |
| 数据层 | `lib/data/*.ts` |
| Server Actions | `app/actions/*.ts` |
| 行数据映射器 | `lib/mappers/*.ts` |
| Zod schema | `schemas/*.ts` |
| 类型定义 | `types/*.ts` |
