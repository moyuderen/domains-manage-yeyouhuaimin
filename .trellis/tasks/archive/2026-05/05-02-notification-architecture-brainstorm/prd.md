# 通知架构拆层方案

## Goal

将现有通知链路从 Telegram 单通道直连实现，收敛为“规则决策 → 目标解析 → 标准化内容构建 → 渠道渲染 → Provider 发送”的可扩展结构，在不重做现有事件系统和设置页的前提下，为后续接入 Email / Webhook 预留稳定边界。

## Requirements

* 通知主流程必须拆出明确分层，至少区分：规则决策、偏好判断、目标解析、内容构建、渠道渲染、Provider 投递。
* `notification_deliveries.payload` 必须优先存标准化通知内容模型，而不是只存 Telegram 最终字符串。
* 模板层必须先构建渠道无关的通知语义数据，再由 Telegram renderer 渲染；未来 Email / Webhook 复用同一份内容模型。
* 运行时抽象不能把“每个 channel 只有一个 endpoint”写死在核心流程里；本轮虽保留单 endpoint 数据约束，但接口需预留未来多 endpoint 扩展。
* 读取 endpoint 配置、provider token、service-role 数据的 helper 必须是服务端专用模块，并显式标记 `server-only`。
* 需要兼容历史 delivery 中仅有 `payload.message` 的记录，避免旧通知无法重发。
* 本轮实现尽量兼容当前数据库表与设置页，避免引入不必要的破坏性迁移。
* 质量检查必须避免扫描 Claude worktree 与嵌套 `.next` 构建产物，防止 lint 被临时文件污染。

## Acceptance Criteria

* [x] 通知主流程已从单一 Telegram 串联逻辑拆成可扩展的分层结构。
* [x] `types/notification.ts` 已定义标准化 `NotificationContent` / `NotificationPayload` 类型。
* [x] `lib/notifications/message.ts` 已改为“内容构建 + Telegram 渲染”，并保留现有变更明细表达能力。
* [x] `lib/events/sinks/notification.ts` 已按 `channelKeys` + 目标解析 + payload 构建 + provider 发送重组流程。
* [x] `lib/data/notifications.ts` 已提供按 channel 列表查询 endpoint 的接口，并保留单 endpoint 兼容入口。
* [x] `lib/notifications/telegram.ts` 在新内容模型存在时优先渲染标准化内容，并兼容旧 `payload.message`。
* [x] 读取 endpoint / provider 配置的相关 helper 已显式标记 `server-only`。
* [x] `.trellis/spec/**` 已补齐通知 payload 模型、服务端边界与 lint 范围保护规范。
* [x] `npm run lint` 与 `npm run build` 已通过，且 ESLint 已忽略 `.claude/worktrees/**` 与嵌套 `.next`。

## Definition of Done

* 代码通过 `npm run lint`
* 代码通过 `npm run build`
* 通知内容模型、服务端边界、lint 范围保护已同步到 `.trellis/spec/`
* 当前实现能保持 Telegram 行为可用，并为后续 Email / Webhook 扩展保留边界

## Technical Approach

本轮采用“内容模型驱动”的拆层方案：

1. **规则层**：`lib/notifications/catalog.ts` 从单一 `channelKey` 改为 `channelKeys`，为未来多渠道路由预留抽象。
2. **内容层**：`lib/notifications/message.ts` 负责将事件构造成标准 `NotificationContent`，并提供 Telegram renderer。
3. **投递层**：`lib/events/sinks/notification.ts` 负责规则命中、偏好判断、目标解析、payload 构建、delivery 创建与 provider 调度。
4. **数据层**：`lib/data/notifications.ts` 负责 endpoint / preference / delivery 读写，新增按 channel 查询 endpoint 列表接口。
5. **Provider 层**：`lib/notifications/telegram.ts` 只负责读取 endpoint 配置并调用 Telegram sender，不再承担内容拼装职责。
6. **边界保护**：`lib/data/notifications.ts`、`lib/data/settings.ts`、`lib/notifications/telegram.ts` 显式 `import 'server-only'`。
7. **质量门槛**：`eslint.config.mjs` 忽略 `.claude/worktrees/**` 与嵌套 `.next`，避免临时产物进入 lint。

## Decision (ADR-lite)

**Context**：当前通知实现把规则、目标、消息拼接和 Telegram 发送都耦合在一起，新增 Email / Webhook 会不断侵入主流程；但立即重做完整通知中心又明显过度设计。

**Decision**：采用小步重构的“标准化内容模型 + 多层拆分”方案，先保留当前数据表和单 endpoint 约束，只把运行时边界拆清，并让 payload 以结构化内容为主。

**Consequences**：

* 好处：后续新增 Email / Webhook 时，主要扩展 renderer 与 sender，不必重写主 dispatch 流程。
* 代价：本轮仍未解决多 endpoint、复杂路由策略和设置页心智重构，这些保留到后续真实需求驱动时再做。
* 约束：需要兼容历史 `payload.message`，因此发送侧暂时保留旧记录 fallback。

## Out of Scope

* 本轮不直接实现完整 Email / Webhook provider。
* 本轮不修改 `notification_endpoints.channel_key` 唯一约束。
* 本轮不重做通知设置页为多 provider 管理中心。
* 本轮不引入通知编排中心、独立重试队列或死信队列。
* 本轮不改造现有 activity log / 事件系统的数据来源。

## Technical Notes

* 规则映射：`lib/notifications/catalog.ts`
* 内容构建与 Telegram 渲染：`lib/notifications/message.ts`
* Provider 发送：`lib/notifications/telegram.ts`、`lib/telegram.ts`
* 通知 sink：`lib/events/sinks/notification.ts`
* 数据层：`lib/data/notifications.ts`
* 设置聚合：`lib/data/settings.ts`
* 类型定义：`types/notification.ts`
* 设置 UI：`components/settings/notification-settings.tsx`
* 表结构：`supabase/migrations/20260430143000_create_notification_tables.sql`
* 关键约束：`notification_endpoints.channel_key` 当前唯一，本轮只在运行时接口层预留多 endpoint 扩展。
* 兼容策略：新 delivery 优先写 `version + content + context`，历史 delivery 仍允许只依赖 `payload.message`。
* 相关规范：`.trellis/spec/backend/database.md`、`.trellis/spec/backend/quality.md`、`.trellis/spec/shared/code-quality.md`、`.trellis/spec/shared/index.md`
