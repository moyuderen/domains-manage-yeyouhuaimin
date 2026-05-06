-- 移除 domains 表中的冗余文本字段
-- 这些字段的信息现在通过外键关联从 sites/accounts 表映射获取

alter table public.domains
  drop column if exists registrar,
  drop column if exists registrar_account,
  drop column if exists dns_provider,
  drop column if exists dns_account;
