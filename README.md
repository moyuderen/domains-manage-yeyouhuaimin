# Domain Manage

基于 Next.js App Router + Supabase 的域名管理系统，用来维护域名基础信息、子域名、到期风险和看板统计。

## 功能

- 域名增删改查
- 子域名增删改查
- 到期状态自动派生（正常 / 即将到期 / 已过期）
- 看板统计与图表概览
- JSON 导入 / 导出
- 服务端读取数据，站内写操作走 Server Actions

## 技术栈

- Next.js App Router
- TypeScript
- Supabase
- React Hook Form
- Zod
- Recharts
- Framer Motion
- Tailwind CSS

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

如果你暂时还没配 Supabase，当前项目会自动回退到内置 mock 数据，页面可以先正常预览样式和交互。


复制 `.env.example` 为 `.env.local`，并填写：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

说明：

- `NEXT_PUBLIC_SUPABASE_URL`：Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`：Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`：仅服务端使用，可先留空；不要暴露到客户端

### 3. 初始化 Supabase 数据库

在 Supabase SQL Editor 中执行：

- `supabase/schema.sql`

该脚本会创建：

- `domains`
- `subdomains`
- `updated_at` 触发器
- 基础索引
- 开发环境用的宽松 RLS policy

当前表约束与应用保持一致：

- `domains.name` 唯一
- 域名保存时要求小写且去首尾空格
- `expiry_date >= registration_date`
- `subdomains.domain_id` 外键关联并 `on delete cascade`
- `subdomains` 按 `(domain_id, subdomain)` 唯一

### 4. 启动开发环境

```bash
npm run dev
```

默认访问：

- `/`：域名管理页
- `/dashboard`：看板页

## 构建与检查

```bash
npm run lint
npm run build
```

## 导入导出

### 导出

前端通过 `/api/export` 下载 JSON，返回格式：

```json
{
  "version": 1,
  "exportedAt": "2026-04-04T00:00:00.000Z",
  "domains": []
}
```

### 导入

前端选择 JSON 文件后，文本会提交给 Server Action，在服务端完成：

- JSON 解析
- Zod 校验
- `domains` / `subdomains` upsert
- 页面重验证

## 定时任务

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

## 部署到 Vercel

### 1. 创建 Supabase 项目

创建新项目后，执行 `supabase/schema.sql`。

### 2. 配置 Vercel 环境变量

在 Vercel 项目里添加：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

### 3. 部署

仓库连接到 Vercel 后直接部署即可。该项目不依赖自建服务。

### 4. 配置 Vercel Cron

仓库根目录已提供 `vercel.json`，以该文件为准。

当前配置说明：

- 路径：`/api/cron/domain-expiry-check-daily`
- 调度：`5 1 * * *`
- 语义：按 UTC 解释时，对应上海时间每天 09:05 触发一次
- 鉴权：配置了 `CRON_SECRET` 后，Vercel 会自动携带 `Authorization: Bearer $CRON_SECRET`

说明：

- Vercel 只触发新的 `domain-expiry-check-daily` job
- 旧的 `domain-expiry-check` 仍然保留，适合手动触发或其他按小时唤醒的平台继续复用
- daily job 会直接执行当天检查，不再要求命中 `notifyHour`

## 其他平台接入

### 普通服务器

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

### Docker

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

### GitHub Actions

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

## 架构约定

- 页面级读取优先放在 Server Components
- 站内增删改优先使用 Server Actions
- 下载类场景使用 Route Handlers
- 客户端组件只负责表单、弹窗、抽屉、图表和浏览器交互
- Supabase 查询统一收敛在 `lib/data/*` 与 `lib/supabase/*`

## 后续建议

当前 `supabase/schema.sql` 包含的是便于联调的开发策略：

- 已开启 RLS
- 默认放开了 `domains` 和 `subdomains` 的所有操作

如果后续接入登录体系，应尽快改成基于用户身份的正式 policy。