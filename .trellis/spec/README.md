# 域名管理平台 —— 开发规范

基于 Next.js App Router + Supabase 构建的域名管理平台开发规范。

## 目录结构

### [前端](./frontend/index.md)

React 19 + Next.js App Router + Shadcn UI 前端开发模式：

- [目录结构](./frontend/directory-structure.md)
- [组件](./frontend/components.md)
- [状态管理](./frontend/state-management.md)
- [Hooks](./frontend/hooks.md)
- [API 集成](./frontend/api-integration.md)
- [认证](./frontend/authentication.md)
- [CSS 与布局](./frontend/css-layout.md)
- [类型安全](./frontend/type-safety.md)
- [质量检查清单](./frontend/quality.md)

### [后端](./backend/index.md)

Next.js Server Actions + Supabase 后端模式：

- [目录结构](./backend/directory-structure.md)
- [数据库](./backend/database.md)
- [认证](./backend/authentication.md)
- [质量检查清单](./backend/quality.md)

### [共享](./shared/index.md)

跨层通用关注点：

- [依赖管理](./shared/dependencies.md)
- [代码质量](./shared/code-quality.md)
- [TypeScript 规范](./shared/typescript.md)

### [指南](./guides/index.md)

开发思考指南：

- [实现前检查清单](./guides/pre-implementation-checklist.md)
- [跨层思考指南](./guides/cross-layer-thinking-guide.md)
- [代码复用思考指南](./guides/code-reuse-thinking-guide.md)

### [常见问题 / 注意事项](./big-question/index.md)

常见问题及解决方案：

- [Turbopack 与 Webpack Flexbox 差异](./big-question/turbopack-webpack-flexbox.md)
- [WebKit 点击高亮问题](./big-question/webkit-tap-highlight.md)

## 技术栈

- **框架**：Next.js 16、React 19、TypeScript 5.9
- **样式**：TailwindCSS 4、Shadcn UI（Radix UI）
- **数据库**：Supabase（PostgreSQL）
- **表单**：React Hook Form + Zod
- **状态**：Zustand（客户端状态）、URL search params
- **图表**：Recharts
- **日期**：date-fns
- **动画**：Framer Motion
- **Toast 通知**：Sonner
- **主题**：next-themes
- **图标**：Lucide React
- **包管理器**：npm

## 使用方式

本规范可作为以下用途：

1. **参考文档** —— 实现功能时查阅对应指南
2. **代码审查清单** —— 对照既有模式验证实现质量
3. **入职材料** —— 帮助新开发者快速了解项目规范

### 更新规范

更新规范文件时，请按类型分类：

| 类型 | 使用时机 | 示例 |
|------|---------|------|
| **决策** | 在多个方案中选择了某一个 | 选择 Zustand 而非 Context 管理客户端状态 |
| **规范** | 项目范围内约定的实践 | Server Actions 必须以 `requireAccess()` 开头 |
| **模式** | 可复用的实现方式 | 三层类型结构（Row / Model / FormValues） |
| **禁止** | 不得使用的做法 | 绝不向客户端暴露 service-role key |
| **错误** | 带有修复方案的常见错误 | 忘记调用 `revalidatePath()` 导致缓存过期 |
| **陷阱** | 反直觉的行为 | TailwindCSS v4 配置在 globals.css 中，而非 tailwind.config.js |

使用 `trellis-update-spec` skill 将新经验沉淀到这些文档中。
