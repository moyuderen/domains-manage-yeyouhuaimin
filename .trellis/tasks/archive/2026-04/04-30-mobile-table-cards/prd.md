# 移动端表格卡片化适配

## Goal

所有数据表格在移动端（< 768px）自动切换为卡片形式展示每条记录，分页简化为"上一页/下一页"，提升移动端浏览体验。

## Requirements

1. **自动响应式切换**：md 断点以下显示卡片列表，以上显示表格，无需手动 toggle
2. **卡片布局**：每个卡片展示该记录的关键字段 + 操作按钮，使用 shadcn Card
3. **分页简化**：移动端分页只保留"上一页/下一页"，放在底部
4. **统一风格**：所有卡片保持一致的排版结构（标题行 → 信息区 → 操作区）
5. **需适配的表格**（共 5 个）：
   - 域名表格 `DomainTable.tsx`（有分页）
   - 二级域名表格 `SubdomainsTable.tsx`（无分页）
   - 账户表格 `AccountsPageClient.tsx`（有分页）
   - 账户站点表格 `AccountDetailsPage.tsx`（无分页，弹窗内）
   - 站点表格 `SitesPageClient.tsx`（已有卡片视图，检查分页）

## Technical Approach

- 断点策略：`hidden md:block`（隐藏表格）+ `block md:hidden`（显示卡片列表）
- 每个表格旁新增对应的卡片列表组件（如 `DomainCardList.tsx`）
- 复用现有 shadcn Card 组件
- 分页组件新增移动端简化变体：只渲染 prev/next，隐藏页码和页大小选择器

### 卡片字段规划

**域名卡片**：域名（标题）→ 状态 + 到期日 → 注册商/账户 → DNS 信息 → 备注 → 操作
**二级域名卡片**：完整地址（标题）→ IP → 用途 → 备注 → 操作
**账户卡片**：账户标识（标题）→ 类型 + 状态 → 注册站点 → 安全辅助 → 备注 → 操作
**账户站点卡片**：站点（标题）→ 状态 → 备注 → 操作

### 实现计划

1. **分页组件移动端适配**：给 `Pagination` 添加移动端简化渲染
2. **域名表格卡片化**：新建 `DomainCardList`，在 `DomainsPageClient` 中响应式切换
3. **二级域名表格卡片化**：新建 `SubdomainCardList`，在 `SubdomainManager` 中响应式切换
4. **账户表格卡片化**：新建 `AccountCardList`，在 `AccountsPageClient` 中响应式切换
5. **账户站点表格卡片化**：新建 `AccountSiteCardList`，在 `AccountDetailsPage` 中响应式切换
6. **站点表格检查**：确认站点管理卡片视图在移动端表现正常

## Acceptance Criteria

* [ ] 域名表格：md 以下显示卡片，以上显示表格
* [ ] 二级域名表格：md 以下显示卡片，以上显示表格
* [ ] 账户表格：md 以下显示卡片，以上显示表格
* [ ] 账户站点表格：md 以下显示卡片，以上显示表格
* [ ] 站点表格：移动端卡片视图正常
* [ ] 有分页的表格：移动端只显示上一页/下一页
* [ ] 长文本字段合理截断，不溢出
* [ ] 操作按钮在卡片上可正常使用
* [ ] lint + build 通过

## Definition of Done

* lint / typecheck / build 绿色
* 所有表格移动端卡片视图正常
* 无死代码

## Out of Scope

* 卡片视图的手动切换 toggle
* 新增编辑/删除等交互功能（保持现有交互不变）
* 平板端特殊适配
* 卡片内点击展开详情

## Decision (ADR-lite)

**Context**: 移动端表格体验差，需要卡片化展示
**Decision**: 自动响应式切换，md 断点以下显示卡片，新建独立卡片组件而非在表格组件内条件渲染
**Consequences**: 每个表格多一个卡片组件文件，但关注点分离清晰，表格逻辑不受影响

### 组件拆分原则（硬约束）

- 表格组件（Table）和卡片组件（CardList）**必须**是独立文件，不允许在同一个文件中条件渲染两种视图
- 父组件（PageClient）只负责响应式切换，不包含卡片渲染逻辑
- 命名：`<Entity>CardList.tsx`，放在对应 entity 的 components 目录下

## Technical Notes

* 参考：`components/sites/SiteCategoryCardView.tsx`（已有卡片模式）
* 断点：`md`（768px）
* 卡片组件命名规范：`<Entity>CardList.tsx`，放在对应 entity 目录下
