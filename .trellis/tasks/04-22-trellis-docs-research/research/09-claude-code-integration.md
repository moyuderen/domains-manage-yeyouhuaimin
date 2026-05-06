# Research: 与 Claude Code 的集成最佳实践

- **Query**: Trellis 与 Claude Code 集成的完整配置和最佳实践
- **Scope**: external
- **Date**: 2026-04-22

## Claude Code 配置目录

```
.claude/
├── commands/trellis/          # Slash 命令
│   ├── start.md               #   /trellis:start
│   ├── finish-work.md         #   /trellis:finish-work
│   └── continue.md            #   /trellis:continue
├── agents/                    # Sub-agents
│   ├── trellis-implement.md
│   ├── trellis-check.md
│   └── trellis-research.md
├── skills/                    # Auto-trigger Skills
│   ├── trellis-brainstorm/SKILL.md
│   ├── trellis-before-dev/SKILL.md
│   ├── trellis-check/SKILL.md
│   ├── trellis-update-spec/SKILL.md
│   └── trellis-break-loop/SKILL.md
├── hooks/                     # Hook 脚本
│   ├── session-start.py       #   SessionStart
│   ├── inject-workflow-state.py  # UserPromptSubmit
│   └── inject-subagent-context.py # PreToolUse(Task)
└── settings.json              # Hook 配置
```

## Claude Code 独有的完整功能

Claude Code 是 Trellis 支持最完整的平台：
1. **SessionStart hook** — 自动注入上下文（打开终端即加载）
2. **UserPromptSubmit hook** — 每轮注入工作流状态面包屑
3. **PreToolUse hook** — Sub-agent spawn 时自动注入 JSONL 上下文
4. **真 Sub-agent** — 通过 Task 工具 spawn 独立子进程
5. **Slash 命令** — `/trellis:start`、`/trellis:finish-work`、`/trellis:continue`
6. **MCP 工具支持** — Sub-agent 可声明 MCP 工具（如 `mcp__exa__web_search_exa`）

## CLAUDE.md 与 Trellis 的关系

- `CLAUDE.md` 是 Claude Code 原生的项目指令文件，自动加载
- Trellis 的 `spec/` 是更结构化的规范系统，通过 hook + JSONL 精准注入
- 两者互补：`CLAUDE.md` 放全局硬规则，`spec/` 放按任务组合的详细规范
- 当前项目的 `CLAUDE.md` 已有完整的架构规则和质量门槛

## 会话工作流（Claude Code）

### 自动流程（有 hook 时）

1. 打开终端 → SessionStart hook 自动跑
2. 描述任务 → AI 根据 workflow.md 分类
3. 开发任务 → brainstorm skill 创建 task
4. 编码前 → before-dev skill 读 spec
5. 编码 → spawn trellis-implement（hook 自动注入 implement.jsonl）
6. 检查 → spawn trellis-check（hook 自动注入 check.jsonl）
7. 人工测试 + commit
8. `/trellis:finish-work` → 归档 + journal

### 逃生舱

- `/trellis:start` — 手动重读 workflow.md 和完整上下文
- `/trellis:continue` — AI 停下来或跳步骤时，推进到下一步

## 配置分层原则（与当前项目配合）

当前项目已建立配置分层：
- `.claude/CLAUDE.md` — 项目硬规则唯一真源
- `.claude/memory/*.md` — 长期偏好和项目决策
- `.claude/skills/*.md` — 任务流程模板（Trellis skills 就在这里）
- `.claude/agents/*.md` — 角色视角（Trellis agents 在这里）

## 与其他平台的对比

| 能力 | Claude Code | Cursor | OpenCode | Codex |
|------|------------|--------|----------|-------|
| SessionStart hook | 原生 | 原生 | 原生 | 需要 config |
| PreToolUse hook | 原生 | 原生 | 原生（JS） | 无 |
| 真 Sub-agent | 支持 | 支持 | 支持 | 支持 |
| UserPromptSubmit | 原生 | 原生 | 原生 | 无 |

## 更新 Trellis

```bash
# 预演更新（不做实际修改）
trellis update --dry-run

# 应用更新
trellis update

# 强制覆盖所有文件
trellis update -f

# 跳过所有已修改文件
trellis update -s

# 大版本迁移
trellis update --migrate
```

Trellis 用 `.trellis/.template-hashes.json` 追踪模板文件的 hash，更新时区分用户修改过的文件和未修改的文件。

## 外部参考

- [安装与首个任务](https://docs.trytrellis.app/zh/start/install-and-first-task)
- [多平台与团队配置](https://docs.trytrellis.app/zh/advanced/multi-platform)
- [附录 A: 关键文件路径速查](https://docs.trytrellis.app/zh/advanced/appendix-a)
