# Research: Hook 配置方式

- **Query**: Trellis hooks 的配置方式和类型
- **Scope**: external
- **Date**: 2026-04-22

## Hook 类型

| Hook | 触发 | 用途 |
|------|------|------|
| SessionStart | 会话开始 | 加载上下文、初始化环境 |
| UserPromptSubmit | 用户提交提示词 | 提示 AI 注意当前任务状态 |
| PreToolUse | 工具调用前 | 拦截、修改参数、注入上下文 |
| PostToolUse | 工具调用后 | 记录活动、触发后续动作 |

## 平台支持情况

- **SessionStart**: Claude Code、Cursor、OpenCode、Gemini CLI、Qoder、CodeBuddy、Copilot、Droid（+ 开了 `codex_hooks = true` 的 Codex）
- **PreToolUse**（sub-agent 上下文注入）: Claude Code、Cursor、OpenCode、CodeBuddy、Droid
- **UserPromptSubmit**: 范围与 SessionStart 相同
- **Kilo / Antigravity / Windsurf**: 完全没有 hook 原语

## Claude Code 原生 Hook

### session-start.py（SessionStart）
- 自动注入上下文
- 读取 `.trellis/.developer`、`workflow.md`、workspace index、git log、tasks

### inject-workflow-state.py（UserPromptSubmit）
- 每次用户提交时注入工作流状态面包屑
- 按当前任务 status 注入对应的 `<workflow-state>` 块

### inject-subagent-context.py（PreToolUse - Task）
- 规范注入引擎
- 拦截 Task 工具调用（spawn sub-agent 时）
- 读 `.current-task` → 读对应 JSONL → 读引用的文件 → 拼接为 additionalContext

## settings.json 配置（Claude Code）

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "python3 \"$CLAUDE_PROJECT_DIR/.claude/hooks/session-start.py\"",
            "timeout": 10
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "python3 \"$CLAUDE_PROJECT_DIR/.claude/hooks/inject-workflow-state.py\"",
            "timeout": 5
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Task",
        "hooks": [
          {
            "type": "command",
            "command": "python3 \"$CLAUDE_PROJECT_DIR/.claude/hooks/inject-subagent-context.py\"",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

## 编写自定义 Hook

示例：自动测试 hook（PostToolUse，在 Write 操作后自动跑测试）

```json
{
  "PostToolUse": [
    {
      "matcher": "Write",
      "hooks": [
        {
          "type": "command",
          "command": "python3 \"$CLAUDE_PROJECT_DIR/.claude/hooks/auto-test.py\"",
          "timeout": 30
        }
      ]
    }
  ]
}
```

## 其他平台的 Hook 实现

- **Cursor**: `.cursor/hooks.json` + Python 脚本，事件模型与 CC 兼容
- **OpenCode**: `.opencode/plugins/` 下的 JS factory 函数，事件语义相同
- **Codex**: 只跑 `session-start.py`——没有 PreToolUse
- **Gemini / Qoder / Copilot**: 只跑 SessionStart hook

## 外部参考

- [定制 Hook](https://docs.trytrellis.app/zh/advanced/custom-hooks)
- [附录 A: 关键文件路径速查](https://docs.trytrellis.app/zh/advanced/appendix-a)
