# Research: config.yaml 完整配置项

- **Query**: trellis.config.yaml 的完整配置项和最佳实践
- **Scope**: external + internal
- **Date**: 2026-04-22

## 配置文件位置

`.trellis/config.yaml`

## 完整配置项

### Session Recording（会话记录）

```yaml
# 自动提交 journal/index 变更时使用的 commit message
session_commit_message: "chore: record journal"

# journal 文件最大行数，超过后自动轮转到新文件
max_journal_lines: 2000
```

### Task Lifecycle Hooks（任务生命周期钩子）

```yaml
# 任务生命周期事件后执行的 shell 命令
# 每个 hook 接收 TASK_JSON_PATH 环境变量（指向 task.json）
# Hook 失败只打印警告，不阻塞主操作
hooks:
  after_create:
    - "echo 'Task created'"
  after_start:
    - "echo 'Task started'"
  after_finish:
    - "echo 'Task finished'"
  after_archive:
    - "echo 'Task archived'"
```

支持的事件：
| 事件 | 触发时机 |
|------|----------|
| after_create | task.py create 完成后 |
| after_start | task.py start 完成后 |
| after_finish | task.py finish 完成后 |
| after_archive | task.py archive 完成后 |

环境变量：
- `TASK_JSON_PATH`：指向 task.json 的路径

### Monorepo / Packages（包管理）

```yaml
# 声明 monorepo 的 packages
# trellis init 会自动检测 workspaces，也可以手动配置
packages:
  frontend:
    path: packages/frontend
  backend:
    path: packages/backend
  docs:
    path: docs-site
    type: submodule

# --package 未指定时的默认包
default_package: frontend
```

## 实践示例：Linear Sync Hook

```yaml
hooks:
  after_create:
    - "python3 .trellis/scripts/sync-linear.py create"
  after_start:
    - "python3 .trellis/scripts/sync-linear.py start"
  after_archive:
    - "python3 .trellis/scripts/sync-linear.py archive"
```

## 当前项目的 config.yaml

当前项目（domains-manage）的配置使用默认值，只有 session_commit_message 和 max_journal_lines 有显式设置，packages 部分注释掉了（因为这是单体项目，非 monorepo）。

## 最佳实践

1. 所有值都有默认值，只覆盖需要改的
2. 单体项目不需要配置 packages
3. Hook 失败不会阻塞操作，适合做轻量级集成（如同步到项目管理工具）
4. journal 轮转默认 2000 行，一般不需要调整

## 外部参考

- [日常使用 - 任务生命周期 Hook](https://docs.trytrellis.app/zh/start/everyday-use)
