# 代码复用思考指南

> **目的**：先搜索，再编写 —— 避免重复已有的模式、组件和工具函数。
>
> **核心原则**：30 秒的搜索能节省 30 分钟的编写（以及未来的维护成本）。

---

## 先搜索、再编写检查清单

### 1. 常量与配置

- [ ] 该值是否已在其他地方定义？
  ```bash
  rg "PAGE_SIZE\|STORAGE_KEY\|EXPIRING_THRESHOLD" lib/ components/
  ```
- [ ] 该环境变量是否已在 `.env.example` 中声明？
- [ ] `lib/` 中是否有功能相同的共享常量？

### 2. 类型与 Schema

- [ ] `types/` 中是否已有匹配或相似的类型？
  ```bash
  rg "type.*Domain\|interface.*Domain" types/
  ```
- [ ] `schemas/` 中是否已有该实体对应的 Zod schema？
  ```bash
  rg "Schema = z\." schemas/
  ```
- [ ] 是否真的需要三层结构（Row / Model / FormValues）？先确认它们是否存在：
  ```bash
  rg "Row\b|FormValues\b" types/
  ```
- [ ] `lib/mappers/` 中是否已有该实体的映射器？

### 3. UI 组件

- [ ] Shadcn UI 是否已提供所需组件？检查 `components/ui/`
  ```bash
  ls components/ui/
  ```
- [ ] 是否有现有业务组件实现了类似功能？
  ```bash
  rg "export function" components/domains/ components/accounts/ components/sites/
  ```
- [ ] 能否复用 `components/common/` 中的 `ConfirmDialog` 或 `EmptyState`？
- [ ] 页面模式是否已建立？（Server 端 page.tsx + Client 端 *PageClient.tsx）

### 4. Hooks 与工具函数

- [ ] `lib/` 中是否已有类似的工具函数？
  ```bash
  rg "export function" lib/domainStatus.ts lib/date.ts lib/statistics.ts lib/utils.ts
  ```
- [ ] 该逻辑是否应扩展现有 Zustand store，而非新建一个？
  ```bash
  ls lib/stores/
  ```
- [ ] `date-fns` 是否已提供所需的日期操作？

### 5. 数据层与映射器

- [ ] `lib/data/` 中是否已有该实体的查询？
  ```bash
  ls lib/data/
  ```
- [ ] `lib/mappers/` 中是否已有该实体的映射器？
  ```bash
  ls lib/mappers/
  ```
- [ ] `lib/mock/` 中是否已准备好模拟数据？
  ```bash
  ls lib/mock/
  ```

### 6. Server Actions

- [ ] `app/actions/` 中是否已有该实体的 CRUD actions？
  ```bash
  ls app/actions/
  ```
- [ ] 能否扩展现有 action，而非新建文件？

---

## 决策流程

```
准备编写新代码？
│
├─ 搜索已有代码（rg / grep / ls）
│  ├─ 找到完全匹配 → 直接复用
│  ├─ 找到类似实现 → 考虑泛化后复用
│  └─ 未找到 → 新建（按下方确认正确位置）
│
└─ 新建时：
   ├─ 目录是否正确？（参见 directory-structure.md）
   ├─ 命名是否符合规范？（参见 code-quality.md）
   ├─ 后续是否会被复用？
   │  ├─ 是 → 放入 lib/ 或 components/common/
   │  └─ 否 → 内联或与使用方共置
   └─ 是否需要模拟数据兜底？（数据层必须有）
```

---

## 常见复用场景

| 需要... | 优先检查... | 位置 |
|---------|------------|------|
| 日期格式化 | `lib/date.ts`、`date-fns` | `lib/date.ts` |
| 域名状态逻辑 | `lib/domainStatus.ts` | 已存在 |
| 表单校验 | `schemas/*.ts` | `schemas/` |
| 类型定义 | `types/*.ts` | `types/` |
| 数据库 → 应用模型映射 | `lib/mappers/*.ts` | `lib/mappers/` |
| Supabase 查询 | `lib/data/*.ts` | `lib/data/` |
| 空状态展示 | `components/common/EmptyState.tsx` | 已存在 |
| 删除前二次确认 | `components/common/ConfirmDialog.tsx` | 已存在 |
| Toast 通知 | `sonner`（已安装） | `toast.success()` / `toast.error()` |
| 仪表盘统计 | `lib/dashboard.ts`、`lib/statistics.ts` | 已存在 |
