---
name: no-real-domains-in-tests-or-mocks
description: 测试与 mock 示例不要使用用户真实域名，即使用户只是举例说明场景。
metadata:
  type: feedback
---
测试与 mock 示例不要使用用户真实域名，即使用户只是举例说明场景。

**Why:** 用户明确说明之前提到的真实域名只是示例，不希望被写入测试或 mock 数据。
**How to apply:** 以后为该项目补测试、fixture、seed、mock 或截图演示数据时，统一使用保留域名或明显虚构的样例，并避免复用用户消息里的真实域名。