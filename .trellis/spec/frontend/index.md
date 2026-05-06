# 前端开发指南

> 基于 Next.js App Router + Shadcn UI 的域名管理平台前端开发指南。

## 技术栈

- **框架**：Next.js 16、React 19
- **语言**：TypeScript（严格模式）
- **样式**：TailwindCSS 4、Shadcn UI（Radix UI）
- **表单**：React Hook Form + Zod（@hookform/resolvers）
- **状态**：Zustand（客户端状态）、URL 搜索参数
- **图表**：Recharts
- **日期**：date-fns
- **动画**：Framer Motion
- **提示**：Sonner
- **主题**：next-themes
- **图标**：Lucide React

---

## 文档文件

| 文件                                                 | 说明                                              | 优先级        |
| ---------------------------------------------------- | ------------------------------------------------- | ------------- |
| [components.md](./components.md)                     | Shadcn UI、Server/Client 组件、表单模式            | **必读**      |
| [directory-structure.md](./directory-structure.md)    | 项目结构与文件组织                                | **必读**      |
| [api-integration.md](./api-integration.md)           | Server Actions、Supabase 数据层                   | **必读**      |
| [authentication.md](./authentication.md)             | 访问密钥门控、requireAccess 模式                  | 参考          |
| [hooks.md](./hooks.md)                               | 自定义 Hook 模式                                  | 参考          |
| [state-management.md](./state-management.md)         | Zustand、URL 状态、表单状态                       | 参考          |
| [type-safety.md](./type-safety.md)                   | TypeScript 约定、Zod Schema                       | 参考          |
| [css-layout.md](./css-layout.md)                     | TailwindCSS 4、响应式设计                         | 参考          |
| [quality.md](./quality.md)                           | 提交前检查清单与质量标准                          | 参考          |

---

## 核心规则汇总

| 规则                                                         | 参考文档                                           |
| ------------------------------------------------------------ | -------------------------------------------------- |
| **数据获取默认使用 Server Components**                       | [components.md](./components.md)                   |
| **UI 组件使用 Shadcn UI，不手写**                            | [components.md](./components.md)                   |
| **使用 Shadcn variant/size API，避免自定义 className**       | [components.md](./components.md)                   |
| **变更操作（增/改/删）使用 Server Actions**                  | [api-integration.md](./api-integration.md)         |
| **数据查询只能通过 `lib/data/*`**                            | [api-integration.md](./api-integration.md)         |
| **Supabase 访问只能通过 `lib/supabase/*`**                   | [api-integration.md](./api-integration.md)         |
| **表单使用 React Hook Form + `schemas/*` 中的 Zod Schema**   | [components.md](./components.md)                   |
| **所有日期操作使用 date-fns**                                | [type-safety.md](./type-safety.md)                 |
| **域名状态从 expiryDate 推导，绝不持久化**                   | [type-safety.md](./type-safety.md)                 |
| **客户端组件仅用于交互（表单、对话框、图表）**               | [components.md](./components.md)                   |

---

## 架构概览

```
+--------------------------------------------------------------+
|                    Next.js 应用                               |
|                                                               |
|  app/                          components/                    |
|  ├── (auth)/                   ├── ui/         (Shadcn UI)   |
|  │   └── login/                ├── domains/    (域名 CRUD)   |
|  ├── (main)/                   ├── accounts/   (账号管理)    |
|  │   ├── dashboard/            ├── sites/      (站点管理)    |
|  │   ├── domains/              ├── dashboard/  (图表)        |
|  │   ├── accounts/             ├── settings/   (设置 UI)     |
|  │   ├── sites/                └── layout/     (应用外壳)    |
|  │   └── settings/                                           |
|  └── actions/                  lib/                          |
|      ├── domains.ts            ├── data/       (查询)        |
|      ├── accounts.ts           ├── supabase/   (数据库客户端)|
|      └── ...                   ├── mappers/    (行 → 模型)   |
|                                ├── stores/     (Zustand)     |
|                                └── ...                       |
+-------------------------------+------------------------------+
|                                                               |
|   schemas/         types/                                     |
|   ├── domainSchemas.ts    ├── domain.ts                      |
|   ├── accountSchemas.ts   ├── account.ts                     |
|   └── siteSchemas.ts      └── site.ts                        |
+--------------------------------------------------------------+
                              |
                    Supabase (PostgreSQL)
```
