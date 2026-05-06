# 站点管理卡片视图 - 常用站点功能

## Goal

在站点管理页面的卡片视图顶部新增"常用站点"区域，用户可通过星标按钮将站点添加到常用，支持拖拽排序和自由增删，打造快捷访问入口。

## Requirements

- 卡片视图顶部新增"常用站点"独立区域，位于分类锚点导航之前
- 每张站点卡片增加星标/收藏按钮，点击添加/移除常用
- 常用站点区域内支持拖拽排序（@dnd-kit）
- 排序结果持久化到数据库
- 不限制常用站点数量，顶部区域自适应高度
- 新增/移除/排序操作后 UI 即时更新（乐观更新）

## Acceptance Criteria

- [ ] 卡片视图顶部展示"常用站点"区域
- [ ] 站点卡片上有星标按钮，点击可添加/移除常用
- [ ] 常用站点已添加时星标为高亮状态
- [ ] 常用站点可拖拽排序，排序后持久化
- [ ] 移除常用后站点卡片星标恢复未选中状态
- [ ] 常用站点为空时显示空状态提示
- [ ] Lint / build 通过，类型安全

## Definition of Done

- Lint / build 通过
- 类型安全，无 any
- Server/Client 边界清晰
- DnD 库安装配置完成

## Decision (ADR-lite)

**Context**: 需要确定常用站点的 UI 布局、交互方式和数量策略
**Decision**:
1. 布局：卡片视图顶部独立区域（方案 A）
2. 交互：星标按钮添加/移除 + 常用区域内拖拽排序（方式 1）
3. 数量：无上限限制
**Consequences**: 简单直觉的交互，实现复杂度适中，顶部区域高度随数量自适应

## Out of Scope

- 多用户个性化常用站点（暂为全局）
- 常用站点内分组
- 拖拽进入常用区域（跨区域拖拽）

## Technical Approach

### 数据库
新建 `favorite_sites` 表：
```sql
create table public.favorite_sites (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  position int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint favorite_sites_site_id_unique unique (site_id)
);
```

### DnD 库
安装 `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`

### 文件变更
- `supabase/schema.sql` — 新增表定义
- `lib/data/sites.ts` — 新增常用站点的 CRUD 数据层函数
- `lib/mappers/site.ts` — 如需映射 favorite 数据
- `app/actions/sites.ts` — 新增常用站点的 Server Actions
- `components/sites/SiteCategoryCardView.tsx` — 顶部常用区域 + 星标按钮 + DnD
- `types/site.ts` — 如需新类型

### 关键文件
- `components/sites/SiteCategoryCardView.tsx` — 卡片视图主组件
- `components/sites/SitesPageClient.tsx` — 站点页面客户端壳
- `lib/data/sites.ts` — 站点数据层
- `types/site.ts` — 站点类型定义
- `supabase/schema.sql` — 数据库 schema
