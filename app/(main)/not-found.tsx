export default function NotFound() {
  return (
    <div className="bg-card rounded-2xl border p-8 text-center shadow-sm">
      <h2 className="text-foreground text-xl font-semibold">页面不存在</h2>
      <p className="text-muted-foreground mt-2 text-sm">请从侧边栏返回域名管理或监测看板。</p>
    </div>
  )
}
