# brainstorm: 域名表单自动关联站点账号

## Goal

在新增或编辑域名时，让注册站点与注册账号、DNS 站点与 DNS 账号自动联动，并在保存时把账号的 `sites` 关系补齐为站点 ID；同时明确历史账号站点关系从“站点名称”迁移到“站点 ID”后的补数据策略，避免新旧数据并存。

## What I already know

* 用户反馈：当前新增/编辑域名功能里，注册站点、注册账号、DNS 站点、DNS 账号没有自动关联。
* 用户期望：行为像账号管理中管理站点一样，选择站点后账号应能自动关联或联动。
* 现在域名表本身已经保存站点 ID：`types/domain.ts`、`lib/data/domains.ts` 中都是 `registrarSiteId` / `dnsSiteId` → `registrar_site_id` / `dns_site_id`。
* 当前历史迁移 `supabase/migrations/20260429150000_store_account_sites_by_site_id.sql` 已经准备了一版“按站点名称精确匹配 `sites.name`，把 `accounts.sites[*].site` 改成站点 ID”的 SQL。
* 账号侧现在的正式数据模型已经按站点 ID 工作：`types/account.ts` 的 `SiteEntry.site`、`lib/mappers/account.ts` 的 `normalizeAccountSites`、`lib/data/accounts.ts` 的 `contains('sites', [{ site: query.site }])` 都把它当 ID 使用。
* 已实现的域名保存联动会在 `app/actions/domains.ts` 调用 `ensureAccountSiteRelations`，把本次表单中的 `registrarAccountId + registrarSiteId`、`dnsAccountId + dnsSiteId` 补进账号 `sites`。

## Assumptions (temporary)

* 大部分历史脏数据是 `accounts.sites[*].site` 里仍然存放旧站点名称文本，而不是站点 ID。
* 域名表中的 `registrar_site_id` / `dns_site_id` 更可信，因为它们已经是外键 ID。
* 如果某条账号站点关系从未在任何域名里出现，仅靠遍历域名无法恢复它。

## Open Questions

* 无。

## Requirements (evolving)

* 新增域名时，注册站点与注册账号建立联动。
* 编辑域名时，注册站点与注册账号建立联动。
* 新增域名时，DNS 站点与 DNS 账号建立联动。
* 编辑域名时，DNS 站点与 DNS 账号建立联动。
* 联动体验参考账号管理中的站点管理模式。
* MVP 采用“联动 + 维护账号站点关系”：在域名表单选择账号时，允许把当前站点 ID 写入该账号的 `sites` 关联中，减少手动回到账号管理维护关系。
* 账号的站点关系以站点 ID 管理，而不是以站点名称文本管理，避免站点重命名后关联失效。
* 自动关系写入发生在域名表单提交时：新增/编辑域名保存成功时，再同步账号的 `sites` 关系，避免用户取消表单后留下关系变更。
* 当用户修改站点后，当前已选账号即使尚未关联新站点也保持选中；提交成功时把该站点补入该账号的 `sites`。
* 如果账号已关联对应站点，不重复写入。
* 同一个域名提交中，注册账号和 DNS 账号分别按各自站点补齐关系；如果两个字段指向同一账号，需要合并站点关系后一次性更新。
* 需要为历史账号站点关系提供一次性修复策略，避免改造后查询和展示同时遇到“名称”和“ID”两种格式。
* 历史修复范围采用“两步走”：先做名称 → ID 迁移，再遍历域名中的 `(accountId, siteId)` 关系补齐账号 `sites`。
* 历史修复时，如果旧名称条目和新 ID 条目可确认指向同一站点，需要合并去重为单条 ID 记录，而不是保留双份语义重复数据。
* 去重合并时，优先保留历史条目中已有的 `note` / `isActive` 等业务信息，避免补数把已有人工维护信息冲掉。

## Acceptance Criteria (evolving)

* [ ] 新增域名时选择注册站点后，注册账号可联动展示；当前已选账号不因站点变化被误清空。
* [ ] 编辑域名时已有注册站点/注册账号关系能正确展示，修改站点后账号关系保持选中，并在保存成功后补齐账号站点关系。
* [ ] 新增域名时选择 DNS 站点后，DNS 账号可联动展示；当前已选账号不因站点变化被误清空。
* [ ] 编辑域名时已有 DNS 站点/DNS 账号关系能正确展示，修改 DNS 站点后账号关系保持选中，并在保存成功后补齐账号站点关系。
* [ ] 保存域名成功后，相关账号的 `sites` 包含对应站点 ID，已有关系不会重复。
* [ ] 注册账号与 DNS 账号相同时，保存后该账号同时包含注册站点和 DNS 站点关系。
* [ ] 历史账号站点数据修复后，账号列表/详情/筛选展示不再依赖旧站点名称格式。
* [ ] 迁移执行后，域名中出现过的 `(accountId, siteId)` 关系会补齐到对应账号的 `sites` 中。
* [ ] 若同一站点同时存在旧名称条目和新 ID 条目，历史修复后账号 `sites` 中只保留一条对应的 ID 记录。
* [ ] 去重合并后，原有 `note` / `isActive` 等人工维护字段不会被无意义清空或覆盖。

## Definition of Done (team quality bar)

* Tests added/updated where appropriate.
* `npm run lint` 通过。
* build 通过。
* 修复类型错误，不用静默方式掩盖。
* 明确区分 server/client 边界。

## Technical Approach

* 在 `components/domains/DomainFormDialog.tsx` 中按当前选中站点 ID 过滤/排序账号候选：已关联该站点 ID 的账号优先展示，同时保留当前已选账号，避免修改站点后丢失选择。
* 在域名提交成功后执行账号站点关系同步：根据 `registrarAccountId + registrarSiteId`、`dnsAccountId + dnsSiteId` 计算需要补齐的 `SiteEntry`。
* 同步逻辑复用账号管理的 `SiteEntry` 数据结构，新增关系默认 `{ site: <siteId>, note: '', isActive: true }`。
* 账号管理页、账号表单、账号详情页和仪表盘展示通过 `siteId -> site.name` 映射显示名称。
* 账号关系更新优先放在服务端 action/data 层，保持客户端只负责表单联动与提交反馈。
* 如注册账号和 DNS 账号相同，在服务端合并两个站点 ID 后一次性更新该账号，避免覆盖。

## Research Notes

### 当前仓库里的已知事实

* `domains` 表已经使用 `registrar_site_id` / `dns_site_id` 外键，不存在“域名表还存站点名称”的问题。
* 当前迁移 SQL 只处理一种情况：`accounts.sites[*].site` 的值恰好等于 `sites.name`。
* 如果站点后来改过名、历史文本有别名/空格差异，名称匹配迁移可能漏掉。
* 反向遍历域名可以恢复“某账号曾和某站点一起出现在域名上”的关系，但无法恢复从未出现在任何域名里的手工账号站点关系。

### Feasible approaches here

**Approach A: 只做名称 → ID 迁移**

* How it works: 保留现有 SQL，通过 `sites.name` 精确匹配把旧文本替换成站点 ID。
* Pros: 最简单，纯 SQL，一次完成。
* Cons: 站点已改名、历史文本不规范、或原数据就不一致时会漏；漏掉的数据要后续人工修。

**Approach B: 先名称 → ID，再按域名回填缺失关系**（Chosen）

* How it works: 先跑现有 SQL；再遍历 `domains.registrar_* / dns_*`，把域名里出现过的 `(accountId, siteId)` 补进对应账号 `sites`。
* Pros: 能覆盖“名称迁移没命中但域名里仍有可信关联”的大部分历史数据；和这次域名保存联动的模型一致。
* Cons: 仍然无法恢复“只在账号管理里手填、从未被任何域名使用”的关系；需要再写一段补数脚本或迁移逻辑。

**Approach C: 不做单独补数，只依赖后续域名编辑/保存时渐进修复**

* How it works: 历史数据先不全量处理，之后谁被编辑到，谁在 `ensureAccountSiteRelations` 中被补齐。
* Pros: 实现最省，风险小。
* Cons: 历史列表、筛选、仪表盘会长期混杂旧数据；修复速度依赖人工操作，不可控。

## Decision (ADR-lite)

**Context**: 域名表单当前能选择站点和账号，但账号的 `sites` 关系需要在账号管理中手动维护；同时历史账号 `sites` 还可能残留旧站点名称格式。

**Decision**: 本任务的历史数据修复采用“两步走”：先做 `accounts.sites[*].site` 的名称 → ID 迁移，再遍历域名中的 `(registrarAccountId, registrarSiteId)` / `(dnsAccountId, dnsSiteId)` 关系，把缺失站点补回账号 `sites`。

**Consequences**: 能最大化利用现有可信域名数据提升历史一致性，并与之后域名保存时的自动补齐逻辑保持一致；历史补数过程中还需要处理“旧名称条目 + 新 ID 条目”的去重合并，并尽量继承已有 `note` / `isActive` 信息；同时明确其不会恢复“从未出现在域名里的纯手工关系”。

## Out of Scope (explicit)

* 不在本任务中做无法从现有站点表或域名表可靠推导出的历史关系猜测。
* 不改动账号管理页面的现有站点管理交互模式。
* 不新增长期后台同步任务；若需要历史补数，优先一次性迁移/脚本。

## Technical Notes

* 域名新增/编辑表单核心文件：`components/domains/DomainFormDialog.tsx`，统一承载 create/edit/clone，已有 `getSelectableAccounts`、快速新建站点/账号并回填的 `pending*Ref` 机制。
* 域名提交入口：`app/actions/domains.ts` 的 `createDomainAction` / `updateDomainAction`，通过 `domainSchema.parse(values)` 校验后调用 data 层。
* 域名数据持久化：`lib/data/domains.ts` 的 `createDomain` / `updateDomain`，负责把表单字符串转换为 DB payload。
* 账号历史迁移文件：`supabase/migrations/20260429150000_store_account_sites_by_site_id.sql`。
* 账号关联查询当前依赖 ID：`lib/data/accounts.ts` 中筛选站点使用 `contains('sites', [{ site: query.site }])`。
* 账号详情与列表展示通过 `siteId -> site.name` 映射展示名称：`components/accounts/AccountDetailsPage.tsx`、`components/accounts/AccountsPageClient.tsx`。
* 关键约束：继续保持 Server Actions 处理新增/更新；客户端组件只负责表单联动；Supabase 查询仍通过 `lib/data/*`。
