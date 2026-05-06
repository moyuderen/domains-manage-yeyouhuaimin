# 通知时间展示按每日推送时间设置的时区展示

## Goal

修正 Telegram 通知相关展示中的时间与日期文案，让用户看到的通知时间与通知设置中的“每日推送时间”所对应的时区一致，避免当前直接显示 UTC 字符串或服务器本地时间带来的理解偏差。

## Requirements

* Telegram 通知正文中的“时间”字段必须按通知设置中的 `notifyTimezone` 转换后再展示。
* 域名到期日报中的标题日期必须按 `notifyTimezone` 展示。
* “发送测试”生成的测试消息中的日期展示也必须按 `notifyTimezone` 统一。
* 同一条通知消息内不再混用 UTC 原始值与配置时区下的本地日期时间。
* 不改动通知触发逻辑本身，重点修正“展示给用户看的时间”。

## Acceptance Criteria

* [ ] 普通 Telegram 通知正文中的时间字段不再直接显示 UTC 字符串。
* [ ] 当通知时区配置为非 UTC 时，普通通知、日报通知、测试消息中的日期/时间展示都与该时区一致。
* [ ] 同一条通知消息内不再出现 UTC 与配置时区混用的情况。
* [ ] 现有通知配置保存、定时任务触发、真实通知发送、测试消息发送流程保持可用。

## Definition of Done

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Technical Approach

* 复用现有的 `notifyTimezone` 配置来源：`lib/data/settings.ts`。
* 在服务端补一个通知专用的日期时间格式化能力，统一负责“把 UTC/ISO 时间按指定时区转换成展示文案”。
* 将普通通知正文 `lib/notifications/message.ts`、日报消息 `lib/telegram.ts`、测试消息发送链路 `app/actions/telegram.ts` 一并接入该能力，确保通知相关展示全部统一。
* 不改动后台日志页等非通知展示链路。

## Decision (ADR-lite)

**Context**: 当前通知设置已经支持 `notifyTimezone`，定时触发也已经按该时区判断，但通知消息展示层没有消费这个配置，导致用户看到 UTC 或与配置不一致的日期时间。

**Decision**: 本次以 `notifyTimezone` 作为通知展示的唯一时区来源，统一覆盖普通通知、日报通知和测试消息三类 Telegram 通知展示。

**Consequences**: 通知消息语义会与用户配置一致，验证路径更直观；但需要梳理所有通知消息生成入口，避免只修一处导致展示不一致。

## Out of Scope

* 不调整通知渠道种类与通知发送触发机制。
* 不改动后台日志页的全局时间展示策略。
* 不新增用户自定义时间格式、12/24 小时制切换等扩展能力。

## Technical Notes

* 通知设置 UI：`components/settings/notification-settings.tsx`
* 配置读取与保存：`lib/data/settings.ts`
* 定时任务按时区判断：`app/api/cron/domain-expiry-check/route.ts`
* 普通通知正文时间格式化：`lib/notifications/message.ts`
* 域名到期日报与测试消息日期：`lib/telegram.ts`
* 测试消息发送入口：`app/actions/telegram.ts`
* 普通通知投递入口：`lib/events/sinks/notification.ts`
* 项目规则要求时间相关逻辑优先使用 `date-fns`；实现时应保持这一约束，并避免在多个通知入口重复拼接时间格式化逻辑。
