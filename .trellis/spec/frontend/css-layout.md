# CSS 与布局

本文档介绍域名管理平台的 CSS 模式与响应式设计规范。

## TailwindCSS 4

项目使用 TailwindCSS v4 与 PostCSS。配置位于 `globals.css`，不使用单独的 `tailwind.config.js`。

## 工具函数

使用 `lib/utils.ts` 中的 `cn()` 进行条件类名合并：

```typescript
import { cn } from '@/lib/utils'

<div className={cn(
  'rounded-lg border bg-card p-4',
  isActive && 'border-primary',
  className
)}>
```

`cn()` 结合了 `clsx` 和 `tailwind-merge`，能正确处理 Tailwind 类名冲突。

## 布局模式

### 页面布局

页面各区块之间使用 `space-y-6` 进行纵向间距控制：

```typescript
<div className="space-y-6">
  <Toolbar />
  <Table />
  <Pagination />
</div>
```

### 表单布局

表单使用单列布局，配合 `FieldGroup` 和 `gap-4`：

```typescript
<FieldGroup className="gap-4">
  <Field>
    <FieldLabel>名称</FieldLabel>
    <Input {...register('name')} />
    <FieldError>{errors.name?.message}</FieldError>
  </Field>
</FieldGroup>
```

### 响应式模式

```typescript
// 移动端纵向堆叠，桌面端横向排列
<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

// 响应式网格列数
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

### 对话框尺寸

对话框使用 `sm:max-w-xl`，超出内容区域时可滚动：

```typescript
<DialogContent className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden sm:max-w-xl">
  <DialogHeader>...</DialogHeader>
  <form className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <FieldGroup className="min-h-0 flex-1 overflow-y-auto pr-1">
      {/* 可滚动的表单内容区 */}
    </FieldGroup>
    <div className="flex justify-end gap-3 border-t pt-4">
      {/* 固定底部按钮区 */}
    </div>
  </form>
</DialogContent>
```

## 暗黑模式

通过 `next-themes` 支持主题切换。在 `globals.css` 中使用 CSS 变量定义亮色/暗色配色。组件使用语义化色彩类名（`bg-card`、`text-muted-foreground`、`border-primary`）。

## 动画

使用 Framer Motion 实现进入/退出动画。保持动画简洁且具有实际意义。

## 反模式

- 使用内联 `style` 而非 Tailwind 类名
- 使用像素值而非 Tailwind 间距比例
- 为组件创建 CSS Modules 或独立 CSS 文件
- 硬编码颜色值，而非使用 CSS 变量或语义化类名
- 多列表单布局（项目统一使用单列布局）
