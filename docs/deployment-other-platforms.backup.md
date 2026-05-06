# 其他平台部署说明备份

这份文档用于备份当前暂不放入 README 的其他平台接入方式，后续需要时可再整理引用。

## 通用说明

当前内置的定时任务为域名到期检查，业务执行入口已抽离为平台无关 job，可通过 HTTP 或 CLI 调用。

当前有两个相关 job：

- `domain-expiry-check`：旧模式，保留 `notifyTimezone + notifyHour` 小时门控
- `domain-expiry-check-daily`：新模式，给 Vercel 每天一次触发使用，复用同一套业务逻辑，但不再要求命中 `notifyHour`

### CLI 入口

```bash
npm run job -- domain-expiry-check
npm run job -- domain-expiry-check-daily
```

可选地指定触发来源：

```bash
npm run job -- domain-expiry-check manual
npm run job -- domain-expiry-check server-cron
npm run job -- domain-expiry-check docker-cron
npm run job -- domain-expiry-check github-actions
npm run job -- domain-expiry-check vercel-cron

npm run job -- domain-expiry-check-daily manual
npm run job -- domain-expiry-check-daily vercel-cron
```

说明：

- `domain-expiry-check` 会在 job 内部继续判断 `notifyTimezone + notifyHour`，不是每次调用都会真正执行
- `domain-expiry-check-daily` 会直接执行当天检查，并继续使用 `notifyTimezone` 计算日报归属日期
- 两个 job 共用同一套业务内核：`lib/jobs/domain-expiry-check.ts`
- 运行 CLI 时同样需要服务端环境变量；`SUPABASE_SERVICE_ROLE_KEY` 为必需，`CRON_SECRET` 仅在调用 HTTP cron 路由时需要
- `job_runs.trigger_source` 会记录触发平台，例如 `vercel-cron`、`github-actions`、`server-cron`、`docker-cron`

## 普通服务器

可在系统 cron 中调用：

```bash
npm run job -- domain-expiry-check server-cron
```

示例 crontab（每小时第 5 分钟唤醒一次）：

```cron
5 * * * * cd /path/to/domain-manage && /usr/bin/npm run job -- domain-expiry-check server-cron >> /var/log/domain-expiry-check.log 2>&1
```

说明：

- 建议使用绝对路径
- 日志重定向到单独文件，便于排查
- 仍由 job 内部决定当前小时是否真正执行

## Docker

可在容器内定时执行：

```bash
npm run job -- domain-expiry-check docker-cron
```

如果使用宿主机 cron 调起容器，可参考：

```cron
5 * * * * docker exec <container-name> npm run job -- domain-expiry-check docker-cron >> /var/log/domain-expiry-check.log 2>&1
```

如果使用单独的调度容器，核心仍是执行同一个命令：

```bash
docker run --rm \
  -e NEXT_PUBLIC_SUPABASE_URL \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY \
  -e SUPABASE_SERVICE_ROLE_KEY \
  -e ACCESS_KEY \
  -e ACCESS_SESSION_SIGNING_KEY \
  -e ACCESS_SESSION_MAX_AGE_SECONDS \
  -e CRON_SECRET \
  <your-image> \
  npm run job -- domain-expiry-check docker-cron
```

## GitHub Actions

可在 workflow 中调同一个 CLI：

```bash
npm run job -- domain-expiry-check github-actions
npm run job -- domain-expiry-check-daily github-actions
```

仓库已提供示例 workflow：

- `.github/workflows/domain-expiry-check.yml`

使用前需要在 GitHub Actions Secrets 中配置：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ACCESS_KEY`
- `ACCESS_SESSION_SIGNING_KEY`
- `ACCESS_SESSION_MAX_AGE_SECONDS`
- `CRON_SECRET`

当前 workflow 只保留 `workflow_dispatch` 手动触发入口，不再自动 schedule 运行。

这些平台都只负责触发，具体业务执行仍统一走 `lib/jobs/domain-expiry-check.ts`。