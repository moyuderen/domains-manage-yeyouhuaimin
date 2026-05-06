# 站点 Label 点击跳转外部站点地址

## Goal

在看板的域名监控（注册商分布、DNS 站点分布）和站点监控（站点账号分布）图表中，让轴上的站点 label 文字可点击，点击后在新窗口打开对应站点的外部网址。

## Requirements

- 图表轴 label 文字可点击，点击后在新窗口（`window.open` / `<a target="_blank">`）打开对应站点的 `websiteUrl`
- **视觉表现**：文字直接可点击，hover 时变色 + cursor pointer，无额外图标
- **交互区分**：与柱条点击行为共存互不干扰（注册商分布的柱条点击跳内部页面，label 点击跳外链）
- 无 `websiteUrl` 的站点 label 保持普通样式，不可点击
- 数据处理层补充 `websiteUrl` 到图表数据结构

## Acceptance Criteria

- [ ] 注册商分布图 Y 轴注册商名称可点击，新窗口打开对应站点外部地址
- [ ] DNS 站点分布图 Y 轴 DNS 提供商名称可点击，新窗口打开对应站点外部地址
- [ ] 站点账号分布图 X 轴站点名称可点击，新窗口打开对应站点外部地址
- [ ] 无外部地址的 label 不可点击，样式不变
- [ ] 有外部地址的 label hover 时变色 + pointer
- [ ] 柱条点击行为不受影响

## Definition of Done

- Lint / typecheck / build 通过
- 不引入安全漏洞（URL 跳转使用 `noopener,noreferrer`）

## Technical Approach

### 数据层改动

1. `lib/dashboard.ts` — 三个分布函数增加 `sites` 参数：
   - `getRegistrarDistribution(domains, sites)`：利用已有的 `registrarSiteId` 从 sites Map 中查找 `websiteUrl`
   - `getDnsProviderDistribution(domains, sites)`：利用 Domain 的 `dnsSiteId` 从 sites Map 中查找 `websiteUrl`（当前函数只做了名称分组，需改为与 registrar 同构的结构）
   - `getSiteAccountCountDistribution(accounts, sites)`：在原始 site ID 被 `getSiteLabel()` 转换前，先保留 site ID 用于回查 `websiteUrl`
2. 返回类型增加 `websiteUrl: string | null` 字段

### 组件层改动

3. `components/dashboard/ProviderChart.tsx` — 注册商分布和 DNS 站点分布共用 `BarChartCard`，自定义 Y 轴 tick 组件：
   - 创建 `ClickableYAxisTick` 替代 Recharts 默认 Y 轴渲染
   - 有 `websiteUrl` 时渲染为可点击的 SVG text，hover 变色 + pointer
   - 点击调用 `window.open(websiteUrl, '_blank', 'noopener,noreferrer')`
   - DNS 站点分布由 `ProviderChart` 改为使用同样支持 label 点击的组件

4. `components/dashboard/SiteCharts.tsx` — 改造 `TruncatedTick`：
   - 在 `chart-utils.tsx` 中扩展 `TruncatedTick`，接受可选的 `url` 和 `onClick` 参数
   - 有 `websiteUrl` 时文字可点击，样式同上

### 数据加载层

5. `lib/data/dashboard.ts` — 将已获取的 sites 数据传入分布函数

## Decision (ADR-lite)

**Context**: 需要在图表轴 label 上提供跳转外部站点的能力，同时保持柱条的内部页面跳转行为不变
**Decision**: label 文字直接可点击（hover 变色 + pointer），通过数据处理层补充 `websiteUrl`，自定义 tick 组件处理交互
**Consequences**: 数据结构需增加 `websiteUrl` 字段，tick 组件需从纯展示变为可交互

## Out of Scope

- Tooltip 中的链接跳转（已有其他机制）
- 新增站点管理功能
- DNS 提供商分布图的 label 跳转（已纳入需求）

## Technical Notes

- 关键文件：
  - `components/dashboard/ProviderChart.tsx` — 注册商分布图（Y 轴 label）
  - `components/dashboard/SiteCharts.tsx` — 站点账号分布图（X 轴 label）
  - `components/dashboard/chart-utils.tsx` — TruncatedTick 组件
  - `lib/dashboard.ts` — 数据处理函数
  - `lib/data/dashboard.ts` — Dashboard 数据加载
  - `types/site.ts` — Site 类型定义
- 数据关联链路：
  - Domain.registrarSiteId → Site.id → Site.websiteUrl
  - Domain.dnsSiteId → Site.id → Site.websiteUrl
  - Account.sites[].site → Site.id → Site.websiteUrl
- DNS 站点分布当前用 `getDnsProviderDistribution` → `getNamedDistribution`，只按名称字符串分组，不保留 siteId，需要重构为与 registrar 分布同构的逻辑
