# 状态管理

本文档涵盖域名管理平台的状态管理模式。

## 状态分类

| 分类 | 工具 | 使用场景 |
|------|------|----------|
| 服务端状态 | 服务端组件 + `revalidatePath` | 来自 Supabase 的数据、页面初始加载 |
| URL 状态 | `searchParams` + `useSearchParams` | 筛选条件、分页、排序 |
| 客户端 UI 状态 | `useState` | 对话框、选中项、加载标志 |
| 共享客户端状态 | Zustand | 跨组件的客户端状态（如设置项） |
| 表单状态 | React Hook Form | 表单输入、校验 |

## 筛选与分页使用 URL 状态

筛选条件和分页信息存储在 URL search params 中。服务端组件负责读取，客户端组件负责更新：

### 服务端组件读取 searchParams

```typescript
// app/(main)/domains/page.tsx
export default async function DomainsPage({ searchParams }) {
  const params = await searchParams
  const filters: DomainFilters = {
    keyword: getSingleParam(params?.keyword) ?? '',
    status: isStatusValue(status) ? status : 'all',
    // ...
  }
  const page = Math.max(1, parseInt(getSingleParam(params?.page) ?? '1', 10) || 1)

  const result = await getDomains({ ...filters, page, pageSize })
  return <DomainsPageClient initialFilters={filters} paginatedDomains={result} />
}
```

### 客户端组件更新 URL

```typescript
// components/domains/DomainsPageClient.tsx
const router = useRouter()
const pathname = usePathname()
const searchParams = useSearchParams()

const updateSearchParams = (nextFilters: DomainFilters, nextPage = 1) => {
  const params = new URLSearchParams(searchParams.toString())

  if (nextFilters.keyword.trim()) params.set('keyword', nextFilters.keyword.trim())
  else params.delete('keyword')

  if (nextFilters.status !== 'all') params.set('status', nextFilters.status)
  else params.delete('status')

  if (nextPage > 1) params.set('page', String(nextPage))
  else params.delete('page')

  router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname)
}
```

### 关键规则

- 默认筛选值**不写入** URL（默认状态保持 URL 简洁）
- 非默认值通过 `params.set()` 写入，默认值通过 `params.delete()` 移除
- 使用 `router.replace()`（而非 `push`）避免污染浏览器历史记录
- 筛选条件变更时，将页码重置为 1

## Zustand 用于共享客户端状态

对于不属于 URL 的跨组件客户端状态，使用 Zustand：

```typescript
// lib/stores/settings.ts
import { create } from 'zustand'

type SettingsState = {
  projectTitles: ProjectTitles
  setProjectTitles: (titles: ProjectTitles) => void
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  projectTitles: { title: '管理系统', subtitle: 'Domain Manage' },
  setProjectTitles: (projectTitles) => set({ projectTitles }),
}))
```

### 何时使用 Zustand

- 需要在无直接父子关系的组件之间共享的设置或偏好
- 状态过于短暂不适合放在 URL 中，但又需要在组件卸载后保留

### 何时不使用 Zustand

- 服务端数据（使用服务端组件 + `revalidatePath`）
- 筛选条件和分页（使用 URL searchParams）
- 表单状态（使用 React Hook Form）
- 单组件内的 UI 状态（使用 useState）

## 本地组件状态

对于仅在单一组件树内有意义的 UI 状态，使用 `useState`：

```typescript
const [dialogOpen, setDialogOpen] = useState(false)
const [activeDomain, setActiveDomain] = useState<Domain | null>(null)
const [selectedIds, setSelectedIds] = useState<string[]>([])
```

### localStorage 用于持久化偏好

列可见性等用户个人偏好存储在 localStorage 中：

```typescript
useEffect(() => {
  const stored = window.localStorage.getItem(COLUMNS_STORAGE_KEY)
  if (stored) setVisibleColumns(JSON.parse(stored))
}, [])

useEffect(() => {
  window.localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns))
}, [visibleColumns])
```

## 数据刷新模式

数据变更后，使用 `router.refresh()` 重新获取服务端数据：

```typescript
const router = useRouter()

const handleClose = (shouldRefresh?: boolean) => {
  setDialogOpen(false)
  if (shouldRefresh) router.refresh()
}
```

这会触发 Next.js 重新执行服务端组件，从 Supabase 获取最新数据。

## 正确与错误模式对比

### URL 状态更新

```typescript
// 正确 — replace 避免污染浏览器历史记录
router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname)

// 错误 — push 在每次筛选变更时都会新增一条历史记录
router.push(`${pathname}?${params.toString()}`)
```

### 服务端数据与客户端缓存

```typescript
// 正确 — 数据来自服务端组件，数据变更后刷新
const router = useRouter()
await createDomainAction(values)
router.refresh()  // 重新执行服务端组件以获取最新数据

// 错误 — 将 Supabase 数据缓存到 Zustand 中
const useDomainStore = create((set) => ({
  domains: [],
  fetchDomains: async () => {
    const data = await getDomains()  // 应在服务端组件中获取
    set({ domains: data })
  },
}))
```

## 反模式

- 使用 Zustand 或 Context 存储应来自服务端的数据
- 在 URL 和组件状态中同时维护筛选状态（重复）
- 筛选变更时使用 `router.push()`（污染浏览器历史记录）
- 将 Supabase 查询结果存储在客户端状态中，而不使用服务端组件
- 当 URL params 或 `useState` 已经足够时，创建自定义状态管理方案
