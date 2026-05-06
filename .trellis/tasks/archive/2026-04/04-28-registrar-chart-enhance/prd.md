# 注册商分布图表增强 — hover 展示域名列表并支持跳转

## Goal

在仪表盘的注册商分布图表中，hover 时展示该注册商下的前 5 个域名名称，并提供"查看更多"链接跳转到域名管理页面，自动按该注册商站点筛选。

## Requirements

- 扩展 `getRegistrarDistribution()` 数据结构，携带域名名称列表（前 5 个）和 registrarSiteId
- 替换 ProviderChart 的通用 tooltip 为自定义 tooltip，展示域名列表
- tooltip 底部提供"查看更多"可点击链接，跳转到 `/domains?registrarSiteId=xxx`
- 遵循 AccountProviderChart 已有的自定义 tooltip 模式
- 同一注册商名称下多个 registrarSiteId 时，取第一个非空 siteId 作为跳转目标

## Acceptance Criteria

- [ ] hover 注册商条形时，tooltip 展示注册商名称、域名数量、前 5 个域名名称
- [ ] 域名数量超过 5 时，tooltip 底部展示"查看更多"可点击链接
- [ ] 点击"查看更多"跳转到 `/domains?registrarSiteId=xxx` 页面并自动按该注册站点筛选
- [ ] tooltip 样式与现有 AccountProviderTooltip 风格一致
- [ ] Lint / typecheck / build 通过

## Definition of Done

- Lint / typecheck / build 通过
- 无死代码或重复 helper
- 明确区分 server/client 边界

## Technical Approach

### 数据层改造 (`lib/dashboard.ts`)

新增类型 `RegistrarDistributionItem`：
```typescript
export type RegistrarDistributionItem = {
  name: string        // 注册商名称
  value: number       // 域名数量
  domains: string[]   // 前 5 个域名名称
  registrarSiteId: string | null  // 用于跳转过滤
}
```

改造 `getRegistrarDistribution(domains)` — 不再使用通用 `getNamedDistribution`，改为直接遍历 Domain 数组，按 registrar 分组并收集域名名称和 siteId。

### 组件层改造 (`components/dashboard/ProviderChart.tsx`)

- 新增 `RegistrarTooltip` 自定义组件（参考 `AccountProviderTooltip`）
- 展示：注册商名称、域名数量、域名列表（前 5 个）、"查看更多"链接
- 使用 `next/link` 实现跳转，`wrapperStyle={{ pointerEvents: 'auto' }}` 确保链接可点击
- ProviderChart 接收数据类型从 `{name, value}[]` 改为 `RegistrarDistributionItem[]`

### 数据传递 (`components/dashboard/OverviewCharts.tsx`)

- 传递给 ProviderChart 的 title prop 保持不变
- 数据类型更新为 `RegistrarDistributionItem[]`

## Out of Scope

- DNS 供应商分布图表（可后续复用相同模式）
- 注册商分布图表分组逻辑变更（仍按 registrar 名称分组）
- 其他图表组件的改造

## Technical Notes

- 参考实现：`components/dashboard/AccountCharts.tsx` 的 `AccountProviderTooltip` + `AccountReuseTooltip`（含可点击链接）
- 关键文件：
  - `lib/dashboard.ts:36-38` — `getRegistrarDistribution()`
  - `components/dashboard/ProviderChart.tsx` — ProviderChart 组件
  - `components/dashboard/OverviewCharts.tsx` — 数据传递入口
  - `types/domain.ts` — Domain 类型定义
- tooltip 可点击链接需要设置 Recharts Tooltip 的 `wrapperStyle={{ pointerEvents: 'auto' }}`（参考 AccountReuseChart 第 160 行）
