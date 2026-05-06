# 依赖项与版本

> 域名管理平台实际使用的依赖项，基于 `package.json`。

---

## 运行环境

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | >=18 | JavaScript 运行时 |
| npm | （内置） | 包管理器 |

---

## 核心框架

| 包名 | 版本 | 说明 |
|------|------|------|
| next | ^16.x | React 框架（App Router） |
| react | ^19.x | UI 库 |
| react-dom | ^19.x | React DOM 渲染器 |
| typescript | ^5.9 | TypeScript 语言 |

---

## 后端 / 数据层

### Supabase（数据库 + 认证）

| 包名 | 版本 | 说明 |
|------|------|------|
| @supabase/supabase-js | ^2.x | Supabase JavaScript 客户端 |
| @supabase/ssr | ^0.6.x | Supabase SSR 辅助工具（基于 Cookie 的认证） |

### 数据校验

| 包名 | 版本 | 说明 |
|------|------|------|
| zod | ^3.x | Schema 校验 |

---

## 前端

### UI 组件（Shadcn UI + Radix UI）

| 包名 | 版本 | 说明 |
|------|------|------|
| @radix-ui/react-alert-dialog | latest | 警告对话框原语 |
| @radix-ui/react-dialog | latest | 对话框原语 |
| @radix-ui/react-dropdown-menu | latest | 下拉菜单原语 |
| @radix-ui/react-label | latest | 标签原语 |
| @radix-ui/react-popover | latest | 弹出层原语 |
| @radix-ui/react-select | latest | 选择器原语 |
| @radix-ui/react-slot | latest | Slot 原语 |
| @radix-ui/react-switch | latest | 开关原语 |
| @radix-ui/react-tooltip | latest | 工具提示原语 |
| lucide-react | latest | 图标库 |
| sonner | ^2.x | Toast 通知 |

### 样式

| 包名 | 版本 | 说明 |
|------|------|------|
| tailwindcss | ^4.x | 原子化 CSS（v4 配置写在 `globals.css` 中） |
| @tailwindcss/postcss | ^4.x | PostCSS 插件 |
| tailwind-merge | ^3.x | Tailwind 类名合并 |
| class-variance-authority | ^0.7.x | 变体管理（cva） |
| clsx | ^2.x | 类名工具函数 |

### 表单管理

| 包名 | 版本 | 说明 |
|------|------|------|
| react-hook-form | ^7.x | 表单状态管理 |
| @hookform/resolvers | ^5.x | 表单校验解析器（Zod 集成） |

### 状态管理

| 包名 | 版本 | 说明 |
|------|------|------|
| zustand | ^5.x | 轻量级状态管理 |

### 图表

| 包名 | 版本 | 说明 |
|------|------|------|
| recharts | ^2.x | 仪表盘图表库 |

### 动画

| 包名 | 版本 | 说明 |
|------|------|------|
| framer-motion | ^12.x | 动画库 |

### 主题

| 包名 | 版本 | 说明 |
|------|------|------|
| next-themes | ^0.4.x | 暗黑模式 / 主题切换 |

### 工具函数

| 包名 | 版本 | 说明 |
|------|------|------|
| date-fns | ^4.x | 日期工具（所有日期操作均使用此库） |

---

## 开发工具

### 代码质量

| 包名 | 版本 | 说明 |
|------|------|------|
| eslint | ^9.x | 代码检查工具 |
| eslint-config-next | ^16.x | Next.js ESLint 配置 |
| @eslint/eslintrc | ^3.x | ESLint 配置工具 |

---

## 重要说明

1. **React 19**：使用最新版 React，支持 Server Components
2. **Next.js 16**：App Router 是主要的路由模式
3. **TailwindCSS 4**：使用新的 v4 配置格式（配置写在 `globals.css` 中，而非 `tailwind.config.js`）
4. **Zod 3**：用于表单校验和 Server Action 输入校验
5. **单仓库**：非 monorepo，所有代码共用一个 `package.json`
6. **npm**：使用 `npm install`，不使用 pnpm 或 yarn

---

## 更新依赖

更新依赖时：

1. 检查与 React 19 和 Next.js 16 的兼容性
2. 在根目录执行 `npm install`
3. 执行 `npm run lint` 确认 lint 通过
4. 执行 `npm run build` 确认生产构建正常
