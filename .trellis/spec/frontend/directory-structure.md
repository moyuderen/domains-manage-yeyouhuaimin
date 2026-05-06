# 目录结构

本文档介绍域名管理平台的文件组织方式。

## 概览

```
app/                            # Next.js App Router
├── (auth)/                     # 认证路由组（登录）
│   ├── layout.tsx
│   └── login/page.tsx
├── (main)/                     # 主应用路由组（需认证）
│   ├── layout.tsx
│   ├── page.tsx                # 重定向至 /dashboard
│   ├── error.tsx
│   ├── not-found.tsx
│   ├── dashboard/page.tsx
│   ├── domains/
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   └── [domainId]/page.tsx
│   ├── accounts/
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   └── [accountId]/page.tsx
│   ├── sites/
│   │   ├── page.tsx
│   │   └── loading.tsx
│   └── settings/page.tsx
├── actions/                    # Server Actions（变更操作）
│   ├── domains.ts
│   ├── accounts.ts
│   ├── sites.ts
│   ├── subdomains.ts
│   ├── settings.ts
│   └── auth.ts
├── globals.css
├── layout.tsx                  # 根布局
└── icon.svg

components/                     # UI 组件
├── ui/                         # Shadcn UI 基础组件
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── table.tsx
│   ├── card.tsx
│   ├── chart.tsx
│   └── ...
├── domains/                    # 域名功能组件
│   ├── DomainsPageClient.tsx
│   ├── DomainFormDialog.tsx
│   ├── DomainTable.tsx
│   ├── DomainToolbar.tsx
│   ├── DomainDetailsDrawer.tsx
│   ├── DomainDetailsPage.tsx
│   ├── SubdomainFormDialog.tsx
│   ├── SubdomainManager.tsx
│   ├── SubdomainsTable.tsx
│   └── domain-columns.ts
├── accounts/                   # 账号功能组件
├── sites/                      # 站点功能组件
├── dashboard/                  # 仪表盘图表
├── settings/                   # 设置页 UI
├── layout/                     # 应用外壳（侧边栏、顶栏）
├── login/                      # 登录表单
├── common/                     # 通用组件（ConfirmDialog）
├── theme-provider.tsx
└── theme-toggle.tsx

lib/                            # 工具函数与数据层
├── data/                       # 服务端数据查询
│   ├── domains.ts
│   ├── accounts.ts
│   ├── sites.ts
│   ├── dashboard.ts
│   ├── settings.ts
│   └── current-user.ts
├── supabase/                   # Supabase 客户端工厂
│   ├── server.ts               # createSupabaseServerClient
│   ├── browser.ts              # createSupabaseBrowserClient
│   ├── admin.ts                # createSupabaseAdminClient
│   └── config.ts               # isSupabaseConfigured
├── mappers/                    # 数据库行 → 应用模型映射
│   ├── domain.ts
│   ├── account.ts
│   └── site.ts
├── stores/                     # Zustand 状态仓库
│   └── settings.ts
├── mock/                       # 模拟数据（Supabase 降级兜底）
│   ├── domains.ts
│   ├── accounts.ts
│   └── sites.ts
├── auth/                       # 访问密钥认证
│   ├── access.ts               # 共享认证逻辑
│   └── access-server.ts        # 仅服务端（Cookie 操作）
├── utils/
│   └── params.ts               # URL 参数辅助工具
├── utils.ts                    # cn() 及通用工具函数
├── dashboard.ts                # 仪表盘数据转换
├── domainStatus.ts             # 从 expiryDate 推导状态
├── date.ts                     # date-fns 辅助工具
├── statistics.ts               # 统计计算
└── theme.ts                    # 主题工具函数

schemas/                        # Zod 校验 Schema
├── domainSchemas.ts
├── accountSchemas.ts
└── siteSchemas.ts

types/                          # TypeScript 类型定义
├── domain.ts                   # Domain、DomainRow、DomainFormValues
├── account.ts                  # Account、AccountRow、AccountFormValues
└── site.ts                     # Site、SiteRow、SiteFormValues
```

## 关键约定

### 页面文件保持精简

页面文件只负责获取数据并渲染客户端组件：

```typescript
// app/(main)/dashboard/page.tsx
export default async function DashboardPage() {
  const data = await getDashboardData()
  return <DashboardPageClient {...data} />
}
```

### 功能组件按业务领域分组

组件按业务领域分组，而非按组件类型分组：

```
components/domains/       # 所有域名相关 UI
components/accounts/      # 所有账号相关 UI
components/dashboard/     # 所有仪表盘图表与卡片
```

### 命名约定

| 类型 | 约定 | 示例 |
|------|------------|---------|
| 页面组件 | PascalCase + `PageClient` 后缀 | `DomainsPageClient.tsx` |
| 表单对话框 | PascalCase + `FormDialog` 后缀 | `DomainFormDialog.tsx` |
| Server Actions | camelCase + `Action` 后缀 | `createDomainAction` |
| 数据查询 | camelCase | `getDomains`、`getAllAccounts` |
| 映射函数 | camelCase + `map` 前缀 | `mapDomain`、`mapAccount` |
| Zod Schema | camelCase + `Schema` 后缀 | `domainSchema` |
| 类型 | PascalCase | `Domain`、`DomainFormValues` |
| 数据库行类型 | PascalCase + `Row` 后缀 | `DomainRow` |

## 需要避免的反模式

- 在页面或组件中直接查询 Supabase（应使用 `lib/data/*`）
- 在组件中放置变更逻辑（应使用 `app/actions/*` 中的 Server Actions）
- 在 `lib/supabase/*` 之外创建新的 Supabase 客户端
- 手写 Shadcn UI 已提供的基础 UI 组件
- 在页面文件中放置数据转换逻辑（应放入 `lib/**`）
