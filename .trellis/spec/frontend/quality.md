# 质量检查清单

域名管理平台提交前质量检查清单。

## 每次提交前

```bash
npm run lint      # ESLint - 0 个错误
npm run build     # 生产构建成功
npm test          # 单元测试全部通过
```

- 代码回归（修改已有功能、重构、修复 bug）后必须运行 `npm test`，确保既有测试不被破坏
- 如果修改的模块已有对应测试，必须在提交前确认测试通过

## 代码质量规则

- [ ] 新代码中无 `any` 类型
- [ ] 无非空断言（`!`）
- [ ] 无 `@ts-expect-error` 或 `@ts-ignore` 注释
- [ ] 无未使用的 import 或死代码
- [ ] 无 `console.log` 语句（调试完成后须删除）
- [ ] 所有日期操作使用 `date-fns`
- [ ] UI 组件使用 Shadcn UI，不手写同类基础组件
- [ ] Shadcn UI 使用 variant/size API，不使用自定义 className 覆盖

## 架构规则

- [ ] 数据获取使用 Server Components，交互使用 Client Components
- [ ] 变更操作使用 `app/actions/*` 中的 Server Actions
- [ ] 数据查询通过 `lib/data/*`
- [ ] 所有 Supabase 访问通过 `lib/supabase/*`
- [ ] 使用 `schemas/*` 中的 Zod Schema 进行校验
- [ ] 每个 Server Action 中调用 `requireAccess()`
- [ ] 每次变更后调用 `revalidatePath()`
- [ ] 域名状态从 `expiryDate` 推导，不持久化

## 安全规则

- [ ] 客户端代码中无 `SUPABASE_SERVICE_ROLE_KEY`
- [ ] 客户端代码中无 `ACCESS_KEY` 或签名密钥
- [ ] 客户端代码只使用 `NEXT_PUBLIC_*` 环境变量

## 命名约定

- [ ] 组件：PascalCase（`DomainFormDialog.tsx`）
- [ ] Server Actions：camelCase + `Action` 后缀（`createDomainAction`）
- [ ] 数据查询：camelCase（`getDomains`、`getAllAccounts`）
- [ ] 类型：PascalCase（`Domain`、`DomainFormValues`）
- [ ] 数据库行类型：PascalCase + `Row` 后缀（`DomainRow`）

## 测试规范

- 测试文件放在 `__tests__/` 目录下，按被测模块路径组织，不和组件源码混放
- 测试框架：vitest + @testing-library/react + @testing-library/user-event
- 配置文件：`vitest.config.ts` + `vitest.setup.ts`

```
__tests__/
├── components/
│   ├── searchable-select.test.tsx   # 对应 components/searchable-select.tsx
│   └── ...
├── lib/
│   └── ...
└── schemas/
    └── ...
```

- 运行命令：`npm test`（单次）/ `npm run test:watch`（监听）
