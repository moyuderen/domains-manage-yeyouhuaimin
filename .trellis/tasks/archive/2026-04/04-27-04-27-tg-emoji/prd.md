# tg模板添加emoji装饰

## Goal

为 Telegram 通知模板中的标题、分隔符、域名状态提示添加适当的 emoji，使消息在视觉上更清晰、更有辨识度，同时不破坏现有的 HTML 格式和消息分割逻辑。

## What I already know

* 模板文件: `lib/telegram.ts`
* 两个构建函数: `buildExpiryNotification()` (正式通知) 和 `buildTestMessage()` (测试消息)
* 域名块由 `formatDomainBlock()` 格式化，区分已过期/即将到期两种状态
* 消息使用 Telegram HTML parse mode (`<b>`, `<i>`, `<code>`)
* 消息有 4096 字符上限，已有分割逻辑

## Requirements (evolving)

* 为标题、分隔符、域名状态标签添加 emoji
* 已过期和即将到期使用不同语义的 emoji（如红色警示 vs 黄色提醒）
* 保持现有 HTML 标签和消息结构不变
* emoji 不应显著增加消息长度影响分割逻辑

## Acceptance Criteria (evolving)

* [ ] `buildExpiryNotification()` 输出的消息包含 emoji
* [ ] `buildTestMessage()` 输出的消息包含 emoji，与正式通知风格一致
* [ ] lint / build 通过

## Definition of Done

* Lint / typecheck / build green
* 视觉效果通过测试通知验证

## Out of Scope

* 不改变消息结构、字段顺序
* 不引入新依赖
* 不修改 UI 设置页面

## Technical Notes

* 涉及文件: `lib/telegram.ts` — `formatDomainBlock()`, `buildExpiryNotification()`, `buildTestMessage()`
* Telegram HTML parse mode 支持原生 emoji（Unicode）
* 需注意 emoji 会占用更多字符数，但当前消息通常远低于 4096 上限
