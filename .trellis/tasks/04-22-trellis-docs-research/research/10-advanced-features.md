# Research: 高级功能与配置

- **Query**: 可能遗漏的高级功能或配置项
- **Scope**: external
- **Date**: 2026-04-22

## 远程 Spec 模板

不用从零写 spec，在 init 时拉取预置的 spec 模板：

```bash
# 交互式：浏览可用模板并挑一个
trellis init

# 指定 Marketplace 模板
trellis init --template <template-name>

# 自定义 Registry
trellis init --registry <url>
```

## Workspace 系统

### 结构

```
.trellis/workspace/
├── index.md              # 所有开发者的主索引
└── {your-name}/
    ├── index.md          # 个人索引（总会话数、最后活跃时间）
    └── journal-N.md      # 会话日志（约每 2000 行新起一个文件）
```

### 记录会话

```bash
python3 ./.trellis/scripts/add_session.py --title "Title" --commit "hash" --summary "Summary"
```

## Context Script（上下文脚本）

```bash
python3 ./.trellis/scripts/get_context.py                            # 完整会话上下文
python3 ./.trellis/scripts/get_context.py --mode packages            # 可用 packages + spec 层
python3 ./.trellis/scripts/get_context.py --mode phase --step <X.Y>  # 某个 workflow 步骤的详细指南
python3 ./.trellis/scripts/get_context.py --mode record              # 确认有变更和活跃任务
```

## .agents/skills/ 跨平台共享层

- 遵循 `agentskills.io` 规范
- `trellis init` 把所有 skill 都写一份到 `.agents/skills/`
- 可被 Amp、Cline、Deep Agents、Firebender、Kimi Code CLI、Warp 等读该标准的 agent 直接消费

## Developer Identity（开发者身份）

```bash
python3 ./.trellis/scripts/init_developer.py <your-name>
```

- 创建 `.trellis/.developer`（gitignored）
- 创建 `.trellis/workspace/<your-name>/`
- 用于多人协作时的身份隔离

## PR 创建

```bash
# 自动创建 PR（读取 task.json 的 branch、base_branch、scope）
python3 ./.trellis/scripts/task.py create-pr [name] [--dry-run]
```

## 多人协作

- 开发者隔离：`workspace/{name}/`、`.developer`、`.current-task`
- 共享状态：`.trellis/spec/` 和 `.trellis/tasks/` 走 PR review
- 建任务时用 `--assignee` 避免撞车
- 队友 pull 后各自 `trellis init -u their-name`

## 0.4 → 0.5 的主要变化

1. **Skill-first 架构**：命令从多个精简为 3 个，其余变成 auto-trigger skill
2. **workflow.md 收敛**：工作流行为从三处（hook Python、configurator TS、命令 md）收敛到 workflow.md 一个文件
3. **不再有外部 Ralph Loop**：trellis-check sub-agent 自带重试循环
4. **支持 13 个平台**：从 Claude Code 扩展到 13 个配置平台

## FAQ 要点

### Q5: spec 写多细？
- 每文件 200-500 行、每小节 20-50 行
- 具体代码例子比抽象规则有用
- 发现过时立即更新

### Q9: Cursor 用户能拿到和 Claude Code 一样的自动化吗？
Cursor 从 0.46+ 开始支持 hooks（SessionStart、UserPromptSubmit、PreToolUse），所以是的。

### Q10: Windows 用户怎么装 Trellis？
需要 Node.js 18+ 和 Python 3.10+，全平台支持。

### Q12: command / skill / sub-agent 有什么区别？
- Command = 用户显式入口（会话边界）
- Skill = AI 自动触发的工作流模块
- Sub-agent = 有自己角色的隔离子进程

## 关键文件路径速查（Claude Code）

| 文件 | 说明 | 读取时机 |
|------|------|----------|
| `.trellis/workflow.md` | 开发工作流契约 | 每次会话开始 |
| `.trellis/config.yaml` | packages、hooks 等配置 | init 和 update |
| `.trellis/.version` | 当前 Trellis 版本 | update |
| `.trellis/.template-hashes.json` | 模板文件 hash | update |
| `.trellis/.developer` | 开发者身份 | 每次会话 |
| `.trellis/.current-task` | 指向当前任务 | Sub-agent 启动 |

## Python 脚本速查

| 脚本 | 用途 |
|------|------|
| `get_context.py` | 获取会话上下文 |
| `task.py` | 任务生命周期管理 |
| `add_session.py` | 记录会话日志 |
| `init_developer.py` | 初始化开发者身份 |

## 外部参考

- [附录 A: 关键文件路径速查](https://docs.trytrellis.app/zh/advanced/appendix-a)
- [附录 B: 命令与 Skill 速查](https://docs.trytrellis.app/zh/advanced/appendix-b)
- [附录 F: FAQ](https://docs.trytrellis.app/zh/advanced/appendix-f)
- [资源链接与致谢](https://docs.trytrellis.app/zh/advanced/resources)
