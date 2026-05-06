# 身份认证

域名管理平台后端身份认证，采用共享访问密钥机制。

## 架构

应用使用简单的访问密钥（而非用户账号体系）：

```
lib/auth/access.ts          # 通用：verifyAccessKey、会话创建与校验
lib/auth/access-server.ts   # 仅服务端：cookie 管理、requireAccess
app/actions/auth.ts          # Server Actions：登录、登出
middleware.ts                # 路由保护
```

## requireAccess()

每个 Server Action 必须在第一行调用 `requireAccess()`：

```typescript
// lib/auth/access-server.ts
export async function requireAccess() {
  if (!(await hasAccessSession())) {
    throw new Error('无权限访问')
  }
}

// 在 Server Actions 中的用法
export async function createDomainAction(values: DomainFormValues) {
  await requireAccess()  // 若无有效会话 cookie 则抛出异常
  // ... 继续执行变更操作
}
```

## 会话机制

1. 用户通过登录表单提交访问密钥
2. `verifyAccessKey()` 使用恒定时间比较算法与 `process.env.ACCESS_KEY` 进行比对
3. 验证成功后，创建经 HMAC 签名的会话载荷（`{v, iat, exp}`）
4. 会话以 `httpOnly` cookie 形式存储，`sameSite` 设为 `'lax'`

## 中间件路由保护

`middleware.ts` 对每个访问 `(main)` 路由的请求检查会话 cookie。未经认证的请求将被重定向至 `/login`。

## 环境变量

| 变量 | 仅服务端 | 用途 |
|------|----------|------|
| `ACCESS_KEY` | 是 | 共享访问密钥 |
| `ACCESS_SESSION_SIGNING_KEY` | 是 | 会话 cookie 的 HMAC 签名密钥 |
| `ACCESS_SESSION_MAX_AGE_SECONDS` | 是 | 会话有效时长（默认：8 小时） |

## CRON_SECRET 鉴权（Route Handler）

外部服务（如 cron 调度器）调用 Route Handler 时，无法携带用户 session cookie。使用 `CRON_SECRET` 环境变量通过 `Authorization` 头鉴权：

```typescript
// Route Handler 中验证
const authHeader = request.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

调用方式：

```bash
curl -H "Authorization: Bearer <your-cron-secret>" \
  https://your-domain.com/api/cron/domain-expiry-check
```

### 规则

- `CRON_SECRET` 为仅服务端环境变量，不可加 `NEXT_PUBLIC_` 前缀
- 服务启动前必须检查 `CRON_SECRET` 是否配置，未配置返回 500
- 此模式仅用于 Route Handler，Server Actions 仍使用 `requireAccess()`

## 安全性

- 使用恒定时间比较进行密钥验证（防止时序攻击）
- HMAC-SHA256 会话签名
- `httpOnly` cookie（JavaScript 无法访问）
- 生产环境启用 `secure` 标志
- 会话版本号，支持向前兼容
