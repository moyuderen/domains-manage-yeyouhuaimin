# Webhook 通知通道

## Goal

在现有通知系统中新增 Webhook 通道，与 Telegram 并列独立，支持 4 种 Payload 格式（通用/Discord/飞书/钉钉），用户可启用任一或同时启用多个通道。

## What I already know

- 当前通知架构已完成模板→渲染器→发送器抽离，仅实现 Telegram 通道
- `types/notification.ts` 已预定义 `'webhook'` 为合法 channelKey
- `CHANNEL_SENDERS` 注册机制支持扩展（`lib/events/sinks/notification.ts`）
- 数据层已有 `notification_endpoints` 表，按 channelKey 唯一约束，支持多 endpoint
- 通知设置页面已有 Telegram Card 的完整模式（开关、配置、测试）
- 域名到期 cron 有 early-return 检查，需改为多通道检查

## Assumptions (temporary)

- 每个 Webhook 只配置一个 URL（不支持多 URL）
- v1 不支持自定义 headers
- v1 不做发送重试（上层 `processPendingNotificationDeliveries` 兜底）
- Secret 为可选，用于 HMAC-SHA256 签名

## Decisions

- **Secret 字段策略**：所有 format 共用一个 `secret` 字段。Generic 用它做 HMAC-SHA256 签名（`X-Webhook-Signature` header）；飞书/钉钉用它做平台签名校验；Discord 忽略。UI 文案随 format 动态变化（如"签名密钥（飞书开启签名校验时必填）"）。
- **测试按钮**：只保留"发送测试消息"，不单独做"验证 URL"。与 Telegram 测试发送行为一致。
- **签名实现**：签名逻辑统一在 sender 层按 format 分支处理。渲染器只负责 payload 格式。Generic → `X-Webhook-Signature` header；飞书/钉钉 → URL query 参数 `timestamp+sign`。
- **Endpoint 数量**：v1 保持单 endpoint（一个 Webhook URL + 一种 format）。多平台推送留到未来扩展。

## Requirements (evolving)

- 新建 `lib/notifications/webhook.ts`（渲染器 + sender）
- 新建 `schemas/webhookSchemas.ts`（配置校验）
- 新建 `app/actions/webhook.ts`（Server Actions）
- 修改 channel sender 注册、catalog channelKeys、settings 类型、数据层、UI、cron 检查
- 支持 4 种 Payload 格式：generic / discord / feishu / dingtalk
- 强制 HTTPS，可选 HMAC-SHA256 签名

## Acceptance Criteria (evolving)

- [ ] lint + build 通过
- [ ] 设置页面 Telegram 和 Webhook 各有独立开关
- [ ] 单通道启用/双通道同时启用均可正常推送
- [ ] 4 种 Payload 格式均可正确发送
- [ ] 测试发送按钮正常工作
- [ ] 域名到期 cron 推送到所有已启用通道

## Definition of Done

- Lint / typecheck / build green
- 无死代码和重复 helper
- server/client 边界清晰

## Out of Scope (explicit)

- 自定义 headers
- 发送重试机制
- 站内 inbox / 已读未读

## Technical Notes

- 渲染器为纯函数，输出 JSON 对象；sender 负责 HTTP 发送和签名
- 签名使用 Node.js `crypto` 模块（服务端），非 `crypto.subtle`
- 参照 Telegram 完整模式：types → schema → data → actions → UI
