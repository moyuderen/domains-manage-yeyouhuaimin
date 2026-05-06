# 在通知信息中加上 IP 和终端信息

## Goal

在现有通知链路中补充“操作来源”上下文，让登录、登录失败以及其他人工触发的关键通知能展示 IP 和终端信息，提升安全感知与追踪效率，同时避免对系统定时通知引入噪音。

## What I already know

* 当前事件链路是 `tryEmitEvent/emitEvent -> persistNotificationEvent -> eventNotificationTemplate -> 渠道发送`。
* `lib/events/helpers.ts` 已经从请求头中采集了 `ip`、`userAgent`、`os`、`browser`。
* `app/actions/auth.ts` 的登录、登录失败、退出登录事件已经把这些信息放进 `detail` 和 `requestContext`。
* `lib/notifications/templates.ts` 当前还没有把上述字段渲染进通知内容。
* Email 和 Telegram 渲染层都基于 `NotificationContent.blocks` 通用渲染，模板层补充 block 即可覆盖大多数渠道。

## Assumptions (temporary)

* “终端信息”在 MVP 中可定义为 `操作系统 + 浏览器`，而不是精确设备型号。
* 对于 cron/system 触发的通知，不需要展示 IP 和终端信息。
* 用户更关心安全相关通知（如登录成功、登录失败）中的来源信息，而不是所有通知都展示完整上下文。

## Open Questions

* 暂无。

## Requirements (evolving)

* 所有人工触发的操作通知都展示操作来源上下文。
* 来源信息采用标准版展示：`IP + 操作系统 + 浏览器`。
* cron/system 触发的通知不展示 IP 和终端信息。
* 在通知正文展示的同时，把 `ip / os / browser` 结构化写入 `payload.context`。
* 尽量复用现有事件采集结果，避免新增重复采集逻辑。
* 保持现有通知模板结构兼容 Email、Telegram、Webhook。

## Acceptance Criteria (evolving)

* [ ] 所有人工触发的操作通知都能展示 IP、操作系统与浏览器信息。
* [ ] 所有人工触发的操作通知都在 `payload.context` 中包含 `ip / os / browser`。
* [ ] 不影响域名到期日报等系统通知的现有内容。
* [ ] Email、Telegram、Webhook 的结果保持可读或可消费。
* [ ] lint 与 build 通过。

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Technical Approach

* 在 `lib/notifications/templates.ts` 的 `eventNotificationTemplate` 中增加“操作来源”相关 block，显示 `IP`、`操作系统`、`浏览器`。
* 仅对人工触发事件渲染来源信息；系统/定时类通知继续沿用现有模板，不新增来源区块。
* 在 `lib/events/sinks/notification.ts` 构建 payload 时，把 `ip / os / browser` 放入 `payload.context`，供 webhook 或后续扩展使用。
* 如有必要，在 `types/notification.ts` 中补充 `NotificationPayloadContext` 类型，使来源字段显式可用。
* 尽量不改动事件采集层与数据库结构，直接复用 `ResolvedEventInput` 已有信息。

## Decision (ADR-lite)

**Context**: 当前仓库已经采集了来源信息，但通知内容未展示，也未结构化暴露给下游渠道，导致安全追踪能力不足。
**Decision**: 对所有人工触发通知增加标准版来源信息展示（IP + 操作系统 + 浏览器），并同步写入 `payload.context`；系统/定时通知不展示来源信息。
**Consequences**: 方案兼顾当前可读性与后续 webhook 扩展，改动集中在模板层与 payload 组装层，实施成本较低。

## Out of Scope (explicit)

* 精确识别设备品牌/型号
* IP 地理位置解析
* 新增独立通知类型或通知偏好开关
* 在通知中展示原始 User-Agent

## Technical Notes

* 采集逻辑：`lib/events/helpers.ts`
* 认证事件触发：`app/actions/auth.ts`
* 通知模板：`lib/notifications/templates.ts`
* 通知 sink：`lib/events/sinks/notification.ts`
* 通知类型：`types/notification.ts`

## Research Notes

### Constraints from our repo/project

* 现有链路已具备 IP/UA/OS/Browser 数据，无需新增中间件或数据库字段。
* 模板层通过 `blocks` 统一渲染，多渠道适配成本低。
* 当前 `NotificationPayload.context` 结构较轻，若要给 webhook 提供结构化来源信息，可小幅扩展。

### Feasible approaches here

**Approach A: 仅改模板显示**

* How it works: 从 `event.detail` 读取 `ip / os / browser / userAgent`，在 `eventNotificationTemplate` 里渲染“操作来源” block。
* Pros: 改动最小；最快落地；Email/Telegram 自动生效。
* Cons: Webhook 只能拿到渲染后的内容，不利于后续结构化消费。

**Approach B: 模板显示 + payload context 结构化透出**

* How it works: 除了渲染 block，还把来源信息放进 `payload.context`，供 webhook 或未来筛选使用。
* Pros: 兼顾当前展示与未来扩展；结构更清晰。
* Cons: 比 A 多一点类型与组装改动。

**Approach C: 按事件类型分层显示**

* How it works: 认证类通知显示完整版来源信息；普通人工变更通知只显示简版；系统/定时通知不显示。
* Pros: 信息密度更合理；安全类通知最完整；减少噪音。
* Cons: 需要增加模板条件分支与展示策略。