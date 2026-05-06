# 通知与日志变更详情方案

## Goal

解决当前“信息变更通知”和“操作日志”只包含基础摘要的问题，让用户在收到通知时能快速看懂改了什么，在查看日志时能追溯字段级前后差异，同时控制通知噪音并避免敏感信息泄露。

## What I already know

* 当前事件分发统一走 `lib/events/index.ts`，先写活动日志，再写通知。
* 活动日志 sink 在 `lib/events/sinks/activity-log.ts`，会把 `event.detail` 落到 `activity_logs.detail`。
* Telegram 通知文案由 `lib/notifications/message.ts` 生成，目前仅展示标题、summary、resourceName、时间、reason。
* `domain/site/account/settings` 的 create/update/delete action 都会调用 `tryEmitEvent()`。
* `updateDomainAction()` 已经会先查询旧数据；`updateAccountAction()`、`updateSiteAction()` 目前还没有读取旧值用于做 diff。
* `updateProjectTitlesAction()` 会写 detail，但只有修改后的 title/subtitle/icon，没有 before/after。
* 日志页 `components/logs/LogsPageClient.tsx` 当前只展示摘要、资源名、设备、IP，不展示 `detail`。

## Assumptions (temporary)

* 用户已确认：通知展示关键字段前后差异，日志展示完整字段级前后差异。
* 用户已确认：本次 MVP 只覆盖 update 场景（`domain.update`、`site.update`、`account.update`、`settings.update`）。
* create/delete 可以后续按相同结构渐进补齐。
* 不应直接把所有数据库字段原样放入通知与日志，需要字段白名单、中文标签和格式化/脱敏策略。
* 用户已确认：账号敏感字段（至少 `passwordHint`、`vaultLocation`）首版在通知与日志中都不展示。

## Open Questions

* 暂无，需求与方案已收敛。

## Requirements (evolving)

* 变更类事件需要支持结构化 detail，至少可表达字段名、展示标签、修改前、修改后。
* update action 层需要能够同时拿到 before/after，并在发事件前生成 diff。
* 通知文案层需要消费结构化 detail，展示有限条数的关键变更。
* 日志展示层需要支持查看结构化变更详情，同时兼容历史无 diff 的日志。
* 敏感字段必须经过白名单和脱敏规则控制；首版账号敏感字段不进入通知，也不进入日志差异详情。

## Acceptance Criteria (evolving)

* [ ] 用户收到一条修改通知时，能看到对象、时间和关键字段变化。
* [ ] 用户查看日志时，能看到谁在什么时候修改了哪些字段，以及前后值。
* [ ] 多字段修改时，通知不会无限展开，而是显示限制条数并提示还有更多变更。
* [ ] 历史日志在没有结构化 detail 的情况下仍可正常展示。
* [ ] 敏感或超长字段不会被直接明文透出。

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* 单独新增审计 diff 表或重做整套事件基础设施
* 首版实现复杂富文本 diff、高亮逐字比较、字段级订阅配置
* 改造 auth/expiry 等非资源更新类事件的展示模型

## Technical Approach

推荐方案：在 action 层生成统一的结构化 diff，并通过 `event.detail` 透传给日志与通知。

1. 在 `app/actions/domains.ts`、`accounts.ts`、`sites.ts`、`settings.ts` 的 update 流程中先查询旧值。
2. 基于实体白名单字段生成统一的 `detail.changes` 结构，每项包含：`field`、`label`、`before`、`after`、`displayBefore`、`displayAfter`。
3. `activity_logs.detail` 继续直接存储该结构，无需新增表。
4. `lib/notifications/message.ts` 消费 `detail.changes`，在通知中展示前 N 项关键差异，超出时提示剩余项数。
5. `components/logs/LogsPageClient.tsx` 为有 `detail.changes` 的日志增加“查看变更”入口，并通过详情弹层展示完整差异。
6. 对超长字段、空值、时间、关联 ID 做统一格式化；账号敏感字段（如 `passwordHint`、`vaultLocation`）首版直接排除，不进入 diff。

## Decision (ADR-lite)

**Context**: 现有日志表和通知投递表都已有 jsonb 承载能力，但没有统一字段级差异结构，导致通知和日志都只能展示基础摘要。

**Decision**: 不新增表，复用 `event.detail` / `activity_logs.detail`，在 action 层计算 before/after diff，并让通知与日志 UI 消费统一 schema。

**Consequences**: 改动路径短、兼容现有事件链路，便于逐实体扩展；代价是需要维护字段白名单、中文标签、格式化和脱敏策略。

## Technical Notes

* 通知文案文件：`lib/notifications/message.ts`
* 事件入口：`lib/events/index.ts`
* 日志落库 sink：`lib/events/sinks/activity-log.ts`
* 日志页面：`components/logs/LogsPageClient.tsx`
* 更新 actions：`app/actions/domains.ts`、`app/actions/accounts.ts`、`app/actions/sites.ts`、`app/actions/settings.ts`
* `updateDomainAction()` 已有 `getDomainById(id)`，是最直接的 diff 注入样板。
* `activity_logs.detail` 已存在，无需为 MVP 新增存储表。
* 推荐首版通知只展示 2~5 个关键变更；日志展示完整变化字段列表。
* 推荐字段展示统一中文标签，空值统一显示“空”，时间统一格式化。
* 日志详情采用“查看变更”入口 + 详情弹层展示完整 diff。
* 账号敏感字段 `passwordHint`、`vaultLocation` 首版不进通知，也不进日志。