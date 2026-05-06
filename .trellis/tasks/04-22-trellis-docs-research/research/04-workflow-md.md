# Research: workflow.md 的推荐结构

- **Query**: workflow.md 的推荐结构和定制方法
- **Scope**: external
- **Date**: 2026-04-22

## 核心定位

`.trellis/workflow.md` 是 Trellis 开发流程的**单一事实源（single source of truth）**：
- Phase 定义、skill 路由、每轮面包屑、task.py 命令参考都在这一个文件里
- Fork 工作流 = 改一个 markdown 文件，不用动 Python、不用改 hook、不用重发包

## workflow.md 控制的内容

| 段落 | 谁来读 | 效果 |
|------|--------|------|
| `## Phase Index` + `## Phase 1/2/3` | AI 在会话开始时读（通过 SessionStart hook） | 定义三阶段流程和每个阶段的 step 级 how-to |
| `### Skill Routing` | AI 在会话开始时读 | 把用户意图映射到要加载的 skill |
| `### DO NOT skip skills` | AI 在会话开始时读 | 列出 AI 想跳过 skill 时常见的借口以及为什么不对 |
| `## Workflow State Breadcrumbs` | inject-workflow-state.py 在每次 UserPromptSubmit 触发 | 每轮用 `<workflow-state>` 注入面包屑 |
| `### Task System`（task.py 命令表） | AI 在会话开始时读 | 16 个 task.py 子命令按用途分组的参考 |

## 推荐的三阶段结构

### Phase 1: Plan（规划）
- 1.0 task.py create — 创建任务目录
- 1.1 brainstorm skill — 起草 prd.md
- 1.2 research（可选）— spawn trellis-research
- 1.3 init-context — 初始化 JSONL
- 1.4 task.py start — 设为当前任务

### Phase 2: Execute（执行）
- 2.1 trellis-implement — 编码
- 2.2 trellis-check — 验证 + 自修复

### Phase 3: Finish（收尾）
- 3.1 最终验证
- 3.2 update-spec（可选）— 沉淀经验
- 3.3 人工测试 + commit
- 3.4 /trellis:finish-work — 归档 + journal

## Workflow State Breadcrumbs（工作流状态面包屑）

每轮注入的 `<workflow-state>` 块按当前任务 status 变化：

```markdown
## Workflow State Breadcrumbs

[workflow-state:no_task]
No active task. If the user describes multi-step work, load trellis-brainstorm skill...
[/workflow-state:no_task]

[workflow-state:planning]
Complete prd.md via trellis-brainstorm skill; then run task.py start.
[/workflow-state:planning]

[workflow-state:in_progress]
Flow: implement → check → update-spec → finish
Check conversation history + git status to determine current step; do NOT skip check.
[/workflow-state:in_progress]

[workflow-state:completed]
User commits changes; then run task.py archive.
[/workflow-state:completed]
```

### 面包屑规则

- 标签 STATUS 对应 `task.json.status`。默认：`planning` / `in_progress` / `completed`，没活跃任务时走 `no_task`
- 标签名短横线和下划线都支持
- 某个状态没有匹配的标签块时，hook 走内置兜底
- 每个块保持简短（约 200 字节）——每轮都注入，写长了 AI 每条消息都要付注意力代价

## 定制方法

### 加一个自定义状态

```markdown
[workflow-state:blocked]
This task is blocked. Do NOT guess or work around it.
Ask the user what is blocking it and what they need.
[/workflow-state:blocked]
```

然后通过 `task.py` 设置状态即可触发。

### 改 Skill 路由表

workflow.md 里的 Skill Routing 段落定义了用户意图到 skill 的映射。直接修改即可。

### 加/改 Phase

可以添加自定义 Phase（如 Phase 2.5: Review），直接在 workflow.md 中添加对应段落。

### 哪些东西不要改

- 不要删 `## Phase Index` 段落——SessionStart hook 需要它
- 不要改 `[workflow-state:STATUS]` 的语法格式
- 不要把工作流逻辑搬到 Python hook 里——保持一个文件管理

### 改动何时生效

所有注入路径都在运行时读 workflow.md，改完不用重 build，下次 session 所有平台、skill、sub-agent、命令全都按新版读。

## 外部参考

- [定制 Workflow](https://docs.trytrellis.app/zh/advanced/custom-workflow)
