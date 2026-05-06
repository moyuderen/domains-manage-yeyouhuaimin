# 思考指南

> **目的**：通过系统化的思考指南，在问题演变为 bug 之前提前发现隐患。
>
> **核心理念**：30 分钟的思考能节省 3 小时的调试时间。

---

## 可用思考指南

| 指南 | 目的 | 使用时机 |
| ----------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------ |
| [跨层思考](./cross-layer-thinking-guide.md) | 梳理跨层数据流 | 实现跨越 3 层及以上的功能前 |
| [实现前检查清单](./pre-implementation-checklist.md) | 编码前验证就绪状态 | 开始任何功能实现前 |
| [代码复用思考](./code-reuse-thinking-guide.md) | 先搜索后编写，避免重复 | 新建任何文件或函数前 |

---

## 快速参考：何时使用哪个指南

### 跨层问题

使用[跨层思考指南](./cross-layer-thinking-guide.md)，当：

- [ ] 功能涉及 3 层及以上（Server Component、Client Component、Server Action、Supabase）
- [ ] 数据格式在层间发生变化（数据库 snake_case → 应用模型 camelCase）
- [ ] 不确定某段逻辑应该放在哪里
- [ ] 功能涉及表单提交、数据变更及缓存刷新

### 编写代码前

使用[实现前检查清单](./pre-implementation-checklist.md)，当：

- [ ] 准备添加常量或配置值
- [ ] 准备实现新逻辑
- [ ] 准备定义类型或 Zod schema
- [ ] 准备创建组件
- [ ] 准备编写 Server Action 或数据查询
- [ ] 感觉曾经见过类似的代码

### 新建代码前

使用[代码复用思考指南](./code-reuse-thinking-guide.md)，当：

- [ ] 准备新建组件、hook 或工具函数
- [ ] 准备定义新的类型或 Zod schema
- [ ] 准备添加常量或配置值
- [ ] 感觉类似代码可能已经存在于某处

---

## 项目分层

在本域名管理平台中，典型的分层结构如下：

```
Server Components（page.tsx —— 通过 lib/data/* 获取数据）
        |
        v
Client Components（*PageClient.tsx —— 交互、表单、对话框、图表）
        |
        v
Server Actions（app/actions/* —— requireAccess()、Zod 校验、委托处理）
        |
        v
数据层（lib/data/* —— Supabase 查询、模拟数据兜底、行映射）
        |
        v
Supabase（PostgreSQL —— snake_case 字段）
```

每个边界都是潜在的 bug 来源，原因包括：

- **序列化** —— 只有可序列化的数据才能跨越 Server/Client 边界（不能传递函数或 Date 对象）
- **字段命名** —— Supabase 使用 snake_case，应用模型使用 camelCase；映射器负责转换
- **认证上下文** —— 中间件保护路由，`requireAccess()` 保护 Server Actions
- **模拟数据兜底** —— `lib/data/*` 必须检查 `isSupabaseConfigured()`，并回退到 `lib/mock/*`
- **缓存失效** —— 数据变更后必须对所有受影响的路由调用 `revalidatePath()`

---

## 核心原则

1. **先搜索，再编写** —— 在创建新内容之前，始终搜索已有的模式
2. **先思考，再编码** —— 5 分钟的清单检查能节省 50 分钟的调试
3. **验证所有层** —— 改动往往需要在多处同步更新
4. **从 bug 中学习** —— 修复非平凡 bug 后，将经验教训补充到对应指南中
