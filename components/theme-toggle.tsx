'use client'

import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useCallback, useSyncExternalStore } from 'react'

import {
  getStoredThemeMode,
  setStoredThemeMode,
  THEME_MODE_CHANGE_EVENT,
  THEME_MODE_STORAGE_KEY,
  type ThemeMode,
} from '@/lib/theme'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string; icon: typeof Monitor }> = [
  { value: 'auto', label: '自动', icon: Monitor },
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '暗黑', icon: Moon },
]

export function ThemeToggle() {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_MODE_STORAGE_KEY) {
        onStoreChange()
      }
    }
    window.addEventListener('storage', handleStorage)
    window.addEventListener(THEME_MODE_CHANGE_EVENT, onStoreChange)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(THEME_MODE_CHANGE_EVENT, onStoreChange)
    }
  }, [])

  const mode = useSyncExternalStore(subscribe, getStoredThemeMode, () => 'auto')

  const selectedOption = THEME_OPTIONS.find((option) => option.value === mode) ?? THEME_OPTIONS[0]
  const SelectedIcon = selectedOption.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label={`主题模式：${selectedOption.label}`}>
          <SelectedIcon size={14} suppressHydrationWarning />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {THEME_OPTIONS.map((option) => {
          const OptionIcon = option.icon
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => {
                setStoredThemeMode(option.value)
              }}
            >
              <OptionIcon size={14} />
              <span>{option.label}</span>
              {option.value === mode && <Check size={14} className="ml-auto" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
