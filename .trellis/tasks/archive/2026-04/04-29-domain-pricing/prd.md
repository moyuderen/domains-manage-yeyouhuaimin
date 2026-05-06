# domain-pricing: 域名付费/免费标识与金额字段

## Goal

为域名增加付费/免费标识。付费域名需记录购买金额和续费金额，列表中付费域名名称以黄金色高亮区分。

## What I already know

* 当前 `domains` 表、Zod schema、类型定义、表单均无付费/免费相关字段
* 域名列表在 `DomainTable.tsx` 中渲染，域名列为第一可见列（checkbox 之后）
* 表单在 `DomainFormDialog.tsx` 中，分为基本信息、注册信息、DNS信息、附加信息四个区块
* Supabase schema 在 `supabase/schema.sql`，需新增字段并写迁移脚本

## Assumptions (temporary)

* 付费/免费是一个布尔型标识（is_free）
* 购买金额和续费金额为数字类型，仅当 is_free=false 时有意义
* 金额精度用 numeric(10,2) 足够
* 默认为免费域名（向后兼容）

## Open Questions

* (none remaining)

## Requirements (evolving)

* Supabase 新增字段：is_free (bool, default true)、currency (text, default 'CNY')、purchase_price (numeric, nullable)、renewal_price (numeric, nullable)
* 支持币种：CNY / USD / EUR / JPY / GBP
* Zod schema 新增对应校验字段
* TypeScript 类型新增字段
* 域名表单：新增免费/付费切换，付费时显示币种选择、购买金额和续费金额输入
* 域名列表：付费域名名称以黄金色高亮，免费域名保持默认样式

## Acceptance Criteria (evolving)

* [ ] 新增/编辑域名时可选择免费/付费
* [ ] 付费时可选择币种（CNY/USD/EUR/JPY/GBP）并输入购买金额和续费金额
* [ ] 免费域名时金额和币种字段隐藏
* [ ] 列表中付费域名以黄金色高亮，免费域名保持默认样式
* [ ] 已有域名默认为免费，数据兼容

## Definition of Done

* Lint / typecheck / build green
* 无死代码
* server/client 边界清晰

## Out of Scope (explicit)

* 金额汇总统计（后续可做）
* 汇率转换
* 币种自定义添加

## Technical Notes

* 涉及文件：`supabase/schema.sql`、`supabase/migrations/`、`schemas/domainSchemas.ts`、`types/domain.ts`、`components/domains/DomainFormDialog.tsx`、`components/domains/DomainTable.tsx`、`lib/data/` 相关数据映射
