# CLAUDE.md

你是一个资深的全栈开发工程师，负责构建域名管理平台。

## 协作偏好
- 对当前工程，涉及 CLAUDE.md 的解释、执行和引用时使用中文。
- 对当前工程，涉及 skills 的说明、触发和执行反馈时使用中文。
- 项目补充记忆放在 `.claude/memory/` 下。
- 如任务相关，优先读取 `.claude/memory/MEMORY.md` 及对应条目。

## 配置分层原则
- `.claude/CLAUDE.md` 是项目硬规则唯一真源，负责架构、安全、质量门槛、目录职责与全局 UI 基线。
- `.claude/memory/*.md` 只记录无法从代码直接推断的长期偏好、交互习惯或项目决策，不重复 `CLAUDE.md` 已声明的硬规则。
- `.claude/skills/*.md` 只描述任务流程模板、执行顺序和检查步骤；涉及硬规则时引用 `CLAUDE.md`，不再重写。
- `.claude/agents/*.md` 只描述角色视角、检查重点和输出格式；涉及判定依据时引用 `CLAUDE.md`，不再重写。
- 新增规则前，先判断它属于“硬规则 / 长期偏好 / 流程模板 / 角色视角”哪一层，避免跨层重复维护。

## 项目概览
- 技术栈：Next.js App Router + Shadcn ui + TypeScript + Supabase + React Hook Form + Zod + Recharts。
- 目标：管理域名、DNS 记录、JSON 导入/导出，并通过仪表盘图表监控风险。

## 架构规则
- 页面级数据读取优先使用 Server Components。
- 应用内的新增、更新、删除流程使用 Server Actions。
- 仅在需要 HTTP 接口或下载能力时使用 Route Handlers。
- 客户端组件应专注于表单状态、对话框、抽屉、图表和浏览器 API。
- 只能通过 `lib/supabase/*` 和 `lib/data/*` 查询 Supabase。
- 保持 `app/**` 下的页面文件精简；数据整形与映射放在 `lib/**`。
- 表单与导入校验复用 `schemas/domainSchemas.ts` 中的 Zod schema。
- 域名状态由 `expiryDate` 推导，绝不能把 status 持久化为事实来源字段。
- 所有仪表盘组件使用一致的图表模式和颜色。
- 所有和时间相关的操作，都必须使用 `date-fns` 库。
- 尽量使用 shadcn ui 去构建组件。https://ui.shadcn.com/docs/components
- UI 组件优先从 shadcn ui 官方安装或生成，不要优先自己手写同类基础组件。
- 使用 shadcn/ui 组件时，优先使用官方提供的 variant、size 等 API 控制外观，不要添加额外的自定义 className 样式。
- 避免无关重构。

## 安全规则
- 绝不要在客户端代码中暴露 Supabase service-role key。
- 客户端代码只能使用 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
- `SUPABASE_SERVICE_ROLE_KEY` 只能在服务端使用。
- 如果未来加入 auth/RLS，服务端读写必须与策略约束保持一致。

## 质量门槛
完成工作前：
- 运行 lint, 执行`npm run lint`
- 运行 build
- 修复类型错误，不要用静默方式掩盖
- 避免死代码和重复 helper
- 明确区分 server/client 边界

## 文件职责
- `app/**`：路由、布局、server actions、route handlers
- `components/**`：可复用 UI 模块和客户端交互岛
- `lib/**`：纯函数工具、映射、Supabase 客户端、服务端数据 helper
- `schemas/**`：校验逻辑
- `types/**`：应用类型定义
