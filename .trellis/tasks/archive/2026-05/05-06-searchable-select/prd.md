# 下拉选择支持输入筛选

## Goal

将域名管理页面的静态 Select 下拉替换为支持输入筛选的可搜索下拉组件，提升用户在选项较多时的选择效率。先在域名管理页面的筛选项中试点，确认体验和功能正确后再逐步替换其他页面的下拉。

## What I already know

- 当前所有下拉均使用 shadcn `Select`（基于 Radix UI Select），无搜索功能
- 域名管理页面有 5 个 Select：状态(4项)、注册站点(动态)、DNS站点(动态)、排序字段(3项)、排序方向(2项)
- 项目已安装 `popover.tsx`，但未安装 `command.tsx`（Combobox 所需）
- shadcn 官方推荐 Combobox 模式 = Command + Popover
- 其他页面（账号、日志、站点）也有类似的 Select 筛选

## Assumptions (temporary)

- 使用 shadcn 官方 Combobox 模式（Command + Popover）
- 先只改域名管理页面中选项较多的 Select（站点类）
- 状态/排序等固定少选项的 Select 保持不变（搜索无意义）

## Requirements

- 安装 shadcn `command` 组件（基于 cmdk）
- 封装可复用的 SearchableSelect 组件
- 仅替换 `DomainToolbar.tsx` 中的注册站点 Select 为可搜索下拉
- 输入文字时实时过滤匹配的站点选项
- 支持键盘导航和选择
- 保持与现有 Select 一致的视觉风格

## Acceptance Criteria

- [ ] 输入文字可实时过滤下拉选项
- [ ] 无匹配时显示"未找到"提示
- [ ] 支持键盘上下选择 + Enter 确认
- [ ] 点击选项后关闭下拉并更新筛选
- [ ] 外观与现有 Select 风格一致
- [ ] Lint / build 通过

## Out of Scope

- DNS 站点及其他 Select — 验证后再决定
- 其他页面的 Select 替换
- 表单弹窗内的 Select 替换

## Technical Approach

shadcn 官方 Combobox 模式 = `Command`(cmdk) + `Popover`。
封装为通用 `SearchableSelect` 组件，接受 options/value/onValueChange 等 props。

## Technical Notes

- 依赖：需安装 `cmdk` + `command.tsx`（`npx shadcn@latest add command`）
- 涉及文件：
  - 新建：`components/ui/command.tsx`
  - 新建：`components/searchable-select.tsx`
  - 修改：`components/domains/DomainToolbar.tsx`
