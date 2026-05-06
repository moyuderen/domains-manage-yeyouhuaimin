# 后端质量检查清单

域名管理平台后端代码的提交前检查清单。

## 每次提交前

```bash
npm run lint      # ESLint - 0 个错误
npm run build     # 生产构建成功
```

## Server Actions

- [ ] 文件以 `'use server'` 开头
- [ ] 第一行调用 `requireAccess()`
- [ ] 使用 `schemas/*` 中的 Zod schema 校验输入
- [ ] 数据库操作委托给 `lib/data/*`
- [ ] 为所有受影响的路由调用 `revalidatePath()`
- [ ] 函数名以 `Action` 后缀结尾

## Route Handlers

- [ ] 设置 `export const dynamic = 'force-dynamic'`
- [ ] 使用 `CRON_SECRET` Bearer 鉴权（或适用的其他认证）
- [ ] 使用 `createSupabaseAdminClient()` 而非 `createSupabaseServerClient()`
- [ ] 返回 `NextResponse.json()` 格式
- [ ] 检查必需环境变量是否已配置（未配置返回 500）

## 数据层

- [ ] 所有 Supabase 访问通过 `lib/supabase/*` 客户端
- [ ] Supabase 未配置时有 mock 数据回退
- [ ] 通过 `lib/mappers/*` 将数据库行映射为应用模型
- [ ] 检查 Supabase 错误：`if (error) throw new Error(error.message)`
- [ ] 循环中不使用 `await`（批量查询使用 `.in()`）
- [ ] 读取 admin client、provider token、endpoint secret 的 `lib/data/*` / provider helper 显式标记 `server-only`

## 类型安全

- [ ] 无 `any` 类型
- [ ] 无非空断言（`!`）
- [ ] 数据库行类型（`*Row`）使用 snake_case 字段定义
- [ ] 应用模型类型使用 camelCase 字段定义
- [ ] 仅导入类型时使用 `import type`

## 安全性

- [ ] `SUPABASE_SERVICE_ROLE_KEY` 不出现在客户端代码中
- [ ] `ACCESS_KEY` 不出现在客户端代码中
- [ ] 客户端代码只使用 `NEXT_PUBLIC_*` 环境变量
- [ ] 域名状态由 `expiryDate` 推导，不持久化存储

## 代码组织

- [ ] Server Actions 放在 `app/actions/*`
- [ ] 数据查询放在 `lib/data/*`
- [ ] 映射器放在 `lib/mappers/*`
- [ ] Schema 放在 `schemas/*`
- [ ] 类型定义放在 `types/*`
