# brainstorm: 优化通知设置变更提醒分组UI

## Goal

优化系统设置中的“通知设置 > 变更提醒”分组 UI，让用户能更快理解“资源类型 × 操作类型”的开关关系，并在桌面端与移动端都更容易扫描和操作，同时不改动通知能力范围与数据结构。

## What I already know

* 目标区域位于 `components/settings/notification-settings.tsx`。
* 当前“变更提醒”位于通知偏好之后，文案为“分别控制域名、站点、账号的新增、编辑、删除提醒”。
* 当前实现使用 3 个 `FieldSeparator` 分别展示“域名 / 站点 / 账号”，每组下方是一行横向排列的 3 个开关：新增、编辑、删除。
* 当前开关绑定到 `preferences.resourceChange`，键为 `domainCreate/domainUpdate/domainDelete/siteCreate/...`，已有持久化与读取逻辑，无需改动数据结构。
* `FieldGroup` / `Field` / `FieldTitle` / `FieldDescription` 是当前设置页已在使用的表单模式，可复用。
* 项目偏好要求尽量使用 shadcn/ui 组件与既有 variant/size API，避免无关重构。
* 当前个人项目通知首版范围聚焦外发通知，不扩展到站内 inbox/已读未读等模块。

## Assumptions (temporary)

* 本次主要是前端 UI 优化，不涉及通知类型、存储结构、服务端 action 或数据库迁移。
* “变更提醒”仍然保留 9 个独立开关，不新增批量全选/反选逻辑，除非用户明确提出。
* 优化重点是层级、可读性、间距和响应式展示，而不是功能扩展。

## Open Questions

* 无

## Requirements (evolving)

* 保持“变更提醒”功能范围不变，继续控制域名、站点、账号的新增、编辑、删除提醒。
* “变更提醒”采用按资源类型拆分的卡片式分组 UI，分别展示域名、站点、账号。
* 每个资源卡片内部展示该资源的总开关，以及新增、编辑、删除 3 个子开关。
* 当资源卡片的总开关关闭时，子开关仍然保留显示，且不置灰。
* 只有当资源卡片的总开关开启时，该卡片内的新增、编辑、删除 3 个子开关才参与生效。
* 当资源卡片的总开关关闭时，该卡片的子开关不生效。
* 每个资源卡片内部的开关关系应一眼可读。
* 新 UI 需要比当前分隔线 + 横排开关更易理解分组关系。
* 新 UI 应与现有设置页视觉体系保持一致，不做无关视觉跳脱。
* 新 UI 需要兼顾窄屏场景，避免单行内容过挤。

## Acceptance Criteria (evolving)

* [ ] 用户能快速看清三类资源及其对应的总开关与新增、编辑、删除子开关。
* [ ] 当总开关关闭时，子开关仍然显示且不置灰。
* [ ] 只有在总开关开启时，对应资源卡片的子开关才参与生效。
* [ ] 当总开关关闭时，对应资源卡片的子开关不生效。
* [ ] 在窄屏下，变更提醒区域不会因为横向拥挤而明显影响可读性或操作。
* [ ] 现有资源变更偏好的读写逻辑与后端数据结构保持兼容。
* [ ] 改动与通知系统其他模块解耦。

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* 新增通知类型或通知渠道
* 变更通知后端数据结构与持久化逻辑
* 引入站内消息中心、已读未读等 UI
* 扩展为批量全选、模板化规则或更复杂筛选器

## Technical Notes

* 页面容器：`components/settings/SettingsPageClient.tsx`
* 目标组件：`components/settings/notification-settings.tsx`
* 类型与持久化：`lib/data/settings.ts`
* 当前 `FieldSeparator` 适合弱分组，但不太适合承载“3 组 × 3 操作”这种矩阵式结构。
* 可考虑延续设置页现有 Card/Field 风格，在内部增加更强的块级分组或规则表格式排布。
* 用户已确认采用“资源卡片”方向，并希望每张资源卡片增加一个总开关。
* 用户已更正总开关语义：它不是批量全开/全关，而是资源级门控；总开关开启后子开关才出现并生效，关闭后子开关不生效。
