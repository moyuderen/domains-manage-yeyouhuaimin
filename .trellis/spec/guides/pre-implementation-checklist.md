# 实现前检查清单

> **目的**：在编写代码**之前**提出正确的问题，以避免常见的架构错误。

---

## 为什么需要这份清单？

大多数代码质量问题不是在实现过程中才被发现的——它们从一开始就被**设计进去**了：

| 问题                                    | 根本原因                                       | 代价                       |
| --------------------------------------- | ---------------------------------------------- | -------------------------- |
| 常量在多个文件中重复定义                | 没有问"这个值会在其他地方用到吗？"             | 重构 + 测试                |
| 相同逻辑在多处重复                      | 没有问"这个模式是否已存在？"                   | 事后创建抽象               |
| 为同一实体重新定义 Zod schema           | 没有问"这个 schema 是否已定义？"               | 校验不一致                 |
| Supabase 查询写在 Server Action 中      | 没有问"这应该放在 lib/data 吗？"               | 层职责分离被破坏            |
| Server Action 中缺少 requireAccess()    | 没有问"这个变更是否受到保护？"                 | 安全漏洞                   |

**这份清单在这些问题变成代码之前就将其拦截。**

---

## 检查清单

### 1. 常量与配置

在添加任何常量或配置值之前：

- [ ] **多处使用？** 这个值会在 2 个或以上文件中使用吗？
  - 如果是 -> 放入共享常量文件
  - 示例：不要在每个页面文件中各自定义 `PAGE_SIZE = 10`

- [ ] **魔法数字？** 这是一个可能会变化的硬编码值吗？
  - 如果是 -> 提取为具名常量
  - 示例：`SESSION_MAX_AGE = 28800  // 8 小时`

- [ ] **依赖环境？** 这个值在开发/预发/生产环境中不同吗？
  - 如果是 -> 使用环境变量并进行适当校验
  - 示例：`SUPABASE_URL`, `ACCESS_KEY`

### 2. 逻辑与模式

在实现任何逻辑之前：

- [ ] **模式是否已存在？** 先在代码库中搜索类似模式

  ```bash
  # 示例：在实现新的数据查询之前
  rg "getDomain" lib/data/
  rg "useTransition" components/
  ```

- [ ] **是否会重复？** 这段逻辑会在 2 个或以上地方用到吗？
  - 如果是 -> **先**创建共享工具/hook，再使用

- [ ] **服务端还是客户端？** 这段逻辑需要交互性吗？
  - 如果不需要 -> 保持在 Server Component 中（默认）
  - 如果需要 -> 只将交互部分提取为 Client Component

- [ ] **日期操作？** 你在处理日期吗？
  - 始终使用 `date-fns`——不要使用原生 Date 格式化或其他库

### 3. 类型与 Schema

在定义类型之前：

- [ ] **Zod schema 是否已存在？** `schemas/*` 中是否已有该实体的 Zod schema？
  - 检查：`rg "Schema = z.object" schemas/`
  - 永远不要重新定义已有的校验

- [ ] **类型是否已存在？** `types/*` 中是否已有类似的类型？
  - 检查：`rg "interface.*YourType\|type.*YourType" types/`

- [ ] **三层模式？** 这个实体是否需要 DB Row、App Model 和 Form Values 三种类型？
  - DB Row（`*Row`）放在 `types/*`——snake_case 字段
  - App Model 放在 `types/*`——camelCase 字段
  - Form Values（`*FormValues`）放在 `types/*`——表单用字符串字段

- [ ] **是否需要 Mapper？** 如果你添加了新的 DB Row 类型，是否需要在 `lib/mappers/*` 中创建对应的 mapper？

### 4. UI 组件

在创建 UI 组件之前：

- [ ] **Server 还是 Client Component？** 这个组件是否需要：
  - 事件处理器（onClick、onChange）？-> `'use client'`
  - React hooks（useState、useEffect）？-> `'use client'`
  - 浏览器 API（window、document）？-> `'use client'`
  - 以上都不需要？-> 保持为 Server Component（默认）

- [ ] **Shadcn UI 组件？** Shadcn UI 是否已提供此功能？
  - 查阅：https://ui.shadcn.com/docs/components
  - 在手写之前先通过 `npx shadcn@latest add <component>` 安装

- [ ] **是否已有类似组件？** 先搜索再创建
  - `rg "function.*YourComponent" components/`

- [ ] **页面模式？** 对于页面级组件，遵循 Server/Client 拆分：
  - `page.tsx`——Server Component，负责数据获取
  - `*PageClient.tsx`——Client Component，通过 props 接收数据

### 5. Server Actions

在编写 Server Action 之前：

- [ ] **位置正确？** Server Actions 放在 `app/actions/*`
- [ ] **有 `'use server'` 指令？** 文件必须以 `'use server'` 开头
- [ ] **第一行调用 `requireAccess()`？** 每个 action 必须在任何逻辑之前调用 `requireAccess()`
- [ ] **Zod 校验？** 输入必须使用来自 `schemas/*` 的 schema 进行校验
- [ ] **委托给数据层？** DB 操作放在 `lib/data/*`，不放在 action 中
- [ ] **调用了 `revalidatePath()`？** 变更后必须重新验证所有受影响的路由
- [ ] **命名带 `Action` 后缀？** 例如 `createDomainAction`、`deleteDomainAction`

### 6. 数据层

在编写数据查询之前：

- [ ] **位置正确？** 数据查询放在 `lib/data/*`
- [ ] **Mock 回退？** 检查 `isSupabaseConfigured()` 并回退到 `lib/mock/*`
- [ ] **行映射？** 使用 `lib/mappers/*` 中的 mapper 将 DB 行转换为 app model
- [ ] **错误处理？** 检查 `if (error) throw new Error(error.message)`
- [ ] **循环中无 await？** 批量查询使用 `.in()`

### 7. 依赖

在添加依赖之前：

- [ ] **是否已安装？** 检查 `package.json`
  ```bash
  rg "\"dependency-name\"" package.json
  ```

- [ ] **是否有内置替代方案？** 能否使用原生 API 或现有工具替代？

- [ ] **优先 Shadcn UI？** 对于 UI 组件，在添加其他库之前先检查 Shadcn UI 是否已提供

---

## 快速决策树

```
添加值/常量？
|-- 在 2 个或以上文件中使用？ -> 共享常量文件
+-- 仅单个文件使用？ -> 本地常量即可

添加逻辑/行为？
|-- 是否已有类似模式？ -> 扩展或复用现有实现
|-- 会在 2 个或以上地方使用？ -> 先创建共享工具
+-- 仅单处使用？ -> 直接实现

添加类型？
|-- Zod schema 已存在？ -> 使用 z.infer<typeof schema>
|-- DB 实体？ -> 创建 Row + Model + FormValues 类型
|-- 需要转换？ -> 在 lib/mappers/ 中添加 mapper
+-- 仅本地使用？ -> 本地定义

添加组件？
|-- 需要交互性？ -> 'use client'
|-- 纯展示？ -> Server Component（默认）
+-- 完整页面？ -> Server page.tsx + Client *PageClient.tsx

添加变更操作？
|-- Server Action 放在 app/actions/*
|-- 第一行调用 requireAccess()
|-- Zod 校验输入
|-- 委托给 lib/data/*
+-- 执行后调用 revalidatePath()
```

---

## 跨层验证要点

在实现跨越 Server Component -> Server Action -> 数据库的功能时，逐层验证：

| 层               | 检查项                                                              |
| ---------------- | ------------------------------------------------------------------- |
| Server Component | 是否通过 `lib/data/*` 获取数据？Props 是否已传给客户端组件？        |
| Client Component | 加载/错误状态是否已处理？变更是否使用了 `useTransition`？           |
| Server Action    | 是否调用了 `requireAccess()`？是否经过 Zod 校验？是否委托给数据层？ |
| 数据层           | 是否有 Mock 回退？是否检查了错误？DB 行是否已映射为 app model？     |
| Zod Schema       | 与类型是否一致？是否使用 `.refine()` 进行跨字段校验？               |

---

## 需要避免的反模式

### 在 Server Actions 中直接查询 Supabase

```typescript
// 不要这样做：在 Server Action 中直接查询 Supabase
export async function getDomainAction(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('domains').select('*').eq('id', id);
  return data;
}

// 应该这样做：委托给数据层
export async function getDomainAction(id: string) {
  await requireAccess();
  return getDomainById(id);
}
```

### 跳过 Mock 回退

```typescript
// 不要这样做：只处理 Supabase 的情况
export async function getDomains() {
  const supabase = await createSupabaseServerClient();
  // ...
}

// 应该这样做：先检查配置
export async function getDomains() {
  if (!isSupabaseConfigured()) {
    return mockDomains;
  }
  const supabase = await createSupabaseServerClient();
  // ...
}
```

### 不必要的 Client Components

```typescript
// 不要这样做：把所有东西都标记为 'use client'
'use client';
export function DomainCard({ domain }) {
  return <div>{domain.name}</div>; // 完全不需要交互性！
}

// 应该这样做：尽可能保持为 Server Component
export function DomainCard({ domain }) {
  return <div>{domain.name}</div>;
}
```

---

## 何时使用本清单

| 触发条件                            | 行动                    |
| ----------------------------------- | ----------------------- |
| 即将添加常量                        | 执行第 1 节             |
| 即将实现逻辑                        | 执行第 2 节             |
| 即将定义类型或 schema               | 执行第 3 节             |
| 即将创建组件                        | 执行第 4 节             |
| 即将编写 Server Action              | 执行第 5 节             |
| 即将编写数据查询                    | 执行第 6 节             |
| 即将添加依赖                        | 执行第 7 节             |
| 感觉似乎见过类似的代码              | **停下来**先搜索        |

---

**核心原则**：5 分钟的清单思考能节省 50 分钟的重构时间。
