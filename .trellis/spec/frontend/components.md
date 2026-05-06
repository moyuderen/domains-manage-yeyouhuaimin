# 组件开发规范

本文档涵盖域名管理平台所使用的组件模式。

## 服务端组件与客户端组件

### 数据获取默认使用服务端组件

`app/(main)/` 下的页面是服务端组件，负责获取数据并向下传递：

```typescript
// app/(main)/domains/page.tsx — 服务端组件
export default async function DomainsPage({ searchParams }) {
  const params = await searchParams
  const [result, sites, accounts] = await Promise.all([
    getDomains({ ...filters, page, pageSize }),
    getActiveSites(),
    getAllAccounts(),
  ])

  return <DomainsPageClient
    initialFilters={filters}
    paginatedDomains={result}
    sites={sites}
    accounts={accounts}
  />
}
```

### 交互逻辑使用客户端组件

仅在组件需要以下能力时才添加 `'use client'`：

- 事件处理器、表单、对话框
- `useState`、`useEffect`、`useTransition`
- 浏览器 API（`localStorage`、`window`）
- 需要客户端上下文的第三方库（Recharts、Sonner）

```typescript
// components/domains/DomainsPageClient.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export function DomainsPageClient({ initialFilters, paginatedDomains, sites, accounts }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  // ...
}
```

## Shadcn UI 组件

### 基础组件始终使用 Shadcn UI

UI 基础元件来自 `components/ui/`（Shadcn UI）。绝不手写 Button、Dialog、Table、Select 或类似的基础组件。

```typescript
// 正确 — 从 Shadcn UI 导入
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
```

### 优先使用官方 variant/size API

使用 Shadcn 内置的 `variant` 和 `size` 属性。避免对 API 已能处理的样式添加自定义 className 覆盖：

```typescript
// 正确 — 使用 variant API
<Button variant="outline" size="icon">
  <PlusIcon />
</Button>

// 错误 — 用自定义 className 处理 variant 已能解决的样式
<Button className="bg-transparent border hover:bg-gray-100">
  <PlusIcon />
</Button>
```

## 表单模式

所有表单采用 React Hook Form + Zod，结构如下：

```typescript
'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { domainSchema, defaultDomainValues } from '@/schemas/domainSchemas'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { toast } from 'sonner'

export function DomainFormDialog({ open, mode, initialValue, onClose }) {
  const [loading, setLoading] = useState(false)
  const form = useForm<DomainFormValues>({
    resolver: zodResolver(domainSchema),
    defaultValues: defaultDomainValues,
  })

  useEffect(() => {
    if (!open) return
    if (mode !== 'create' && initialValue) {
      form.reset(/* 映射后的值 */)
    } else {
      form.reset(defaultDomainValues)
    }
  }, [form, initialValue, mode, open])

  const { register, handleSubmit, control, formState: { errors } } = form

  const submit = async (values: DomainFormValues) => {
    setLoading(true)
    try {
      if (mode === 'edit') {
        await updateDomainAction(initialValue.id, values)
        toast.success('更新成功')
      } else {
        await createDomainAction(values)
        toast.success('添加成功')
      }
      onClose(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent>
        <form onSubmit={handleSubmit(submit)}>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.name) || undefined}>
              <FieldLabel htmlFor="name">名称</FieldLabel>
              <Input id="name" {...register('name')} aria-invalid={Boolean(errors.name)} />
              <FieldError>{errors.name?.message}</FieldError>
            </Field>
            {/* 更多字段 */}
          </FieldGroup>
          <Button type="submit" disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

### 关键表单模式

1. **Zod schema 放在 `schemas/*`**，在客户端校验和服务端 action 之间共享
2. **默认值**与 schema 一起从 schema 文件导出
3. **`useEffect` 重置表单**：对话框打开时执行（同时处理新建/编辑/克隆模式）
4. **Server Actions** 在提交处理器中配合 `try/catch` 和 `toast` 调用
5. **Field 组件**将标签、输入框和错误信息包裹在一起，通过 `data-invalid` 控制样式
6. **Controller** 用于 Select、Calendar 及其他受控组件
7. **单列布局**适用于所有表单（已确认的项目偏好）

## 对话框与抽屉模式

### 表单使用 Dialog

```typescript
<Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
  <DialogContent className="sm:max-w-xl">
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
    {/* 表单内容 */}
  </DialogContent>
</Dialog>
```

### 危险操作使用确认对话框

```typescript
<ConfirmDialog
  open={Boolean(deletingItem)}
  title="删除域名"
  description={`确认删除 ${deletingItem?.name} 吗？`}
  onClose={() => setDeletingItem(null)}
  onConfirm={() => {
    startTransition(async () => {
      await deleteDomainAction(deletingItem.id)
      router.refresh()
      toast.success('删除成功')
    })
  }}
  loading={isPending}
/>
```

## Toast 通知

所有用户反馈使用 Sonner：

```typescript
import { toast } from 'sonner'

toast.success('操作成功')
toast.error(error instanceof Error ? error.message : '操作失败')
```

## 图标

所有图标使用 Lucide React：

```typescript
import { PlusIcon, CalendarIcon, TrashIcon } from 'lucide-react'
```

## 正确与错误模式对比

### 服务端组件与客户端组件

```typescript
// 正确 — 页面文件是服务端组件，获取数据后委托给客户端组件
export default async function DomainsPage({ searchParams }) {
  const result = await getDomains(filters)
  return <DomainsPageClient paginatedDomains={result} />
}

// 错误 — 仅为了获取数据就将页面文件标记为 'use client'
'use client'
export default function DomainsPage() {
  const [domains, setDomains] = useState([])
  useEffect(() => {
    fetch('/api/domains').then(r => r.json()).then(setDomains)
  }, [])
  return <DomainTable domains={domains} />
}
```

### Zod Schema 的位置

```typescript
// 正确 — schema 从 schemas/* 导入
import { domainSchema, defaultDomainValues } from '@/schemas/domainSchemas'
const form = useForm({ resolver: zodResolver(domainSchema) })

// 错误 — schema 在组件内部内联定义
const schema = z.object({ name: z.string().min(1) })
const form = useForm({ resolver: zodResolver(schema) })
```

## Loading Skeleton 同步

每个页面的 `loading.tsx` 必须与页面实际布局保持一致。页面结构包含响应式双视图（桌面表格 + 移动端卡片）时，Skeleton 也必须包含对应的双视图：

```typescript
{/* Desktop: Table Skeleton */}
<div className="hidden min-h-0 flex-1 md:flex md:flex-col">
  <Card>
    <Table>...</Table>
    {/* 桌面端分页 Skeleton */}
  </Card>
</div>

{/* Mobile: Card Skeleton */}
<div className="flex min-h-0 flex-1 flex-col md:hidden">
  <Card>
    <div className="space-y-3">
      {Array.from({ length: CARD_COUNT }, (_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4 space-y-3">...</div>
      ))}
    </div>
    {/* 移动端分页 Skeleton（只有上一页/下一页） */}
  </Card>
</div>
```

**改动页面布局时必须同步更新的内容：**
- 新增/删除/重排了表格列 → 更新桌面端 Table Skeleton
- 新增/删除/重排了卡片字段 → 更新移动端 Card Skeleton
- 页面新增了筛选区、操作栏 → 更新顶部工具栏 Skeleton
- 分页行为变化 → 更新分页区 Skeleton

## 反模式

- 手写 Button、Input、Select、Table 或其他基础 UI 组件
- 当 Shadcn variant/size API 已能满足需求时，仍添加自定义 className 覆盖
- 在仅做数据获取的页面文件中使用 `'use client'`
- 在组件内部直接写 Supabase 查询
- 使用浏览器原生 `alert()` 或 `confirm()` 代替 Dialog/ConfirmDialog
- 创建自定义 toast/通知系统而不使用 Sonner
- 修改页面布局但忘记同步更新对应的 `loading.tsx` Skeleton
