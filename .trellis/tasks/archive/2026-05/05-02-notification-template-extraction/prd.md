# 通知模版消息抽离

## Goal

将通知消息的构建逻辑从渠道渲染和发送逻辑中抽离，建立模版注册层（template registry）和渠道渲染器层（channel renderer），使通知内容与渠道格式解耦，为后续接入 Email、Webhook 渠道做准备。

## Requirements

- `NotificationContent` 类型新增 `templateKey` 字段，标识通知类型
- 新建 `lib/notifications/templates.ts`，集中管理所有模版 builder
- 新建 `lib/notifications/renderers.ts`，集中管理所有渠道渲染器
- 精简 `lib/notifications/message.ts`，仅保留 `readNotificationContent` 等共享工具函数
- 精简 `lib/notifications/telegram.ts`，仅负责发送，渲染逻辑移到 renderers.ts
- 将现有 `buildNotificationContent` 迁入 templates.ts 作为 `event_notification` 模版
- 新建 `domain_expiry_report` 模版，聚合到期域名数据（从 `buildExpiryNotification` 迁入逻辑）
- 新建 `test_notification` 独立模版，含 mock 数据常量，替代现有 `buildTestMessage`
- 调整 `app/api/cron/domain-expiry-check/route.ts`：从逐域名 emitEvent 改为聚合查询后使用 domain_expiry_report 模版发送
- `sendNotificationDelivery` 中的 if/else 渠道分发改为 map 查找
- 清理 `lib/telegram.ts` 中已无调用方的 `buildExpiryNotification` 和 `buildTestMessage`

## Acceptance Criteria

- [ ] `NotificationContent` 包含 `templateKey` 字段
- [ ] `templates.ts` 包含 `event_notification`、`domain_expiry_report`、`test_notification` 三个模版
- [ ] `renderers.ts` 包含 Telegram 渲染器，可按 templateKey 差异化渲染
- [ ] `message.ts` 不再包含模版构建或渠道渲染逻辑
- [ ] `telegram.ts` 不再包含模版构建或渲染逻辑，只负责发送
- [ ] 测试消息通过 `test_notification` 模版 + Telegram 渲染器正常发送
- [ ] 事件通知通过 `event_notification` 模版 + Telegram 渲染器正常发送
- [ ] 域名到期通知通过 `domain_expiry_report` 模版 + Telegram 渲染器正常发送
- [ ] cron 路由改为聚合发送，不再逐域名发事件
- [ ] `sendNotificationDelivery` 使用 map 查找替代 if/else
- [ ] `buildExpiryNotification` 和 `buildTestMessage` 已删除
- [ ] `npm run lint` 和 `npm run build` 通过

## Definition of Done

- Lint / typecheck / build 全部通过
- 无死代码和遗留的旧模版函数
- 现有通知功能（事件通知、测试消息、域名到期通知）行为不变

## Technical Approach

### NotificationContent 扩展

```typescript
type NotificationContent = {
  templateKey: string   // 'event_notification' | 'test_notification' | ...
  title: string
  summary: string
  blocks: NotificationContentBlock[]
  meta: Record<string, string>
}
```

### 模版注册

```typescript
// templates.ts
type NotificationTemplate<T = unknown> = {
  key: string
  buildContent: (data: T, options: TemplateOptions) => NotificationContent
}

// 注册的模版
eventNotificationTemplate      — 从现有 buildNotificationContent 迁入
domainExpiryReportTemplate     — 聚合到期域名，按状态分组展示
testNotificationTemplate       — 新建，含 mock 数据常量
```

### 渠道渲染器

```typescript
// renderers.ts
type ChannelRenderer = (content: NotificationContent) => string

// 注册的渲染器
renderTelegram  — 从现有 renderTelegramNotificationMessage 迁入
// 未来：renderEmail, renderWebhook
```

### 渠道调度

```typescript
// notification sink 中
const CHANNEL_SENDERS: Record<NotificationChannelKey, ChannelSender> = {
  telegram: sendTelegramDelivery,
  // 未来：email: sendEmailDelivery, webhook: sendWebhookDelivery
}
```

### 文件职责

| 文件 | 职责 |
|---|---|
| `templates.ts` | 模版定义和注册，所有"怎么构建内容" |
| `renderers.ts` | 渠道渲染器，所有"怎么渲染成渠道格式" |
| `message.ts` | 共享工具：readNotificationContent、payload 解析 |
| `telegram.ts` | Telegram 发送：调用 renderer → 调 API |
| `catalog.ts` | 不变：通知规则映射 |
| `settings.ts` | 不变：设置接口 |

## Decision (ADR-lite)

**Context**: 通知系统已封层（渠道无关的 NotificationContent + 渠道渲染器），但测试消息和域名到期通知仍直接生成 Telegram HTML，绕过了抽象层。未来要接入 Email 和 Webhook，需要统一的模版机制。

**Decision**: 采用模版注册层方案（方案 B），建立 templates.ts + renderers.ts，测试消息和域名到期日报各自作为独立模版。

**Consequences**:
- 新增通知类型只需注册模版 builder
- 新增渠道只需注册渲染器
- 两个维度扩展互不干扰
- Block 类型暂不扩展（text/list 够用），未来按需加

## Out of Scope

- Email、Webhook 渠道的实际实现（仅预留渲染器注册位置）
- Block 类型扩展（如 table）
- 到期日报模版完整实现（含 cron 路由调整）
- 通知设置 UI 改动

## Technical Notes

- `buildExpiryNotification` 在 `lib/telegram.ts:57` 已无调用方（死代码）
- `buildTestMessage` 在 `lib/telegram.ts:96`，被 `app/actions/telegram.ts:86` 调用
- `buildNotificationContent` 在 `lib/notifications/message.ts:8`
- `renderTelegramNotificationMessage` 在 `lib/notifications/message.ts:64`
- `sendNotificationDelivery` 的 if/else 在 `lib/events/sinks/notification.ts:181`
- 域名到期定时通知当前通过 cron → 逐域名 emitEvent → 事件管道，将改为聚合后走模版直接发送
