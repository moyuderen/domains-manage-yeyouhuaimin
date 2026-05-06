'use client'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="bg-card border-destructive/30 rounded-2xl border p-8 text-center shadow-sm">
      <h2 className="text-foreground text-xl font-semibold">页面加载失败</h2>
      <p className="text-muted-foreground mt-2 text-sm">{error.message || '请检查 Supabase 配置与表结构。'}</p>
      <button className="bg-foreground text-background mt-4 rounded-xl px-4 py-2 text-sm font-medium" onClick={reset}>重试</button>
    </div>
  )
}
