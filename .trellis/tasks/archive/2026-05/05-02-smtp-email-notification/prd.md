# brainstorm: smtp email notification

## Goal

在现有通知系统中新增基于通用 SMTP 的 Email 通道能力，复用当前通知模板、投递记录与设置页体系，形成一版可直接落地的 MVP 方案，并明确后续实现边界与验证路径。

## What I already know

* 用户希望通过「agent main team」方式，由 leader、资深全栈开发、资深产品经理多轮讨论后给出最终方案。
* 用户已提供一版初稿，核心方向是：把 email 作为现有通知系统的第三个通道，而不是新造一套邮件模块。
* 项目通知系统首版范围优先外发送达，不做站内 inbox / 已读未读。
* 数据库约束已支持 `email` 通道：`supabase/schema.sql` 中 `notification_endpoints` 与 `notification_deliveries` 的 channel check 已包含 `email`。
* 类型层已支持 `email`：`types/notification.ts` 中 `NOTIFICATION_CHANNEL_KEYS = ['telegram', 'email', 'webhook']`。
* 发送聚合层已部分纳入 `email`：`lib/events/sinks/notification.ts` 的 `resolveAllEnabledTargets()` 已写死 `['telegram', 'email', 'webhook']`，但 `CHANNEL_SENDERS` 仍只有 telegram/webhook。
* 规则目录尚未接入 `email`：`lib/notifications/catalog.ts` 现有规则的 `channelKeys` 仍是 `['telegram', 'webhook']`。
* 设置数据层当前仅聚合 Telegram/Webhook：`lib/notifications/settings.ts` 与 `lib/data/settings.ts` 都还没有 Email provider settings/view。
* 设置页当前只有 Telegram 和 Webhook 卡片：`components/settings/notification-settings.tsx`。
* 当前 Server Actions 只有 Telegram 与 Webhook：`app/actions/telegram.ts`、`app/actions/webhook.ts`。
* 到期提醒 cron 当前通过 `telegramProvider.enabled` 和 `webhookProvider.enabled` 判断是否跳过，尚未按“任一启用通道”泛化：`app/api/cron/domain-expiry-check/route.ts`。
* 现有通知模板与内容结构已经统一：`lib/notifications/templates.ts` + `types/notification.ts` 的 `NotificationContent`。
* `package.json` 目前还没有 `nodemailer` 依赖，需要作为实现前置补齐。

## Assumptions (temporary)

* 首版 Email 通道仍遵循“每个 channel 一个 endpoint”的当前建模，不引入多 endpoint。
* 首版使用服务端 SMTP 发信，优先选择通用生态成熟方案而非 provider 专用 SDK。
* 首版测试方式延续 Telegram/Webhook 现有模式：在设置页提供“保存”与“发送测试”。
* 首版邮件内容以复用 `NotificationContent` 为主，不单独设计复杂营销式模板。

## Open Questions

* 无阻塞问题；已收敛到可实施范围。

## Requirements

* Email 通道以现有通知系统的第三个 channel 形式接入，而非独立通知子系统。
* 复用现有 `notification_endpoints`、`notification_deliveries`、通知模板与分发主链路。
* 设置页支持 SMTP 配置保存、通道启停、测试发送。
* 正式通知至少覆盖：域名到期提醒、现有事件提醒。
* 配置与发送逻辑必须保持在服务端，不能在客户端暴露敏感 SMTP 凭证。
* 邮件内容复用 `NotificationContent`，由 Email renderer 生成 `subject` / `text` / `html`。
* 收件人建模采用 `toEmails: string[]`，UI 支持换行或逗号输入多个邮箱。
* 首版采用单 SMTP 发件账号、单 Email endpoint 的 MVP 方案。
* cron 对启用通道的判断必须改成“是否存在任一启用通知 endpoint”，不能再写死 telegram/webhook。
* 失败场景统一写入 `notification_deliveries.error_message`，不旁路存储。

## Acceptance Criteria

* [ ] 可以在设置页保存一份有效的 SMTP 配置，并支持启用/停用 Email 通道。
* [ ] SMTP 密码/授权码不会在设置页回显；留空表示沿用旧值。
* [ ] 可以从设置页触发一封测试邮件，成功时更新验证时间 `lastVerifiedAt`。
* [ ] 现有事件通知链路可向 Email 通道创建并发送 delivery。
* [ ] 域名到期 cron 在仅启用 Email 的情况下不会被错误跳过。
* [ ] 失败场景会写入现有 `notification_deliveries.error_message`，而不是旁路存储。
* [ ] 不新增通知表，不重做模板系统，不引入站内消息中心。

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Technical Approach

* 新增 `nodemailer` 作为服务端 SMTP 发送依赖。
* 新增 `schemas/emailSchemas.ts`，校验 SMTP Host / Port / Secure / Username / Password / From Email / From Name / Reply-To / `toEmails` / enabled。
* 新增 `lib/notifications/email.ts` 或 `lib/notifications/email/*`：
  * 读取 endpoint config
  * 将统一 `NotificationContent` 渲染为 `subject` / `text` / `html`
  * 调用 nodemailer 投递
  * 归一化错误信息
* 在 `lib/events/sinks/notification.ts` 注册 `email` sender。
* 在 `lib/notifications/catalog.ts` 为现有事件规则补上 `email` channel。
* 在 `lib/notifications/settings.ts` 与 `lib/data/settings.ts` 新增 Email provider settings/view、默认值、读写方法，并把设置页聚合数据扩展为 Email + Telegram + Webhook。
* 新增 `app/actions/email.ts`：
  * `saveEmailProviderAction`
  * `sendEmailTestAction`
* 在 `components/settings/notification-settings.tsx` 新增 Email 卡片，交互模式与 Telegram/Webhook 保持一致。
* 在 `app/api/cron/domain-expiry-check/route.ts` 将启用通道判断改为统一 helper，例如 `hasEnabledNotificationEndpoint()`。

## Decision (ADR-lite)

**Context**：仓库当前已在 schema/type/部分聚合层引入 `email`，但尚未形成可用链路；用户希望最小改动复用现有通知体系。

**Decision**：采用“复用内容层，独立传输层”的设计：Email 作为第三个 channel 接入当前通知系统；复用模板、delivery 表、settings 页面模式与 sink 分发主链路；新增 SMTP sender、settings、actions 和 schema 补齐半接入状态。

**Consequences**：
* 优点：与现有 Telegram/Webhook 一致，改动集中，可快速落地。
* 代价：首版仍沿用 `notification_endpoints.config` 保存 SMTP 凭据，这是过渡方案，不是长期最优安全方案。
* 风险控制：仅服务端读写；UI 不回显密码；空密码表示沿用旧值；日志/错误信息禁止泄露凭据；后续可迁移到专用 secrets/encryption 方案。

## Final MVP Boundary

* 支持 1 套 SMTP 凭据。
* 支持 1 个默认发件邮箱（含发件人名称，可选 Reply-To）。
* 支持 1 个 Email endpoint，收件人为 `toEmails: string[]`。
* 支持保存配置、发送测试、正式事件通知、域名到期提醒。
* 不做 OAuth、多 provider 抽象、多 endpoint、抄送/密送/附件、回执追踪、站内 inbox、复杂模板编辑。

## Suggested Phases

* **Phase 1：基础接入**
  * 安装 `nodemailer`
  * 新增 Email schema
  * 新增 Email sender / renderer
  * 扩展 settings 类型与数据读写
* **Phase 2：产品链路打通**
  * 新增 `app/actions/email.ts`
  * 设置页新增 Email 卡片
  * 发送测试与 `lastVerifiedAt` 更新
* **Phase 3：通知主链路补齐**
  * sender registry 注册 email
  * catalog 规则补 email
  * cron 通道启用判断改为泛化 helper
* **Phase 4：验证**
  * 保存 SMTP 配置
  * 测试发送
  * 人工触发一条事件通知
  * 人工执行一次域名到期 cron
  * `npm run lint`
  * `npm run build`

## Out of Scope (explicit)

* OAuth 登录邮箱提供商
* 多 SMTP provider 抽象层
* 多个 Email endpoint / 路由级收件箱编排
* 抄送 / 密送 / 附件
* 站内 inbox / 已读未读
* 复杂品牌化邮件模板
* 退信回流 / 回执追踪 / 发送统计看板

## Technical Notes

* 现有发送主入口：`lib/events/sinks/notification.ts`
* 现有通知规则目录：`lib/notifications/catalog.ts`
* 现有通知模板：`lib/notifications/templates.ts`
* 现有通知类型：`types/notification.ts`
* 现有通知设置数据层：`lib/data/settings.ts`
* 现有通知投递数据层：`lib/data/notifications.ts`
* 现有设置页组件：`components/settings/notification-settings.tsx`
* 现有 cron：`app/api/cron/domain-expiry-check/route.ts`
* 现有 actions：`app/actions/telegram.ts`、`app/actions/webhook.ts`
* 当前 repo 状态显示：`email` 已在 schema/type/部分聚合中出现，属于“半接入”状态，方案需要优先解决一致性与补齐问题。
* 用户初稿建议复用现有 `NotificationContent` 结构生成 `subject/text/html`，这一点与当前代码架构高度一致。
* 错误归一化建议覆盖：配置缺失/非法、认证失败、连接失败、TLS/证书错误、超时、收件人地址非法、SMTP 4xx/5xx、限流/拒发、消息体构建失败、未知异常。
* UI 关键文案建议：
  * 建议优先使用邮箱服务商授权码，不要直接填写登录密码。
  * 可填写多个收件人，使用逗号或换行分隔。
  * 测试发送仅验证当前 SMTP 配置与收件可达，不代表后续一定进入收件箱。
