# 跨层思考指南

> **目的**：跨越多个层的功能在实现前的检查清单。
>
> **核心原则**：30 分钟的思考能节省 3 小时的调试时间。

---

## 何时使用本指南

当你的功能满足以下任一条件时使用本指南：

- 涉及 3 个或以上层（Server Component、Client Component、Server Action、数据库）
- 涉及层之间的数据转换（DB Row -> App Model -> Form Values）
- 包含提交表单并修改数据的流程
- 从外部来源接收数据（文件上传、JSON 导入）

---

## 实现前检查清单

在编写代码之前，先回答以下问题：

### 1. 层识别

**这个功能涉及哪些层？**

- [ ] Server Components（通过 `lib/data/*` 读取数据、渲染）
- [ ] Client Components（交互、表单、对话框、图表）
- [ ] Server Actions（通过 `app/actions/*` 执行变更）
- [ ] 数据层（通过 `lib/data/*` 查询 Supabase）
- [ ] Middleware（路由保护、鉴权重定向）
- [ ] Mappers（DB row ↔ app model 转换）

### 2. 数据流方向

**数据如何流转？**

```
读取流：Supabase -> lib/data/* -> mapDomain() -> Server Component -> Props -> Client Component -> UI
写入流：UI -> Form -> Server Action -> requireAccess() -> Zod parse -> lib/data/* -> Supabase
```

- [ ] 只读（数据从 Supabase 流向 UI）
- [ ] 只写（数据从 UI 流向 Supabase）
- [ ] 双向（带列表刷新的 CRUD）
- [ ] 服务端渲染（通过 `lib/data/*` 在 Server Components 中获取数据）

### 3. 各层的数据格式

**每个边界处的数据格式是什么？**

| 层               | 格式                      | 示例                                            |
| ---------------- | ------------------------- | ----------------------------------------------- |
| Supabase         | snake_case 列名           | `registrar_account`, `expiry_date`              |
| DB Row 类型      | TypeScript（snake_case）  | `DomainRow { registrar_account: string }`       |
| Mapper           | 转换函数                  | `mapDomain(row) -> Domain`                      |
| App Model        | TypeScript（camelCase）   | `Domain { registrarAccount: string }`           |
| Server Component | 传递给客户端的 Props      | 普通对象、字符串、数字                          |
| Client Component | React 状态、表单值        | `DomainFormValues { registrarAccount: string }` |
| 表单输入         | 字符串值                  | 所有表单输入均为字符串                          |

### 3.1 关键转换点

| 来源              | 目标                | 转换器                    | 位置                  |
| ----------------- | ------------------- | ------------------------ | --------------------- |
| Supabase 行       | App model           | `mapDomain()` 等          | `lib/mappers/*`       |
| App model         | 表单值              | 手动映射                  | 组件（编辑模式）      |
| 表单值            | Zod 解析后的数据    | `schema.parse(values)`   | Server Action         |
| Zod 解析后的数据  | Supabase 插入       | 字段映射                  | `lib/data/*`          |
| 日期字符串        | 显示格式            | `date-fns` `format()`    | 组件                  |

### 4. 鉴权上下文

**鉴权在哪里执行？**

| 层               | 鉴权方式                  | 说明                                |
| ---------------- | ------------------------- | ----------------------------------- |
| Middleware       | Session cookie 检查       | 未认证用户重定向到登录页            |
| Server Action    | `requireAccess()`         | 无有效 session 时抛出异常           |
| Server Component | （继承自 middleware）     | 受路由级 middleware 保护            |

**关键规则**：每个 Server Action 必须在第一行调用 `requireAccess()`。Middleware 保护页面，`requireAccess()` 保护变更操作。

### 5. 边界问题

对每个层边界，逐一询问：

**Server Component / Client Component 边界：**

- Server Component 作为 props 传递的数据是什么？
- 这些数据都是可序列化的吗？（不能传函数、不能传 Date 对象）
- Client Component 在变更后是否需要刷新数据？
- 使用 `router.refresh()` 或 `revalidatePath()` 进行缓存失效处理

**Client Component / Server Action 边界：**

- 表单数据在提交前是否经过 Zod schema 校验？
- 错误如何展示？（通过 Sonner 显示 toast）
- 是否使用了 `useTransition` 进行非阻塞变更？
- 变更后需要调用 `revalidatePath()` 的路径有哪些？

**数据层 / Supabase 边界：**

- 是否检查了 `isSupabaseConfigured()` 并提供 mock 回退？
- snake_case 的 DB 行是否已映射为 camelCase 的 app model？
- 是否检查了 Supabase 错误？（`if (error) throw`）
- 没有在循环中使用 `await` 吗？（批量查询使用 `.in()`）

### 6. 边界情况

- [ ] 如果数据为空或 null 怎么办？
- [ ] 如果 Supabase 查询失败怎么办？
- [ ] 如果用户在变更中途导航离开怎么办？
- [ ] 如果同一个变更触发了两次（双击）怎么办？
- [ ] 如果 session 在操作中途过期怎么办？
- [ ] 如果 Supabase 未配置怎么办？（mock 回退）

---

## 常见模式

### 模式 A：带数据的 Server Component 页面

**涉及层**：Server Component -> `lib/data/*` -> Supabase -> Client Component

```
1. page.tsx：读取 searchParams，调用 lib/data/* 获取数据
2. lib/data/*：检查 isSupabaseConfigured()，查询 Supabase
3. Mapper：将 DomainRow[] 转换为 Domain[]
4. page.tsx：将数据作为 props 传给 *PageClient 组件
5. *PageClient：渲染表格，处理交互
```

**常见问题**：
- **瀑布式请求**：串行数据调用；使用 `Promise.all` 并行获取
- **序列化**：不要将 Date 对象或函数作为 props 传递
- **搜索参数**：Server Components 读取 `searchParams`，并传给数据函数

### 模式 B：带 Server Action 的表单对话框

**涉及层**：Client Component -> React Hook Form -> Server Action -> `lib/data/*` -> Supabase

```
1. 用户：打开对话框，填写表单
2. React Hook Form：通过 Zod resolver 校验（客户端 UX）
3. onSubmit：携带表单值调用 Server Action
4. Server Action：requireAccess() -> schema.parse() -> lib/data/*
5. lib/data/*：Supabase insert/update
6. Server Action：为受影响的路由调用 revalidatePath()
7. 客户端：显示成功 toast，关闭对话框
```

**常见问题**：
- **双重校验**：Zod 在客户端（UX）和服务端（安全）各校验一次
- **错误处理**：在客户端捕获错误，通过 `toast.error()` 展示
- **重新验证**：为所有受影响的路由调用 `revalidatePath()`
- **默认值**：从 schema 文件导出，确保表单初始化的一致性

### 模式 C：带确认的删除

**涉及层**：Client Component -> 确认对话框 -> Server Action -> `lib/data/*` -> Supabase

```
1. 用户：点击删除按钮
2. 确认对话框：显示确认信息
3. 用户：确认 -> 调用 Server Action
4. Server Action：requireAccess() -> lib/data/* 删除
5. revalidatePath() -> 列表刷新
6. 客户端：显示成功 toast
```

**常见问题**：
- **批量删除**：使用 `.in('id', ids)` 而不是在循环中逐个删除
- **级联**：检查关联记录（如子域名）是否需要一并删除
- **乐观 UI**：使用 `useTransition` 进行非阻塞删除

### 模式 D：带图表的仪表盘

**涉及层**：Server Component -> `lib/data/*` -> Client Component（Recharts）

```
1. page.tsx：从 lib/data/* 调用 getDashboardData()
2. lib/data/*：聚合 Supabase 中的数据
3. page.tsx：将数据作为 props 传给 DashboardPageClient
4. 客户端：使用数据渲染 Recharts 组件
```

**常见问题**：
- **域名状态**：始终从 `expiryDate` 计算，永远不要存储
- **日期格式化**：所有日期操作使用 `date-fns`
- **图表颜色**：使用来自 CSS 变量的一致颜色方案

---

## 常见 Bug 的经验教训

| Bug                         | 根本原因                                              | 预防措施                                              |
| --------------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| 变更操作缺少鉴权            | Server Action 中未调用 `requireAccess()`              | 每个 action 的第一行始终调用 `requireAccess()`        |
| 变更后数据过期              | Server Action 中忘记调用 `revalidatePath()`           | 始终重新验证所有受影响的路由                          |
| UI 中出现 snake_case        | 忘记对 DB 行使用 mapper                               | 始终使用 `lib/mappers/*` 处理 Supabase 返回结果       |
| 表单重置不生效              | 表单默认值与预期格式不匹配                            | 从 schema 文件导出默认值                              |
| N+1 查询                    | 在循环中 await Supabase                               | 使用 `.in()` 或 `.select('*, relation(*)')` 联表查询  |
| Supabase 未配置时崩溃       | 缺少 `isSupabaseConfigured()` 检查                   | 始终先检查并提供 mock 回退                            |
| 日期格式错误                | 使用了原生 Date 方法而非 date-fns                     | 所有日期操作始终使用 `date-fns`                       |

---

## 检查清单模板

为你的功能复制此模板：

```markdown
## Feature: [名称]

### 涉及的层

- [ ] Server Component
- [ ] Client Component
- [ ] Server Action
- [ ] 数据层（lib/data/*）
- [ ] Mapper（lib/mappers/*）
- [ ] Middleware

### 数据流

[描述流程]

### 各层的格式

| Layer | Format |
| ----- | ------ |
| ...   | ...    |

### 鉴权策略

- Middleware：[路由是否受保护？是/否]
- Server Action：[已调用 requireAccess()]

### 已考虑的边界情况

- [ ] 空/null 数据
- [ ] Supabase 未配置（mock 回退）
- [ ] 操作失败
- [ ] 重复提交
- [ ] Session 过期
```

---

**核心原则**：在编写代码之前，先梳理每个边界处的数据转换和鉴权检查。
