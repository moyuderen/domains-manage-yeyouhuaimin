# Research: Trellis 核心概念与架构

- **Query**: Trellis 的核心概念、架构和定位
- **Scope**: external (https://docs.trytrellis.app/zh)
- **Date**: 2026-04-22

## 一句话定位

Trellis 是 AI 编码助手的脚手架：通过自动化机制注入项目规范，让 AI 每次都按你的标准写代码，而不是随机发挥。

## 核心概念

| 概念 | 说明 | 存放位置 |
|------|------|----------|
| Spec（规范） | 编码标准，用 Markdown 写成。AI 写代码前先读规范 | `.trellis/spec/` |
| Workspace（工作区） | 每个开发者的会话日志，让 AI 记住上次做了什么 | `.trellis/workspace/` |
| Task（任务） | 工作单元，包含需求文档和上下文配置 | `.trellis/tasks/` |
| Skill（技能） | Auto-trigger 工作流模块：brainstorm / before-dev / check / update-spec / break-loop | 各平台的 skills 目录 |
| Sub-agent（子代理） | 专门角色的 AI 子进程：trellis-research、trellis-implement、trellis-check | 各平台的 agents 目录 |
| Command（命令） | 显式入口：/trellis:start 和 /trellis:finish-work | 各平台的 commands 目录 |
| Hook（钩子） | 自动触发的脚本，在会话启动、sub-agent 调用等时机注入上下文 | `.claude/hooks/` 等 |
| Journal（日志） | 会话记录文件，记录每次开发做了什么 | `.trellis/workspace/{name}/journal-N.md` |

## 整体架构

```
User
  │
  ▼
AI Coding Assistant Layer (Claude Code / Cursor / OpenCode / 10+ 平台)
  │
  ├── Commands (/trellis:*)     ← 会话边界
  ├── Skills (auto-trigger)      ← 工作流模块
  └── Hooks (hook-capable)       ← 自动注入
  │
  ▼
.trellis/ directory
  ├── spec/       (规范)
  ├── workspace/  (日志)
  ├── tasks/      (任务)
  └── scripts/    (Python 脚本)
  │
  ▼
Sub-agent system
  trellis-research → trellis-implement → trellis-check
  （每个 sub-agent 通过 JSONL 获得精准上下文）
  │
  ▼
Your project code
```

## workflow.md: 单一事实源（Single Source of Truth）

`.trellis/workflow.md` 是定义 Plan / Execute / Finish 契约的唯一文件：
- **Phase 1**（Plan）：task.py create → task.py start
- **Phase 2**（Execute）：trellis-implement → trellis-check
- **Phase 3**（Finish）：最终验证 → /trellis:finish-work

所有注入路径都在运行时读 `workflow.md`——改完不用重 build。改 `workflow.md` 就能改整个项目的工作流。

## 任务状态

默认三个状态：`planning` / `in_progress` / `completed`
- 由 `task.py create` / `start` / `archive` 自动设置
- 与 workflow.md 里的三个 Phase 一一对应

## 会话启动流程

对于 Claude Code（有 SessionStart hook 的平台）：
1. Hook 自动触发，读取 `.trellis/.developer`、`workflow.md`、workspace index、git log、tasks
2. 上下文注入到 AI
3. `start.md` 命令继续：读 workflow.md → 运行 get_context.py → 读 spec 索引 → 汇报并询问用户

## AI 任务分类

| 类型 | 判断依据 | 流程 |
|------|----------|------|
| 问答 | 问代码/架构相关问题 | 直接回答 |
| 小修 | typo/单行修改/约5分钟以内 | 直接改 |
| 开发任务 | 逻辑变更、新功能、多文件修改 | 任务工作流（brainstorm skill） |

## 规范注入机制

Sub-agent 自动规范注入依赖平台的 PreToolUse hook：
1. 主会话 spawn `trellis-*` sub-agent
2. Hook 拦截调用，读 `.trellis/.current-task`
3. 读对应的 JSONL 配置（如 `implement.jsonl`）
4. 读 JSONL 引用的所有文件
5. 读 prd.md 和 info.md
6. 拼接为 `additionalContext` 注入 sub-agent prompt

## 外部参考

- [Trellis 文档首页](https://docs.trytrellis.app/zh/index)
- [架构全景](https://docs.trytrellis.app/zh/advanced/architecture)
- [GitHub](https://github.com/mindfold-ai/Trellis)
- [设计哲学: Effective Harnesses for Long-Running Agents](链接见文档)
