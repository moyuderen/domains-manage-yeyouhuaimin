# brainstorm: 优化登录页大屏布局比例

## Goal

优化登录页面在大屏显示下的左右布局比例，让品牌展示区与登录表单区的视觉重心更协调，避免当前超宽屏下左侧内容区域被过度拉伸、右侧表单区显得过窄的问题。

## What I already know

* 用户反馈：登录页面在大屏显示下，左右布局比例不协调，需要优化。
* 登录页入口位于 `app/(auth)/login/page.tsx`，实际布局由 `components/login/LoginPageClient.tsx` 渲染。
* 当前根布局在 `components/login/LoginPageClient.tsx:50-87` 采用左右双栏。
* 左侧面板使用 `lg:flex-1`，右侧面板使用 `lg:w-[580px]` 固定宽度。
* 该实现会导致屏幕越宽，左侧区域越大，而右侧表单区宽度不变，视觉比例持续失衡。

## Assumptions (temporary)

* 本次优化主要聚焦桌面端 / 大屏断点下的比例与容器宽度控制，不改动登录流程与交互逻辑。
* 用户更希望保留现有“左品牌展示 + 右登录表单”的信息架构，而不是改成单栏或完全重做视觉。

## Open Questions

* 无

## Requirements (evolving)

* 优化登录页在大屏下的左右布局比例。
* 采用“限制整体最大宽度并居中”的方案，避免超宽屏下左侧区域无限扩展。
* 保持当前登录页品牌展示区与表单区的双栏结构。
* 允许顺手微调左右两侧的间距与标题字号层级，让大屏观感更自然。
* 不改动登录行为、字段、校验与主题切换功能。

## Acceptance Criteria (evolving)

* [ ] 在大屏宽度下，左侧展示区与右侧表单区的视觉占比明显更协调。
* [ ] 中小屏与移动端布局不回退，仍保持当前可用性。
* [ ] 登录表单交互与主题切换行为保持不变。

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* 重写登录页文案、品牌视觉或登录逻辑。
* 调整登录后跳转、鉴权、Server Action 行为。
* 扩展新的认证方式。

## Technical Notes

* 已检查文件：`app/(auth)/login/page.tsx`、`components/login/LoginPageClient.tsx`。
* 现有问题核心：`flex-1 + fixed width` 在超宽屏下无法维持稳定比例。
* 可能方案：
  * 为整体双栏容器设置最大宽度并居中。
  * 改为 grid/flex 的固定比例分栏（如 55/45、60/40）。
  * 在更大断点上为左侧设置上限宽度，避免无限扩展。
