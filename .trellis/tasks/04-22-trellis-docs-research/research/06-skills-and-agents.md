# Research: Skills 和 Agents 的配置方式

- **Query**: Trellis skills 和 agents 的配置方式
- **Scope**: external
- **Date**: 2026-04-22

## Skill-First 架构

从 0.5.0 起，Trellis 采用 skill-first 架构：
- 核心能力以 auto-trigger skill 的形式自动挂载
- 显式 slash 命令保留最小集（只有 3 个：start / finish-work / continue）
- 只覆盖会话边界

## 命令（Commands）

### 只有 3 个 slash 命令

| 命令 | 触发 | 用途 |
|------|------|------|
| `/trellis:start` | 手动（支持 hook 的平台会自动注入） | 开启会话、加载上下文、任务分类 |
| `/trellis:finish-work` | 手动，在人工测试 + commit 之后 | 收尾检查 + 写入 journal |
| `/trellis:continue` | 手动 | 推 AI 进入下一步工作流、防止跳步骤 |

### Claude Code 命令文件位置

```
.claude/commands/trellis/start.md
.claude/commands/trellis/finish-work.md
.claude/commands/trellis/continue.md
```

### 编写自定义命令

好的命令文件应该：
1. 开头用一句话说明会发生什么
2. 按顺序列出 AI 要执行的步骤
3. 指定 AI 在动作前应读的文件
4. 定义期望的输出格式

## Auto-trigger Skills（5 个）

### trellis-brainstorm

- **触发**：用户描述功能 / bug / 模糊需求
- **产出**：task + prd.md
- **行为**：产出任务名和 slug → 起草 prd.md → 需要调研时 spawn trellis-research → 通过 task.py create 建任务

### trellis-before-dev

- **触发**：task 中动手改代码前
- **行为**：读受影响 package 的 spec 索引 → 读 Pre-Development Checklist 里的具体 guideline 文件
- **目的**：确保 AI 在动手前就知道约定

### trellis-check

- **触发**：实现完成后；也被 sub-agent 调用
- **行为**：`git diff --name-only HEAD` 找变更 → 确认哪些 spec 层适用 → 对照 quality checklist 比对代码 → 跑 lint/typecheck/test → 自修复违规

### trellis-update-spec

- **触发**：有值得沉淀的知识时
- **行为**：挑对应的 spec 文件 → 做聚焦更新（decision / convention / pattern / anti-pattern / gotcha）→ 更新索引

### trellis-break-loop

- **触发**：修完棘手 bug 后
- **产出 5 维分析**：
  1. 根因分类
  2. 之前修复尝试失败的原因
  3. 预防机制
  4. 系统化扩散
  5. 知识固化（走 trellis-update-spec）

## Skill 文件格式

Skill 是包含 `SKILL.md` 的文件夹：

```
.claude/skills/my-skill/
├── SKILL.md
└── references/         # 可选的支持文件
```

SKILL.md 使用 YAML frontmatter：

```yaml
---
name: my-skill
description: |
  这个 skill 应该什么时候被触发的一句话说明。平台根据这段文本决定是否 auto-trigger。
---

# My Skill

skill 被触发时 AI 要遵循的指令。

## 步骤
1. 读相关文件。
2. 执行逻辑。
3. 汇报结果。
```

### 写好 description 的关键

description 字段是平台用来匹配的。写成**触发条件**而不是身份介绍：

```yaml
# 好：描述触发条件
description: |
  用于用户刚修完 bug、想理解根因并防止再次发生的场景。

# 差：描述 skill 身份
description: |
  break-loop skill 是分析 bug 的。
```

### 各平台 Skill 位置

| 平台 | 位置 |
|------|------|
| Claude Code | `.claude/skills/{name}/SKILL.md` |
| Cursor | `.cursor/skills/{name}/SKILL.md` |
| OpenCode | `.opencode/skills/{name}/SKILL.md` |
| Codex | `.codex/skills/{name}/SKILL.md` |
| 全部 13 个平台 | 各自目录下 `skills/{name}/SKILL.md` |

## Sub-agents（3 个）

### 定义

Sub-agent 是独立的 AI 子进程，各自有 prompt 和工具/hook 挂接。

| Sub-agent | 角色 | 约束 | 上下文来源 |
|-----------|------|------|------------|
| trellis-research | 代码/文档搜索 | 只读 | research.jsonl |
| trellis-implement | 写代码 | 禁止 git commit | implement.jsonl + prd.md |
| trellis-check | 验证 + 自修复 | 只为修复才写代码 | check.jsonl + prd.md |

### Claude Code Sub-agent 文件格式

```yaml
---
name: agent-name
description: |
  这个 sub-agent 做什么的一句话说明。
tools: Read, Write, Edit, Bash, Glob, Grep
---

# Agent Name

Sub-agent 的指令（相当于 system prompt）。
```

关键 frontmatter 字段：
- `name`：Sub-agent 标识
- `description`：主会话据此决定何时 spawn
- `tools`：用逗号分隔的工具列表
- `model`：可选的模型覆盖（0.5.0-beta.5 起推荐省略）

### 各平台 Agent 文件格式差异

| 平台 | 文件 | 工具字段 |
|------|------|----------|
| Claude Code | `.claude/agents/{name}.md` | `tools:` 逗号列表 |
| OpenCode | `.opencode/agents/{name}.md` | `permission:` 对象 |
| Codex | `.codex/agents/{name}.toml` | TOML `sandbox_mode` |
| Kiro | `.kiro/agents/{name}.json` | JSON `tools:` 数组 |

### Command vs. Sub-agent vs. Skill 选择

| | Command | Sub-agent | Skill |
|--|---------|-----------|-------|
| 用途 | 用户显式入口 | 有自己角色的隔离子进程 | 可复用的工作流模块 |
| 触发 | `/trellis:xxx` | 通过 Task 工具 spawn | 平台按用户意图自动匹配 |
| 粒度 | 会话边界 | 角色级 | 能力或阶段级 |

判断：
- AI 应该基于上下文自动触发 → skill
- 由用户决定时 → command
- 需要隔离 prompt 和约束 → sub-agent

## JSONL 配置格式

每行一个 JSON 对象，定义 hook 要替 sub-agent 注入哪些文件：

```jsonl
{"file": ".trellis/workflow.md", "reason": "项目工作流和约定"}
{"file": ".trellis/spec/backend/index.md", "reason": "后端开发指南"}
{"file": "src/services/auth.ts", "reason": "现有 auth 实现"}
{"file": ".trellis/tasks/02-27-user-login/research/", "type": "directory", "reason": "调研产物"}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| file | 是 | 文件或目录的相对路径 |
| reason | 是 | 为什么要读这个文件 |
| type | 否 | 默认 "file"。"directory" 模式只注入 .md（最多 20 个） |

### JSONL 最佳实践

- 不要往里塞纯代码文件——sub-agent 自己有 Read/Grep，需要时会自己找
- JSONL 注入的应该是 spec 文件和 research 产出
- 把代码塞进 context 只是徒增 token

## 外部参考

- [定制 Slash 命令](https://docs.trytrellis.app/zh/advanced/custom-commands)
- [定制 Sub-agent](https://docs.trytrellis.app/zh/advanced/custom-agents)
- [定制 Skill](https://docs.trytrellis.app/zh/advanced/custom-skills)
- [附录 B: 命令与 Skill 速查](https://docs.trytrellis.app/zh/advanced/appendix-b)
- [附录 D: JSONL 配置格式参考](https://docs.trytrellis.app/zh/advanced/appendix-d)
