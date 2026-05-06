# Telegram 机器人推送通知（MVP：域名到期定时提醒）

## Goal

在系统设置的通知管理模块中集成 Telegram Bot，实现域名到期定时提醒推送。后续迭代再增加事件触发的即时通知。

## Decision (ADR-lite)

**Context**: 需要选择 Telegram Bot 集成方式和定时调度机制
**Decision**:
- 直接 fetch 调用 Bot API，零第三方依赖
- 外部 Cron 调用 Route Handler 做域名到期检查
- 配置存 settings 表
**Consequences**: 实现简洁；未来如需 bot 交互命令可引入 grammy

## Requirements

### 通知配置
- 系统设置中可配置 Telegram Bot Token 和 Chat ID
- 通知总开关
- 支持发送测试消息验证连通性
- 辅助获取 Chat ID（调用 getUpdates API）

### 域名到期提醒
- 外部 Cron 每日调用 API 端点检查域名到期状态
- 即将到期（提前 N 天）和已到期域名推送提醒
- API 端点需鉴权（CRON_SECRET）

### 定时发送
- 可配置每日发送时间（整点，0-23 时）
- 可配置时区，默认 Asia/Shanghai（北京时间）
- 外部 Cron 每小时调用端点，端点判断当前小时（配置时区）是否匹配
- 匹配则发送，不匹配则跳过

### 技术要求
- 消息支持 HTML 格式化
- Bot Token 不暴露在客户端代码
- 统一 `lib/telegram.ts` 模块

## Acceptance Criteria

- [ ] 设置页通知设置区块可配置 Bot Token、Chat ID
- [ ] 通知开关可用
- [ ] 可配置发送时间（整点）和时区
- [ ] 配置后可发送测试消息验证连通性
- [ ] 辅助获取 Chat ID 功能可用
- [ ] 域名到期 Route Handler 可被外部 cron 调用
- [ ] Bot Token 不暴露在客户端代码中
- [ ] 消息格式清晰（域名、到期日期、剩余天数）

## Definition of Done

- Lint / typecheck / build 通过
- 无死代码和未使用的依赖
- Server/client 边界清晰

## Out of Scope

- 域名/DNS/账号/站点变更即时通知（后续迭代）
- Telegram bot 交互命令
- 其他通知渠道
- 通知历史记录
- 外部 Cron 服务的部署配置

## Technical Notes

### 新增文件
- `lib/telegram.ts` — Telegram 发送模块（fetch + 消息模板）
- `app/api/cron/domain-expiry-check/route.ts` — 域名到期检查端点
- `app/actions/telegram.ts` — 配置相关 Server Actions
- `components/settings/notification-settings.tsx` — 通知设置组件

### 修改文件
- `app/(main)/settings/page.tsx` — 替换通知设置占位
- `lib/data/settings.ts` — 新增 Telegram 配置查询
- `schemas/telegramSchemas.ts` — 配置校验
- `.env.example` — 新增 CRON_SECRET

### 现有相关文件
- 设置页: `app/(main)/settings/page.tsx`
- 设置数据访问: `lib/data/settings.ts`
- 域名状态计算: `lib/domainStatus.ts`
