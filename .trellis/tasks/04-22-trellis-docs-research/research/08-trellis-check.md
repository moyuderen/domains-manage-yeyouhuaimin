# Research: trellis-check 质量检查配置

- **Query**: trellis-check 的配置和工作方式
- **Scope**: external
- **Date**: 2026-04-22

## trellis-check 概述

trellis-check 同时是 skill 和 sub-agent：
- **作为 skill**：实现完成后自动触发，在主会话内联运行
- **作为 sub-agent**：主会话可以 spawn 它做独立验证，自带重试循环

## 检查流程

1. `git diff --name-only HEAD` 找变更文件
2. 确认哪些 spec 层适用
3. 对照每层 index 的 quality checklist 比对代码
4. 为受影响 package 跑 `pnpm lint` / `pnpm typecheck` / `pnpm test`（或等价命令）
5. 在有限循环内自修复违规
6. 汇报修了什么、还剩什么

## 上下文注入

trellis-check sub-agent 通过 `check.jsonl` 获取上下文：

```jsonl
{"file": ".trellis/spec/backend/quality.md", "reason": "代码质量要求"}
{"file": ".trellis/spec/frontend/quality.md", "reason": "前端质量要求"}
```

同时注入 `prd.md` 用于理解意图。

## 自修复循环

- Sub-agent 内置自修复循环，不需要外部重试
- 不再有外部 Ralph Loop 概念
- 在有限次数内尝试修复，超出后报告剩余问题

## 与项目的集成

当前项目（domains-manage）的质量检查应该包括：
- `npm run lint` — ESLint 检查
- `npm run build` — TypeScript 类型检查 + Next.js 构建
- 对照 `CLAUDE.md` 中的质量门槛

## 外部参考

- [日常使用 - trellis-check](https://docs.trytrellis.app/zh/start/everyday-use)
