# 管理页表格固定表头与剩余空间撑满

## Goal

统一优化管理页表格体验：域名管理保持当前方向，表格区域撑满视口中除 Toolbar 以外的可用空间、分页固定在底部；账号管理对齐域名管理的表格布局模式；站点管理仅在表格视图下实现固定表头，不改卡片视图。

## What I already know

- 域名管理已有进行中的改动：`components/domains/DomainsPageClient.tsx` 改为页面级 flex 全高布局，`components/domains/DomainTable.tsx` 改为 Card 内部滚动、sticky 表头、底部分页插槽。
- 账号管理当前是单页表格布局：Toolbar、空态/表格、分页上下串联，表头尚未 sticky，分页仍在表格外部。落点在 `components/accounts/AccountsPageClient.tsx`。
- 站点管理当前有表格/卡片双视图，表格视图使用普通 Table，卡片视图是按分类分组的卡片布局。落点在 `components/sites/SitesPageClient.tsx`。
- 用户新增要求：账号管理也要实现固定表头和表格撑满；站点管理只做固定表头；整体参考域名管理表格的改动方式。

## Requirements

- 域名管理：保留当前方案，页面使用 flex 纵向布局，占满视口可用高度。
- 域名管理：Toolbar 保持自然高度，表格区域使用 flex-1 撑满剩余空间，内部滚动，分页固定在表格 Card 底部。
- 账号管理：完全对齐域名管理的表格布局模式，页面内容区改为 flex 全高布局，表格区域撑满 Toolbar 以下剩余空间。
- 账号管理：分页从表格外部移动到表格容器底部并保持始终可见，表头 sticky，表体独立滚动。
- 站点管理：仅在 table 视图下实现 sticky 表头；card 视图保持现状不变。
- 响应式：不同屏幕尺寸下布局均正常，不破坏现有筛选、切换、操作按钮交互。

## Acceptance Criteria

- [ ] 域名管理表格自动撑满 Toolbar 以下的所有剩余空间。
- [ ] 域名管理分页控件始终可见，不需要滚动页面才能看到。
- [ ] 域名管理数据多时表头固定，表体滚动；数据少或空时表格区域仍占满空间。
- [ ] 账号管理表格自动撑满 Toolbar 以下的所有剩余空间。
- [ ] 账号管理分页控件固定在表格容器底部并始终可见。
- [ ] 账号管理数据多时表头固定，表体滚动；空数据时表格区域仍占满空间。
- [ ] 站点管理在表格视图下滚动表格时表头固定；切换到卡片视图后表现不变。
- [ ] 移动端或窄屏下布局不受明显破坏。

## Definition of Done

- Lint / Build 通过。
- 手动验证域名管理、账号管理、站点管理表格视图在空、少、多数据场景下布局正确。
- 手动验证站点管理卡片视图未受回归影响。

## Out of Scope

- 不修改 AppShell 全局布局，仅在对应页面/组件内处理高度与滚动。
- 不改变分页逻辑、筛选逻辑和数据获取逻辑。
- 不重构站点管理卡片视图。
- 不新增虚拟滚动、列拖拽等表格增强功能。

## Technical Notes

- 域名管理涉及文件：`components/domains/DomainsPageClient.tsx`、`components/domains/DomainTable.tsx`。
- 账号管理预计涉及文件：`components/accounts/AccountsPageClient.tsx`，可复用域名管理的页面级 flex 布局、表格容器 `min-h-0/flex-1/overflow-auto`、sticky `TableHeader` 模式。
- 站点管理预计涉及文件：`components/sites/SitesPageClient.tsx`，仅在 `TabsContent value="table"` 内的表格容器增加滚动区域与 sticky 表头，card 视图不动。
- 若账号管理需要对齐域名管理体验，分页应从表格外部移动到表格容器底部；否则可只处理表头 sticky 与主体高度。
