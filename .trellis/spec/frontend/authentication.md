# 认证

本文档介绍域名管理平台所使用的访问密钥门控机制。

## 概述

应用使用简单的访问密钥机制（而非用户账号体系）。一个共享密钥控制对整个应用的访问权限。

## 架构

```
lib/auth/access.ts          # 共享认证逻辑（验证、签名、会话载荷）
lib/auth/access-server.ts   # 仅服务端（通过 next/headers 读写 cookie）
app/actions/auth.ts          # 登录/登出的 Server Actions
middleware.ts                # 路由保护（无会话时重定向至 /login）
```

## 访问流程

1. 用户在 `/login` 页面输入访问密钥
2. Server Action 将密钥与 `process.env.ACCESS_KEY` 进行校验
3. 验证通过后，创建一个经过 HMAC 签名的会话 Cookie
4. Middleware 在每次请求 `(main)` 路由时检查该 Cookie
5. Server Actions 在执行任何变更操作前调用 `requireAccess()`

## 服务端访问检查

每个 Server Action 必须在第一行调用 `requireAccess()`：

```typescript
// app/actions/domains.ts
'use server'

export async function createDomainAction(values: DomainFormValues) {
  await requireAccess()  // 无有效会话时抛出错误
  const parsed = domainSchema.parse(values)
  await createDomain(parsed)
  revalidatePath('/')
}
```

## 环境变量

| 变量 | 用途 | 是否必填 |
|----------|-------|----------|
| `ACCESS_KEY` | 用户输入的共享访问密钥 | 是 |
| `ACCESS_SESSION_SIGNING_KEY` | 会话 Cookie 签名所用的 HMAC 密钥 | 是 |
| `ACCESS_SESSION_MAX_AGE_SECONDS` | 会话有效期（默认：8 小时） | 否 |

## 安全规则

- 绝不在客户端代码中暴露 `ACCESS_KEY` 或 `ACCESS_SESSION_SIGNING_KEY`
- 会话 Cookie 设置为 `httpOnly`、`sameSite: 'lax'`，生产环境下启用 `secure`
- 密钥比对使用常量时间等值比较，防止时序攻击
- 会话载荷包含版本号和过期时间，以保证向前兼容性

## 反模式

- 在任何 Server Action 中跳过 `requireAccess()`
- 使用 `===` 而非常量时间比较来对比访问密钥
- 将会话数据存储在客户端可访问的存储中
