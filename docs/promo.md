# 推广文案

---

谁能想到，免费域名薅多了也是一种痛苦。

de5.net、ccwu.cc、cc.cd……便宜是真的便宜，乱也是真的乱。有的在 Cloudflare，有的在 Namesilo，有的连注册在哪都忘了。到期提醒邮件被 Gmail 扔进垃圾箱，等发现的时候域名已经被抢注挂上了菠菜页面。

市面上翻了一圈，没找到合心意的工具。要么功能太重像航母，要么只支持某一家注册商。于是某个深夜，打开 Cursor，一阵 Vibe Coding，就有了这个项目。

它能干什么？域名到期前通过 Telegram/Email/Webhook 轮番轰炸提醒；仪表盘一眼看清哪些域名快凉了、DNS 分布、注册商分布；还有完整的操作日志审计，知道自己上次改 A 记录是什么时候手滑的。

技术栈：Next.js + Supabase + Shadcn UI，目前仅支持 Vercel 部署。

项目是个人业余开发，难免有 bug，还请大佬们海涵。开源出来，欢迎提 PR、提 Issue，也欢迎拿去二开改造。

GitHub: https://github.com/yeyouhuaimin/domains-manage
