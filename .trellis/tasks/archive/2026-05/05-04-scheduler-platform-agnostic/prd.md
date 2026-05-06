# brainstorm: 定时任务平台无关化方案

## Goal

梳理当前域名到期通知定时任务的实现链路，识别“调度触发”和“业务编排”的耦合点，并给出一个可演进为平台无关调度层的方案，便于后续接入 Vercel、普通服务器、Docker 与 GitHub Actions。

## What I already know

* 当前唯一明确的定时任务入口是 `app/api/cron/domain-expiry-check/route.ts`。
* 当前入口同时负责：鉴权、读取通知规则、判断时区小时、查询即将到期域名、发事件、发送聚合通知、补发 pending delivery。
* 通知规则配置来自 `lib/data/settings.ts`，默认值定义在 `lib/notifications/settings.ts`，校验在 `schemas/notificationSchemas.ts`。
* 事件与通知投递层已有一定抽象：`lib/events/index.ts`、`lib/events/sinks/notification.ts`。
* 当前缺少独立的 scheduler adapter / job registry / platform bridge；“谁来触发”与“触发后做什么”尚未彻底分层。
* 仓库中未发现 `vercel.json`、`Dockerfile`、`.github/workflows` 等现成多平台调度接入样例。

## Assumptions (temporary)

* 后续不只会有一个“域名到期检查”任务，还会出现更多后台任务。
* 未来不同平台的差异主要体现在“如何触发任务”，而非“任务本身的业务逻辑”。
* 现阶段优先目标不是做复杂分布式调度，而是先把任务定义与平台触发器解耦。

## Open Questions

* 首版 job registry 采用静态注册表，还是约定式自动发现？

## Requirements (evolving)

* 明确当前定时任务的真实执行链路与耦合点。
* 给出一个平台无关的任务定义层，使同一任务可被不同平台触发。
* 业务任务应从 Route Handler 中下沉到 `lib/**` 服务层。
* 平台适配层只负责“入口协议 / 鉴权 / 参数解析 / 调用 job runner”。
* 方案需兼容 Vercel、普通服务器、Docker、GitHub Actions 等外部触发方式。
* 首版保留现有通知配置语义（`notifyHour` / `notifyTimezone` / `expiryDays`）。
* 首版聚焦“统一执行层”，不做统一调度中心，不强制统一平台 cron 配置来源。
* 统一执行入口以内部 runner 为核心，HTTP / CLI / Actions 仅作为 adapter。

## Acceptance Criteria (evolving)

* [ ] 能用一句话说明当前定时任务的入口、配置、执行流程。
* [ ] 能明确指出现有实现中哪些逻辑属于调度层，哪些属于业务层。
* [ ] 能定义一层平台无关的 job contract（job id、handler、payload、result、幂等键/窗口）。
* [ ] 能给出至少 4 种触发接入方式的映射：Vercel、服务器、Docker、GitHub Actions。
* [ ] 能产出分阶段落地方案，而不是一次性重写。

## Definition of Done (team quality bar)

* 结论、问题、方案边界清晰
* 平台无关层与业务层职责拆分明确
* 落地步骤可执行，可直接进入后续实现任务

## Out of Scope (explicit)

* 本轮不直接改代码
* 本轮不引入分布式队列、持久化任务调度中心、多租户调度系统
* 本轮不处理高频重试、失败补偿编排、复杂 DAG 任务依赖

## Technical Notes

* 关键入口：`app/api/cron/domain-expiry-check/route.ts`
* 配置读取：`lib/data/settings.ts`
* 默认配置：`lib/notifications/settings.ts`
* 配置校验：`schemas/notificationSchemas.ts`
* 事件总线：`lib/events/index.ts`
* 通知投递：`lib/events/sinks/notification.ts`
* 域名查询：`lib/data/domains.ts`
* 迁移：`supabase/migrations/20260501103000_add_notification_schedule_type.sql`

## Research Notes

### Current flow

1. 外部 cron / 手动请求调用 `/api/cron/domain-expiry-check`
2. Route Handler 校验 `CRON_SECRET`
3. 读取通知规则与通知通道开关
4. 按 `notifyTimezone + notifyHour` 判断当前是否应该执行
5. 查询到期阈值内域名
6. 为每个域名发事件（带按天幂等键）
7. 生成聚合通知报表
8. 处理 pending notification deliveries

### Main coupling points

* “是否到点执行”与“执行什么业务”写在同一 handler 中
* Route Handler 知道过多业务细节（域名查询、事件语义、汇总通知）
* 缺少统一 job registry，导致未来新增 job 时容易继续复制 route 级编排

### Feasible approaches here

**Approach A: Job Registry + Platform Adapters** (Recommended)

* How it works:
  * 在 `lib/jobs/` 定义统一 job contract 与 registry
  * `lib/jobs/domain-expiry-check.ts` 只关心业务执行
  * `app/api/cron/...`、CLI、GitHub Actions wrapper 等都调用同一个 `runJob()`
* Pros:
  * 分层清晰，最适合当前单仓 + Next.js 结构
  * 渐进式改造成本低
  * 易于新增多平台适配器
* Cons:
  * 平台级 cron 表达式仍需分别配置

**Approach B: Database-driven Scheduler Center**

* How it works:
  * 在数据库里维护 job schedule，统一由一个 worker 拉取并执行
* Pros:
  * 中长期灵活，可做暂停/重试/审计
* Cons:
  * 远超当前项目需求，复杂度高

**Approach C: Keep HTTP routes, extract only service layer**

* How it works:
  * 保留 `/api/cron/*` 模式，但把 handler 里的业务搬进 service
* Pros:
  * 改造最轻
* Cons:
  * 仍缺统一 registry，跨平台扩展时会继续分散

## Decision (ADR-lite)

**Context**: 当前已有单一 cron route，但未来希望支持多平台调度入口，并避免业务逻辑绑定在 Next.js Route Handler 上。

**Decision**: 采用 `Job Registry + Platform Adapters`，且首版只抽“统一执行层”，暂不建设统一调度中心，也不要求把所有平台的 schedule metadata 统一收口。统一执行入口以内部 `runJob()` runner 为核心，HTTP / CLI / GitHub Actions / Docker / server cron 都通过 adapter 调用同一执行器。

**Consequences**: 需要新增一层任务抽象与少量适配代码，但可以显著降低后续新增任务和新增部署平台的成本，同时避免在当前阶段过早引入重型调度设计。

## Technical Approach

* Step 1: 抽象 `JobDefinition`、`JobContext`、`JobResult`、`runJob()`
* Step 2: 将 `domain-expiry-check` 从 route 下沉为 `lib/jobs/domain-expiry-check.ts`
* Step 3: route 仅保留 HTTP 鉴权与 job 调用
* Step 4: 增加 CLI / script 入口，支持服务器与 Docker 直接执行
* Step 5: 为 GitHub Actions / Vercel 编写最薄适配说明与调用入口
* Step 6: 后续若任务增多，再补 job manifest / observability / lock 机制
