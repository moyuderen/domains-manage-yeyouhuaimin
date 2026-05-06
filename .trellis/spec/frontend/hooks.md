# Hooks

本文档涵盖域名管理平台所使用的自定义 Hook 模式。

## Hook 使用概览

本项目使用的自定义 Hook 数量很少。大部分状态逻辑直接写在 PageClient 组件中。主要使用的 Hook 包括：

- **React 内置 Hook**：`useState`、`useEffect`、`useMemo`、`useRef`、`useTransition`
- **Next.js Hook**：`useRouter`、`usePathname`、`useSearchParams`
- **Zustand store**：`useSettingsStore`
- **React Hook Form**：`useForm`、`Controller`

## 常用模式

### useTransition 用于异步数据变更

```typescript
const [isPending, startTransition] = useTransition()

const handleDelete = (id: string) => {
  startTransition(async () => {
    try {
      await deleteDomainAction(id)
      router.refresh()
      toast.success('删除成功')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
    }
  })
}
```

### useMemo 用于派生数据

```typescript
const allAccounts = useMemo(
  () => dedupeById([...accounts, ...createdAccounts])
    .sort((a, b) => a.identifier.localeCompare(b.identifier)),
  [accounts, createdAccounts],
)

const selectedCount = useMemo(
  () => domains.filter((d) => selectedIds.includes(d.id)).length,
  [domains, selectedIds],
)
```

### useEffect 用于对话框重置

```typescript
useEffect(() => {
  if (!open) return
  if (mode !== 'create' && initialValue) {
    form.reset(mapToFormValues(initialValue))
  } else {
    form.reset(defaultValues)
  }
}, [form, initialValue, mode, open])
```

### useEffect 用于 localStorage 同步

```typescript
useEffect(() => {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored) setVisibleColumns(JSON.parse(stored))
}, [])

useEffect(() => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns))
}, [visibleColumns])
```

### useRef 用于非响应式状态

```typescript
const expiryDateTouchedRef = useRef(false)

const handleExpiryDateChange = (value: string) => {
  expiryDateTouchedRef.current = value.length > 0
  setValue('expiryDate', value)
}
```

## 何时提取自定义 Hook

仅在以下情况下才提取自定义 Hook：

1. 相同的有状态逻辑在 3 个及以上组件中重复出现
2. 该逻辑足够复杂，提取后能显著提升可读性

不要过早提取 Hook。

## 正确与错误模式对比

### 避免过度提取 Hook

```typescript
// 正确 — 简单状态直接内联在组件中
const [dialogOpen, setDialogOpen] = useState(false)
const [activeDomain, setActiveDomain] = useState<Domain | null>(null)

// 错误 — 将单个 useState 封装成自定义 Hook
function useDialogOpen() {
  const [open, setOpen] = useState(false)
  return { open, setOpen }
}
```

### 数据获取应在服务端组件中进行

```typescript
// 正确 — 服务端组件获取数据后以 props 传递给客户端组件
// app/(main)/domains/page.tsx
export default async function DomainsPage() {
  const result = await getDomains(query)
  return <DomainsPageClient paginatedDomains={result} />
}

// 错误 — 在客户端组件中通过 useEffect 获取数据
'use client'
function DomainsPage() {
  const [domains, setDomains] = useState([])
  useEffect(() => {
    fetch('/api/domains').then(r => r.json()).then(setDomains)
  }, [])
}
```

## 反模式

- 创建仅包裹单个 `useState` 调用的自定义 Hook
- 使用 `useEffect` 进行数据获取（应改用服务端组件）
- 不加判断地对每个函数都使用 `useCallback`
- 当 Zustand 或 props 已经足够时，创建 Context Provider
