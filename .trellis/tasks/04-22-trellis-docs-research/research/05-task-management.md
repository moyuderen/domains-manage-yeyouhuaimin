# Research: 任务管理最佳实践

- **Query**: 任务管理的全流程和最佳实践
- **Scope**: external
- **Date**: 2026-04-22

## 任务生命周期

```
create → init-context → add-context → start → implement/check → finish → archive
│           │              │           │          │               │         │
▼           ▼              ▼           ▼          ▼               ▼         ▼
创建        初始化 JSONL    追加上下文    设为当前   开发 /          清除      归档到
目录        配置文件        条目          任务指针   检查循环        当前      archive/
task.json                                                         任务
```

## task.py 子命令

### 创建任务

```bash
TASK_DIR=$(task.py create "新增用户登录" \
  --slug user-login \           # 目录名后缀（可选，不写自动生成）
  --assignee alice \            # 负责人（可选）
  --priority P1 \               # 优先级：P0/P1/P2/P3（可选，默认 P2）
  --description "实现 JWT 登录")  # 描述（可选）
# 创建的目录：.trellis/tasks/02-27-user-login/
```

### 上下文配置

```bash
# 初始化 JSONL 配置（生成 implement.jsonl + check.jsonl）
task.py init-context "$TASK_DIR" backend
# dev_type：backend | frontend | fullstack | test | docs
# 可选：--package PACKAGE（monorepo 必填）

# 追加额外的上下文条目
task.py add-context "$TASK_DIR" implement "src/services/auth.ts" "现有 auth 模式"

# 校验 JSONL 里引用的文件都存在
task.py validate "$TASK_DIR"

# 查看所有 JSONL 条目
task.py list-context "$TASK_DIR"
```

注意：`research.jsonl` 不由 `task.py add-context` 管（由 trellis-research sub-agent 读）。

### 任务控制

```bash
# 设为当前任务
task.py start "$TASK_DIR"

# 清除当前任务
task.py finish

# 设置 Git 分支名
task.py set-branch "$TASK_DIR" "feature/user-login"

# 设置 PR 目标分支
task.py set-base-branch "$TASK_DIR" "main"

# 设置 scope（用在 commit message：feat(scope): ...）
task.py set-scope "$TASK_DIR" "auth"
```

### 父子任务（subtasks）

```bash
# 方式 A：在父任务下直接建子任务
task.py create "JWT middleware" --slug jwt-middleware --parent 02-27-user-login

# 方式 B：把两个已有任务链起来
task.py add-subtask 02-27-user-login 02-28-jwt-middleware

# 解除关联（不会删除任何任务）
task.py remove-subtask 02-27-user-login 02-28-jwt-middleware
```

对 task.json 的影响：
- 父任务的 `children: [<子任务目录名>, ...]` 追加子任务名
- 子任务的 `parent: "<父任务目录名>"` 被设置

**重要区分**：`parent` 和 `children` 字段是父子任务关系。`subtasks` 字段是单个任务内部的 todo checklist（name + status 对），与 children 完全无关。

### 任务管理

```bash
# 列出活跃任务
task.py list
task.py list --mine            # 只看自己的
task.py list --status review   # 按状态过滤

# 归档完成的任务
task.py archive user-login     # 移动到 archive/2026-02/

# 列出归档任务
task.py list-archive
task.py list-archive 2026-02   # 按月过滤
```

## task.json Schema

```json
{
  "id": "02-27-user-login",
  "name": "user-login",
  "title": "新增用户登录",
  "description": "实现 JWT 登录流程",
  "status": "planning",           // planning | in_progress | completed
  "dev_type": null,               // backend | frontend | fullstack | test | docs
  "scope": null,                  // commit scope
  "package": null,                // monorepo 包名
  "priority": "P2",               // P0 | P1 | P2 | P3
  "creator": "alice",
  "assignee": "alice",
  "createdAt": "2026-02-27",
  "completedAt": null,
  "branch": null,
  "base_branch": "main",
  "worktree_path": null,
  "commit": null,
  "pr_url": null,
  "subtasks": [],                 // 内部 todo checklist
  "children": [],                 // 子任务目录名数组
  "parent": null,                 // 父任务目录名
  "relatedFiles": [],
  "notes": "",
  "meta": {}                      // 项目级元数据
}
```

## Current-Task 机制

- `task.py start` 写任务路径到 `.trellis/.current-task`
- Hook-capable 平台会在 session 启动时自动注入
- Sub-agent 启动前的 PreToolUse hook 读取此文件做 JSONL 注入

## 最佳实践

1. 建任务时用 `--assignee` 避免撞车
2. 多人项目共享 `tasks/` 走 PR review
3. 开发者隔离通过 `workspace/{name}/`、`.developer`、`.current-task`
4. 不要跳过 `init-context` 步骤——JSONL 是 sub-agent 获取正确规范的关键

## 外部参考

- [日常使用 - 任务管理全流程](https://docs.trytrellis.app/zh/start/everyday-use)
- [附录 C: task.json Schema 参考](https://docs.trytrellis.app/zh/advanced/appendix-c)
