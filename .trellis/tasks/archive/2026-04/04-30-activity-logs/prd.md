# 事件中心（操作日志 + 通知）设计

## Goal

为当前域名管理平台设计一套统一的事件中心能力，把“操作日志”和“通知”融合到同一条事件主链上，避免针对登录、账号、域名、站点、设置等行为分别做两套埋点、两套文案和两套扩展路径。首版目标不是做一个重型事件平台，而是在现有 activity logs 雏形上，沉淀出一套可渐进实施的统一抽象：业务动作只负责产出一次事件，操作日志与通知分别作为该事件的两个投影，服务于审计追溯与用户提醒；同时在通知侧进一步抽出一层轻量通知能力，用来承接渠道扩展与用户订阅偏好。

## What I already know

- 当前项目采用 Next.js App Router，页面读取优先走 Server Component，数据变更走 Server Action。
- 所有 Supabase 访问必须通过 `lib/supabase/*`，数据查询/写入应放在 `lib/data/*`。
- 当前 activity logs 已经出现事件总线雏形：
  - `app/actions/auth.ts`、`app/actions/domains.ts`、`app/actions/sites.ts`、`app/actions/accounts.ts`、`app/actions/settings.ts` 均通过 `tryEmitActivityEvent(...)` 触发事件。
  - `lib/events/index.ts` 维护 sink 列表，当前只有 `persistActivityLogEvent` 一个 sink。
  - `lib/events/sinks/activity-log.ts` 会把事件投影写入 `activity_logs`。
  - `lib/events/types.ts` 里的 `ActivityEventInput` 已经接近“统一事件输入模型”。
- 当前 `activity_logs` 表已落地，字段偏向展示/审计视图：`category`、`action`、`resource_name`、`summary`、`detail`、`ip`、`created_at`。
- 当前项目是单用户 access key 访问模型，因此通知首版不需要先解决复杂的多租户接收人模型。
- 仓库里已存在 Telegram 专用通知设置雏形：
  - `components/settings/notification-settings.tsx`
  - `app/actions/telegram.ts`
  - `lib/data/settings.ts`
- 现有 Telegram 配置项为：
  - `telegram_bot_token`
  - `telegram_chat_id`
  - `telegram_enabled`
  - `telegram_expiry_days`
  - `telegram_notify_hour`
  - `telegram_notify_timezone`
- 这说明当前通知能力是“单渠道 + 单场景（到期提醒）”导向，已经需要从事件/日志之上抽一层更通用的通知模型。

## Assumptions (temporary)

- 首版以外发通知和现有 Telegram 通知为主，不做站内 inbox / 已读未读，也不先引入邮件、Webhook、短信等外部渠道的完整实现。
- 首版更关注“哪些事件值得提醒”“通知如何与日志共享事件模型”“如何兼容现有 Telegram 设置”，而不是实时推送、复杂偏好配置、批量规则编排。
- 当前项目短期内不需要为了架构纯度单独引入 `domain_events` 主表，先在现有 `activity_logs` 基础上完成语义升级更合适。
- 通知应该从日志/事件投影之上单独抽一层，但这层必须保持轻量，不做成重型消息平台。

## Open Questions

当前已无阻塞实现准备的开放问题，以下结论视为首版锁定：

- 首版通知偏好收敛为 4 类：`domain_expiry_reminder`、`auth_activity`、`settings_change`、`resource_change`。
- `resource_change` 在偏好配置中继续细分到域名 / 站点 / 账号的新增、编辑、删除。
- 首版“只接收部分通知”的能力只做到“通知类型级订阅”，不做到“通知类型 × 渠道级”。
- 首版外发渠道只正式支持 `telegram`，并仅在模型上为 `email`、`webhook` 预留扩展位。

## Requirements (evolving)

- 业务动作只负责产出统一事件，不直接分别写日志和通知。
- 统一事件至少应表达：发生了什么、作用于什么对象、谁触发、发生时间、上下文信息、用于幂等或去重的标识。
- 操作日志应作为事件投影之一，保留完整追溯能力、筛选能力与时间线能力。
- 通知应作为事件筛选后的另一类投影，只覆盖“需要用户关注或采取行动”的高价值事件，而不是复制全部日志。
- 在通知投影之上，应单独抽出一层轻量通知能力，负责：
  - 哪些事件值得通知
  - 通知属于哪种类型
  - 通过哪个渠道发送
  - 是否命中订阅偏好
- 登录、账号、域名、站点、设置等关键行为应继续作为核心事件源。
- 首版不做站内 inbox / 已读未读，通知能力聚焦外发渠道送达、订阅偏好与兼容迁移。
- `activity_logs`、资源详情页时间线与外发通知仍基于同一事实源，但首版不引入站内收件箱这一额外消费层。
- `activity_logs` 继续回答“系统最近发生了什么”；资源详情页继续回答“这个对象发生过什么”；外发通知负责“把高价值事件送达用户”。
- 通知系统要支持未来增加邮件、Webhook、用户订阅偏好等能力时不推翻当前模型。
- 现有 Telegram 到期提醒配置必须可兼容迁移，不能直接破坏当前用户心智与已有配置。

## Acceptance Criteria (evolving)

- [ ] 能清晰区分事件事实、日志投影、通知投影、通知渠道四层职责。
- [ ] 能给出一套与当前 `lib/events/*` 兼容的演进方案，而不是推倒重来。
- [ ] 能明确哪些事件只记日志，哪些事件需要通知。
- [ ] 能明确通知类型、渠道配置、订阅偏好的最小边界。
- [ ] 能明确首版 MVP 边界与 out-of-scope。
- [ ] `activity_logs`、资源详情页时间线与外发通知三者职责边界清晰。
- [ ] 未来扩展到邮件 / Webhook / 用户偏好时，核心事件模型与通知层模型无需重构。
- [ ] 现有 Telegram 配置有平滑兼容路径。

## Technical Approach

- 将当前 `lib/events/*` 从“activity event”升级为更通用的“event center”抽象，但首版不引入独立 `domain_events` 表。
- Server Actions / auth 流程只在业务成功或失败节点调用统一 `emitEvent(...)`。
- 事件层负责：事件命名、上下文字段、summary builder、严重级别、事件分类。
- `activity_logs` 继续作为首版主落库表，但补充少量事件语义字段，使其既可支撑日志，又可支撑资源时间线和通知投影。
- 在通知侧，从 `activity_logs` / 统一事件事实之上再抽出一层轻量通知能力：
  - Notification Type：通知类型，如 `domain_expiry_reminder`、`auth_activity`、`settings_change`、`resource_change`
  - Notification Channel：通知渠道，首版仅正式支持 `telegram`，后续可扩 `email`、`webhook`
  - Notification Preference / Rule：决定某通知类型是否启用、附带哪些少量参数；其中 `resource_change` 继续按资源与动作细分
- 后续若出现跨渠道、重放、复杂规则编排等真实需求，再评估把当前模型上移为独立 `domain_events` 主表或更完整的通知规则体系。

## Decision (ADR-lite)

**Context**: 登录、资源 CRUD、风险检查、任务结果等行为既需要满足可追溯审计，也可能触发用户提醒；同时通知能力未来还会扩展到邮件、Webhook 及更细粒度的订阅偏好。若继续把通知绑定在 activity_logs 或 Telegram 专项配置上，会导致日志、渠道、用户偏好职责混杂，扩展成本持续上升。  
**Decision**: 以统一事件主链为核心，日志与通知都是同一事件的下游投影；并在通知侧单独抽出一层轻量通知能力，负责通知类型、渠道配置与少量规则/偏好判断；首版不单独引入 `domain_events` 主表，而是以增强后的 `activity_logs` 作为主落库事实源。  
**Consequences**: 首版实现更轻、更贴合当前代码结构，也能兼容现有 Telegram 配置，同时为邮件/Webhook/用户偏好预留扩展点；代价是需要控制通知层抽象边界，避免一开始做成复杂消息平台。

## Research Notes

### 多角色多轮讨论结论

- team leader：建议采用“统一事件层 + 日志投影 + 轻量通知层 + 渠道层”的结构；通知应该单独抽层，但必须很薄。
- 产品经理：通知本质解决“谁在什么时机通过什么方式收到什么提醒”，不同于事件事实和日志留痕；建议概念上区分事件、通知类型、渠道、接收人、订阅偏好、内置规则，但首版只落少量必要能力。
- 全栈工程师：支持现在就把 Telegram 专项配置上提为最小通知层，但首版先控制在“渠道配置 + 规则/偏好”两块，不做复杂模板、重试队列、规则引擎。
- 双方最终一致接受：通知应单独抽一层，但要兼容现有 Telegram 到期提醒心智，不做大而全的平台化设计。

### What similar tools/patterns do

- 常见模式不是“通知系统直接监听页面行为”，而是先定义统一事件，再根据通知类型、渠道与偏好做投递决策。
- 审计日志强调完整事实流；通知强调需要关注的子集。两者共用事实源但不共用消费规则。
- 单渠道专项配置通常只适合作为早期 MVP，一旦渠道或通知类型变多，就需要上提为独立通知层。

### Constraints from our repo/project

- 当前项目使用 Server Action 作为所有核心写入口，适合统一 emit 事件。
- 当前已存在 `activity_logs` 表和 `/logs` 页面，说明首版可以继续把 `activity_logs` 作为统一事件事实主落库表与日志查询基础。
- 项目处于单用户场景，首版可不引入复杂 recipient / permission / inheritance 体系。
- 当前已有 Telegram 配置和测试发送链路，说明通知层抽象必须兼容现有实现，不宜全量推翻。

### Feasible approaches here

**Approach A: 增强 `activity_logs` + 抽轻量通知层 + 兼容 Telegram**（Recommended）

- How it works: action 只 emit 事件；日志 sink 写增强后的 `activity_logs`；通知层根据 notification type / preference 生成外发投递记录，再由渠道层实际发送 Telegram。
- Pros: 与现有 `lib/events` 最贴合；可兼容现有 Telegram 配置；便于未来扩展 email / webhook / 用户偏好。
- Cons: 需要先统一 Telegram 专项配置与通用通知模型之间的映射关系。

**Approach B: 继续维持 Telegram 专项配置，后续再抽象**

- How it works: 先保留当前到期提醒模型，等第二个渠道出现时再重构。
- Pros: 短期改动最少。
- Cons: 未来迁移成本更高； settings 会继续堆积渠道专属字段；用户偏好能力不好接入。

**Approach C: 一步到位做完整通知平台**

- How it works: 直接引入通知类型、渠道、用户偏好、模板、重试、规则引擎等完整设施。
- Pros: 抽象最完整。
- Cons: 对当前项目明显过重，容易偏离 MVP 目标，不推荐。

## Event Catalog Suggestion

### Must-have

首版事件目录按三类组织：

- 对象生命周期类
  - `auth.login`
  - `auth.login_failed`
  - `auth.logout`
  - `domain.create`
  - `domain.update`
  - `domain.delete`
  - `site.create`
  - `site.update`
  - `site.delete`
  - `account.create`
  - `account.update`
  - `account.delete`
  - `settings.update`
- 风险提醒类
  - `domain.expiry.warning`
  - `domain.expiry.expired`
  - `settings.critical_changed`

建议统一以稳定的 `event_key` 命名，作为事件语义唯一键。

### Nice-to-have

- 低优先级审计留痕事件
- 未来若有真实需求，再补系统巡检类与批处理类事件

首版不建议目录扩张过快，优先保证高价值事件定义稳定。

## Notification Layer Proposal

### Why a separate layer

通知要解决的是“哪些事实值得通知、通知给谁、走哪个渠道、是否命中偏好”，这已经超出单纯事件投影或 activity logs 的职责范围。尤其在已存在 Telegram 专项配置、未来又要支持邮件/Webhook/用户偏好时，继续把通知逻辑挂在日志表或单渠道 settings 上，会导致职责混杂与扩展困难。

### Recommended layers

推荐四层模型：

1. Event Layer
   - 系统事实源，描述发生了什么。
2. Activity Log Layer
   - 审计与追溯视图。
3. Notification Layer
   - 基于事件决定“是否通知 / 通知类型 / 命中哪些渠道或偏好”。
4. Delivery Channel Layer
   - 具体渠道实现：`inbox`、`telegram`，未来扩到 `email`、`webhook`。

### Product vs engineering compromise

- 产品侧希望明确区分：事件、通知类型、渠道、接收人、订阅偏好、规则。
- 工程侧担心一次性落太多表、接口和状态机。
- 折中方案：
  - 概念上区分这些角色；
  - 首版只真正落地：通知类型、渠道配置、少量规则/偏好；
  - 接收人与复杂偏好继承暂不独立建模。

## Field Contract

### activity_logs

#### Must-have

- `id`
- `event_key`
- `category`
- `action`
- `resource_type`
- `resource_id`
- `resource_name`
- `summary`
- `detail`
- `request_context`
- `occurred_at`
- `actor_user_id`

说明：
- `summary` 用于列表摘要和资源时间线。
- `detail` 用于追溯上下文、错误原因、变更说明。
- `request_context` 用于来源入口、IP、UA、browser、os 等上下文。

#### Nice-to-have

- `idempotency_key`
- `severity`
- `result`

### notification deliveries / preferences

#### `notification_deliveries` must-have

- `activity_log_id`
- `type_key`
- `channel_key`
- `endpoint_id`
- `status` (`pending | sent | failed | skipped`)
- `level` (`info | warning | critical`)
- `payload`
- `dedupe_key`
- `provider_message_id`
- `error_message`
- `sent_at`
- `created_at`
- `updated_at`

约束：`payload` 只放发送所需与排障必需信息，不复制完整审计明细。

### notification channels / preferences

#### Must-have

概念上至少需要：
- Notification Type：如 `domain_expiry_reminder`、`auth_activity`、`settings_change`、`resource_change`
- Notification Channel：首版如 `telegram`
- Notification Preference / Rule：决定某类型是否启用、附带哪些少量参数；其中 `resource_change` 继续细分到域名 / 站点 / 账号的新增、编辑、删除

#### Nice-to-have

- 用户级偏好表
- 多目标接收人
- 组织/团队级继承规则

首版在保持轻量的前提下，`notification_endpoints`、`notification_preferences`、`notification_deliveries` 作为核心能力落表；其余元数据优先用代码枚举与兼容现有 settings 过渡。

## Interaction Rules

### Must-have

- `activity_logs` 继续承担“最近发生了什么”的列表职责。
- 资源详情页时间线复用 `activity_logs`，不维护第二套事件源。
- 外发通知负责把高价值事件送达用户，不承担站内消费态管理。
- 首版设置页重点是：
  - 渠道配置
  - 通知类型开关
  - 类型相关少量参数

### Nice-to-have

- 发送测试
- 基础投递状态查看

首版不做站内通知详情、已读未读、复杂筛选、多标签分组。

## Aggregation Strategy

### Must-have

首版若做聚合，只允许“同类、同对象、短时间窗口”的防刷屏聚合：

- 聚合维度建议：`event_key + resource_type + resource_id + 时间窗口`
- 聚合目标：避免同类提醒高频刷屏，而不是做智能归并
- 聚合结果：更新同一条通知的 `last_event_at` 与展示文案

### Nice-to-have

- `aggregate_key` 明确聚合桶
- `dedupe_key` 用于完全重复事件的幂等去重

首版明确不做：
- 跨对象聚合
- 跨类型聚合
- 跨严重级别聚合
- 个性化聚合规则

## Telegram Compatibility Plan

### Principles

- 不推翻现有 Telegram 到期提醒入口和用户心智。
- 先兼容旧 settings key，再逐步迁移到通用通知模型。

### Mapping

将现有配置映射为：
- 一个 `telegram` 渠道配置
- 一条 `domain_expiry` 通知规则 / 偏好配置

现有字段语义对应：
- `telegram_bot_token` -> telegram channel credentials
- `telegram_chat_id` -> telegram default target
- `telegram_enabled` -> `domain_expiry` on telegram enabled
- `telegram_expiry_days` -> `domain_expiry` rule parameter
- `telegram_notify_hour` -> delivery schedule hour
- `telegram_notify_timezone` -> delivery schedule timezone

### Migration strategy

- 首版实现时继续支持读取旧 settings key。
- 新模型优先读新结构，若不存在则回退旧 key。
- 等验证稳定后，再决定是否迁移或清理旧 key。

## Future Extension Plan

### Email / Webhook

- 在通知层语义不变的前提下，新增 `email`、`webhook` 渠道适配器。
- 只新增渠道配置与发送实现，不改事件层和日志层模型。

### User preferences

- 第一阶段：仅支持通知类型级别开关
- 第二阶段：再扩到用户级偏好，例如“只收登录通知，不收删除通知”
- 当前阶段不做复杂继承、组织级覆盖、静默时间与频控中心

## Remaining Decisions Before Implementation

### Product decisions

当前产品侧核心决策已收敛：
- 通知偏好首版拆为 4 类：域名到期提醒、登录提醒、设置变更、变更提醒；其中“变更提醒”继续细化到域名/站点/账号的新增、编辑、删除。
- “只接收部分通知”只做到通知类型级开关。
- Telegram 作为首版唯一正式外发渠道，同时保留旧入口兼容心智。
- 设置页按“Telegram 通知 + 通知偏好”两块组织。

### Engineering decisions

- `activity_logs` 是否继续作为首版事实主落库表：当前建议是“继续承担，不单独引入 `domain_events`”。
- `notification_preferences` 首版必须落表：
  - 当前已决定正式交付“只订阅部分通知”
  - 且仅做到通知类型级，不引入 `channel_key`。
- `notification_types` / `notification_channels` 是否首版必须落表：
  - 当前更建议先以稳定代码枚举实现，等需要做后台可配置元数据时再落表。
- 定时型提醒（如域名到期）是：
  - 由 cron 扫描并 emit 统一事件
  - 还是 cron 直接进入通知发送逻辑
  - 当前建议前者，以保持事件主链统一。
- 去重策略首版是否启用：
  - 当前建议仅做“同类型 + 同对象 + 短窗口”的防刷屏去重。

### Joint decisions

- 事件字典 v1：哪些事件只进日志，哪些同时进通知。
- 通知决策矩阵：事件 → 通知类型 → 默认渠道 → 默认级别 → 去重窗口。
- Telegram 兼容迁移路径：双读策略、何时迁移、何时清理旧 key。

## Agreed v1 Recommendation (Current)

### Notification types v1

当前多角色讨论收敛后的推荐首版通知偏好为 4 类：

- `domain_expiry_reminder`
- `auth_activity`
- `settings_change`
- `resource_change`

说明：
- 这是面向用户可理解的“通知偏好层”，不是底层事件 code。
- 底层继续保留更细的 `event_key`，多个事件可以映射到同一个通知类型。
- `resource_change` 在偏好配置中继续细分到域名 / 站点 / 账号的新增、编辑、删除。

### Subscription granularity v1

当前推荐首版正式交付“部分订阅”，但仅做到：

- **通知类型级订阅**

不做到：

- 通知类型 × 渠道级订阅
- 资源级订阅
- 时间段静默 / 频控中心

折中理由：
- 产品侧希望用户可以选择“只收部分通知”；
- 工程侧认为当前单用户、少渠道场景下不宜过早做二维偏好模型；
- 因此首版先用最小可用的类型级开关满足需求。

### Inbox decision v1

当前已经明确拍板：

- **首版不做站内 inbox / 已读未读能力**
- 该项目为个人使用项目，首版只需要确保能够通过外部方式收到通知
- 站内 inbox 不属于首版范围，避免把通知系统做成消息中心

说明：
- 首版重点是统一事件层、activity logs、轻量通知层、Telegram 兼容、外发可追踪与订阅偏好
- 若未来确有需求，再评估是否补充站内消费层

### Telegram migration v1

当前推荐采用：

- **双读，不双写**

即：

- 读配置时优先读新结构
- 若新结构不存在，则回退读旧 `telegram_*` settings key
- 设置页保存时只写新结构
- 待新链路稳定后，再考虑清理旧读逻辑

理由：
- 用户无感升级
- 避免双写导致两个事实源不一致
- 当前单用户场景下双读复杂度可控

## Implementation Artifacts v1

### Event Dictionary v1

#### Log only

- `auth.login`
- `auth.logout`
- `domain.create`
- `domain.update`
- `site.create`
- `site.update`
- `account.create`
- `account.update`
- `settings.update`

#### Log + notify

- `domain.expiry.warning`
- `domain.expiry.expired`
- `domain.delete`
- `site.delete`
- `account.delete`
- `auth.login_failed`
- `settings.critical_changed`

说明：
- 首版仅高价值、需立即知晓或可能需要动作的事件进入通知层。
- 常规新增、编辑、成功类任务与恢复类事件默认只进 `activity_logs`。

### Notification Decision Matrix v1

| event_key | type_key | default_enabled | default_channel | level | notes |
| --- | --- | --- | --- | --- | --- |
| `domain.expiry.warning` | `domain_expiry_reminder` | true | `telegram` | `warning` | 对象 + 日期去重 |
| `domain.expiry.expired` | `domain_expiry_reminder` | true | `telegram` | `critical` | 对象 + 日期去重 |
| `auth.login` | `auth_activity` | false | `telegram` | `info` | 默认关闭 |
| `auth.logout` | `auth_activity` | false | `telegram` | `info` | 默认关闭 |
| `auth.login_failed` | `auth_activity` | true | `telegram` | `critical` | 默认开启 |
| `domain.create` | `resource_change` | false | `telegram` | `info` | 由资源细项控制 |
| `domain.update` | `resource_change` | false | `telegram` | `info` | 由资源细项控制 |
| `domain.delete` | `resource_change` | true | `telegram` | `warning` | 默认开启 |
| `site.create` | `resource_change` | false | `telegram` | `info` | 由资源细项控制 |
| `site.update` | `resource_change` | false | `telegram` | `info` | 由资源细项控制 |
| `site.delete` | `resource_change` | true | `telegram` | `warning` | 默认开启 |
| `account.create` | `resource_change` | false | `telegram` | `info` | 由资源细项控制 |
| `account.update` | `resource_change` | false | `telegram` | `info` | 由资源细项控制 |
| `account.delete` | `resource_change` | true | `telegram` | `warning` | 默认开启 |
| `settings.update` | `settings_change` | false | `telegram` | `info` | 默认关闭 |
| `settings.critical_changed` | `settings_change` | true | `telegram` | `critical` | 默认开启 |

说明：
- 当前推荐首版通知偏好拆为 4 类：`domain_expiry_reminder`、`auth_activity`、`settings_change`、`resource_change`。
- `resource_change` 在偏好配置中继续细分到域名 / 站点 / 账号的新增、编辑、删除。
- 首版订阅粒度仍不做到 `type × channel`。

### Settings Page Plan v1

设置页建议按两块组织：

1. `Telegram 通知`
   - Bot Token
   - Chat ID
   - 启用 Telegram 渠道
   - 测试发送
   - 渠道连接状态 / 错误提示

2. `通知偏好`
   - `domain_expiry_reminder`
   - `auth_activity`
   - `settings_change`
   - `resource_change`
   - 其中 `resource_change` 继续细分为域名 / 站点 / 账号的新增、编辑、删除
   - 类型相关参数只在必要时展示，例如到期提前天数、发送时间、时区

不做：
- 站内 inbox
- 已读 / 未读
- 按渠道单独订阅
- 资源级订阅
- 静默时间 / 频控中心

## Product Prototype Design v1

### Information architecture

首版不新增站内通知中心页面，原型只涉及 3 个已有或自然延展的触点：

1. `/settings`
   - 作为通知配置主入口
   - 承载 Telegram 渠道配置与通知偏好
2. `/logs`
   - 继续作为“最近发生了什么”的统一操作日志页
   - 承担通知失败后的排查落点之一
3. 资源详情页（如 `/domains/[id]`、`/accounts/[id]`、`/sites/[id]`）
   - 继续承载单对象时间线
   - 作为 Telegram 消息中的优先跳转目标

### Settings page wireframe

#### Block A：Telegram 通知

目标：回答“发到哪里、能不能发、现在是不是通的”。

建议字段与交互：
- 总开关：`启用 Telegram 通知`
- Bot Token
- Chat ID
- `获取 Chat ID`
- `发送测试消息`
- 连接状态：
  - `未配置`
  - `已配置，待验证`
  - `最近测试成功`
  - `发送失败，请检查 Token / Chat ID`

建议文案：
- 标题：`Telegram 通知`
- 说明：`用于接收域名到期、登录活动、资源变更和设置变更等提醒。`

#### Block B：通知偏好

目标：回答“收什么，不收什么”。

以 4 类通知偏好卡片或列表项展示：
- `域名到期提醒`
- `登录提醒`
- `设置变更`
- `变更提醒`

每项统一结构：
- 名称
- 一句话说明
- 开关
- 仅在需要时展示附加参数

其中：
- `域名到期提醒` 展开附加参数：提前天数、每日发送时间、时区
- `变更提醒` 继续细分为域名 / 站点 / 账号的新增、编辑、删除 9 个开关

建议不要在首版出现：
- 渠道级开关
- 已读/未读
- 资源级订阅
- 静默时间

#### Block C：发送与排障状态（轻量）

首版不做独立通知中心，但建议在设置页底部增加一个轻量状态区块：
- `最近一次测试发送时间`
- `最近一次发送结果`
- `最近一次失败原因`
- `查看操作日志` 跳转

这样用户不需要 inbox，也能知道“有没有发出去”。

### Telegram message prototype

#### 变更提醒

建议消息结构：
- 第一行：级别 + 标题
- 第二行：对象名称
- 第三行：关键动作摘要
- 第四行：时间
- 第五行：入口链接

示例：

```text
[变更提醒] 域名已删除
对象：example.com
操作：删除域名
时间：2026-04-30 21:15
查看详情：/domains
```

#### 域名到期提醒

示例：

```text
[域名到期提醒] example.com 将于 7 天后到期
注册商：Namecheap
到期日：2026-05-07
查看详情：/domains/<id>
```

原则：
- 消息正文保持短、可扫读、可直接行动
- 一个通知只表达一个动作，不做长日志拼接
- 优先跳资源详情页；若没有单对象页或为批量任务，再跳 `/logs` 带筛选

### Navigation and jump rules

- 单对象事件：Telegram 优先跳对象详情页
- 聚合/任务失败事件：优先跳 `/logs` 并带筛选条件
- 设置相关通知：优先跳 `/settings`，必要时补充 `/logs` 排查入口
- `/logs` 中保留事件摘要和时间线能力，不展示“已读状态”

### Empty / error states

#### 首次未配置
- Telegram 区块显示空态提示：`请先配置 Bot Token 和 Chat ID，完成后即可接收提醒。`

#### 渠道配置不完整
- 保存按钮可用，但给出明确错误提示
- 测试发送按钮在缺少必要字段时禁用

#### 某类通知已关闭
- 对应卡片展示 `已关闭` 辅助文案
- 不需要展示复杂禁用原因

#### 最近发送失败
- 在设置页状态区块展示最近失败原因
- 提供 `查看操作日志` 入口即可，不单独做失败列表页

### Product copy direction

- 页面上统一使用“通知”描述用户可感知能力
- 页面下说明中可补充“仅高价值事件会发送通知，完整记录请查看操作日志”
- 避免把用户引导成“这里会看到一整个消息中心”

### Future-compatible UI reservation

首版原型中可预留但不启用：
- `更多渠道（即将支持）`
- `更多通知类型（后续扩展）`

只作为弱提示，不提供可点击复杂入口。

### Telegram Migration Plan v1

#### Read path

- 先读新结构：
  - `notification_endpoints`
  - `notification_preferences`
- 若新结构不存在，再回退旧 `telegram_*` settings key

#### Write path

- 设置页保存只写新结构
- 不双写旧 `telegram_*` key

#### Mapping

- `telegram_bot_token` -> `notification_endpoints.config.credentials`
- `telegram_chat_id` -> `notification_endpoints.config.target`
- `telegram_enabled` -> Telegram 渠道是否启用
- `telegram_expiry_days` -> `domain_expiry_reminder` 参数
- `telegram_notify_hour` -> `domain_expiry_reminder` 参数
- `telegram_notify_timezone` -> `domain_expiry_reminder` 参数

#### Runtime path

- cron 不直接发 Telegram
- cron 先扫描并 emit 统一事件，例如 `domain.expiry.warning`
- 通知层根据 `type_key`、偏好与 endpoint 生成 `notification_deliveries`
- delivery 层按 `channel_key=telegram` 实际发送

### Most Likely Rework Risks

- `event_key` 粒度过粗或过细，导致偏好模型失真
- 过早把首版做成 `type × channel` 甚至资源级订阅
- cron 直接绑定 Telegram，破坏统一事件主链
- Telegram 新旧配置双写，导致两个事实源漂移
- 首版又把 inbox / 已读未读卷回来，范围失控

## Finalized v1 Draft

### Final table draft v1

#### `activity_logs`

职责：统一事件事实源，服务操作日志列表与资源时间线。

建议字段：
- `id`
- `event_key`
- `category`
- `action`
- `resource_type`
- `resource_id`
- `resource_name`
- `summary`
- `detail` (`jsonb`)
- `request_context` (`jsonb`)
- `actor_user_id`
- `severity`
- `result`
- `occurred_at`
- `created_at`
- 可选：`idempotency_key`

字段边界：
- 面向用户可见：`summary`、`detail`、`resource_name`、`occurred_at`
- 面向内部判断：`event_key`、`request_context`、`actor_user_id`、`severity`、`result`
- 不承担通知消费态、渠道状态与订阅偏好

#### `notification_endpoints`

职责：保存“通过什么渠道发到哪里”。

建议字段：
- `id`
- `channel_key`
- `name`
- `enabled`
- `config` (`jsonb`)
- `last_verified_at`
- `created_at`
- `updated_at`

说明：
- 首版重点承接 `telegram`
- `config` 里放 bot token、chat id 等渠道配置
- 不表达“要收什么通知”

#### `notification_preferences`

职责：保存“收什么通知”的订阅偏好。

建议字段：
- `id`
- `user_id`
- `type_key`
- `enabled`
- `config` (`jsonb`)
- `created_at`
- `updated_at`

字段边界：
- 首版只做到 `type_key` 级订阅
- 不做到 `type × channel`
- 不做资源级、静默时间、频控、复杂规则

#### `notification_deliveries`

职责：保存“有没有发、发没发成、为什么失败”的投递记录。

建议字段：
- `id`
- `activity_log_id`
- `type_key`
- `channel_key`
- `endpoint_id`
- `status` (`pending | sent | failed | skipped`)
- `level` (`info | warning | critical`)
- `payload` (`jsonb`)
- `dedupe_key`
- `provider_message_id`
- `error_message`
- `sent_at`
- `created_at`
- `updated_at`

字段边界：
- 这是投递追踪，不是站内消息箱
- 首版不承载已读/未读、归档、消费态

### Notification preference field boundary v1

#### Must-have

- `type_key`
- `enabled`
- `config`

#### Shared fields

首版共享模型尽量保持空或极简，避免人为制造复杂度。

#### Type-specific config

仅 `domain_expiry_reminder` 首版建议支持以下参数：
- `expiry_days`
- `notify_hour`
- `notify_timezone`

其余通知类型首版默认只需要：
- `enabled`

#### Explicitly not in scope

- `type × channel` 二维偏好
- 资源级订阅
- 静默时间
- 频控上限
- 多接收目标路由
- 已读/未读
- 站内 inbox 消费态

### Migration execution order v1

1. 先补齐统一事件契约与 `activity_logs` 字段
2. 新建 `notification_endpoints`
3. 新建 `notification_preferences`
4. 新建 `notification_deliveries`
5. 读取配置改为：优先新结构，缺失时回退旧 `telegram_*` settings key
6. 设置页保存只写新结构，不双写旧 key
7. cron 改为先 emit 统一事件，如 `domain.expiry.warning`
8. 通知层根据 `type_key + preference + endpoint` 生成 `notification_deliveries`
9. delivery 层按 `channel_key=telegram` 实际发送
10. 等新链路稳定后，再评估清理旧读逻辑

### Product / engineering compromise

- 产品侧让步：
  - 首版不做站内 inbox / 已读未读
  - 不做渠道级订阅
  - 不做复杂偏好中心
- 工程侧让步：
  - 不继续维持 Telegram 专项配置为唯一模型
  - 接受引入通用 `notification_endpoints`、`notification_preferences`、`notification_deliveries`

### Must-have vs delayed

#### Must-have

- 增强后的 `activity_logs`
- `notification_endpoints`
- `notification_preferences`
- `notification_deliveries`
- 双读不双写迁移策略
- 4 类通知偏好主线

#### Can be delayed

- `notification_types` 元数据表
- `notification_channels` 元数据表
- email / webhook 实际发送
- inbox / 已读未读
- 复杂聚合与去重策略

## Concrete v1 Data Model Proposal

### Principle

- 首版先稳定“统一事件事实层 + `activity_logs` 主落库表 + 轻量通知层 + 渠道层”。
- 能不落表的元数据先不落表，优先用稳定枚举和服务端规则控制复杂度。
- 必须落表的是“外发通知投递记录”；`notification_preferences` 作为首版类型级订阅配置一并落表。

### V1 tables

#### Must build

- `activity_logs`（增强现有表）
- `notification_endpoints`
- `notification_preferences`
- `notification_deliveries`

#### Can be delayed

- `notification_types`（首版可先用代码枚举）
- `notification_channels`（首版可先用代码枚举）
- inbox 已读状态细分表 / 更复杂的读取模型

#### `activity_logs`（增强现有表）

继续作为首版事实主落库表，建议在现有基础上补充：

- `event_key`
- `resource_type`
- `resource_id`
- `request_context`（jsonb）
- `actor_user_id`
- 可选：`severity`
- 可选：`result`
- 可选：`idempotency_key`

保留现有适合展示的字段：

- `category`
- `action`
- `resource_name`
- `summary`
- `detail`
- `occurred_at / created_at`

#### `notification_deliveries`（必须新增）

首版外发通知投递记录表，建议最小字段：

- `id`
- `activity_log_id`
- `type_key`
- `channel_key`
- `endpoint_ref`
- `level` (`info | warning | critical`)
- `payload`（jsonb，仅放发送所需与排障必需信息）
- `status` (`pending | sent | failed | skipped`)
- `provider_message_id`
- `error_message`
- `dedupe_key`
- `sent_at`
- `created_at`
- `updated_at`

说明：
- `type_key` 是通知类型，如 `domain_expiry_reminder`。
- `activity_log_id` 用于把投递记录与统一事件事实关联起来。
- `endpoint_ref` 用于标识具体渠道目标，如 telegram chat。
- `dedupe_key` 用于同对象短窗口去重，可首版启用简单策略。

#### `notification_preferences`

首版正式交付“用户只订阅部分通知”，建议极简字段：

- `user_id`
- `type_key`
- `enabled`
- `config`（jsonb，可放如提前天数、发送时间、时区等类型相关参数）
- `created_at`
- `updated_at`

说明：
- 当前项目是单用户场景，这张表可以很轻，不做复杂继承。
- 首版只做 `type_key` 级订阅，不引入 `channel_key`。

### V1 code enums instead of tables

以下概念首版优先使用代码枚举，不必急于落表：

- `notification_types`
- `notification_channels`

建议稳定枚举：

- 通知类型：`domain_expiry_reminder`、`auth_activity`、`settings_change`、`resource_change`
- 通知渠道：`telegram`，后续再加 `email`、`webhook`

## Concrete Implementation Plan

### Phase 1 — 定义事件字典与通知决策矩阵

产物：

- 事件字典 v1
- 通知类型字典 v1
- 事件 → 通知类型 → 渠道 的决策矩阵

目标：

- 明确哪些只记日志
- 明确哪些升格为通知
- 明确默认级别与默认去重窗口

### Phase 2 — 稳定事件主链与日志表结构

实施点：

- 统一 `lib/events/types.ts` 里的事件契约
- 扩展 `activity_logs` schema 与 mapper
- 保持 `activity-log` sink 为首个稳定投影

目标：

- 所有关键业务动作统一 emit 事件
- `activity_logs` 具备承载首版事实语义的字段

### Phase 3 — 新增外发通知最小链路

实施点：

- 新增 `notification_endpoints`
- 新增 `notification_preferences`
- 新增 `notification_deliveries`
- 新增 notification sink 与 delivery 层
- 首批接入 4 类通知偏好对应事件：
  - `domain_expiry_reminder`
  - `auth_activity`
  - `settings_change`
  - `resource_change`

目标：

- 高价值事件可以生成可追踪的外发投递记录
- Telegram 可以接收首批通知

### Phase 4 — Telegram 兼容映射

实施点：

- 继续兼容旧 `telegram_*` settings key
- 服务端把旧配置映射为：
  - `telegram` 渠道配置
  - `domain_expiry` 类型的默认规则/偏好
- cron 不直接发 Telegram，而是先 emit 到期事件，再由通知层决定是否发 Telegram

目标：

- 用户无感迁移
- Telegram 从“专项逻辑”上提为“渠道实现”

### Phase 5 — 设置页切换到统一通知模型

实施点：

- 设置页开放：
  - Telegram 渠道配置
  - 通知类型开关
  - 少量类型参数配置
- 保存只写新结构
- 读取采用先新后旧的双读策略

目标：

- 用户能控制“收什么”
- 不引入渠道级订阅与复杂规则

### Phase 6 — 再考虑扩展能力

仅在前述链路稳定后推进：

- email / webhook 渠道
- 更细粒度用户偏好
- 同对象短窗口去重优化
- delivery 重试与更强排障能力

## MVP Scope

- 统一事件抽象，沿用并升级当前 `lib/events/*`。
- 增强 `activity_logs` 字段，使其能承载首版事件事实落库，并继续服务 `/logs` 与资源时间线。
- 从通知侧抽出轻量通知能力，至少涵盖：
  - 通知类型
  - 通知渠道
  - 类型级订阅偏好
  - 外发投递记录
- 首版外发渠道仅正式支持 `telegram`，并为 `email`、`webhook` 预留扩展位。
- 首版通知能力支持：
  - Telegram 渠道配置
  - 按通知类型进行订阅开关
  - 高价值事件的外发送达
  - 基础测试发送与投递失败可追踪
- 首版通知偏好控制在 4 类：
  - `domain_expiry_reminder`
  - `auth_activity`
  - `settings_change`
  - `resource_change`
- 其中 `resource_change` 在偏好配置中继续细分到域名 / 站点 / 账号的新增、编辑、删除。
- 通知聚合若做，只做同类同对象短窗口防刷屏聚合。
- 首版明确不做站内 inbox、已读/未读、渠道级订阅、资源级订阅。

## Implementation Sequence

### Must-have

1. 统一 `lib/events` 的类型与事件契约，固定 `emitEvent` 主链路。
2. 扩展 `activity_logs` schema、类型与 mapper，使其承载首版事件事实字段。
3. 保持现有 activity-log sink，补齐字段映射与写入逻辑。
4. 新增轻量通知层模型：`notification_endpoints`、`notification_preferences`、`notification_deliveries`。
5. 增加 notification sink / delivery pipeline，把“应通知事件”投影成投递记录。
6. 实现 Telegram channel adapter，并兼容现有 `telegram_*` settings key 的双读迁移。
7. 先接入 4 类主线通知偏好：到期提醒、登录提醒、设置变更、变更提醒。
8. 调整设置页为“Telegram 通知 + 通知偏好”，保存只写新结构。
9. 将 cron 型提醒改为“先 emit 统一事件，再由通知层决定是否投递”。

### Nice-to-have

- 邮件 / Webhook 渠道在基础模型稳定后接入
- 更细粒度用户偏好在通知类型级开关验证后再推进
- 更强的去重、重试和排障视图在 delivery 基础链路稳定后补齐

## Implementation Readiness Checklist

### 方案锁定

- 统一事件主链：业务动作只 emit 一次事件。
- 首版事实主落库表：继续使用增强后的 `activity_logs`，不新增 `domain_events` 主表。
- 首版通知层最小落表：
  - `notification_endpoints`
  - `notification_preferences`
  - `notification_deliveries`
- 首版渠道：仅 `telegram`。
- 首版订阅粒度：仅 `type_key` 级。
- 首版不做：inbox、已读未读、`type × channel` 偏好、资源级订阅。

### 进入实现前必须先定稿的契约

- `event_key` 命名全集。
- `activity_logs` 新增字段与 TypeScript 类型。
- 事件到通知类型的映射矩阵。
- Telegram 旧配置到新模型的映射规则。
- cron 事件的 emit 命名与去重键规则。

## Code Touch Points

### 事件主链

- `lib/events/types.ts`
  - 把当前 `ActivityEventInput` 升级为统一事件契约。
  - 增加 `eventKey`、`resourceType`、`resourceId`、`occurredAt`、`actorUserId`、`severity`、`result`、`idempotencyKey` 等字段。
- `lib/events/index.ts`
  - 保持 sink 管线入口。
  - 在 `persistActivityLogEvent` 之外增加 notification sink。
- `lib/events/helpers.ts`
  - 统一构造 `requestContext`、summary builder、critical change builder、dedupe key builder。

### 现有事件源接入

- `app/actions/auth.ts`
  - 将 `login` / `login_failed` / `logout` 对齐到统一事件契约。
- `app/actions/domains.ts`
  - 为 create/update/delete 补足 `resourceType`、`resourceId`、上下文与高风险删除语义。
- `app/actions/accounts.ts`
  - 与 domain 一致补齐统一事件字段。
- `app/actions/sites.ts`
  - 与 domain 一致补齐统一事件字段。
- `app/actions/settings.ts`
  - 区分普通 `settings.update` 与 `settings.critical_changed`。

### 日志投影

- `lib/events/sinks/activity-log.ts`
  - 把统一事件映射为增强后的 `activity_logs` 落库字段。
- `lib/data/activity-logs.ts`
  - 扩展 insert / query / mapper。
- `types/activity-log.ts`
  - 扩展前后端共享类型。
- `supabase/migrations/*` / `supabase/schema.sql`
  - 为 `activity_logs` 补字段与索引。

### 通知层

- `lib/notifications/*`（建议新增目录）
  - `types.ts`：通知类型、渠道、delivery 状态枚举。
  - `catalog.ts`：事件 → 通知类型决策矩阵。
  - `preferences.ts`：类型级偏好读取与旧配置回退。
  - `deliveries.ts`：创建 delivery、去重、状态更新。
  - `channels/telegram.ts`：Telegram 发送适配器。
- `lib/events/sinks/notification.ts`（建议新增）
  - 根据事件是否命中通知矩阵生成 delivery。

### 设置与迁移兼容

- `components/settings/notification-settings.tsx`
  - 从“Telegram 专项配置”升级为“Telegram 通知 + 通知偏好”。
- `app/actions/telegram.ts`
  - 调整为读写统一通知模型，并保留旧 key 双读兼容。
- `lib/data/settings.ts`
  - 旧 `telegram_*` key 保留读兼容；新增统一通知层读写入口。

### 定时任务与发送链路

- 到期提醒 cron / route handler / job 入口
  - 不直接发 Telegram。
  - 只负责扫描并 emit `domain.expiry.warning` / `domain.expiry.expired`。
- delivery executor
  - 读取 pending delivery，调用 telegram channel adapter，回写 sent / failed。

## PR Breakdown

### PR1：统一事件契约 + activity_logs 增强

- 调整 `lib/events/types.ts`、`lib/events/index.ts`、`helpers.ts`
- 补齐 auth / domain / account / site / settings 的 emit 字段
- 扩展 `activity_logs` 表、`lib/data/activity-logs.ts`、`types/activity-log.ts`
- 保证 `/logs` 与现有功能不回退

### PR2：通知数据模型 + Telegram 兼容读取

- 新增 `notification_endpoints`、`notification_preferences`、`notification_deliveries`
- 实现通知 catalog / preference / delivery 基础层
- 实现旧 `telegram_*` key 到新模型的双读兼容
- 不要求本 PR 就完整发送，只先把模型和读取链路站稳

### PR3：notification sink + Telegram 发送链路

- 增加 `lib/events/sinks/notification.ts`
- 接通 delivery 创建、去重和状态回写
- 接入首批通知事件：
  - `domain.expiry.warning` / `domain.expiry.expired`
  - `auth.login` / `auth.logout` / `auth.login_failed`
  - `settings.update` / `settings.critical_changed`
  - `domain/site/account` 的 create / update / delete
- 接通 Telegram adapter 与测试发送

### PR4：设置页统一通知配置

- 重构 `components/settings/notification-settings.tsx`
- 展示 Telegram 渠道配置与 4 类通知偏好
- 保存只写新结构
- 保持读取先新后旧

### PR5：cron / job 统一走事件主链

- 将定时型提醒改为 emit 统一事件
- 校准去重键、默认窗口和失败可观测性
- 保持首版范围聚焦在到期提醒、登录活动、设置变更与资源变更四类通知偏好

## Definition of Done (team quality bar)

- PRD 明确统一事件抽象、通知分层与 MVP 边界
- 明确首版通知与日志的职责划分
- 明确页面之间的语义分工与跳转关系
- 明确字段契约、通知层边界与 Telegram 兼容策略
- 明确后续实现应落在哪些层（actions / lib/events / sink / lib/data / schema / delivery）
- 后续进入实现阶段时，不与当前 `lib/events` 与 Telegram 配置方向冲突

## Risks & Boundaries

### Must-have

- 严格区分追溯与提醒：
  - `activity_logs` 不承载未读语义
  - `notifications` 不替代审计事实
- 避免把渠道凭据、用户偏好、通知状态继续散落在 `settings` 与日志表中。
- 通知层要足够轻，避免首版做成半个消息平台。
- Telegram 兼容方案必须平滑，不能要求当前用户完全重配。
- 用户偏好首版要克制，避免一上来做复杂继承与规则编辑器。

### Nice-to-have

- 未来若引入多租户或多渠道，再补 recipient / delivery 策略
- 未来若事件消费者变多，再评估引入 `domain_events` 主表

## Out of Scope (explicit)

- 邮件、Webhook、短信等外部通知渠道的完整首版实现
- 用户级通知偏好的复杂继承、静默时间、复杂订阅规则
- 通知规则引擎、优先级编排、批量聚合中心
- 实时推送基础设施（WebSocket / SSE）
- 多用户权限隔离、复杂接收人路由
- 事件回放、补算、重试后台
- 首版单独的 `domain_events` 主表
- 复杂筛选、归档、多标签分组、独立通知详情体系
- 模板编辑器、失败重试队列、通知编排中心

## Technical Notes

- 相关现有文件：
  - `app/actions/auth.ts`
  - `app/actions/domains.ts`
  - `app/actions/sites.ts`
  - `app/actions/accounts.ts`
  - `app/actions/settings.ts`
  - `app/actions/telegram.ts`
  - `lib/events/index.ts`
  - `lib/events/types.ts`
  - `lib/events/helpers.ts`
  - `lib/events/sinks/activity-log.ts`
  - `lib/data/activity-logs.ts`
  - `lib/data/settings.ts`
  - `components/settings/notification-settings.tsx`
  - `types/activity-log.ts`
  - `supabase/migrations/20260430113000_create_activity_logs.sql`
  - `supabase/schema.sql`
- 当前 `lib/events/index.ts` 已支持 sink 列表：`const sinks = [persistActivityLogEvent]`，是后续增加 notification sink 的天然扩展点。
- 当前 Telegram 通知配置已存在，因此通知层抽象不应脱离这部分现状空谈，必须给出兼容迁移路径。
- 首版最关键的是把“统一 emit 一次事件”的主链路定稳，并把“Telegram 专项配置”上提成“可扩展的轻量通知层”。
- 页面关系建议：
  - 通知中心点击单对象通知时优先跳资源详情页；
  - 聚合型或任务型通知可跳日志页并带筛选条件；
  - 资源详情页时间线复用日志事实，不单独维护另一套事件来源。
