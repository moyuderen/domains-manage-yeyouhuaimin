# brainstorm: job runs 列表页

## Goal

基于刚刚落地的 `job_runs` 执行日志，新增一个可查看最近 job 执行记录的列表页，让用户可以在站内快速查看任务执行时间、任务名、触发来源、状态、结果消息与部分 metadata，用于排查 Vercel、服务器、Docker、GitHub Actions 等多平台触发情况。

## What I already know

* 已存在 `job_runs` 数据模型与持久化逻辑：`types/jobRun.ts`、`lib/data/job-runs.ts`、`lib/jobs/run-job.ts`。
* `job_runs` 已记录 `job_key`、`trigger_source`、`status`、`message`、`metadata`、`started_at`、`finished_at`。
* 当前已有 `/logs` 页面与 `components/logs/LogsPageClient.tsx`，可复用现有列表页、分页、筛选、移动端卡片、刷新按钮等模式。
* 当前已有成熟的表格样式模式：`components/domains/DomainTable.tsx`。
* 当前仓库已有 `app/logs/page.tsx` 页面，说明“日志查看”是现有信息架构中的合理位置。
* 当前 `lib/data/job-runs.ts` 只有写入/更新，没有列表查询能力。

## Assumptions (temporary)

* MVP 首版更适合做成独立页面，而不是塞进现有 activity logs 页面。
* 首版优先做“最近执行记录查看”，不做复杂钻取与失败告警。
* 首版更适合沿用现有 `/logs` 页面交互模式：筛选 + 列表 + 分页 + 刷新。

## Open Questions

* MVP 首版是否要直接支持“列表 + 基础筛选 + metadata 展开详情”，还是先只做只读列表页？

## Requirements (evolving)

* 新增一个 job runs 列表页。
* 至少展示：时间、job、trigger_source、status、message、部分 metadata。
* 尽量复用当前项目的页面、卡片、表格和分页模式。
* 数据读取保持在 `lib/data/*`，页面层保持精简。
* 需要清楚区分不同平台来源：`vercel-cron`、`github-actions`、`server-cron`、`docker-cron` 等。

## Acceptance Criteria (evolving)

* [ ] 能在站内查看最近的 job run 记录。
* [ ] 能展示 `job_key`、`trigger_source`、`status`、`message`、`started_at`/时间信息。
* [ ] 至少能看到部分 metadata（例如 `domainsChecked`、`eventsEmitted` 或 requestId）。
* [ ] 页面风格与现有 `/logs` 或列表页保持一致。
* [ ] `npm run lint` 与 `npm run build` 通过。

## Definition of Done (team quality bar)

* 页面可访问，数据正确展示
* 数据查询位置正确，server/client 边界清晰
* 交互与现有列表页保持一致风格
* lint / build 通过

## Out of Scope (explicit)

* 本轮不做 job run 详情子页
* 本轮不做失败告警或自动重试
* 本轮不做图表统计
* 本轮不做编辑、删除、重跑 job 能力

## Technical Notes

* 现有日志页客户端模式：`components/logs/LogsPageClient.tsx`
* 现有日志页入口：`app/logs/page.tsx`
* 现有通用表格模式：`components/domains/DomainTable.tsx`
* job run 类型：`types/jobRun.ts`
* job run 数据层：`lib/data/job-runs.ts`
* job run 记录写入：`lib/jobs/run-job.ts`

## Research Notes

### Existing patterns in repo

* `/logs` 已经提供一套成熟的日志筛选与分页 UI 模式，适合 job runs 首版复用。
* 当前 job_runs 数据结构天然适合“按时间倒序的只读列表页”。
* metadata 为 `jsonb`，首版更适合展示少量关键字段 + 详情弹窗，而不是整块 JSON 直接平铺。

### Feasible approaches here

**Approach A: 独立 job runs 页面** (Recommended)

* How it works:
  * 新增独立 route，例如 `/job-runs`
  * 使用 server page + client list 的既有模式
  * 支持基础筛选与 metadata 查看
* Pros:
  * 信息架构清晰，不污染现有 activity logs 页面
  * 更适合未来继续扩展 run history
* Cons:
  * 需要新增一套路由与页面组件

**Approach B: 合并进现有 /logs 页面**

* How it works:
  * 在 `/logs` 内加入 activity logs / job runs 切换
* Pros:
  * 日志入口集中
* Cons:
  * 首版复杂度更高，会扩大现有 logs 页的改造范围

## Decision (ADR-lite)

**Context**: 已有 activity logs 页面，但 job runs 属于“任务执行日志”，与业务事件日志职责不同。

**Decision**: 首版更推荐独立 job runs 页面，保持执行日志与业务事件日志分离。

**Consequences**: 需要新增一套路由和页面组件，但信息架构更清晰，也更利于后续扩展筛选、详情和重跑能力。
