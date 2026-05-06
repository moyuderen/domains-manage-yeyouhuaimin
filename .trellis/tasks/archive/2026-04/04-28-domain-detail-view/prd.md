# 域名详情查看功能

## Goal

在域名列表页点击域名时，通过右侧抽屉展示域名完整详细信息，避免跳转到独立页面，提升浏览效率。

## Requirements

- 在域名列表点击域名名称时，打开右侧抽屉展示域名详情（仅基本信息）
- 抽屉展示所有域名字段信息：域名、状态、注册商、注册商账号、DNS 服务商、DNS 账号、注册日期、到期日期、续费天数、备注、创建时间、更新时间
- 使用 shadcn Sheet 组件，从右侧滑入
- 域名名称改为按钮触发抽屉，不再跳转独立页面

## Acceptance Criteria

- [ ] 点击域名名称打开右侧抽屉，展示完整域名信息
- [ ] 抽屉正确展示域名状态徽标（正常/即将过期/已过期）+ 到期倒计时
- [ ] 抽屉关闭后回到列表，无页面刷新或状态丢失
- [ ] Lint / build 无错误

## Definition of Done

- Lint / build 无错误
- 类型安全，无 any
- 遵循现有 Sheet 组件使用模式

## Technical Approach

1. 实现 `components/domains/DomainDetailsDrawer.tsx` — 使用 Sheet 组件，接收 Domain 数据 props
2. 修改 `components/domains/DomainTable.tsx` — 域名名称改为按钮，点击触发抽屉；增加选中域名状态管理
3. 布局参考 `DomainDetailsPage.tsx` 的信息展示方式，使用卡片 + label/value 对展示

## Out of Scope

- 抽屉内编辑/删除操作
- 子域名列表展示
- 独立详情页的修改或移除

## Technical Notes

- 使用 `components/ui/sheet.tsx` 组件
- 数据直接从表格行传入，无需额外服务端请求
- 参考 `DomainDetailsPage.tsx` 的信息布局
- 状态相关：`getDomainStatus()` / `getExpiryCountdownLabel()` / `getStatusColor()`
