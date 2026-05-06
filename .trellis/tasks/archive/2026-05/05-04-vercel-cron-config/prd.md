# brainstorm: Vercel 定时任务配置与手动触发

## Goal

在当前已部署到 Vercel 的域名管理平台中，使用 Vercel Cron Jobs 调度现有的域名到期检查任务，并补充一个站内可手动触发的测试入口，便于验证任务执行结果，同时保持现有 `runJob` 业务内核、鉴权约束与 server/client 边界不变。

## What I already know

* 仓库已经存在 cron 路由：`app/api/cron/domain-expiry-check/route.ts`
* 该路由使用 `Authorization: Bearer <CRON_SECRET>` 鉴权
* 路由内部调用 `runJob('domain-expiry-check')`，并将 `triggerSource` 标记为 `vercel-cron`
* `README.md` 已经记录了 `CRON_SECRET` 和 HTTP 调用方式
* 现已补充 `vercel.json`，使用 `5 * * * *` 调度 `/api/cron/domain-expiry-check`
* `runJob()` 已统一负责创建/更新 job_runs 记录，适合被 cron 与手动触发复用：`lib/jobs/run-job.ts`
* `types/jobRun.ts` 已预留 `manual` 触发来源，无需新增 trigger source 枚举
* 现有“任务执行”页面已展示执行列表与摘要：`app/(main)/job-runs/page.tsx`、`components/job-runs/JobRunsPageClient.tsx`
* 项目内变更操作约定使用 Server Action，并在入口处执行 `requireAccess()`：`app/actions/*.ts`

## Assumptions (temporary)

* 当前目标是先把生产环境定时执行与站内手动测试都打通
* 手动触发只面向已登录且有权限的站内用户，不对外暴露新的公共调试入口
* 手动触发优先复用 `runJob('domain-expiry-check')`，不改写现有 job 内核

## Open Questions

* 手动触发入口应该放在哪个页面更符合你的使用习惯？

## Requirements (evolving)

* 在 Vercel 中配置 Cron Jobs 调度现有路由
* 使用现有 `CRON_SECRET` 方案完成 Vercel cron 鉴权
* 配置应落在仓库中，便于随代码管理
* 增加一个站内可手动触发 `domain-expiry-check` 的入口，便于测试
* 手动触发应复用 `runJob('domain-expiry-check')`
* 手动触发应遵循 Server Action + `requireAccess()` 模式
* 手动触发后应能方便看到最新执行结果
* 域名已过期超过 30 天时，不再发送到期通知

## Acceptance Criteria (evolving)

* [ ] 仓库中存在 Vercel Cron 配置，指向 `/api/cron/domain-expiry-check`
* [ ] Vercel 生产环境配置 `CRON_SECRET`
* [ ] 定时请求可通过现有 Bearer 鉴权成功执行任务
* [ ] 站内存在一个手动触发 `domain-expiry-check` 的入口
* [ ] 手动触发后会记录一条 `triggerSource=manual` 的 job run
* [ ] 触发后用户可以在界面上看到成功/失败反馈，并方便查看最新执行记录
* [ ] README 或现有说明足以指导部署后验证

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* 新增其他业务任务的 cron 编排
* 引入第三方调度平台
* 改写现有 `runJob` 业务逻辑
* 对外开放无登录保护的调试执行入口
* 做成通用“任意任务运行控制台”（除非后续明确扩 scope）

## Technical Notes

* 关键文件：`app/api/cron/domain-expiry-check/route.ts`
* 复用入口：`lib/jobs/run-job.ts`
* 现有记录页：`app/(main)/job-runs/page.tsx`、`components/job-runs/JobRunsPageClient.tsx`
* 现有触发来源枚举：`types/jobRun.ts`
* Server Action 参考：`app/actions/settings.ts`、`app/actions/domains.ts`
* 官方 Vercel Cron 约定：通过 `vercel.json` 中 `crons` 数组声明 `path + schedule`

## Research Notes

### Constraints from our repo/project

* Route Handler 适合外部 cron 调度，不适合站内已登录用户的手动测试入口
* 站内手动操作应走 Server Action，并由 `requireAccess()` 保护
* “任务执行”页已经天然承载“看结果”的场景，新增按钮后验证路径最短
* `manual` 触发来源已存在，数据层和展示层兼容成本低

### Feasible approaches here

**Approach A: 在任务执行页增加“手动触发”按钮**（Recommended）

* How it works: 在 `job-runs` 页面顶部增加按钮，调用新的 Server Action 触发 `runJob('domain-expiry-check')`
* Pros: 最贴近执行记录，触发后刷新即可验证；MVP 改动小；符合“测试任务执行”的心智模型
* Cons: 入口偏运维/调试，不在通知配置上下文中

**Approach B: 在设置页/通知设置里增加“立即测试”按钮**

* How it works: 在通知设置附近放按钮，调用同一个 Server Action
* Pros: 更贴近“通知是否正常”的业务语义
* Cons: 触发后还要跳去任务执行页看完整结果；和 job run 历史分离

**Approach C: 新增一个受保护的站内调试 HTTP 入口**

* How it works: 保留页面按钮，但按钮调用新的受保护 Route Handler
* Pros: 也可供外部脚本调试
* Cons: 多一层 HTTP adapter，职责重复；比 Server Action 更绕；MVP 不必要
